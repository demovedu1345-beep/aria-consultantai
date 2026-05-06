import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AriaState, BusinessProfile, buildMemory } from "@/lib/aria-store";
import { Loader2, Play, Pause, Zap, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

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

export function Operator({ profile, state, onTrace }: Props) {
  const [objective, setObjective] = useState(PRESET);
  const [running, setRunning] = useState(false);
  const [auto, setAuto] = useState(false);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const autoRef = useRef(auto);
  autoRef.current = auto;

  async function runOnce(opts: { dry?: boolean } = {}) {
    if (running) return;
    setRunning(true);
    try {
      const last = cycles[0];
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
      <Card className="p-5 bg-card/50 border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-accent" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Operator Objective</span>
        </div>
        <Textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={3}
          className="bg-background/60 border-border/60 text-sm font-mono"
          placeholder="What should ARIA execute this cycle?"
        />
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Button variant="accent" size="sm" disabled={running} onClick={() => runOnce()}>
            {running ? <Loader2 className="animate-spin h-4 w-4" /> : <Play className="h-4 w-4" />}
            Run cycle
          </Button>
          <Button variant="outline" size="sm" disabled={running} onClick={() => runOnce({ dry: true })}>
            Plan only (dry run)
          </Button>
          <Button
            variant={auto ? "destructive" : "ghost"}
            size="sm"
            onClick={() => setAuto((a) => !a)}
          >
            {auto ? <><Pause className="h-4 w-4" /> Stop autonomous loop</> : <>Start autonomous loop</>}
          </Button>
          {auto && <span className="text-[10px] uppercase tracking-[0.3em] text-accent animate-pulse">● live</span>}
        </div>
      </Card>

      {cycles.length === 0 && !running && (
        <p className="text-sm text-muted-foreground italic">No cycles yet. Run one to see ARIA think and execute.</p>
      )}

      <div className="space-y-4">
        {cycles.map((c, idx) => (
          <Card key={c.id} className="p-5 bg-card/40 border-border/60">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Cycle {String(cycles.length - idx).padStart(2, "0")} · {new Date(c.at).toLocaleTimeString()}
              </div>
              <div className="text-[10px] text-muted-foreground">{c.trace.length} tool call(s)</div>
            </div>
            {c.decision.thought && (
              <p className="font-display italic text-lg text-accent/90 mb-3 leading-snug">"{c.decision.thought}"</p>
            )}
            {c.decision.fallback && (
              <Card className="p-3 mb-3 bg-background/60 border-dashed border-accent/40">
                <div className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2">Fallback</div>
                <pre className="text-xs whitespace-pre-wrap text-foreground/90">{c.decision.fallback}</pre>
              </Card>
            )}
            <div className="space-y-2">
              {c.trace.map((t, i) => (
                <div key={i} className="border border-border/40 rounded-md p-3 bg-background/40">
                  <div className="flex items-center gap-2 text-xs">
                    {t.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                    <span className="font-mono text-accent">{t.tool}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{t.action || ""}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{t.ms}ms</span>
                  </div>
                  {t.error && <div className="text-[11px] text-red-300 mt-2 font-mono">{t.error}</div>}
                  {t.ok && t.data !== undefined && (
                    <details className="mt-2">
                      <summary className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground cursor-pointer">result</summary>
                      <pre className="text-[11px] mt-2 max-h-64 overflow-auto bg-background/60 p-2 rounded">{JSON.stringify(t.data, null, 2).slice(0, 4000)}</pre>
                    </details>
                  )}
                </div>
              ))}
              {c.trace.length === 0 && c.decision.tool_calls && c.decision.tool_calls.length > 0 && (
                <div className="text-xs text-muted-foreground italic">Dry run — planned {c.decision.tool_calls.length} call(s) but did not execute.</div>
              )}
            </div>
            {c.decision.next && (
              <p className="text-[11px] text-muted-foreground mt-3 italic">Next → {c.decision.next}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

export type { Cycle };
