export interface GridButtonConfig {
    soundData: Blob | null;
    soundName: string | null;
    hotkey: string;
}

export class ConfigManager {
    private static readonly RADIAL_MENU_KEY = 'Raidio_RadialMenuKey';
    private static readonly MUTE_KEY = 'Raidio_MuteKey';
    private static readonly NEXT_SET_KEY = 'Raidio_NextSetKey';
    private static readonly PREV_SET_KEY = 'Raidio_PrevSetKey';
    private static readonly AUDIO_DEVICE_KEY = 'Raidio_SelectedAudioDevice';
    private static readonly PRESET_KEY = 'Raidio_SelectedPreset';
    private static readonly LEVEL_KEY = 'Raidio_CurrentLevel';
    private static readonly DB_NAME = 'RaidioDB';
    private static readonly STORE_NAME = 'GridConfig';
    private static dbPromise: Promise<IDBDatabase> | null = null;

    public static saveRadialMenuKey(hotkey: string): void {
        localStorage.setItem(this.RADIAL_MENU_KEY, hotkey);
    }

    public static loadRadialMenuKey(): string | null {
        return localStorage.getItem(this.RADIAL_MENU_KEY);
    }

    public static saveMuteKey(hotkey: string): void {
        localStorage.setItem(this.MUTE_KEY, hotkey);
    }

    public static loadMuteKey(): string | null {
        return localStorage.getItem(this.MUTE_KEY);
    }

    public static saveNextSetKey(hotkey: string): void {
        localStorage.setItem(this.NEXT_SET_KEY, hotkey);
    }

    public static loadNextSetKey(): string | null {
        return localStorage.getItem(this.NEXT_SET_KEY);
    }

    public static savePrevSetKey(hotkey: string): void {
        localStorage.setItem(this.PREV_SET_KEY, hotkey);
    }

    public static loadPrevSetKey(): string | null {
        return localStorage.getItem(this.PREV_SET_KEY);
    }

    public static saveAudioDevice(deviceId: string): void {
        localStorage.setItem(this.AUDIO_DEVICE_KEY, deviceId);
    }

    public static loadAudioDevice(): string | null {
        return localStorage.getItem(this.AUDIO_DEVICE_KEY);
    }

    public static savePreset(presetId: string): void {
        localStorage.setItem(this.PRESET_KEY, presetId);
    }

    public static loadPreset(): string | null {
        return localStorage.getItem(this.PRESET_KEY);
    }

    public static saveCurrentLevel(level: number): void {
        localStorage.setItem(this.LEVEL_KEY, level.toString());
    }

    public static loadCurrentLevel(): number {
        const val = localStorage.getItem(this.LEVEL_KEY);
        return val ? parseInt(val, 10) : 1;
    }

    private static getDB(): Promise<IDBDatabase> {
        if (!this.dbPromise) {
            this.dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(this.DB_NAME, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                        db.createObjectStore(this.STORE_NAME);
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
        return this.dbPromise;
    }

    public static async saveButtonConfig(level: number, buttonIndex: number, config: GridButtonConfig): Promise<void> {
        const db = await this.getDB();
        const key = `level_${level}_btn_${buttonIndex}`;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);
            const req = store.put(config, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    public static async loadButtonConfig(level: number, buttonIndex: number): Promise<GridButtonConfig | null> {
        const db = await this.getDB();
        const key = `level_${level}_btn_${buttonIndex}`;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readonly');
            const store = tx.objectStore(this.STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }
}