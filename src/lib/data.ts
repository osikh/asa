import type { AppData, AuditStep, Dimension, Recommendation, Competitor, CompRow } from './types';

export const SAMPLE_APP: AppData = {
  name: "Trailblaze — Running & Fitness",
  shortName: "Trailblaze",
  developer: "Northbound Labs",
  category: "Health & Fitness",
  country: "🇺🇸 US",
  rating: 4.6,
  iconLetter: "T",
  iconGradient: "linear-gradient(135deg, #2E5B3D 0%, #163020 100%)",
  iconColor: "#B8F0CC",
  exampleUrl: "apps.apple.com/us/app/trailblaze-running-fitness/id817423199",
};

export const EXAMPLE_CHIPS = [
  { label: "apps.apple.com/us/app/trailblaze-running-fitness/…", value: "https://apps.apple.com/us/app/trailblaze-running-fitness/id817423199" },
  { label: "apps.apple.com/us/app/quill-journaling-prompts/…", value: "https://apps.apple.com/us/app/quill-journaling-prompts/id998344120" },
];

export const AUDIT_STEPS: AuditStep[] = [
  { id: "fetch", label: "Fetched listing metadata" },
  { id: "analyze", label: "Analyzing 10 ASO dimensions" },
  { id: "generate", label: "Generating recommendations" },
];

export const OVERALL_SCORE = 72;

export const DIMENSIONS: Dimension[] = [
  { id: "title",       name: "Title",          score: 8.0, icon: "type",   issue: "Strong — generic word 'App' can be trimmed for room." },
  { id: "subtitle",    name: "Subtitle",        score: 7.0, icon: "text",   issue: "Good keyword density. Missing top intent term 'trail running'." },
  { id: "keywords",    name: "Keywords",        score: 5.0, icon: "key",    issue: "Duplicates between title and keyword field waste 14 chars." },
  { id: "description", name: "Description",     score: 9.0, icon: "text",   issue: "Well-structured first paragraph. Excellent." },
  { id: "screenshots", name: "Screenshots",     score: 3.0, icon: "image",  issue: "Only 4 of 10 slots used. First shot lacks a value-prop caption." },
  { id: "preview",     name: "Preview Video",   score: 2.0, icon: "video",  issue: "No video. Conversion impact estimated +18% (vs. category median)." },
  { id: "ratings",     name: "Ratings",         score: 8.0, icon: "star",   issue: "4.6 average is healthy. Recent 1★ reviews mention sync bug." },
  { id: "icon",        name: "Icon",            score: 7.0, icon: "image",  issue: "Recognizable but low contrast at thumbnail size." },
  { id: "conversion",  name: "Conv. Signals",   score: 5.0, icon: "target", issue: "No in-app events promoted. Missing localized US-EN copy." },
  { id: "competition", name: "Competition",     score: 6.0, icon: "trophy", issue: "Mid-tier in Health > Fitness. Outranked on 6 of 10 priority queries." },
];

export const QUICK_WINS: Recommendation[] = [
  {
    rank: 1, impact: "HIGH IMPACT", impactClass: "impact-high", dimension: "TITLE",
    title: "Rewrite the title from 32 → 30 characters",
    why: "The current title uses \"Running & Fitness App\" which spends 3 keyword positions on the generic term \"App\". Replacing it with two ranked queries (\"Trail\" + \"GPS Tracker\") frees high-value real-estate without losing brand emphasis.",
    before: "Trailblaze — Running & Fitness App",
    after:  "Trailblaze: Trail Run & GPS Tracker",
    evidence: "Title currently scores 6.5/10. Keyword \"Trail Run\" ranks #3 in Health & Fitness with 0 title matches in the top 10 results.",
  },
  {
    rank: 2, impact: "HIGH IMPACT", impactClass: "impact-high", dimension: "SUBTITLE",
    title: "Reclaim 12 characters of duplicated keywords",
    why: "Your subtitle repeats \"fitness\" and \"running\" — both already present in the title. The Apple algorithm doesn't reward duplication. Replace with adjacent intent: pacing, route planning, and elevation.",
    before: "Fitness & running tracker for everyone",
    after:  "Pace, routes & elevation for runners",
    evidence: "Subtitle currently scores 7/10. \"Pace tracker\" has 2.8× higher search volume than \"fitness tracker\" in your category.",
  },
  {
    rank: 3, impact: "MEDIUM", impactClass: "impact-medium", dimension: "SCREENSHOTS",
    title: "Caption the first 3 screenshots with the value-prop",
    why: "Your first three screens are app shots with no overlay text — users glance and move on. Add 2–4 word headlines that mirror the keywords you rank for: \"GPS Route Recording\", \"Live Pace Coaching\", \"Elevation & Splits\".",
    before: "Plain app screenshots, no overlay text",
    after:  "Bold headline + screenshot, in brand font",
    evidence: "Conversion lift for captioned screenshots averages +11% in category (per 14 ASO benchmark studies).",
  },
];

export const HIGH_IMPACT: Recommendation[] = [
  {
    rank: 1, impact: "HIGH IMPACT", impactClass: "impact-high", dimension: "PREVIEW VIDEO",
    title: "Add a 15-second App Preview",
    why: "You have no video. Listings with a preview video convert 18% better on average and are weighted positively by the Apple algorithm when ranking for ambiguous terms.",
    before: "No App Preview video",
    after:  "15s preview: route → run → splits → finish",
    evidence: "Preview Video currently scores 2/10 — lowest in the audit. 8 of 10 top competitors have one.",
  },
  {
    rank: 2, impact: "HIGH IMPACT", impactClass: "impact-high", dimension: "IN-APP EVENTS",
    title: "Launch a seasonal In-App Event",
    why: "No active events. Apple surfaces events in search, the Today tab, and product pages — significant free distribution that competitors are using.",
    before: "No active In-App Events",
    after:  "Monthly 'Trail Challenge' event with badge",
    evidence: "Stride Pro and PaceLab both run monthly events. Each gains an estimated 4–7% impression share.",
  },
];

export const STRATEGIC: Recommendation[] = [
  {
    rank: 1, impact: "STRATEGIC", impactClass: "impact-low", dimension: "LOCALIZATION",
    title: "Localize for 3 new markets (DE, FR, BR)",
    why: "Your description and screenshots are English-only. Health & Fitness has high mobile engagement in DE and BR specifically. Localized listings rank in local search and convert 2-3x better.",
    before: "English (US) only",
    after:  "EN-US + DE-DE + FR-FR + PT-BR",
    evidence: "Top 3 competitors localize to 8+ regions. ASO Conf 2024 reported localized listings see 27% lift in same-region installs.",
  },
];

export const COMPETITORS: Competitor[] = [
  {
    id: "you", name: "Trailblaze", you: true,
    iconLetter: "T", iconGradient: "linear-gradient(135deg, #2E5B3D 0%, #163020 100%)", iconColor: "#B8F0CC",
    score: 72, rating: 4.6, titleKw: 2, screenshots: "4/10", preview: false, events: false,
  },
  {
    id: "stride", name: "Stride Pro",
    iconLetter: "S", iconGradient: "linear-gradient(135deg, #2D3F66 0%, #142244 100%)", iconColor: "#A8C6F0",
    score: 84, rating: 4.9, titleKw: 4, screenshots: "10/10", preview: true, events: true,
  },
  {
    id: "runforge", name: "RunForge",
    iconLetter: "R", iconGradient: "linear-gradient(135deg, #5C3220 0%, #2A1810 100%)", iconColor: "#F0BC9C",
    score: 61, rating: 4.4, titleKw: 2, screenshots: "6/10", preview: false, events: false,
  },
  {
    id: "pacelab", name: "PaceLab",
    iconLetter: "P", iconGradient: "linear-gradient(135deg, #4A2D5C 0%, #251830 100%)", iconColor: "#D6B8F0",
    score: 68, rating: 4.5, titleKw: 3, screenshots: "10/10", preview: true, events: true,
  },
];

export const COMP_ROWS: CompRow[] = [
  { key: "score",       label: "ASO Score",      fmt: (c) => String(c.score),              deltaFrom: 72 },
  { key: "rating",      label: "Rating",         fmt: (c) => c.rating.toFixed(1),          deltaFrom: 4.6 },
  { key: "titleKw",     label: "Title Keywords", fmt: (c) => String(c.titleKw),            deltaFrom: 2 },
  { key: "screenshots", label: "Screenshots",    fmt: (c) => c.screenshots,                deltaFrom: null },
  { key: "preview",     label: "Preview Video",  fmt: (c) => c.preview ? "check" : "no",   deltaFrom: null },
  { key: "events",      label: "In-App Events",  fmt: (c) => c.events ? "check" : "no",    deltaFrom: null },
];
