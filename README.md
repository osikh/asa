# Store Audit

ASO audit tool for Apple App Store listings.
Takes an App Store URL, fetches listing data, analyzes it with a Mastra workflow, and returns an ASO score with recommendations.

## Demo

![Store Audit demo](./sample.gif)

## Stack

- Next.js
- TypeScript
- Mastra
- Firecrawl
- iTunes Lookup API
- LM Studio / OpenRouter

## Setup

```bash
npm install
cp .env.example .env
```

```env
LMSTUDIO_API_KEY=
OPENROUTER_API_KEY=
MODEL_PROVIDER='lmstudio'
FIRECRAWL_API_KEY=
```

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Mastra commands:

```bash
npm run mastra-dev
npm run mastra-build
```

## Model Providers

### LM Studio (recommended)

```env
MODEL_PROVIDER='lmstudio'
```

Endpoint:

```text
http://127.0.0.1:1234/v1
```

Model:

```text
lmstudio/qwen/qwen3-30b-a3b-2507
```

### OpenRouter

```env
MODEL_PROVIDER='openrouter'
```

Endpoint:

```text
https://openrouter.ai/api/v1
```

Model:

```text
qwen/qwen3-30b-a3b-thinking-2507
```

## Flow

1. User submits App Store URL
2. App metadata + screenshots are fetched
3. User confirms the app
4. Mastra workflow analyzes listing
5. Model returns structured ASO scoring
6. Hard caps + validations are applied
7. Final audit result is returned

## Features

- ASO scoring
- Screenshot analysis
- Preview video detection
- Competitor comparison
- Structured recommendations
- Hard score caps for consistency

## Important Files

```text
src/mastra/workflows/audit-workflow.ts
```

Main audit workflow.

```text
src/mastra/agents/asoanalyzer-agent.ts
```

Main scoring agent.

```text
src/lib/firecrawl.ts
```

Fetches screenshots and preview video data.

```text
src/mastra/tools/itune-scraping-tool.ts
```

Fetches App Store metadata + competitors.

## Notes

- Firecrawl is used because App Store media scraping is unreliable otherwise
- LM Studio is the preferred provider
- Weather workflow files are leftover Mastra demo code
