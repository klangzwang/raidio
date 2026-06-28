import { createRoot } from 'react-dom/client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listen } from '@tauri-apps/api/event';
import { ConfigManager } from './lib/ConfigManager';
import { AudioManager } from './lib/AudioManager';
import { getCurrentWindow } from '@tauri-apps/api/window';

import '@css/raidio.css';

// --- Math & SVG Path Utilities ---
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function getDonutWedgeSegment(cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const start1 = polarToCartesian(cx, cy, outerRadius, startAngle);
  const end1 = polarToCartesian(cx, cy, outerRadius, endAngle);
  const start2 = polarToCartesian(cx, cy, innerRadius, startAngle);
  const end2 = polarToCartesian(cx, cy, innerRadius, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M", start1.x, start1.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 1, end1.x, end1.y,
    "L", end2.x, end2.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 0, start2.x, start2.y,
    "Z"
  ].join(" ");
}

export function Radial() {

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hoveredIndexRef = useRef<number | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  const centerRingRadius = 140;
  const itemGap = 10;
  const innerRadius = centerRingRadius + itemGap;
  const outerRadius = innerRadius + 110;
  const menuSize = (outerRadius + 50) * 2;
  const centerPos = menuSize / 2;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const appWindow = getCurrentWindow();

  useEffect(() => {
    appWindow.setIgnoreCursorEvents(!isMenuOpen);
  }, [isMenuOpen]);

  useEffect(() => {
    return () => {
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
      }
    };
  }, []);

  const handleAction = async (label: string, index: number) => {
    const currentLevel = ConfigManager.loadCurrentLevel();
    const config = await ConfigManager.loadButtonConfig(currentLevel, index);
    const deviceId = ConfigManager.loadAudioDevice();

    if (config && config.soundData && deviceId) {
      // Alten URL-Verweis sofort freigeben vor der nächsten Generierung
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }

      // Da soundData ein Blob ist, erzeugen wir hier die performante Object-URL
      if (config.soundData instanceof Blob) {
        const objectUrl = URL.createObjectURL(config.soundData);
        activeObjectUrlRef.current = objectUrl;

        const audio = AudioManager.getInstance();
        await audio.playMp3(objectUrl, deviceId);
      }
    }
  };

  const menuItems = Array.from({ length: 9 }).map((_, i) => ({
    id: `action_${i + 1}`,
    label: `Action ${i + 1}`,
    icon: <span className="text-4xl font-light leading-none">{i + 1}</span>,
  }));

  const step = 360 / menuItems.length;

  useEffect(() => {
    const executeAction = () => {
      if (hoveredIndexRef.current !== null) {
        handleAction(`Aktion ${hoveredIndexRef.current + 1}`, hoveredIndexRef.current);
      }
      setHoveredIndex(null);
      hoveredIndexRef.current = null;
    };

    const savedRadialMenuKey = ConfigManager.loadRadialMenuKey();

    let unlistenPress: (() => void) | undefined;
    let unlistenRelease: (() => void) | undefined;

    (async () => {
      unlistenPress = await listen<string>('global-key-press', (event) => {
        const key = event.payload as string;
        if (key === savedRadialMenuKey) {
          setIsMenuOpen(true);
        }
      });

      unlistenRelease = await listen<string>('global-key-release', (event) => {
        const key = event.payload as string;
        if (key === savedRadialMenuKey) {
          executeAction();
          setIsMenuOpen(false);
        }
      });
    })();

    return () => {
      if (unlistenPress) unlistenPress();
      if (unlistenRelease) unlistenRelease();
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {

      if (!isMenuOpen) return;

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < innerRadius || distance > outerRadius) {
        setHoveredIndex(null);
        hoveredIndexRef.current = null;
        return;
      }

      const rawAngleRadians = Math.atan2(dy, dx);
      let rawDegrees = (rawAngleRadians * 180) / Math.PI;

      const visualDegrees = (rawDegrees + 90 + 360) % 360;
      const normalizedAngle = (visualDegrees + step / 2) % 360;
      const index = Math.floor(normalizedAngle / step);

      const validIndex = index >= 0 && index < menuItems.length ? index : null;

      setHoveredIndex(validIndex);
      hoveredIndexRef.current = validIndex;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [innerRadius, outerRadius, step, menuItems.length, isMenuOpen]);

  const segments = menuItems.map((_, i) => {
    const startAngle = (i * step) - (step / 2);
    const endAngle = (i * step) + (step / 2);

    return {
      index: i,
      path: getDonutWedgeSegment(centerPos, centerPos, innerRadius, outerRadius, startAngle, endAngle)
    };
  });

  const activeItem = hoveredIndex !== null ? menuItems[hoveredIndex] : null;

  const getRandomClickSound = (): string => {
    const randomNumber = Math.floor(Math.random() * 6) + 1;
    return `click${randomNumber}.mp3`;
  };

  const playRandomSound = () => {
    const soundFile = getRandomClickSound();
    const audio = new Audio(`/snd/ui/${soundFile}`);
    audio.play().catch(error => console.error("Audio konnte nicht abgespielt werden:", error));
  };

  if (!isMenuOpen) {
    return (
      <></>
    );
  }

  return (
    <div className="flex w-screen h-screen bg-transparent items-center justify-center overflow-hidden selection:bg-transparent">
      <div
        className="relative flex items-center justify-center"
        style={{ width: menuSize, height: menuSize }}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${menuSize} ${menuSize}`}
        >
          <defs>
            <filter id="svg-inner-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feOffset dx="0" dy="0" />
              <feGaussianBlur stdDeviation="6" result="offset-blur" />
              <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
              <feFlood floodColor="black" floodOpacity="0.6" result="color" />
              <feComposite operator="in" in="color" in2="inverse" result="shadow" />
              <feComposite operator="over" in="shadow" in2="SourceGraphic" />
            </filter>
          </defs>

          {segments.map((seg) => {
            const isActive = hoveredIndex === seg.index;
            return (
              <path
                onMouseEnter={playRandomSound}
                key={seg.index}
                d={seg.path}
                filter="url(#svg-inner-shadow)"
                className="transition-all duration-150 ease-out pointer-events-auto cursor-pointer"
                style={{
                  fill: isActive ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                  stroke: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
                  strokeWidth: isActive ? '2px' : '1px',
                }}
              />
            );
          })}

          <circle
            cx={centerPos}
            cy={centerPos}
            r={centerRingRadius}
            filter="url(#svg-inner-shadow)"
            className="fill-zinc-900/40 stroke-white stroke-[2.5px] transition-all pointer-events-auto"
          />
        </svg>

        {menuItems.map((item, i) => {
          const isActive = hoveredIndex === i;
          const angle = i * step;
          const midRadius = (innerRadius + outerRadius) / 2;
          const pos = polarToCartesian(centerPos, centerPos, midRadius, angle);

          return (
            <div
              key={item.id}
              className={`absolute flex items-center justify-center transition-all duration-150 pointer-events-none ${isActive ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'text-gray-400'
                }`}
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {item.icon}
            </div>
          );
        })}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <AnimatePresence mode="popLayout">
            {activeItem && (
              <motion.div
                key="label"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-white text-base font-medium tracking-widest uppercase text-center px-6 drop-shadow-md"
                style={{ maxWidth: centerRingRadius * 1.5 }}
              >
                <div className="flex flex-col">
                  <div className="flex w-full h-1/2">
                    {/* UI Platzhalter */}
                  </div>
                  <div className="grow w-full h-full">
                    {/* {activeItem.label} */}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* <div className="absolute -right-24 flex items-center justify-end pointer-events-none font-[Arial] text-[#cecece] text-[14pt]">
          <AudioLines size={22} /> Slot Information:
        </div> */}

        {/* <div className="absolute right-0 flex items-center justify-end pointer-events-none">
          <AnimatePresence mode="popLayout">
            {activeItem && (
              <motion.div
                key="label"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-white text-base font-medium tracking-widest uppercase text-center px-6 drop-shadow-md"
                style={{ maxWidth: centerRingRadius * 1.5 }}
              >
                <div className="absolute right-0">
                  {activeItem.label}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div> */}

      </div>
    </div>
  );
}

const container = document.getElementById('root')!;
const root = (container as any)._reactRoot || createRoot(container);
(container as any)._reactRoot = root;
root.render(<Radial />);
