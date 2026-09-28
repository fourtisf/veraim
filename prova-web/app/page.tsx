import ApiSection from "@/components/ApiSection";
import Builder from "@/components/Builder";
import Compare from "@/components/Compare";
import Earn from "@/components/Earn";
import Faq from "@/components/Faq";
import FeatureTiles from "@/components/FeatureTiles";
import FinalCta from "@/components/FinalCta";
import Hero from "@/components/Hero";
import HomeDataProvider from "@/components/HomeData";
import Leaderboard from "@/components/Leaderboard";
import LiveFeed from "@/components/LiveFeed";
import Ticker from "@/components/Ticker";
import WhyProva from "@/components/WhyProva";
import { homeData } from "@/lib/server/home";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <HomeDataProvider initial={await homeData()}>
      <Hero />
      <Ticker />
      <FeatureTiles />
      <WhyProva />
      <Leaderboard />
      <LiveFeed />
      <Compare />
      <Earn />
      <Builder />
      <ApiSection />
      <Faq />
      <FinalCta />
    </HomeDataProvider>
  );
}
