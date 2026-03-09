import { useState } from "react";
import { Button } from "./ui/button";
import { Layout, Users, BarChart, ChevronDown, Menu, X, Bot } from "lucide-react";
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

const solutions = [
  {
    title: "Ventes & Prospection",
    description: "Automatisez votre tunnel de vente et la qualification de leads.",
    icon: Layout,
  },
  {
    title: "Support Client",
    description: "Des agents IA qui répondent à vos clients 24/7.",
    icon: Users,
  },
  {
    title: "Finance & RH",
    description: "Gérez vos factures et vos processus internes sans effort.",
    icon: BarChart,
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Logo />

            <nav className="hidden md:flex items-center">
              <NavigationMenu>
                <NavigationMenuList className="gap-4">
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent hover:bg-gray-50/50 text-gray-500 font-semibold text-sm tracking-wide">
                      Solutions
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                        {solutions.map((solution) => (
                          <li key={solution.title}>
                            <NavigationMenuLink asChild>
                              <a
                                href="#"
                                className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-50 hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                              >
                                <div className="flex items-center gap-2 text-sm font-medium leading-none mb-1 text-gray-900 border-none transition-none shadow-none ring-0">
                                  <solution.icon className="w-4 h-4 text-purple-600" />
                                  {solution.title}
                                </div>
                                <p className="line-clamp-2 text-sm leading-snug text-gray-500">
                                  {solution.description}
                                </p>
                              </a>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <a href="#features" className={cn(navigationMenuTriggerStyle(), "bg-transparent hover:bg-gray-50/50 text-gray-500 font-semibold text-sm tracking-wide")}>
                      Fonctionnalités
                    </a>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <a href="#pricing" className={cn(navigationMenuTriggerStyle(), "bg-transparent hover:bg-gray-50/50 text-gray-500 font-semibold text-sm tracking-wide")}>
                      Tarification
                    </a>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <a href="#about" className={cn(navigationMenuTriggerStyle(), "bg-transparent hover:bg-gray-50/50 text-gray-500 font-semibold text-sm tracking-wide")}>
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
                className="hidden md:inline-flex bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 px-6 py-5 rounded-xl font-bold text-white transition-all hover:scale-[1.02]"
                onClick={() => openAuth("signup")}
              >
                Commencer gratuitement
              </Button>
              <button
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 animate-in slide-in-from-top duration-300">
            <div className="px-4 pt-2 pb-6 space-y-4">
              <div className="space-y-1">
                <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Solutions</p>
                {solutions.map((solution) => (
                  <a
                    key={solution.title}
                    href="#"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-blue-50 text-gray-700 transition-colors"
                  >
                    <solution.icon className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{solution.title}</p>
                    </div>
                  </a>
                ))}
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