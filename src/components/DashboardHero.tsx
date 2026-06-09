import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { AriaState } from "@/lib/aria-store";

const ROLES = ["Consultant", "Operator", "Strategist", "Confidant"];

interface Props {
  state: AriaState;
  mode: "advisor" | "operator";
  loading: boolean;
}

export function DashboardHero({ state, mode, loading }: Props) {
  const [roleIdx, setRoleIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setRoleIdx((i) => (i + 1) % ROLES.length), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".dh-name", { opacity: 0, y: 40, duration: 1.1 })
      .from(".dh-blur", { opacity: 0, filter: "blur(10px)", y: 16, duration: 0.9, stagger: 0.08 }, 0.25);
  }, []);

  const last = state.sessions[state.sessions.length - 1];
  const overall = last?.scores?.overall ?? null;
  const done = state.actions.filter((a) => a.status === "completed").length;
  const pending = state.actions.filter((a) => a.status === "pending").length;

  const stats = [
    { value: state.sessions.length.toString().padStart(2, "0"), label: "Sessions" },
    { value: overall != null ? `${overall}` : "—", label: "Overall score" },
    { value: `${done}/${done + pending}`, label: "Actions cleared" },
    { value: mode === "operator" ? "LIVE" : "READY", label: "Operator status" },
  ];

  return (
    <section className="relative w-full overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 md:px-10 pt-4 pb-12 md:pb-16 text-center">
        <div className="dh-blur text-[10px] text-muted-foreground uppercase tracking-[0.34em] mb-6 inline-flex items-center gap-3">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${loading ? "bg-accent animate-pulse" : "bg-emerald-400/80"}`} />
          {loading ? "ARIA SYNTHESIZING" : "ARIA ONLINE"} · COLLECTION '26
        </div>

        <h1 className="dh-name text-5xl md:text-7xl lg:text-8xl font-display italic leading-[0.9] tracking-tight text-text-primary mb-5">
          ARIA
        </h1>

        <div className="dh-blur text-xl md:text-3xl font-display text-text-primary/90 mb-4">
          Your{" "}
          <span
            key={roleIdx}
            className="font-display italic accent-text animate-role-fade-in inline-block"
          >
            {ROLES[roleIdx]}
          </span>{" "}
          on retainer.
        </div>

        {state.profile && (
          <p className="dh-blur text-xs md:text-sm text-muted-foreground max-w-md mx-auto">
            Running for{" "}
            <span className="text-text-primary">{state.profile.business_name}</span>
            {state.profile.business_type ? ` · ${state.profile.business_type}` : ""}
            {state.profile.location ? ` · ${state.profile.location}` : ""}
          </p>
        )}
      </div>

      {/* Stats marquee strip — landing-style */}
      <div className="border-y border-stroke bg-surface/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 md:px-10 grid grid-cols-2 md:grid-cols-4 divide-x divide-stroke">
          {stats.map((s) => (
            <div key={s.label} className="py-6 md:py-8 px-4 first:pl-0 last:pr-0">
              <div className="font-display text-3xl md:text-5xl text-text-primary leading-none">{s.value}</div>
              <div className="mt-2 text-[10px] text-muted-foreground uppercase tracking-[0.28em]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
