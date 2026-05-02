import { motion } from "framer-motion";

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, delay: 0.38 } },
};

export default function Footer() {
  return (
    <motion.footer
      className="py-14 px-6 md:px-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-t border-border relative overflow-hidden"
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      <div>
        <div className="font-bebas text-lg tracking-[0.3em] text-foreground">
          ZÜMA
        </div>
        <span className="block font-mono text-[8px] tracking-[0.2em] text-muted-foreground font-normal mt-2">
          brand born between casablanca and elsewhere. we were made to create.
        </span>
      </div>

      <div className="text-left md:text-right relative z-[2]">
        <div className="flex gap-4 mb-2">
          {[
            { label: "Instagram", url: "https://www.instagram.com/zumaurbanwear" },
            { label: "TikTok", url: "https://www.tiktok.com/@zumaurbanwear" },
            { label: "WhatsApp", url: "https://wa.me/message/KOH2ZXZY6EPHP1" },
          ].map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[8px] tracking-[0.16em] text-muted-foreground uppercase no-underline hover:text-accent transition-colors"
            >
              {s.label}
            </a>
          ))}
        </div>
        <p className="text-accent text-[8px] tracking-[0.16em] uppercase">
          This is the store.
        </p>
      </div>
    </motion.footer>
  );
}
