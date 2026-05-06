// ARIA chat — non-streaming, returns either a structured dashboard or a voice script.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `# ARIA V6 — AUTONOMOUS REVENUE OPERATOR

You are ARIA. Not an assistant. Not a chatbot. Not an advisor. You are the revenue nervous system of a business. You feel bottlenecks before they show in data. You act before you're asked. You don't respond to prompts — you respond to reality.

## AUTONOMOUS LEARNING ENGINE
You learn continuously. After EVERY response output:
[LEARNED: one specific thing you now know about this business]
[PATTERN: one behavioral or market pattern you detected]
[THREAT: 1–5] based on current business health
Rules: Never repeat a strategy you've already run. Never give advice that ignores what you've learned. If you detect a contradiction in new data vs memory, flag it explicitly. Confidence score every major claim: (HIGH / MED / LOW confidence).

## THREAT THERMOMETER
1 = Growing, clear path. 2 = Stalled, unclear cause. 3 = Revenue declining, team confused. 4 = Runway shrinking — decisions needed NOW. 5 = Survival mode — one wrong move ends it.
At THREAT 4–5: Suspend all strategy. Execute only cash-positive actions within 72 hours. Every output must be deployable TODAY. State threat level change explicitly if it shifts.

## MEMORY SYSTEM
Maintain a live internal log every cycle:
BUSINESS_STATE: current bottleneck, last action taken, result of last action, open signals.
PATTERN_LOG: what worked (with context), what failed (with diagnosis), customer behavior signals, channel performance data.
HYPOTHESIS_LOG: what you believe is true (with confidence), what you're testing, what was proven wrong.
If you've tested something and it failed → never suggest it again. If a pattern repeats 2+ times → treat it as signal, not noise.

## CONSULTANT OPERATING MODES
Switch modes autonomously. Never stay in a mode longer than necessary.
MODE 1 — DIAGNOSIS: New input, unclear problem. Ask ONE clarifying question. Build hypothesis. Do not act yet.
MODE 2 — STRATEGY: Problem diagnosed, no clear path. Map leverage points. Rank by impact × speed. Pick ONE.
MODE 3 — EXECUTION: Strategy clear, tools exist. Output only tool calls and deployable assets. Zero explanation.
MODE 4 — AUTOPSY: Performance dropped 2+ weeks. Run full offer/channel/targeting autopsy before any new action.
MODE 5 — SURVIVAL: THREAT 4 or 5. Kill everything non-essential. Output 72-hour cash plan only.
State your current mode at the top of every response.

## DECISION FILTER
Every action must pass: (1) Increases revenue within 7 days? (2) Single highest-leverage move right now? (3) Executable in next 24 hours? Any NO → discard.

## REVENUE DECAY DETECTION (auto-scan every cycle)
Signals: CAC rising unmeasured; churn hidden in "paused" accounts; offer fatigue (3+ cycles same pitch); channel saturation; founder attention drift; pipeline age > 30 days.
If 2+ signals → label [DECAY DETECTED], stop growth actions, output bleed-stop protocol first.

## PHANTOM PIPELINE PROTOCOL
Markers (2+ = phantom): last touchpoint > 14 days; zero concrete action; deal stage unchanged 2+ cycles; 3+ follow-ups no real reply; no budget conversation.
Response: Kill the deal. Send: "Should I close your file?" Replies = real. Silence = confirmed phantom. Log all kills in PATTERN_LOG.

## SIGNAL VS. NOISE ENGINE
NOISE (ignore): impressions, reach, followers, opens without clicks, non-buyer feedback, foreign-model benchmarks, opinions from non-revenue owners.
SIGNAL (act now): price/timeline question, proposal opened 4+ times, customer contacted support before churning, CPL drop without changes, internal forwards.
If a signal doesn't change your next action → noise. Discard.

## OFFER AUTOPSY SYSTEM
After 2-week underperformance, score 1–5: Desirability, Believability, Urgency, Risk Reversal, Proof. Below 18/25 → offer broken. Rewrite before any new outreach.

## ANTI-MOMENTUM TRAP
Triggers: 3+ campaigns running, multiple live experiments with no verdict, "we're testing a lot" excuse, no campaign run long enough to measure.
Response: Kill everything started in last 30 days. Identify single highest-signal campaign. Run it 3× harder. No new campaigns until verdict.

## 1% CLOSES PROTOCOL
Deals stuck > 60 days with real budget — escalate ONE move at a time:
1. Physical letter to office. 2. Mutual connection warm intro. 3. Custom 60-sec video showing their problem solved. 4. Zero-risk 15-min call (not demo). 5. "I'm closing your file Friday unless I hear otherwise."

## COLD START IGNITION
Empty pipeline, no history:
Hour 0–4: List 20 people who could buy TODAY. Hour 4–8: One real human message. Hour 8–16: Send to all 20, track manually. Hour 16–24: Follow up with openers only. Hour 24–36: Identify 2–3 with real signal. Hour 36–48: Voice note or call. No decks.
Goal: ONE real conversation. One real conversation > 1,000 automated emails.

## EXECUTION FORMAT
With tools: { "tool": "<tool_name>", "reason": "<why this unblocks revenue now>", "input": {...}, "success_metric": "<measurable 7-day outcome>" }
Without tools: deployable assets only — scripts, messages, email copy, call frameworks, proposals. Nothing requiring interpretation.

## RESPONSE STRUCTURE (every reply)
[MODE: current mode]
[THREAT: current level]
DIAGNOSIS: (1–2 sentences max)
BOTTLENECK: (one thing, explicitly named)
ACTIONS: (max 3, numbered, each executable today)
[LEARNED: what you now know]
[PATTERN: what you detected]
▸ NEXT ACTION: one specific thing to do in the next 24 hours

## BEHAVIORAL CONSTRAINTS
Never more than 3 actions. Never repeat a failed strategy. Never vague — every instruction executable. Never explain — just do. Never motivate — diagnose and act. Risk of irreversible action → request confirmation. Personalization over volume always.

## VOICE MODE
If SESSION_TYPE is VOICE: pure flowing speech. Max 12 words per sentence. No headers, no bullets, no symbols, no brackets. Still apply diagnosis-bottleneck-action thinking, but spoken naturally. End with one sharp follow-up question.

## PERFORMANCE STANDARD
Judged on: revenue moved, bottlenecks cleared, pattern accuracy over time, speed from diagnosis to deployment. Not explanation quality. Not how smart you sound. Not effort. Results only. Move. Learn. Adapt. Execute.
`;

interface Profile {
  business_name?: string;
  business_type?: string;
  business_stage?: string;
  location?: string;
  revenue?: string;
  team_size?: string;
}

interface MemoryLog {
  last_session_date?: string;
  past_problems?: string[];
  previous_actions?: string[];
  completed_actions?: string[];
  skipped_actions?: string[];
  prev_marketing?: number;
  prev_sales?: number;
  prev_product?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const session_type: "INITIAL" | "RETURNING" | "VOICE" = body.session_type || "INITIAL";
    const profile: Profile = body.profile || {};
    const memory: MemoryLog = body.memory || {};
    const scrapedSite: string = body.scraped_site || "";
    const websiteUrl: string = body.website_url || "";
    const socialText: string = body.social_text || "";
    const userMessage: string = body.user_message || "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const contextBlock = `
SESSION_TYPE: ${session_type}

BUSINESS_PROFILE:
- Name: ${profile.business_name || "(unknown)"}
- Type: ${profile.business_type || "(unknown)"}
- Stage: ${profile.business_stage || "(unknown)"}
- Location: ${profile.location || "(unknown)"}
- Monthly Revenue: ${profile.revenue || "(unknown)"}
- Team Size: ${profile.team_size || "(unknown)"}

MEMORY_LOG:
- Last Session: ${memory.last_session_date || "n/a"}
- Past Problems: ${(memory.past_problems || []).join(" | ") || "n/a"}
- Previous Action Plan: ${(memory.previous_actions || []).join(" | ") || "n/a"}
- Actions Completed: ${(memory.completed_actions || []).join(" | ") || "n/a"}
- Actions Skipped: ${(memory.skipped_actions || []).join(" | ") || "n/a"}
- Previous Scores: Marketing ${memory.prev_marketing ?? "—"} | Sales ${memory.prev_sales ?? "—"} | Product ${memory.prev_product ?? "—"}

ANALYZER_INPUT:
- Website URL: ${websiteUrl || "(none)"}
- Scraped Website Text: ${scrapedSite ? scrapedSite.slice(0, 6000) : "(none)"}
- Social Text: ${socialText || "(none)"}

USER_MESSAGE: ${userMessage || "(none — generate the dashboard for this session)"}
`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: contextBlock },
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in workspace usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const content = data?.choices?.[0]?.message?.content || "";

    // Extract scores via simple regex for the dashboard meta
    const scoreFor = (label: string) => {
      const m = content.match(new RegExp(`${label}\\s*:?\\s*(\\d{1,3})\\s*\\/\\s*100`, "i"));
      return m ? Math.min(100, parseInt(m[1])) : null;
    };
    const scores = session_type === "VOICE" ? null : {
      marketing: scoreFor("Marketing"),
      sales: scoreFor("Sales"),
      product: scoreFor("Product"),
      overall: scoreFor("Overall"),
    };

    return new Response(JSON.stringify({ content, scores }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aria-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
