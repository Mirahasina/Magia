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



interface HeaderProps {
  onLogin?: () => void;
  openAuth: (view: "login" | "signup") => void;
  isAuthenticated?: boolean;
  onGoToDashboard?: () => void;
}

export function Header({ onLogin, openAuth, isAuthenticated, onGoToDashboard }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



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
                    <NavigationMenuLink asChild>
                      <a href="#agents" className={cn(navigationMenuTriggerStyle(), "bg-transparent hover:bg-blue-50/50 text-gray-600 hover:text-blue-900 font-bold text-sm tracking-wide transition-all rounded-full px-5")}>
                        Agents
                      </a>
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <a href="#how-it-works" className={cn(navigationMenuTriggerStyle(), "bg-transparent hover:bg-blue-50/50 text-gray-600 hover:text-blue-900 font-bold text-sm tracking-wide transition-all rounded-full px-5")}>
                        Comment ça marche ?
                      </a>
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <a href="#pricing" className={cn(navigationMenuTriggerStyle(), "bg-transparent hover:bg-blue-50/50 text-gray-600 hover:text-blue-900 font-bold text-sm tracking-wide transition-all rounded-full px-5")}>
                        Tarification
                      </a>
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <a href="#home" className={cn(navigationMenuTriggerStyle(), "bg-transparent hover:bg-blue-50/50 text-gray-600 hover:text-blue-900 font-bold text-sm tracking-wide transition-all rounded-full px-5")}>
                        À propos
                      </a>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </nav>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Button
                  className="bg-gradient-to-r from-blue-900 to-blue-900 hover:from-blue-900 hover:to-blue-900 shadow-lg shadow-blue-800/25 px-8 py-5 font-bold text-white transition-all hover:scale-[1.02]"
                  onClick={onGoToDashboard}
                >
                  Accéder au Dashboard
                </Button>
              ) : (
                <>
                  <button
                    className="hidden md:inline-flex text-gray-500 hover:text-blue-900 font-bold text-sm transition-colors cursor-pointer tracking-wide"
                    onClick={() => openAuth("login")}
                  >
                    Se connecter
                  </button>
                  <Button
                    className="hidden md:inline-flex bg-gradient-to-r from-blue-600 to-blue-900 hover:from-blue-700 hover:to-blue-900 shadow-lg shadow-blue-500/25 px-6 py-5 font-bold text-white transition-all hover:scale-[1.02]"
                    onClick={() => openAuth("signup")}
                  >
                    Commencer gratuitement
                  </Button>
                </>
              )}
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
              <div className="pt-2">
                <a href="#agents" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 font-medium text-gray-700 hover:text-blue-600">Agents</a>
                <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 font-medium text-gray-700 hover:text-blue-600">Comment ça marche ?</a>
                <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 font-medium text-gray-700 hover:text-blue-600">Tarification</a>
                <a href="#home" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 font-medium text-gray-700 hover:text-blue-600">À propos</a>
              </div>
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-50">
                {isAuthenticated ? (
                  <Button
                    className="w-full justify-center h-12 bg-gradient-to-r from-blue-900 to-blue-900 text-white rounded-xl shadow-lg shadow-blue-800/20"
                    onClick={() => { onGoToDashboard?.(); setIsMobileMenuOpen(false); }}
                  >
                    Accéder au Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-center h-12 rounded-xl text-gray-700 border-gray-200"
                      onClick={() => { openAuth("login"); setIsMobileMenuOpen(false); }}
                    >
                      Se connecter
                    </Button>
                    <Button
                      className="w-full justify-center h-12 bg-gradient-to-r from-blue-600 to-blue-900 text-white rounded-xl shadow-lg shadow-blue-500/20"
                      onClick={() => { openAuth("signup"); setIsMobileMenuOpen(false); }}
                    >
                      Commencer gratuitement
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

    </>
  );
}