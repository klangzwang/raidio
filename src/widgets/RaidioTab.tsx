import { useState, useEffect } from 'react';
import { OWAudioUtils } from '../lib/utils';
import { motion } from "framer-motion";
import { fadeIn } from "lib/motion";

export function RaidioTab({
    onClick
}: any) {

    const [cards, setCards] = useState<any[]>([]);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                const response = await fetch('https://raw.githubusercontent.com/klangzwang/VResources/refs/heads/main/cards.json');
                if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
                const data = await response.json();
                setCards(data);
            } catch (err) {
                console.error("[Raidio] Fehler beim Laden der Cards:", err);
            }
        };
        fetchCards();
    }, []);

    return (
        <div className="flex w-full h-full overflow-y-auto">

            <div className="flex flex-col w-full h-full p-4 pt-12 gap-4">
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
                    <div className="pt-4 pl-4 pr-4 overflow-y-auto no-scrollbar">
                        <div className="">
                            {cards.map((card, index) => (
                                <motion.div
                                    key={index}
                                    variants={fadeIn("up", "spring", index * 0.5, 0.75)}
                                >
                                    <section className="border-gradient bg-[#050713]/90 rounded-lg p-4 mb-4">
                                        <div className="flex flex-col gap-4">
                                            <div className="rounded-[10px] overflow-hidden relative border border-slate-800/80">
                                                <img src={card.image} className="w-full h-40 object-cover" />
                                                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 border border-white/10">
                                                    <p className="text-[11px] font-medium text-slate-100 tracking-tight flex items-center gap-1.5">
                                                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
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
                                            </div>
                                        </div>
                                    </section>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    className="flex flex-row bg-[#ffbc13] w-full h-[72px] rounded-lg active:scale-90 hover:bg-[#ffcd13] p-1 cursor-default"
                    onClick={onClick}
                    onMouseEnter={() => OWAudioUtils.playSound('/snd/ui/click2.mp3', 0.5)}
                >
                    <div className="flex w-[60px] h-full items-center justify-center">
                        <img src="img/play.png" />
                    </div>
                    <div className="px-20 py-4 font-black text-[2.5rem] tracking-tighter text-[#1B1D22] flex-1 font-sans flex items-center">
                        PLAY
                    </div>
                </button>
            </div>
        </div>
    );
}