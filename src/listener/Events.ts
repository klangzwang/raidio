import { listen } from '@tauri-apps/api/event';

type RenderingCallback = (metrics: any) => void;

export class Listeners {

    // Ein Array, das alle angemeldeten "Zuhörer" speichert
    private listeners: RenderingCallback[] = [];

    constructor() {
        this.initTauriListener();
    }

    // Das ist dein Gegenstück zu overwolf.extensions.onAppLaunchTriggered.addListener
    public addOnRenderingStartedListener(callback: RenderingCallback) {
        this.listeners.push(callback);
    }

    private async initTauriListener() {
        await listen('game-rendering-started', (event) => {
            // Wenn Rust feuert, rufen wir alle registrierten Callbacks auf
            for (const callback of this.listeners) {
                callback(event.payload);
            }
        });
    }
}