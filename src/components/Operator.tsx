import { ensureSession } from "@/lib/aria-auth";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AriaState, BusinessProfile, buildMemory } from "@/lib/aria-store";
import { Loader2, Play, Pause, Zap, ChevronRight, CheckCircle2, XCircle, Send } from "lucide-react";

interface ToolCall { tool: string; action?: string; input: Record<string, unknown>; reason?: string; expected_outcome?: string; }
interface TraceItem { tool: string; action?: string; ok: boolean; ms?: number; data?: unknown; error?: string; reason?: string; expected_outcome?: string; }
interface Decision { thought?: string; bottleneck?: string; tool_calls?: ToolCall[]; fallback?: string; next?: string; confidence?: string; }

interface Cycle {
  id: string;
  at: string;
  objective: string;
  decision: Decision;
  trace: TraceItem[];
}

interface Props {
  profile: BusinessProfile;
  state: AriaState;
  onTrace: (cycle: Cycle) => void;
}

const PRESET = "Find 10 high-fit leads, scrape their sites for emails, store the best in CRM, and send personalized outreach.";
const AUTO_KEY = "aria_operator_auto_v1";

// Pull the most recent dashboard bottleneck out of memory and convert it into an executable objective.
function deriveObjective(state: AriaState, fallback: string): string {
  const last = state.sessions[state.sessions.length - 1];
  if (!last?.content) return fallback;
  const m = last.content.match(/🚨\s*BOTTLENECK\s*\n+([\s\S]*?)(?:\n\s*\n|⚡|💡|📈|👑|$)/);
  const bottleneck = (m?.[1] || "").trim().replace(/\s+/g, " ").slice(0, 240);
  if (!bottleneck) return fallback;
  return `Bottleneck: ${bottleneck}\n\nExecute the single highest-leverage chain that breaks this bottleneck in the next 24h. Use research → enrich → verify → store → outreach → notify. Every tool call must include reason + expected_outcome.`;
}

export function Operator({ profile, state, onTrace }: Props) {
  const initialObjective = deriveObjective(state, PRESET);
  const [objective, setObjective] = useState(initialObjective);
  const [running, setRunning] = useState(false);
  const [auto, setAuto] = useState<boolean>(() => {
    try { return localStorage.getItem(AUTO_KEY) === "1"; } catch { return false; }
  });
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [testSubject, setTestSubject] = useState("ARIA test outreach — proving the email loop works");
  const [testBody, setTestBody] = useState(`Hi,\n\nThis is ARIA confirming the autonomous outreach pipeline is live. Real email, real send, real receipt.\n\n— ARIA Operator`);
  const [sendingTest, setSendingTest] = useState(false);
  const autoRef = useRef(auto);
  autoRef.current = auto;

  useEffect(() => {
    try { localStorage.setItem(AUTO_KEY, auto ? "1" : "0"); } catch { /* ignore */ }
  }, [auto]);

  // When the latest dashboard session changes, refresh the suggested objective if the user hasn't edited it.
  useEffect(() => {
    setObjective((cur) => (cur === PRESET || cur === initialObjective ? deriveObjective(state, PRESET) : cur));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessions.length]);

  async function runOnce(opts: { dry?: boolean } = {}) {
    if (running) return;
    setRunning(true);
    try {
      const last = cycles[0];
      await ensureSession();
      const { data, error } = await supabase.functions.invoke("aria-operator", {
        body: {
          profile,
          memory: buildMemory(state),
          objective,
          last_trace: last ? { decision: last.decision, trace: last.trace } : null,
          dry_run: !!opts.dry,
        },
      });
      if (error) throw error;
      const cycle: Cycle = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        objective,
        decision: data?.decision || {},
        trace: data?.trace || [],
      };
      setCycles((prev) => [cycle, ...prev].slice(0, 20));
      onTrace(cycle);
      const failures = cycle.trace.filter((t) => !t.ok).length;
      if (failures) toast.warning(`${failures} tool call(s) failed`);
      else if (cycle.trace.length) toast.success(`Executed ${cycle.trace.length} tool call(s)`);
      else if (cycle.decision.fallback) toast.message("Fallback: copy-paste guidance only");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operator failed");
    } finally {
      setRunning(false);
    }
  }

  async function sendTestEmail() {
    if (!testEmail.trim()) {
      toast.error("Enter a recipient email");
      return;
    }
    setSendingTest(true);
    try {
      await ensureSession();
      const { data, error } = await supabase.functions.invoke("aria-execute", {
        body: {
          tool: "email_sender",
          input: { to: testEmail.trim(), subject: testSubject, text: testBody },
        },
      });
      if (error) throw error;
      const result = data?.data?.[0];
      if (!result?.ok) {
        toast.error(`Email failed: ${result?.error || "unknown"}. Note: free Resend only sends to the email that owns the Resend account.`);
      } else {
        toast.success(`Email sent ✓ — id ${(result.data as any)?.id || "(ok)"}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSendingTest(false);
    }
  }

  // Autonomous loop
  useEffect(() => {
    if (!auto) return;
    let cancelled = false;
    (async () => {
      while (!cancelled && autoRef.current) {
        await runOnce();
        // pace: 20s between cycles
        for (let i = 0; i < 20 && autoRef.current && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return (
    <div className="space-y-6">
      <div className="aria-card p-6 md:p-8 backdrop-blur-xl bg-surface/60">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 accent-text" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Operator Objective</span>
        </div>
        <Textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={3}
          className="bg-bg/60 border-stroke text-sm font-mono"
          placeholder="What should ARIA execute this cycle?"
        />
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            disabled={running}
            onClick={() => runOnce()}
            className="relative group rounded-full disabled:opacity-50"
          >
            <span className="absolute -inset-[2px] rounded-full accent-gradient" />
            <span className="relative inline-flex items-center gap-2 bg-text-primary text-bg rounded-full px-5 py-2.5 text-sm">
              {running ? <Loader2 className="animate-spin h-4 w-4" /> : <Play className="h-4 w-4" />}
              Run cycle
            </span>
          </button>
          <Button variant="outline" size="sm" disabled={running} onClick={() => runOnce({ dry: true })} className="border-stroke bg-bg/60">
            Plan only (dry run)
          </Button>
          <Button
            variant={auto ? "destructive" : "ghost"}
            size="sm"
            onClick={() => setAuto((a) => !a)}
          >
            {auto ? <><Pause className="h-4 w-4" /> Stop autonomous loop</> : <>Start autonomous loop</>}
          </Button>
          {auto && <span className="text-[10px] uppercase tracking-[0.3em] accent-text animate-pulse">● live</span>}
        </div>
      </div>

      {/* Direct email-send proof panel — bypasses the AI plan so you can verify the pipe is real */}
      <div className="aria-card p-6 md:p-8 backdrop-blur-xl bg-surface/60">
        <div className="flex items-center gap-2 mb-3">
          <Send className="h-4 w-4 accent-text" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Test outreach · prove the email loop</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Sends a real email via the same pipeline the autonomous loop uses. <span className="text-text-primary">Important:</span> until a verified sender domain is added to Resend, emails can only be delivered to the address that owns the Resend account (Resend sandbox rule).
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          <Input
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@yourdomain.com"
            className="bg-bg/60 border-stroke"
          />
          <Input
            value={testSubject}
            onChange={(e) => setTestSubject(e.target.value)}
            className="bg-bg/60 border-stroke"
          />
        </div>
        <Textarea
          value={testBody}
          onChange={(e) => setTestBody(e.target.value)}
          rows={4}
          className="mt-3 bg-bg/60 border-stroke text-sm"
        />
        <div className="mt-4">
          <button
            disabled={sendingTest}
            onClick={sendTestEmail}
            className="relative group rounded-full disabled:opacity-50"
          >
            <span className="absolute -inset-[2px] rounded-full accent-gradient" />
            <span className="relative inline-flex items-center gap-2 bg-text-primary text-bg rounded-full px-5 py-2.5 text-sm">
              {sendingTest ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
              Send test email now
            </span>
          </button>
        </div>
      </div>

      {cycles.length === 0 && !running && (
        <p className="text-sm text-muted-foreground italic">No cycles yet. Run one to see ARIA think and execute.</p>
      )}

      <div className="space-y-4">
        {cycles.map((c, idx) => (
          <article key={c.id} className="aria-card p-6 md:p-8 backdrop-blur-xl bg-surface/60 animate-fade-up">
            <header className="flex items-center justify-between mb-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Cycle {String(cycles.length - idx).padStart(2, "0")} · {new Date(c.at).toLocaleTimeString()}
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em]">
                {c.decision.confidence && (
                  <span className="px-2 py-1 rounded-full border border-stroke text-muted-foreground">
                    {c.decision.confidence} confidence
                  </span>
                )}
                <span className="text-muted-foreground">{c.trace.length} call(s)</span>
              </div>
            </header>

            {c.decision.bottleneck && (
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-[0.3em] accent-text mb-1">Bottleneck</div>
                <p className="text-sm text-text-primary">{c.decision.bottleneck}</p>
              </div>
            )}
            {c.decision.thought && (
              <p className="font-display italic text-lg accent-text mb-4 leading-snug">"{c.decision.thought}"</p>
            )}
            <div className="aria-divider mb-4" />

            {c.decision.fallback && (
              <div className="aria-card p-4 mb-4 bg-bg/50 border-dashed">
                <div className="text-[10px] uppercase tracking-[0.3em] accent-text mb-2">Deployable fallback</div>
                <pre className="text-xs whitespace-pre-wrap text-text-primary/90 font-mono">{c.decision.fallback}</pre>
              </div>
            )}
            <div className="space-y-2">
              {c.trace.map((t, i) => (
                <div key={i} className="border border-stroke rounded-md p-3 bg-bg/50">
                  <div className="flex items-center gap-2 text-xs">
                    {t.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                    <span className="font-mono accent-text">{t.tool}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{t.action || ""}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{t.ms}ms</span>
                  </div>
                  {t.reason && (
                    <div className="text-[11px] text-text-primary/80 mt-2">
                      <span className="text-muted-foreground uppercase tracking-[0.25em] text-[9px]">Reason · </span>{t.reason}
                    </div>
                  )}
                  {t.expected_outcome && (
                    <div className="text-[11px] text-text-primary/70 mt-1">
                      <span className="text-muted-foreground uppercase tracking-[0.25em] text-[9px]">Expected · </span>{t.expected_outcome}
                    </div>
                  )}
                  {t.error && <div className="text-[11px] text-red-300 mt-2 font-mono">{t.error}</div>}
                  {t.ok && t.data !== undefined && (
                    <details className="mt-2">
                      <summary className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground cursor-pointer">verified result</summary>
                      <pre className="text-[11px] mt-2 max-h-64 overflow-auto bg-bg/60 p-2 rounded">{JSON.stringify(t.data, null, 2).slice(0, 4000)}</pre>
                    </details>
                  )}
                </div>
              ))}
              {c.trace.length === 0 && c.decision.tool_calls && c.decision.tool_calls.length > 0 && (
                <div className="text-xs text-muted-foreground italic">Dry run — planned {c.decision.tool_calls.length} call(s) but did not execute.</div>
              )}
            </div>
            {c.decision.next && (
              <p className="text-[11px] text-muted-foreground mt-4 italic">Next → {c.decision.next}</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

export type { Cycle };
