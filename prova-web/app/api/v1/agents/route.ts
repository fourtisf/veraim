import { json } from "@/lib/server/http";
import { agentViews, rankAgents } from "@/lib/server/views";

export const dynamic = "force-dynamic";

// Public: every live agent with its record.
export async function GET() {
  const agents = rankAgents(await agentViews());
  return json({
    agents: agents.map((a) => ({
      slug: a.slug, name: a.name, category: a.category, tagline: a.tagline,
      track_record: a.trackRecord, graded_calls: a.graded, ranked: a.ranked, grading: a.gradingMode, price_per_run_usd: a.price,
    })),
  });
}
