import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import FirecrawlApp from '@mendable/firecrawl-js';
import {
  fetchAppStoreListing,
  type HtmlFetcher,
  type AppStoreListing,
} from './itune-scraping-tool';

let firecrawl: FirecrawlApp | null = null;
const getFirecrawl = () => {
  if (!firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY not set');
    firecrawl = new FirecrawlApp({ apiKey });
  }
  return firecrawl;
};

const firecrawlHtmlFetcher: HtmlFetcher = async (url) => {
  try {
    const result = await getFirecrawl().scrape(url, { formats: ['html'] });
    console.log(result.html)
    return result.html ?? null;
  } catch {
    return null;
  }
};

export const fetchAppStoreListingViaFirecrawl = (url: string): Promise<AppStoreListing> =>
  fetchAppStoreListing(url, firecrawlHtmlFetcher);

export const appStoreFirecrawlTool = createTool({
  id: 'fetch-app-store-listing-firecrawl',
  description: 'Same as fetch-app-store-listing but uses Firecrawl headless browser for JS-rendered content',
  inputSchema: z.object({ url: z.string() }),
  execute: async ({ url }) => fetchAppStoreListingViaFirecrawl(url),
});
