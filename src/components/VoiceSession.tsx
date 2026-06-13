import { ensureSession } from "@/lib/aria-auth";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X, Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  buildPayload: (userMessage: string) => any;
  onTranscript?: (entry: { role: "user" | "aria"; text: string }) => void;
}

type Phase = "idle" | "listening" | "thinking" | "speaking";

type TranscriptEngine = "browser" | "studio";
type VoiceEngine = "browser" | "studio";

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  0: BrowserSpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface BrowserSpeechRecognitionEvent {
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

function getRecognitionCtor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function pickBestVoice(voices: SpeechSynthesisVoice[]) {
  return voices.find((voice) => /^en/i.test(voice.lang) && /(samantha|serena|victoria|zira|google|ava|female|natural)/i.test(voice.name))
    || voices.find((voice) => /^en/i.test(voice.lang))
    || null;
}

export function VoiceSession({ open, onClose, buildPayload, onTranscript }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<{ role: "user" | "aria"; text: string }[]>([]);
  const [transcriptEngine, setTranscriptEngine] = useState<TranscriptEngine>(getRecognitionCtor() ? "browser" : "studio");
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>("studio");
  const [engineStatus, setEngineStatus] = useState("Browser transcription ready.");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recognitionResolvedRef = useRef(false);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const warmVoices = () => window.speechSynthesis.getVoices();
    warmVoices();
    window.speechSynthesis.onvoiceschanged = warmVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (!open) cleanup();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function cleanup() {
    recognitionRef.current?.abort();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    audioRef.current = null;
    setPhase("idle");
  }

  async function startListening() {
    utteranceRef.current = typeof window !== "undefined" && "SpeechSynthesisUtterance" in window
      ? new SpeechSynthesisUtterance("")
      : null;

    const RecognitionCtor = getRecognitionCtor();
    if (RecognitionCtor) {
      try {
        recognitionResolvedRef.current = false;
        const recognition = new RecognitionCtor();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;
        recognition.onresult = (event) => {
          recognitionResolvedRef.current = true;
          const userText = Array.from(event.results)
            .map((result) => result[0]?.transcript || "")
            .join(" ")
            .trim();
          void handleUserText(userText);
        };
        recognition.onerror = (event) => {
          console.error("browser speech recognition error", event.error, event.message || "");
          setPhase("idle");
          if (event.error === "not-allowed") {
            toast.error("Microphone access required");
          } else {
            toast.error("Browser speech recognition failed — falling back to studio transcription.");
            void startRecordedListening();
          }
        };
        recognition.onend = () => {
          recognitionRef.current = null;
          if (!recognitionResolvedRef.current) {
            setPhase((current) => (current === "listening" ? "idle" : current));
          }
        };
        recognitionRef.current = recognition;
        setTranscriptEngine("browser");
        setEngineStatus("Browser transcription active.");
        recognition.start();
        setPhase("listening");
        return;
      } catch (error) {
        console.warn("browser recognition bootstrap failed", error);
      }
    }

    await startRecordedListening();
  }

  async function startRecordedListening() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = handleStop;
      mediaRecorderRef.current = mr;
      mr.start();
      setTranscriptEngine("studio");
      setEngineStatus("Studio transcription active.");
      setPhase("listening");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotFoundError") toast.error("No microphone found");
      else if (name === "NotReadableError") toast.error("Microphone is busy in another app");
      else toast.error("Microphone access required");
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
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
      await ensureSession();
      const { data: sttData, error: sttErr } = await supabase.functions.invoke("eleven-stt", {
        body: { audio_base64: base64, mime: "audio/webm" },
      });
      if (sttErr) throw new Error(sttErr.message || "Transcription failed");
      const userText = (sttData?.text || "").trim();
      if (!userText) {
        toast.error("Didn't catch that — try again");
        setPhase("idle");
        return;
      }
      await handleUserText(userText);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Voice session error";
      if (/missing_permissions|401|transcription/i.test(msg) && getRecognitionCtor()) {
        setTranscriptEngine("browser");
        setEngineStatus("Studio transcription unavailable — browser transcription ready.");
        toast.message("Studio transcription is unavailable. Tap again to use browser voice.");
      } else {
        toast.error(msg);
      }
      setPhase("idle");
    }
  }

  async function handleUserText(userText: string) {
    const cleaned = userText.trim();
    if (!cleaned) {
      toast.error("Didn't catch that — try again");
      setPhase("idle");
      return;
    }

    setPhase("thinking");
    const userEntry = { role: "user" as const, text: cleaned };
    setTranscript((t) => [...t, userEntry]);
    onTranscript?.(userEntry);

    try {
      await ensureSession();
      const payload = { ...buildPayload(cleaned), session_type: "VOICE" };
      const { data: chatData, error: chatErr } = await supabase.functions.invoke("aria-chat", { body: payload });
      if (chatErr) throw new Error(chatErr.message || "Conversation failed");
      const ariaText = (chatData?.content || "").trim();
      const ariaEntry = { role: "aria" as const, text: ariaText };
      setTranscript((t) => [...t, ariaEntry]);
      onTranscript?.(ariaEntry);
      await speakReply(ariaText);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Voice session error");
      setPhase("idle");
    }
  }

  async function speakReply(text: string) {
    setPhase("speaking");
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    try {
      const ttsResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eleven-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!ttsResp.ok) {
        let detail = "TTS failed";
        try {
          const err = await ttsResp.json();
          detail = err?.error || err?.detail?.message || detail;
        } catch {
          detail = await ttsResp.text() || detail;
        }
        throw new Error(detail);
      }

      const audioBlob = await ttsResp.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioRef.current = audio;
      setVoiceEngine("studio");
      setEngineStatus("Studio voice active.");
      audio.onended = () => setPhase("idle");
      audio.onerror = () => {
        void speakWithBrowser(text, "Studio playback failed — using browser voice.");
      };
      await audio.play();
    } catch (error) {
      console.warn("studio voice failed, falling back to browser speech", error);
      await speakWithBrowser(text, "Studio voice unavailable — using browser voice.");
    }
  }

  async function speakWithBrowser(text: string, statusMessage: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setPhase("idle");
      toast.error(statusMessage);
      return;
    }

    setVoiceEngine("browser");
    setEngineStatus(statusMessage);
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = utteranceRef.current ?? new SpeechSynthesisUtterance("");
    utteranceRef.current = utterance;
    utterance.text = text;
    utterance.lang = "en-US";
    utterance.rate = 0.98;
    utterance.pitch = 0.98;
    utterance.volume = 1;
    const pickedVoice = pickBestVoice(synth.getVoices());
    if (pickedVoice) utterance.voice = pickedVoice;

    await new Promise<void>((resolve, reject) => {
      utterance.onend = () => {
        setPhase("idle");
        resolve();
      };
      utterance.onerror = () => {
        setPhase("idle");
        reject(new Error("Browser speech failed"));
      };
      synth.speak(utterance);
    }).catch((error) => {
      console.error(error);
      toast.error("Voice playback failed");
    });
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
            <div className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              <span>Listen · {transcriptEngine}</span>
              <span className="text-stroke">•</span>
              <span className="inline-flex items-center gap-1"><Volume2 className="h-3 w-3" /> Speak · {voiceEngine}</span>
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
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mt-4">{engineStatus}</p>
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
        <p className="text-[11px] text-muted-foreground text-center max-w-md">{engineStatus}</p>
      </div>
    </div>
  );
}
