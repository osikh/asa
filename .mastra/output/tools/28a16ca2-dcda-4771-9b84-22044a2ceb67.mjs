import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import FirecrawlApp from '@mendable/firecrawl-js';

let firecrawl = null;
const getFirecrawl = () => {
  if (!firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY not set");
    firecrawl = new FirecrawlApp({ apiKey });
  }
  return firecrawl;
};
const cache = /* @__PURE__ */ new Map();
const CACHE_TIMEOUT = 1e3 * 60 * 60;
async function firecrawlGet(url) {
  try {
    const cached = cache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      console.log("Firecrawl cache found:", url);
      return cached.data;
    }
    console.log("Firecrawl fresh scrape:", url);
    const result = await getFirecrawl().scrape(url, { formats: ["html"] });
    const html = result.html;
    if (!html) {
      console.error("Firecrawl error: no HTML return");
      return { pictureCount: 0, videoCount: 0, imageSources: [] };
    }
    const $ = cheerio.load(html);
    const parentSelectors = [
      "#product_media_phone_",
      "#product_media_mac_",
      "#product_media_ipad_"
    ];
    let pictureCount = 0;
    let videoCount = 0;
    const imageSources = [];
    for (const selector of parentSelectors) {
      $(selector).each((_, parent) => {
        const $parent = $(parent);
        const pictures = $parent.find('[aria-label="Screenshot"]');
        pictureCount += pictures.length;
        pictures.each((_2, picture) => {
          const imgSrc = $(picture).find("img").attr("src");
          imageSources.push(imgSrc ?? "not_found");
        });
        const videos = $parent.find('[aria-label="Video"]');
        videoCount += videos.length;
      });
    }
    const data = {
      pictureCount,
      videoCount,
      imageSources
    };
    cache.set(url, {
      data,
      expiresAt: Date.now() + CACHE_TIMEOUT
    });
    return data;
  } catch (error) {
    console.error(error);
    return { pictureCount: 0, videoCount: 0, imageSources: [] };
  }
}

const CompetitorSchema = z.object({
  appId: z.string(),
  name: z.string(),
  developer: z.string(),
  rating: z.number(),
  ratingCount: z.number(),
  screenshotCount: z.number(),
  iconUrl: z.string(),
  url: z.string(),
  category: z.string(),
  price: z.number()
});
const AppStoreListingSchema = z.object({
  appId: z.string(),
  bundleId: z.string(),
  url: z.string(),
  name: z.string(),
  subtitle: z.string().nullable(),
  description: z.string(),
  whatsNew: z.string().nullable(),
  promotionalText: z.string().nullable(),
  developer: z.string(),
  seller: z.string(),
  sellerUrl: z.string().nullable(),
  category: z.string(),
  genres: z.array(z.string()),
  rating: z.number(),
  ratingCount: z.number(),
  currentVersionRating: z.number(),
  currentVersionRatingCount: z.number(),
  iconUrl: z.string(),
  screenshotCount: z.number(),
  screenshotUrls: z.array(z.string()),
  ipadScreenshotCount: z.number(),
  hasPreviewVideo: z.boolean().nullable(),
  price: z.number(),
  contentRating: z.string(),
  version: z.string(),
  lastUpdated: z.string(),
  releaseDate: z.string(),
  minimumOsVersion: z.string(),
  languages: z.array(z.string()),
  fileSizeMb: z.number(),
  similarApps: z.array(CompetitorSchema),
  moreBySameDeveloper: z.array(CompetitorSchema),
  scrapedAt: z.string(),
  dataCompleteness: z.enum(["full", "partial", "api-only"])
});
const match = (str, regex) => str.match(regex)?.[1] ?? null;
const decode = (str) => str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
const extractAppId = (url) => match(url, /\/id(\d+)/i);
const extractCountry = (url) => match(url, /apps\.apple\.com\/([a-z]{2})\//i) ?? "us";
const extract = (html, patterns) => {
  for (const p of patterns) {
    const v = html.match(p)?.[1]?.trim();
    if (v) return decode(v);
  }
  return null;
};
const idsFromSection = ($, sectionId, currentAppId, limit = 3) => {
  const section = $(`#${sectionId}`);
  if (!section.length) return [];
  const seen = /* @__PURE__ */ new Set();
  section.find('a[href*="/id"]').each((_, a) => {
    const id = $(a).attr("href")?.match(/\/id(\d+)/)?.[1];
    if (id && id !== currentAppId) seen.add(id);
  });
  return [...seen].slice(0, limit);
};
const SEARCH_STOPWORDS = /* @__PURE__ */ new Set([
  "for",
  "the",
  "a",
  "an",
  "and",
  "or",
  "app",
  "free",
  "pro",
  "plus",
  "best",
  "with",
  "your",
  "my",
  "is",
  "of",
  "to",
  "in",
  "on",
  "by"
]);
const generateSearchQuery = (name, developer) => {
  const firstToken = name.split(/[\s\-—:|]/)[0]?.toLowerCase() ?? "";
  const devLower = developer.toLowerCase();
  const isBrand = firstToken.length >= 3 && devLower.includes(firstToken);
  if (isBrand) {
    return name.split(/[\-—:|]/)[0].trim();
  }
  return name.replace(/[\-—:|,&()]/g, " ").split(/\s+/).filter((w) => {
    const lw = w.toLowerCase();
    return w && !SEARCH_STOPWORDS.has(lw) && !devLower.includes(lw);
  }).slice(0, 3).join(" ");
};
const fetchSearchCompetitors = async (query, country, currentAppId, fetcher, limit = 4) => {
  if (!query) return [];
  const loaded = await loadHtml(
    `https://apps.apple.com/${country}/iphone/search?term=${encodeURIComponent(query)}`,
    fetcher
  );
  if (!loaded) return [];
  const { $ } = loaded;
  const seen = /* @__PURE__ */ new Set();
  $('a[href*="/app/"]').each((_, a) => {
    const id = $(a).attr("href")?.match(/\/id(\d+)/)?.[1];
    if (id && id !== currentAppId) seen.add(id);
    if (seen.size >= limit) return false;
  });
  return [...seen];
};
const nativeHtmlFetcher = async (url) => {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
};
const loadHtml = async (url, fetcher) => {
  const html = await fetcher(url);
  if (html === null) return null;
  return { $: cheerio.load(html), html };
};
const scrapeStorePage = async (url, currentAppId, fetcher) => {
  const empty = {
    subtitle: null,
    promotionalText: null,
    hasPreviewVideo: null,
    developerAppIds: [],
    screenshotUrls: []
  };
  const loaded = await loadHtml(url, fetcher);
  if (!loaded) return empty;
  const { $, html } = loaded;
  const { videoCount, imageSources } = await firecrawlGet(url);
  return {
    subtitle: extract(html, [/"subtitle"\s*:\s*"([^"]{2,80})"/]) ?? ($(".product-header__subtitle").text().trim() || null),
    promotionalText: extract(html, [/"promotionalText"\s*:\s*"([^"]{2,})"/]),
    hasPreviewVideo: videoCount > 0,
    developerAppIds: idsFromSection($, "moreByDeveloper", currentAppId, 8),
    screenshotUrls: imageSources
  };
};
const fetchItunesData = async (appId, country) => {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${appId}&country=${country}&entity=software`,
    { headers: { "User-Agent": "ASOAuditBot/1.0" } }
  );
  if (!res.ok) throw new Error(`LookupAPI ${res.status}`);
  const data = await res.json();
  if (!data.results?.[0]) throw new Error(`No app found for ${appId}`);
  return data.results[0];
};
const fetchCompetitor = async (appId, country, fetcher) => {
  try {
    const d = await fetchItunesData(appId, country);
    const name = d.trackName;
    const iconUrl = d.artworkUrl100 ?? d.artworkUrl512;
    const url = d.trackViewUrl;
    const category = d.primaryGenreName;
    if (!name || !iconUrl || !url || !category) return null;
    const { pictureCount} = await firecrawlGet(url);
    const screenshotCount = pictureCount;
    return {
      appId,
      name,
      developer: d.artistName ?? "",
      rating: d.averageUserRating ?? 0,
      ratingCount: d.userRatingCount ?? 0,
      screenshotCount,
      iconUrl,
      url,
      category,
      price: d.price ?? 0
    };
  } catch {
    return null;
  }
};
const fetchAppsFromPage = async (ids, country, fetcher) => {
  const results = await Promise.all(ids.map((id) => fetchCompetitor(id, country)));
  return results.filter((c) => c !== null);
};
const deriveCompleteness = ({
  subtitle,
  promotionalText,
  hasPreviewVideo
}) => {
  if (subtitle !== null && hasPreviewVideo !== null) return "full";
  if (subtitle !== null || promotionalText !== null) return "partial";
  return "api-only";
};
const fetchAppStoreListing = async (url, fetcher = nativeHtmlFetcher) => {
  const appId = extractAppId(url);
  if (!appId) throw new Error("Invalid App Store URL");
  const country = extractCountry(url);
  const [itunes, scraped] = await Promise.all([
    fetchItunesData(appId, country),
    scrapeStorePage(url, appId, fetcher)
  ]);
  const searchQuery = generateSearchQuery(itunes.trackName ?? "", itunes.artistName ?? "");
  const [similarApps, moreBySameDeveloper] = await Promise.all([
    fetchSearchCompetitors(searchQuery, country, appId, fetcher, 4).then((ids) => fetchAppsFromPage(ids, country)),
    fetchAppsFromPage(scraped.developerAppIds, country)
  ]);
  const {
    bundleId,
    trackViewUrl,
    trackName,
    description,
    releaseNotes,
    artistName,
    sellerName,
    sellerUrl,
    primaryGenreName,
    genres,
    averageUserRating,
    userRatingCount,
    averageUserRatingForCurrentVersion,
    userRatingCountForCurrentVersion,
    artworkUrl512,
    screenshotUrls,
    ipadScreenshotUrls,
    price,
    contentAdvisoryRating,
    trackContentRating,
    version,
    currentVersionReleaseDate,
    releaseDate,
    minimumOsVersion,
    languageCodesISO2A,
    fileSizeBytes
  } = itunes;
  return {
    appId,
    bundleId,
    url: trackViewUrl ?? url,
    name: trackName,
    subtitle: scraped.subtitle,
    description,
    whatsNew: releaseNotes ?? null,
    promotionalText: scraped.promotionalText,
    developer: artistName,
    seller: sellerName,
    sellerUrl: sellerUrl ?? null,
    category: primaryGenreName,
    genres: genres ?? [],
    rating: averageUserRating,
    ratingCount: userRatingCount,
    currentVersionRating: averageUserRatingForCurrentVersion,
    currentVersionRatingCount: userRatingCountForCurrentVersion,
    iconUrl: artworkUrl512,
    screenshotCount: scraped.screenshotUrls.length || screenshotUrls?.length || 0,
    screenshotUrls: scraped.screenshotUrls.length ? scraped.screenshotUrls : screenshotUrls ?? [],
    ipadScreenshotCount: ipadScreenshotUrls?.length ?? 0,
    hasPreviewVideo: scraped.hasPreviewVideo,
    price,
    contentRating: contentAdvisoryRating ?? trackContentRating,
    version,
    lastUpdated: currentVersionReleaseDate,
    releaseDate,
    minimumOsVersion,
    languages: languageCodesISO2A ?? [],
    fileSizeMb: Math.round(parseInt(fileSizeBytes ?? "0", 10) / 1024 / 1024 * 10) / 10,
    similarApps,
    moreBySameDeveloper,
    scrapedAt: (/* @__PURE__ */ new Date()).toISOString(),
    dataCompleteness: deriveCompleteness(scraped)
  };
};
const appStoreScrapingTool = createTool({
  id: "fetch-app-store-listing",
  description: "Fetch App Store listing, similar apps (#similarItems), and more by same developer (#moreByDeveloper) via iTunes API + store page scrape",
  inputSchema: z.object({ url: z.string() }),
  outputSchema: AppStoreListingSchema,
  execute: async ({ url }) => fetchAppStoreListing(url)
});

export { appStoreScrapingTool, fetchAppStoreListing, nativeHtmlFetcher };
