import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, Play, Square, Check } from 'lucide-react';
import { ConfigManager } from '../lib/ConfigManager';
import { AudioManager } from '../lib/AudioManager';

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

export function SettingsTab() {

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [isTestTonePlaying, setIsTestTonePlaying] = useState(false);
    const [isAssigningRadialHotkey, setIsAssigningRadialHotkey] = useState(false);
    const [isAssigningMuteHotkey, setIsAssigningMuteHotkey] = useState(false);
    const [isAssigningNextSetHotkey, setIsAssigningNextSetHotkey] = useState(false);
    const [isAssigningPrevSetHotkey, setIsAssigningPrevSetHotkey] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);

    useEffect(() => {
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
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isAssigningRadialHotkey, isAssigningMuteHotkey, isAssigningNextSetHotkey, isAssigningPrevSetHotkey]);

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

    // const [cards, setCards] = useState<any[]>([]);

    // useEffect(() => {
    //     const fetchCards = async () => {
    //         try {
    //             const response = await fetch('https://raw.githubusercontent.com/klangzwang/VResources/refs/heads/main/cards.json');
    //             if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
    //             const data = await response.json();
    //             setCards(data);
    //         } catch (err) {
    //             console.error("[Raidio] Fehler beim Laden der Cards:", err);
    //         }
    //     };
    //     fetchCards();
    // }, []);

    return (
        <div className="flex flex-col w-screen h-screen p-4">

            <div className="flex w-full font-black text-[2.1rem] tracking-tighter text-[#f9eedf] scale-y-[1.1] translate-x-3 translate-y-4">
                SETTINGS
            </div>

            <div className="flex grow bg-[#333333]/80 w-full rounded-lg border border-[#777777]">

                <div className="flex flex-col w-full h-full">

                    <div className="flex w-full h-full">
                    </div>

                    <div className="flex grow w-full h-full p-4">
                    </div>

                    <div className="flex w-full h-48 pl-0.5 pr-0.5 pb-0.5">
                        <div className="flex flex-row w-full h-full">
                            <AudioDeviceAccordion
                                title="AUDIO DEVICES"
                                devices={devices}
                                selectedDeviceId={selectedDeviceId}
                                onSelectDevice={handleSelectDevice}
                                onPlayTestTone={toggleTestTone}
                                isTestTonePlaying={isTestTonePlaying}
                                defaultOpen={false}
                            />
                        </div>
                    </div>

                </div>

                {/* <div className="w-full flex-col rounded-lg overflow-hidden bg-[#F3EBD8] shadow-[0_4px_0_0_rgba(0,0,0,0.5)] mb-4">
                <div className="w-full flex items-stretch text-left transition-colors"> */}

                {/* <div className="w-full flex-col rounded-lg overflow-hidden bg-[#F3EBD8] shadow-[0_4px_0_0_rgba(0,0,0,0.5)] mb-4">

                </div> */}

                {/* <h2 className="text-[#ece2d0] font-black uppercase tracking-wider mb-6 text-sm flex items-center gap-2">
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
                </button> */}

                {/* <div onScroll={() => setIsScrolling(true)} onScrollEnd={() => setIsScrolling(false)} className="flex-1 w-full h-full pl-4 pr-4 overflow-y-auto overflow-x-hidden no-scrollbar">
                            <SearchResultsReact />
                        </div> */}

            </div>
        </div>
    );
}