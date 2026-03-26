"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { X, CreditCard, ShieldCheck, Zap } from "lucide-react";
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
    const [paid, setPaid] = useState(false);
    const [cardName, setCardName] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvc, setCvc] = useState("");

    const [storedCard, setStoredCard] = useState<{ last4: string; brand: string } | null>(null);
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const isAuth = typeof window !== "undefined" && !!localStorage.getItem("access_token");

    useEffect(() => {
        if (isAuth && isOpen) {
            fetch("http://localhost:8000/api/auth/subscription/", {
                headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.card_last4) {
                        setStoredCard({ last4: data.card_last4, brand: data.card_brand });
                    }
                })
                .catch(err => console.error("Error fetching sub", err));
        }
    }, [isAuth, isOpen]);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setPasswordError("");

        const token = localStorage.getItem("access_token");
        if (!token) {
            setLoading(false);
            onAuthRequired?.();
            return;
        }

        let payload: any = {
            plan_name: 'pro',
            num_agents: planDetails.numAgents,
            is_annual: planDetails.isAnnual,
            status: 'active'
        };

        if (storedCard && isAuth) {
            payload.password = confirmPassword;
        } else {
            const cleanNumber = cardNumber.replace(/\s/g, '');
            payload.card_last4 = cleanNumber.slice(-4);
            const expiryParts = expiry.split('/');
            payload.card_exp_month = (expiryParts[0] || "").trim().padStart(2, '0').slice(-2);
            payload.card_exp_year = (expiryParts[1] || "").trim().slice(-2);
            payload.card_brand = cleanNumber.startsWith('4') ? 'Visa' : cleanNumber.startsWith('5') ? 'Mastercard' : 'Card';
        }

        try {
            const response = await fetch("http://localhost:8000/api/auth/subscription/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setPaid(true);
            } else {
                const data = await response.json();
                if (data.password) {
                    setPasswordError(data.password);
                }
                console.error("Payment failed", data);
            }
        } catch (error) {
            console.error("Error confirming payment", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 rounded-3xl overflow-hidden bg-white border-none shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-white/80 backdrop-blur-sm hover:bg-gray-100 rounded-full transition-colors focus:outline-none shadow-sm"
                >
                    <X className="w-5 h-5 text-gray-700" />
                </button>

                {!paid ? (
                    <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-5/12 bg-gray-50 p-8 border-r border-gray-100">
                            <div className="mb-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-[10px] font-black uppercase mb-4 tracking-widest leading-none">
                                    <Zap className="w-3 h-3 fill-current" />
                                    Plan Pro
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-1">Résumé</h3>
                                <p className="text-sm text-gray-500 font-medium">Votre configuration</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-gray-500">{planDetails.numAgents} Agents IA</span>
                                    <span className="text-gray-900">{planDetails.numAgents * 15}€</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold tracking-tight">
                                    <span className="text-gray-500">Abonnement {planDetails.isAnnual ? 'Annuel' : 'Mensuel'}</span>
                                    <span className="text-gray-900">{planDetails.isAnnual ? '-20%' : 'Base'}</span>
                                </div>
                                <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                                    <span className="font-bold text-gray-900 text-lg">Total</span>
                                    <span className="font-black text-2xl text-blue-900">{planDetails.totalPrice}€<span className="text-xs text-gray-400 font-medium ml-1">/mois</span></span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    Paiement Sécurisé
                                </div>
                                <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                                    Vos données sont cryptées via SSL 256 bits. Annulation possible en 1 clic.
                                </p>
                            </div>
                        </div>

                        <div className="w-full md:w-7/12 p-8 bg-white overflow-y-auto">
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
                                    {storedCard && isAuth ? "Confirmation" : "Paiement"}
                                </DialogTitle>
                                <DialogDescription className="font-medium text-gray-500">
                                    {storedCard && isAuth
                                        ? "Confirmez votre achat avec votre mot de passe"
                                        : "Entrez vos informations de carte"}
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handlePayment} className="space-y-4">
                                {storedCard && isAuth ? (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                    <CreditCard className="w-5 h-5 text-blue-900" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest leading-none mb-1">Carte enregistrée</p>
                                                    <p className="text-sm font-black text-blue-950">•••• •••• •••• {storedCard.last4}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-blue-400 uppercase italic">{storedCard.brand}</span>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                                                Mot de passe de confirmation
                                                {passwordError && <span className="text-red-500 animate-pulse">Err : {passwordError}</span>}
                                            </label>
                                            <input
                                                required
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className={cn(
                                                    "w-full h-12 px-4 rounded-xl border bg-gray-50 focus:bg-white focus:ring-2 outline-none transition-all font-bold text-sm",
                                                    passwordError ? "border-red-200 focus:ring-red-500" : "border-gray-100 focus:ring-blue-800"
                                                )}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setStoredCard(null)}
                                            className="text-[10px] font-bold text-blue-900 uppercase tracking-widest hover:underline"
                                        >
                                            Utiliser une autre carte
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom sur la carte</label>
                                            <input
                                                required
                                                value={cardName}
                                                onChange={(e) => setCardName(e.target.value)}
                                                placeholder="J. DOE"
                                                className="w-full h-11 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 outline-none transition-all font-medium uppercase text-sm"
                                            />
                                        </div>

                                        <div className="space-y-2 relative">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Numéro de carte</label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    value={cardNumber}
                                                    onChange={(e) => setCardNumber(e.target.value)}
                                                    placeholder="0000 0000 0000 0000"
                                                    className="w-full h-11 pl-4 pr-12 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 outline-none transition-all font-mono text-sm"
                                                />
                                                <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expiration</label>
                                                <input
                                                    required
                                                    value={expiry}
                                                    onChange={(e) => setExpiry(e.target.value)}
                                                    placeholder="MM/YY"
                                                    className="w-full h-11 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 outline-none transition-all text-sm font-medium"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CVC</label>
                                                <input
                                                    required
                                                    value={cvc}
                                                    onChange={(e) => setCvc(e.target.value)}
                                                    placeholder="123"
                                                    type="password"
                                                    maxLength={3}
                                                    className="w-full h-11 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 outline-none transition-all text-sm font-medium"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 bg-blue-900 hover:bg-blue-900 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all text-sm uppercase tracking-widest mt-6 border-none"
                                >
                                    {loading ? "Traitement..." : `Confirmer le paiement`}
                                </Button>
                            </form>

                            <p className="text-center text-[10px] text-gray-400 mt-6 font-medium">
                                En cliquant sur payer, vous acceptez nos CGV et notre politique de confidentialité.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 px-8 h-[450px] flex flex-col justify-center items-center animate-in fade-in zoom-in-95 duration-500">
                        {(() => {
                            const isAlreadyAuth = !!localStorage.getItem("access_token");
                            return (
                                <>
                                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8 shadow-inner relative group">
                                        <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping group-hover:animate-none" />
                                        <ShieldCheck className="w-12 h-12 text-emerald-500 relative z-10" />
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter uppercase italic">
                                        {isAlreadyAuth ? "Abonnement Activé !" : "Paiement Réussi !"}
                                    </h3>
                                    <p className="text-gray-500 mb-10 max-w-xs font-medium leading-relaxed">
                                        {isAlreadyAuth
                                            ? "Félicitations ! Votre compte a été mis à jour instantanément. Vos nouveaux agents sont prêts à l'emploi."
                                            : "Excellent ! Votre accès Pro est prêt. Il ne vous reste plus qu'à finaliser votre compte pour commencer."}
                                    </p>
                                    <Button
                                        onClick={() => {
                                            onClose();
                                            onSuccess(isAlreadyAuth);
                                        }}
                                        className="bg-blue-900 hover:bg-blue-900 text-white px-10 h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all border-none"
                                    >
                                        {isAlreadyAuth ? "Accéder à mes agents" : "Créer mon compte"}
                                    </Button>
                                </>
                            );
                        })()}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
