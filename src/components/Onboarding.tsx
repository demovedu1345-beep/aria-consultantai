import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";
import type { BusinessProfile } from "@/lib/aria-store";

interface Props {
  onSubmit: (p: BusinessProfile, websiteUrl: string, socialText: string) => void;
  loading: boolean;
}

export function Onboarding({ onSubmit, loading }: Props) {
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const handle = email.split("@")[0] || "Founder";
    const profile: BusinessProfile = {
      business_name: handle,
      business_type: "",
      business_stage: "",
      location: "",
      revenue: "",
      team_size: "",
    };
    onSubmit(profile, "", `EMAIL: ${email.trim()}`);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[hsl(0_0%_3%)]">
      {/* Silk drape backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-1/3 -right-1/4 h-[140%] w-[80%] rotate-[18deg] bg-[radial-gradient(ellipse_at_center,hsl(0_0%_55%/0.35),transparent_60%)] blur-3xl" />
        <div className="absolute top-1/4 -right-10 h-[90%] w-[60%] rotate-[28deg] bg-[radial-gradient(ellipse_at_center,hsl(0_0%_70%/0.22),transparent_65%)] blur-2xl" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[120%] w-[70%] -rotate-[18deg] bg-[radial-gradient(ellipse_at_center,hsl(0_0%_45%/0.28),transparent_65%)] blur-3xl" />
      </div>

      {/* Top nav */}
      <div className="relative z-10 px-8 pt-7">
        <button className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/90 hover:text-foreground transition">
          <ChevronLeft className="h-4 w-4" /> Home
        </button>
      </div>

      {/* Centered card */}
      <div className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-6">
        <div className="w-full max-w-[420px] flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-8 h-12 w-12 rounded-xl bg-[hsl(0_0%_8%)] border border-white/10 flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]">
            <span className="font-display italic text-2xl text-accent leading-none">A</span>
          </div>

          <h1 className="font-display text-[40px] leading-tight tracking-tight text-foreground">
            Log in to ARIA
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <a className="text-foreground font-medium hover:underline" href="#">Sign up</a>.
          </p>

          {/* Provider buttons */}
          <div className="mt-8 grid w-full grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 rounded-md bg-[hsl(0_0%_10%)] border border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
                Last used
              </span>
              <ProviderBtn icon={<GoogleIcon />} label="Log in with Google" />
            </div>
            <ProviderBtn icon={<GithubIcon />} label="Log in with GitHub" />
          </div>

          {/* Divider */}
          <div className="mt-7 mb-5 flex w-full items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Email form */}
          <form onSubmit={submit} className="w-full text-left">
            <label className="block text-sm text-foreground/80 mb-2">Email</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alan.turing@example.com"
              className="h-11 bg-[hsl(0_0%_8%)] border-white/10 text-foreground placeholder:text-muted-foreground/60"
            />

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="mt-6 h-11 w-full rounded-lg bg-[hsl(0_0%_10%)] border border-white/10 text-foreground/60 hover:bg-[hsl(0_0%_12%)] hover:text-foreground"
            >
              {loading ? "Analyzing…" : "Log In"}
            </Button>
          </form>

          <p className="mt-8 text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <a href="#" className="underline text-foreground/80">Terms</a> and{" "}
            <a href="#" className="underline text-foreground/80">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProviderBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-2 h-11 w-full rounded-lg bg-[hsl(0_0%_8%)] border border-white/10 text-sm font-medium text-foreground hover:bg-[hsl(0_0%_11%)] transition"
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.5-1.74 4.4-5.5 4.4-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.48l2.64-2.55C16.86 3.7 14.66 2.7 12 2.7 6.94 2.7 2.85 6.79 2.85 11.8s4.09 9.1 9.15 9.1c5.28 0 8.78-3.7 8.78-8.92 0-.6-.06-1.06-.14-1.78H12z"/>
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.27-5.23-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17a10.96 10.96 0 0 1 5.74 0c2.18-1.48 3.14-1.17 3.14-1.17.62 1.58.23 2.75.12 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.36.78 1.07.78 2.16v3.21c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/>
    </svg>
  );
}
