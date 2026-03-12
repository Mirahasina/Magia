"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Logo } from "./Logo";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultView?: "login" | "signup";
    onSuccess?: () => void;
}

export function AuthModals({ isOpen, onClose, defaultView = "signup", onSuccess }: AuthModalProps) {

    const [view, setView] = useState<"login" | "signup">(defaultView);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-700 p-10 text-white text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-[60px] -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                        <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-300 rounded-full blur-[60px] translate-x-1/2 translate-y-1/2 animate-pulse"></div>
                    </div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-14 h-14 p-2 rounded-xl flex items-center justify-center mb-4 shadow-xl shadow-blue-900/20">
                            <Logo />
                        </div>

                        <DialogTitle className="text-2xl font-bold mb-1">
                            {view === "signup" ? "Créer un compte" : "Bon retour !"}
                        </DialogTitle>
                        <DialogDescription className="text-purple-100">
                            {view === "signup"
                                ? "Rejoignez MAGIA et déployez vos agents IA."
                                : "Connectez-vous pour gérer votre équipe IA."}
                        </DialogDescription>
                    </div>
                </div>

                <div className="p-8 bg-white relative">
                    <div className="space-y-5 animate-in slide-in-from-right-2 fade-in duration-300" key={view}>
                        <Button
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 h-12 rounded-xl text-gray-700 font-bold transition-all hover:shadow-sm"
                            onClick={() => { }}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continuer avec Google
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-100" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-gray-400">Ou avec email</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="font-bold text-gray-700">Email</Label>
                                <Input id="email" type="email" placeholder="nom@entreprise.com" className="h-12 border-gray-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 rounded-xl transition-all font-medium bg-gray-50/50 hover:bg-gray-50" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="font-bold text-gray-700">Mot de passe</Label>
                                <Input id="password" type="password" placeholder="••••••••" className="h-12 border-gray-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 rounded-xl transition-all font-medium bg-gray-50/50 hover:bg-gray-50" />
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-violet-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                            onClick={() => onSuccess?.()}
                        >
                            {view === "signup" ? "Créer mon compte" : "Se connecter"}
                        </Button>


                        <div className="text-center">
                            <button
                                onClick={() => setView(view === "signup" ? "login" : "signup")}
                                className="text-sm text-gray-500 hover:text-purple-600 transition-colors"
                            >
                                {view === "signup"
                                    ? "Vous avez déjà un compte ? Connectez-vous"
                                    : "Pas encore de compte ? Inscrivez-vous gratuitement"}
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
