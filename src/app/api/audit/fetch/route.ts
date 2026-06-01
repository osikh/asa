import { NextRequest, NextResponse } from 'next/server';
import { fetchAppStoreListing } from '@/mastra/tools/itune-scraping-tool';
import { fetchAppStoreListingViaFirecrawl } from '@/mastra/tools/itune-firecrawl-tool';

export const runtime = 'nodejs';

export type ScraperChoice = 'firecrawl' | 'manual';

export async function POST(req: NextRequest) {
  try {
    const { url, scraper = 'firecrawl' } = await req.json() as { url: string; scraper?: ScraperChoice };
    if (!url) return NextResponse.json({ ok: false, error: 'url required' }, { status: 400 });

    const listing = scraper === 'firecrawl'
      ? await fetchAppStoreListingViaFirecrawl(url)
      : await fetchAppStoreListing(url);

    return NextResponse.json({ ok: true, listing });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
