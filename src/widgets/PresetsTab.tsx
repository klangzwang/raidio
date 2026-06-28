import { useState, useEffect, useRef } from 'react';
import { PresetManager, VoicePreset } from '../lib/PresetManager';
import { ChevronUp, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfigManager } from '../lib/ConfigManager';
import { Controller } from '../controller';
import * as Tone from 'tone';

interface VoicePresetAccordionProps {
    presets: VoicePreset[];
    selectedPresetId: string | null;
    onSelectPreset: (presetId: string) => void;
    onEnabledPreset: () => void;
    isPresetEnabled: boolean;
}

function VoicePresetAccordion({
    presets,
    selectedPresetId,
    onSelectPreset,
    onEnabledPreset,
    isPresetEnabled,
}: VoicePresetAccordionProps) {

    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="w-full flex-col rounded-lg overflow-hidden bg-[#F3EBD8] shadow-[0_4px_0_0_rgba(0,0,0,0.5)] mb-4">
            <div className="w-full flex items-stretch text-left transition-colors">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex-1 flex items-stretch text-left border-b-2 border-black"
                >
                    <div className="bg-[#f9eedf] px-5 py-4 font-black text-[1.1rem] tracking-wide text-[#1B1D22] flex-1 font-sans flex items-center">
                        VOICE-PRESETS
                    </div>
                    <div className="bg-[#F5B925] w-14 border-l-2 border-black flex items-center justify-center shrink-0 hover:bg-[#dca620] focus:outline-none transition-colors">
                        {isOpen ? <ChevronUp size={24} strokeWidth={3} className="text-[#1B1D22]" /> : <ChevronDown size={24} strokeWidth={3} className="text-[#1B1D22]" />}
                    </div>
                </button>
                <button
                    id="voice-preset-btn"
                    onClick={onEnabledPreset}
                    title={isPresetEnabled ? "Disable VoicePreset" : "Enable VoicePreset"}
                    className={`w-16 ${isPresetEnabled ? 'bg-[#dca620]' : 'bg-[#F5B925]'} hover:bg-[#dca620] border-l-2 border-b-2 border-black flex items-center justify-center shrink-0 transition-colors focus:outline-none`}
                >
                    {isPresetEnabled ? (
                        <div>ON</div>
                    ) : (
                        <div>OFF</div>
                    )}
                </button>
            </div>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.section
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="border-t-2 border-black overflow-hidden bg-[#F3EBD8]"
                    >
                        <div className="px-5 pb-6 pt-5 space-y-4">

                            <ul className="space-y-2">
                                {presets.map((device) => {
                                    const label = device.label || "Unknown Device";
                                    const isSelected = device.presetId === selectedPresetId;

                                    return (
                                        <li key={device.presetId}>
                                            <button
                                                onClick={() => onSelectPreset(device.presetId)}
                                                className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-md font-medium text-[0.95rem] tracking-tight transition-colors ${isSelected ? 'bg-[#1B1D22] text-[#F3EBD8]' : 'text-[#202428] hover:bg-[#e1d5be]'
                                                    }`}
                                            >
                                                <span className="truncate pr-4">{label}</span>
                                                {isSelected && <Check size={18} className="shrink-0" />}
                                            </button>
                                        </li>
                                    );
                                })}
                                {presets.length === 0 && (
                                    <div className="text-sm font-medium text-[#9A9B9F]">No presets found...</div>
                                )}
                            </ul>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
}

export function PresetsTab() {

    const [presets, setPresets] = useState<VoicePreset[]>(PresetManager.getPresets());
    const [selectedPresetId, setSelectedPresetId] = useState<string>("");
    const [isPresetActive, setIsPresetActive] = useState<boolean>(false);
    const micRef = useRef<Tone.UserMedia | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const gateRef = useRef<Tone.Gate | null>(null);
    const preset: VoicePreset = PresetManager.getPresetById(selectedPresetId)!;

    const [isGameRunning, setIsGameRunning] = useState<boolean>(Controller.getInstance().getIsGameRunning());

    useEffect(() => {
        const refresh = () => setIsGameRunning(Controller.getInstance().getIsGameRunning());
        refresh();
        window.addEventListener('winopen-changed', refresh);
        return () => {
            window.removeEventListener('winopen-changed', refresh);
        };
    }, []);

    useEffect(() => {
        const savedPresetId = ConfigManager.loadPreset();
        if (savedPresetId) {
            setSelectedPresetId(savedPresetId);
        }

        const initPresets = async () => {
            try {
                const preset = PresetManager.getInstance();
                setPresets(PresetManager.getPresets());
            } catch (err) {
                console.error("[Audio] Error initializing presets: ", err);
            }
        };
        initPresets();
    }, []);

    const handleSelectPreset = (presetId: string) => {
        setSelectedPresetId(presetId);
        ConfigManager.savePreset(presetId);
    };

    const togglePreset = async () => {
        setIsPresetActive(!isPresetActive);
        if (isPresetActive) {
            deactivatePreset();
        } else {
            activatePreset();
        }
    };

    const deactivatePreset = () => {
        setIsPresetActive(false);

        if (micRef.current) {
            micRef.current.close();
            micRef.current.disconnect();
        }
        if (gateRef.current) {
            gateRef.current.disconnect();
            gateRef.current.dispose();
            gateRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.srcObject = null;
            audioRef.current = null;
        }
    };

    const activatePreset = async () => {
        try {
            await Tone.start();

            const mic = new Tone.UserMedia();
            await mic.open();
            micRef.current = mic;

            const gate = new Tone.Gate({
                threshold: preset?.pitchEffectChain?.noiseGate ?? -40,
                smoothing: 0.1
            });
            gateRef.current = gate;

            const pitchShift = new Tone.PitchShift({
                pitch: preset?.pitchEffectChain?.pitch ?? 0,
                windowSize: 0.1
            });
            const distortion = new Tone.Distortion({
                distortion: preset?.pitchEffectChain?.distortion ?? 0,
                wet: 0.3
            });
            const reverb = new Tone.Reverb({
                decay: preset?.pitchEffectChain?.reverb ?? 0,
                preDelay: 0.01,
                wet: 0.25
            });

            const dest = Tone.getContext().createMediaStreamDestination();

            mic.connect(gate);
            gate.connect(pitchShift);
            pitchShift.connect(distortion);
            distortion.connect(reverb);
            reverb.connect(dest);

            const audio = new Audio();
            audio.autoplay = true;

            if (ConfigManager.loadAudioDevice && 'setSinkId' in audio) {
                await (audio as any).setSinkId(ConfigManager.loadAudioDevice);
            }

            audio.srcObject = dest.stream;
            audio.play().catch(err => console.error("Audio play error:", err));

            audioRef.current = audio;

            setIsPresetActive(true);
        } catch (err) {
            console.error("Fehler beim Zugriff auf das Mikrofon:", err);
        }
    };

    return (
        <div className="flex flex-col w-screen h-screen p-4">

            <div className="flex w-full font-black text-[2.1rem] tracking-tighter text-[#f9eedf] scale-y-[1.1] translate-x-3 translate-y-4">
                PRESETS
            </div>

            <div className="flex grow bg-[#333333]/80 w-full rounded-lg border border-[#777777]">
                <div className="flex w-full h-auto p-4 pt-16">
                    <VoicePresetAccordion
                        presets={presets}
                        selectedPresetId={selectedPresetId}
                        onSelectPreset={handleSelectPreset}
                        onEnabledPreset={togglePreset}
                        isPresetEnabled={isPresetActive}
                    />
                </div>
            </div>
        </div>
    );
}