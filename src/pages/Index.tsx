import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Onboarding } from "@/components/Onboarding";
import { Dashboard } from "@/components/Dashboard";
import { VoiceSession } from "@/components/VoiceSession";
import { Operator } from "@/components/Operator";
import {
  AriaState, BusinessProfile, SessionRecord,
  buildMemory, extractActions, loadState, resetState, saveState,
} from "@/lib/aria-store";
import { Loader2, Mic, RotateCw, Sparkles, Zap, BarChart3 } from "lucide-react";

export default function Index() {
  const [state, setState] = useState<AriaState>(() => loadState());
  const [loading, setLoading] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<"advisor" | "operator">("advisor");

  useEffect(() => { saveState(state); }, [state]);

  const activeSession = useMemo(
    () => state.sessions.find((s) => s.id === activeSessionId) ?? state.sessions[state.sessions.length - 1],
    [state.sessions, activeSessionId]
  );

  const actionMarks = useMemo(() => {
    const m: Record<string, "completed" | "skipped"> = {};
    state.actions.forEach((a) => { if (a.status !== "pending") m[a.text] = a.status; });
    return m;
  }, [state.actions]);

  async function maybeScrape(url: string): Promise<string> {
    if (!url) return "";
    try {
      const { data, error } = await supabase.functions.invoke("scrape-site", { body: { url } });
      if (error) throw error;
      return data?.markdown || "";
    } catch (e) {
      console.warn("scrape failed", e);
      toast.message("Couldn't scrape site — continuing without it.");
      return "";
    }
  }

  async function runAria(opts: {
    type: "INITIAL" | "RETURNING";
    profile: BusinessProfile;
    websiteUrl?: string;
    socialText?: string;
    userMessage?: string;
  }) {
    setLoading(true);
    try {
      const scraped = opts.websiteUrl ? await maybeScrape(opts.websiteUrl) : (state.scraped_site || "");

      const payload = {
        session_type: opts.type,
        profile: opts.profile,
        memory: buildMemory(state),
        website_url: opts.websiteUrl || state.website_url || "",
        scraped_site: scraped,
        social_text: opts.socialText || state.social_text || "",
        user_message: opts.userMessage || "",
      };
      const { data, error } = await supabase.functions.invoke("aria-chat", { body: payload });
      if (error) throw error;
      const content: string = data?.content || "";
      const scores = data?.scores || null;
      const actions = extractActions(content);

      const session: SessionRecord = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        type: opts.type,
        content,
        scores,
        actions,
      };

      setState((prev) => ({
        ...prev,
        profile: opts.profile,
        website_url: opts.websiteUrl || prev.website_url,
        social_text: opts.socialText || prev.social_text,
        scraped_site: scraped || prev.scraped_site,
        sessions: [...prev.sessions, session],
        actions: [
          ...prev.actions,
          ...actions
            .filter((a) => !prev.actions.some((p) => p.text === a))
            .map((text) => ({ text, status: "pending" as const, created_at: session.date })),
        ],
      }));
      setActiveSessionId(session.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Session failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function markAction(text: string, status: "completed" | "skipped") {
    setState((prev) => ({
      ...prev,
      actions: prev.actions.map((a) => (a.text === text ? { ...a, status } : a)),
    }));
    toast.success(status === "completed" ? "Marked done" : "Skipped");
  }

  function newSession() {
    if (!state.profile) return;
    runAria({ type: "RETURNING", profile: state.profile });
  }

  function fullReset() {
    if (!confirm("Reset ARIA — this clears all sessions and memory.")) return;
    resetState();
    setState({ profile: null, sessions: [], actions: [] });
    setActiveSessionId(null);
  }

  // ===== ONBOARDING =====
  if (!state.profile || state.sessions.length === 0) {
    return (
      <main className="min-h-screen">
        <Onboarding
          loading={loading}
          onSubmit={(p, web, social) =>
            runAria({ type: "INITIAL", profile: p, websiteUrl: web, socialText: social })
          }
        />
      </main>
    );
  }

  // ===== DASHBOARD =====
  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[hsl(0_0%_3%/0.55)] border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-accent/40 flex items-center justify-center text-accent-foreground text-sm font-display">A</div>
            <div>
              <div className="font-display text-lg leading-none">ARIA</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1">
                {state.profile.business_name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-border/60 p-0.5 mr-1">
              <button
                onClick={() => setMode("advisor")}
                className={`text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full transition flex items-center gap-1.5 ${mode === "advisor" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <BarChart3 className="h-3 w-3" /> Advisor
              </button>
              <button
                onClick={() => setMode("operator")}
                className={`text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full transition flex items-center gap-1.5 ${mode === "operator" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Zap className="h-3 w-3" /> Operator
              </button>
            </div>
            <Button variant="hero" onClick={() => setVoiceOpen(true)}>
              <Mic className="h-3.5 w-3.5" /> Voice
            </Button>
            {mode === "advisor" && (
              <Button variant="accent" size="sm" disabled={loading} onClick={newSession}>
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="h-4 w-4" />}
                New session
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={fullReset} title="Reset"><RotateCw className="h-4 w-4" /></Button>
          </div>
        </div>
        {mode === "advisor" && state.sessions.length > 1 && (
          <div className="max-w-5xl mx-auto px-6 pb-3 flex gap-2 overflow-x-auto">
            {state.sessions.slice().reverse().map((s, idx) => {
              const num = state.sessions.length - idx;
              const active = s.id === (activeSession?.id);
              return (
                <button key={s.id} onClick={() => setActiveSessionId(s.id)}
                  className={`text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border transition ${active ? "border-accent text-accent bg-accent/10" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  Session {String(num).padStart(2, "0")} · {new Date(s.date).toLocaleDateString()}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-6 pt-10">
        {mode === "advisor" ? (
          <>
            {loading && !activeSession && (
              <div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="animate-spin" /> Synthesizing…</div>
            )}
            {activeSession && (
              <Dashboard
                content={activeSession.content}
                actionMarks={actionMarks}
                onMarkAction={markAction}
              />
            )}
          </>
        ) : (
          <Operator
            profile={state.profile}
            state={state}
            onTrace={() => { /* could persist cycles to localStorage */ }}
          />
        )}
      </div>

      <VoiceSession
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        buildPayload={(userMessage) => ({
          session_type: "VOICE",
          profile: state.profile,
          memory: buildMemory(state),
          website_url: state.website_url || "",
          scraped_site: state.scraped_site || "",
          social_text: state.social_text || "",
          user_message: userMessage,
        })}
      />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="aria-glow absolute inset-0 -z-10" />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-8 text-center">
        <span className="aria-tag">Advanced Real-time Intelligence Advisor</span>
        <h1 className="font-display text-6xl md:text-7xl mt-6 leading-[0.95] text-balance">
          A senior consultant
          <br />
          <span className="italic text-accent">on retainer.</span>
        </h1>
        <p className="text-muted-foreground mt-6 text-lg max-w-xl mx-auto leading-relaxed">
          ARIA studies your business, scores it honestly, and gives you the next four moves —
          remembers everything, never repeats herself.
        </p>
      </div>
    </section>
  );
}
