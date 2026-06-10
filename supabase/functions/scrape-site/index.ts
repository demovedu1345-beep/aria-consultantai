// Deep website scan via Firecrawl. Returns markdown + key signals so ARIA can spot what's lacking.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeUrl(u: string): string {
  let s = u.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url: rawUrl } = await req.json();
    if (!rawUrl || typeof rawUrl !== "string") {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = normalizeUrl(rawUrl);
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY missing");

    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links", "summary"],
        onlyMainContent: true,
        waitFor: 1500,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: data?.error || `Scrape failed (${r.status})` }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pick = (k: string) => data?.[k] ?? data?.data?.[k];
    const markdown: string = pick("markdown") || "";
    const links: string[] = pick("links") || [];
    const summary: string = pick("summary") || "";
    const metadata = pick("metadata") || {};
    const title: string = metadata?.title || "";
    const description: string = metadata?.description || "";

    // Quick heuristics ARIA can cite
    const lower = markdown.toLowerCase();
    const signals = {
      has_pricing: /pricing|\$\d|\/mo\b|per month/.test(lower),
      has_cta: /(get started|sign up|book a|buy now|start free|contact us)/.test(lower),
      has_social_proof: /(testimonial|review|trusted by|customers|case stud)/.test(lower),
      has_about: /about( us|)|our story|mission/.test(lower),
      has_blog: links.some((l) => /\/(blog|journal|insights|news)\//i.test(l)),
      has_contact: links.some((l) => /(contact|support)/i.test(l)) || /contact/.test(lower),
      word_count: markdown.split(/\s+/).filter(Boolean).length,
      link_count: links.length,
    };

    // Compact bundle the LLM can quote from
    const bundle = [
      `URL: ${url}`,
      title && `TITLE: ${title}`,
      description && `META: ${description}`,
      summary && `SUMMARY: ${summary}`,
      `SIGNALS: ${JSON.stringify(signals)}`,
      `TOP_LINKS:\n${links.slice(0, 25).join("\n")}`,
      `---`,
      markdown.slice(0, 8000),
    ].filter(Boolean).join("\n\n");

    return new Response(JSON.stringify({ markdown: bundle, title, signals, summary, link_count: links.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-site error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
