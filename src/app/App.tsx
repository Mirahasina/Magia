import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { VideoSection } from "./components/VideoSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { AgentsSection } from "./components/AgentsSection";
import { AboutSection } from "./components/AboutSection";
import { CTASection } from "./components/CTASection";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <VideoSection />
        <FeaturesSection />
        <HowItWorksSection />
        <AgentsSection />
        <AboutSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}