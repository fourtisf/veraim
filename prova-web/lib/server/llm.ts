import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ENV } from "./env";

// What every agent returns: a plain-language answer plus a structured claim.
// Only claims with a token and a verdict/direction are sealed and graded.
export const AgentOutput = z.object({
  answer: z.string(),
  claim: z.object({
    kind: z.enum(["verdict", "direction", "none"]),
    token: z.string(),
    label: z.string(),
    verdict: z.enum(["SAFE", "CAUTION", "RISKY", "NONE"]),
    direction: z.enum(["LONG", "SHORT", "NONE"]),
  }),
});
export type AgentOutput = z.infer<typeof AgentOutput>;

// Provider model IDs for each builder option (override in .env).
// Claude models go through the Anthropic API; the others through OpenRouter.
const MODELS: Record<string, { provider: "anthropic" | "openrouter"; id: string }> = {
  "claude-sonnet": { provider: "anthropic", id: process.env.MODEL_CLAUDE_SONNET || "claude-sonnet-5" },
  gpt: { provider: "openrouter", id: process.env.MODEL_GPT || "openai/gpt-5-mini" },
  "llama-70b": { provider: "openrouter", id: process.env.MODEL_LLAMA_70B || "meta-llama/llama-3.3-70b-instruct" },
  deepseek: { provider: "openrouter", id: process.env.MODEL_DEEPSEEK || "deepseek/deepseek-chat" },
};

export class ModelError extends Error {}

export function modelAvailable(key: string) {
  const m = MODELS[key];
  if (!m) return false;
  return m.provider === "anthropic" ? !!ENV.anthropicKey : !!ENV.openrouterKey;
}

export async function runModel(key: string, system: string, user: string): Promise<AgentOutput> {
  const m = MODELS[key];
  if (!m) throw new ModelError(`Unknown model "${key}"`);
  if (!modelAvailable(key)) throw new ModelError("This agent's model isn't connected yet. Try again soon.");
  return m.provider === "anthropic" ? runClaude(m.id, system, user) : runOpenRouter(m.id, system, user);
}

let anthropic: Anthropic | null = null;

async function runClaude(model: string, system: string, user: string): Promise<AgentOutput> {
  anthropic ??= new Anthropic({ apiKey: ENV.anthropicKey, baseURL: ENV.anthropicBase || undefined, timeout: 90_000, maxRetries: 2 });
  try {
    const res = await anthropic.messages.parse({
      model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: zodOutputFormat(AgentOutput) },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") throw new ModelError("The agent declined to answer this one.");
    if (!res.parsed_output) throw new ModelError("The agent's answer couldn't be read. Please try again.");
    return res.parsed_output;
  } catch (err) {
    if (err instanceof ModelError) throw err;
    if (err instanceof Anthropic.RateLimitError) throw new ModelError("The model is busy. Please try again in a minute.");
    if (err instanceof Anthropic.AuthenticationError) throw new ModelError("The model isn't connected correctly (API key).");
    if (err instanceof Anthropic.APIError) throw new ModelError(`Model error (${err.status}). Please try again.`);
    throw err;
  }
}

async function runOpenRouter(model: string, system: string, user: string): Promise<AgentOutput> {
  const res = await fetch(`${ENV.openrouterBase}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.openrouterKey}`,
      "HTTP-Referer": ENV.siteUrl,
      "X-Title": "Prova",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name: "agent_output", strict: true, schema: z.toJSONSchema(AgentOutput) } },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (res.status === 429) throw new ModelError("The model is busy. Please try again in a minute.");
  if (res.status === 401 || res.status === 403) throw new ModelError("The model isn't connected correctly (API key).");
  if (!res.ok) throw new ModelError(`Model error (${res.status}). Please try again.`);
  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content || "";
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    const parsed = AgentOutput.safeParse(JSON.parse(json));
    if (parsed.success) return parsed.data;
  } catch {}
  throw new ModelError("The agent's answer couldn't be read. Please try again.");
}
