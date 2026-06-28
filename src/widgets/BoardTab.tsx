import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, FolderOpen, Keyboard } from 'lucide-react';
import { ConfigManager, GridButtonConfig } from '../lib/ConfigManager';
import { AudioManager } from '../lib/AudioManager';
import { listen } from '@tauri-apps/api/event';
import { OWAudioUtils } from '../lib/utils';
import { Controller } from '../controller';

function GridCell({ level, index, currentLevel, selectedDeviceId }: { level: number, index: number, currentLevel: number, selectedDeviceId: string | null }) {

    const [config, setConfig] = useState<GridButtonConfig>({ soundData: null, soundName: null, hotkey: `Numpad${index + 1}` });
    const [isAssigningHotkey, setIsAssigningHotkey] = useState(false);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            await audio.playMp3(objectUrl, selectedDeviceId);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const tempUrl = URL.createObjectURL(file);
            const audio = new Audio(tempUrl);

            audio.onloadedmetadata = () => {
                if (audio.duration > 6) {
                    alert("Die Audiodatei darf maximal 6 Sekunden lang sein.");
                    URL.revokeObjectURL(tempUrl);
                } else {
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

    // const [isGameRunning, setIsGameRunning] = useState(false);

    // useEffect(() => {
    //     const isRunning = async () => {
    //         await listen('window-opened', (event) => {
    //             setIsGameRunning(true);
    //         });
    //         await listen('window-closed', (event) => {
    //             setIsGameRunning(false);
    //         });
    //     }
    //     isRunning();
    // }, [isGameRunning]);

    return (
        <div
            className={`relative group aspect-square flex flex-col items-center justify-center
        ${config.soundData ? "bg-[#aaaaaa]" : "bg-[#555555]"} hover:bg-[#ffbc13] transition-colors
        ${!isRightCol ? 'border-r-2 border-black' : ''}
        ${!isBottomRow ? 'border-b-2 border-black' : ''}
        ${index === 0 ? 'rounded-tl-lg' : ''}
        ${index === 2 ? 'rounded-tr-lg' : ''}
        ${index === 6 ? 'rounded-bl-lg' : ''}
        ${index === 8 ? 'rounded-br-lg' : ''}
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

            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="text-[#000000] hover:text-[#ffffff] transition-colors shadow-sm focus:outline-none"
                    title="Sound zuweisen (Max 6s)"
                >
                    <FolderOpen size={16} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsAssigningHotkey(!isAssigningHotkey); }}
                    className={`transition-colors shadow-sm focus:outline-none hover:text-[#ffffff] ${isAssigningHotkey ? 'text-[#ff0000]' : 'text-[#000000]'}`}
                >
                    <Keyboard size={16} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="text-[#000000] hover:text-[#ff0000] transition-colors shadow-sm focus:outline-none"
                >
                    <X size={16} />
                </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileChange} />
        </div>
    );
}

export function BoardTab() {

    const [currentLevel, setCurrentLevel] = useState<number>(ConfigManager.loadCurrentLevel());

    useEffect(() => {
        const refresh = () => setCurrentLevel(ConfigManager.loadCurrentLevel());
        refresh();
        window.addEventListener('focus', refresh);
        window.addEventListener('level-changed', refresh);
        return () => {
            window.removeEventListener('focus', refresh);
            window.removeEventListener('level-changed', refresh);
        };
    }, []);

    const [isGameRunning, setIsGameRunning] = useState<boolean>(Controller.getInstance().getIsGameRunning());

    useEffect(() => {
        const refresh = () => setIsGameRunning(Controller.getInstance().getIsGameRunning());
        refresh();
        window.addEventListener('winopen-changed', refresh);
        return () => {
            window.removeEventListener('winopen-changed', refresh);
        };
    }, []);

    return (
        <div className="flex flex-col w-screen h-screen p-4">

            <div className="flex w-full font-black text-[2.1rem] tracking-tighter text-[#f9eedf] scale-y-[1.1] translate-x-3 translate-y-4">
                SOUNDBOARD
            </div>

            <div className="flex grow bg-[#333333]/80 w-full rounded-lg border border-[#777777]">

                <div className="flex flex-col w-full h-full">

                    <div className="flex w-full h-full">
                        {/* <SetExporter /> */}
                    </div>

                    <div className="flex grow w-full h-full p-4">
                        <div className="grid grid-cols-3 w-full">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <GridCell
                                    key={`${currentLevel}-${i}`}
                                    level={currentLevel}
                                    index={i}
                                    currentLevel={currentLevel}
                                    selectedDeviceId={ConfigManager.loadAudioDevice()}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex w-full h-48 pl-0.5 pr-0.5 pb-0.5">

                        <div className="flex flex-row w-full h-full">

                            <button
                                onClick={() => {
                                    if (currentLevel !== 1) {
                                        setCurrentLevel(currentLevel - 1);
                                        ConfigManager.saveCurrentLevel(currentLevel - 1);
                                        OWAudioUtils.playSound("snd/ui/click1.mp3", 0.5);
                                    }
                                }
                                }
                                className="flex w-14 h-full bg-[#ffbc13] items-center justify-center rounded-bl-lg shrink-0 hover:bg-[#ffcd14] focus:outline-none transition-colors">
                                <ChevronLeft size={24} strokeWidth={3} className="text-[#1B1D22]" />
                            </button>
                            <div className="flex grow w-full h-full bg-[#f9eedf] items-center justify-center text-[18pt] font-black text-[1.1rem] tracking-tight text-[#1B1D22] border-l-2 border-r-2 border-[#000000]">
                                SET {currentLevel}
                            </div>
                            <button
                                onClick={() => {
                                    if (currentLevel !== 9) {
                                        setCurrentLevel(currentLevel + 1);
                                        ConfigManager.saveCurrentLevel(currentLevel + 1);
                                        OWAudioUtils.playSound("snd/ui/click2.mp3", 0.5);
                                    }
                                }
                                }
                                className="flex w-14 h-full bg-[#ffbc13] items-center justify-center rounded-br-lg shrink-0 hover:bg-[#ffcd14] focus:outline-none transition-colors">
                                <ChevronRight size={24} strokeWidth={3} className="text-[#1B1D22]" />
                            </button>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}