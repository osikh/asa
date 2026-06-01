import { Agent } from "@mastra/core/agent";

// V2
export const asoAnalyzerAgent = new Agent({
    id: "aso-analyzer-agent",
    name: "ASO Analyzer Agent",
    instructions: `You are an ASO scoring engine. The user message contains pre-fetched App Store listing data and a strict scoring rubric.

YOUR JOB:
- Apply the rubric to the data
- Output ONLY a single \`\`\`json fenced block matching the schema in the user message

ABSOLUTE RULES:
- NEVER call any tool — you have no tools available
- NEVER ask for a URL, confirmation, or clarification — the data is already provided
- NEVER output prose, preamble, refusal, or explanation outside the JSON block
- NEVER attempt to fetch, verify, or look up anything — score from the data you have

Be strict, not generous. Default LOW when a quality is unverifiable.`,
    model: {
        url: (process.env.MODEL_PROVIDER == 'openrouter') ? "https://openrouter.ai/api/v1" : "http://127.0.0.1:1234/v1",
        id: (process.env.MODEL_PROVIDER == 'openrouter') ? "qwen/qwen3-30b-a3b-thinking-2507" : "lmstudio/qwen/qwen3-30b-a3b-2507",
        apiKey: (process.env.MODEL_PROVIDER == 'openrouter') ? process.env.OPENROUTER_API_KEY : process.env.LMSTUDIO_API_KEY,
    },
    tools: {},
});
