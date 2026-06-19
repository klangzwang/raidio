export class AudioManager {
    private static instance: AudioManager;
    private audioContext: AudioContext;
    private audio: HTMLAudioElement | null = null;
    private muted: boolean;

    private constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.muted = false;
    }

    // private currentOscillator: OscillatorNode | null = null;

    public getMuted() { return this.muted; }
    public setMuted(mute: boolean) {
        this.muted = mute;
    }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    public async setSinkIdForAudioContext(deviceId: string): Promise<void> {
        if ('setSinkId' in this.audioContext) {
            try {
                await (this.audioContext as any).setSinkId(deviceId);
            } catch (err) {
                console.error("[AudioManager] Failed to set sink ID for AudioContext", err);
            }
        } else {
            console.warn("[AudioManager] setSinkId is not supported on AudioContext in this browser.");
        }
    }

    public async playMp3(url: string, deviceId: string): Promise<void> {

        if (this.isPlaying)
            return;
        if (this.muted)
            return;

        this.audio = new Audio(url);

        this.audio.onended = () => {
            this.audio = null;
        };
        this.audio.onerror = () => {
            this.audio = null;
        };

        if ('setSinkId' in this.audio && deviceId) {
            try {
                await (this.audio as any).setSinkId(deviceId);
            } catch (err) {
                console.error("[AudioManager] Failed to set sink ID for Audio element", err);
            }
        }

        this.audio.playbackRate = this.randomInRange(0.9, 1.4);
        await this.audio.play();
    };

    private randomInRange(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    };

    private get isPlaying() {
        return this.audio !== null && !this.audio.ended;
    }

    // public getAudioContext() {
    //     return this.audioContext;
    // }
    // public setAudioContext(audioContext: AudioContext) {
    //     this.audioContext = audioContext;
    // }
    // public getOscillator() {
    //     return this.currentOscillator;
    // }
    // public setOscillator(oscillator: OscillatorNode) {
    //     this.currentOscillator = oscillator;
    // }

    // public stopTestTone(): void {
    //     if (this.currentOscillator) {
    //         this.currentOscillator.stop();
    //         this.currentOscillator.disconnect();
    //     }
    //     if (this.audioContext) {
    //         this.audioContext.close();
    //     }
    //     this.audioContext = null;
    //     this.currentOscillator = null;
    // }
}
