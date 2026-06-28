import { listen } from '@tauri-apps/api/event';
import { AudioManager } from './lib/AudioManager';
import { ConfigManager } from './lib/ConfigManager';
import { OWAudioUtils } from './lib/utils';
import { Listeners } from 'listener/Events';

export class Controller {
    private static instance: Controller;
    private listener: Listeners;
    private activePage: number;
    private isGameRunning: boolean;

    private constructor() {
        this.activePage = 1;
        this.isGameRunning = false;
        this.listener = new Listeners();
    };

    public static getInstance(): Controller {
        if (!Controller.instance) {
            Controller.instance = new Controller();
        }
        return Controller.instance;
    }

    public getActivePage() { return this.activePage; }
    public setActivePage(inActivePage: number) {
        this.activePage = inActivePage;
    }

    public getIsGameRunning() { return this.isGameRunning; }
    public setIsGameRunning(inIsGameRunning: boolean) {
        this.isGameRunning = inIsGameRunning;
    }

    public async run() {

        this.listener.addOnRenderingStartedListener((metrics) => this.onGameRenderingStarted(metrics));

        this.setupLevelHotkeys();
        this.registerListeners();
    }

    private async registerListeners() {
        await listen<boolean>('window-opened', (event) => {
            this.setIsGameRunning(event.payload);
            window.dispatchEvent(new CustomEvent('winopen-changed'));
        });
    }

    private async setupHotkeys() {
        const handleKeyDown = (e: KeyboardEvent) => {
            const ctrl = Controller.getInstance();
            const key = e.code as string;
            if (key === "Escape" && ctrl.getActivePage() !== 0) {
                ctrl.setActivePage(ctrl.getActivePage() - 1);
            } else if (key === "Tab" && ctrl.getActivePage() !== 0 && ctrl.getActivePage() !== 3) {
                ctrl.setActivePage(ctrl.getActivePage() + 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }

    private async setupLevelHotkeys() {
        let active = true;
        let unlisten: (() => void) | undefined;
        (async () => {
            const u = await listen<string>('global-key-press', (event) => {
                const audio = AudioManager.getInstance();
                const key = event.payload as string;
                if (key === ConfigManager.loadNextSetKey() && ConfigManager.loadCurrentLevel() !== 9) {
                    ConfigManager.saveCurrentLevel(ConfigManager.loadCurrentLevel() + 1);
                    window.dispatchEvent(new CustomEvent('level-changed'));
                    OWAudioUtils.playSound("snd/ui/click2.mp3", 0.5);
                } else if (key === ConfigManager.loadPrevSetKey() && ConfigManager.loadCurrentLevel() !== 1) {
                    ConfigManager.saveCurrentLevel(ConfigManager.loadCurrentLevel() - 1);
                    window.dispatchEvent(new CustomEvent('level-changed'));
                    OWAudioUtils.playSound("snd/ui/click1.mp3", 0.5);
                } else if (key === ConfigManager.loadMuteKey()) {
                    setTimeout(() => {
                        audio.setMuted(!audio.getMuted());
                        OWAudioUtils.playSound(audio.getMuted() ? "snd/ui/beep1.mp3" : "snd/ui/beep2.mp3", 0.5)
                    }, 500);
                }
            });
            if (!active) {
                u();
            } else {
                unlisten = u;
            }
        })();

        return () => {
            active = false;
            unlisten?.();
        };
    }

    private onGameRenderingStarted(metrics: any) {
        console.log('Getrennte UI-Klasse hat das Event über den Tracker erhalten!', metrics);
    }
}

Controller.getInstance().run();
