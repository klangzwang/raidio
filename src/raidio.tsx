import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, useAnimation } from 'framer-motion';
import { ChevronUp, ChevronDown, X, Play, Square, Check, ChevronLeft, ChevronRight, FolderOpen, Keyboard, WifiOff, RadioOff, MessageCircleWarning, CircleAlert, Radio, Grid, Cog, Info, Users, Tickets } from 'lucide-react';
import { ConfigManager, GridButtonConfig } from './lib/ConfigManager';
import { AudioManager } from './lib/AudioManager';
import { createRoot } from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { OWWinUtils, OWAudioUtils, OWMathUtils } from './lib/utils';
import { listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { PresetManager, VoicePreset } from './lib/PresetManager';
import { GradientBorder } from 'react-gradient-borders';
import { Cards } from './components/Cards';
import { SaveFileParser, CategorizedSetting, SettingCategory } from './components/ConfigParser';
import * as Tone from 'tone';

import './css/raidio.css';

const WORD_SOUND_MAP: Record<string, string> = {
    "wasp": "snd/ping/wasp.mp3",
    "rocketeer": "snd/ping/rocketeer.mp3",
    "snitch": "snd/pop/ball_beep01.mp3",
    "dummy": "snd/pop/ball_explo01.mp3",
};

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

export function SearchResultsReact() {

    const savPath = 'C:\\Users\\Administrator\\AppData\\Local\\PioneerGame\\Saved\\SaveGames\\EmbarkOptionSaveGame.sav';

    const [parser] = useState(new SaveFileParser(savPath));
    const [results, setResults] = useState<CategorizedSetting[]>([]);

    useEffect(() => {
        const handleSearch = async () => {
            try {
                await parser.loadSaveFile();
                const catSettings = parser.findSetting("SFXVolume");
                console.log('Audio-Einstellungen:', catSettings);
                setResults(catSettings);
            } catch (error) {
                console.error('Suchfehler:', error);
            }
        };
        handleSearch();
    }, [parser]);

    return (
        <div style={{ padding: '20px' }}>

            <div style={{ marginTop: '20px' }}>
                {results.length === 0 ? (
                    <p style={{ color: '#888' }}>Keine Ergebnisse</p>
                ) : (
                    results.map((result) => {
                        const color = htmlColors[result.category] || '#607d8b';
                        const valueStr = typeof result.value === 'object'
                            ? JSON.stringify(result.value)
                            : String(result.value);

                        return (
                            <div
                                key={result.key}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderLeft: `3px solid ${color}`,
                                    padding: '12px 15px',
                                    borderRadius: '4px',
                                    marginBottom: '10px'
                                }}
                            >
                                <div style={{ fontFamily: 'monospace', color: '#fff', fontWeight: 600 }}>
                                    {result.key}
                                </div>
                                <div style={{ fontSize: '11px', color: color, textTransform: 'uppercase' }}>
                                    {result.category}
                                </div>
                                <pre style={{
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    padding: '8px',
                                    borderRadius: '3px',
                                    fontSize: '13px',
                                    color: '#d4d4d4',
                                    marginTop: '8px'
                                }}>
                                    {valueStr}
                                </pre>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

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
            className={`relative group aspect-square flex flex-col items-center justify-center
        ${config.soundData ? "bg-[#f9eedf]" : "bg-[#777777]"} hover:bg-[#F5B925] focus-within:bg-[#F5B925] transition-colors
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
                    <span className="text-[12px] text-center w-full px-1 truncate text-[#1B1D22] opacity-80 mt-1">
                        {config.soundName}
                    </span>
                )}
                <span className={`absolute bottom-1 left-1 text-[12px] font-bold opacity-50 ${config.soundData ? "text-[#030303]" : "text-[#ffffff]/80"}`}>
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

export function Raidio() {

    const [activePage, setActivePage] = useState(0);
    const [direction, setDirection] = useState(0);

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? '100%' : '-100%',
            opacity: 0,
        }),
    };

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
    // const [isScrolling, setIsScrolling] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragAmount, setDragAmount] = useState<number>(0.0);
    const dragControls = useDragControls();
    const controls = useAnimation();

    const [isAssigningRadialHotkey, setIsAssigningRadialHotkey] = useState(false);
    const [isAssigningMuteHotkey, setIsAssigningMuteHotkey] = useState(false);
    const [isAssigningNextSetHotkey, setIsAssigningNextSetHotkey] = useState(false);
    const [isAssigningPrevSetHotkey, setIsAssigningPrevSetHotkey] = useState(false);
    const [gameState, setGameState] = useState('disconnected');
    const gameStateRef = useRef("disconnected");

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

        const unlistenGame = listen('game-status-changed', (event) => {
            setGameState('running');
            // console.log("Spiel erkannt, State: running");
        });

        const unlistenClosed = listen('window-closed', (event) => {
            setGameState('disconnected');
            // console.log("Spiel geschlossen, State: disconnected");
        });

        return () => {
            unlistenGame.then(f => f());
            unlistenClosed.then(f => f());
        };
    }, []);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);





    useEffect(() => {
        const checkPanelWindow = async () => {
            try {
                const existingWindow = await WebviewWindow.getByLabel('panel');
                console.log(existingWindow);
                // isGameRunning ? existingWindow.show() : existingWindow.hide();
                // if (isGameRunning) {
                //     OWWinUtils.showWindow(existingWindow, "/snd/ui/open.mp3");
                //     if (await existingWindow.isMinimized()) {
                //         await existingWindow.unminimize();
                //     }
                //     // existingWindow.setFocus();
                // }
                if (await existingWindow.isVisible) {
                    // OWWinUtils.hideWindow(existingWindow, "/snd/ui/debug.mp3");
                }
            } catch (error) { }
        };
        checkPanelWindow();
    }, []);







    // useEffect(() => {
    //     invoke('open_window_process');
    //     const unlisten = listen<boolean>('process-changed', (event) => {
    //         setIsGameRunning(event.payload);
    //     });
    //     return () => {
    //         unlisten.then(f => f());
    //     };
    // }, []);

    // useEffect(() => {

    //     listen('window-closed', (event) => {
    //         setGameState({
    //             isRunning: false,
    //             isVisible: false,
    //             isFocused: false
    //         });
    //     });

    //     const unlisten = listen<GameMetrics>('game-status-changed', (event: Event<GameMetrics>) => {
    //         const metrics = event.payload;
    //         setGameState({
    //             isRunning: metrics.running,
    //             isVisible: metrics.is_visible,
    //             isFocused: metrics.is_focused
    //         });
    //     });

    //     return () => {
    //         unlisten.then(f => f());
    //     };
    // }, [gameState]);

    // useEffect(() => {
    // const checkPanelWindow = async () => {
    // try {
    // const existingWindow = await WebviewWindow.getByLabel('panel');
    // isGameRunning ? existingWindow.show() : existingWindow.hide();
    // // if (isGameRunning) {
    // //     OWWinUtils.showWindow(existingWindow, "/snd/ui/open.mp3");
    // //     if (await existingWindow.isMinimized()) {
    // //         await existingWindow.unminimize();
    // //     }
    // //     // existingWindow.setFocus();
    // // }
    // if (await existingWindow.isVisible) {
    // // OWWinUtils.hideWindow(existingWindow, "/snd/ui/debug.mp3");
    // }
    // } catch (error) { }
    // };
    // checkPanelWindow();
    // }, [isGameRunning]);

    // useEffect(() => {
    // const checkWindowStatus = async () => {
    // try {
    // const isVisible = await getCurrentWindow().isVisible();
    // if (!isGameRunning && !isVisible) {
    // OWWinUtils.showWindow(getCurrentWindow(), "/snd/ui/open.mp3");
    // if (await getCurrentWindow().isMinimized()) {
    // await getCurrentWindow().unminimize();
    // }
    // getCurrentWindow().setFocus();
    // }
    // if (isGameRunning && isVisible) {
    // // OWWinUtils.hideWindow(getCurrentWindow(), "/snd/ui/debug.mp3");
    // }
    // } catch (error) { }
    // };
    // checkWindowStatus();
    // }, [isGameRunning]);

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
        const savedMuteKey = ConfigManager.loadMuteKey();
        const savedNextSetKey = ConfigManager.loadNextSetKey();
        const savedPrevSetKey = ConfigManager.loadPrevSetKey();

        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isAssigningRadialHotkey) {
                e.preventDefault();
                ConfigManager.saveRadialMenuKey(e.code);
                setIsAssigningRadialHotkey(false);
                return;
            }
            if (isAssigningMuteHotkey) {
                e.preventDefault();
                ConfigManager.saveMuteKey(e.code);
                setIsAssigningMuteHotkey(false);
                return;
            }
            if (isAssigningNextSetHotkey) {
                e.preventDefault();
                ConfigManager.saveNextSetKey(e.code);
                setIsAssigningNextSetHotkey(false);
                return;
            }
            if (isAssigningPrevSetHotkey) {
                e.preventDefault();
                ConfigManager.savePrevSetKey(e.code);
                setIsAssigningPrevSetHotkey(false);
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
                    if (existingWindow && gameStateRef.current === 'running') {
                        existingWindow.show();
                    }
                }
                if (key === savedMuteKey) {
                    setIsAudioMuted(!isAudioMuted);
                }
                if (key === savedNextSetKey) {
                    () => {
                        setCurrentLevel(prev => prev > 1 ? prev - 1 : 9),
                            OWAudioUtils.playSound("snd/ui/click1.mp3", 0.5)
                    }
                }
                if (key === savedPrevSetKey) {
                    () => {
                        setCurrentLevel(prev => prev < 9 ? prev + 1 : 1),
                            OWAudioUtils.playSound("snd/ui/click1.mp3", 0.5)
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
                if (key === savedMuteKey) {
                    setIsAudioMuted(!isAudioMuted);
                }
                if (key === savedNextSetKey) {
                    () => {
                        setCurrentLevel(prev => prev > 1 ? prev - 1 : 9),
                            OWAudioUtils.playSound("snd/ui/click1.mp3", 0.5)
                    }
                }
                if (key === savedPrevSetKey) {
                    () => {
                        setCurrentLevel(prev => prev < 9 ? prev + 1 : 1),
                            OWAudioUtils.playSound("snd/ui/click1.mp3", 0.5)
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
    }, [isAssigningRadialHotkey, isAssigningMuteHotkey, isAssigningNextSetHotkey, isAssigningPrevSetHotkey]);

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
        const handleClickInteraction = (e: MouseEvent) => {
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

        const handleKeyInteraction = (e: KeyboardEvent) => {
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

    // useEffect(() => {
    //     let active = true;
    //     let unlistenDown: (() => void) | undefined;
    //     let unlistenUp: (() => void) | undefined;

    //     (async () => {
    //         try {
    //             const hotkey = await invoke<string>('get_key_for_action', { actionName: 'SetPing' });
    //             if (!active)
    //                 return;

    //             const uDown = await listen<string>('global-key-press', (event) => {
    //                 if (event.payload === hotkey) {
    //                     // OWAudioUtils.playSound('snd/pop/ball_alert01.mp3', 0.5);
    //                 }
    //             });

    //             const uUp = await listen<string>('global-key-release', async (event) => {
    //                 if (event.payload === hotkey) {
    //                     try {
    //                         const imageUrl = await invoke<string>('scan_screen_text');
    //                         const recognizedText = await OWTessUtils.getSoundPath(imageUrl);
    //                         for (const [word, path] of Object.entries(WORD_SOUND_MAP)) {
    //                             if (recognizedText.includes(word.toLowerCase())) {
    //                                 OWAudioUtils.playSound(path, 0.5);
    //                                 break;
    //                             }
    //                         }
    //                     } catch (err) {
    //                         console.error("Error scanning screen on ping hotkey release:", err);
    //                     }
    //                 }
    //             });

    //             if (!active) {
    //                 uDown();
    //                 uUp();
    //             } else {
    //                 unlistenDown = uDown;
    //                 unlistenUp = uUp;
    //             }
    //         } catch (err) {
    //             console.error("Error setting up ping hotkey listener:", err);
    //         }
    //     })();

    //     return () => {
    //         active = false;
    //         unlistenDown?.();
    //         unlistenUp?.();
    //     };
    // }, []);





    const CurrentScreen = () => {
        switch (activePage) {
            case 0:
                return (
                    <div className="flex w-full h-full">
                        <div className="absolute bottom-4 left-4 right-4">
                            <motion.div
                                initial={{ opacity: 0, x: 100 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex w-full h-full"
                            >
                                <div className="flex flex-row w-full h-full items-center">

                                    {/* <div className="flex bg-[#7e7e7e] h-full rounded-l-lg border border-r-2 border-[#a1a1a1] overflow-hidden p-2">
                                            <img src="img/icons/IconRadio.png" />
                                        </div>

                                        <div className="flex bg-[#3e3e3e] h-full rounded-r-lg border border-l-2 border-[#a1a1a1] overflow-hidden p-2">
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
                                        </div> */}

                                    {/* <div className="flex bg-[#f9eedf] w-full h-full">
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
                                        </div> */}

                                </div>

                            </motion.div>
                        </div>
                        <div className="flex flex-col w-full h-full gap-4 p-4 pt-12">
                            {/* <motion.div
                                key="raidio"
                                initial={{ opacity: 0, x: -100, scale: 0.5 }}
                                animate={{ opacity: 1, x: 0, scale: 1.0 }}
                                exit={{ opacity: 0, x: 100, scale: 0.5 }}
                                transition={{
                                    duration: 0.35,
                                    delay: 0.10,
                                    ease: "easeInOut"
                                }}
                                className="w-full h-full pt-8"
                            > */}

                            <div
                                className="flex w-full h-full rounded-lg overflow-hidden border border-[#777777]"
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

                                {/* <div onScroll={() => setIsScrolling(true)} onScrollEnd={() => setIsScrolling(false)} className="flex-1 w-full h-full pl-4 pr-4 overflow-y-auto overflow-x-hidden no-scrollbar">
                                    <div className="flex flex-col w-full h-auto pt-4">
                                        <Cards items={remoteCards} isLoading={isLoadingCards} />
                                    </div>
                                </div> */}

                                {/* <div className="flex-1 w-full h-full p-4 overflow-y-auto overflow-x-hidden no-scrollbar">
                                    <div className="flex flex-col w-full h-full">
                                        <Cards items={remoteCards} isLoading={isLoadingCards} />
                                    </div>
                                </div> */}
                                <div className="pt-4 pl-4 pr-4 overflow-y-auto no-scrollbar">
                                    <Cards items={remoteCards} isLoading={isLoadingCards} />
                                </div>

                            </div>
                            {/* </motion.div> */}

                            <div className="flex grow w-full h-24 rounded-lg overflow-hidden">
                            </div>
                        </div>
                    </div>
                );
            case 1:
                return (
                    <div className="flex flex-col w-full h-full p-4 pt-12">

                        <div className="flex w-full bg-white/5 border-white/10 border rounded-lg items-start justify-center p-4">

                            {/* <div className="flex items-center justify-between">
                                <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-4 w-4 text-slate-300"><path d="m15 18-6-6 6-6" className=""></path></svg>
                                </button>
                                <div className="text-sm font-medium tracking-tight text-white">November 2025</div>
                                <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-4 w-4 text-slate-300"><path d="m9 18 6-6-6-6" className=""></path></svg>
                                </button>
                            </div> */}

                            <div className="grid grid-cols-3 w-full h-full rounded-lg overflow-hidden">
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
                );
            case 2:
                return (
                    <div className="flex w-full h-full p-4">
                        <div className="flex w-full h-full bg-[#090019]/80">
                        </div>
                    </div>
                );
            // <motion.div
            //     key="presets"
            //     initial={{ opacity: 0, y: 100 }}
            //     animate={{ opacity: 1, y: 0 }}
            //     exit={{ opacity: 0, y: 100 }}
            //     transition={{ duration: 0.75 }}
            //     className='w-full h-full'
            // >

            //     <VoicePresetAccordion
            //         presets={presets}
            //         selectedPresetId={selectedPresetId}
            //         onSelectPreset={handleSelectPreset}
            //         onEnabledPreset={togglePreset}
            //         isPresetEnabled={isPresetActive}
            //     />
            //     <Save />
            // </motion.div>
            case 3:
                return (
                    <div className="flex flex-col w-full h-full p-4 pt-12">

                        <AudioDeviceAccordion
                            title="AUDIO DEVICES"
                            devices={devices}
                            selectedDeviceId={selectedDeviceId}
                            onSelectDevice={handleSelectDevice}
                            onPlayTestTone={toggleTestTone}
                            isTestTonePlaying={isTestTonePlaying}
                            defaultOpen={false}
                        />

                        {/* <div className="w-full flex-col rounded-lg overflow-hidden bg-[#F3EBD8] shadow-[0_4px_0_0_rgba(0,0,0,0.5)] mb-4">
            <div className="w-full flex items-stretch text-left transition-colors"> */}

                        <div className="w-full flex-col rounded-lg overflow-hidden bg-[#F3EBD8] shadow-[0_4px_0_0_rgba(0,0,0,0.5)] mb-4">

                        </div>

                        <h2 className="text-[#ece2d0] font-black uppercase tracking-wider mb-6 text-sm flex items-center gap-2">
                            <ChevronDown className="-rotate-90" size={16} /> Hotkeys
                        </h2>

                        <button
                            onClick={(e) => { e.stopPropagation(); setIsAssigningRadialHotkey(!isAssigningRadialHotkey); }}
                            className={`p-1.5 rounded transition-colors shadow-sm focus:outline-none ${isAssigningRadialHotkey ? 'bg-[#F5B925] text-[#1B1D22]' : 'bg-[#1B1D22] text-[#F5B925] hover:bg-[#343841]'}`}
                        >
                            RadialMenu Hotkey
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsAssigningMuteHotkey(!isAssigningMuteHotkey); }}
                            className={`p-1.5 rounded transition-colors shadow-sm focus:outline-none ${isAssigningMuteHotkey ? 'bg-[#F5B925] text-[#1B1D22]' : 'bg-[#1B1D22] text-[#F5B925] hover:bg-[#343841]'}`}
                        >
                            Mute Hotkey
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsAssigningNextSetHotkey(!isAssigningNextSetHotkey); }}
                            className={`p-1.5 rounded transition-colors shadow-sm focus:outline-none ${isAssigningNextSetHotkey ? 'bg-[#F5B925] text-[#1B1D22]' : 'bg-[#1B1D22] text-[#F5B925] hover:bg-[#343841]'}`}
                        >
                            Next Set Hotkey
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsAssigningPrevSetHotkey(!isAssigningPrevSetHotkey); }}
                            className={`p-1.5 rounded transition-colors shadow-sm focus:outline-none ${isAssigningPrevSetHotkey ? 'bg-[#F5B925] text-[#1B1D22]' : 'bg-[#1B1D22] text-[#F5B925] hover:bg-[#343841]'}`}
                        >
                            Prev Set Hotkey
                        </button>

                        {/* <div onScroll={() => setIsScrolling(true)} onScrollEnd={() => setIsScrolling(false)} className="flex-1 w-full h-full pl-4 pr-4 overflow-y-auto overflow-x-hidden no-scrollbar">
                            <SearchResultsReact />
                        </div> */}

                    </div>
                );
            case 4:
                return (
                    <div className="flex w-full h-full p-4">
                        <div className="flex w-full h-full bg-[#090019]/80">
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="w-screen h-screen flex items-center justify-center font-sans selection:bg-[#00000000] selection:text-[#090c19ff]">

            <div className="relative flex flex-col w-full max-w-[400px] h-[720px] bg-[#090c19]/80 rounded-lg select-none overflow-hidden">

                {/* mode="wait" */}
                <AnimatePresence initial={true} custom={direction}>
                    <motion.div
                        key={activePage}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: {
                                type: "spring",
                                stiffness: 800,
                                damping: 30
                            },
                            opacity: {
                                duration: 0.2
                            },
                            ease: "easeInOut"
                        }}
                        className="absolute w-full h-full"
                    >
                        <CurrentScreen />
                    </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                    <div
                        className={`absolute top-8 inset-0 ${isSidebarOpen || isDragging ? "w-full h-full" : "w-0 h-0"} `}
                        onClick={() => { setIsSidebarOpen(false), setDragAmount(0) }}
                        style={{
                            backgroundColor: "#000000cc",
                            opacity: dragAmount
                        }}
                    />
                </AnimatePresence>

                <motion.div
                    drag="x"
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={{ left: -240, right: 0 }}
                    dragElastic={0}
                    dragMomentum={false}
                    onDrag={(e, info) => {
                        setDragAmount(OWMathUtils.mapRangeClamped(info.offset.x, 0, !isSidebarOpen ? 240 : -240, !isSidebarOpen ? 0.0 : 1.0, !isSidebarOpen ? 1.0 : 0.0));
                    }}
                    onDragStart={(e, info) => {
                        setIsDragging(true);
                    }}
                    onDragEnd={(e, info) => {
                        setIsDragging(false);
                        if (!isSidebarOpen) {
                            setDragAmount(info.offset.x > 120 ? 1.0 : 0.0);
                            if (info.offset.x > 120) {
                                setIsSidebarOpen(true);
                            } else {
                                controls.start({ x: -240 });
                            }
                        } else {
                            setDragAmount(info.offset.x < -100 ? 0.0 : 1.0);
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
                    className="absolute top-8 bottom-0 left-0 w-[240px] bg-[#090c19] border-r border-[#1b1e25] z-40 p-5 shadow-2xl flex flex-col"
                >
                    <div className={`absolute top-0 left-[240px] flex ${isSidebarOpen ? 'w-16' : 'w-0'} h-full bg-[#000000] z-10 [mask-image:linear-gradient(to_right,rgba(0,0,0,1)_0%,rgba(0,0,0,0)_100%)]`} />
                    <div
                        onPointerDown={(e) => dragControls.start(e)}
                        className={`absolute top-0 bottom-0 ${isSidebarOpen ? 'right-0 w-6' : '-right-6 w-6'} cursor-ew-resize flex items-center justify-center group touch-none`}
                    >
                        <motion.div
                            animate={{
                                opacity: [1, 0.2, 1]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <div className={`w-1.5 h-16 ${isSidebarOpen ? 'bg-white/10 rounded-l-full' : 'bg-white/20 rounded-r-full'} backdrop-blur-sm opacity-100 group-hover:opacity-100 transition-opacity`} />
                        </motion.div>
                    </div>

                    <nav className="flex flex-col gap-2">

                        <button
                            disabled={activePage === 0}
                            onClick={() => {
                                setDragAmount(0);
                                setIsSidebarOpen(false),
                                    setDirection(-1),
                                    setActivePage(0),
                                    OWAudioUtils.playSound("snd/ui/click6.mp3", 0.5);
                            }
                            }
                        >
                            <GradientBorder
                                colors={['#3eccff', '#f1aa1c', '#ff0021', '#3eccff']}
                                strokeWidth={3}
                                borderRadius={8}
                                animationMode="loop"
                                trigger="hover"
                            >
                                <div className={`flex w-[200px] h-10 rounded-lg items-center justify-start pl-2 text-sm font-bold border-2 ${activePage === 0 ? "border-[#d0880a] text-[#090c19] bg-[#F5B925]" : "border-white/30 text-[#ece2d0] bg-white/10"}`}>
                                    Raidio
                                </div>
                            </GradientBorder>
                        </button>
                        <button
                            disabled={activePage === 1}
                            onClick={() => {
                                setDragAmount(0);
                                setIsSidebarOpen(false),
                                    setDirection(-1),
                                    setActivePage(1),
                                    OWAudioUtils.playSound("snd/ui/click6.mp3", 0.5);
                            }
                            }
                        >
                            <GradientBorder
                                colors={['#3eccff', '#f1aa1c', '#ff0021', '#3eccff']}
                                strokeWidth={3}
                                borderRadius={8}
                                animationMode="loop"
                                trigger="hover"
                            >
                                <div className={`flex w-[200px] h-10 rounded-lg items-center justify-start pl-2 text-sm font-bold border-2 ${activePage === 1 ? "border-[#d0880a] text-[#090c19] bg-[#F5B925]" : "border-white/30 text-[#ece2d0] bg-white/10"}`}>
                                    Board
                                </div>
                            </GradientBorder>
                        </button>
                        <button
                            disabled={activePage === 2}
                            onClick={() => {
                                setDragAmount(0);
                                setIsSidebarOpen(false),
                                    setDirection(-1),
                                    setActivePage(2),
                                    OWAudioUtils.playSound("snd/ui/click6.mp3", 0.5);
                            }
                            }
                        >
                            <GradientBorder
                                colors={['#3eccff', '#f1aa1c', '#ff0021', '#3eccff']}
                                strokeWidth={3}
                                borderRadius={8}
                                animationMode="loop"
                                trigger="hover"
                            >
                                <div className={`flex w-[200px] h-10 rounded-lg items-center justify-start pl-2 text-sm font-bold border-2 ${activePage === 2 ? "border-[#d0880a] text-[#090c19] bg-[#F5B925]" : "border-white/30 text-[#ece2d0] bg-white/10"}`}>
                                    Presets
                                </div>
                            </GradientBorder>
                        </button>
                        <button
                            disabled={activePage === 3}
                            onClick={() => {
                                setDragAmount(0);
                                setIsSidebarOpen(false),
                                    setDirection(-1),
                                    setActivePage(3),
                                    OWAudioUtils.playSound("snd/ui/click6.mp3", 0.5);
                            }
                            }
                        >
                            <GradientBorder
                                colors={['#3eccff', '#f1aa1c', '#ff0021', '#3eccff']}
                                strokeWidth={3}
                                borderRadius={8}
                                animationMode="loop"
                                trigger="hover"
                            >
                                <div className={`flex w-[200px] h-10 rounded-lg items-center justify-start pl-2 text-sm font-bold border-2 ${activePage === 3 ? "border-[#d0880a] text-[#090c19] bg-[#F5B925]" : "border-white/30 text-[#ece2d0] bg-white/10"}`}>
                                    Settings
                                </div>
                            </GradientBorder>
                        </button>
                    </nav>

                    <div className="mt-auto text-xs text-neutral-600 font-mono">
                        v0.5.0
                    </div>
                </motion.div>

            </div>

            <div className={`absolute z-10 top-0 left-0 flex w-full h-16 backdrop-blur-sm rounded-t-lg [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_40%,rgba(0,0,0,0)_100%)]`} />

            <div data-tauri-drag-region className="absolute z-10 top-0 left-0 flex flex-row w-full max-w-[400px] h-8 rounded-t-lg select-none overflow-hidden">

                <div className={`flex bg-[#3f92ac] w-10 h-full items-center justify-center shrink-0 pointer-events-auto`}>
                    <motion.div
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 30,
                            duration: 0.2,
                        }}
                        whileTap={{ scale: 0.80 }}
                        whileHover={{ scale: 1.25 }}
                        onPointerDown={() => {
                            dragControls.start
                            controls.start({ x: isSidebarOpen ? -240 : 0 })
                            setIsSidebarOpen(!isSidebarOpen)
                            dragControls.stop
                            OWAudioUtils.playSound(isSidebarOpen ? "/snd/ui/beep2.mp3" : "/snd/ui/beep1.mp3", 0.5)
                            setDragAmount(!isSidebarOpen ? 1.0 : 0.0);
                        }}
                        onDoubleClick={() => OWWinUtils.destroyRaidio("/snd/ui/close.mp3", 1500)}
                        className="text-[#000000]"
                    >
                        {
                            activePage === 0 ? <Radio size={isAudioMuted ? 0 : 22} /> :
                                activePage === 1 ? <Grid size={isAudioMuted ? 0 : 22} /> :
                                    activePage === 2 ? <Tickets size={isAudioMuted ? 0 : 22} /> :
                                        <Cog size={isAudioMuted ? 0 : 22} />
                        }
                    </motion.div>
                    {isAudioMuted &&
                        <RadioOff size={22} className="w-6 h-6 text-[#ff0000]" />
                    }

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

                <div className="flex bg-[#f9eedf]/80 h-full items-center justify-center shrink-0 pointer-events-auto pr-3 gap-1">
                    <ChevronDown size={20} className="text-[#090c19] hover:text-[#8e8e8e]" onClick={() => OWWinUtils.hideWindow(getCurrentWindow(), "snd/ui/debug.mp3")} />
                    <X size={20} className="text-[#090c19] hover:text-[#8e8e8e]" onClick={() => OWWinUtils.destroyRaidio("snd/ui/close.mp3", 1500)} />
                </div>

            </div>

        </div>
    );
}

const container = document.getElementById('root')!;
const root = (container as any)._reactRoot || createRoot(container);
(container as any)._reactRoot = root;
root.render(<Raidio />);