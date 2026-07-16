import { API_BASE } from "../../lib/api";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import {
    CreditCard, ShieldCheck, Zap, KeyRound,
    MailCheck, CheckCircle2, AlertCircle, Lock, Loader2
} from "lucide-react";
import { cn } from "./ui/utils";
import { loadStripe } from "@stripe/stripe-js";
import {
    Elements,
    CardNumberElement,
    CardExpiryElement,
    CardCvcElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

const ELEMENT_OPTIONS = {
    style: {
        base: {
            fontSize: "14px",
            color: "#111827",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: "500",
            "::placeholder": { color: "#9CA3AF", fontWeight: "400" },
        },
        invalid: { color: "#EF4444" },
    },
};

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (isAlreadyAuth: boolean) => void;
    onAuthRequired?: () => void;
    planDetails: {
        numAgents: number;
        isAnnual: boolean;
        totalPrice: number;
        currentPlan?: string;
        targetPlan?: string;
    };
}

function CardSetupForm({
    planDetails, onClose, onSuccess, onAuthRequired, storedCard, hasPassword,
}: {
    planDetails: PaymentModalProps["planDetails"];
    onClose: () => void;
    onSuccess: (b: boolean) => void;
    onAuthRequired?: () => void;
    storedCard: { last4: string; brand: string } | null;
    hasPassword: boolean | null;
}) {
    const stripe = useStripe();
    const elements = useElements();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [useOtpFallback, setUseOtpFallback] = useState(false);
    const [cardFieldErrors, setCardFieldErrors] = useState<{
        number?: string; expiry?: string; cvc?: string;
    }>({});

    // Auto-send OTP if user has no password (Google/social account)
    useEffect(() => {
        if (storedCard && hasPassword === false && !otpSent) {
            sendOtp();
        }
     
    }, [storedCard, hasPassword]);

    const targetPlan = planDetails.targetPlan || (planDetails.currentPlan === "pro" ? "entreprise" : "pro");
    const targetPlanLabel = targetPlan === "entreprise" ? "Entreprise" : "Pro";
    const priceAriary = (planDetails.totalPrice * 5000).toLocaleString("fr-FR");

    const sendOtp = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_BASE}/auth/payments/send-otp/`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setOtpSent(true);
            else setError("Erreur lors de l'envoi du code.");
        } catch {
            setError("Erreur réseau.");
        } finally {
            setLoading(false);
        }
    };

    const handleSavedCardPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("access_token");
        if (!token) { onAuthRequired?.(); return; }
        try {
            const res = await fetch(`${API_BASE}/auth/payments/confirm-saved/`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan_name: targetPlan,
                    num_agents: planDetails.numAgents,
                    password: confirmPassword,
                    otp,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => { onClose(); onSuccess(true); }, 2000);
            } else {
                setError(data.error || "Paiement refusé.");
            }
        } catch {
            setError("Erreur réseau.");
        } finally {
            setLoading(false);
        }
    };

    const handleNewCardPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("access_token");
        if (!token) { onAuthRequired?.(); setLoading(false); return; }

        try {
            const intentRes = await fetch(`${API_BASE}/auth/payments/create-payment-intent/`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ plan_name: targetPlan, num_agents: planDetails.numAgents }),
            });
            const intentData = await intentRes.json();
            if (!intentRes.ok) {
                setError(intentData.error || "Erreur lors de l'initialisation du paiement.");
                setLoading(false);
                return;
            }

            const { client_secret } = intentData;
            const cardElement = elements.getElement(CardNumberElement);
            if (!cardElement) { setLoading(false); return; }

            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
                payment_method: { card: cardElement },
            });

            if (stripeError) {
                setError(stripeError.message || "Paiement refusé par la banque.");
                setLoading(false);
                return;
            }

            if (paymentIntent?.status === "succeeded") {
                await fetch(`${API_BASE}/auth/payments/confirm-card-payment/`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        payment_intent_id: paymentIntent.id,
                        plan_name: targetPlan,
                        num_agents: planDetails.numAgents,
                    }),
                });
                setSuccess(true);
                setTimeout(() => { onClose(); onSuccess(true); }, 2000);
            }
        } catch {
            setError("Erreur réseau lors du paiement.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-14 px-6 space-y-4 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Paiement réussi !</h3>
                <p className="text-xs text-gray-500 font-medium">
                    Votre plan est maintenant{" "}
                    <span className="font-black text-blue-900">{targetPlanLabel}</span>.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={storedCard ? handleSavedCardPayment : handleNewCardPayment}>
            <div className="p-6 space-y-5">

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                    <span className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-900" />
                        MAGIA {targetPlanLabel}
                    </span>
                    <div className="text-right">
                        <p className="text-sm font-black text-blue-900">
                            {priceAriary} Ar
                            <span className="text-[10px] font-bold text-blue-400 ml-1 opacity-70">
                                /{planDetails.isAnnual ? "an" : "mois"}
                            </span>
                        </p>
                        <p className="text-[9px] text-blue-400 font-medium">{planDetails.numAgents} agent(s) IA</p>
                    </div>
                </div>

                {storedCard ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                                    <CreditCard className="w-5 h-5 text-gray-900" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payer avec</p>
                                    <p className="text-sm font-black text-gray-950">•••• •••• •••• {storedCard.last4}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase px-2 py-1 bg-gray-100 rounded-lg">
                                {storedCard.brand}
                            </span>
                        </div>

                        {/* Password or OTP */}
                        {hasPassword === true && !useOtpFallback ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <KeyRound className="w-3.5 h-3.5" /> Mot de passe de confirmation
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Votre mot de passe"
                                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-900 focus:ring-1 focus:ring-blue-900 outline-none transition-all text-sm font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setUseOtpFallback(true)}
                                    className="text-[10px] text-blue-600 hover:underline font-bold block"
                                >
                                    Connexion Google ? Utiliser un code email
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <MailCheck className="w-3.5 h-3.5" /> Code de sécurité par email
                                </label>
                                {!otpSent ? (
                                    loading ? (
                                        <div className="w-full h-11 flex items-center justify-center gap-2 bg-blue-50 rounded-xl border border-blue-100 text-[11px] text-blue-700 font-bold">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Envoi du code en cours...
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            onClick={sendOtp}
                                            disabled={loading}
                                            variant="outline"
                                            className="w-full h-11 border-dashed border-gray-300 text-gray-600 font-bold text-xs"
                                        >
                                            Envoyer le code par email
                                        </Button>
                                    )
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-green-700 bg-green-50 rounded-lg px-3 py-2 font-medium border border-green-100">
                                            ✓ Code envoyé à votre adresse email. Vérifiez votre boîte de réception.
                                        </p>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                            placeholder="• • • • • •"
                                            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:border-blue-900 focus:ring-1 focus:ring-blue-900 outline-none text-lg font-black tracking-[0.5em] text-center"
                                        />
                                        <button
                                            type="button"
                                            onClick={sendOtp}
                                            className="text-[10px] text-blue-600 hover:underline font-bold block"
                                        >
                                            Renvoyer le code
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* ═══════════════════════════════════════
                       FLOW B : Nouvelle carte (Stripe Elements)
                       ═══════════════════════════════════════ */
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                            <Lock className="w-3 h-3" /> Informations de carte bancaire
                        </p>

                        {/* Card number — 16 digits, auto-formatted XXXX XXXX XXXX XXXX */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                Numéro de carte
                            </label>
                            <div className={cn(
                                "w-full h-11 px-4 rounded-xl border bg-gray-50 flex items-center transition-all",
                                "focus-within:bg-white focus-within:border-blue-900 focus-within:ring-1 focus-within:ring-blue-900",
                                cardFieldErrors.number ? "border-red-300" : "border-gray-200"
                            )}>
                                <CardNumberElement
                                    options={{ ...ELEMENT_OPTIONS, showIcon: true }}
                                    className="flex-1"
                                    onChange={(e) => setCardFieldErrors(p => ({ ...p, number: e.error?.message }))}
                                />
                            </div>
                            {cardFieldErrors.number && (
                                <p className="text-[10px] text-red-500 font-bold">{cardFieldErrors.number}</p>
                            )}
                        </div>

                        {/* Expiry (MM/AA) + CVC (3-4 digits) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Date d'expiration
                                </label>
                                <div className={cn(
                                    "w-full h-11 px-4 rounded-xl border bg-gray-50 flex items-center transition-all",
                                    "focus-within:bg-white focus-within:border-blue-900 focus-within:ring-1 focus-within:ring-blue-900",
                                    cardFieldErrors.expiry ? "border-red-300" : "border-gray-200"
                                )}>
                                    <CardExpiryElement
                                        options={ELEMENT_OPTIONS}
                                        className="w-full"
                                        onChange={(e) => setCardFieldErrors(p => ({ ...p, expiry: e.error?.message }))}
                                    />
                                </div>
                                {cardFieldErrors.expiry && (
                                    <p className="text-[10px] text-red-500 font-bold">{cardFieldErrors.expiry}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    CVV / CVC
                                </label>
                                <div className={cn(
                                    "w-full h-11 px-4 rounded-xl border bg-gray-50 flex items-center transition-all",
                                    "focus-within:bg-white focus-within:border-blue-900 focus-within:ring-1 focus-within:ring-blue-900",
                                    cardFieldErrors.cvc ? "border-red-300" : "border-gray-200"
                                )}>
                                    <CardCvcElement
                                        options={ELEMENT_OPTIONS}
                                        className="w-full"
                                        onChange={(e) => setCardFieldErrors(p => ({ ...p, cvc: e.error?.message }))}
                                    />
                                </div>
                                {cardFieldErrors.cvc && (
                                    <p className="text-[10px] text-red-500 font-bold">{cardFieldErrors.cvc}</p>
                                )}
                            </div>
                        </div>

                        {/* Security badge */}
                        <div className="flex items-start gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
                            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                            <p className="text-[9px] text-green-700 font-medium leading-relaxed">
                                Vos données de carte sont chiffrées par <strong>Stripe</strong>.
                                MAGIA ne stocke jamais votre numéro complet — seuls les 4 derniers chiffres sont conservés.
                            </p>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-red-600 p-3 bg-red-50 rounded-xl border border-red-100">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}
            </div>

            {/* CTA */}
            <div className="px-6 pb-6">
                <Button
                    type="submit"
                    disabled={loading || (!storedCard && !stripe)}
                    className="w-full h-12 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl border-none bg-blue-900 hover:bg-blue-950 shadow-blue-900/20 disabled:opacity-60 transition-all"
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Traitement en cours...
                        </span>
                    ) : storedCard
                        ? `Confirmer — ${priceAriary} Ar`
                        : `Payer ${priceAriary} Ar`
                    }
                </Button>
                <p className="text-center text-[9px] text-gray-400 mt-3 font-bold uppercase tracking-wider">
                    Transaction protégée · SSL 256 bits
                </p>
            </div>
        </form>
    );
}

// ─── Outer modal (provides Stripe context) ────────────────────────────────────
export function PaymentModal({ isOpen, onClose, onSuccess, onAuthRequired, planDetails }: PaymentModalProps) {
    const [storedCard, setStoredCard] = useState<{ last4: string; brand: string } | null>(null);
    const [hasPassword, setHasPassword] = useState<boolean | null>(null);
    const [dataLoading, setDataLoading] = useState(true);

    const isAuth = typeof window !== "undefined" && !!localStorage.getItem("access_token");

    useEffect(() => {
        if (!isOpen) return;
        if (!isAuth) { setDataLoading(false); return; }

        setDataLoading(true);
        const token = localStorage.getItem("access_token");
        Promise.all([
            fetch(`${API_BASE}/auth/subscription/`, {
                headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json()),
            fetch(`${API_BASE}/auth/me/`, {
                headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json()),
        ])
            .then(([subData, meData]) => {
                if (subData.card_last4) {
                    setStoredCard({ last4: subData.card_last4, brand: subData.card_brand || "Carte" });
                } else {
                    setStoredCard(null);
                }
                setHasPassword(meData.has_password ?? false);
            })
            .catch(console.error)
            .finally(() => setDataLoading(false));
    }, [isOpen, isAuth]);

    const targetPlan = planDetails.targetPlan || (planDetails.currentPlan === "pro" ? "entreprise" : "pro");

    return (
        <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
            <DialogContent
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
                className="sm:max-w-[440px] p-0 rounded-2xl overflow-hidden bg-white border-none shadow-2xl"
            >
                <DialogTitle className="sr-only">Paiement</DialogTitle>

                <div className="flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-950 to-blue-900 px-6 py-5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white backdrop-blur-sm">
                            {storedCard
                                ? <CreditCard className="w-5 h-5" />
                                : <ShieldCheck className="w-5 h-5" />
                            }
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-wider">
                                {dataLoading
                                    ? "Chargement..."
                                    : storedCard
                                        ? "Paiement rapide"
                                        : "Configurer votre carte"
                                }
                            </h2>
                            <p className="text-[10px] text-blue-200 font-medium mt-0.5">
                                {storedCard
                                    ? `Carte enregistrée •••• ${storedCard.last4}`
                                    : `Abonnement MAGIA ${targetPlan === "pro" ? "Pro" : "Entreprise"}`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Body */}
                    {dataLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
                        </div>
                    ) : (
                        <Elements stripe={stripePromise}>
                            <CardSetupForm
                                planDetails={planDetails}
                                onClose={onClose}
                                onSuccess={onSuccess}
                                onAuthRequired={onAuthRequired}
                                storedCard={storedCard}
                                hasPassword={hasPassword}
                            />
                        </Elements>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
