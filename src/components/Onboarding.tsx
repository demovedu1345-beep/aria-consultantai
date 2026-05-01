import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { BusinessProfile } from "@/lib/aria-store";

interface Props {
  onSubmit: (p: BusinessProfile, websiteUrl: string, socialText: string) => void;
  loading: boolean;
}

export function Onboarding({ onSubmit, loading }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [stage, setStage] = useState("");
  const [revenue, setRevenue] = useState("");
  const [location, setLocation] = useState("");
  const [team, setTeam] = useState("");
  const [website, setWebsite] = useState("");
  const [social, setSocial] = useState("");
  const [pain, setPain] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const profile: BusinessProfile = {
      business_name: name.trim(),
      business_type: type.trim(),
      business_stage: stage,
      location: location.trim(),
      revenue: revenue.trim(),
      team_size: team.trim(),
    };
    // Pack pain point into social_text so ARIA picks it up as context
    const socialBlock = [
      pain ? `KEEPS ME UP AT NIGHT: ${pain}` : "",
      social ? `SOCIAL/EXTRA: ${social}` : "",
    ].filter(Boolean).join("\n");
    onSubmit(profile, website.trim(), socialBlock);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 animate-fade-up">
      <div className="text-center mb-12">
        <span className="aria-tag mb-6">Initial Briefing</span>
        <h1 className="font-display text-5xl md:text-6xl mt-4 mb-4 text-balance">
          Tell me about your <span className="text-accent italic">business</span>.
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          Three questions. Then I'll run your first diagnostic.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-8">
        <section className="aria-card p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Business name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Northwind Studio" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Type</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} required placeholder="Boutique design agency" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stage</Label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} required
                className="flex h-10 w-full rounded-md border border-input bg-input/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select…</option>
                <option>Idea</option>
                <option>Pre-revenue</option>
                <option>Early traction</option>
                <option>Growing</option>
                <option>Scaling</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Monthly revenue</Label>
              <Input value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="$8k" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lisbon" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Team size</Label>
              <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="3" />
            </div>
          </div>
        </section>

        <section className="aria-card p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">What's keeping you up at night?</Label>
            <Textarea value={pain} onChange={(e) => setPain(e.target.value)} placeholder="One sentence is enough." rows={2} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Website URL <span className="text-muted-foreground/50">(optional — I'll analyze it)</span></Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} type="url" placeholder="https://" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Social bio / recent captions <span className="text-muted-foreground/50">(optional)</span></Label>
            <Textarea value={social} onChange={(e) => setSocial(e.target.value)} rows={3} placeholder="Paste a few lines from Instagram, LinkedIn, etc." />
          </div>
        </section>

        <Button type="submit" disabled={loading} variant="accent" size="lg" className="w-full">
          {loading ? "Analyzing…" : "Begin first session"}
        </Button>
      </form>
    </div>
  );
}
