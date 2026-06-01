import FirecrawlApp from '@mendable/firecrawl-js';
import * as cheerio from 'cheerio'

let firecrawl: FirecrawlApp | null = null;
const getFirecrawl = () => {
  if (!firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY not set');
    firecrawl = new FirecrawlApp({ apiKey });
  }
  return firecrawl;
};

type FirecrawlResult = {
  pictureCount: number
  videoCount: number
  imageSources: string[]
}

type CacheEntry = {
  data: FirecrawlResult
  expiresAt: number
}

// In-memory cache
// why? just to avoid consuming credit for nothing and we need it to for images and videos
const cache = new Map<string, CacheEntry>()
const CACHE_TIMEOUT = 1000 * 60 * 60

export async function firecrawlGet(url: string): Promise<FirecrawlResult> {
  try {
    const cached = cache.get(url)
    if (cached && cached.expiresAt > Date.now()) {
      console.log('Firecrawl cache found:', url)
      return cached.data
    }

    console.log('Firecrawl fresh scrape:', url)

    const result = await getFirecrawl().scrape(url, { formats: ['html'] })
    const html = result.html

    if (!html) {
      console.error("Firecrawl error: no HTML return")
      return { pictureCount: 0, videoCount: 0, imageSources: [] }
    }

    const $ = cheerio.load(html)

    const parentSelectors = [
      '#product_media_phone_',
      '#product_media_mac_',
      '#product_media_ipad_',
    ]

    let pictureCount = 0
    let videoCount = 0

    const imageSources: string[] = []

    for (const selector of parentSelectors) {
      $(selector).each((_, parent) => {
        const $parent = $(parent)
        
        const pictures = $parent.find('[aria-label="Screenshot"]')
        pictureCount += pictures.length

        pictures.each((_, picture) => {
          const imgSrc = $(picture).find('img').attr('src')
          imageSources.push( imgSrc ?? "not_found" )
        })

        const videos = $parent.find('[aria-label="Video"]')
        videoCount += videos.length
      })
    }

    const data: FirecrawlResult = {
      pictureCount,
      videoCount,
      imageSources,
    }

    // Save cache
    cache.set(url, {
      data,
      expiresAt: Date.now() + CACHE_TIMEOUT,
    })

    return data

  } catch (error) {
    console.error(error)

    return { pictureCount: 0, videoCount: 0, imageSources: [] }
  }
}