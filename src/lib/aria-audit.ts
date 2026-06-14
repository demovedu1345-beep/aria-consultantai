// ARIA Lead engine — local-only storage, rule-based AI report generator.
// TODO(supabase): swap localStorage for a `leads` table when DB is wired in.

export type AuditAnswers = {
  name: string;
  phone: string;
  email: string;
  business_name: string;
  category: string;
  website_status: "none" | "basic" | "professional";
  monthly_leads: number;
  marketing_method: string;
  biggest_problem: string;
  business_goal: string;
  budget_range: string;
};

export const CATEGORIES = [
  "Event Management",
  "Restaurant / Café",
  "Interior Design",
  "Coaching Institute",
  "Clinic",
  "Gym",
  "Salon",
  "Local Shop",
  "Real Estate",
  "E-commerce",
  "Freelancer / Agency",
  "Other",
];

export const BUDGETS = [
  "Under ₹10k / mo",
  "₹10k – ₹50k / mo",
  "₹50k – ₹2L / mo",
  "₹2L+ / mo",
  "Not sure yet",
];

export const WEBSITE_OPTIONS: { value: AuditAnswers["website_status"]; label: string }[] = [
  { value: "none", label: "No website" },
  { value: "basic", label: "Basic website" },
  { value: "professional", label: "Professional website" },
];

export type AriaReport = {
  score: number;
  headline: string;
  weakness: string;
  improvements: string[];
  ai_tools: string[];
  marketing_plan: string[];
  automation: string[];
  time_saved_hours_month: number;
  lead_uplift_pct: number;
  seven_day_plan: { day: string; action: string }[];
};

const CATEGORY_TOOLS: Record<string, string[]> = {
  "Event Management": ["Notion CRM", "WhatsApp Business API", "Google Calendar AI scheduler", "Canva Magic Studio"],
  "Restaurant / Café": ["Zomato/Swiggy review responder (ChatGPT)", "WhatsApp ordering bot", "Meta Ads + Lookalikes", "QR menu + UPI"],
  "Interior Design": ["Midjourney mood-boards", "Pinterest auto-poster", "HouseStation/Houzz profile", "Pipedrive CRM"],
  "Coaching Institute": ["WhatsApp drip funnel", "AI quiz generator", "YouTube Shorts pipeline", "Notion student CRM"],
  "Clinic": ["Practo + Google Business AI replies", "WhatsApp appointment bot", "Review automation", "EMR + reminders"],
  "Gym": ["Member retention CRM", "Reels content engine", "WhatsApp lead nurture", "Trainer scheduling AI"],
  "Salon": ["Fresha booking AI", "Instagram DM auto-reply", "Loyalty WhatsApp campaigns", "Reels content engine"],
  "Local Shop": ["Google Business Profile AI", "WhatsApp catalog", "Meta Ads (3km radius)", "UPI QR + reviews"],
  "Real Estate": ["Lead-scoring CRM", "AI virtual tours", "WhatsApp drip", "Justdial + 99acres automation"],
  "E-commerce": ["Klaviyo flows", "Meta Advantage+", "AI product photos", "WhatsApp abandoned cart"],
  "Freelancer / Agency": ["Notion CRM", "Loom + AI proposals", "LinkedIn outreach AI", "Calendly + Zapier"],
  "Other": ["WhatsApp Business API", "Notion CRM", "Meta Ads", "Google Business AI replies"],
};

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

export function generateReport(a: AuditAnswers): AriaReport {
  // ---- Scoring ----
  let score = 42;
  if (a.website_status === "professional") score += 18;
  else if (a.website_status === "basic") score += 8;
  if (a.monthly_leads > 100) score += 12;
  else if (a.monthly_leads > 30) score += 6;
  else if (a.monthly_leads > 0) score += 2;
  if (a.marketing_method && a.marketing_method.length > 4) score += 6;
  if (a.business_goal && a.business_goal.length > 6) score += 4;
  if (a.budget_range && !a.budget_range.startsWith("Under")) score += 6;
  // Cap to keep ARIA's tone honest — only break 85 for genuinely strong setups.
  score = clamp(score, 28, a.website_status === "professional" && a.monthly_leads > 100 ? 88 : 78);

  // ---- Weakness ----
  let weakness = "Your funnel leaks attention before it reaches a decision.";
  if (a.website_status === "none") weakness = "You have no owned digital surface — every lead is rented from someone else's algorithm.";
  else if (a.website_status === "basic") weakness = "Your website exists but doesn't sell — it's a brochure, not a conversion engine.";
  if (a.monthly_leads < 20) weakness += " Lead volume is too thin to A/B anything meaningful.";
  if (/whatsapp|word|mouth|referr/i.test(a.marketing_method)) weakness += " You're over-indexed on referrals — non-compounding growth.";

  // ---- Improvements ----
  const improvements: string[] = [];
  if (a.website_status !== "professional") improvements.push("Ship a single high-intent landing page with one CTA and proof.");
  improvements.push(`Build a 7-touch WhatsApp follow-up sequence for ${a.category} buyers.`);
  improvements.push("Install Google Business Profile AI replies + weekly photo posts.");
  improvements.push(`Run a ₹300/day Meta Ads test targeted to ${a.category.toLowerCase()} buyers in your city.`);
  if (a.monthly_leads > 30) improvements.push("Add a lead-scoring CRM so your top 10% leads get a same-hour reply.");
  else improvements.push("Move every conversation into a Notion CRM — stop losing leads in DMs.");

  // ---- Marketing plan ----
  const marketing_plan = [
    `Position ${a.business_name} around the single phrase your customers actually search.`,
    "Publish 3 reels/week using the problem-agitate-solution loop.",
    "Hijack 5 competitor Google reviews with a better offer.",
    "Run a ₹3k/week WhatsApp broadcast funnel to past enquiries.",
  ];

  // ---- Automation ----
  const automation = [
    "Auto-respond to Instagram DMs within 30 seconds (ManyChat).",
    "WhatsApp catalog + UPI checkout — zero-friction buying.",
    "AI review responder (ChatGPT + Zapier) for Google + Justdial.",
    "Calendar AI that books prospects without back-and-forth.",
  ];

  const time_saved_hours_month = clamp(8 + Math.round((a.monthly_leads || 10) * 0.25), 10, 80);
  const lead_uplift_pct = clamp(15 + (a.website_status === "none" ? 25 : a.website_status === "basic" ? 15 : 8), 15, 55);

  const seven_day_plan = [
    { day: "Day 1", action: "Audit Google Business Profile + add 10 photos and Q&A." },
    { day: "Day 2", action: "Write one landing page headline that promises a single outcome." },
    { day: "Day 3", action: "Set up WhatsApp Business with quick replies + greeting." },
    { day: "Day 4", action: `Record 3 reels: testimonial, before/after, behind-the-scenes for ${a.category}.` },
    { day: "Day 5", action: "Launch ₹300/day Meta Ads test — single audience, single creative." },
    { day: "Day 6", action: "Build a 7-message WhatsApp follow-up in Notion + schedule." },
    { day: "Day 7", action: "Review numbers, kill what didn't work, double down on what did." },
  ];

  return {
    score,
    headline: `${a.business_name} — ${score >= 70 ? "Strong foundation, missing leverage." : score >= 55 ? "Working, but leaking." : "Early — but a clear runway."}`,
    weakness,
    improvements,
    ai_tools: CATEGORY_TOOLS[a.category] || CATEGORY_TOOLS["Other"],
    marketing_plan,
    automation,
    time_saved_hours_month,
    lead_uplift_pct,
    seven_day_plan,
  };
}

// ---------- Lead store ----------
export type LeadRecord = AuditAnswers & {
  id: string;
  created_at: string;
  score: number;
  report_headline: string;
};

const LEADS_KEY = "aria_leads_v1";

export function saveLead(answers: AuditAnswers, report: AriaReport): LeadRecord {
  const rec: LeadRecord = {
    ...answers,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    score: report.score,
    report_headline: report.headline,
  };
  const all = loadLeads();
  all.unshift(rec);
  localStorage.setItem(LEADS_KEY, JSON.stringify(all.slice(0, 500)));
  // TODO(supabase): also insert into `leads` table when DB is connected.
  return rec;
}

export function loadLeads(): LeadRecord[] {
  try { return JSON.parse(localStorage.getItem(LEADS_KEY) || "[]"); } catch { return []; }
}

// ---------- Bookings ----------
export type BookingRecord = {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  business_type: string;
  call_type: string;
  message: string;
};

const BOOKINGS_KEY = "aria_bookings_v1";
export function saveBooking(b: Omit<BookingRecord, "id" | "created_at">): BookingRecord {
  const rec: BookingRecord = { ...b, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  const all = loadBookings();
  all.unshift(rec);
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(all.slice(0, 500)));
  return rec;
}
export function loadBookings(): BookingRecord[] {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || "[]"); } catch { return []; }
}

// ---------- WhatsApp number ----------
const WA_KEY = "aria_whatsapp_v1";
export const DEFAULT_WHATSAPP = "91XXXXXXXXXX";
export function getWhatsApp(): string {
  return localStorage.getItem(WA_KEY) || DEFAULT_WHATSAPP;
}
export function setWhatsApp(n: string) {
  localStorage.setItem(WA_KEY, n.replace(/[^0-9]/g, ""));
}
export function waLink(message: string, number?: string) {
  const n = (number || getWhatsApp()).replace(/[^0-9]/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}
