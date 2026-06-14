import { useEffect, useState } from "react";
import { MessageCircle, X, Settings } from "lucide-react";
import { getWhatsApp, setWhatsApp, waLink, DEFAULT_WHATSAPP } from "@/lib/aria-audit";

const DEFAULT_MSG =
  "Hi, I completed the ARIA AI Business Audit. I want a free consultation for my business.";

export function WhatsAppButton() {
  const [number, setNumber] = useState(DEFAULT_WHATSAPP);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => { setNumber(getWhatsApp()); }, []);

  const configured = number && number !== DEFAULT_WHATSAPP;

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
        <button
          onClick={() => { setDraft(number === DEFAULT_WHATSAPP ? "" : number); setEditing(true); }}
          className="text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full bg-surface/80 border border-stroke text-muted-foreground hover:text-text-primary backdrop-blur-md flex items-center gap-1.5"
          aria-label="Configure WhatsApp number"
        >
          <Settings className="h-3 w-3" /> {configured ? "WA set" : "Set WA number"}
        </button>
        <a
          href={waLink(DEFAULT_MSG, number)}
          target="_blank"
          rel="noopener noreferrer"
          className="h-14 w-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-2xl shadow-[#25D366]/30 hover:scale-110 transition-transform"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="h-7 w-7" />
        </a>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setEditing(false)}>
          <div className="relative w-full max-w-sm aria-card p-6 bg-surface" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditing(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">WhatsApp Number</div>
            <h3 className="font-display italic text-2xl mb-4">Where should leads reach you?</h3>
            <input
              autoFocus
              type="tel"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. 919876543210 (country code + number)"
              className="w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
            <p className="text-[11px] text-muted-foreground mt-2">Digits only. Include country code, no + or spaces.</p>
            <button
              onClick={() => {
                const clean = draft.replace(/[^0-9]/g, "");
                if (clean.length < 8) return;
                setWhatsApp(clean);
                setNumber(clean);
                setEditing(false);
              }}
              className="mt-5 w-full rounded-full bg-text-primary text-bg py-3 text-sm hover:scale-[1.02] transition-transform"
            >
              Save number
            </button>
          </div>
        </div>
      )}
    </>
  );
}
