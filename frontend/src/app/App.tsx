import { useState, useEffect } from "react";
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
import { AcceptInvitation } from "./components/AcceptInvitation";
import { ContactModal } from "./components/ContactModal";
import { PaymentModal } from "./components/PaymentModal";
import { UpdateCardModal } from "./components/UpdateCardModal";
import { EnterpriseModal } from "./components/EnterpriseModal";
import { AgentsProvider } from "./context/AgentsContext";
import { StorageKeys, clearSession } from "../lib/storage";

const noop = () => {};

export default function App() {
  useScrollReveal();

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem(StorageKeys.ACCESS_TOKEN)
  );
  const [currentView, setCurrentView] = useState<"landing" | "dashboard">(
    (localStorage.getItem(StorageKeys.CURRENT_VIEW) as "landing" | "dashboard") ||
      (!!localStorage.getItem(StorageKeys.ACCESS_TOKEN) ? "dashboard" : "landing")
  );

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("signup");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isEnterpriseOpen, setIsEnterpriseOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isUpdateCardOpen, setIsUpdateCardOpen] = useState(false);
  const [initialEmail, setInitialEmail] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingEnterpriseRequest, setPendingEnterpriseRequest] = useState(false);

  const [pendingOrder, setPendingOrder] = useState<{
    numAgents: number;
    isAnnual: boolean;
    totalPrice: number;
  } | null>(null);

  const [paymentDetails, setPaymentDetails] = useState({
    numAgents: 2,
    isAnnual: false,
    totalPrice: 44,
  });

  const openAuth = (view: "login" | "signup") => {
    setAuthView(view);
    setIsAuthOpen(true);
  };

  const handleRequestEnterprise = () => {
    if (isAuthenticated) {
      setIsEnterpriseOpen(true);
    } else {
      setPendingEnterpriseRequest(true);
      openAuth("login");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoOpen = params.get("autoOpen");
    const email = params.get("email");

    if (autoOpen === "login" || autoOpen === "signup") {
      setInitialEmail(email || "");
      openAuth(autoOpen as "login" | "signup");
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthOpen(false);
    setIsAuthenticated(true);
    setCurrentView("dashboard");
    localStorage.setItem(StorageKeys.CURRENT_VIEW, "dashboard");
    localStorage.removeItem(StorageKeys.ACTIVE_TAB);
    localStorage.removeItem(StorageKeys.BACKOFFICE_TAB);
    setRefreshKey((prev) => prev + 1);
    window.dispatchEvent(new CustomEvent("auth-success"));

    if (pendingOrder) {
      setPaymentDetails(pendingOrder);
      setIsPaymentOpen(true);
      setPendingOrder(null);
    }

    if (pendingEnterpriseRequest) {
      setIsEnterpriseOpen(true);
      setPendingEnterpriseRequest(false);
    }
  };

  if (window.location.pathname === "/reset-password") {
    return <ResetPasswordPage />;
  }

  if (window.location.pathname === "/verify-email") {
    return <VerifyEmail />;
  }

  if (window.location.pathname === "/accept-invitation") {
    return <AcceptInvitation onAuthSuccess={handleAuthSuccess} openAuth={openAuth} />;
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem(StorageKeys.REFRESH_TOKEN);
    if (refreshToken) {
      try {
        await fetch("http://localhost:8000/api/auth/logout/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(StorageKeys.ACCESS_TOKEN)}`,
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch (error) {
        console.error("Logout error", error);
      }
    }
    clearSession();
    setIsAuthenticated(false);
    setCurrentView("landing");
  };

  return (
    <AgentsProvider>
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
                localStorage.setItem(StorageKeys.CURRENT_VIEW, "dashboard");
              }}
              onLogin={() => {
                const token = localStorage.getItem(StorageKeys.ACCESS_TOKEN);
                if (token) {
                  setIsAuthenticated(true);
                  setCurrentView("dashboard");
                  localStorage.setItem(StorageKeys.CURRENT_VIEW, "dashboard");
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
                onRequestEnterprise={handleRequestEnterprise}
                openPayment={(details) => {
                  setPaymentDetails(details);
                  setIsPaymentOpen(true);
                }}
              />
              <FAQSection />
              <CTASection onAction={() => openAuth("signup")} onContact={() => setIsContactOpen(true)} />
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
          initialEmail={initialEmail}
        />

        <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />

        <EnterpriseModal
          isOpen={isEnterpriseOpen}
          onClose={() => setIsEnterpriseOpen(false)}
          onSuccess={() => setRefreshKey(prev => prev + 1)}
        />

        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          planDetails={paymentDetails}
          onSuccess={(isAlreadyAuth) => {
            if (!isAlreadyAuth) {
              setIsAuthOpen(true);
            } else {
              window.dispatchEvent(new CustomEvent("auth-success"));
              setRefreshKey((prev) => prev + 1);
              setIsPaymentOpen(false);
              setCurrentView("dashboard");
              localStorage.setItem(StorageKeys.CURRENT_VIEW, "dashboard");
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
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />
      </div>
    </AgentsProvider>
  );
}