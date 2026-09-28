import { prisma } from "@/lib/db";
import { rateLimited } from "@/lib/rateLimit";
import { ENV } from "@/lib/server/env";
import { clientIp } from "@/lib/server/ip";
import { fail, json, readJson } from "@/lib/server/http";
import { ModelError } from "@/lib/server/llm";
import { RunError, runAgent } from "@/lib/server/runner";
import { currentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  if (rateLimited("run:" + clientIp(req), ENV.runsPerHourPerIp, 3600_000)) return fail("Too many runs from your network. Try again later.", 429);
  const user = await currentUser();
  if (!user) return fail("Connect your wallet to run agents. You get 5 free runs per agent.", 401);
  const agent = await prisma.agent.findUnique({ where: { slug: params.slug } });
  if (!agent) return fail("Agent not found.", 404);
  const { input } = await readJson(req);
  try {
    return json(await runAgent(agent, user, String(input || "")));
  } catch (err) {
    if (err instanceof RunError) return fail(err.message, err.status);
    if (err instanceof ModelError) return fail(err.message, 503);
    console.error("run failed", err);
    return fail("Something went wrong running this agent. Please try again.", 500);
  }
}
