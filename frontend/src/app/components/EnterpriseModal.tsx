"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { X, Building2, CheckCircle2 } from "lucide-react";
import { API_BASE, getAuthHeadersOnly } from "../../lib/api";

interface EnterpriseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function EnterpriseModal({ isOpen, onClose, onSuccess }: EnterpriseModalProps) {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/auth/subscription/`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...getAuthHeadersOnly()
                },
                body: JSON.stringify({ plan_name: "entreprise" })
            });
            
            if (response.ok) {
                setSent(true);
                if (onSuccess) onSuccess();
            } else {
                const data = await response.json();
                setError(data.error || "Une erreur est survenue lors de l'envoi de votre demande.");
            }
        } catch (error) {
            console.error("Error sending enterprise request", error);
            setError("Impossible de contacter le serveur. Veuillez réessayer plus tard.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange => !onOpenChange && onClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl bg-white border-none shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-gray-100/50 hover:bg-gray-200 rounded-full transition-colors focus:outline-none"
                    aria-label="Fermer"
                >
                    <X className="w-5 h-5 text-gray-700" />
                </button>

                {!sent ? (
                    <div className="p-8">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <Building2 className="w-8 h-8 text-blue-900" />
                        </div>
                        
                        <DialogHeader className="mb-8 text-center">
                            <DialogTitle className="text-3xl font-black text-gray-900 tracking-tight">
                                Passer en mode Entreprise
                            </DialogTitle>
                            <DialogDescription className="mt-4 text-gray-500 font-medium leading-relaxed">
                                Le mode Entreprise vous donne accès à des agents illimités, au SSO, à l'audit trail complet et à un accompagnement dédié.
                            </DialogDescription>
                        </DialogHeader>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 text-rose-700 text-sm font-medium rounded-xl border border-rose-100">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2 text-center">Ce qui va se passer</p>
                                <ul className="text-sm text-gray-600 space-y-2">
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-900 mt-1.5 shrink-0" />
                                        <span>Votre demande sera envoyée à notre équipe commerciale.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-900 mt-1.5 shrink-0" />
                                        <span>Un administrateur validera votre passage en mode Entreprise sous 24h.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-900 mt-1.5 shrink-0" />
                                        <span>Vous recevrez une notification dès que votre compte sera mis à jour.</span>
                                    </li>
                                </ul>
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full h-14 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all text-lg"
                            >
                                {loading ? "Traitement en cours..." : "Confirmer ma demande"}
                            </Button>
                            
                            <button 
                                onClick={onClose}
                                className="w-full text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors py-2"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-10 text-center">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-3">Demande envoyée !</h3>
                        <p className="text-gray-500 mb-8 font-medium leading-relaxed">
                            Votre demande de passage en mode Entreprise a bien été enregistrée. <br/>
                            Notre équipe l'étudie et vous contactera très prochainement.
                        </p>
                        <Button 
                            onClick={onClose} 
                            className="bg-gray-900 hover:bg-gray-800 text-white px-10 rounded-2xl h-12 font-bold shadow-lg transition-all"
                        >
                            Fermer
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
