// ARIA executor — dispatches autonomous tool calls to real APIs.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY } });
    if (!r.ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return null;
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}


const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const HUBSPOT_API_KEY = Deno.env.get("HUBSPOT_API_KEY") || "";
const GOOGLE_CALENDAR_API_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY") || "";
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY") || "";
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY") || "";
const HUNTER_API_KEY = Deno.env.get("HUNTER_API_KEY") || "";
const APOLLO_API_KEY = Deno.env.get("APOLLO_API_KEY") || "";
const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN") || "";

const GATEWAY = "https://connector-gateway.lovable.dev";

function ok(data: unknown, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: true, ...extra, data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function err(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: false, error: message, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function gw(connector: string, path: string, init: RequestInit, apiKey: string) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
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
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  if (!r.ok) {
    console.error(`${connector} ${r.status}:`, body);
    throw new Error(`Upstream ${connector} request failed`);
  }
  return body;
}

function hasPlaceholder(value: unknown): boolean {
  if (typeof value === "string") return /\b(tbd|placeholder|example value|fill me)\b/i.test(value);
  if (Array.isArray(value)) return value.some(hasPlaceholder);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasPlaceholder);
  return false;
}

// ---------- Tool implementations ----------

async function tGoogleSearch(input: { query: string; limit?: number }) {
  if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");
  const r = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: input.query, limit: Math.min(input.limit ?? 10, 20) }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`firecrawl search ${r.status}: ${JSON.stringify(data)}`);
  // Normalize results
  const raw = data?.data?.web ?? data?.web ?? data?.data ?? data?.results ?? [];
  const results = (Array.isArray(raw) ? raw : []).map((x: any) => ({
    title: x.title || x.name || "",
    url: x.url || x.link || "",
    snippet: x.description || x.snippet || "",
  }));
  return { query: input.query, results };
}

async function tLinkedinSearch(input: { query: string; limit?: number }) {
  // LinkedIn via Firecrawl search with site filter
  return tGoogleSearch({ query: `site:linkedin.com/in ${input.query}`, limit: input.limit });
}

async function tWebScraper(input: { url: string }) {
  if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: input.url, formats: ["markdown"], onlyMainContent: true }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`firecrawl scrape ${r.status}: ${JSON.stringify(data)}`);
  const md: string = data?.markdown || data?.data?.markdown || "";
  const meta = data?.metadata || data?.data?.metadata || {};
  // Extract emails
  const emails = Array.from(new Set((md.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []).filter(e => !e.endsWith(".png") && !e.endsWith(".jpg"))));
  return { url: input.url, title: meta.title || "", emails, markdown: md.slice(0, 4000) };
}

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;
const ALLOWED_FROM_DOMAINS = ["resend.dev"]; // extend with your verified Resend domains
const MAX_EMAIL_LEN = 254;
const MAX_SUBJECT_LEN = 200;
const MAX_BODY_LEN = 20_000;

function sanitizeHtml(input: string): string {
  // strip scripts, iframes, event handlers, and javascript: URLs
  return input
    .replace(/<\s*(script|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|link|meta)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

async function tEmailSender(input: { to: string; subject: string; html?: string; text?: string; from?: string }) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
  if (!input.to || !input.subject || (!input.html && !input.text)) {
    throw new Error("email_sender requires to, subject, and html or text");
  }
  const to = String(input.to).trim();
  if (to.length > MAX_EMAIL_LEN || !EMAIL_RE.test(to)) throw new Error("Invalid recipient email");
  const subject = String(input.subject).slice(0, MAX_SUBJECT_LEN);
  const rawHtml = input.html ? String(input.html).slice(0, MAX_BODY_LEN) : "";
  const rawText = input.text ? String(input.text).slice(0, MAX_BODY_LEN) : "";

  // Restrict sender to allowlisted domains; fall back to safe default
  let from = "ARIA <onboarding@resend.dev>";
  if (input.from) {
    const m = String(input.from).match(/<([^>]+)>|([^\s<>]+@[^\s<>]+)/);
    const addr = (m?.[1] || m?.[2] || "").toLowerCase();
    const domain = addr.split("@")[1] || "";
    if (EMAIL_RE.test(addr) && ALLOWED_FROM_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))) {
      from = input.from;
    }
  }

  const body = {
    from,
    to: [to],
    subject,
    html: rawHtml ? sanitizeHtml(rawHtml) : `<p>${rawText.replace(/[<>]/g, "").replace(/\n/g, "<br/>")}</p>`,
  };
  const data = await gw("resend", "/emails", { method: "POST", body: JSON.stringify(body) }, RESEND_API_KEY);
  return data;
}

async function tCrmCreateLead(input: { email: string; firstname?: string; lastname?: string; company?: string; phone?: string; website?: string; notes?: string }) {
  if (!HUBSPOT_API_KEY) throw new Error("HUBSPOT_API_KEY missing");
  const properties: Record<string, string> = { email: input.email };
  if (input.firstname) properties.firstname = input.firstname;
  if (input.lastname) properties.lastname = input.lastname;
  if (input.company) properties.company = input.company;
  if (input.phone) properties.phone = input.phone;
  if (input.website) properties.website = input.website;
  if (input.notes) properties.hs_content_membership_notes = input.notes;
  const data = await gw("hubspot", "/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties }),
  }, HUBSPOT_API_KEY);
  return data;
}

async function tCrmUpdateStatus(input: { contact_id: string; lifecyclestage?: string; hs_lead_status?: string; notes?: string }) {
  if (!HUBSPOT_API_KEY) throw new Error("HUBSPOT_API_KEY missing");
  const properties: Record<string, string> = {};
  if (input.lifecyclestage) properties.lifecyclestage = input.lifecyclestage;
  if (input.hs_lead_status) properties.hs_lead_status = input.hs_lead_status;
  if (input.notes) properties.hs_content_membership_notes = input.notes;
  const data = await gw("hubspot", `/crm/v3/objects/contacts/${encodeURIComponent(input.contact_id)}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  }, HUBSPOT_API_KEY);
  return data;
}

async function tCalendarBook(input: { summary: string; description?: string; start: string; end: string; attendees?: string[]; calendar_id?: string }) {
  if (!GOOGLE_CALENDAR_API_KEY) throw new Error("GOOGLE_CALENDAR_API_KEY missing");
  const calId = input.calendar_id || "primary";
  const event = {
    summary: input.summary,
    description: input.description || "",
    start: { dateTime: input.start },
    end: { dateTime: input.end },
    attendees: (input.attendees || []).map((email) => ({ email })),
  };
  const data = await gw("google_calendar", `/calendar/v3/calendars/${encodeURIComponent(calId)}/events`, {
    method: "POST",
    body: JSON.stringify(event),
  }, GOOGLE_CALENDAR_API_KEY);
  return data;
}

async function tAnalyticsTracker(input: Record<string, unknown>) {
  // Server-side acknowledgement; client persists to localStorage.
  return { logged_at: new Date().toISOString(), event: input };
}

async function tPerplexityResearch(input: { query: string; recency?: string; mode?: string }) {
  if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY missing");
  const body: Record<string, unknown> = {
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

async function tTavilySearch(input: { query: string; depth?: string; limit?: number }) {
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

async function tHunterDomain(input: { domain: string; limit?: number }) {
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

async function tHunterFindEmail(input: { domain: string; first_name: string; last_name: string }) {
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

async function tApolloPeople(input: { titles?: string[]; company_domains?: string[]; keywords?: string; limit?: number }) {
  if (!APOLLO_API_KEY) throw new Error("APOLLO_API_KEY missing");
  const body: Record<string, unknown> = {
    api_key: APOLLO_API_KEY,
    page: 1,
    per_page: Math.min(Number(input.limit || 10), 25),
  };
  if (input.titles) body.person_titles = input.titles;
  if (input.company_domains) body.q_organization_domains = input.company_domains.join("\n");
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

async function tApolloEnrich(input: { email?: string; first_name?: string; last_name?: string; company_domain?: string }) {
  if (!APOLLO_API_KEY) throw new Error("APOLLO_API_KEY missing");
  const r = await fetch("https://api.apollo.io/api/v1/people/match", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_API_KEY, "Cache-Control": "no-cache" },
    body: JSON.stringify({
      api_key: APOLLO_API_KEY,
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      domain: input.company_domain,
      reveal_personal_emails: false,
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`apollo ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
  return d.person || d;
}

async function tApifyRunActor(input: { actor_id: string; input?: unknown }) {
  if (!APIFY_API_TOKEN) throw new Error("APIFY_API_TOKEN missing");
  const actor = String(input.actor_id || "").replace("/", "~");
  const r = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.input || {}),
  });
  const text = await r.text();
  let d: unknown = text;
  try { d = JSON.parse(text); } catch { /* keep text */ }
  if (!r.ok) throw new Error(`apify ${r.status}: ${typeof d === "string" ? d.slice(0, 300) : JSON.stringify(d).slice(0, 300)}`);
  return { items: Array.isArray(d) ? d.slice(0, 50) : d };
}

async function dispatch(tool: string, input: Record<string, unknown>) {
  switch (tool) {
    case "google_search":     return tGoogleSearch(input as any);
    case "linkedin_search":   return tLinkedinSearch(input as any);
    case "web_scraper":       return tWebScraper(input as any);
    case "perplexity_research": return tPerplexityResearch(input as any);
    case "tavily_search":       return tTavilySearch(input as any);
    case "hunter_domain":       return tHunterDomain(input as any);
    case "hunter_find_email":   return tHunterFindEmail(input as any);
    case "apollo_people":       return tApolloPeople(input as any);
    case "apollo_enrich":       return tApolloEnrich(input as any);
    case "apify_run_actor":     return tApifyRunActor(input as any);
    case "email_sender":      return tEmailSender(input as any);
    case "crm_create_lead":   return tCrmCreateLead(input as any);
    case "crm_update_status": return tCrmUpdateStatus(input as any);
    case "calendar_book":     return tCalendarBook(input as any);
    case "analytics_tracker": return tAnalyticsTracker(input);
    default: throw new Error(`Unknown tool: ${tool}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const _unauth = await requireAuth(req); if (_unauth) return _unauth;
  try {
    const body = await req.json();
    const calls: Array<{ tool: string; action?: string; input: Record<string, unknown> }> = body.tool_calls
      ? body.tool_calls
      : body.tool ? [body] : [];

    if (!Array.isArray(calls) || !calls.length) return err("No tool_calls provided");
    if (calls.length > 8) return err("Too many tool_calls (max 8)");

    const results = [];
    for (const c of calls) {
      try {
        if (hasPlaceholder(c.input || {})) throw new Error("Tool input contains unresolved placeholder values");
        const data = await dispatch(c.tool, c.input || {});
        results.push({ tool: c.tool, action: c.action, ok: true, data });
      } catch (e) {
        const detail = e instanceof Error ? e.message : "Unknown";
        console.error("tool failed", c.tool, detail);
        results.push({ tool: c.tool, action: c.action, ok: false, error: detail });
      }
    }
    return ok(results);
  } catch (e) {
    console.error("aria-execute error", e);
    return err("Internal server error", 500);
  }
});
