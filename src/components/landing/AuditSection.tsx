import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Lock, Sparkles, MessageCircle, Loader2 } from "lucide-react";
import {
  AuditAnswers, AriaReport, BUDGETS, CATEGORIES, WEBSITE_OPTIONS,
  generateReport, saveLead, waLink, getWhatsApp, DEFAULT_WHATSAPP,
} from "@/lib/aria-audit";
import { toast } from "sonner";

const empty: AuditAnswers = {
  name: "", phone: "", email: "",
  business_name: "", category: "", website_status: "basic",
  monthly_leads: 0, marketing_method: "", biggest_problem: "",
  business_goal: "", budget_range: "",
};

export function AuditSection() {
  const [a, setA] = useState<AuditAnswers>(empty);
  const [report, setReport] = useState<AriaReport | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof AuditAnswers>(k: K, v: AuditAnswers[K]) =>
    setA((p) => ({ ...p, [k]: v }));

  const businessReady = a.business_name && a.category && a.biggest_problem && a.business_goal;
  const contactReady = a.name.trim().length > 1 && a.email.includes("@") && a.phone.replace(/\D/g, "").length >= 8;

  function runReport() {
    if (!businessReady) { toast.error("Fill business details first."); return; }
    setLoading(true);
    setTimeout(() => {
      const r = generateReport(a);
      setReport(r);
      setLoading(false);
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }, 700);
  }

  function unlock() {
    if (!contactReady || !report) { toast.error("Enter name, valid phone and email."); return; }
    saveLead(a, report);
    setUnlocked(true);
    toast.success("Full report unlocked. We saved your details.");
  }

  const waMessage = useMemo(() => {
    if (!report) return "";
    return `Hi, I'm ${a.name} from ${a.business_name} (${a.category}). My ARIA Business Score is ${report.score}/100. I'd like a free consultation.`;
  }, [a, report]);

  function printReport() {
    if (!reportRef.current) return;
    const html = reportRef.current.outerHTML;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>ARIA Report — ${a.business_name}</title>
      <style>body{font-family:Inter,system-ui;background:#fff;color:#111;padding:32px;max-width:820px;margin:auto}
      h1,h2,h3{font-family:Georgia,serif;font-style:italic}
      .aria-card{border:1px solid #e5e5e5;border-radius:14px;padding:20px;margin-bottom:14px}
      ul{padding-left:18px}.score{font-size:64px;font-weight:600}
      </style></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  return (
    <section id="audit" className="relative bg-bg py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }} viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted-foreground uppercase tracking-[0.3em]">Free Tool</span>
            <span className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-6xl font-display tracking-tight">
            Free AI <span className="font-display italic">Business Audit</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Answer a few questions. ARIA scores your business, exposes the biggest leak,
            and hands you a 7-day plan — in under 60 seconds.
          </p>
        </motion.div>

        {/* Form */}
        <div className="aria-card p-6 md:p-10 backdrop-blur-xl bg-surface/70">
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Business name">
              <input className={inputCls} value={a.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="e.g. Sunrise Events" />
            </Field>
            <Field label="Business category">
              <select className={inputCls} value={a.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">Select…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Website status">
              <div className="flex gap-2 flex-wrap">
                {WEBSITE_OPTIONS.map((o) => (
                  <button type="button" key={o.value}
                    onClick={() => set("website_status", o.value)}
                    className={`text-xs px-3 py-2 rounded-full border transition ${a.website_status === o.value ? "border-accent text-text-primary bg-accent/10" : "border-stroke text-muted-foreground hover:text-text-primary"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Monthly leads (approx)">
              <input type="number" min={0} className={inputCls} value={a.monthly_leads || ""} onChange={(e) => set("monthly_leads", Number(e.target.value) || 0)} placeholder="0" />
            </Field>
            <Field label="Current marketing method">
              <input className={inputCls} value={a.marketing_method} onChange={(e) => set("marketing_method", e.target.value)} placeholder="WhatsApp, referrals, Instagram…" />
            </Field>
            <Field label="Budget range">
              <select className={inputCls} value={a.budget_range} onChange={(e) => set("budget_range", e.target.value)}>
                <option value="">Select…</option>
                {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Biggest business problem" full>
              <textarea rows={2} className={inputCls} value={a.biggest_problem} onChange={(e) => set("biggest_problem", e.target.value)} placeholder="What hurts the most right now?" />
            </Field>
            <Field label="Business goal (next 90 days)" full>
              <textarea rows={2} className={inputCls} value={a.business_goal} onChange={(e) => set("business_goal", e.target.value)} placeholder="2x leads, open a 2nd branch, hit ₹5L MRR…" />
            </Field>
          </div>

          <div className="mt-8 flex justify-end">
            <button onClick={runReport} disabled={loading || !businessReady}
              className="relative group rounded-full disabled:opacity-50">
              <span className="absolute -inset-[2px] rounded-full accent-gradient" />
              <span className="relative inline-flex items-center gap-2 bg-text-primary text-bg rounded-full px-6 py-3 text-sm">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                Generate my ARIA report
              </span>
            </button>
          </div>
        </div>

        {/* Report */}
        {report && (
          <div ref={reportRef} className="mt-10 aria-card p-6 md:p-10 backdrop-blur-xl bg-surface/70">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">ARIA Diagnostic</div>
                <h3 className="font-display italic text-3xl md:text-4xl">{report.headline}</h3>
              </div>
              <div className="text-center">
                <div className="score text-6xl md:text-7xl font-display accent-text leading-none">{report.score}</div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-2">Score / 100</div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <Card title="Biggest weakness"><p className="text-sm text-muted-foreground">{report.weakness}</p></Card>
              <Card title="Top 2 improvements (preview)">
                <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                  {report.improvements.slice(0, 2).map((i, k) => <li key={k}>{i}</li>)}
                </ul>
              </Card>
            </div>

            {/* Lock gate */}
            {!unlocked && (
              <div className="mt-8 aria-card p-6 bg-bg/60 border-dashed">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="h-4 w-4 accent-text" />
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Unlock full report</span>
                </div>
                <div className="grid md:grid-cols-3 gap-3 mb-4">
                  <input className={inputCls} placeholder="Full name" value={a.name} onChange={(e) => set("name", e.target.value)} />
                  <input className={inputCls} placeholder="Phone (with country code)" value={a.phone} onChange={(e) => set("phone", e.target.value)} />
                  <input className={inputCls} type="email" placeholder="Email" value={a.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <button onClick={unlock} className="rounded-full bg-text-primary text-bg px-6 py-3 text-sm hover:scale-[1.02] transition-transform">
                  Unlock full report
                </button>
                <p className="text-[11px] text-muted-foreground mt-3">We save your details locally and never sell them. See our Privacy page.</p>
              </div>
            )}

            {unlocked && (
              <>
                <div className="mt-8 grid md:grid-cols-2 gap-4">
                  <Card title="All improvement priorities">
                    <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                      {report.improvements.map((i, k) => <li key={k}>{i}</li>)}
                    </ul>
                  </Card>
                  <Card title="Recommended AI tools">
                    <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                      {report.ai_tools.map((i, k) => <li key={k}>{i}</li>)}
                    </ul>
                  </Card>
                  <Card title="Marketing plan">
                    <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                      {report.marketing_plan.map((i, k) => <li key={k}>{i}</li>)}
                    </ul>
                  </Card>
                  <Card title="Automation opportunities">
                    <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                      {report.automation.map((i, k) => <li key={k}>{i}</li>)}
                    </ul>
                  </Card>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <Card title="Time saved (est.)">
                    <div className="text-4xl font-display accent-text">{report.time_saved_hours_month} hrs<span className="text-base text-muted-foreground"> /mo</span></div>
                  </Card>
                  <Card title="Lead improvement (est.)">
                    <div className="text-4xl font-display accent-text">+{report.lead_uplift_pct}%</div>
                  </Card>
                </div>

                <div className="mt-6 aria-card p-5 bg-bg/40">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">7-Day Action Plan</div>
                  <ol className="space-y-2">
                    {report.seven_day_plan.map((d) => (
                      <li key={d.day} className="flex gap-3 text-sm">
                        <span className="w-14 shrink-0 text-muted-foreground">{d.day}</span>
                        <span className="text-text-primary/90">{d.action}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-8 flex flex-wrap gap-3 justify-end">
                  <button onClick={printReport} className="inline-flex items-center gap-2 rounded-full border border-stroke px-5 py-3 text-sm hover:border-accent transition">
                    <Download className="h-4 w-4" /> Download as PDF
                  </button>
                  <a
                    href={waLink(waMessage)}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-6 py-3 text-sm hover:scale-105 transition-transform"
                  >
                    <MessageCircle className="h-4 w-4" /> Send my report on WhatsApp
                  </a>
                  <a href="#booking" className="relative group rounded-full">
                    <span className="absolute -inset-[2px] rounded-full accent-gradient" />
                    <span className="relative inline-flex items-center gap-2 bg-text-primary text-bg rounded-full px-6 py-3 text-sm">
                      <CheckCircle2 className="h-4 w-4" /> Book free consultation
                    </span>
                  </a>
                </div>
                {getWhatsApp() === DEFAULT_WHATSAPP && (
                  <p className="text-[11px] text-muted-foreground mt-3 text-right">
                    Tip: set your WhatsApp number from the floating button so leads reach you.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const inputCls =
  "w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm focus:outline-none focus:border-accent transition";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground block mb-2">{label}</span>
      {children}
    </label>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="aria-card p-5 bg-bg/40">
      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">{title}</div>
      {children}
    </div>
  );
}
