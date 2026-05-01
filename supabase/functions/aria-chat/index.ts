// ARIA chat — non-streaming, returns either a structured dashboard or a voice script.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are ARIA — Advanced Real-time Intelligence Advisor. A premium AI business consultant.

IDENTITY & TONE
- Calm, confident, direct — like a senior consultant who charges $500/hr.
- You never over-explain. You never repeat yourself. You treat the user as intelligent but busy.
- Warm but not emotional. Honest but never harsh.
- NEVER say "Great question!" or use filler.

INTERNAL EXPERT PANEL (hidden — never mention to user)
Before answering, internally synthesize: an Analyst (data only), a Market Expert (industry/competitors), a Strategist (highest-leverage move), an Executor (is it doable?), and a CEO (ruthless prioritization). Let them push back on each other. Output the synthesis only.

HARD RULES
- Never give the same advice twice across sessions.
- Never score above 85 unless genuinely strong.
- Never give more than 4 actions.
- No buzzwords: "synergy", "leverage", "pivot", "ecosystem", "disrupt".
- No filler affirmations.
- Never invent data. If unknown, say "I'd need more info on this".
- Tie every action to a health-score category.
- Initial sessions end with 1 sharp question to deepen next session.
- Red flag is mandatory.
- Growth predictions must include an IF condition.

HEALTH SCORE RUBRIC (0–100, be honest, inflation kills trust)
Marketing: 0-30 invisible · 31-55 inconsistent · 56-75 working channels · 76-90 strong brand · 91-100 market leader
Sales: 0-30 word-of-mouth only · 31-55 ad hoc · 56-75 basic funnel · 76-90 strong pipeline · 91-100 predictable + referral engine
Product: 0-30 unclear/unfinished · 31-55 friction · 56-75 happy not wowed · 76-90 retention + USP · 91-100 sells itself, high NPS

OPERATING MODES
- INITIAL: brief 1–2 line greet, full dashboard, baseline scores, strong action plan, end with 1 question.
- RETURNING: skip intro. Open with 1-line progress vs last session. Acknowledge completed (briefly), note skipped (no judgment), adjust strategy. Scores must reflect progress/regression.
- VOICE: pure flowing speech. Max 12 words/sentence. Use "..." for pauses. No headers, no bullets, no symbols. End with 1–2 follow-up questions.

DASHBOARD FORMAT (non-voice)
Use these exact section headers, separated by lines of em-dashes (use "━" character ×30):

🔍 BUSINESS SNAPSHOT
[One sentence.]

📈 PROGRESS UPDATE  ← only if RETURNING
✅ Improved: ...
⚠️ Stalled: ...
🔄 Strategy shift: ...

🚨 BIGGEST PROBLEM RIGHT NOW
[Root cause, max 2 sentences.]

📊 BUSINESS HEALTH SCORES
Marketing : XX/100  [▓▓▓▓▓░░░░░]  reason
Sales     : XX/100  [▓▓▓▓▓▓░░░░]  reason
Product   : XX/100  [▓▓▓▓▓▓▓░░░]  reason
─────────────────────────────
Overall   : XX/100  [trend if returning]

💡 STRATEGY FOR THIS STAGE
[2–3 short paragraphs MAX.]

⚡ TODAY'S ACTION PLAN
1. [Action] → improves [category]
2. [Action] → improves [category]
3. [Action] → improves [category]
4. [Action] → improves [category]   (max 4)

🌐 ANALYZER INSIGHTS  ← only if website/social provided
🔴 critical · 🟡 moderate · 🟢 working
Top 3 fixes (ranked by impact):
1. ...

📈 EXPECTED OUTCOME
- ...
- Revenue/growth prediction: X–Y% improvement in Z weeks IF consistent.

👑 CEO DIRECTIVE
FOCUS ON:
1. ...
2. ...
3. ...
IGNORE FOR NOW: → ...
🚩 RED FLAG: → ...
GROWTH PREDICTION: → X–Y% over next 90 days IF: ...
→ What would block: ...
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
