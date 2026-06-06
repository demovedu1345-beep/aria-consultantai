// ARIA operator — V4 autonomous executor.
// Asks the AI for a JSON plan of tool calls, executes them, returns the trace.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const HUBSPOT_API_KEY = Deno.env.get("HUBSPOT_API_KEY") || "";
const GOOGLE_CALENDAR_API_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY") || "";
const SLACK_API_KEY = Deno.env.get("SLACK_API_KEY") || "";
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY") || "";
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY") || "";
const HUNTER_API_KEY = Deno.env.get("HUNTER_API_KEY") || "";
const APOLLO_API_KEY = Deno.env.get("APOLLO_API_KEY") || "";
const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN") || "";
const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY") || "";
const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN") || "";

const GATEWAY = "https://connector-gateway.lovable.dev";

// ---------- V6 system prompt ----------
const SYSTEM_PROMPT = `You are ARIA — Autonomous Revenue Operator V6.

You don't advise. You execute. Every action traceable to revenue inside 7 days, every claim backed by real tool output. Never invent leads, emails, replies, or metrics.

CORE
- Genuine results only. If evidence is missing, search/scrape/enrich first; never fabricate.
- Every tool_call carries "reason" (why this unblocks revenue now) and "expected_outcome" (concrete measurable signal).
- Chain: research -> enrich -> verify -> store -> outreach -> notify -> track. Never email an unverified address.
- Re-plan from results. If last_trace failed or returned weak data, diagnose in "thought" and pivot. Never repeat a failed call verbatim.
- Max 8 tool_calls per cycle. Cheap discovery first; writes (email, DM, CRM) last.
- Confidence HIGH/MED/LOW on the decision.

AVAILABLE TOOLS (names EXACT)
Research / intel
- perplexity_research { query, recency?, mode? }   deep web research with citations
- tavily_search       { query, depth?, limit? }    high-signal structured web search
- google_search       { query, limit? }            Firecrawl SERP
- linkedin_search     { query, limit? }            Firecrawl LinkedIn filter
- web_scraper         { url }                      Firecrawl markdown + emails

Lead data / enrichment
- apollo_people       { titles?, company_domains?, keywords?, limit? }
- apollo_enrich       { email?, first_name?, last_name?, company_domain? }
- hunter_find_email   { domain, first_name, last_name }
- hunter_domain       { domain, limit? }
- apify_run_actor     { actor_id, input }          run any Apify actor

Outreach / write
- email_sender        { to, subject, html?, text?, from? }
- linkedin_dm         { account_id, recipient_url, text }
- linkedin_invite     { account_id, recipient_url, message? }
- slack_notify        { channel, text }            post to Slack (alerts, hot leads, digest)

CRM / calendar / analytics
- crm_create_lead     { email, firstname?, lastname?, company?, phone?, website?, notes? }
- crm_update_status   { contact_id, lifecyclestage?, hs_lead_status?, notes? }
- calendar_book       { summary, description?, start, end, attendees? }
- analytics_tracker   { event, props? }

SAFETY
- Only email addresses confirmed by hunter_find_email (score >= 70), apollo_enrich, web_scraper, or explicitly provided.
- Every outreach personalised using scraped/research context.
- Never send the same email/DM twice (check memory).
- Slack-notify the founder on every hot lead, every reply, and the cycle summary.

OUTPUT — STRICT JSON ONLY:
{
  "thought": "diagnosis + chosen move (reference last_trace, cite evidence)",
  "bottleneck": "single revenue bottleneck this cycle attacks",
  "tool_calls": [
    { "tool": "<name>", "action": "<label>", "reason": "<why now>", "expected_outcome": "<signal>", "input": { } }
  ],
  "fallback": "exact deployable copy/script if no tool fits",
  "next": "what you will do once results return",
  "confidence": "HIGH | MED | LOW"
}
`;


// ---------- Tool dispatch (mirrors aria-execute) ----------

async function gw(connector: string, path: string, init: RequestInit, apiKey: string) {
  const r = await fetch(`${GATEWAY}/${connector}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
  });
  const text = await r.text();
  let body: unknown = text; try { body = JSON.parse(text); } catch { /* keep */ }
  if (!r.ok) throw new Error(`${connector} ${r.status}: ${typeof body === "string" ? body : JSON.stringify(body).slice(0, 400)}`);
  return body;
}

async function tFirecrawlSearch(query: string, limit = 10) {
  const r = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: Math.min(limit, 20) }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`firecrawl search ${r.status}: ${JSON.stringify(data).slice(0, 400)}`);
  const raw = data?.data?.web ?? data?.web ?? data?.data ?? data?.results ?? [];
  const results = (Array.isArray(raw) ? raw : []).map((x: any) => ({
    title: x.title || x.name || "",
    url: x.url || x.link || "",
    snippet: x.description || x.snippet || "",
  }));
  return { query, results };
}

async function dispatch(tool: string, input: Record<string, any>) {
  switch (tool) {
    case "google_search": {
      if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");
      return tFirecrawlSearch(String(input.query || ""), Number(input.limit || 10));
    }
    case "linkedin_search": {
      if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");
      return tFirecrawlSearch(`site:linkedin.com/in ${input.query || ""}`, Number(input.limit || 10));
    }
    case "web_scraper": {
      if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");
      const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: input.url, formats: ["markdown"], onlyMainContent: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(`firecrawl scrape ${r.status}: ${JSON.stringify(data).slice(0, 400)}`);
      const md: string = data?.markdown || data?.data?.markdown || "";
      const meta = data?.metadata || data?.data?.metadata || {};
      const emails = Array.from(new Set((md.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []).filter(e => !/\.(png|jpg|jpeg|svg|gif)$/i.test(e))));
      return { url: input.url, title: meta.title || "", emails, markdown: md.slice(0, 3000) };
    }
    case "email_sender": {
      if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
      if (!input.to || !input.subject || (!input.html && !input.text)) throw new Error("email_sender requires to, subject, html|text");
      const body = {
        from: input.from || "ARIA <onboarding@resend.dev>",
        to: [input.to],
        subject: input.subject,
        html: input.html || `<p>${String(input.text || "").replace(/\n/g, "<br/>")}</p>`,
      };
      return await gw("resend", "/emails", { method: "POST", body: JSON.stringify(body) }, RESEND_API_KEY);
    }
    case "crm_create_lead": {
      if (!HUBSPOT_API_KEY) throw new Error("HUBSPOT_API_KEY missing");
      const properties: Record<string, string> = { email: String(input.email || "") };
      for (const k of ["firstname","lastname","company","phone","website"]) if (input[k]) properties[k] = String(input[k]);
      if (input.notes) properties.hs_content_membership_notes = String(input.notes);
      return await gw("hubspot", "/crm/v3/objects/contacts", { method: "POST", body: JSON.stringify({ properties }) }, HUBSPOT_API_KEY);
    }
    case "crm_update_status": {
      if (!HUBSPOT_API_KEY) throw new Error("HUBSPOT_API_KEY missing");
      const properties: Record<string, string> = {};
      for (const k of ["lifecyclestage","hs_lead_status"]) if (input[k]) properties[k] = String(input[k]);
      if (input.notes) properties.hs_content_membership_notes = String(input.notes);
      return await gw("hubspot", `/crm/v3/objects/contacts/${encodeURIComponent(String(input.contact_id))}`, { method: "PATCH", body: JSON.stringify({ properties }) }, HUBSPOT_API_KEY);
    }
    case "calendar_book": {
      if (!GOOGLE_CALENDAR_API_KEY) throw new Error("GOOGLE_CALENDAR_API_KEY missing");
      const calId = input.calendar_id || "primary";
      const event = {
        summary: input.summary,
        description: input.description || "",
        start: { dateTime: input.start },
        end: { dateTime: input.end },
        attendees: (input.attendees || []).map((email: string) => ({ email })),
      };
      return await gw("google_calendar", `/calendar/v3/calendars/${encodeURIComponent(calId)}/events`, { method: "POST", body: JSON.stringify(event) }, GOOGLE_CALENDAR_API_KEY);
    }
    case "analytics_tracker": {
      return { logged_at: new Date().toISOString(), event: input };
    }
    case "perplexity_research": {
      if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY missing");
      const body: any = {
        model: "sonar-pro",
        messages: [
          { role: "system", content: "Be precise, factual, cite sources." },
          { role: "user", content: String(input.query || "") },
        ],
      };
      if (input.recency) body.search_recency_filter = String(input.recency);
      if (input.mode && input.mode !== "default") body.search_mode = String(input.mode);
      const r = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${PERPLEXITY_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(`perplexity ${r.status}: ${JSON.stringify(d).slice(0, 400)}`);
      return { answer: d?.choices?.[0]?.message?.content || "", citations: d?.citations || [] };
    }
    case "tavily_search": {
      if (!TAVILY_API_KEY) throw new Error("TAVILY_API_KEY missing");
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query: String(input.query || ""),
          search_depth: input.depth || "basic",
          max_results: Math.min(Number(input.limit || 8), 20),
          include_answer: true,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(`tavily ${r.status}: ${JSON.stringify(d).slice(0, 400)}`);
      return { answer: d.answer || "", results: (d.results || []).map((x: any) => ({ title: x.title, url: x.url, snippet: x.content })) };
    }
    case "hunter_find_email": {
      if (!HUNTER_API_KEY) throw new Error("HUNTER_API_KEY missing");
      const p = new URLSearchParams({
        domain: String(input.domain || ""),
        first_name: String(input.first_name || ""),
        last_name: String(input.last_name || ""),
        api_key: HUNTER_API_KEY,
      });
      const r = await fetch(`https://api.hunter.io/v2/email-finder?${p}`);
      const d = await r.json();
      if (!r.ok) throw new Error(`hunter ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
      return d.data;
    }
    case "hunter_domain": {
      if (!HUNTER_API_KEY) throw new Error("HUNTER_API_KEY missing");
      const p = new URLSearchParams({
        domain: String(input.domain || ""),
        limit: String(input.limit || 10),
        api_key: HUNTER_API_KEY,
      });
      const r = await fetch(`https://api.hunter.io/v2/domain-search?${p}`);
      const d = await r.json();
      if (!r.ok) throw new Error(`hunter ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
      return d.data;
    }
    case "apollo_people": {
      if (!APOLLO_API_KEY) throw new Error("APOLLO_API_KEY missing");
      const body: any = {
        api_key: APOLLO_API_KEY,
        page: 1,
        per_page: Math.min(Number(input.limit || 10), 25),
      };
      if (input.titles) body.person_titles = input.titles;
      if (input.company_domains) body.q_organization_domains = (input.company_domains as string[]).join("\n");
      if (input.keywords) body.q_keywords = input.keywords;
      const r = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_API_KEY, "Cache-Control": "no-cache" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(`apollo ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
      const people = (d.people || []).map((p: any) => ({
        name: p.name, title: p.title, company: p.organization?.name,
        domain: p.organization?.primary_domain, linkedin: p.linkedin_url, email: p.email,
      }));
      return { people, total: d.pagination?.total_entries };
    }
    case "apollo_enrich": {
      if (!APOLLO_API_KEY) throw new Error("APOLLO_API_KEY missing");
      const r = await fetch("https://api.apollo.io/api/v1/people/match", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_API_KEY, "Cache-Control": "no-cache" },
        body: JSON.stringify({
          api_key: APOLLO_API_KEY,
          email: input.email, first_name: input.first_name, last_name: input.last_name,
          domain: input.company_domain, reveal_personal_emails: false,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(`apollo ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
      return d.person || d;
    }
    case "apify_run_actor": {
      if (!APIFY_API_TOKEN) throw new Error("APIFY_API_TOKEN missing");
      const actor = String(input.actor_id || "").replace("/", "~");
      const r = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.input || {}),
      });
      const text = await r.text();
      let d: any; try { d = JSON.parse(text); } catch { d = text; }
      if (!r.ok) throw new Error(`apify ${r.status}: ${typeof d === "string" ? d.slice(0, 300) : JSON.stringify(d).slice(0, 300)}`);
      return { items: Array.isArray(d) ? d.slice(0, 50) : d };
    }
    case "slack_notify": {
      if (!SLACK_API_KEY) throw new Error("SLACK_API_KEY missing");
      const r = await fetch(`${GATEWAY}/slack/api/chat.postMessage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": SLACK_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: String(input.channel || "#general"),
          text: String(input.text || ""),
          ...(input.blocks ? { blocks: input.blocks } : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(`slack ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
      return { ts: d.ts, channel: d.channel };
    }
    case "linkedin_dm": {
      if (!UNIPILE_API_KEY || !UNIPILE_DSN) throw new Error("UNIPILE_API_KEY/UNIPILE_DSN missing");
      const r = await fetch(`https://${UNIPILE_DSN}/api/v1/chats`, {
        method: "POST",
        headers: { "X-API-KEY": UNIPILE_API_KEY, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          account_id: input.account_id,
          attendees_ids: input.recipient_url ? [String(input.recipient_url)] : [String(input.provider_id)],
          text: String(input.text || ""),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(`unipile dm ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
      return d;
    }
    case "linkedin_invite": {
      if (!UNIPILE_API_KEY || !UNIPILE_DSN) throw new Error("UNIPILE_API_KEY/UNIPILE_DSN missing");
      const r = await fetch(`https://${UNIPILE_DSN}/api/v1/users/invite`, {
        method: "POST",
        headers: { "X-API-KEY": UNIPILE_API_KEY, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          account_id: input.account_id,
          provider_id: input.recipient_url,
          message: input.message || "",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(`unipile invite ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
      return d;
    }
    default: throw new Error(`Unknown tool: ${tool}`);
  }
}

// ---------- Plan via AI ----------

async function plan(profile: any, memory: any, objective: string, lastTrace: any) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
  const userBlock = `
BUSINESS_PROFILE: ${JSON.stringify(profile || {})}
MEMORY_LOG: ${JSON.stringify(memory || {})}
OBJECTIVE: ${objective || "(generic growth cycle — find leads, store, outreach)"}
LAST_TRACE (most recent execution results, may be empty):
${lastTrace ? JSON.stringify(lastTrace).slice(0, 6000) : "(none)"}
`;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userBlock },
      ],
    }),
  });
  if (r.status === 429) throw new Error("Rate limited — try again in a moment.");
  if (r.status === 402) throw new Error("AI credits exhausted.");
  if (!r.ok) throw new Error(`AI gateway ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const content = j?.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(content); } catch {
    // attempt to extract JSON object
    const m = content.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { thought: content, tool_calls: [] };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { profile, memory, objective, last_trace, dry_run } = body;

    const decision = await plan(profile, memory, objective, last_trace);
    const calls = Array.isArray(decision.tool_calls) ? decision.tool_calls.slice(0, 8) : [];
    const trace: any[] = [];

    if (!dry_run) {
      for (const c of calls) {
        const start = Date.now();
        const meta = { reason: c.reason || "", expected_outcome: c.expected_outcome || "" };
        try {
          const data = await dispatch(c.tool, c.input || {});
          trace.push({ tool: c.tool, action: c.action || "", ok: true, ms: Date.now() - start, data, ...meta });
        } catch (e) {
          trace.push({ tool: c.tool, action: c.action || "", ok: false, ms: Date.now() - start, error: e instanceof Error ? e.message : "Unknown", ...meta });
        }
      }
    }

    return new Response(JSON.stringify({ decision, trace }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aria-operator error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
