import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { saveBooking, waLink } from "@/lib/aria-audit";

const CALL_TYPES = [
  "15-minute free consultation",
  "Website + AI automation discussion",
  "Business growth strategy call",
];

export function BookingSection() {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", date: "", time: "",
    business_type: "", call_type: CALL_TYPES[0], message: "",
  });
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email || !form.date) {
      toast.error("Fill name, phone, email and preferred date.");
      return;
    }
    saveBooking(form);
    setDone(true);
    toast.success("Booking received. We'll confirm shortly.");
  }

  const wa = waLink(
    `Hi, I just booked a ${form.call_type} for ${form.date} ${form.time}. Business: ${form.business_type || "—"}. Name: ${form.name}.`,
  );

  return (
    <section id="booking" className="relative bg-bg py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-6 md:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }} viewport={{ once: true, margin: "-80px" }} className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted-foreground uppercase tracking-[0.3em]">Consultation</span>
            <span className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-6xl font-display tracking-tight">
            Book a free <span className="font-display italic">AI consultation</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Pick a slot. No deck, no fluff — one focused conversation about your business.
          </p>
        </motion.div>

        {!done ? (
          <form onSubmit={submit} className="aria-card p-6 md:p-10 backdrop-blur-xl bg-surface/70 grid md:grid-cols-2 gap-5">
            <Field label="Name"><input className={cls} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Phone"><input className={cls} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Email"><input type="email" className={cls} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Business type"><input className={cls} value={form.business_type} onChange={(e) => set("business_type", e.target.value)} /></Field>
            <Field label="Preferred date"><input type="date" className={cls} value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
            <Field label="Preferred time"><input type="time" className={cls} value={form.time} onChange={(e) => set("time", e.target.value)} /></Field>
            <Field label="Call type" full>
              <div className="flex flex-wrap gap-2">
                {CALL_TYPES.map((c) => (
                  <button type="button" key={c} onClick={() => set("call_type", c)}
                    className={`text-xs px-3 py-2 rounded-full border transition ${form.call_type === c ? "border-accent text-text-primary bg-accent/10" : "border-stroke text-muted-foreground hover:text-text-primary"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Message (optional)" full>
              <textarea rows={3} className={cls} value={form.message} onChange={(e) => set("message", e.target.value)} />
            </Field>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="relative group rounded-full">
                <span className="absolute -inset-[2px] rounded-full accent-gradient" />
                <span className="relative inline-flex items-center gap-2 bg-text-primary text-bg rounded-full px-6 py-3 text-sm">
                  <CheckCircle2 className="h-4 w-4" /> Confirm booking
                </span>
              </button>
            </div>
          </form>
        ) : (
          <div className="aria-card p-10 text-center backdrop-blur-xl bg-surface/70">
            <CheckCircle2 className="h-10 w-10 accent-text mx-auto mb-4" />
            <h3 className="font-display italic text-3xl mb-2">You're on the calendar.</h3>
            <p className="text-muted-foreground mb-6">We'll confirm your slot shortly. Want to share context before the call?</p>
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-6 py-3 text-sm hover:scale-105 transition-transform">
              <MessageCircle className="h-4 w-4" /> Ping us on WhatsApp
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

const cls = "w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm focus:outline-none focus:border-accent transition";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground block mb-2">{label}</span>
      {children}
    </label>
  );
}
