import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AgentPanel from "@/components/AgentPanel";
import { record } from "@/lib/format";
import { agentViews, recentCalls, recordSeries } from "@/lib/server/views";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const [agent] = await agentViews({ slug, hidden: false });
  return agent || null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await load(params.slug);
  if (!a) return { title: "Agent not found · Veraim" };
  const title = `${a.name} · Veraim`;
  const description = `${a.tagline}. Track record ${a.ranked ? record(a.trackRecord) : "building"} across ${a.graded} graded calls, every one sealed onchain.`;
  return { title, description, openGraph: { title, description, url: `/agents/${a.slug}` }, twitter: { card: "summary_large_image", title, description } };
}

export default async function AgentPage({ params }: { params: { slug: string } }) {
  const agent = await load(params.slug);
  if (!agent) notFound();
  const [calls, series] = await Promise.all([recentCalls({ agentId: agent.id, take: 30 }), recordSeries(agent.id)]);
  return (
    <main className="page">
      <div className="wrap">
        <a href="/#agents" className="kicker">← Leaderboard</a>
        <div className="panel" style={{ marginTop: 8 }}>
          <AgentPanel slug={agent.slug} initial={{ agent, calls, series, freeRunsLeft: null }} />
        </div>
      </div>
    </main>
  );
}
