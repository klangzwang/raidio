import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Window } from "@tauri-apps/api/window"
import { invoke } from '@tauri-apps/api/core';
// import Tesseract from 'tesseract.js';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// ──────────────────────────────────────────────────── System
export class OWSysUtils {

    static getWindow = (name: string): any => {
        return Window.getByLabel(name);
    }

    /**
     * Verzögert die Code-Ausführung um eine bestimmte Anzahl von Millisekunden.
     * @param ms - Die Zeit in Millisekunden, die gewartet werden soll.
     * @returns Eine Promise, die nach Ablauf der Zeit aufgelöst wird.
     */
    public static delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    static getRandomInRange = (min: number, max: number): number => {
        return Math.random() * (max - min) + min;
    };

    /**
     * Gibt einen zufälligen Wert aus den übergebenen Argumenten zurück.
     * Bspw: OWSysUtils.getRandomFrom("sound1.mp3", "sound2.mp3", "sound3.mp3")
     */
    public static getRandomFrom<T>(...args: T[]): T {
        const randomIndex = Math.floor(Math.random() * args.length);
        return args[randomIndex];
    }

    public static parseHexColor(hex: string): [number, number, number] {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }

    /**
     * Wandelt RGB-Hex-Code in RGBA-String um, z.B. #000000 in rgba(0, 0, 0, 1.0).
     */
    public static hexToRgba(hex: string, alpha: number = 1.0): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
}

// ──────────────────────────────────────────────────── Hotkeys
export class OWWinUtils {

    static destroyRaidio(snd: string = "", delay: number = 0) {
        OWAudioUtils.playSound(snd, 0.5);
        setTimeout(() => {
            invoke("close_raidio_app");
        }, delay);
    }

    // static destroyWindow(win: Window, snd: string = "", delay: number = 0) {
    //     OWAudioUtils.playSound(snd, 0.5);
    //     setTimeout(() => {
    //         win.destroy();
    //     }, delay);
    // }

    static hideWindow(win: Window, snd: string = "", delay: number = 0) {
        OWAudioUtils.playSound(snd, 0.5);
        setTimeout(() => {
            win.hide();
        }, delay);
    }

    static showWindow(win: Window, snd: string = "", delay: number = 0) {
        OWAudioUtils.playSound(snd, 0.5);
        setTimeout(() => {
            win.show();
        }, delay);
    }

    static toggleWindow(win: Window, snd: string = "", delay: number = 0) {
        OWAudioUtils.playSound(snd, 0.5);
        setTimeout(() => {
            if (win.isMaximized) {
                win.hide();
            } else {
                win.show();
            }
        }, delay);
    }
}

// ──────────────────────────────────────────────────── Audio
export class OWAudioUtils {

    static async playSound(filePath: string, InVolume: number, InPitch: number = 1.0) {
        const audio = new Audio(filePath);
        audio.volume = InVolume;
        if (InPitch !== 1.0)
            audio.playbackRate = OWSysUtils.getRandomInRange((1.0 - InPitch), (1.0 + InPitch));
        audio.play().catch(err => console.log("Audio-Blockade durch Browser:", err));
    };
}

// ──────────────────────────────────────────────────── Tesseract
// export class OWTessUtils {

//     static async getSoundPath(image: string): Promise<string> {
//         return new Promise(async (resolve, reject) => {
//             const result = await Tesseract.recognize(
//                 image,
//                 'eng+deu'
//             );
//             const recognizedText = result.data.text;
//             const lowerRecognizedText = recognizedText.toLowerCase();

//             resolve(lowerRecognizedText);
//         })
//     };
// }

// ──────────────────────────────────────────────────── Math
export class OWMathUtils {

    // /**
    //  * Mappt eine Zahl von einem Eingangs-Bereich in einen Ziel-Bereich von 0.0 bis 1.0 (Geklammert)
    //  * @param value Die zu mappende Zahl (z.B. 1233)
    //  * @param inMin Die untere Grenze des Eingangs-Bereichs
    //  * @param inMax Die obere Grenze des Eingangs-Bereichs
    //  */
    // static mapRangeClamped(value: number, inMin: number, inMax: number): number {
    //     if (inMin === inMax) return 0.0;
    //     const normalized = (value - inMin) / (inMax - inMin);
    //     return Math.max(0.0, Math.min(1.0, normalized));
    // }

    /**
     * Mappt eine Zahl von einem Eingangs-Bereich in einen beliebigen Ziel-Bereich (Geklammert)
     * * @param value Der aktuelle Eingangswert
     * @param inMin Die untere Grenze des Eingangs-Bereichs
     * @param inMax Die obere Grenze des Eingangs-Bereichs
     * @param outMin Die untere Grenze des Ziel-Bereichs
     * @param outMax Die obere Grenze des Ziel-Bereichs
     */
    static mapRangeClamped(
        value: number,
        inMin: number,
        inMax: number,
        outMin: number,
        outMax: number
    ): number {
        // 1. Sicherheitscheck: Verhindert Division durch Null
        if (inMin === inMax) return outMin;

        // 2. Normalisieren: Wo steht der Wert im Eingangs-Bereich (Wert zwischen 0.0 und 1.0)
        const normalized = (value - inMin) / (inMax - inMin);

        // 3. Clamping auf den Eingangs-Bereich (Sicherstellen, dass wir 0.0 - 1.0 nicht verlassen)
        const clampedNormalized = Math.max(0.0, Math.min(1.0, normalized));

        // 4. Interpolieren: Den Prozentwert in den neuen Ziel-Bereich umrechnen
        return outMin + clampedNormalized * (outMax - outMin);
    }
}