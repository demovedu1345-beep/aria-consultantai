import { useEffect, useRef, useState } from "react";

interface Section {
  title: string;
  emoji: string;
  body: string;
}

function parseSections(content: string): Section[] {
  // Split on lines containing emoji headers we know
  const headerRe = /^(🔍|📈|🚨|📊|💡|⚡|🌐|👑)\s*([A-Z][A-Z' \-]+)\s*$/m;
  const lines = content.split("\n");
  const sections: Section[] = [];
  let cur: Section | null = null;
  for (const raw of lines) {
    const line = raw.replace(/^━+$/g, "").trimEnd();
    const m = line.match(/^(🔍|📈|🚨|📊|💡|⚡|🌐|👑)\s+(.+)$/);
    if (m && /[A-Z]{3,}/.test(m[2])) {
      if (cur) sections.push(cur);
      cur = { emoji: m[1], title: m[2].trim(), body: "" };
    } else if (cur) {
      // skip pure rule lines
      if (/^[─-]{5,}$/.test(line.trim())) continue;
      cur.body += (cur.body ? "\n" : "") + line;
    }
  }
  if (cur) sections.push(cur);
  return sections;
}

function ScoreRow({ label, score, reason }: { label: string; score: number; reason: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(score), 100);
    return () => clearTimeout(t);
  }, [score]);
  return (
    <div className="grid grid-cols-[110px_1fr_auto] items-center gap-4 py-2.5">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <div className="aria-bar">
        <span style={{ width: `${w}%`, transition: "width 1.2s cubic-bezier(.2,.8,.2,1)" }} />
      </div>
      <div className="text-right">
        <span className="font-display text-2xl text-foreground">{score}</span>
        <span className="text-muted-foreground text-sm">/100</span>
        {reason && <div className="text-[11px] text-muted-foreground/80 max-w-[260px] mt-0.5">{reason}</div>}
      </div>
    </div>
  );
}

function renderScoreSection(body: string) {
  // Lines like "Marketing : 64/100  [▓▓░░] reason"
  const rows: { label: string; score: number; reason: string }[] = [];
  let overall: { score: number; reason: string } | null = null;
  for (const line of body.split("\n")) {
    const m = line.match(/^(Marketing|Sales|Product|Overall)\s*:?\s*(\d{1,3})\s*\/\s*100\s*(?:\[.*?\])?\s*(.*)$/i);
    if (m) {
      const label = m[1];
      const score = Math.min(100, parseInt(m[2]));
      const reason = m[3].replace(/^[—\-·]\s*/, "").trim();
      if (label.toLowerCase() === "overall") overall = { score, reason };
      else rows.push({ label, score, reason });
    }
  }
  return (
    <div>
      {rows.map((r) => <ScoreRow key={r.label} {...r} />)}
      {overall && (
        <div className="mt-4 pt-4 border-t border-border/60 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-[0.3em] text-accent">Overall</span>
          <div>
            <span className="font-display text-5xl text-accent">{overall.score}</span>
            <span className="text-muted-foreground">/100</span>
          </div>
        </div>
      )}
      {overall?.reason && <div className="text-xs text-muted-foreground mt-1 text-right">{overall.reason}</div>}
    </div>
  );
}

function renderActionSection(body: string, onMark?: (text: string, status: "completed" | "skipped") => void, marks?: Record<string, "completed" | "skipped">) {
  const items: string[] = [];
  for (const line of body.split("\n")) {
    const m = line.trim().match(/^(?:\d+[.)]\s*|[-•]\s*)(.+)$/);
    if (m && m[1].length > 4) items.push(m[1]);
  }
  return (
    <ol className="space-y-3">
      {items.map((it, i) => {
        const status = marks?.[it];
        return (
          <li key={i} className="group flex items-start gap-4 p-4 rounded-md border border-border/60 bg-muted/20 hover:border-accent/40 transition-colors">
            <span className="font-display text-accent text-xl shrink-0 leading-none mt-0.5">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex-1 text-sm leading-relaxed">
              <span className={status === "completed" ? "line-through text-muted-foreground" : status === "skipped" ? "text-muted-foreground/70 italic" : ""}>
                {it}
              </span>
            </div>
            {onMark && !status && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onMark(it, "completed")} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-success/30 text-success hover:bg-success/10">Done</button>
                <button onClick={() => onMark(it, "skipped")} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted">Skip</button>
              </div>
            )}
            {status && (
              <span className={`text-[10px] uppercase tracking-wider ${status === "completed" ? "text-success" : "text-muted-foreground"}`}>
                {status}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function renderInline(text: string) {
  // Convert **bold** and *italic* to JSX while stripping stray markers
  const parts: (string | JSX.Element)[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) {
      parts.push(
        <strong key={key++} className="font-medium text-foreground tracking-tight">
          {m[1].replace(/:$/, "")}
          {m[1].endsWith(":") ? " — " : ""}
        </strong>
      );
    } else if (m[2]) {
      parts.push(<em key={key++} className="italic text-foreground/95">{m[2]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderProse(body: string) {
  return (
    <div className="space-y-4">
      {body.split(/\n\n+/).map((p, i) => {
        const lines = p.split("\n").filter(Boolean);
        const isList = lines.every((l) => /^([-•🔴🟡🟢🚩→✅⚠️🔄]|\d+[.)])/.test(l.trim()));
        if (isList) {
          return (
            <ul key={i} className="space-y-2.5">
              {lines.map((l, j) => {
                const clean = l.replace(/^([-•]|\d+[.)])\s*/, "").trim();
                const flag = l.match(/^(🔴|🟡|🟢|🚩|→|✅|⚠️|🔄)/)?.[1];
                const text = flag ? clean.replace(flag, "").trim() : clean;
                return (
                  <li key={j} className="flex gap-3 text-[15px] leading-[1.7] text-foreground/80">
                    <span className="shrink-0 mt-2 h-1 w-1 rounded-full bg-accent/70" />
                    <span>{renderInline(text)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[15px] leading-[1.75] text-foreground/80 first:first-letter:font-display first:first-letter:text-accent first:first-letter:text-2xl first:first-letter:mr-0.5">
            {renderInline(p)}
          </p>
        );
      })}
    </div>
  );
}

interface DashboardProps {
  content: string;
  onMarkAction?: (text: string, status: "completed" | "skipped") => void;
  actionMarks?: Record<string, "completed" | "skipped">;
}

export function Dashboard({ content, onMarkAction, actionMarks }: DashboardProps) {
  const sections = parseSections(content);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [content]);

  if (sections.length === 0) {
    return <div className="aria-card p-8 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/80">{content}</div>;
  }

  return (
    <div ref={ref} className="space-y-5">
      {sections.map((s, i) => {
        const isScores = /HEALTH SCORES/i.test(s.title);
        const isActions = /ACTION PLAN/i.test(s.title);
        const title = s.title.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        return (
          <article
            key={i}
            className="aria-card p-8 md:p-10 animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <header className="mb-6">
              <div className="text-[10px] uppercase tracking-[0.32em] text-accent/80 mb-2">
                § {String(i + 1).padStart(2, "0")}
              </div>
              <h2 className="font-display text-3xl md:text-[34px] leading-tight tracking-tight text-foreground">
                {title}
              </h2>
              <div className="aria-divider mt-5" />
            </header>
            {isScores ? renderScoreSection(s.body)
              : isActions ? renderActionSection(s.body, onMarkAction, actionMarks)
              : renderProse(s.body)}
          </article>
        );
      })}
    </div>
  );
}
