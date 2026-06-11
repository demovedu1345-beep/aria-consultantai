import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Globe } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultUrl?: string;
  loading: boolean;
  onRun: (args: { websiteUrl: string; focus: string; userMessage: string }) => void;
}

const FOCUS_PRESETS = [
  { id: "ui", label: "UI & UX problems", prompt: "Audit the website UI/UX: layout clarity, hierarchy, friction, mobile, above-the-fold, navigation, trust signals, and design polish. Cite exact pages/sections." },
  { id: "copy", label: "Wording & messaging", prompt: "Audit the copy: clarity of value prop, headline strength, CTA wording, jargon, tone, scannability. Quote weak lines and rewrite them." },
  { id: "traffic", label: "Why no traffic", prompt: "Diagnose why this site likely gets low traffic: SEO basics (title, meta, H1, alt, internal links, content depth), keyword targeting, distribution channels, and discoverability." },
  { id: "conversion", label: "Why visitors don't convert", prompt: "Diagnose conversion leakage: offer clarity, pricing transparency, social proof, CTA placement, form friction, perceived risk, and the gap between promise and proof." },
  { id: "full", label: "Full diagnosis", prompt: "Run a complete diagnosis: UI/UX, copy, SEO/traffic, conversion, trust, and competitive positioning. Surface the single biggest revenue blocker." },
];

export function NewSessionDialog({ open, onClose, defaultUrl, loading, onRun }: Props) {
  const [url, setUrl] = useState(defaultUrl || "");
  const [focusId, setFocusId] = useState("full");
  const [extra, setExtra] = useState("");

  const submit = () => {
    if (!url.trim()) return;
    const preset = FOCUS_PRESETS.find((p) => p.id === focusId)!;
    const userMessage = `NEW DIAGNOSTIC SESSION.

Target URL: ${url.trim()}

Focus: ${preset.label}
${preset.prompt}

${extra.trim() ? `Founder notes:\n${extra.trim()}\n\n` : ""}Deliverable: in the DIAGNOSIS section, name 3–5 specific problems with proof quoted from the scraped site (UI flaws, weak copy, missing trust, SEO gaps, conversion friction). In ACTION PLAN, give 3 fixes the founder can ship in 24h with exact copy/UX changes.`;
    onRun({ websiteUrl: url.trim(), focus: preset.label, userMessage });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-xl bg-surface/95 backdrop-blur-xl border-stroke">
        <DialogHeader>
          <DialogTitle className="font-display italic text-3xl">New diagnostic session</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Drop your website URL — ARIA will deep-scan it and tell you exactly what's broken and how to fix it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div>
            <label className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2 block">Website URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourbrand.com"
                className="pl-10 h-12 bg-bg/60 border-stroke text-base"
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2 block">What should ARIA diagnose?</label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setFocusId(p.id)}
                  className={`text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border transition ${
                    focusId === p.id
                      ? "border-accent text-text-primary bg-accent/10"
                      : "border-stroke text-muted-foreground hover:text-text-primary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2 block">Anything else? (optional)</label>
            <Textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              rows={3}
              placeholder="e.g. Traffic is flat at 200/mo, mostly bounces on pricing page."
              className="bg-bg/60 border-stroke resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-text-primary transition px-3 py-2"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!url.trim() || loading}
              className="relative group rounded-full disabled:opacity-50"
            >
              <span className="absolute -inset-[2px] rounded-full accent-gradient" />
              <span className="relative inline-flex items-center gap-2 bg-text-primary text-bg rounded-full px-5 py-2.5 text-sm">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Deep-scanning…" : "Deep scan & diagnose"}
              </span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
