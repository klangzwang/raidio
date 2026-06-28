interface PitchEffectChain {
    readonly pitch: number;
    readonly gain: number;
    readonly distortion: number;
    readonly reverb: number;
    readonly echo: number;
    readonly noiseGate?: number;
}

interface VoicePreset {
    readonly presetId: string;
    readonly label: string;
    readonly pitchEffectChain: PitchEffectChain;
}

class PresetManager {

    private static instance: PresetManager;
    private static presets: VoicePreset[] = [];

    constructor() {
        PresetManager.createVoicePresets();
    }

    public static getInstance(): PresetManager {
        if (!PresetManager.instance) {
            PresetManager.instance = new PresetManager();
        }
        return PresetManager.instance;
    }

    public static getPresets(): VoicePreset[] {
        return this.presets;
    }

    public static getPresetById(presetId: string): VoicePreset | null {
        return this.presets.find(preset => preset.presetId === presetId) || null;
    }

    public static createVoicePresets(): VoicePreset[] {
        this.presets = [
            // --- Standard / Clean ---
            { presetId: "clean", label: "Clean / Normal", pitchEffectChain: { pitch: 0, gain: 1.0, distortion: 0, reverb: 0, echo: 0 } },

            // --- Die Klassiker ---
            { presetId: "demon", label: "Dämon", pitchEffectChain: { pitch: -8, gain: 1.2, distortion: 0.6, reverb: 3.0, echo: 0.4 } },
            { presetId: "chipmunk", label: "Streifenhörnchen", pitchEffectChain: { pitch: 12, gain: 1.0, distortion: 0, reverb: 0.1, echo: 0 } },

            // --- Tactical & Sci-Fi Vibes ---
            { presetId: "space_helmet", label: "Astronaut", pitchEffectChain: { pitch: -1, gain: 1.0, distortion: 0.2, reverb: 4.0, echo: 0.8 } },
            { presetId: "cyborg", label: "Cyborg", pitchEffectChain: { pitch: -3, gain: 1.1, distortion: 0.7, reverb: 0.5, echo: 0.2 } },
            { presetId: "rogue_ai", label: "Durchgedrehte KI", pitchEffectChain: { pitch: 4, gain: 1.3, distortion: 0.9, reverb: 1.0, echo: 0.5 } },

            // --- Fun & Extreme ---
            { presetId: "giant", label: "Goliath", pitchEffectChain: { pitch: -12, gain: 1.5, distortion: 0.1, reverb: 1.5, echo: 0 } },
            { presetId: "ghost", label: "Poltergeist", pitchEffectChain: { pitch: 2, gain: 0.9, distortion: 0.3, reverb: 5.0, echo: 0.9 } },
        ];
        return this.presets;
    }
}

export { PresetManager, VoicePreset };