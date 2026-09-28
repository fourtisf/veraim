import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ModelError } from "@/lib/server/llm";
import { RunError, runAgent } from "@/lib/server/runner";
import { apiKeyUser } from "@/lib/server/session";
import { agentViews, rankAgents, recentCalls } from "@/lib/server/views";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Prova MCP server (Streamable HTTP, stateless, JSON responses).
// Add to an MCP client as {"url": "https://<site>/api/mcp", "headers": {"Authorization": "Bearer prova_…"}}.
const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const TOOLS = [
  {
    name: "list_agents",
    description: "List Prova agents with their verified track record (hit rate across graded calls), graded call count and whether they are ranked.",
    inputSchema: { type: "object", properties: { category: { type: "string", description: "Optional: Security, Trading calls, Research or Social" } } },
  },
  {
    name: "get_agent",
    description: "Get one agent's details and its latest calls, each with its onchain seal and grade (hit, miss or open).",
    inputSchema: { type: "object", properties: { slug: { type: "string", description: "Agent slug, e.g. bundle-hound" } }, required: ["slug"] },
  },
  {
    name: "run_agent",
    description: "Ask an agent about a token on Robinhood Chain (include its 0x address or $TICKER). Returns the answer and, for gradable calls, the claim hash that gets sealed onchain. Uses the caller's API key and runs.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Agent slug" }, input: { type: "string", description: "Question, e.g. 'Is 0x… bundled?'" } },
      required: ["slug", "input"],
    },
  },
];

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: any };

const result = (id: Rpc["id"], r: unknown) => ({ jsonrpc: "2.0", id, result: r });
const error = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const text = (obj: unknown, isError = false) => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }], isError });

async function callTool(req: Request, name: string, args: any) {
  if (name === "list_agents") {
    const agents = rankAgents(await agentViews()).filter((a) => !args?.category || a.category === args.category);
    return text(agents.map((a) => ({ slug: a.slug, name: a.name, category: a.category, tagline: a.tagline, track_record_pct: a.trackRecord, graded_calls: a.graded, ranked: a.ranked, grading: a.gradingLabel, price_per_run_usd: a.price })));
  }
  if (name === "get_agent") {
    const [a] = await agentViews({ slug: String(args?.slug || ""), hidden: false });
    if (!a) return text(`No agent "${args?.slug}".`, true);
    const calls = await recentCalls({ agentId: a.id, take: 15 });
    return text({
      slug: a.slug, name: a.name, tagline: a.tagline, track_record_pct: a.trackRecord, graded_calls: a.graded, ranked: a.ranked, grading: a.gradingLabel,
      calls: calls.map((c) => ({ verdict: c.label, token: c.subject, status: c.status, seal: c.claimHash, seal_tx: c.sealTx, made_at: c.createdAt, grades_at: c.gradesAt })),
    });
  }
  if (name === "run_agent") {
    const user = await apiKeyUser(req);
    if (!user) return text("run_agent needs an API key: set the Authorization: Bearer prova_… header (create a key at /account).", true);
    const agent = await prisma.agent.findUnique({ where: { slug: String(args?.slug || "") } });
    if (!agent || agent.hidden) return text(`No agent "${args?.slug}".`, true);
    try {
      const { call, freeRunsLeft, paidRunsLeft } = await runAgent(agent, user, String(args?.input || ""), true);
      return text({ answer: call.output, verdict: call.label, token: call.subject, seal: call.claimHash, status: call.status, grades_at: call.gradesAt, free_runs_left: freeRunsLeft, paid_runs_left: paidRunsLeft });
    } catch (err) {
      if (err instanceof RunError || err instanceof ModelError) return text(err.message, true);
      throw err;
    }
  }
  return null;
}

async function handle(req: Request, msg: Rpc) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return error(msg?.id, -32600, "Invalid request");
  const isNotification = msg.id === undefined;
  switch (msg.method) {
    case "initialize": {
      const asked = msg.params?.protocolVersion;
      return result(msg.id, {
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "prova", version: "1.0.0" },
        instructions: "Prova ranks crypto AI agents on Robinhood Chain by verified track record. Use list_agents to find agents, get_agent for their sealed calls, and run_agent to ask one about a token.",
      });
    }
    case "ping":
      return result(msg.id, {});
    case "tools/list":
      return result(msg.id, { tools: TOOLS });
    case "tools/call": {
      try {
        const r = await callTool(req, msg.params?.name, msg.params?.arguments);
        return r ? result(msg.id, r) : error(msg.id, -32602, `Unknown tool: ${msg.params?.name}`);
      } catch (err) {
        console.error("mcp tool failed", err);
        return result(msg.id, text("Internal error running the tool.", true));
      }
    }
    default:
      return isNotification ? null : error(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json(error(null, -32700, "Parse error"), { status: 400 });
  const msgs: Rpc[] = Array.isArray(body) ? body : [body];
  const out = (await Promise.all(msgs.map((m) => (m?.method?.startsWith("notifications/") ? null : handle(req, m))))).filter(Boolean);
  if (!out.length) return new Response(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? out : out[0]);
}

export async function GET() {
  return new Response("This MCP server uses POST (Streamable HTTP, JSON responses).", { status: 405, headers: { allow: "POST" } });
}
