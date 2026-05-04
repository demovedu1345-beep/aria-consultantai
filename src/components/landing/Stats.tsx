import { motion } from "framer-motion";

const STATS = [
  { value: "24/7", label: "Continuous insight" },
  { value: "100+", label: "Sessions remembered" },
  { value: "10×", label: "Faster execution" },
];

export function Stats() {
  return (
    <section className="bg-bg py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 grid grid-cols-1 md:grid-cols-3 gap-10">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: i * 0.1 }}
            viewport={{ once: true, margin: "-50px" }}
            className="border-t border-stroke pt-6"
          >
            <div className="font-display text-6xl md:text-7xl text-text-primary">{s.value}</div>
            <div className="mt-2 text-sm text-muted-foreground uppercase tracking-[0.2em]">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
