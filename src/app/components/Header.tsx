import { useState } from "react";
import { Button } from "./ui/button";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";
import { cn } from "./ui/utils";
import { AuthModals } from "./AuthModals";
import { Logo } from "./Logo";

const headerAgents = [
  {
    title: "LEAD QUALIFIER PRO",
    description: "Qualification et scoring des leads entrants. Identifie les chauds, route les froids, enrichit HubSpot automatiquement.",
    tags: ["EMAIL", "WEB CHAT"],
    time: "90 sec",
  },
  {
    title: "EMAIL RESPONDER",
    description: "Répond avec le ton de votre marque sur Gmail et Outlook. Score de confiance avant chaque envoi, brouillons en 1 clic.",
    tags: ["GMAIL", "OUTLOOK"],
    time: "2 min",
  },
  {
    title: "MEETING SETTER",
    description: "Prise de RDV automatique synchronisée avec Google Calendar. Mode Suggest par défaut — vous validez avant confirmation.",
    tags: ["GMAIL", "CHAT"],
    time: "2 min",
  },
  {
    title: "WHATSAPP SALES",
    description: "Prospection et suivi sur le canal dominant en Afrique subsaharienne. WhatsApp Business API officielle. Add-on +€49.",
    tags: ["WHATSAPP", "ADD-ON"],
    time: "3 min",
  },
  {
    title: "FOLLOW-UP AGENT",
    description: "Relances intelligentes et personnalisées. Ne laissez plus jamais un prospect sans réponse. J+1, J+3, J+7 configurables.",
    tags: ["GMAIL", "SMS"],
    time: "90 sec",
  },
  {
    title: "CRM ENRICHER",
    description: "Enrichissement automatique de HubSpot et Salesforce. Full Auto — aucune intervention humaine. 99% de précision.",
    tags: ["HUBSPOT", "SALESFORCE"],
    time: "2 min",
  },
];

interface HeaderProps {
  onLogin?: () => void;
}

export function Header({ onLogin }: HeaderProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("signup");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const openAuth = (view: "login" | "signup") => {
    setAuthView(view);
    setIsAuthOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleAuthSuccess = () => {
    setIsAuthOpen(false);
    onLogin?.();
  };


  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/40 backdrop-blur-2xl border-b border-gray-100/50 transition-all duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Logo className="hover:scale-105 transition-transform duration-300" />

            <nav className="hidden md:flex items-center">
              <NavigationMenu>
                <NavigationMenuList className="gap-4">
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent hover:bg-indigo-50/50 text-gray-600 hover:text-indigo-600 font-bold text-sm tracking-wide transition-all rounded-full px-5">
                      Agents
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-6 md:w-[650px] md:grid-cols-2 lg:w-[850px] bg-white/95 backdrop-blur-xl rounded-[2rem] border border-gray-100 shadow-2xl">
                        {headerAgents.map((agent) => (
                          <li key={agent.title}>
                            <NavigationMenuLink asChild>
                              <a
                                href="#"
                                className="block group select-none space-y-3 rounded-2xl p-5 leading-none no-underline outline-none transition-all hover:bg-gray-900 focus:bg-gray-900 border border-transparent shadow-sm hover:shadow-xl hover:-translate-y-1"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-3">

                                    <div className="text-sm font-bold leading-none text-gray-900 group-hover:text-white transition-colors">
                                      {agent.title}
                                    </div>
                                  </div>
                                  <p className="line-clamp-2 text-sm leading-relaxed text-gray-500 group-hover:text-gray-400 transition-colors">
                                    {agent.description}
                                  </p>
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-transparent group-hover:border-gray-800 transition-colors">
                                    <div className="flex gap-2">
                                      {agent.tags.map(tag => (
                                        <span key={tag} className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-md group-hover:bg-gray-800 group-hover:text-gray-300 transition-colors">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-orange-500">
                                      {agent.time}
                                    </div>
                                  </div>
                                </div>
                              </a>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <a href="#features" className={cn(navigationMenuTriggerStyle(), "bg-transparent hover:bg-indigo-50/50 text-gray-600 hover:text-indigo-600 font-bold text-sm tracking-wide transition-all rounded-full px-5")}>
                      Fonctionnalités
                    </a>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <a href="#pricing" className={cn(navigationMenuTriggerStyle(), "bg-transparent hover:bg-indigo-50/50 text-gray-600 hover:text-indigo-600 font-bold text-sm tracking-wide transition-all rounded-full px-5")}>
                      Tarification
                    </a>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <a href="#about" className={cn(navigationMenuTriggerStyle(), "bg-transparent hover:bg-indigo-50/50 text-gray-600 hover:text-indigo-600 font-bold text-sm tracking-wide transition-all rounded-full px-5")}>
                      À propos
                    </a>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </nav>

            <div className="flex items-center gap-4">
              <button
                className="hidden md:inline-flex text-gray-500 hover:text-indigo-600 font-bold text-sm transition-colors cursor-pointer tracking-wide"
                onClick={() => openAuth("login")}
              >
                Se connecter
              </button>
              <Button
                className="hidden md:inline-flex bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 px-6 py-5 font-bold text-white transition-all hover:scale-[1.02]"
                onClick={() => openAuth("signup")}
              >
                Commencer gratuitement
              </Button>
              <button
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-xl font-black"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 animate-in slide-in-from-top duration-300">
            <div className="px-4 pt-2 pb-6 space-y-4">
              <div className="space-y-1">
                <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Agents</p>
                <div className="space-y-2">
                  {headerAgents.map((agent) => (
                    <a
                      key={agent.title}
                      href="#"
                      className="flex flex-col gap-2 px-3 py-3 rounded-xl hover:bg-gray-900 group transition-colors border border-transparent hover:border-gray-800"
                    >
                      <div className="flex items-center gap-3">

                        <div className="font-bold text-gray-900 group-hover:text-white transition-colors text-sm">{agent.title}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-gray-50">
                <a href="#features" className="block px-3 py-3 font-medium text-gray-700 hover:text-blue-600">Fonctionnalités</a>
                <a href="#pricing" className="block px-3 py-3 font-medium text-gray-700 hover:text-blue-600">Tarification</a>
                <a href="#about" className="block px-3 py-3 font-medium text-gray-700 hover:text-blue-600">À propos</a>
              </div>
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-50">
                <Button
                  variant="outline"
                  className="w-full justify-center h-12 rounded-xl text-gray-700 border-gray-200"
                  onClick={() => openAuth("login")}
                >
                  Se connecter
                </Button>
                <Button
                  className="w-full justify-center h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/20"
                  onClick={() => openAuth("signup")}
                >
                  Commencer gratuitement
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <AuthModals
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultView={authView}
        onSuccess={handleAuthSuccess}
      />

    </>
  );
}