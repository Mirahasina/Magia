import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { VideoSection } from "./components/VideoSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { AgentsSection } from "./components/AgentsSection";
import { AboutSection } from "./components/AboutSection";
import { CTASection } from "./components/CTASection";
import { Footer } from "./components/Footer";
import { useScrollReveal } from "./hooks/useScrollReveal";

export default function App() {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <div className="scroll-reveal">
          <VideoSection />
        </div>
        <div className="scroll-reveal">
          <FeaturesSection />
        </div>
        <div className="scroll-reveal">
          <HowItWorksSection />
        </div>
        <div className="scroll-reveal">
          <AgentsSection />
        </div>
        <div className="scroll-reveal">
          <AboutSection />
        </div>
        <div className="scroll-reveal">
          <CTASection />
        </div>
      </main>
      <Footer />
    </div>
  );
}