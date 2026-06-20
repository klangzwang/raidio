import { useEffect, useState } from "react";
import { motion, animate } from "framer-motion";
import { fadeIn } from "lib/motion";
import { useProgress } from "@react-three/drei";
import { ChevronDown } from "lucide-react";

interface CardsProps {
  items: any[];
  isLoading: boolean;
}

export function Cards({ items, isLoading }: CardsProps) {
  const { progress } = useProgress();
  const [fakeProgress, setFakeProgress] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setFakeProgress(0);
      const controls = animate(0, 100, {
        duration: 2,
        ease: "linear",
        onUpdate: (latest) => setFakeProgress(latest),
      });
      return () => controls.stop();
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const checkScrollability = () => {
      const scrollable = document.documentElement.scrollHeight > window.innerHeight;
      setIsScrollable(scrollable);
    };

    const handleScroll = () => {
      if (window.scrollY > 20) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    };

    const timeoutId = setTimeout(checkScrollability, 100);

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", checkScrollability);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkScrollability);
    };
  }, [isLoading, items]);

  const containerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    minHeight: "60vh",
    width: "100%",
  };

  const textStyle: React.CSSProperties = {
    fontSize: 28,
    color: "#F1F1F1",
    fontWeight: 900,
    marginTop: 24,
    letterSpacing: "-0.05em",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {isLoading ? (
        <div
          className="p-4 text-white font-mono text-xs animate-pulse"
          style={containerStyle}
        >
          <span className="canvas-loader" />
          <p style={textStyle}>{fakeProgress.toFixed(2)}%</p>
        </div>
      ) : (
        <div className="">
          {items.map((card, index) => (
            <motion.div
              key={index}
              variants={fadeIn("up", "spring", index * 0.5, 0.75)}
            >
              <section className="border-gradient bg-[#050713]/80 rounded-[18px] p-4">
                <div className="flex flex-col gap-4">
                  <div className="rounded-[10px] overflow-hidden relative border border-slate-800/80">
                    <img src={card.image} className="w-full h-40 object-cover" />
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 border border-white/10">
                      <p className="text-[11px] font-medium text-slate-100 tracking-tight flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                        Release is Live
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-start gap-3 pb-3 border-b border-slate-800/70">
                    <div className="space-y-1">
                      <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight text-slate-50">
                        {card.name}
                      </h2>
                      <p className="text-[13px] text-slate-400">
                        {card.description}
                      </p>
                      <p className="text-[12px] text-slate-500">
                        released at • {card.date}
                      </p>
                    </div>

                    <button className="flex bg-slate-900/80 w-8 h-8 rounded-full items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="1em" height="1em" viewBox="0 0 24 24" data-icon="solar:menu-dots-bold-duotone" className="iconify text-[18px] text-slate-400 iconify--solar"><path fill="currentColor" d="M7 12a2 2 0 1 1-4 0a2 2 0 0 1 4 0m14 0a2 2 0 1 1-4 0a2 2 0 0 1 4 0" className=""></path><path fill="currentColor" d="M14 12a2 2 0 1 1-4 0a2 2 0 0 1 4 0" opacity=".5" className=""></path></svg>
                    </button>
                  </div>
                </div>
              </section>
            </motion.div>
          ))}

          {isScrollable && !hasScrolled && (
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <motion.div
                animate={{
                  y: [0, 12, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "easeInOut"
                }}
              >
                <ChevronDown size={32} className="text-white drop-shadow-md" />
              </motion.div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
