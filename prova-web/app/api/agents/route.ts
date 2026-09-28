import { prisma } from "@/lib/db";
import { NewAgent, slugify } from "@/lib/server/agentInput";
import { fail, json, readJson } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import { agentViews, rankAgents } from "@/lib/server/views";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ agents: rankAgents(await agentViews()) });
}

// Builder "Launch agent": creates a live agent owned by the signed-in wallet.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet to launch an agent.", 401);
  const parsed = NewAgent.safeParse(await readJson(req));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Check the form and try again.");
  const recent = await prisma.agent.count({ where: { creatorId: user.id, createdAt: { gte: new Date(Date.now() - 86400_000) } } });
  if (recent >= 3) return fail("You can launch up to 3 agents a day.", 429);

  const d = parsed.data;
  const base = slugify(d.name);
  let slug = base;
  for (let i = 2; await prisma.agent.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

  const agent = await prisma.agent.create({
    data: {
      slug,
      name: d.name,
      tagline: d.tagline,
      category: d.category,
      instructions: d.instructions,
      model: d.model,
      gradingMode: d.gradingMode,
      tools: d.tools,
      ticker: d.ticker,
      pricePerRunUsd: d.price,
      openingBuy: d.openingBuy || null,
      creatorId: user.id,
    },
  });
  return json({ slug: agent.slug }, 201);
}
