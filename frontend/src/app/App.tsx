import { useState } from "react";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { AgentsSection } from "./components/AgentsSection";
import { PricingSection } from "./components/PricingSection";
import { CTASection } from "./components/CTASection";
import { Footer } from "./components/Footer";
import { Dashboard } from "./components/Dashboard";
import { ComparisonSection } from "./components/ComparisonSection";
import { FAQSection } from "./components/FAQSection";
import { useScrollReveal } from "./hooks/useScrollReveal";
import { ResetPasswordPage } from "./components/ResetPasswordPage";
import { AuthModals } from "./components/AuthModals";
import { VerifyEmail } from "./components/VerifyEmail";
import { ContactModal } from "./components/ContactModal";
import { PaymentModal } from "./components/PaymentModal";
import { UpdateCardModal } from "./components/UpdateCardModal";

export default function App() {
  useScrollReveal();
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("access_token"));
  const [currentView, setCurrentView] = useState<"landing" | "dashboard">(
    (localStorage.getItem("current_view") as "landing" | "dashboard") || (!!localStorage.getItem("access_token") ? "dashboard" : "landing")
  );
  
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("signup");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isUpdateCardOpen, setIsUpdateCardOpen] = useState(false);

  const [pendingOrder, setPendingOrder] = useState<{
    numAgents: number;
    isAnnual: boolean;
    totalPrice: number;
  } | null>(null);

  const [paymentDetails, setPaymentDetails] = useState({
    numAgents: 2,
    isAnnual: false,
    totalPrice: 44
  });

  const openAuth = (view: "login" | "signup") => {
    setAuthView(view);
    setIsAuthOpen(true);
  };

  const [refreshKey, setRefreshKey] = useState(0);

  const handleAuthSuccess = () => {
    setIsAuthOpen(false);
    setIsAuthenticated(true);
    setCurrentView("dashboard");
    localStorage.setItem("current_view", "dashboard");
    setRefreshKey(prev => prev + 1);
    if (pendingOrder) {
      setPaymentDetails(pendingOrder);
      setIsPaymentOpen(true);
      setPendingOrder(null);
    }
  };

  if (typeof window !== "undefined" && window.location.pathname === "/reset-password") {
    return <ResetPasswordPage />;
  }

  if (typeof window !== "undefined" && window.location.pathname === "/verify-email") {
    return <VerifyEmail />;
  }

  const handleLogout = async () => {
    // ... same logic
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await fetch("http://localhost:8000/api/auth/logout/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("access_token")}`
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch (e) {
        console.error("Logout error", e);
      }
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_view");
    setIsAuthenticated(false);
    setCurrentView("landing");
  };

  return (
    <div className="min-h-screen bg-white bg-mesh relative">
      {isAuthenticated && currentView === "dashboard" ? (
        <Dashboard 
          onLogout={handleLogout} 
          refreshKey={refreshKey}
          onUpgrade={(details) => {
            setPaymentDetails(details);
            setIsPaymentOpen(true);
          }}
          onUpdateCard={() => setIsUpdateCardOpen(true)}
        />
      ) : (
        <div className="flex flex-col">
          <Header
            isAuthenticated={isAuthenticated}
            onGoToDashboard={() => {
              setCurrentView("dashboard");
              localStorage.setItem("current_view", "dashboard");
            }}
            onLogin={() => {
                const token = localStorage.getItem("access_token");
                if (token) {
                    setIsAuthenticated(true);
                    setCurrentView("dashboard");
                    localStorage.setItem("current_view", "dashboard");
                } else {
                    openAuth("login");
                }
            }}
            openAuth={openAuth}
          />
          <main>
            <HeroSection onStart={() => openAuth("signup")} />
            <ComparisonSection />
            <AgentsSection />
            <HowItWorksSection />
            <PricingSection
              openAuth={openAuth}
              openContact={() => setIsContactOpen(true)}
              openPayment={(details) => {
                setPaymentDetails(details);
                setIsPaymentOpen(true);
              }}
            />
            <FAQSection />
            <CTASection onAction={() => openAuth("signup")} />
          </main>
          <Footer />
        </div>
      )}

      {/* Global Modals */}
      <AuthModals
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setPendingOrder(null);
        }}
        defaultView={authView}
        onSuccess={handleAuthSuccess}
      />

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        planDetails={paymentDetails}
        onSuccess={(isAlreadyAuth) => {
          if (!isAlreadyAuth) {
            setIsAuthOpen(true);
          } else {
            setRefreshKey(prev => prev + 1);
            setIsPaymentOpen(false);
            setCurrentView("dashboard");
            localStorage.setItem("current_view", "dashboard");
          }
        }}
        onAuthRequired={() => {
          setPendingOrder(paymentDetails);
          setIsPaymentOpen(false);
          openAuth("login");
        }}
      />

      <UpdateCardModal 
        isOpen={isUpdateCardOpen}
        onClose={() => setIsUpdateCardOpen(false)}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
      />

      {/* Hack for FacturationView to access UpdateCardModal via global state if needed, 
          but actually we'll pass it through Dashboard if we want a cleaner way. 
          Actually, let's pass an 'onUpdateCard' prop to Dashboard.
      */}
      {isAuthenticated && (
        <div className="hidden">
           {/* This is just to satisfy the logic of passing the trigger down */}
        </div>
      )}
    </div>
  );
}