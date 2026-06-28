import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AnimatePresence, motion } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { ConfigManager } from 'lib/ConfigManager';
import { GradientBorder } from 'react-gradient-borders';
import { Controller } from './controller';

import '@css/raidio.css';

export function Panel() {

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isGameRunning, setIsGameRunning] = useState<boolean>(Controller.getInstance().getIsGameRunning());
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

  useEffect(() => {
    const refresh = () => setIsGameRunning(Controller.getInstance().getIsGameRunning());
    refresh();
    setTimeout(() => {
      setIsExpanded(isGameRunning)
    }, 2000);
    setTimeout(() => {
      setIsExpanded(false)
    }, 6000);
    window.addEventListener('winopen-changed', refresh);
    return () => {
      window.removeEventListener('winopen-changed', refresh);
    };
  }, []);

  useEffect(() => {
    getCurrentWindow().setIgnoreCursorEvents(true);
  }, []);

  return (
    <div className="flex flex-col w-screen h-screen">
      <div className="flex flex-row w-full h-full">

        <div className="flex grow w-full h-full max-h-[6%] items-center justify-center">
        </div>

        <motion.div
          className="flex w-full h-[6%] items-center justify-center p-[0.666%]"
          initial={{
            width: '3.333%',
            opacity: 0
          }}
          animate={{
            width: isExpanded ? '20%' : '3.333%',
            opacity: 1
          }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            delay: 1,
            duration: 3,
          }}
        >
          <div className="flex w-full h-full bg-[#ffbc13] rounded-full items-center justify-center"
            style={{
              fontFamily: "Arial",
              fontSize: "12pt",
              fontWeight: "bold",
              color: "#090c19",
            }}
          >
            <motion.div
              initial={{
                scale: '100%'
              }}
              animate={{
                scale: isExpanded ? '0%' : '100%'
              }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20,
                delay: 1,
                duration: 2,
              }}
            >
              {currentLevel}
            </motion.div>

            {isExpanded &&
              <motion.div
                initial={{
                  scale: '0%'
                }}
                animate={{
                  scale: isExpanded ? '100%' : '0%'
                }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                  delay: 1,
                  duration: 2,
                }}
              >
                ArcRaiders found...
              </motion.div>
            }
          </div>
        </motion.div>
      </div>
    </div>
  );

  // const [windowWidth, setWindowWidth] = useState(0);
  // const [windowHeight, setWindowHeight] = useState(0);

  // useEffect(() => {

  // }, []);

  // return (
  //   <div className="flex flex-col w-screen h-screen">
  //     <div className="flex w-full h-full justify-center">
  //       <img src="img/test.png" />

  //       <div className="flex flex-col w-screen h-screen">
  //         <div className="flex bg-[#000000]/80 w-full h-[6.6%]">

  //         </div>
  //         <div className="flex bg-[#444444]/80 w-full h-full">

  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // );

  // const isDev = import.meta.env.DEV;

  // const [logs, setLogs] = useState<{ id: string; time: string; msg: string; type: 'info' | 'warn' | 'success' }[]>([]);

  // const addLog = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
  //   const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  //   setLogs(prev => [{ id: Math.random().toString(36).substring(7), time, msg, type }, ...prev].slice(0, 10));
  // };

  // useEffect(() => {
  //   addLog('Raidio Online. Waiting for IPC events...', 'success');
  // }, []);

  // useEffect(() => {

  //   const unlistenClosed = listen('window-closed', (event) => {
  //     getCurrentWindow().hide();
  //   });

  //   return () => {
  //     unlistenClosed.then(f => f());
  //   };
  // }, []);

  // useEffect(() => {
  //   getCurrentWindow().setIgnoreCursorEvents(true);
  // });

  // if (isDev) {
  //   return (
  //     <div className="flex flex-col w-screen h-screen">

  //       <aside className="col-span-4 flex flex-col w-1/3 gap-6 pt-[500px] pl-4">

  //         <div className="flex-1 flex flex-col min-h-0 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-inner flex-1">
  //           <div className="p-3 border-b border-slate-800/60 flex items-center justify-between">
  //             <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter italic">Raidio Debug Panel</span>
  //             <div className="flex items-center gap-2">
  //               <Terminal className="text-slate-500 w-3 h-3" />
  //             </div>
  //           </div>

  //           <div className="overflow-y-auto p-4 flex flex-col gap-2 flex-1 font-mono text-[11px] leading-relaxed">
  //             <AnimatePresence initial={false}>
  //               {logs.map((log) => (
  //                 <motion.div
  //                   key={log.id}
  //                   initial={{ opacity: 0, x: -10 }}
  //                   animate={{ opacity: 1, x: 0 }}
  //                   className="flex gap-3"
  //                 >
  //                   <span className="text-slate-600 shrink-0">[{log.time}]</span>
  //                   <span className={
  //                     log.type === 'warn' ? 'text-amber-400' :
  //                       log.type === 'success' ? 'text-emerald-400' :
  //                         'text-cyan-400/80'
  //                   }>
  //                     {log.msg}
  //                   </span>
  //                 </motion.div>
  //               ))}
  //             </AnimatePresence>
  //           </div>
  //         </div>

  //       </aside>

  //     </div>
  //   );
  // } else {

  // }
}

const container = document.getElementById('root')!;
const root = (container as any)._reactRoot || createRoot(container);
(container as any)._reactRoot = root;
root.render(<Panel />);
