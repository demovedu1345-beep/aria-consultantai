import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  buildPayload: (userMessage: string) => any;
  onTranscript?: (entry: { role: "user" | "aria"; text: string }) => void;
}

type Phase = "idle" | "listening" | "thinking" | "speaking";

export function VoiceSession({ open, onClose, buildPayload, onTranscript }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<{ role: "user" | "aria"; text: string }[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) cleanup();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function cleanup() {
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioRef.current?.pause();
    audioRef.current = null;
    setPhase("idle");
  }

  async function startListening() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = handleStop;
      mediaRecorderRef.current = mr;
      mr.start();
      setPhase("listening");
    } catch {
      toast.error("Microphone access required");
    }
  }

  function stopListening() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function handleStop() {
    setPhase("thinking");
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.byteLength; i++) binary += String.fromCharCode(buf[i]);
    const base64 = btoa(binary);

    try {
      const { data: sttData, error: sttErr } = await supabase.functions.invoke("eleven-stt", {
        body: { audio_base64: base64, mime: "audio/webm" },
      });
      if (sttErr) throw sttErr;
      const userText = (sttData?.text || "").trim();
      if (!userText) {
        toast.error("Didn't catch that — try again");
        setPhase("idle");
        return;
      }
      const userEntry = { role: "user" as const, text: userText };
      setTranscript((t) => [...t, userEntry]);
      onTranscript?.(userEntry);

      const payload = { ...buildPayload(userText), session_type: "VOICE" };
      const { data: chatData, error: chatErr } = await supabase.functions.invoke("aria-chat", { body: payload });
      if (chatErr) throw chatErr;
      const ariaText = (chatData?.content || "").trim();
      const ariaEntry = { role: "aria" as const, text: ariaText };
      setTranscript((t) => [...t, ariaEntry]);
      onTranscript?.(ariaEntry);

      setPhase("speaking");
      const ttsResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eleven-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: ariaText }),
        }
      );
      if (!ttsResp.ok) throw new Error("TTS failed");
      const audioBlob = await ttsResp.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioRef.current = audio;
      audio.onended = () => setPhase("idle");
      await audio.play();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Voice session error";
      toast.error(msg);
      setPhase("idle");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-xl flex flex-col">
      {/* Dashboard-style header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[hsl(0_0%_4%/0.7)] border-b border-stroke">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[hsl(0_0%_10%)] border border-stroke flex items-center justify-center text-sm font-display italic accent-text">A</div>
            <div>
              <div className="font-display text-lg leading-none tracking-tight">ARIA</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1.5">Voice Session</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-full border border-stroke bg-surface/60 p-1">
              <span className="text-[10px] uppercase tracking-[0.28em] px-4 py-1.5 rounded-full accent-gradient text-[hsl(0_0%_6%)] shadow-[0_4px_20px_-6px_rgba(137,170,204,0.55)] flex items-center gap-2">
                <Mic className="h-3 w-3" /> Voice
              </span>
            </div>
            <button
              onClick={() => setTranscript([])}
              className="relative inline-flex items-center gap-2 h-10 px-4 rounded-lg accent-gradient text-[hsl(0_0%_6%)] text-sm font-medium shadow-[0_8px_32px_-8px_rgba(137,170,204,0.6)] hover:shadow-[0_12px_40px_-8px_rgba(137,170,204,0.8)] transition-shadow"
            >
              New session
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface/60 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-10 max-w-3xl mx-auto w-full space-y-5">
        {transcript.length === 0 && (
          <div className="aria-card p-8 md:p-10 text-center">
            <div className="text-[10px] uppercase tracking-[0.32em] text-accent/80 mb-2">§ 00</div>
            <h2 className="font-display text-3xl md:text-[34px] tracking-tight">Speak with ARIA</h2>
            <div className="aria-divider my-5" />
            <p className="text-[15px] leading-[1.75] text-foreground/70">
              Press the mic and speak naturally. ARIA listens, thinks, then replies aloud.
            </p>
          </div>
        )}
        {transcript.map((m, i) => (
          <article key={i} className="aria-card p-6 md:p-8 animate-fade-up">
            <div className="text-[10px] uppercase tracking-[0.32em] text-accent/80 mb-2">
              {m.role === "user" ? "You" : "ARIA"}
            </div>
            <div className="aria-divider mb-5" />
            <p className={m.role === "aria" ? "font-display text-2xl text-foreground leading-snug" : "text-[15px] leading-[1.75] text-foreground/80"}>
              {m.text}
            </p>
          </article>
        ))}
      </div>

      <div className="p-8 flex flex-col items-center gap-4 border-t border-stroke bg-bg/60 backdrop-blur-xl">
        <div className="relative">
          {phase === "listening" && (
            <span className="absolute inset-0 rounded-full accent-gradient opacity-40 animate-pulse-ring" />
          )}
          <button
            disabled={phase === "thinking" || phase === "speaking"}
            onClick={() => (phase === "listening" ? stopListening() : startListening())}
            className="relative h-20 w-20 rounded-full accent-gradient text-[hsl(0_0%_6%)] flex items-center justify-center shadow-[0_20px_60px_-16px_rgba(78,133,191,0.7)] disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
          >
            {phase === "thinking" || phase === "speaking" ? <Loader2 className="animate-spin" />
              : phase === "listening" ? <MicOff /> : <Mic />}
          </button>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {phase === "idle" && "Tap to speak"}
          {phase === "listening" && "Listening… tap to send"}
          {phase === "thinking" && "ARIA is thinking"}
          {phase === "speaking" && "ARIA is speaking"}
        </p>
      </div>
    </div>
  );
}
