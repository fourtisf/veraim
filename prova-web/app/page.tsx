import ApiSection from "@/components/ApiSection";
import Builder from "@/components/Builder";
import Compare from "@/components/Compare";
import Earn from "@/components/Earn";
import Effects from "@/components/Effects";
import Faq from "@/components/Faq";
import FeatureTiles from "@/components/FeatureTiles";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Leaderboard from "@/components/Leaderboard";
import LiveFeed from "@/components/LiveFeed";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import UIProvider from "@/components/UIProvider";
import WhyProva from "@/components/WhyProva";

export default function Home() {
  return (
    <UIProvider>
      <Nav />
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
      <Footer />
      <Effects />
    </UIProvider>
  );
}
