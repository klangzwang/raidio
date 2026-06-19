import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, useAnimation } from 'framer-motion';
import { ChevronUp, ChevronDown, X, Play, Square, Check, ChevronLeft, ChevronRight, FolderOpen, Keyboard, WifiOff, RadioOff, MessageCircleWarning, CircleAlert } from 'lucide-react';
import { ConfigManager, GridButtonConfig } from './lib/ConfigManager';
import { AudioManager } from './lib/AudioManager';
import { createRoot } from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { OWWinUtils, OWAudioUtils } from './lib/utils';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { PresetManager, VoicePreset } from './lib/PresetManager';
import * as Tone from 'tone';

import './css/raidio.css';
import { Cards } from './components/Cards';
import { Save } from './components/save';
import { Scanner } from './components/Scanner';
import { fadeIn } from "lib/motion";

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

interface AudioDeviceAccordionProps {
    title: string;
    devices: MediaDeviceInfo[];
    selectedDeviceId: string | null;
    onSelectDevice: (deviceId: string) => void;
    onPlayTestTone: () => void;
    isTestTonePlaying: boolean;
    defaultOpen?: boolean;
}

function AudioDeviceAccordion({
    title,
    devices,
    selectedDeviceId,
    onSelectDevice,
    onPlayTestTone,
    isTestTonePlaying,
    defaultOpen = false,
}: AudioDeviceAccordionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="w-full flex-col rounded-lg overflow-hidden bg-[#F3EBD8] shadow-[0_4px_0_0_rgba(0,0,0,0.5)] mb-4">
            <div className="w-full flex items-stretch text-left transition-colors">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex-1 flex items-stretch text-left border-b-2 border-black"
                >
                    <div className="bg-[#f9eedf] px-5 py-4 font-black text-[1.1rem] tracking-wide text-[#1B1D22] flex-1 font-sans flex items-center">
                        {title}
                    </div>
                    <div className="bg-[#F5B925] w-14 border-l-2 border-black flex items-center justify-center shrink-0 hover:bg-[#dca620] focus:outline-none transition-colors">
                        {isOpen ? <ChevronUp size={24} strokeWidth={3} className="text-[#1B1D22]" /> : <ChevronDown size={24} strokeWidth={3} className="text-[#1B1D22]" />}
                    </div>
                </button>
                <button
                    id="test-tone-btn"
                    onClick={onPlayTestTone}
                    title={isTestTonePlaying ? "Stop Test Tone" : "Play Test Tone"}
                    className={`w-16 ${isTestTonePlaying ? 'bg-[#dca620]' : 'bg-[#F5B925]'} hover:bg-[#dca620] border-l-2 border-b-2 border-black flex items-center justify-center shrink-0 transition-colors focus:outline-none`}
                >
                    {isTestTonePlaying ? (
                        <Square size={24} fill="currentColor" className="text-[#1B1D22]" />
                    ) : (
                        <Play size={24} fill="currentColor" className="text-[#1B1D22]" />
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
                                {devices.map((device) => {
                                    const label = device.label || "Unknown Device";
                                    const isSelected = device.deviceId === selectedDeviceId;

                                    return (
                                        <li key={device.deviceId}>
                                            <button
                                                onClick={() => onSelectDevice(device.deviceId)}
                                                className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-md font-medium text-[0.95rem] tracking-tight transition-colors ${isSelected ? 'bg-[#1B1D22] text-[#F3EBD8]' : 'text-[#202428] hover:bg-[#e1d5be]'
                                                    }`}
                                            >
                                                <span className="truncate pr-4">{label}</span>
                                                {isSelected && <Check size={18} className="shrink-0" />}
                                            </button>
                                        </li>
                                    );
                                })}
                                {devices.length === 0 && (
                                    <div className="text-sm font-medium text-[#9A9B9F]">No audio devices found...</div>
                                )}
                            </ul>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
}

function GridCell({ level, index, currentLevel, selectedDeviceId }: { level: number, index: number, currentLevel: number, selectedDeviceId: string | null }) {
    const [config, setConfig] = useState<GridButtonConfig>({ soundData: null, soundName: null, hotkey: `Numpad${index + 1}` });
    const [isAssigningHotkey, setIsAssigningHotkey] = useState(false);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Konfiguration laden und Blob-URL erzeugen
    useEffect(() => {
        ConfigManager.loadButtonConfig(level, index).then(cfg => {
            if (cfg) {
                if (cfg.soundData instanceof Blob) {
                    const url = URL.createObjectURL(cfg.soundData);
                    setObjectUrl(url);
                }
                setConfig(cfg);
            } else {
                setConfig({ soundData: null, soundName: null, hotkey: `Numpad${index + 1}` });
                setObjectUrl(null);
            }
        });

        // Cleanup alte Object-URL beim Unmounten oder Wechseln des Levels
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [level, index]);

    useEffect(() => {
        let active = true;
        let unlisten: (() => void) | undefined;
        (async () => {
            const u = await listen<string>('global-key-press', (event) => {
                if (level === currentLevel && event.payload === config.hotkey) {
                    playSound();
                }
            });
            if (!active) {
                u();
            } else {
                unlisten = u;
            }
        })();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isAssigningHotkey) {
                e.preventDefault();
                const newCfg = { ...config, hotkey: e.code };
                setConfig(newCfg);
                ConfigManager.saveButtonConfig(level, index, newCfg);
                setIsAssigningHotkey(false);
                return;
            }

            if (level === currentLevel && e.code === config.hotkey) {
                playSound();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            active = false;
            unlisten?.();
            window.removeEventListener('keydown', handleKeyDown);
        };

    }, [config, level, currentLevel, isAssigningHotkey, selectedDeviceId, objectUrl]);

    const playSound = async () => {
        if (objectUrl && selectedDeviceId) {
            const audio = AudioManager.getInstance();
            // Wir übergeben die schlanke Object-URL an den AudioManager statt der Base64-Wand
            await audio.playMp3(objectUrl, selectedDeviceId);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Direktes Prüfen der Dauer via temporärer ObjectURL (kein FileReader-RAM-Flaschenhals)
            const tempUrl = URL.createObjectURL(file);
            const audio = new Audio(tempUrl);

            audio.onloadedmetadata = () => {
                if (audio.duration > 6) {
                    alert("Die Audiodatei darf maximal 6 Sekunden lang sein.");
                    URL.revokeObjectURL(tempUrl);
                } else {
                    // Alte URL revoken, falls vorhanden
                    if (objectUrl) URL.revokeObjectURL(objectUrl);

                    const newUrl = URL.createObjectURL(file);
                    setObjectUrl(newUrl);

                    const newCfg = { soundData: file, soundName: file.name, hotkey: config.hotkey };
                    setConfig(newCfg);
                    ConfigManager.saveButtonConfig(level, index, newCfg);
                }
            };
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleReset = () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            setObjectUrl(null);
        }
        const newCfg = { soundData: null, soundName: null, hotkey: `Numpad${index + 1}` };
        setConfig(newCfg);
        ConfigManager.saveButtonConfig(level, index, newCfg);
    };

    const isRightCol = index % 3 === 2;
    const isBottomRow = index >= 6;

    const getRandomClickSound = (): string => {
        const randomNumber = Math.floor(Math.random() * 3) + 1;
        return `click${randomNumber}.mp3`;
    };

    const playRandomSound = () => {
        const soundFile = getRandomClickSound();
        const audio = new Audio(`/snd/ui/${soundFile}`);
        audio.play().catch(error => console.error("Audio konnte nicht abgespielt werden:", error));
    };

    return (
        <div
            className={`relative group aspect-square flex flex-col items-center justify-center bg-[#f9eedf] hover:bg-[#F5B925] focus-within:bg-[#F5B925] transition-colors
        ${!isRightCol ? 'border-r-2 border-black' : ''}
        ${!isBottomRow ? 'border-b-2 border-black' : ''}
      `}
        >
            <button
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center focus:outline-none outline-none z-0 active:bg-[#dca620]"
                onClick={playSound}
                onMouseEnter={playRandomSound}
            >
                <span className="font-black text-3xl text-[#1B1D22] font-sans">{index + 1}</span>
                {config.soundName && (
                    <span className="text-[10px] text-center w-full px-1 truncate text-[#1B1D22] opacity-80 mt-1">
                        {config.soundName}
                    </span>
                )}
                <span className="absolute bottom-1 left-1 text-[9px] font-bold opacity-50 text-[#1B1D22]">
                    {isAssigningHotkey ? "PRESS KEY..." : config.hotkey}
                </span>
            </button>

            {/* Hover Actions */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="p-1.5 bg-[#1B1D22] rounded hover:bg-[#343841] text-[#F5B925] transition-colors shadow-sm focus:outline-none"
                    title="Sound zuweisen (Max 6s)"
                >
                    <FolderOpen size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsAssigningHotkey(!isAssigningHotkey); }}
                    className={`p-1.5 rounded transition-colors shadow-sm focus:outline-none ${isAssigningHotkey ? 'bg-[#F5B925] text-[#1B1D22]' : 'bg-[#1B1D22] text-[#F5B925] hover:bg-[#343841]'}`}
                    title="Hotkey zuweisen"
                >
                    <Keyboard size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="p-1.5 bg-red-600 rounded hover:bg-red-500 text-white transition-colors shadow-sm focus:outline-none"
                    title="Zurücksetzen"
                >
                    <X size={14} />
                </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileChange} />
        </div>
    );
}

type Page = 'raidio' | 'board' | 'presets' | 'settings';

export function Raidio() {

    const [activePage, setActivePage] = useState<Page>('raidio');

    const [presets, setPresets] = useState<VoicePreset[]>(PresetManager.getPresets());
    const [selectedPresetId, setSelectedPresetId] = useState<string>("");
    const [isPresetActive, setIsPresetActive] = useState<boolean>(false);
    const micRef = useRef<Tone.UserMedia | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const gateRef = useRef<Tone.Gate | null>(null);
    const preset: VoicePreset = PresetManager.getPresetById(selectedPresetId)!;

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [isTestTonePlaying, setIsTestTonePlaying] = useState(false);

    const [isAudioMuted, setIsAudioMuted] = useState(false);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragControls = useDragControls();
    const controls = useAnimation();

    const [isAssigningRadialHotkey, setIsAssigningRadialHotkey] = useState(false);
    const [isGameRunning, setIsGameRunning] = useState(false);

    const [remoteCards, setRemoteCards] = useState<any[]>([]);
    const [isLoadingCards, setIsLoadingCards] = useState<boolean>(true);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                setIsLoadingCards(true);
                const response = await fetch('https://raw.githubusercontent.com/klangzwang/VResources/refs/heads/main/cards.json');
                if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
                const data = await response.json();
                setRemoteCards(data);
            } catch (err) {
                console.error("[Raidio] Fehler beim Laden der remote Cards:", err);
            } finally {
                setTimeout(() => {
                    setIsLoadingCards(false);
                }, 2000)
            }
        };

        fetchCards();
    }, []);

    useEffect(() => {
        invoke('open_window_process');
        const unlisten = listen<boolean>('process-changed', (event) => {
            setIsGameRunning(event.payload);
        });
        return () => {
            unlisten.then(f => f());
        };
    }, []);

    useEffect(() => {
        const checkWindowStatus = async () => {
            try {
                const isVisible = await getCurrentWindow().isVisible();
                if (!isGameRunning && !isVisible) {
                    OWWinUtils.showWindow(getCurrentWindow(), "/snd/ui/open.mp3");
                    if (await getCurrentWindow().isMinimized()) {
                        await getCurrentWindow().unminimize();
                    }
                    getCurrentWindow().setFocus();
                }
                if (isGameRunning && isVisible) {
                    // OWWinUtils.hideWindow(getCurrentWindow(), "/snd/ui/debug.mp3");
                }
            } catch (error) { }
        };
        checkWindowStatus();
    }, [isGameRunning]);

    useEffect(() => {
        controls.start({ x: isSidebarOpen ? 0 : -240 });
    }, [isSidebarOpen, controls]);

    const [currentLevelState, _setCurrentLevelState] = useState<number>(ConfigManager.loadCurrentLevel());

    const setCurrentLevel = (value: React.SetStateAction<number>) => {
        _setCurrentLevelState(prev => {
            const nextLevel = typeof value === 'function' ? value(prev) : value;
            ConfigManager.saveCurrentLevel(nextLevel);
            return nextLevel;
        });
    };

    const currentLevel = currentLevelState;

    useEffect(() => {
        const savedRadialMenuKey = ConfigManager.loadRadialMenuKey();

        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isAssigningRadialHotkey) {
                e.preventDefault();
                ConfigManager.saveRadialMenuKey(e.code);
                setIsAssigningRadialHotkey(false);
                return;
            }
        };

        let active = true;
        let unlistenDown: (() => void) | undefined;
        let unlistenUp: (() => void) | undefined;

        (async () => {
            const existingWindow = await WebviewWindow.getByLabel('radial');
            const uDown = await listen<string>('global-key-press', (event) => {
                const key = event.payload as string;
                if (key === savedRadialMenuKey) {
                    if (existingWindow) {
                        existingWindow.show();
                    }
                }
            });
            const uUp = await listen<string>('global-key-release', (event) => {
                const key = event.payload as string;
                if (key === savedRadialMenuKey) {
                    if (existingWindow) {
                        existingWindow.hide();
                    }
                }
            });
            if (!active) {
                uDown();
                uUp();
            } else {
                unlistenDown = uDown;
                unlistenUp = uUp;
            }
        })();

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            active = false;
            unlistenDown?.();
            unlistenUp?.();
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isAssigningRadialHotkey]);

    useEffect(() => {
        let active = true;
        let unlisten: (() => void) | undefined;
        (async () => {
            const u = await listen<string>('global-key-press', (event) => {
                const audio = AudioManager.getInstance();
                setTimeout(() => {
                    if (event.payload as string === 'NumpadAdd') {
                        if (currentLevel < 9)
                            setCurrentLevel(currentLevel + 1);
                        else
                            setCurrentLevel(1);
                    } else if (event.payload as string === 'NumpadSubtract') {
                        if (currentLevel > 1)
                            setCurrentLevel(currentLevel - 1);
                        else
                            setCurrentLevel(9);
                    } else if (event.payload as string === 'NumpadDivide') {
                        OWAudioUtils.playSound(isAudioMuted ? "snd/ui/beep1.mp3" : "snd/ui/beep2.mp3", 1.0)
                        audio.setMuted(!audio.getMuted());
                        setIsAudioMuted(!isAudioMuted);
                    }
                }, 100)
            });
            if (!active) {
                u();
            } else {
                unlisten = u;
            }
        })();

        const handleKeyDown = async (event: KeyboardEvent) => {
            const audio = AudioManager.getInstance();
            setTimeout(() => {
                if (event.code as string === 'NumpadAdd') {
                    if (currentLevel < 9)
                        setCurrentLevel(currentLevel + 1);
                    else
                        setCurrentLevel(1);
                } else if (event.code as string === 'NumpadSubtract') {
                    if (currentLevel > 1)
                        setCurrentLevel(currentLevel - 1);
                    else
                        setCurrentLevel(9);
                } else if (event.code as string === 'NumpadDivide') {
                    OWAudioUtils.playSound(isAudioMuted ? "snd/ui/beep1.mp3" : "snd/ui/beep2.mp3", 1.0)
                    audio.setMuted(!audio.getMuted());
                    setIsAudioMuted(!isAudioMuted);
                }
            }, 100)
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            active = false;
            unlisten?.();
            window.removeEventListener('keydown', handleKeyDown);
        };

    }, [currentLevel, isAudioMuted]);

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

    useEffect(() => {
        const savedDeviceId = ConfigManager.loadAudioDevice();
        if (savedDeviceId) {
            setSelectedDeviceId(savedDeviceId);
        }

        const initAudio = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(t => t.stop());
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const audioOutputs = allDevices.filter(d => d.kind === 'audiooutput');
                setDevices(audioOutputs);

                if (!savedDeviceId && audioOutputs.length > 0) {
                    const defaultDevice = audioOutputs.find(d => d.deviceId === 'default') || audioOutputs[0];
                    handleSelectDevice(defaultDevice.deviceId);
                }
            } catch (err) {
                console.error("[Audio] Error initializing devices: ", err);
            }
        };
        initAudio();
    }, []);

    const handleSelectDevice = (deviceId: string) => {
        setSelectedDeviceId(deviceId);
        ConfigManager.saveAudioDevice(deviceId);
        AudioManager.getInstance().setSinkIdForAudioContext(deviceId);
    };

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

            if (selectedDeviceId && 'setSinkId' in audio) {
                await (audio as any).setSinkId(selectedDeviceId);
            }

            audio.srcObject = dest.stream;
            audio.play().catch(err => console.error("Audio play error:", err));

            audioRef.current = audio;

            setIsPresetActive(true);
        } catch (err) {
            console.error("Fehler beim Zugriff auf das Mikrofon:", err);
        }
    };

    useEffect(() => {
        return () => stopTestTone();
    }, []);

    const stopTestTone = (): void => {
        if (oscillatorRef.current) {
            oscillatorRef.current.stop();
            oscillatorRef.current.disconnect();
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
        }
        audioCtxRef.current = null;
        oscillatorRef.current = null;
        setIsTestTonePlaying(false);
    }

    const toggleTestTone = async () => {

        if (isTestTonePlaying) {
            stopTestTone();
            return;
        }

        if (!selectedDeviceId) {
            return;
        }

        try {

            const ctx = new AudioContext();
            if ((ctx as any).setSinkId) {
                await (ctx as any).setSinkId(selectedDeviceId);
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();

            audioCtxRef.current = ctx;
            oscillatorRef.current = osc;
            setIsTestTonePlaying(true);

        } catch (err) {

        }
    };

    useEffect(() => {
        const handleClickInteraction = (e: Event) => {
            if (e.target) {
                if (!(e.target as HTMLElement).closest('#test-tone-btn')) {
                    if (isTestTonePlaying) {
                        stopTestTone();
                        setIsTestTonePlaying(false);
                    }
                    return;
                }
            }
        };

        const handleKeyInteraction = (e: Event) => {
            if (isTestTonePlaying) {
                stopTestTone();
                setIsTestTonePlaying(false);
            }
        };

        window.addEventListener('click', handleClickInteraction);
        window.addEventListener('keydown', handleKeyInteraction);

        return () => {
            window.removeEventListener('click', handleClickInteraction);
            window.removeEventListener('keydown', handleKeyInteraction);
        };
    }, [isTestTonePlaying]);

    return (
        <div className="w-screen h-screen flex items-center justify-center font-sans selection:bg-[#00000000] selection:text-[#090c19ff]">

            <div className="relative flex flex-col w-full max-w-[400px] h-[720px] bg-[#090c19]/80 rounded-lg select-none overflow-hidden p-4">

                <AnimatePresence mode="wait">
                    {activePage === 'raidio' && (

                        <motion.div
                            key="raidio"
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            transition={{ duration: 0.75 }}
                            className="w-full h-full pt-8"
                        >
                            <div
                                className="w-full h-full rounded-lg overflow-hidden border border-[#777777]"
                                style={{
                                    backgroundImage: 'url("img/bg.png")',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* <div className="absolute z-10 top-13 left-[17px] right-[17px] h-24 rounded-t-lg bg-[#000000] backdrop-blur-sm [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.9)_50%,rgba(0,0,0,0)_100%)]" />
                                <div className="absolute z-10 bottom-[17px] left-[17px] right-[17px] h-16 rounded-b-lg bg-[#000000] backdrop-blur-sm [mask-image:linear-gradient(to_top,rgba(0,0,0,0.9)_20%,rgba(0,0,0,0)_100%)]" /> */}

                                {/* <div className="absolute z-10 top-13 left-3 right-0 items-start justify-center">
                                    <div className="w-full h-full items-center justify-start pl-2">
                                        <motion.div
                                            initial={{ opacity: 0, y: 240 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="w-full max-w-92 p-3 flex items-center overflow-hidden"
                                        >
                                            <div className="bg-[#1a1a1a] p-3 rounded-xl flex items-center justify-center shrink-0">
                                                <img src="img/icons/IconRadio.png" className="w-8 h-8" />
                                            </div>

                                            <div className="h-12 w-px bg-[#666666] mx-4" />

                                            <div className="flex flex-col justify-center overflow-hidden">
                                                <h2 className="font-[Arial] text-[#cecece] text-[9pt]">
                                                    ANTENNAE ARRAY 12
                                                </h2>

                                                <div className="flex items-center">
                                                    <span className="font-[Arial] text-[#cecece] text-[10pt]">SIGNAL:&nbsp;</span>
                                                    <span
                                                        className="font-[Arial] text-[10pt]"
                                                        style={{ color: "#00ff00" }}
                                                    >
                                                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                                    </span>
                                                    <CircleAlert size={18} className="text-[#ffff00]" />
                                                </div>

                                            </div>
                                        </motion.div>
                                    </div>
                                </div> */}

                                <div onScroll={() => setIsScrolling(true)} onScrollEnd={() => setIsScrolling(false)} className="flex-1 w-full h-full pl-4 pr-4 overflow-y-auto overflow-x-hidden no-scrollbar">
                                    <div className="flex flex-col w-full h-full pt-4">
                                        {isLoadingCards ? (
                                            <div className="p-4 text-white font-mono text-xs animate-pulse">Loading...</div>
                                        ) : (
                                            <Cards items={remoteCards} />
                                        )}
                                    </div>
                                </div>

                            </div>
                        </motion.div>
                    )}
                    {activePage === 'board' && (
                        <motion.div
                            key="board"
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            transition={{ duration: 0.75 }}
                            className='w-full h-full'
                        >
                            <div className="w-full rounded-lg overflow-hidden bg-[#f9eedf] border-2 border-black">

                                <div className="w-full h-36" />

                                <div className="grid grid-cols-3">
                                    {Array.from({ length: 9 }).map((_, i) => (
                                        <GridCell
                                            key={`${currentLevel}-${i}`}
                                            level={currentLevel}
                                            index={i}
                                            currentLevel={currentLevel}
                                            selectedDeviceId={selectedDeviceId}
                                        />
                                    ))}
                                </div>

                                <div className="w-full h-20">
                                </div>

                                <div className="w-full flex rounded-b-lg overflow-hidden bg-[#f9eedf] border-2 border-black">
                                    <button
                                        onClick={() => {
                                            setCurrentLevel(prev => prev > 1 ? prev - 1 : 9),
                                                OWAudioUtils.playSound("snd/ui/click1.mp3", 0.5)
                                        }
                                        }
                                        className="w-14 bg-[#F5B925] border-r-2 border-black flex items-center justify-center shrink-0 hover:bg-[#dca620] focus:outline-none transition-colors"
                                    >
                                        <ChevronLeft size={24} strokeWidth={3} className="text-[#1B1D22]" />
                                    </button>
                                    <div className="flex-1 flex items-center justify-center py-4 font-black text-[1.1rem] tracking-wide text-[#1B1D22] font-sans">
                                        SET {currentLevel}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCurrentLevel(prev => prev < 9 ? prev + 1 : 1),
                                                OWAudioUtils.playSound("snd/ui/click2.mp3", 0.5)
                                        }
                                        }
                                        className="w-14 bg-[#F5B925] border-l-2 border-black flex items-center justify-center shrink-0 hover:bg-[#dca620] focus:outline-none transition-colors"
                                    >
                                        <ChevronRight size={24} strokeWidth={3} className="text-[#1B1D22]" />
                                    </button>
                                </div>

                            </div>

                        </motion.div>
                    )}
                    {activePage === 'presets' && (
                        <motion.div
                            key="presets"
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            transition={{ duration: 0.75 }}
                            className='w-full h-full'
                        >

                            <VoicePresetAccordion
                                presets={presets}
                                selectedPresetId={selectedPresetId}
                                onSelectPreset={handleSelectPreset}
                                onEnabledPreset={togglePreset}
                                isPresetEnabled={isPresetActive}
                            />
                            <Save />
                        </motion.div>
                    )}
                    {activePage === 'settings' && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            transition={{ duration: 0.25 }}
                            className='w-full h-full'
                        >

                            <AudioDeviceAccordion
                                title="AUDIO DEVICES"
                                devices={devices}
                                selectedDeviceId={selectedDeviceId}
                                onSelectDevice={handleSelectDevice}
                                onPlayTestTone={toggleTestTone}
                                isTestTonePlaying={isTestTonePlaying}
                                defaultOpen={false}
                            />

                            <div onScroll={() => setIsScrolling(true)} onScrollEnd={() => setIsScrolling(false)} className="flex-1 w-full h-full pl-4 pr-4 overflow-y-auto overflow-x-hidden no-scrollbar">
                                <Scanner />
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isSidebarOpen ? (
                        <div
                            className="absolute top-8 inset-0 bg-[#000000]/60 z-30"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    ) :
                        isDragging && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.6 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-8 inset-0 bg-[#000000] z-30 pointer-events-auto"
                            />
                        )
                    }
                </AnimatePresence>

                <motion.div
                    drag="x"
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={{ left: -240, right: 0 }}
                    dragElastic={0}
                    dragMomentum={false}
                    onDragStart={(e, info) => {
                        setIsDragging(true);
                    }}
                    onDragEnd={(e, info) => {
                        setIsDragging(false);
                        if (!isSidebarOpen) {
                            if (info.offset.x > 120) {
                                setIsSidebarOpen(true);
                            } else {
                                controls.start({ x: -240 });
                            }
                        } else {
                            if (info.offset.x < -100) {
                                setIsSidebarOpen(false);
                            } else {
                                controls.start({ x: 0 });
                            }
                        }
                    }}
                    initial={{ x: isSidebarOpen ? 0 : -240 }}
                    animate={controls}
                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                    className="absolute top-8 bottom-0 left-0 w-[240px] bg-[#111318] border-r border-[#1b1e25] z-40 p-5 shadow-2xl flex flex-col"
                >
                    <div
                        onPointerDown={(e) => dragControls.start(e)}
                        className={`absolute top-0 bottom-0 ${isSidebarOpen ? 'right-0 w-6' : '-right-6 w-6'
                            } cursor-ew-resize flex items-center justify-center group touch-none`}
                    >
                        <div className={`w-1.5 h-16 ${isSidebarOpen ? 'bg-white/10 rounded-full' : 'bg-white/20 rounded-r-full'
                            } opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </div>

                    <h2 className="text-[#ece2d0] font-black uppercase tracking-wider mb-6 text-sm flex items-center gap-2">
                        <ChevronDown className="-rotate-90" size={16} /> Quick Menu
                    </h2>
                    <nav className="flex flex-col gap-2 flex-1">
                        <button
                            disabled={activePage === "raidio"}
                            onClick={() => {
                                setIsSidebarOpen(false),
                                    setActivePage("raidio"),
                                    OWAudioUtils.playSound("snd/ui/click6.mp3", 0.5);
                            }
                            }
                            className={`text-left px-3 py-2 rounded text-sm font-bold ${activePage === "raidio" ? "text-[#090c19] bg-[#F5B925]" : "text-[#ece2d0] bg-white/10"} transition-colors`}
                        >
                            Raidio
                        </button>
                        <button
                            disabled={activePage === "board"}
                            onClick={() => {
                                setIsSidebarOpen(false),
                                    setActivePage("board"),
                                    OWAudioUtils.playSound("snd/ui/click6.mp3", 0.5);
                            }
                            }
                            className={`text-left px-3 py-2 rounded text-sm font-bold ${activePage === "board" ? "text-[#090c19] bg-[#F5B925]" : "text-[#ece2d0] bg-white/10"} transition-colors`}
                        >
                            Board
                        </button>
                        <button
                            disabled={activePage === "presets"}
                            onClick={() => {
                                setIsSidebarOpen(false),
                                    setActivePage("presets"),
                                    OWAudioUtils.playSound("snd/ui/click6.mp3", 0.5);
                            }
                            }
                            className={`text-left px-3 py-2 rounded text-sm font-bold ${activePage === "presets" ? "text-[#090c19] bg-[#F5B925]" : "text-[#ece2d0] bg-white/10"} transition-colors`}
                        >
                            Presets
                        </button>
                        <button
                            disabled={activePage === "settings"}
                            onClick={() => {
                                setIsSidebarOpen(false),
                                    setActivePage("settings"),
                                    OWAudioUtils.playSound("snd/ui/click6.mp3", 0.5);
                            }
                            }
                            className={`text-left px-3 py-2 rounded text-sm font-bold ${activePage === "settings" ? "text-[#090c19] bg-[#F5B925]" : "text-[#ece2d0] bg-white/10"} transition-colors`}
                        >
                            Settings
                        </button>
                    </nav>

                    <button
                        onClick={(e) => { e.stopPropagation(); setIsAssigningRadialHotkey(!isAssigningRadialHotkey); }}
                        className={`p-1.5 rounded transition-colors shadow-sm focus:outline-none ${isAssigningRadialHotkey ? 'bg-[#F5B925] text-[#1B1D22]' : 'bg-[#1B1D22] text-[#F5B925] hover:bg-[#343841]'}`}
                    >
                        RadialMenu Hotkey
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsAssigningRadialHotkey(!isAssigningRadialHotkey); }}
                        className={`p-1.5 rounded transition-colors shadow-sm focus:outline-none ${isAssigningRadialHotkey ? 'bg-[#F5B925] text-[#1B1D22]' : 'bg-[#1B1D22] text-[#F5B925] hover:bg-[#343841]'}`}
                    >
                        Mute Hotkey
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsAssigningRadialHotkey(!isAssigningRadialHotkey); }}
                        className={`p-1.5 rounded transition-colors shadow-sm focus:outline-none ${isAssigningRadialHotkey ? 'bg-[#F5B925] text-[#1B1D22]' : 'bg-[#1B1D22] text-[#F5B925] hover:bg-[#343841]'}`}
                    >
                        Next Set Hotkey
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsAssigningRadialHotkey(!isAssigningRadialHotkey); }}
                        className={`p-1.5 rounded transition-colors shadow-sm focus:outline-none ${isAssigningRadialHotkey ? 'bg-[#F5B925] text-[#1B1D22]' : 'bg-[#1B1D22] text-[#F5B925] hover:bg-[#343841]'}`}
                    >
                        Prev Set Hotkey
                    </button>

                    <div className="mt-auto text-xs text-neutral-600 font-mono">
                        v0.5.0
                    </div>
                </motion.div>

            </div>

            <div className={`absolute z-10 top-0 left-0 flex w-full h-16 backdrop-blur-sm rounded-t-lg [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_40%,rgba(0,0,0,0)_100%)]`} />

            <div data-tauri-drag-region className="absolute z-10 top-0 left-0 flex flex-row w-full max-w-[400px] h-8 rounded-t-lg select-none overflow-hidden">

                <div className={`flex bg-[#090c19] w-10 h-full items-center justify-center shrink-0 pointer-events-auto`}>
                    <motion.img
                        transition={{
                            duration: 1,
                            repeat: 0,
                            type: "spring",
                            stiffness: 400,
                            damping: 17
                        }}
                        whileTap={{ scale: 0.90 }}
                        whileHover={{ scale: 1.15 }}
                        onPointerDown={() => {
                            dragControls.start
                            controls.start({ x: isSidebarOpen ? -240 : 0 })
                            setIsSidebarOpen(!isSidebarOpen)
                            dragControls.stop
                            OWAudioUtils.playSound(isSidebarOpen ? "/snd/ui/beep2.mp3" : "/snd/ui/beep1.mp3", 0.5)
                        }}
                        onDoubleClick={() => OWWinUtils.destroyRaidio("/snd/ui/close.mp3", 1500)}
                        className={isAudioMuted ? "w-0 h-0" : "w-6 h-6"}
                        src="img/logo.png"
                    />
                    <RadioOff size={22} className={isAudioMuted ? "w-6 h-6 text-[#ff0000]" : "w-0 h-0"} />
                </div>

                <div
                    data-tauri-drag-region
                    className="flex grow bg-[#f9eedf]/80 w-full h-full items-center justify-start pl-2 scale-y-[1.1]"
                    style={{
                        fontFamily: "Arial",
                        fontSize: "14pt",
                        fontWeight: "bold",
                        color: "#090c19",
                    }}
                >
                    RAIDIO
                </div>

                <div className="flex bg-[#f9eedf]/80 h-full items-center justify-center shrink-0 pointer-events-auto">
                    <ChevronDown size={22} className="text-[#090c19] hover:text-[#8e8e8e]" onClick={() => OWWinUtils.hideWindow(getCurrentWindow(), "snd/ui/debug.mp3")} />
                    <X size={22} className="text-[#090c19] hover:text-[#8e8e8e]" onClick={() => OWWinUtils.destroyRaidio("snd/ui/close.mp3", 1500)} />
                </div>

            </div>

        </div>
    );
}

const container = document.getElementById('root')!;
const root = (container as any)._reactRoot || createRoot(container);
(container as any)._reactRoot = root;
root.render(<Raidio />);