import { motion } from "framer-motion";

const ENTRIES = [
  {
    title: "On building AI that remembers",
    img: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&auto=format&fit=crop",
    read: "4 min read",
    date: "Apr 2026",
  },
  {
    title: "Why operators beat assistants",
    img: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&auto=format&fit=crop",
    read: "6 min read",
    date: "Mar 2026",
  },
  {
    title: "The death of the dashboard",
    img: "https://images.unsplash.com/photo-1483058712412-4245e9b90334?w=400&auto=format&fit=crop",
    read: "5 min read",
    date: "Feb 2026",
  },
  {
    title: "Voice as the new interface",
    img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&auto=format&fit=crop",
    read: "3 min read",
    date: "Jan 2026",
  },
];

export function Journal() {
  return (
    <section className="bg-bg py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className="flex items-end justify-between mb-10 flex-wrap gap-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted-foreground uppercase tracking-[0.3em]">
                Journal
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-display tracking-tight text-text-primary">
              Recent <span className="font-display italic">thoughts</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-md">
              Field notes from building intelligence that earns its place in your business.
            </p>
          </div>
          <button className="hidden md:inline-flex items-center gap-2 rounded-full border border-stroke px-5 py-2.5 text-sm hover:scale-105 transition-transform">
            View all <span aria-hidden>→</span>
          </button>
        </motion.div>

        <div className="space-y-4">
          {ENTRIES.map((e, i) => (
            <motion.a
              key={e.title}
              href="#"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              viewport={{ once: true, margin: "-50px" }}
              className="flex items-center gap-6 p-4 bg-surface/30 hover:bg-surface border border-stroke rounded-[40px] sm:rounded-full transition-colors group"
            >
              <img src={e.img} alt={e.title} className="h-14 w-14 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl md:text-2xl truncate">{e.title}</div>
              </div>
              <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground shrink-0">
                <span>{e.read}</span>
                <span>{e.date}</span>
              </div>
              <span className="shrink-0 text-muted-foreground group-hover:text-text-primary transition-colors text-xl">→</span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
