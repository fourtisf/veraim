import { prisma } from "@/lib/db";
import { rateLimited } from "@/lib/rateLimit";
import { ENV } from "@/lib/server/env";
import { clientIp } from "@/lib/server/ip";
import { fail, json, readJson } from "@/lib/server/http";
import { ModelError } from "@/lib/server/llm";
import { RunError, runAgent } from "@/lib/server/runner";
import { apiKeyUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Public API: POST /api/v1/agents/:slug/run  with  Authorization: Bearer veraim_…
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  if (rateLimited("run:" + clientIp(req), ENV.runsPerHourPerIp, 3600_000)) return fail("Too many runs from your network. Try again later.", 429);
  const user = await apiKeyUser(req);
  if (!user) return fail("Missing or invalid API key. Create one at /account.", 401);
  const agent = await prisma.agent.findUnique({ where: { slug: params.slug } });
  if (!agent || agent.hidden) return fail("Agent not found.", 404);
  const { input } = await readJson(req);
  try {
    const { call, freeRunsLeft, paidRunsLeft } = await runAgent(agent, user, String(input || ""), true);
    return json({
      id: call.id,
      answer: call.output,
      verdict: call.label,
      token: call.subject,
      seal: call.claimHash,
      status: call.status,
      grades_at: call.gradesAt,
      free_runs_left: freeRunsLeft,
      paid_runs_left: paidRunsLeft,
    });
  } catch (err) {
    if (err instanceof RunError) return fail(err.message, err.status);
    if (err instanceof ModelError) return fail(err.message, 503);
    console.error("api run failed", err);
    return fail("Internal error.", 500);
  }
}
