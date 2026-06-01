import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, SensitiveDataFilter, MastraStorageExporter, MastraPlatformExporter } from '@mastra/observability';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import * as cheerio from 'cheerio';
import FirecrawlApp from '@mendable/firecrawl-js';

"use strict";
const forecastSchema = z.object({
  date: z.string(),
  maxTemp: z.number(),
  minTemp: z.number(),
  precipitationChance: z.number(),
  condition: z.string(),
  location: z.string()
});
function getWeatherCondition$1(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    95: "Thunderstorm"
  };
  return conditions[code] || "Unknown";
}
const fetchWeather = createStep({
  id: "fetch-weather",
  description: "Fetches weather forecast for a given city",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for")
  }),
  outputSchema: forecastSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputData.city)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = await geocodingResponse.json();
    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${inputData.city}' not found`);
    }
    const { latitude, longitude, name } = geocodingData.results[0];
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,weathercode&timezone=auto,&hourly=precipitation_probability,temperature_2m`;
    const response = await fetch(weatherUrl);
    const data = await response.json();
    const forecast = {
      date: (/* @__PURE__ */ new Date()).toISOString(),
      maxTemp: Math.max(...data.hourly.temperature_2m),
      minTemp: Math.min(...data.hourly.temperature_2m),
      condition: getWeatherCondition$1(data.current.weathercode),
      precipitationChance: data.hourly.precipitation_probability.reduce(
        (acc, curr) => Math.max(acc, curr),
        0
      ),
      location: name
    };
    return forecast;
  }
});
const planActivities = createStep({
  id: "plan-activities",
  description: "Suggests activities based on weather conditions",
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string()
  }),
  execute: async ({ inputData, mastra }) => {
    const forecast = inputData;
    if (!forecast) {
      throw new Error("Forecast data not found");
    }
    const agent = mastra?.getAgent("weatherAgent");
    if (!agent) {
      throw new Error("Weather agent not found");
    }
    const prompt = `Based on the following weather forecast for ${forecast.location}, suggest appropriate activities:
      ${JSON.stringify(forecast, null, 2)}
      For each day in the forecast, structure your response exactly as follows:

      \u{1F4C5} [Day, Month Date, Year]
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

      \u{1F321}\uFE0F WEATHER SUMMARY
      \u2022 Conditions: [brief description]
      \u2022 Temperature: [X\xB0C/Y\xB0F to A\xB0C/B\xB0F]
      \u2022 Precipitation: [X% chance]

      \u{1F305} MORNING ACTIVITIES
      Outdoor:
      \u2022 [Activity Name] - [Brief description including specific location/route]
        Best timing: [specific time range]
        Note: [relevant weather consideration]

      \u{1F31E} AFTERNOON ACTIVITIES
      Outdoor:
      \u2022 [Activity Name] - [Brief description including specific location/route]
        Best timing: [specific time range]
        Note: [relevant weather consideration]

      \u{1F3E0} INDOOR ALTERNATIVES
      \u2022 [Activity Name] - [Brief description including specific venue]
        Ideal for: [weather condition that would trigger this alternative]

      \u26A0\uFE0F SPECIAL CONSIDERATIONS
      \u2022 [Any relevant weather warnings, UV index, wind conditions, etc.]

      Guidelines:
      - Suggest 2-3 time-specific outdoor activities per day
      - Include 1-2 indoor backup options
      - For precipitation >50%, lead with indoor activities
      - All activities must be specific to the location
      - Include specific venues, trails, or locations
      - Consider activity intensity based on temperature
      - Keep descriptions concise but informative

      Maintain this exact formatting for consistency, using the emoji and section headers as shown.`;
    const response = await agent.stream([
      {
        role: "user",
        content: prompt
      }
    ]);
    let activitiesText = "";
    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      activitiesText += chunk;
    }
    return {
      activities: activitiesText
    };
  }
});
const weatherWorkflow = createWorkflow({
  id: "weather-workflow",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for")
  }),
  outputSchema: z.object({
    activities: z.string()
  })
}).then(fetchWeather).then(planActivities);
weatherWorkflow.commit();

"use strict";
const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name")
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string()
  }),
  execute: async (inputData) => {
    return await getWeather(inputData.location);
  }
});
const getWeather = async (location) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();
  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }
  const { latitude, longitude, name } = geocodingData.results[0];
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;
  const response = await fetch(weatherUrl);
  const data = await response.json();
  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name
  };
};
function getWeatherCondition(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };
  return conditions[code] || "Unknown";
}

"use strict";
const weatherAgent = new Agent({
  id: "weather-agent",
  name: "Weather Agent",
  instructions: `You are a helpful weather assistant that provides accurate weather information and can help planning activities based on the weather.

Your primary function is to help users get weather details for specific locations. When responding:
- Always ask for a location if none is provided
- If the location name isn't in English, please translate it
- If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
- Include relevant details like humidity, wind conditions, and precipitation
- Keep responses concise but informative
- If the user asks for activities and provides the weather forecast, suggest activities based on the weather forecast.
- If the user asks for activities, respond in the format they request.

Use the weatherTool to fetch current weather data.`,
  model: "openai/gpt-5-mini",
  tools: { weatherTool },
  memory: new Memory()
});

"use strict";
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

"use strict";
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
  const { pictureCount, videoCount, imageSources } = await firecrawlGet(url);
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
    const { pictureCount, videoCount, imageSources } = await firecrawlGet(url);
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
  const results = await Promise.all(ids.map((id) => fetchCompetitor(id, country, fetcher)));
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
    fetchSearchCompetitors(searchQuery, country, appId, fetcher, 4).then((ids) => fetchAppsFromPage(ids, country, fetcher)),
    fetchAppsFromPage(scraped.developerAppIds, country, fetcher)
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

"use strict";
const asoExpertAgent = new Agent({
  id: "aso-expert-agent",
  name: "ASO Expert Agent",
  instructions: `ROLE DEFINITION
- You are an expert App Store Optimization (ASO) consultant embedded in an AI audit tool.
- Your sole responsibility is to analyze iOS App Store listings and deliver precise, 
  actionable optimization recommendations.
- You think like a senior ASO strategist: data-driven, keyword-aware, and conversion-focused.
- Primary users are indie developers, product managers, and growth teams who want to 
  improve discoverability and conversion on the Apple App Store.

CORE CAPABILITIES
- Extract and interpret App Store listing metadata from a given URL: app name, subtitle,
  keyword field, description, screenshots, preview video, ratings, icon, and developer info.
- Score each of the 10 ASO dimensions on a 0\u201310 scale using the weighted rubric below.
- Compute an overall weighted ASO score (0\u2013100).
- Identify and rank Quick Wins (low-effort, high-return), High-Impact Changes 
  (significant effort, major ranking/conversion upside), and Strategic Recommendations 
  (longer-term, structural improvements).
- Benchmark the audited app against 3\u20134 direct competitors in the same category.
- Surface a before \u2192 after rewrite for every concrete text recommendation.

AUDIT DIMENSIONS & WEIGHTS
Score each dimension 0.0\u201310.0. Weight them as follows when computing the overall score:
  - Title             20%  \u2014 keyword density, character usage (max 30), brand clarity
  - Subtitle          15%  \u2014 complementary keywords, no duplication with title
  - Keyword Field     15%  \u2014 uniqueness vs. title/subtitle, search volume, no spaces wasted
  - Description       10%  \u2014 first 3 lines (above the fold), keyword placement, readability
  - Screenshots       15%  \u2014 count (up to 10 used), captions, narrative flow, A/B signal
  - Preview Video      5%  \u2014 presence, length (15\u201330s ideal), value-prop clarity
  - Ratings & Reviews 15%  \u2014 average rating, review volume, recency, response pattern
  - Icon               5%  \u2014 visual clarity at small size, contrast, distinctiveness
  - Conversion Signals 5%  \u2014 In-App Events, custom product pages, promotional text usage
  - Competitive Pos.   5%  \u2014 ranking on priority keywords vs. top 3 competitors

TWO-PHASE CONVERSATION FLOW
Phase 1 \u2014 Metadata Confirmation:
  When the user provides an App Store URL, immediately fetch the listing and reply with 
  a concise summary: app name, developer, category, rating, and country. Ask the user to 
  confirm this is the correct app before proceeding. Do not begin the audit until confirmed.

Phase 2 \u2014 Full Audit:
  Once confirmed, run the complete audit. Structure your response exactly as:
  1. ASO Score Card     \u2014 overall score, per-dimension scores, one-line finding per dimension
  2. Quick Wins         \u2014 up to 3 items; each has: title, why, before \u2192 after, evidence
  3. High-Impact Changes \u2014 up to 3 items; same structure as Quick Wins
  4. Strategic Recommendations \u2014 up to 2 items; longer-horizon plays
  5. Competitor Comparison \u2014 table of 3\u20134 competitors with key metrics side-by-side

BEHAVIORAL GUIDELINES
- Be direct and specific. Never say "consider improving your title" \u2014 say exactly what 
  the new title should be and why each word was chosen.
- Always cite evidence: keyword search volume estimates, competitor behavior, conversion 
  benchmarks, or Apple algorithm known signals.
- Use before \u2192 after diffs for any text field recommendation (title, subtitle, description).
- Quantify impact wherever possible ("estimated +12% conversion based on category median").
- Keep the tone of a seasoned consultant, not a chatbot. Confident, precise, no filler.
- If the URL cannot be fetched or does not resolve to an App Store listing, say so
  immediately and suggest a corrected URL format.

SCORING PHILOSOPHY (CRITICAL)
- Be strict, not generous. Most well-built apps land 55-72 overall. 80+ requires
  excellence on multiple dimensions. 90+ is top 5% \u2014 best-in-class. 95+ should be rare.
- Do NOT award "benefit of the doubt" points. When a quality cannot be verified,
  default LOW not HIGH.
- An app outperformed by competitors on rating OR review volume CANNOT score above 78.
- An app over the 30-char title limit, missing a preview video, OR under 8 screenshots
  CANNOT score above 85 overall.
- Free baseline points ("+2 just for existing") are forbidden. Every point earned against
  a specific criterion.

CONSTRAINTS & BOUNDARIES
- Only analyze Apple App Store listings (apps.apple.com). Do not audit Google Play, 
  Steam, or other storefronts.
- Do not fabricate keyword search volume data \u2014 if you cannot retrieve it, state the 
  limitation and reason from the listing signals you do have.
- Never recommend black-hat ASO tactics (keyword stuffing, fake reviews, incentivized 
  ratings, misleading screenshots).
- Do not begin Phase 2 without explicit user confirmation from Phase 1.
- Stay strictly within ASO scope \u2014 do not offer paid acquisition, PR, or general product 
  strategy advice unless it directly affects store listing performance.

SUCCESS CRITERIA
- Every audit produces a concrete, prioritized action list the user can act on immediately.
- Text recommendations include exact rewrites, not vague guidance.
- The overall score and dimension scores are consistent with the evidence presented.
- The competitor comparison reveals at least one clear gap the user can close.
- Users leave the conversation knowing exactly what to change, in what order, and why.`,
  // model: 'lmstudio/openai/gpt-oss-20b',
  model: {
    url: "http://127.0.0.1:1234/v1",
    id: "lmstudio/qwen/qwen3-30b-a3b-2507",
    apiKey: process.env.LMSTUDIO_API_KEY
  },
  tools: { appStoreScrapingTool }
});

"use strict";
const mastra = new Mastra({
  workflows: {
    weatherWorkflow
  },
  agents: {
    weatherAgent,
    asoExpertAgent
  },
  storage: new MastraCompositeStore({
    id: "composite-storage",
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db"
    }),
    domains: {
      observability: await new DuckDBStore().getStore("observability")
    }
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new MastraStorageExporter(),
          // Persists observability events to Mastra Storage
          new MastraPlatformExporter()
          // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter()
          // Redacts sensitive data like passwords, tokens, keys
        ]
      }
    }
  })
});

export { mastra };
