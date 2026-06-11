import { ensureSession } from "@/lib/aria-auth";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { AppShell } from "@/components/AppShell";
import { DashboardHero } from "@/components/DashboardHero";
import { NewSessionDialog } from "@/components/NewSessionDialog";

export default function Index() {
  const [state, setState] = useState<AriaState>(() => loadState());
  const [loading, setLoading] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<"advisor" | "operator">("advisor");
  const autoAdvisorRef = useRef(false);

  useEffect(() => { saveState(state); }, [state]);

  // Auto-run a RETURNING advisor session on load if it's been >12h since last one
  useEffect(() => {
    if (autoAdvisorRef.current) return;
    if (!state.profile || state.sessions.length === 0) return;
    const last = state.sessions[state.sessions.length - 1];
    const ageH = (Date.now() - new Date(last.date).getTime()) / 36e5;
    if (ageH < 12) return;
    autoAdvisorRef.current = true;
    runAria({ type: "RETURNING", profile: state.profile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.profile, state.sessions.length]);

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
      await ensureSession();
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
      await ensureSession();
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
    setNewSessionOpen(true);
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
      <AppShell>
        <Onboarding
          loading={loading}
          onSubmit={(p, web, social) =>
            runAria({ type: "INITIAL", profile: p, websiteUrl: web, socialText: social })
          }
        />
      </AppShell>
    );
  }

  // ===== DASHBOARD =====
  return (
    <AppShell>
      <main className="pb-24">
        <DashboardHero state={state} mode={mode} loading={loading} />
        <section className="max-w-6xl mx-auto px-6 md:px-10 pt-10">
          <div className="aria-card p-6 md:p-8 backdrop-blur-xl bg-surface/60">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 rounded-full p-[2px] accent-gradient">
                  <div className="h-full w-full rounded-full bg-bg flex items-center justify-center">
                    <span className="font-display italic text-lg accent-text">A</span>
                  </div>
                </div>
                <div>
                  <div className="font-display italic text-2xl leading-none tracking-tight">ARIA</div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-2">
                    {state.profile.business_name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex rounded-full border border-stroke bg-bg/60 p-1">
                  <button
                    onClick={() => setMode("advisor")}
                    className={`text-[10px] uppercase tracking-[0.28em] px-4 py-1.5 rounded-full transition-all flex items-center gap-2 ${
                      mode === "advisor"
                        ? "accent-gradient text-bg shadow-[0_4px_20px_-6px_rgba(137,170,204,0.55)]"
                        : "text-muted-foreground hover:text-text-primary"
                    }`}
                  >
                    <BarChart3 className="h-3 w-3" /> Advisor
                  </button>
                  <button
                    onClick={() => setMode("operator")}
                    className={`text-[10px] uppercase tracking-[0.28em] px-4 py-1.5 rounded-full transition-all flex items-center gap-2 ${
                      mode === "operator"
                        ? "accent-gradient text-bg shadow-[0_4px_20px_-6px_rgba(137,170,204,0.55)]"
                        : "text-muted-foreground hover:text-text-primary"
                    }`}
                  >
                    <Zap className="h-3 w-3" /> Operator
                  </button>
                </div>
                <button
                  onClick={() => setVoiceOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-stroke bg-bg/60 text-[11px] uppercase tracking-[0.28em] text-text-primary hover:border-accent/50 transition"
                >
                  <Mic className="h-3.5 w-3.5" /> Voice
                </button>
                {mode === "advisor" && (
                  <button disabled={loading} onClick={newSession} className="relative group rounded-full">
                    <span className="absolute -inset-[2px] rounded-full accent-gradient" />
                    <span className="relative inline-flex items-center gap-2 bg-text-primary text-bg rounded-full px-5 py-2.5 text-sm">
                      {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                      New session
                    </span>
                  </button>
                )}
                <button
                  onClick={fullReset}
                  title="Reset"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-text-primary hover:bg-stroke/40 transition"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {mode === "advisor" && state.sessions.length > 1 && (
              <div className="mt-6 pt-6 border-t border-stroke flex gap-2 overflow-x-auto">
                {state.sessions.slice().reverse().map((s, idx) => {
                  const num = state.sessions.length - idx;
                  const active = s.id === (activeSession?.id);
                  return (
                    <button key={s.id} onClick={() => setActiveSessionId(s.id)}
                      className={`text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border transition whitespace-nowrap ${active ? "border-accent text-text-primary bg-accent/10" : "border-stroke text-muted-foreground hover:text-text-primary"}`}>
                      Session {String(num).padStart(2, "0")} · {new Date(s.date).toLocaleDateString()}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-10">
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
              onTrace={() => { /* persist if needed */ }}
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
    </AppShell>
  );
}
