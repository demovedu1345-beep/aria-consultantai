import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import type { BusinessProfile } from "@/lib/aria-store";

interface Props {
  onSubmit: (p: BusinessProfile, websiteUrl: string, socialText: string) => void;
  loading: boolean;
}

type Step = {
  key: keyof BusinessProfile | "website_url" | "social_text";
  label: string;
  hint: string;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  examples?: string[];
};

const STEPS: Step[] = [
  { key: "business_name", label: "What's the business called?", hint: "The exact brand name customers see.", placeholder: "e.g. Northwind Coffee Co.", required: true },
  { key: "business_type", label: "What does it actually do?", hint: "One line — product, service, or model.", placeholder: "e.g. DTC specialty coffee subscription", required: true, examples: ["SaaS for restaurants", "Local fitness studio", "B2B consulting agency"] },
  { key: "business_stage", label: "What stage are you in?", hint: "Be honest — this shapes the strategy.", placeholder: "e.g. Pre-revenue / MVP / $10k MRR / Profitable", required: true, examples: ["Idea", "Pre-revenue MVP", "Early traction", "Profitable & scaling"] },
  { key: "revenue", label: "Monthly revenue (rough)", hint: "Range is fine. Used to size the moves.", placeholder: "e.g. $4k MRR or $0 — pre-launch", required: true },
  { key: "team_size", label: "Team size", hint: "Including you, contractors, part-time.", placeholder: "e.g. Solo founder, or 3 ppl", required: true },
  { key: "location", label: "Where do you operate?", hint: "Country / city, or 'Global / remote'.", placeholder: "e.g. Mumbai, India", required: true },
  { key: "website_url", label: "Your website URL", hint: "ARIA will deep-scan this — pages, copy, offers.", placeholder: "https://yourbrand.com" },
  { key: "social_text", label: "Anything else ARIA should know?", hint: "Top channel, current bottleneck, biggest customer, recent wins/losses. The more honest, the sharper the diagnosis.", placeholder: "e.g. Main channel is Instagram, ~6k followers. Stuck at $4k MRR. Churn is high after month 2.", multiline: true },
];

export function Onboarding({ onSubmit, loading }: Props) {
  const [i, setI] = useState(0);
  const [data, setData] = useState<Record<string, string>>({});
  const step = STEPS[i];
  const value = data[step.key] || "";
  const canNext = !step.required || value.trim().length > 0;

  const next = () => {
    if (!canNext) return;
    if (i < STEPS.length - 1) setI(i + 1);
    else finish();
  };
  const back = () => i > 0 && setI(i - 1);

  function finish() {
    const profile: BusinessProfile = {
      business_name: data.business_name || "",
      business_type: data.business_type || "",
      business_stage: data.business_stage || "",
      location: data.location || "",
      revenue: data.revenue || "",
      team_size: data.team_size || "",
    };
    onSubmit(profile, (data.website_url || "").trim(), (data.social_text || "").trim());
  }

  const pct = ((i + 1) / STEPS.length) * 100;

  return (
    <div className="relative w-full">
      <div className="relative z-10 flex min-h-[calc(100vh-160px)] items-center justify-center px-6 py-10">
        <div className="w-full max-w-[640px]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-4">
              <span className="h-1.5 w-1.5 rounded-full accent-gradient" /> Onboarding · Step {i + 1} of {STEPS.length}
            </div>
            <h1 className="font-display italic text-[40px] md:text-[56px] leading-[1.05] tracking-tight">
              {step.label}
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground">{step.hint}</p>
          </div>

          {/* Progress */}
          <div className="h-px bg-stroke mb-8 overflow-hidden rounded-full">
            <div className="h-full accent-gradient transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>

          {/* Card */}
          <div className="aria-card p-6 md:p-8 backdrop-blur-xl bg-surface/60">
            {step.multiline ? (
              <Textarea
                autoFocus
                value={value}
                onChange={(e) => setData({ ...data, [step.key]: e.target.value })}
                placeholder={step.placeholder}
                rows={6}
                className="bg-bg/60 border-stroke text-text-primary placeholder:text-muted-foreground/60 resize-none text-base"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) next(); }}
              />
            ) : (
              <Input
                autoFocus
                value={value}
                onChange={(e) => setData({ ...data, [step.key]: e.target.value })}
                placeholder={step.placeholder}
                className="h-12 bg-bg/60 border-stroke text-text-primary placeholder:text-muted-foreground/60 text-base"
                onKeyDown={(e) => { if (e.key === "Enter") next(); }}
              />
            )}

            {step.examples && (
              <div className="mt-4 flex flex-wrap gap-2">
                {step.examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setData({ ...data, [step.key]: ex })}
                    className="text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-stroke text-muted-foreground hover:text-text-primary hover:border-accent/50 transition"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={back}
                disabled={i === 0 || loading}
                className="text-muted-foreground hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>

              <div className="flex items-center gap-3">
                {!step.required && (
                  <button
                    type="button"
                    onClick={() => { setData({ ...data, [step.key]: "" }); next(); }}
                    disabled={loading}
                    className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-text-primary transition"
                  >
                    Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  disabled={!canNext || loading}
                  className="relative group rounded-full disabled:opacity-50"
                >
                  <span className="absolute -inset-[2px] rounded-full accent-gradient" />
                  <span className="relative inline-flex items-center gap-2 bg-text-primary text-bg rounded-full px-5 py-2.5 text-sm">
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> :
                      i === STEPS.length - 1 ? <Sparkles className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    {loading ? "ARIA is analyzing…" : i === STEPS.length - 1 ? "Launch ARIA" : "Continue"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Stored locally · Honest answers → sharper strategy
          </p>
        </div>
      </div>
    </div>
  );
}
