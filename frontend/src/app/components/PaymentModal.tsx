"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { X, CreditCard, ShieldCheck, Zap, ExternalLink, KeyRound, MailCheck } from "lucide-react";
import { cn } from "./ui/utils";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (isAlreadyAuth: boolean) => void;
    onAuthRequired?: () => void;
    planDetails: {
        numAgents: number;
        isAnnual: boolean;
        totalPrice: number;
    };
}

export function PaymentModal({ isOpen, onClose, onSuccess, onAuthRequired, planDetails }: PaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Saved card flow state
    const [storedCard, setStoredCard] = useState<{ last4: string; brand: string } | null>(null);
    const [hasPassword, setHasPassword] = useState<boolean | null>(null);
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [useOtpFallback, setUseOtpFallback] = useState(false);

    const isAuth = typeof window !== "undefined" && !!localStorage.getItem("access_token");

    useEffect(() => {
        if (isAuth && isOpen) {
            const token = localStorage.getItem("access_token");
            fetch("http://localhost:8000/api/auth/subscription/", {
                headers: { "Authorization": `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.card_last4) {
                        setStoredCard({ last4: data.card_last4, brand: data.card_brand });
                    }
                })
                .catch(err => console.error(err));

            fetch("http://localhost:8000/api/auth/me/", {
                headers: { "Authorization": `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    setHasPassword(data.has_password);
                })
                .catch(err => console.error(err));
        } else {
            // Reset state when strictly no auth
            setStoredCard(null);
            setHasPassword(null);
            setOtpSent(false);
            setConfirmPassword("");
            setOtp("");
            setUseOtpFallback(false);
        }
    }, [isAuth, isOpen]);

    const sendOtp = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch("http://localhost:8000/api/auth/payments/send-otp/", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setOtpSent(true);
                setSuccessMessage("Code envoyé sur votre boîte mail !");
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError("Erreur lors de l'envoi du code.");
            }
        } catch (e) {
            setError("Erreur réseau.");
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("access_token");
        if (!token) {
            setLoading(false);
            onAuthRequired?.();
            return;
        }

        if (storedCard) {
            try {
                const res = await fetch("http://localhost:8000/api/auth/payments/confirm-saved/", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        plan_name: "pro",
                        num_agents: planDetails.numAgents,
                        password: confirmPassword,
                        otp: otp
                    })
                });
                const data = await res.json();

                if (res.ok) {
                    onClose();
                    onSuccess(true);
                } else {
                    setError(data.error || "Paiement refusé par la banque.");
                }
            } catch (e) {
                setError("Erreur réseau lors de la transaction.");
            } finally {
                setLoading(false);
            }
            return;
        }

        // Nouveau paiement via gateway
        try {
            const res = await fetch("http://localhost:8000/api/auth/payments/checkout-intent/", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    plan_name: "pro",
                    num_agents: planDetails.numAgents,
                    gateway: "stripe"
                })
            });
            const data = await res.json();

            if (res.ok) {
                if (data.checkout_url) {
                    window.location.href = data.checkout_url;
                } else if (data.status === 'pending_validation') {
                    setSuccessMessage("Paiement enregistré ! En cours de validation.");
                    setTimeout(() => {
                        onClose();
                        onSuccess(true);
                    }, 3000);
                }
            } else {
                setError(data.error || "Erreur lors de l'initialisation du paiement.");
            }
        } catch (e) {
            setError("Erreur réseau. Impossible de contacter la passerelle de paiement.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] p-0 rounded-none overflow-hidden bg-white border-none shadow-2xl">
                <DialogTitle className="sr-only">Paiement</DialogTitle>
                <div className="flex flex-col">
                    <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex flex-col items-center justify-center text-center space-y-2">
                        <div className="w-12 h-12 bg-blue-100 rounded-none flex items-center justify-center text-blue-900 mb-2 shadow-inner">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">{storedCard ? "Mise à niveau rapide" : "Finaliser l'abonnement"}</h2>
                        <p className="text-xs text-gray-500 font-medium">Sécurité garantie SSL 256 bits</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="bg-blue-50/50 p-5 rounded-none border border-blue-100/50">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-black text-blue-950 uppercase tracking-widest flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-blue-900" /> MAGIA Pro
                                </span>
                                <span className="text-lg font-black text-blue-900">{(planDetails.totalPrice * 5000).toLocaleString('fr-FR')} Ar<span className="text-[10px] font-bold text-blue-400 uppercase ml-1 opacity-70">/{planDetails.isAnnual ? 'an' : 'm'}</span></span>
                            </div>
                            <p className="text-[10px] text-blue-700/80 font-bold uppercase tracking-widest">Achat configuration : {planDetails.numAgents} Agents IA</p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Mode de paiement</p>

                            <div className="grid grid-cols-1 gap-3 mt-4 mb-4">
                                <div className="p-4 border rounded-xl flex flex-col items-center justify-center gap-3 transition-all shadow-sm border-blue-900 bg-blue-50/50 ring-2 ring-blue-900/20">
                                    <CreditCard className="w-6 h-6 text-blue-900" />
                                    <span className="text-[10px] font-black tracking-widest uppercase text-blue-900">Carte Bancaire (Stripe)</span>
                                </div>
                            </div>

                            {storedCard && (
                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-none flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-none flex items-center justify-center shadow-sm">
                                                <CreditCard className="w-5 h-5 text-gray-900" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Payer avec la carte</p>
                                                <p className="text-sm font-black text-gray-950">•••• •••• •••• {storedCard.last4}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase italic">{storedCard.brand}</span>
                                    </div>

                                    {hasPassword === true && !useOtpFallback ? (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <KeyRound className="w-3.5 h-3.5" /> Mot de passe de confirmation
                                            </label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Confirmez votre mot de passe pour valider"
                                                className="w-full h-11 px-4 rounded-none border border-gray-200 focus:bg-white bg-gray-50 focus:border-blue-900 focus:ring-1 focus:ring-blue-900 outline-none transition-all text-sm font-medium"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setUseOtpFallback(true)}
                                                className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-bold tracking-tight text-left block"
                                            >
                                                Connexion via Google ? Utiliser l'email
                                            </button>
                                        </div>
                                    ) : hasPassword === false || useOtpFallback ? (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <MailCheck className="w-3.5 h-3.5" /> Code de sécurité (OTP)
                                            </label>
                                            {!otpSent ? (
                                                <Button type="button" onClick={sendOtp} variant="outline" className="w-full h-11 border-dashed border-gray-300 text-gray-600 font-bold text-xs">
                                                    Envoyer mon code de sécurité par email
                                                </Button>
                                            ) : (
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value)}
                                                    placeholder="Saisissez le code à 6 chiffres"
                                                    className="w-full h-11 px-4 rounded-none border border-gray-200 focus:bg-white bg-gray-50 focus:border-blue-900 focus:ring-1 focus:ring-blue-900 outline-none transition-all text-sm font-black tracking-widest text-center"
                                                />
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            )}


                        </div>

                        {successMessage && <div className="text-[10px] font-bold tracking-widest uppercase text-green-700 p-3 bg-green-50 rounded-none border border-green-100 text-center">{successMessage}</div>}
                        {error && <div className="text-[10px] font-bold tracking-widest uppercase text-red-600 p-3 bg-red-50 rounded-none border border-red-100 text-center animate-pulse">{error}</div>}
                    </div>

                    <div className="p-6 pt-0 shrink-0">
                        <Button
                            onClick={handleCheckout}
                            className="w-full h-14 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all border-none relative overflow-hidden group bg-blue-900 hover:bg-blue-950 shadow-blue-900/20"
                        >
                            <span className="relative z-10 flex items-center justify-center">
                                {loading ? 'Traitement en cours...' : storedCard ? `Confirmer l'achat (${(planDetails.totalPrice * 5000).toLocaleString('fr-FR')} Ar)` : `Valider (${(planDetails.totalPrice * 5000).toLocaleString('fr-FR')} Ar)`}
                                {!loading && !storedCard && <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-70 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                            </span>
                        </Button>
                        <p className="text-center text-[9px] text-gray-400 mt-4 font-bold uppercase tracking-widest">
                            Transaction protégée et sécurisée.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
