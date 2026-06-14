import { motion } from "framer-motion";
import { Shield, Sparkles, Users, Lock } from "lucide-react";

const CASES = [
  {
    tag: "Local Business",
    title: "Local Business Growth",
    body: "A 2-chair salon in Pune went from 12 to 41 monthly bookings in 8 weeks — Google Business profile + WhatsApp drip + reels engine.",
    metric: "+241% bookings",
  },
  {
    tag: "Event Management",
    title: "Event Management Lead Automation",
    body: "Mumbai event company replaced manual DM replies with a WhatsApp + Notion CRM pipeline. Response time: 4 hours → 2 minutes.",
    metric: "120× faster",
  },
  {
    tag: "Conversion",
    title: "Website + WhatsApp Conversion Upgrade",
    body: "Interior studio's brochure site became a single-CTA landing page + WhatsApp catalog. Lead-to-call rate climbed from 6% to 23%.",
    metric: "3.8× conversions",
  },
];

const TRUST = [
  { icon: Sparkles, label: "AI + human business consulting" },
  { icon: Shield, label: "No fake guaranteed results" },
  { icon: Users, label: "Built for small & local businesses" },
  { icon: Lock, label: "Data privacy respected" },
];

export function CaseStudies() {
  return (
    <section id="cases" className="relative bg-bg py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }} viewport={{ once: true, margin: "-80px" }} className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted-foreground uppercase tracking-[0.3em]">Proof</span>
            <span className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-6xl font-display tracking-tight">
            Sample <span className="font-display italic">case studies</span>
          </h2>
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Demo cases — illustrative, not contractual
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {CASES.map((c, i) => (
            <motion.article key={c.title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: i * 0.08 }} viewport={{ once: true }}
              className="aria-card p-6 backdrop-blur-xl bg-surface/70 flex flex-col">
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">{c.tag}</div>
              <h3 className="font-display italic text-2xl mb-3">{c.title}</h3>
              <p className="text-sm text-muted-foreground flex-1">{c.body}</p>
              <div className="mt-5 text-3xl font-display accent-text">{c.metric}</div>
            </motion.article>
          ))}
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TRUST.map((t) => (
            <div key={t.label} className="aria-card p-4 flex items-center gap-3 bg-surface/60">
              <t.icon className="h-4 w-4 accent-text" />
              <span className="text-sm text-text-primary/90">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
