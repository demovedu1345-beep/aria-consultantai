import { motion } from "framer-motion";

const PROJECTS = [
  {
    title: "Diagnostic Engine",
    img: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&auto=format&fit=crop",
    span: "md:col-span-7",
  },
  {
    title: "Operator Mode",
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop",
    span: "md:col-span-5",
  },
  {
    title: "Voice Sessions",
    img: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1200&auto=format&fit=crop",
    span: "md:col-span-5",
  },
  {
    title: "Memory Graph",
    img: "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=1200&auto=format&fit=crop",
    span: "md:col-span-7",
  },
];

export function SelectedWorks() {
  return (
    <section id="works" className="bg-bg py-12 md:py-16">
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
                Selected Work
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-display tracking-tight text-text-primary">
              Featured <span className="font-display italic">capabilities</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-md">
              A glimpse of how ARIA shows up — from sharp diagnostics to autonomous execution.
            </p>
          </div>
          <button className="hidden md:inline-flex items-center gap-2 rounded-full border border-stroke px-5 py-2.5 text-sm hover:scale-105 transition-transform">
            View all <span aria-hidden>→</span>
          </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          {PROJECTS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
              viewport={{ once: true, margin: "-50px" }}
              className={`group relative bg-surface border border-stroke rounded-3xl overflow-hidden aspect-[4/3] ${p.span}`}
            >
              <img
                src={p.img}
                alt={p.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div
                className="absolute inset-0 opacity-20 mix-blend-multiply"
                style={{
                  backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
                  backgroundSize: "4px 4px",
                }}
              />
              <div className="absolute inset-0 bg-bg/70 backdrop-blur-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="relative rounded-full">
                  <span className="absolute -inset-[2px] rounded-full accent-gradient" />
                  <span className="relative inline-flex bg-text-primary text-bg rounded-full px-5 py-2 text-sm">
                    View — <span className="font-display italic ml-1">{p.title}</span>
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
