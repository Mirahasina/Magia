import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { DashboardPreview } from "./components/DashboardPreview";
import { FeaturesSection } from "./components/FeaturesSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { AgentsSection } from "./components/AgentsSection";
import { PricingSection } from "./components/PricingSection";
import { CTASection } from "./components/CTASection";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <DashboardPreview />
        <FeaturesSection />
        <HowItWorksSection />
        <AgentsSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}