import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
import { asoAnalyzerAgent } from '../agents/asoanalyzer-agent';
import { AppStoreListingSchema } from '../tools/itune-scraping-tool';

const DIM_META = [
  { id: 'title',       name: 'Title',         icon: 'type',   weight: 0.20 },
  { id: 'subtitle',    name: 'Subtitle',       icon: 'text',   weight: 0.15 },
  { id: 'keywords',    name: 'Keywords',       icon: 'key',    weight: 0.15 },
  { id: 'description', name: 'Description',    icon: 'text',   weight: 0.10 },
  { id: 'screenshots', name: 'Screenshots',    icon: 'image',  weight: 0.15 },
  { id: 'preview',     name: 'Preview Video',  icon: 'video',  weight: 0.05 },
  { id: 'ratings',     name: 'Ratings',        icon: 'star',   weight: 0.15 },
  { id: 'icon',        name: 'Icon',           icon: 'image',  weight: 0.05 },
  { id: 'conversion',  name: 'Conv. Signals',  icon: 'target', weight: 0.05 },
  { id: 'competition', name: 'Competition',    icon: 'trophy', weight: 0.05 },
] as const;

const TOTAL_WEIGHT = DIM_META.reduce((s, m) => s + m.weight, 0);

const FactsSchema = z.object({
  titleLen: z.number(),
  subtitleLen: z.number(),
  ssCount: z.number(),
  avgCompRating: z.number(),
  avgCompReviews: z.number(),
  compSsAvg: z.number(),
  topCompRating: z.number(),
});

const RecommendationSchema = z.object({
  rank: z.number(),
  impact: z.string(),
  impactClass: z.string(),
  dimension: z.string(),
  title: z.string(),
  why: z.string(),
  before: z.string(),
  after: z.string(),
  evidence: z.string(),
});

const DimensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  score: z.number(),
  issue: z.string(),
});

const AuditCompetitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  you: z.boolean().optional(),
  iconUrl: z.string(),
  developer: z.string(),
  rating: z.number(),
  ratingCount: z.number(),
  screenshotCount: z.number(),
  category: z.string(),
  price: z.number(),
  url: z.string(),
});

const AuditAppSchema = z.object({
  appId: z.string(),
  name: z.string(),
  developer: z.string(),
  category: z.string(),
  rating: z.number(),
  ratingCount: z.number(),
  iconUrl: z.string(),
  storeUrl: z.string(),
  version: z.string(),
  screenshotCount: z.number(),
  ipadScreenshotCount: z.number(),
  screenshotUrls: z.array(z.string()),
  hasPreviewVideo: z.boolean().nullable(),
  subtitle: z.string().nullable(),
  promotionalText: z.string().nullable(),
  whatsNew: z.string().nullable(),
  price: z.number(),
  dataCompleteness: z.enum(['full', 'partial', 'api-only']),
});

const AuditResultSchema = z.object({
  app: AuditAppSchema,
  overallScore: z.number(),
  dimensions: z.array(DimensionSchema),
  quickWins: z.array(RecommendationSchema),
  highImpact: z.array(RecommendationSchema),
  strategic: z.array(RecommendationSchema),
  competitors: z.array(AuditCompetitorSchema),
});

const buildPromptStep = createStep({
  id: 'build-prompt',
  description: 'Compute facts snapshot and build the deterministic scoring prompt',
  inputSchema: z.object({ listing: AppStoreListingSchema }),
  outputSchema: z.object({
    listing: AppStoreListingSchema,
    facts: FactsSchema,
    prompt: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { listing } = inputData;

    const titleLen = listing.name.length;
    const subtitleLen = (listing.subtitle ?? '').length;
    const ssCount = listing.screenshotCount;
    const compRatings = listing.similarApps.map(c => c.rating).filter(r => r > 0);
    const avgCompRating = compRatings.length ? compRatings.reduce((a, b) => a + b, 0) / compRatings.length : 0;
    const compSsAvg = listing.similarApps.length
      ? listing.similarApps.map(c => c.screenshotCount).reduce((a, b) => a + b, 0) / listing.similarApps.length
      : 0;
    const avgCompReviews = listing.similarApps.length
      ? listing.similarApps.map(c => c.ratingCount).reduce((a, b) => a + b, 0) / listing.similarApps.length
      : 0;
    const topCompRating = listing.similarApps.length
      ? Math.max(...listing.similarApps.map(c => c.rating))
      : 0;

    const listingContext = {
      name: listing.name,
      subtitle: listing.subtitle,
      description: listing.description.slice(0, 500),
      whatsNew: listing.whatsNew?.slice(0, 200) ?? null,
      promotionalText: listing.promotionalText,
      developer: listing.developer,
      category: listing.category,
      rating: listing.rating,
      ratingCount: listing.ratingCount,
      currentVersionRating: listing.currentVersionRating,
      screenshotCount: listing.screenshotCount,
      ipadScreenshotCount: listing.ipadScreenshotCount,
      hasPreviewVideo: listing.hasPreviewVideo,
      price: listing.price,
      version: listing.version,
      dataCompleteness: listing.dataCompleteness,
      competitors: listing.similarApps.map(c => ({ name: c.name, rating: c.rating, screenshotCount: c.screenshotCount })),
    };

    const prompt = `Phase 2 ASO audit — listing pre-fetched, confirmed by user. DO NOT call tools, ask for URL, or refuse.

LISTING:
${JSON.stringify(listingContext, null, 2)}

MEASURED FACTS (use these exact numbers, do not guess):
- Title length: ${titleLen} of 30 chars
- Subtitle length: ${subtitleLen} of 30 chars
- Screenshots: ${ssCount} of 10 slots
- Preview video: ${listing.hasPreviewVideo === true ? 'present' : listing.hasPreviewVideo === false ? 'absent' : 'unknown'}
- Rating: ${listing.rating} avg over ${listing.ratingCount} reviews (current ver ${listing.currentVersionRating ?? 'n/a'})
- Promotional text: ${listing.promotionalText ? `${listing.promotionalText.length} chars` : 'missing'}
- What's New: ${listing.whatsNew ? `${listing.whatsNew.length} chars` : 'missing'}
- Avg competitor rating: ${avgCompRating.toFixed(2)} | Avg competitor screenshots: ${compSsAvg.toFixed(1)}

═══ SCORING PHILOSOPHY — BE STRICT ═══
- Most well-built apps land 55-72 overall. 80+ = excellent on multiple dimensions. 90+ = top 5%, best-in-class. 95+ = reserved for genuinely exceptional listings (rarely justified).
- Do NOT give "benefit of the doubt" points. If you cannot verify a quality, default LOW not HIGH.
- An app outperformed by competitors on rating OR review volume CANNOT score above 78 overall.
- An app over the 30-char title limit, missing a preview video, OR under 8 screenshots CANNOT score above 85 overall.

═══ DETERMINISTIC SCORING RUBRIC (sum points per criterion, max 10 per dimension) ═══

TITLE (max 30 chars — over is auto-truncated by Apple):
  • Char usage: ${titleLen > 30 ? '0' : titleLen >= 28 ? '3' : titleLen >= 25 ? '2' : titleLen >= 15 ? '1' : '0'} pts (>30=0 PENALTY, 28-30=3, 25-27=2, 15-24=1, <15=0)
  • Primary keyword in first 20 chars: yes=3, anywhere=2, none=0
  • Brand + ≥1 keyword: both=2, only one=1, neither=0
  • Natural phrasing (no | or comma separators, no awkward dashes): clean=2, mild=1, stuffed=0

SUBTITLE (max 30 chars):
  • Char usage: ${subtitleLen >= 28 ? '3' : subtitleLen >= 22 ? '2' : subtitleLen >= 12 ? '1' : '0'} pts (28-30=3, 22-27=2, 12-21=1, <12=0)
  • Distinct from title (zero meaningful word overlap): perfect=3, 1 overlap=1, 2+ overlaps=0
  • Has ≥2 unique high-intent keywords: 2 yes, 1 only=1, 0=0
  • Benefit-driven (action verbs + concrete outcomes): yes=2, generic=0

KEYWORDS (PRIVATE — Apple keyword field invisible; score INFERRED strategy from on-page text):
  • Extractable candidates not in title/subtitle: 10+=4, 7-9=3, 4-6=2, <4=0
  • Long-tail phrases (2-3 words) present: 2+=2, 1=1, 0=0
  • Singular forms detectable: mostly singular=2, mixed=1, mostly plural=0
  • Avoids wasted words (app, brand, category name, articles): clean=2, mixed=0

DESCRIPTION:
  • First 170 chars has explicit value-prop with concrete benefit: yes=3, weak/generic=1, none=0
  • Features framed as user benefits (not feature dump): yes=2, mixed=1, dump=0
  • Social proof with SPECIFIC numbers/awards/press: yes=2, vague=0, none=0
  • Explicit CTA in first 500 chars: yes=1, none=0
  • Natural keyword integration: yes=2, stuffed/missing=0

SCREENSHOTS (NO baseline — score only what's verifiable):
  • Slot usage: ${ssCount >= 10 ? '6' : ssCount >= 8 ? '4' : ssCount >= 6 ? '3' : ssCount >= 4 ? '2' : ssCount >= 2 ? '1' : '0'} pts (10=6, 8-9=4, 6-7=3, 4-5=2, 2-3=1, 0-1=0)
  • Assumed visual quality: +3 ONLY if 8+ slots used (signals care), else +1
  • If app has 10+ screenshots AND scraped URLs returned successfully: +1 polish bonus

PREVIEW VIDEO:
  • ${listing.hasPreviewVideo === true ? '8' : listing.hasPreviewVideo === false ? '0' : '4'} pts (present=8, absent=0, unknown=4)
  • No bonus for "just having one" — quality unknown

RATINGS:
  • Avg rating: ${listing.rating >= 4.8 ? '5' : listing.rating >= 4.6 ? '4' : listing.rating >= 4.3 ? '3' : listing.rating >= 4.0 ? '2' : listing.rating >= 3.5 ? '1' : '0'} pts (≥4.8=5, 4.6-4.79=4, 4.3-4.59=3, 4.0-4.29=2, 3.5-3.99=1, <3.5=0)
  • Review volume: ${listing.ratingCount >= 100000 ? '3' : listing.ratingCount >= 10000 ? '2' : listing.ratingCount >= 1000 ? '1' : '0'} pts (≥100k=3, 10k-100k=2, 1k-10k=1, <1k=0)
  • Current version rating ≥4.5: 2 pts (≥4.0=1, <4.0=0)

ICON:
  • Default 5 (URL only, no image inspection). Adjust to 6 only if app has >50k reviews (proven attraction).

CONVERSION SIGNALS (NO baseline freebies):
  • Promotional text >10 chars: ${listing.promotionalText && listing.promotionalText.length > 10 ? '3' : '0'} pts (binary)
  • What's New >50 chars: ${listing.whatsNew && listing.whatsNew.length > 50 ? '3' : '0'} pts (binary)
  • Subtitle present (>5 chars): ${subtitleLen > 5 ? '2' : '0'} pts
  • Promotional text mentions limited-time/event/discount: yes=2, no=0

COMPETITIVE POSITION (NO baseline — pure comparison):
  • vs avg competitor rating (${avgCompRating.toFixed(2)}): above by 0.2+=4, within ±0.2=2, below 0.2-0.5=1, below 0.5+=0
  • vs avg competitor REVIEW count: above 1.5× avg=3, 0.7-1.5× avg=2, 0.3-0.7×=1, below 0.3×=0
  • vs avg competitor screenshots (${compSsAvg.toFixed(1)}): above=2, equal=1, below=0
  • Rating differential vs TOP competitor (highest rated): within 0.2=1, behind by more=0

═══ KEYWORD FIELD GENERATION (REQUIRED — first item in quickWins) ═══
The iOS Connect keyword field (100 chars, comma-separated) is not visible to any scraper. Synthesize a recommended set from on-page text using these rules:
  1. Extract noun phrases from description (sorted by frequency × position)
  2. REMOVE any word already in title or subtitle (no duplication)
  3. REMOVE: "app", "${listing.category}" (category name), "${listing.developer}" (brand), articles, prepositions, common verbs
  4. PREFER singular forms (Apple indexes both — saves chars for more variety)
  5. NO SPACES after commas (every char counts toward the 100 limit)
  6. Fill to 95-100 chars

The first quickWin MUST be the keyword field recommendation. SPECIAL CASE — this is the ONLY rec where "before" is empty:
  - dimension: "KEYWORDS"
  - title: "Recommended iOS keyword field (≤100 chars)"
  - before: ""   ← LEAVE EMPTY. Apple's keyword field is genuinely invisible — there is no current state to show. Do NOT write placeholder text, do NOT explain why. Just empty string.
  - after: a single string ≤100 chars like "trail,gps,pace,marathon,route,elevation,coach,training,workout,split,cadence"
  - evidence: cite 3-5 source phrases from the description that informed the choice

═══ OUTPUT ═══
CRITICAL — EVERY recommendation in quickWins, highImpact, AND strategic MUST include:
  • "before" — non-empty string (≥10 chars) describing the EXACT current state from the listing data
                   EXCEPTION: the KEYWORDS recommendation has "before": "" (empty). This is the only allowed empty before.
  • "after"  — non-empty string (≥10 chars) describing the EXACT recommended target state
  • "evidence" — non-empty string (≥20 chars) citing a specific data point, character count, or quote
NEVER output "...", "n/a", or omit these keys. If the recommendation is structural (not a text change), describe the current behavior in "before" and the target behavior in "after" in concrete terms. Every single item must be fully filled.

Return ONLY this JSON (no prose, no preamble):

\`\`\`json
{
  "dimensions": [
    { "id": "title",       "score": 0, "issue": "<one-line finding>" },
    { "id": "subtitle",    "score": 0, "issue": "..." },
    { "id": "keywords",    "score": 0, "issue": "..." },
    { "id": "description", "score": 0, "issue": "..." },
    { "id": "screenshots", "score": 0, "issue": "..." },
    { "id": "preview",     "score": 0, "issue": "..." },
    { "id": "ratings",     "score": 0, "issue": "..." },
    { "id": "icon",        "score": 0, "issue": "..." },
    { "id": "conversion",  "score": 0, "issue": "..." },
    { "id": "competition", "score": 0, "issue": "..." }
  ],
  "quickWins": [
    { "rank": 1, "impact": "HIGH IMPACT", "impactClass": "impact-high", "dimension": "KEYWORDS", "title": "Recommended iOS keyword field (≤100 chars)", "why": "<reasoning>", "before": "", "after": "kw1,kw2,kw3,...", "evidence": "<cite 3-5 source phrases>" },
    { "rank": 2, "impact": "HIGH IMPACT", "impactClass": "impact-high", "dimension": "TITLE", "title": "<concrete action>", "why": "<reasoning>", "before": "<current title verbatim from data>", "after": "<rewritten title>", "evidence": "<specific data point or character count>" },
    { "rank": 3, "impact": "MEDIUM", "impactClass": "impact-medium", "dimension": "SUBTITLE", "title": "<concrete action>", "why": "<reasoning>", "before": "<current subtitle verbatim>", "after": "<rewritten subtitle>", "evidence": "<specific data point>" }
  ],
  "highImpact": [
    { "rank": 1, "impact": "HIGH IMPACT", "impactClass": "impact-high", "dimension": "<DIM>", "title": "<concrete action>", "why": "<reasoning>", "before": "<current state from data>", "after": "<recommended target state>", "evidence": "<specific data point>" },
    { "rank": 2, "impact": "HIGH IMPACT", "impactClass": "impact-high", "dimension": "<DIM>", "title": "<concrete action>", "why": "<reasoning>", "before": "<current state from data>", "after": "<recommended target state>", "evidence": "<specific data point>" }
  ],
  "strategic": [
    { "rank": 1, "impact": "STRATEGIC", "impactClass": "impact-low", "dimension": "<DIM>", "title": "<concrete action>", "why": "<reasoning>", "before": "<current state from data>", "after": "<recommended target state>", "evidence": "<specific data point>" },
    { "rank": 2, "impact": "STRATEGIC", "impactClass": "impact-low", "dimension": "<DIM>", "title": "<concrete action>", "why": "<reasoning>", "before": "<current state from data>", "after": "<recommended target state>", "evidence": "<specific data point>" }
  ]
}
\`\`\``;

    return {
      listing,
      facts: { titleLen, subtitleLen, ssCount, avgCompRating, avgCompReviews, compSsAvg, topCompRating },
      prompt,
    };
  },
});

const sanitize = (text: string) =>
  text
    .replace(/<\|[^|]*\|>/g, '')
    .replace(/<[a-z_]+>/gi, '')
    .replace(/,\s*([\]}])/g, '$1');

const extractJson = (text: string) => {
  const clean = sanitize(text);
  const fencedBlocks = [...clean.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map(m => m[1]).reverse();
  const bareFallback = clean.match(/\{[\s\S]*\}/)?.[0];
  const candidates = [...fencedBlocks, bareFallback].filter(Boolean) as string[];

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(jsonrepair(raw));
      if (Array.isArray(parsed.dimensions) && parsed.dimensions.length > 0) return parsed;
    } catch {
      continue;
    }
  }

  console.error('[audit-workflow] Raw agent response:\n', text);
  throw new Error('No parseable JSON found in agent response');
};

const runAgentScoringStep = createStep({
  id: 'run-agent-scoring',
  description: 'Send the rubric prompt to the analyzer agent and extract structured JSON',
  inputSchema: z.object({
    listing: AppStoreListingSchema,
    facts: FactsSchema,
    prompt: z.string(),
  }),
  outputSchema: z.object({
    listing: AppStoreListingSchema,
    facts: FactsSchema,
    parsed: z.any(),
  }),
  execute: async ({ inputData }) => {
    const { listing, facts, prompt } = inputData;
    const result = await asoAnalyzerAgent.generate(prompt, {
      modelSettings: { temperature: 0 },
    });
    const parsed = extractJson(result.text);
    return { listing, facts, parsed };
  },
});

const str = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'object' && v !== null ? Object.values(v).join(' ') : String(v ?? '');

const clamp = (n: unknown) => {
  const v = typeof n === 'number' ? n : 5;
  return Math.max(0, Math.min(10, v));
};

const enforceAndAssembleStep = createStep({
  id: 'enforce-and-assemble',
  description: 'Apply per-dimension hard caps, compute overall score with global caps, assemble AuditResult',
  inputSchema: z.object({
    listing: AppStoreListingSchema,
    facts: FactsSchema,
    parsed: z.any(),
  }),
  outputSchema: AuditResultSchema,
  execute: async ({ inputData }) => {
    const { listing, facts, parsed } = inputData;
    const { titleLen, subtitleLen, ssCount, avgCompRating, avgCompReviews, topCompRating } = facts;

    const hardCap = (id: string, score: number): number => {
      let cap = 10;
      switch (id) {
        case 'title':
          if (titleLen > 30 || titleLen < 15) cap = 5;
          break;
        case 'subtitle':
          if (subtitleLen === 0) cap = 1;
          else if (subtitleLen < 12) cap = 5;
          break;
        case 'screenshots':
          if (ssCount === 0) cap = 1;
          else if (ssCount < 4) cap = 3;
          else if (ssCount < 6) cap = 5;
          else if (ssCount < 8) cap = 6;
          else if (ssCount < 10) cap = 8;
          break;
        case 'preview':
          if (listing.hasPreviewVideo === false) cap = 0;
          else if (listing.hasPreviewVideo !== true) cap = 5;
          break;
        case 'ratings': {
          if (listing.rating < 3.5) cap = 3;
          else if (listing.rating < 4.0) cap = 5;
          else if (listing.rating < 4.3) cap = 7;
          else if (listing.rating < 4.6) cap = 8;
          if (listing.ratingCount < 1000) cap = Math.min(cap, 4);
          else if (listing.ratingCount < 10000) cap = Math.min(cap, 6);
          else if (listing.ratingCount < 100000) cap = Math.min(cap, 8);
          break;
        }
        case 'conversion': {
          const hasPromo = (listing.promotionalText?.length ?? 0) > 10;
          const hasWhatsNew = (listing.whatsNew?.length ?? 0) > 50;
          const hasSub = subtitleLen > 5;
          cap = [hasPromo, hasWhatsNew, hasSub].filter(Boolean).length * 3;
          break;
        }
        case 'competition': {
          const ratingGap = listing.rating - avgCompRating;
          const reviewRatio = avgCompReviews ? listing.ratingCount / avgCompReviews : 1;
          if (ratingGap < -0.4 || reviewRatio < 0.3) cap = 3;
          else if (ratingGap < -0.2 || reviewRatio < 0.5) cap = 5;
          else if (ratingGap < 0 || reviewRatio < 1) cap = 7;
          if (topCompRating > 0 && listing.rating < topCompRating - 0.2) cap = Math.min(cap, 6);
          break;
        }
        case 'icon':
          cap = listing.ratingCount > 50000 ? 7 : 6;
          break;
      }
      return Math.min(score, cap);
    };

    const dimensions = DIM_META.map(meta => {
      const found = (parsed.dimensions ?? []).find((d: { id: string }) => d.id === meta.id);
      const raw = clamp(found?.score);
      return { ...meta, score: hardCap(meta.id, raw), issue: str(found?.issue ?? '') };
    });

    const weighted = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
    const baseScore = Math.max(0, Math.min(100, Math.round((weighted / TOTAL_WEIGHT) * 10)));
    const outperformed = (avgCompRating > 0 && listing.rating < avgCompRating - 0.1)
      || (avgCompReviews > 0 && listing.ratingCount < avgCompReviews * 0.66);
    const missingFundamentals = titleLen > 30 || ssCount < 8 || listing.hasPreviewVideo === false;
    const overallScore = outperformed ? Math.min(78, baseScore)
      : missingFundamentals ? Math.min(85, baseScore)
      : baseScore;

    const toRec = (r: unknown, i: number) => {
      const rec = r as Partial<z.infer<typeof RecommendationSchema>>;
      return {
        rank: i + 1,
        impact: str(rec.impact) || 'HIGH IMPACT',
        impactClass: str(rec.impactClass) || 'impact-high',
        dimension: str(rec.dimension),
        title: str(rec.title),
        why: str(rec.why),
        before: str(rec.before),
        after: str(rec.after),
        evidence: str(rec.evidence),
      };
    };

    const competitors = listing.similarApps.map(c => ({
      id: c.appId,
      name: c.name,
      iconUrl: c.iconUrl,
      developer: c.developer,
      rating: c.rating,
      ratingCount: c.ratingCount,
      screenshotCount: c.screenshotCount,
      category: c.category,
      price: c.price,
      url: c.url,
    }));

    return {
      app: {
        appId: listing.appId,
        name: listing.name,
        developer: listing.developer,
        category: listing.category,
        rating: listing.rating,
        ratingCount: listing.ratingCount,
        iconUrl: listing.iconUrl,
        storeUrl: listing.url,
        version: listing.version,
        screenshotCount: listing.screenshotCount,
        ipadScreenshotCount: listing.ipadScreenshotCount,
        screenshotUrls: listing.screenshotUrls,
        hasPreviewVideo: listing.hasPreviewVideo,
        subtitle: listing.subtitle,
        promotionalText: listing.promotionalText,
        whatsNew: listing.whatsNew,
        price: listing.price,
        dataCompleteness: listing.dataCompleteness,
      },
      overallScore,
      dimensions,
      quickWins: (parsed.quickWins ?? []).map(toRec),
      highImpact: (parsed.highImpact ?? []).map(toRec),
      strategic: (parsed.strategic ?? []).map(toRec),
      competitors,
    };
  },
});

export const auditWorkflow = createWorkflow({
  id: 'aso-audit',
  inputSchema: z.object({ listing: AppStoreListingSchema }),
  outputSchema: AuditResultSchema,
})
  .then(buildPromptStep)
  .then(runAgentScoringStep)
  .then(enforceAndAssembleStep);

auditWorkflow.commit();
