import { useState } from "react";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
// import { VideoSection } from "./components/VideoSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { AgentsSection } from "./components/AgentsSection";
import { PricingSection } from "./components/PricingSection";
import { CTASection } from "./components/CTASection";
import { Footer } from "./components/Footer";
import { Dashboard } from "./components/Dashboard";
import { ComparisonSection } from "./components/ComparisonSection";
import { FAQSection } from "./components/FAQSection";
import { useScrollReveal } from "./hooks/useScrollReveal";

export default function App() {
  useScrollReveal();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return <Dashboard onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-white bg-mesh">
      <Header onLogin={() => setIsAuthenticated(true)} />
      <main>
        <HeroSection />
        {/* <VideoSection /> */}
        {/* <FeaturesSection /> */}
        <ComparisonSection />
        <HowItWorksSection />
        {/* <AgentsSection /> */}
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}