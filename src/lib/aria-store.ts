// Local storage layer for ARIA — single-user, no auth.
export interface BusinessProfile {
  business_name: string;
  business_type: string;
  business_stage: string;
  location: string;
  revenue: string;
  team_size: string;
}

export interface SessionRecord {
  id: string;
  date: string;
  type: "INITIAL" | "RETURNING" | "VOICE";
  content: string;
  scores: { marketing: number | null; sales: number | null; product: number | null; overall: number | null } | null;
  actions: string[]; // extracted action plan strings
}

export interface ActionStatus {
  text: string;
  status: "pending" | "completed" | "skipped";
  created_at: string;
}

export interface AriaState {
  profile: BusinessProfile | null;
  sessions: SessionRecord[];
  actions: ActionStatus[];
  website_url?: string;
  social_text?: string;
  scraped_site?: string;
}

const KEY = "aria_state_v1";

export function loadState(): AriaState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { profile: null, sessions: [], actions: [] };
    return JSON.parse(raw);
  } catch {
    return { profile: null, sessions: [], actions: [] };
  }
}

export function saveState(s: AriaState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function resetState() {
  localStorage.removeItem(KEY);
}

// Extract action plan lines from a dashboard response
export function extractActions(content: string): string[] {
  const idx = content.indexOf("TODAY'S ACTION PLAN");
  if (idx === -1) return [];
  const tail = content.slice(idx);
  const stop = tail.search(/ANALYZER INSIGHTS|EXPECTED OUTCOME|CEO DIRECTIVE/);
  const block = stop === -1 ? tail : tail.slice(0, stop);
  const lines = block.split("\n").map((l) => l.trim());
  const actions: string[] = [];
  for (const l of lines) {
    const m = l.match(/^(?:\d+[.)]\s*|[-•]\s*)(.+)$/);
    if (m && m[1].length > 4 && !/ACTION PLAN/i.test(m[1])) {
      actions.push(m[1]);
    }
  }
  return actions.slice(0, 4);
}

// Build memory log payload for the edge function
export function buildMemory(state: AriaState) {
  const last = state.sessions[state.sessions.length - 1];
  const completed = state.actions.filter((a) => a.status === "completed").map((a) => a.text);
  const skipped = state.actions.filter((a) => a.status === "skipped").map((a) => a.text);
  const previous = state.actions.map((a) => a.text);
  return {
    last_session_date: last?.date,
    past_problems: [],
    previous_actions: previous,
    completed_actions: completed,
    skipped_actions: skipped,
    prev_marketing: last?.scores?.marketing ?? undefined,
    prev_sales: last?.scores?.sales ?? undefined,
    prev_product: last?.scores?.product ?? undefined,
  };
}
