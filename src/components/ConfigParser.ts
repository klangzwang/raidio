import { invoke } from '@tauri-apps/api/core';

/**
 * Kategorien für die Gruppierung der Spieleinstellungen
 */
export enum SettingCategory {
    GRAPHICS = 'Graphics',
    VIDEO = 'Video',
    AUDIO = 'Audio',
    NETWORK = 'Network',
    GAMEPLAY = 'Gameplay',
    CONTROLS = 'Controls',
    UI = 'UI',
    UNKNOWN = 'Unknown'
}

/**
 * Farbdefinitionen für die Kategoriedarstellung (ANSI-Codes für Terminal)
 */
const CATEGORY_COLORS: Record<SettingCategory, string> = {
    [SettingCategory.GRAPHICS]: '\x1b[36m',    // Cyan
    [SettingCategory.VIDEO]: '\x1b[35m',       // Magenta
    [SettingCategory.AUDIO]: '\x1b[33m',       // Gelb
    [SettingCategory.NETWORK]: '\x1b[34m',     // Blau
    [SettingCategory.GAMEPLAY]: '\x1b[32m',    // Grün
    [SettingCategory.CONTROLS]: '\x1b[31m',    // Rot
    [SettingCategory.UI]: '\x1b[37m',          // Weiß
    [SettingCategory.UNKNOWN]: '\x1b[90m',     // Grau
};

const RESET_COLOR = '\x1b[0m';

/**
 * Schlüsselwörter für die automatische Kategorisierung
 */
const CATEGORY_KEYWORDS: Record<SettingCategory, string[]> = {
    [SettingCategory.GRAPHICS]: [
        'shadow', 'texture', 'resolution', 'quality', 'antialiasing', 'msaa',
        'vsync', 'fps', 'framerate', 'lod', 'detail', 'postprocess', 'bloom',
        'ambient', 'occlusion', 'reflection', 'lighting', 'render'
    ],
    [SettingCategory.VIDEO]: [
        'display', 'monitor', 'fullscreen', 'window', 'brightness', 'contrast',
        'gamma', 'hdr', 'color', 'screen', 'aspect', 'ratio'
    ],
    [SettingCategory.AUDIO]: [
        'audio', 'sound', 'volume', 'music', 'sfx', 'voice', 'mic', 'microphone',
        'speaker', 'headset', 'channel', 'output', 'input'
    ],
    [SettingCategory.NETWORK]: [
        'network', 'ping', 'latency', 'server', 'connection', 'bandwidth',
        'packet', 'online', 'multiplayer', 'region'
    ],
    [SettingCategory.GAMEPLAY]: [
        'gameplay', 'difficulty', 'sensitivity', 'aim', 'fov', 'crosshair',
        'hud', 'camera', 'movement', 'control', 'key', 'bind', 'button',
        'mouse', 'keyboard', 'gamepad', 'controller'
    ],
    [SettingCategory.CONTROLS]: [
        'key', 'bind', 'button', 'input', 'mouse', 'keyboard', 'gamepad',
        'controller', 'sensitivity', 'invert', 'toggle'
    ],
    [SettingCategory.UI]: [
        'ui', 'interface', 'menu', 'font', 'text', 'scale', 'language',
        'locale', 'subtitle', 'caption'
    ],
    [SettingCategory.UNKNOWN]: []
};

/**
 * Repräsentiert eine einzelne Einstellung mit Kategorie
 */
export interface CategorizedSetting {
    key: string;
    value: any;
    category: SettingCategory;
    path: string;
}

/**
 * Repräsentiert eine Kategorie mit allen zugehörigen Einstellungen
 */
export interface CategoryGroup {
    category: SettingCategory;
    settings: CategorizedSetting[];
    count: number;
}

/**
 * Klasse zum Laden, Parsen und Kategorisieren von Unreal Engine Save-Dateien
 * Verwendet die Rust-Bibliothek "trumank/uesave" über Tauri IPC
 */
export class SaveFileParser {
    private rawJson: any = null;
    private categorizedData: Map<SettingCategory, CategorizedSetting[]> = new Map();
    private filePath: string;

    /**
     * @param filePath - Pfad zur .sav-Datei (optional, kann später gesetzt werden)
     */
    constructor(filePath?: string) {
        this.filePath = filePath || '';
        this.initializeCategories();
    }

    /**
     * Initialisiert die Kategorie-Map mit leeren Arrays
     */
    private initializeCategories(): void {
        Object.values(SettingCategory).forEach(category => {
            this.categorizedData.set(category, []);
        });
    }

    /**
     * Setzt den Pfad zur SAV-Datei
     * @param path - Vollständiger Pfad zur .sav-Datei
     */
    public setFilePath(path: string): void {
        this.filePath = path;
    }

    /**
     * Lädt die SAV-Datei und konvertiert sie über den Rust-Befehl in JSON
     * @returns Promise mit dem konvertierten JSON-Objekt
     */
    public async loadSaveFile(): Promise<any> {
        if (!this.filePath) {
            throw new Error('Kein Dateipfad gesetzt. Verwenden Sie setFilePath() oder übergeben Sie den Pfad im Konstruktor.');
        }

        try {
            console.log(`[SaveFileParser] Lade und konvertiere: ${this.filePath}`);

            // Aufruf des Rust-Befehls, der uesave verwendet
            const jsonResult = await invoke<string>('convert_sav_to_json', {
                filePath: this.filePath
            });

            // Parse das JSON
            this.rawJson = JSON.parse(jsonResult);

            // Kategorisiere die Daten
            this.categorizeSettings();

            console.log('[SaveFileParser] Erfolgreich geladen und kategorisiert');
            return this.rawJson;
        } catch (error) {
            console.error('[SaveFileParser] Fehler beim Laden der SAV-Datei:', error);
            throw new Error(`Fehler beim Laden der SAV-Datei: ${error}`);
        }
    }

    /**
     * Bereinigt die rohe uesave-JSON-Struktur rekursiv in ein Standard-JS-Objekt
     */
    private cleanUeJson(node: any): any {
        if (node === null || typeof node !== 'object') {
            return node;
        }

        const keys = Object.keys(node);
        if (keys.length === 1) {
            const type = keys[0];
            const container = node[type];
            if (container === null || typeof container !== 'object') {
                return container;
            }
            if ('value' in container) {
                return this.cleanUeJson(container.value);
            }
            if (type === 'Map' || type === 'Struct') {
                return this.cleanUeJson(container);
            }
        }

        if (Array.isArray(node)) {
            return node.map(item => this.cleanUeJson(item));
        }

        if ('key' in node && 'value' in node) {
            return {
                key: this.cleanUeJson(node.key),
                value: this.cleanUeJson(node.value)
            };
        }

        const result: any = {};
        for (const [k, v] of Object.entries(node)) {
            result[k] = this.cleanUeJson(v);
        }
        return result;
    }

    /**
     * Kategorisiert alle Einstellungen basierend auf Schlüsselwörtern
     */
    private categorizeSettings(): void {
        this.initializeCategories();

        if (!this.rawJson) {
            return;
        }

        const cleanJson = this.cleanUeJson(this.rawJson);
        this.traverseCleanJson(cleanJson, '');
    }

    /**
     * Traversiert rekursiv durch das bereinigte JSON und kategorisiert Einstellungen
     */
    private traverseCleanJson(obj: any, currentPath: string): void {
        if (obj === null || typeof obj !== 'object') {
            return;
        }

        if ('key' in obj && 'value' in obj && typeof obj.key === 'string') {
            const fullKey = obj.key;
            const parts = fullKey.split('.');
            const shortKey = parts[parts.length - 1];

            const category = this.determineCategory(shortKey, fullKey);
            const setting: CategorizedSetting = {
                key: shortKey,
                value: obj.value,
                category: category,
                path: fullKey
            };

            this.categorizedData.get(category)?.push(setting);
            return;
        }

        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                this.traverseCleanJson(item, currentPath ? `${currentPath}.${index}` : `${index}`);
            });
            return;
        }

        for (const [k, v] of Object.entries(obj)) {
            const fullPath = currentPath ? `${currentPath}.${k}` : k;

            if (v === null || typeof v !== 'object') {
                const category = this.determineCategory(k, fullPath);
                const setting: CategorizedSetting = {
                    key: k,
                    value: v,
                    category: category,
                    path: fullPath
                };

                this.categorizedData.get(category)?.push(setting);
            } else {
                this.traverseCleanJson(v, fullPath);
            }
        }
    }

    /**
     * Bestimmt die Kategorie basierend auf dem Schlüsselnamen
     * @param key - Schlüsselname
     * @param path - Vollständiger Pfad
     * @returns Die ermittelte Kategorie
     */
    private determineCategory(key: string, path: string): SettingCategory {
        const searchText = `${key} ${path}`.toLowerCase();

        // Prüfe jede Kategorie auf passende Schlüsselwörter
        for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            for (const keyword of keywords) {
                if (searchText.includes(keyword.toLowerCase())) {
                    return category as SettingCategory;
                }
            }
        }

        return SettingCategory.UNKNOWN;
    }

    /**
     * Gibt die gruppierten Kategorien zurück
     * @returns Array von CategoryGroup-Objekten
     */
    public getCategories(): CategoryGroup[] {
        const result: CategoryGroup[] = [];

        this.categorizedData.forEach((settings, category) => {
            if (settings.length > 0) {
                result.push({
                    category: category,
                    settings: settings,
                    count: settings.length
                });
            }
        });

        // Sortiere nach Anzahl der Einstellungen (absteigend)
        return result.sort((a, b) => b.count - a.count);
    }

    /**
     * Gibt das unverarbeitete JSON zurück
     * @returns Das rohe JSON-Objekt
     */
    public getRawJson(): any {
        return this.rawJson;
    }

    /**
     * Gibt die Kategorien farblich formatiert in der Konsole aus (ANSI-Codes)
     */
    public printCategories(): void {
        if (!this.rawJson) {
            console.log('Keine Daten geladen. Verwenden Sie zuerst loadSaveFile().');
            return;
        }

        const categories = this.getCategories();

        console.log('\n' + '='.repeat(80));
        console.log('SPIELEINSTELLUNGEN - KATEGORISIERT');
        console.log('='.repeat(80) + '\n');

        categories.forEach(group => {
            const color = CATEGORY_COLORS[group.category];
            console.log(`${color}━━━ ${group.category.toUpperCase()} (${group.count} Einstellungen) ${'━'.repeat(Math.max(0, 60 - group.category.length))}${RESET_COLOR}\n`);

            group.settings.forEach((setting, index) => {
                const valueStr = typeof setting.value === 'object'
                    ? JSON.stringify(setting.value)
                    : String(setting.value);

                console.log(`  ${color}${index + 1}.${RESET_COLOR} ${setting.key}: ${valueStr}`);
                if (setting.path !== setting.key) {
                    console.log(`     ${'\x1b[90m'}Pfad: ${setting.path}${RESET_COLOR}`);
                }
            });

            console.log('');
        });

        console.log('='.repeat(80));
        console.log(`Gesamt: ${categories.reduce((sum, g) => sum + g.count, 0)} Einstellungen in ${categories.length} Kategorien`);
        console.log('='.repeat(80) + '\n');
    }

    /**
     * Gibt die Kategorien als HTML-formatierten String zurück (für UI-Darstellung)
     * @returns HTML-String mit farblich formatierten Kategorien
     */
    public getCategoriesAsHtml(): string {
        if (!this.rawJson) {
            return '<p>Keine Daten geladen.</p>';
        }

        const categories = this.getCategories();
        let html = '<div class="save-file-categories">';

        const htmlColors: Record<SettingCategory, string> = {
            [SettingCategory.GRAPHICS]: '#00bcd4',
            [SettingCategory.VIDEO]: '#e91e63',
            [SettingCategory.AUDIO]: '#ff9800',
            [SettingCategory.NETWORK]: '#2196f3',
            [SettingCategory.GAMEPLAY]: '#4caf50',
            [SettingCategory.CONTROLS]: '#f44336',
            [SettingCategory.UI]: '#9e9e9e',
            [SettingCategory.UNKNOWN]: '#607d8b'
        };

        categories.forEach(group => {
            const color = htmlColors[group.category];
            html += `<div class="category-group" style="margin-bottom: 20px; border-left: 4px solid ${color}; padding-left: 12px;">`;
            html += `<h3 style="color: ${color}; margin: 0 0 10px 0;">${group.category} (${group.count})</h3>`;
            html += '<ul style="list-style: none; padding: 0; margin: 0;">';

            group.settings.forEach(setting => {
                const valueStr = typeof setting.value === 'object'
                    ? JSON.stringify(setting.value)
                    : String(setting.value);

                html += `<li style="margin: 5px 0; font-family: monospace;">`;
                html += `<strong>${setting.key}:</strong> <span style="color: #888;">${valueStr}</span>`;
                html += `</li>`;
            });

            html += '</ul></div>';
        });

        html += '</div>';
        return html;
    }

    /**
     * Sucht nach einer bestimmten Einstellung anhand des Schlüssels
     * @param searchKey - Der zu suchende Schlüssel
     * @returns Array von passenden Einstellungen
     */
    public findSetting(searchKey: string): CategorizedSetting[] {
        const results: CategorizedSetting[] = [];
        const searchLower = searchKey.toLowerCase();

        this.categorizedData.forEach(settings => {
            settings.forEach(setting => {
                if (setting.key.toLowerCase().includes(searchLower) ||
                    setting.path.toLowerCase().includes(searchLower)) {
                    results.push(setting);
                }
            });
        });

        return results;
    }

    /**
     * Exportiert alle Daten als JSON-String
     * @returns JSON-String mit allen kategorisierten Daten
     */
    public exportAsJson(): string {
        const exportData = {
            filePath: this.filePath,
            rawJson: this.rawJson,
            categories: this.getCategories()
        };

        return JSON.stringify(exportData, null, 2);
    }
}

/**
 * Beispielverwendung der SaveFileParser-Klasse
 */
export async function exampleUsage() {
    // Pfad zur SAV-Datei (Beispiel für Arc Raiders / Pioneer Game)
    const savPath = 'C:\\Users\\Administrator\\AppData\\Local\\PioneerGame\\Saved\\SaveGames\\EmbarkOptionSaveGame.sav';

    // Erstelle eine Instanz des Parsers
    const parser = new SaveFileParser(savPath);

    try {
        // Lade und konvertiere die Datei
        await parser.loadSaveFile();

        // Gib die Kategorien in der Konsole aus (mit ANSI-Farben)
        // parser.printCategories();

        // Oder hole die Daten für die UI-Verarbeitung
        // const categories = parser.getCategories();
        // console.log('Gefundene Kategorien:', categories);

        // Suche nach einer bestimmten Einstellung
        const audioSettings = parser.findSetting('SFXVolume');
        console.log('Audio-Einstellungen:', audioSettings);

        // Exportiere alles als JSON
        // const exported = parser.exportAsJson();
        // console.log('Exportierte Daten:', exported);

    } catch (error) {
        console.error('Fehler:', error);
    }
}