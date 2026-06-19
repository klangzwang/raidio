import { motion } from "framer-motion";
import { cards } from "lib/const";
import { fadeIn } from "lib/motion";

interface CardProps {
  name: string;
  description: string;
  image: string | null;
  index: number;
  date: string;
}

const Card = ({ name, description, image, index, date }: CardProps) => {
  return (
    <motion.div
      variants={fadeIn("up", "spring", index * 0.5, 0.75)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
    >
      <section className="border-gradient bg-[#050713]/80 rounded-[18px] p-4">

        <div className="flex flex-col gap-4">

          <div className="rounded-[10px] overflow-hidden relative border border-slate-800/80">
            <img src={image} className="w-full h-40 object-cover" />
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 border border-white/10">
              <p className="text-[11px] font-medium text-slate-100 tracking-tight flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                Realease is Live
              </p>
            </div>
          </div>

          <div className="flex justify-between items-start gap-3 pb-3 border-b border-slate-800/70">

            <div className="space-y-1">
              <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight text-slate-50">
                {name}
              </h2>
              <p className="text-[13px] text-slate-400">
                {description}
              </p>
              <p className="text-[12px] text-slate-500">
                released at • {date}
              </p>
            </div>

            <button className="flex bg-slate-900/80 w-8 h-8 rounded-full items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="1em" height="1em" viewBox="0 0 24 24" data-icon="solar:menu-dots-bold-duotone" className="iconify text-[18px] text-slate-400 iconify--solar"><path fill="currentColor" d="M7 12a2 2 0 1 1-4 0a2 2 0 0 1 4 0m14 0a2 2 0 1 1-4 0a2 2 0 0 1 4 0" className=""></path><path fill="currentColor" d="M14 12a2 2 0 1 1-4 0a2 2 0 0 1 4 0" opacity=".5" className=""></path></svg>
            </button>

          </div>

          {/* <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-800">
                <img src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/9ba14e9d-067e-4e6f-be51-1c554751d2ca_320w.webp" className="w-full h-full object-cover" alt="" />
              </div>
              <div className="">
                <p className="text-[13px] font-semibold tracking-tight text-slate-50">Orion Blaze</p>
                <p className="text-[11px] text-slate-500">Streaming in: Eclipse Arena</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-3 py-1.5 text-[12px] font-semibold text-slate-950">
              <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="1em" height="1em" viewBox="0 0 24 24" data-icon="solar:play-bold-duotone" className="iconify text-[14px] iconify--solar"><path fill="currentColor" fillRule="evenodd" d="M23 12c0-1.035-.53-2.07-1.591-2.647L8.597 2.385C6.534 1.264 4 2.724 4 5.033V12z" clipRule="evenodd" className=""></path><path fill="currentColor" d="m8.597 21.615l12.812-6.968A2.99 2.99 0 0 0 23 12H4v6.967c0 2.31 2.534 3.769 4.597 2.648" opacity=".5" className=""></path></svg>
              Watch Now
            </button>
          </div> */}

        </div>

      </section>

    </motion.div>
  );
};

export function Cards() {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {cards.map((card, index) => (
          <Card key={`card-${index}`} index={index} {...card} />
        ))}
      </div>
    </>
  );
}