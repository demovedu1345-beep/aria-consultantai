import { useMemo, useState } from "react";
import { motion } from "framer-motion";

export function RoiCalculator() {
  const [employees, setEmployees] = useState(3);
  const [hoursWeek, setHoursWeek] = useState(8);
  const [hourlyCost, setHourlyCost] = useState(300);
  const [marketing, setMarketing] = useState(20000);
  const [leads, setLeads] = useState(40);
  const [conv, setConv] = useState(10);

  const out = useMemo(() => {
    const hoursSavedMonth = Math.round(employees * hoursWeek * 4.3 * 0.6);
    const costSaved = Math.round(hoursSavedMonth * hourlyCost);
    const leadGrowthPct = Math.min(80, 15 + Math.round((marketing / 5000)));
    const newLeads = Math.round(leads * (1 + leadGrowthPct / 100));
    const newSales = Math.round(newLeads * (conv / 100));
    const priority = hoursSavedMonth > 80 ? "High" : hoursSavedMonth > 30 ? "Medium" : "Low";
    return { hoursSavedMonth, costSaved, leadGrowthPct, newLeads, newSales, priority };
  }, [employees, hoursWeek, hourlyCost, marketing, leads, conv]);

  return (
    <section id="roi" className="relative bg-bg py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-6 md:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }} viewport={{ once: true, margin: "-80px" }} className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted-foreground uppercase tracking-[0.3em]">Calculator</span>
            <span className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-6xl font-display tracking-tight">
            AI <span className="font-display italic">ROI Calculator</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Honest numbers, not promises. See what automation can save you — month one.
          </p>
        </motion.div>

        <div className="aria-card p-6 md:p-10 grid md:grid-cols-2 gap-8 backdrop-blur-xl bg-surface/70">
          <div className="space-y-5">
            <Input label="Employees" value={employees} onChange={setEmployees} />
            <Input label="Hours/week on repetitive tasks (per person)" value={hoursWeek} onChange={setHoursWeek} />
            <Input label="Avg hourly cost (₹)" value={hourlyCost} onChange={setHourlyCost} />
            <Input label="Monthly marketing budget (₹)" value={marketing} onChange={setMarketing} step={1000} />
            <Input label="Monthly leads" value={leads} onChange={setLeads} />
            <Input label="Conversion rate (%)" value={conv} onChange={setConv} />
          </div>
          <div className="space-y-3">
            <Stat label="Hours saved / month" value={`${out.hoursSavedMonth} hrs`} />
            <Stat label="Cost saved / month" value={`₹${out.costSaved.toLocaleString("en-IN")}`} />
            <Stat label="Possible lead growth" value={`+${out.leadGrowthPct}% → ${out.newLeads}/mo`} />
            <Stat label="Estimated new sales / month" value={`${out.newSales}`} />
            <Stat label="Automation priority" value={out.priority} accent />
            <a href="#audit" className="block text-center mt-4 rounded-full bg-text-primary text-bg py-3 text-sm hover:scale-[1.02] transition-transform">
              Get my full audit
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Input({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground block mb-2">{label}</span>
      <input type="number" min={0} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm focus:outline-none focus:border-accent" />
    </label>
  );
}
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="aria-card p-4 bg-bg/40 flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
      <span className={`text-xl font-display ${accent ? "accent-text" : "text-text-primary"}`}>{value}</span>
    </div>
  );
}
