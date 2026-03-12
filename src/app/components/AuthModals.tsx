"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "./ui/dialog";
import { Logo } from "./Logo";
import { Play } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import authImage from "../../assets/auth-futuristic.png";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultView?: "login" | "signup";
    onSuccess?: () => void;
}

const FloatingInput = ({ label, type = "text", id, ...props }: any) => {
    return (
        <div className="relative">
            <input
                type={type}
                id={id}
                className="block px-4 pb-2 pt-6 w-full text-sm text-gray-900 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 peer transition-all"
                placeholder=" "
                {...props}
            />
            <label
                htmlFor={id}
                className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-focus:text-indigo-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 pointer-events-none font-medium"
            >
                {label}
            </label>
        </div>
    );
};

export function AuthModals({ isOpen, onClose, defaultView = "signup", onSuccess }: AuthModalProps) {

    const [view, setView] = useState<"login" | "signup">(defaultView);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl animate-in fade-in zoom-in-95 duration-300 bg-white">
                <DialogTitle className="sr-only">
                    {view === "signup" ? "Créer un compte MAGIA" : "Connexion MAGIA"}
                </DialogTitle>
                <div className="flex flex-col md:flex-row h-full min-h-[600px] relative">

                    <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative bg-white z-10">
                        <div className="flex items-center gap-2 mb-10">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center p-1">
                                <Logo />
                            </div>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-3xl font-extrabold text-indigo-950 mb-2 tracking-tight">
                                {view === "login" ? "Bon retour !" : "Créer un compte"}
                            </h2>
                            <p className="text-gray-500 text-sm">
                                {view === "login"
                                    ? "Connectez-vous pour accéder à votre espace."
                                    : "Rejoignez-nous et déployez vos agents IA."}
                            </p>
                        </div>

                        <div className="space-y-4 animate-in slide-in-from-left-4 fade-in duration-500" key={view}>
                            {view === "signup" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FloatingInput label="Prénom" id="firstName" />
                                    <FloatingInput label="Nom" id="lastName" />
                                </div>
                            )}

                            <FloatingInput label="Adresse Email" id="email" type="email" />

                            {view === "signup" && (
                                <FloatingInput label="Numéro de téléphone" id="phone" type="tel" />
                            )}

                            <FloatingInput label="Mot de passe" id="password" type="password" />

                            {view === "signup" && (
                                <FloatingInput label="Confirmer le mot de passe" id="confirmPassword" type="password" />
                            )}

                            {view === "login" && (
                                <div className="flex items-center justify-between text-sm py-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="remember" className="border-gray-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                                        <label htmlFor="remember" className="text-gray-600 font-medium cursor-pointer">
                                            Se souvenir de moi
                                        </label>
                                    </div>
                                    <button className="text-red-500 font-medium hover:text-red-600 transition-colors">
                                        Mot de passe oublié ?
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 flex flex-col gap-3 sm:flex-row">
                                {view === "login" ? (
                                    <>
                                        <Button
                                            className="flex-1 h-12 bg-indigo-900 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
                                            onClick={() => onSuccess?.()}
                                        >
                                            Se connecter
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-12 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl transition-all"
                                            onClick={() => setView("signup")}
                                        >
                                            Créer un compte
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            className="flex-1 h-12 bg-indigo-900 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
                                            onClick={() => onSuccess?.()}
                                        >
                                            S'inscrire
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-12 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl transition-all"
                                            onClick={() => setView("login")}
                                        >
                                            Déjà un compte ?
                                        </Button>
                                    </>
                                )}
                            </div>

                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-100" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-400 font-medium tracking-wider">Ou</span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50 h-12 rounded-xl text-gray-700 font-bold transition-all"
                                onClick={() => { }}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continuer avec Google
                            </Button>
                        </div>

                        <div className="mt-8">
                            <p className="text-xs text-gray-400">
                                En continuant, vous acceptez nos <a href="#" className="font-medium text-indigo-600 hover:underline">Conditions d'utilisation</a> et confirmez avoir lu notre <a href="#" className="font-medium text-indigo-600 hover:underline">Politique de confidentialité</a>.
                            </p>
                        </div>
                    </div>

                    {/* Bouton Cercle central superposé */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-yellow-400 rounded-full items-center justify-center shadow-lg shadow-yellow-400/30 cursor-pointer hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 text-white ml-1 fill-current" />
                    </div>

                    {/* Colonne de droite (Image / Illustration) */}
                    <div className="hidden md:block w-1/2 relative bg-indigo-950 overflow-hidden">
                        <img 
                            src={authImage} 
                            alt="Futuristic AI Visualization" 
                            className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-screen"
                        />
                        
                        {/* Overlay pour assurer la lisibilité du texte si besoin */}
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-transparent to-transparent"></div>

                        {/* Contenu superposé / Texte d'inspiration */}
                        <div className="absolute inset-0 flex flex-col justify-end p-12 z-10">
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-violet-400"></div>
                                <h3 className="text-white font-bold text-2xl mb-3 tracking-tight">L'IA au service de votre business</h3>
                                <p className="text-indigo-100 text-sm leading-relaxed">
                                    Déployez des agents intelligents pour automatiser vos processus, répondre à vos clients et développer votre activité, pendant que vous vous concentrez sur l'essentiel.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
