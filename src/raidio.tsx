import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, useAnimation } from 'framer-motion';
import { ChevronDown, X, Radio, Grid, Cog, Tickets } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { OWWinUtils, OWAudioUtils, OWMathUtils } from './lib/utils';
import { GradientBorder } from 'react-gradient-borders';
// import { SaveFileParser, CategorizedSetting, SettingCategory } from './components/ConfigParser';

import { BoardTab } from './widgets/BoardTab';
import { RaidioTab } from './widgets/RaidioTab';
import { PresetsTab } from './widgets/PresetsTab';
import { SettingsTab } from './widgets/SettingsTab';

import './css/raidio.css';

const pageColors: Record<number, string> = {
    [0]: 'bg-[#ffbc13]',
    [1]: 'bg-[#3eccff]',
    [2]: 'bg-[#ff0021]',
    [3]: 'bg-[#4caf50]',
};

// export function SearchResultsReact() {

//     const savPath = 'C:\\Users\\Administrator\\AppData\\Local\\PioneerGame\\Saved\\SaveGames\\EmbarkOptionSaveGame.sav';

//     const [parser] = useState(new SaveFileParser(savPath));
//     const [results, setResults] = useState<CategorizedSetting[]>([]);

//     useEffect(() => {
//         const handleSearch = async () => {
//             try {
//                 await parser.loadSaveFile();
//                 const catSettings = parser.findSetting("SFXVolume");
//                 console.log('Audio-Einstellungen:', catSettings);
//                 setResults(catSettings);
//             } catch (error) {
//                 console.error('Suchfehler:', error);
//             }
//         };
//         handleSearch();
//     }, [parser]);

//     return (
//         <div style={{ padding: '20px' }}>

//             <div style={{ marginTop: '20px' }}>
//                 {results.length === 0 ? (
//                     <p style={{ color: '#888' }}>Keine Ergebnisse</p>
//                 ) : (
//                     results.map((result) => {
//                         const color = htmlColors[result.category] || '#607d8b';
//                         const valueStr = typeof result.value === 'object'
//                             ? JSON.stringify(result.value)
//                             : String(result.value);

//                         return (
//                             <div
//                                 key={result.key}
//                                 style={{
//                                     background: 'rgba(255, 255, 255, 0.05)',
//                                     borderLeft: `3px solid ${color}`,
//                                     padding: '12px 15px',
//                                     borderRadius: '4px',
//                                     marginBottom: '10px'
//                                 }}
//                             >
//                                 <div style={{ fontFamily: 'monospace', color: '#fff', fontWeight: 600 }}>
//                                     {result.key}
//                                 </div>
//                                 <div style={{ fontSize: '11px', color: color, textTransform: 'uppercase' }}>
//                                     {result.category}
//                                 </div>
//                                 <pre style={{
//                                     background: 'rgba(0, 0, 0, 0.3)',
//                                     padding: '8px',
//                                     borderRadius: '3px',
//                                     fontSize: '13px',
//                                     color: '#d4d4d4',
//                                     marginTop: '8px'
//                                 }}>
//                                     {valueStr}
//                                 </pre>
//                             </div>
//                         );
//                     })
//                 )}
//             </div>
//         </div>
//     );
// }

export function Raidio() {

    const [activePage, setActivePage] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragAmount, setDragAmount] = useState<number>(0.0);
    const dragControls = useDragControls();
    const controls = useAnimation();

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

    useEffect(() => {
        controls.start({ x: isSidebarOpen ? 0 : -240 });
    }, [isSidebarOpen, controls]);

    const isCooldown = useRef<boolean>(false);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.code as string;
            if (isCooldown.current) return;

            if (key === "Escape" && activePage !== 0) {
                isCooldown.current = true;
                OWAudioUtils.playSound('/snd/ui/bwd.mp3', 0.5);
                setActivePage(activePage - 1);
                setTimeout(() => {
                    isCooldown.current = false;
                }, 150);
            } else if (key === "Tab" && activePage !== 0 && activePage !== 3) {
                isCooldown.current = true;
                OWAudioUtils.playSound('/snd/ui/fwd.mp3', 0.5);
                setActivePage(activePage + 1);
                setTimeout(() => {
                    isCooldown.current = false;
                }, 150);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activePage]);

    const CurrentScreen = () => {
        switch (activePage) {
            case 0:
                return (
                    <RaidioTab onClick={() => {
                        OWAudioUtils.playSound('/snd/ui/match.mp3', 0.5)
                        setActivePage(1)
                    }} />
                );
            case 1:
                return (
                    <BoardTab />
                );
            case 2:
                return (
                    <PresetsTab />
                );
            case 3:
                return (
                    <SettingsTab />
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
                        className={`absolute top-0 bottom-0 ${isSidebarOpen ? 'right-0 w-6' : '-right-6 w-6'} cursor-ew-resize flex items-center justify-center group touch-none`}
                        onPointerDown={(e) => dragControls.start(e)}
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

            {/* <div className={`absolute z-10 top-0 left-0 flex w-full h-16 backdrop-blur-sm rounded-t-lg [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_40%,rgba(0,0,0,0)_100%)]`} /> */}

            <div data-tauri-drag-region className="absolute z-10 top-0 left-0 flex flex-row w-full max-w-[400px] h-8 rounded-t-lg select-none overflow-hidden">

                <div className={`flex ${pageColors[activePage]} bg-[#333333] w-10 h-full items-center justify-center shrink-0 pointer-events-auto`}>
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
                        onMouseEnter={() => OWAudioUtils.playSound("snd/ui/click3.mp3", 0.5)}
                        className="text-[#000000]"
                    >
                        {
                            activePage === 0 ? <Radio size={22} /> :
                                activePage === 1 ? <Grid size={22} /> :
                                    activePage === 2 ? <Tickets size={22} /> :
                                        <Cog size={22} />
                        }
                    </motion.div>
                </div>

                <div
                    data-tauri-drag-region
                    className="flex grow bg-[#f9eedf] w-full h-full items-center justify-start pl-2 scale-y-[1.1]"
                    style={{
                        fontFamily: "Arial",
                        fontSize: "14pt",
                        fontWeight: "bold",
                        color: "#090c19",
                    }}
                >
                    RAIDIO
                </div>

                <div className="flex bg-[#f9eedf] h-full items-center justify-center shrink-0 pointer-events-auto pr-3 gap-1">
                    <ChevronDown size={20} className="text-[#090c19] hover:text-[#8e8e8e]" onMouseEnter={() => OWAudioUtils.playSound("snd/ui/click4.mp3", 0.5)} onClick={() => OWWinUtils.hideWindow(getCurrentWindow(), "snd/ui/debug.mp3")} />
                    <X size={20} className="text-[#090c19] hover:text-[#8e8e8e]" onMouseEnter={() => OWAudioUtils.playSound("snd/ui/click4.mp3", 0.5)} onClick={() => OWWinUtils.destroyRaidio("snd/ui/close.mp3", 1500)} />
                </div>

            </div>

        </div>
    );
}

const container = document.getElementById('root')!;
const root = (container as any)._reactRoot || createRoot(container);
(container as any)._reactRoot = root;
root.render(<Raidio />);