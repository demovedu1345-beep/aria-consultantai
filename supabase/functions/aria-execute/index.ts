// ARIA executor — dispatches autonomous tool calls to real APIs.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const HUBSPOT_API_KEY = Deno.env.get("HUBSPOT_API_KEY") || "";
const GOOGLE_CALENDAR_API_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY") || "";

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

async function tEmailSender(input: { to: string; subject: string; html?: string; text?: string; from?: string }) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
  if (!input.to || !input.subject || (!input.html && !input.text)) {
    throw new Error("email_sender requires to, subject, and html or text");
  }
  const body = {
    from: input.from || "ARIA <onboarding@resend.dev>",
    to: [input.to],
    subject: input.subject,
    html: input.html || `<p>${(input.text || "").replace(/\n/g, "<br/>")}</p>`,
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

async function dispatch(tool: string, input: Record<string, unknown>) {
  switch (tool) {
    case "google_search":     return tGoogleSearch(input as any);
    case "linkedin_search":   return tLinkedinSearch(input as any);
    case "web_scraper":       return tWebScraper(input as any);
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
  try {
    const body = await req.json();
    const calls: Array<{ tool: string; action?: string; input: Record<string, unknown> }> = body.tool_calls
      ? body.tool_calls
      : body.tool ? [body] : [];

    if (!calls.length) return err("No tool_calls provided");

    const results = [];
    for (const c of calls) {
      try {
        const data = await dispatch(c.tool, c.input || {});
        results.push({ tool: c.tool, action: c.action, ok: true, data });
      } catch (e) {
        const detail = e instanceof Error ? e.message : "Unknown";
        console.error("tool failed", c.tool, detail);
        results.push({ tool: c.tool, action: c.action, ok: false, error: "Tool execution failed" });
      }
    }
    return ok(results);
  } catch (e) {
    console.error("aria-execute error", e);
    return err("Internal server error", 500);
  }
});
