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
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
      <header className="flex items-center justify-between p-6 border-b border-border/50">
        <div>
          <span className="aria-tag">Voice Session</span>
          <h2 className="font-display text-2xl mt-2">Speak with ARIA</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-2xl mx-auto w-full space-y-6">
        {transcript.length === 0 && (
          <p className="text-muted-foreground text-center py-12 text-sm">
            Press the mic and speak naturally. ARIA listens, thinks, then replies aloud.
          </p>
        )}
        {transcript.map((m, i) => (
          <div key={i} className={`animate-fade-up ${m.role === "user" ? "text-right" : ""}`}>
            <div className="aria-tag mb-2">{m.role === "user" ? "You" : "ARIA"}</div>
            <p className={`text-sm leading-relaxed ${m.role === "aria" ? "font-display text-lg text-foreground" : "text-muted-foreground"}`}>
              {m.text}
            </p>
          </div>
        ))}
      </div>

      <div className="p-8 flex flex-col items-center gap-4 border-t border-border/50">
        <div className="relative">
          {phase === "listening" && (
            <span className="absolute inset-0 rounded-full bg-accent/30 animate-pulse-ring" />
          )}
          <button
            disabled={phase === "thinking" || phase === "speaking"}
            onClick={() => (phase === "listening" ? stopListening() : startListening())}
            className="relative h-20 w-20 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-[0_20px_60px_-20px_hsl(40_55%_58%/0.6)] disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
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
