// npm install fflate
// Sehr kleine, reine JS Zip-Lib (kein WASM) -> passt gut zu schlanker Tauri-Bundlegröße.
import { zip, unzip, Zippable } from 'fflate';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { ConfigManager, GridButtonConfig } from './ConfigManager';

// Setup (einmalig, falls noch nicht vorhanden):
//   npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
//   cargo add tauri-plugin-dialog tauri-plugin-fs   (im src-tauri Verzeichnis)
//
// In src-tauri/src/lib.rs (oder main.rs) registrieren:
//   .plugin(tauri_plugin_dialog::init())
//   .plugin(tauri_plugin_fs::init())
//
// In src-tauri/capabilities/default.json die Permissions freigeben:
//   "dialog:allow-save", "fs:allow-write-file"

// ---- Anpassen, falls sich Levels/Cells im BoardTab ändern ----
const LEVELS = 4;       // pageColors hat 4 Einträge -> 4 "Pages"/Levels
const CELLS_PER_LEVEL = 9; // 3x3 Grid pro Level

const MANIFEST_NAME = 'manifest.json';
const RAIDIO_BOARD_VERSION = 1;

// Manifest beschreibt NUR Metadaten + Dateinamen, keine Binärdaten.
// Die eigentlichen Sounds liegen als einzelne Dateien im ZIP.
interface BoardManifestEntry {
    level: number;
    index: number;
    hotkey: string;
    soundName: string | null;
    // Dateiname im Zip-Archiv, null wenn Cell leer ist
    soundFile: string | null;
}

interface BoardManifest {
    version: number;
    exportedAt: string;
    entries: BoardManifestEntry[];
}

export class ExportManager {

    /**
     * Sammelt alle GridButtonConfigs aus IndexedDB, packt Sounds + Manifest
     * in ein .raidioboard (ZIP) und lässt den Nutzer per nativem Dialog
     * den Speicherort wählen.
     *
     * @returns Gewählter Pfad, oder null falls der Dialog abgebrochen wurde.
     */
    public static async exportBoard(defaultFileName = 'raidio-board.raidioboard'): Promise<string | null> {

        // Dialog zuerst öffnen: wenn der Nutzer abbricht, sparen wir uns
        // das komplette Einsammeln + Zippen der Audiodaten.
        const targetPath = await save({
            defaultPath: defaultFileName,
            filters: [
                { name: 'Raidio Board', extensions: ['raidioboard'] },
            ],
        });

        if (!targetPath) {
            // Nutzer hat den Dialog abgebrochen
            return null;
        }

        const manifest: BoardManifest = {
            version: RAIDIO_BOARD_VERSION,
            exportedAt: new Date().toISOString(),
            entries: [],
        };

        const zipInput: Zippable = {};

        for (let level = 0; level < LEVELS; level++) {
            for (let index = 0; index < CELLS_PER_LEVEL; index++) {
                const config = await ConfigManager.loadButtonConfig(level, index);

                if (!config || !config.soundData) {
                    // Leere Cell -> trotzdem Hotkey-Mapping sichern, falls einer manuell gesetzt wurde
                    manifest.entries.push({
                        level,
                        index,
                        hotkey: config?.hotkey ?? `Numpad${index + 1}`,
                        soundName: null,
                        soundFile: null,
                    });
                    continue;
                }

                // Eindeutiger, sortierbarer Dateiname im Archiv
                const ext = this.guessExtension(config.soundName);
                const archiveFileName = `sounds/level${level}_btn${index}${ext}`;

                const arrayBuffer = await config.soundData.arrayBuffer();
                zipInput[archiveFileName] = new Uint8Array(arrayBuffer);

                manifest.entries.push({
                    level,
                    index,
                    hotkey: config.hotkey,
                    soundName: config.soundName,
                    soundFile: archiveFileName,
                });
            }
        }

        zipInput[MANIFEST_NAME] = this.textToUint8(JSON.stringify(manifest, null, 2));

        const zipped: Uint8Array = await new Promise((resolve, reject) => {
            zip(zipInput, { level: 6 }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        await writeFile(targetPath, zipped);

        return targetPath;
    }

    /**
     * Liest ein zuvor exportiertes .raidioboard und schreibt alle Cells
     * zurück in IndexedDB. Bestehende Belegungen werden überschrieben.
     */
    public static async importBoard(file: File): Promise<void> {
        const buffer = new Uint8Array(await file.arrayBuffer());

        const unzipped: Record<string, Uint8Array> = await new Promise((resolve, reject) => {
            unzip(buffer, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        const manifestRaw = unzipped[MANIFEST_NAME];
        if (!manifestRaw) {
            throw new Error('Ungültige Datei: manifest.json fehlt im Archiv.');
        }

        const manifest: BoardManifest = JSON.parse(this.uint8ToText(manifestRaw));

        if (manifest.version > RAIDIO_BOARD_VERSION) {
            throw new Error(
                `Diese Datei wurde mit einer neueren Raidio-Version exportiert (v${manifest.version}). Bitte Raidio aktualisieren.`
            );
        }

        for (const entry of manifest.entries) {
            if (entry.soundFile) {
                const fileBytes = unzipped[entry.soundFile];
                if (!fileBytes) {
                    console.warn(`[Import] Sound-Datei fehlt im Archiv: ${entry.soundFile}`);
                    continue;
                }

                const blob = new Blob([fileBytes.slice()], { type: this.guessMimeType(entry.soundFile) });

                const config: GridButtonConfig = {
                    soundData: blob,
                    soundName: entry.soundName,
                    hotkey: entry.hotkey,
                };
                await ConfigManager.saveButtonConfig(entry.level, entry.index, config);
            } else {
                // Leere Cell -> nur Hotkey übernehmen, kein Sound
                const config: GridButtonConfig = {
                    soundData: null,
                    soundName: null,
                    hotkey: entry.hotkey,
                };
                await ConfigManager.saveButtonConfig(entry.level, entry.index, config);
            }
        }
    }

    // ---------- Helpers ----------

    private static guessExtension(soundName: string | null): string {
        if (!soundName) return '.bin';
        const dot = soundName.lastIndexOf('.');
        return dot >= 0 ? soundName.slice(dot) : '.bin';
    }

    private static guessMimeType(fileName: string): string {
        if (fileName.endsWith('.mp3')) return 'audio/mpeg';
        if (fileName.endsWith('.wav')) return 'audio/wav';
        if (fileName.endsWith('.ogg')) return 'audio/ogg';
        return 'application/octet-stream';
    }

    private static textToUint8(text: string): Uint8Array {
        return new TextEncoder().encode(text);
    }

    private static uint8ToText(data: Uint8Array): string {
        return new TextDecoder().decode(data);
    }
}




// // npm install fflate
// // Sehr kleine, reine JS Zip-Lib (kein WASM) -> passt gut zu schlanker Tauri-Bundlegröße.
// import { zip, unzip, Zippable } from 'fflate';
// import { ConfigManager, GridButtonConfig } from './ConfigManager';

// // ---- Anpassen, falls sich Levels/Cells im BoardTab ändern ----
// const LEVELS = 4;       // pageColors hat 4 Einträge -> 4 "Pages"/Levels
// const CELLS_PER_LEVEL = 9; // 3x3 Grid pro Level

// const MANIFEST_NAME = 'manifest.json';
// const RAIDIO_BOARD_VERSION = 1;

// // Manifest beschreibt NUR Metadaten + Dateinamen, keine Binärdaten.
// // Die eigentlichen Sounds liegen als einzelne Dateien im ZIP.
// interface BoardManifestEntry {
//     level: number;
//     index: number;
//     hotkey: string;
//     soundName: string | null;
//     // Dateiname im Zip-Archiv, null wenn Cell leer ist
//     soundFile: string | null;
// }

// interface BoardManifest {
//     version: number;
//     exportedAt: string;
//     entries: BoardManifestEntry[];
// }

// export class BoardExportManager {

//     /**
//      * Sammelt alle GridButtonConfigs aus IndexedDB, packt Sounds + Manifest
//      * in ein .raidioboard (ZIP) und löst den Browser-Download aus.
//      */
//     public static async exportBoard(fileName = 'raidio-board.raidioboard'): Promise<void> {
//         const manifest: BoardManifest = {
//             version: RAIDIO_BOARD_VERSION,
//             exportedAt: new Date().toISOString(),
//             entries: [],
//         };

//         const zipInput: Zippable = {};

//         for (let level = 0; level < LEVELS; level++) {
//             for (let index = 0; index < CELLS_PER_LEVEL; index++) {
//                 const config = await ConfigManager.loadButtonConfig(level, index);

//                 if (!config || !config.soundData) {
//                     // Leere Cell -> trotzdem Hotkey-Mapping sichern, falls einer manuell gesetzt wurde
//                     manifest.entries.push({
//                         level,
//                         index,
//                         hotkey: config?.hotkey ?? `Numpad${index + 1}`,
//                         soundName: null,
//                         soundFile: null,
//                     });
//                     continue;
//                 }

//                 // Eindeutiger, sortierbarer Dateiname im Archiv
//                 const ext = this.guessExtension(config.soundName);
//                 const archiveFileName = `sounds/level${level}_btn${index}${ext}`;

//                 const arrayBuffer = await config.soundData.arrayBuffer();
//                 zipInput[archiveFileName] = new Uint8Array(arrayBuffer);

//                 manifest.entries.push({
//                     level,
//                     index,
//                     hotkey: config.hotkey,
//                     soundName: config.soundName,
//                     soundFile: archiveFileName,
//                 });
//             }
//         }

//         zipInput[MANIFEST_NAME] = this.textToUint8(JSON.stringify(manifest, null, 2));

//         const zipped: Uint8Array = await new Promise((resolve, reject) => {
//             zip(zipInput, { level: 6 }, (err, data) => {
//                 if (err) reject(err);
//                 else resolve(data);
//             });
//         });

//         this.triggerDownload(zipped, fileName);
//     }

//     /**
//      * Liest ein zuvor exportiertes .raidioboard und schreibt alle Cells
//      * zurück in IndexedDB. Bestehende Belegungen werden überschrieben.
//      */
//     public static async importBoard(file: File): Promise<void> {
//         const buffer = new Uint8Array(await file.arrayBuffer());

//         const unzipped: Record<string, Uint8Array> = await new Promise((resolve, reject) => {
//             unzip(buffer, (err, data) => {
//                 if (err) reject(err);
//                 else resolve(data);
//             });
//         });

//         const manifestRaw = unzipped[MANIFEST_NAME];
//         if (!manifestRaw) {
//             throw new Error('Ungültige Datei: manifest.json fehlt im Archiv.');
//         }

//         const manifest: BoardManifest = JSON.parse(this.uint8ToText(manifestRaw));

//         if (manifest.version > RAIDIO_BOARD_VERSION) {
//             throw new Error(
//                 `Diese Datei wurde mit einer neueren Raidio-Version exportiert (v${manifest.version}). Bitte Raidio aktualisieren.`
//             );
//         }

//         for (const entry of manifest.entries) {
//             if (entry.soundFile) {
//                 const fileBytes = unzipped[entry.soundFile];
//                 if (!fileBytes) {
//                     console.warn(`[Import] Sound-Datei fehlt im Archiv: ${entry.soundFile}`);
//                     continue;
//                 }

//                 const blob = new Blob([fileBytes.slice()], { type: this.guessMimeType(entry.soundFile) });

//                 const config: GridButtonConfig = {
//                     soundData: blob,
//                     soundName: entry.soundName,
//                     hotkey: entry.hotkey,
//                 };
//                 await ConfigManager.saveButtonConfig(entry.level, entry.index, config);
//             } else {
//                 // Leere Cell -> nur Hotkey übernehmen, kein Sound
//                 const config: GridButtonConfig = {
//                     soundData: null,
//                     soundName: null,
//                     hotkey: entry.hotkey,
//                 };
//                 await ConfigManager.saveButtonConfig(entry.level, entry.index, config);
//             }
//         }
//     }

//     // ---------- Helpers ----------

//     private static guessExtension(soundName: string | null): string {
//         if (!soundName) return '.bin';
//         const dot = soundName.lastIndexOf('.');
//         return dot >= 0 ? soundName.slice(dot) : '.bin';
//     }

//     private static guessMimeType(fileName: string): string {
//         if (fileName.endsWith('.mp3')) return 'audio/mpeg';
//         if (fileName.endsWith('.wav')) return 'audio/wav';
//         if (fileName.endsWith('.ogg')) return 'audio/ogg';
//         return 'application/octet-stream';
//     }

//     private static textToUint8(text: string): Uint8Array {
//         return new TextEncoder().encode(text);
//     }

//     private static uint8ToText(data: Uint8Array): string {
//         return new TextDecoder().decode(data);
//     }

//     private static triggerDownload(data: Uint8Array, fileName: string): void {
//         const blob = new Blob([data.slice()], { type: 'application/zip' });
//         const url = URL.createObjectURL(blob);

//         const a = document.createElement('a');
//         a.href = url;
//         a.download = fileName;
//         a.style.display = 'none';
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);

//         // Verzögert widerrufen, damit Tauri/WebView die Blob-URL
//         // noch verarbeiten kann bevor sie ungültig wird.
//         setTimeout(() => URL.revokeObjectURL(url), 1000);
//     }
// }