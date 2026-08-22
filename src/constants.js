// ─── Static content ───────────────────────────────────────────────────────────

export const PERSONA = [
  "He walks into a room and people notice — not because he announced himself, but because something about him is settled.",
  "He has read things, made things, trained his body, and thought seriously about how to live. You can feel it.",
  "He is not the loudest. He is the most interesting.",
  "He is unshakeable — not cold, but rooted. Nothing rattles him because he has already sat with hard questions alone.",
  "He finishes what he starts. This, above all, is what separates him from who he was.",
];

export const GOALS = [
  {
    domain: "Body",
    label: "Track I",
    color: "#c1442c",
    icon: "⚔",
    start: "Inconsistent. Some activity but no real structure.",
    end: "A man who trains. It shows.",
    targets: [
      { text: "Train 4x per week for 90 consecutive days", metric: "90 days" },
      { text: "Complete one defined physical benchmark — 50 consecutive push-ups or a 10K run", metric: "1 feat" },
      { text: "Begin a combative discipline — first class attended", metric: "1 class" },
      { text: "Cold exposure or breathwork 5 mornings per week for 60 days", metric: "60 days" },
    ],
    proof: "Someone who hasn't seen you in 6 months notices without you mentioning it.",
    fear: "This one compounds slowly — but it's the one everyone else can see. Do not skip it because the mirror lies in month one.",
  },
  {
    domain: "Philosophy",
    label: "Track II",
    color: "#4a7ba6",
    icon: "∞",
    start: "Rarely reads books. Tech/work narrow.",
    end: "A man with a worldview he built himself.",
    targets: [
      { text: "Complete 6 books cover to cover before December 31", metric: "6 books" },
      { text: "Fill 40+ pages of the physical commonplace book", metric: "40 pages" },
      { text: "Write your own 10-entry Meditations — your actual beliefs", metric: "10 entries" },
      { text: "Speak for 5 minutes on Stoicism without notes — to anyone", metric: "1 moment" },
    ],
    proof: "Someone disagrees with you and instead of going quiet, you have something real to say. And you say it without aggression.",
    fear: "You will read slowly at first. That is correct. One paragraph of Meditations understood is worth ten chapters skimmed.",
  },
  {
    domain: "Art",
    label: "Track III",
    color: "#d99a2b",
    icon: "◈",
    start: "Dormant since school. Nothing made since.",
    end: "A man who has finished something and put it in the world.",
    targets: [
      { text: "Fill one sketchbook — any quality, any subject", metric: "1 sketchbook" },
      { text: "Study 4 masters by copying their work by hand — one per month", metric: "4 masters" },
      { text: "Produce one finished creative piece and share it publicly", metric: "1 piece" },
      { text: "20-minute drawing session every Thursday without exception", metric: "Every Thu" },
    ],
    proof: "You made something. It exists. You showed it to someone. That is more than 95% of people who say they are creative.",
    fear: "The first things you make will be bad. This is not a problem — it is the price of entry. The sketchbook is private. Fill it badly.",
  },
  {
    domain: "History & Strategy",
    label: "Track IV",
    color: "#4f8a5f",
    icon: "♟",
    start: "Untouched. No real strategic reading.",
    end: "A man who reads situations others cannot see.",
    targets: [
      { text: "Read one complete biography of a historical figure", metric: "1 biography" },
      { text: "Read The 48 Laws of Power — find 3 laws active in your own life right now", metric: "3 laws" },
      { text: "Write a one-page strategic analysis of a decision you made this year", metric: "1 page" },
      { text: "Identify the historical pattern in one current event per month", metric: "4 patterns" },
    ],
    proof: "A situation unfolds around you — at work, in a relationship, anywhere — and you see the shape of it before others do. You say nothing. You act correctly.",
    fear: "History feels slow and remote. Make it personal — always ask: what would I have done? That question makes every chapter alive.",
  },
];

export const MILESTONES = [
  {
    period: "Now → Sep 30",
    label: "Foundation",
    color: "#c1442c",
    tasks: [
      "Buy the notebook. Label it. Today.",
      "Begin training 4x/week. Miss nothing in the first 30 days.",
      "Read Meditations — 10 pages per session, 3x per week.",
      "Draw for 20 minutes every Thursday.",
      "Start 48 Laws of Power.",
    ],
  },
  {
    period: "Oct → Nov 30",
    label: "Production",
    color: "#d99a2b",
    tasks: [
      "Physical benchmark attempt — 10K or 50 push-ups.",
      "Complete your first biography (Caesar or Napoleon).",
      "Finish the sketchbook.",
      "Write your 10-entry personal Meditations.",
      "Identify your finished creative piece and begin it.",
    ],
  },
  {
    period: "Dec → Dec 31",
    label: "Proof",
    color: "#4f8a5f",
    tasks: [
      "Share your creative piece. Publicly. No excuses.",
      "Write your strategic self-analysis — one honest page.",
      "Count your books. Count your training days. Count your notebook pages.",
      "Speak about Stoicism — to one person, for five minutes.",
      "Write one paragraph: who were you in August? Who are you now?",
    ],
  },
];

// ─── Themes ───────────────────────────────────────────────────────────────────

export const THEMES = {
  light: {
    pageBg: "#f7f3ec",
    pageText: "#1c1916",
    muted: "#7a7065",
    headerBg: "#1c1916",
    headerText: "#f7f3ec",
    border: "rgba(28,25,22,0.12)",
    borderSoft: "rgba(28,25,22,0.10)",
    borderFaint: "rgba(28,25,22,0.07)",
    subtleBg: "rgba(28,25,22,0.04)",
    subtleBg2: "rgba(28,25,22,0.035)",
    checkboxBorder: "rgba(28,25,22,0.2)",
    checkboxBorder2: "rgba(28,25,22,0.22)",
    invertBg: "#1c1916",
    invertText: "#f7f3ec",
    invertMuted80: "rgba(247,243,236,0.8)",
    invertMuted85: "rgba(247,243,236,0.85)",
    invertMuted50: "rgba(247,243,236,0.5)",
    invertDivider: "rgba(247,243,236,0.1)",
    trackBg: "rgba(247,243,236,0.1)",
    trackBg2: "rgba(247,243,236,0.12)",
    tabInactive: "#7a7065",
  },
  dark: {
    pageBg: "#141210",
    pageText: "#f1ece2",
    muted: "#a39a8c",
    headerBg: "#0b0a08",
    headerText: "#f1ece2",
    border: "rgba(241,236,226,0.14)",
    borderSoft: "rgba(241,236,226,0.12)",
    borderFaint: "rgba(241,236,226,0.09)",
    subtleBg: "rgba(241,236,226,0.05)",
    subtleBg2: "rgba(241,236,226,0.04)",
    checkboxBorder: "rgba(241,236,226,0.25)",
    checkboxBorder2: "rgba(241,236,226,0.28)",
    invertBg: "#000000",
    invertText: "#f1ece2",
    invertMuted80: "rgba(241,236,226,0.8)",
    invertMuted85: "rgba(241,236,226,0.85)",
    invertMuted50: "rgba(241,236,226,0.55)",
    invertDivider: "rgba(241,236,226,0.12)",
    trackBg: "rgba(241,236,226,0.12)",
    trackBg2: "rgba(241,236,226,0.14)",
    tabInactive: "#8a8175",
  },
};

export const ACCENT = "#c4821a";

// ─── Daily task definitions ────────────────────────────────────────────────────

export function getDailyItems(dateStr = new Date().toISOString()) {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  
  // Body logic (Mon/Wed/Fri/Sat = Train, Tue/Thu/Sun = Active recovery)
  const isTrainDay = [1, 3, 5, 6].includes(day);
  const bodyText = isTrainDay ? "Train / complete today's physical work" : "Active recovery / rest";

  // Art logic (Thu = 20-min draw, others = sketch/creative thought)
  const isArtDay = day === 4; // Thursday
  const artText = isArtDay ? "20-minute drawing session — Thursday focus" : "Sketch / creative thought";

  // History/Strategy logic (Sun = Review, others = 48 Laws / History)
  const isReviewDay = day === 0; // Sunday
  const historyText = isReviewDay ? "Sunday weekly review and reflection" : "Read / study history or The 48 Laws of Power";

  return [
    { id: "body",       domain: "BODY",              icon: "⚔", color: "#c1442c", text: bodyText },
    { id: "philosophy", domain: "PHILOSOPHY",         icon: "∞", color: "#4a7ba6", text: "Read 10 pages or write in your commonplace book" },
    { id: "art",        domain: "ART",                icon: "◈", color: "#d99a2b", text: artText },
    { id: "history",    domain: "HISTORY & STRATEGY", icon: "♟", color: "#4f8a5f", text: historyText },
  ];
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Convert a hex color string "#rrggbb" to "r, g, b" for use in rgba().
 */
export function hexRgb(hex) {
  return `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`;
}
