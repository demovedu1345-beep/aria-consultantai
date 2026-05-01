import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Speech-to-text via ElevenLabs scribe_v2. Accepts base64 audio in JSON body.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audio_base64, mime } = await req.json();
    if (!audio_base64) {
      return new Response(JSON.stringify({ error: "audio_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing");

    // Decode base64 -> Blob
    const binary = Uint8Array.from(atob(audio_base64), (c) => c.charCodeAt(0));
    const blob = new Blob([binary], { type: mime || "audio/webm" });

    const fd = new FormData();
    fd.append("file", blob, "speech.webm");
    fd.append("model_id", "scribe_v2");
    fd.append("language_code", "eng");

    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: fd,
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("STT error", r.status, data);
      return new Response(JSON.stringify({ error: data?.detail || `STT failed (${r.status})` }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ text: data?.text || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("eleven-stt error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
