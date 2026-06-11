"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Logo } from "./Logo";
import { Play, X, Eye, EyeOff, Loader2, Check, ArrowLeft } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { cn } from "./ui/utils";
import { API_BASE } from "../../lib/api";
import authImage from "../../assets/auth-futuristic.png";
import { useGoogleLogin } from "@react-oauth/google";

interface AuthPageProps {
    defaultView?: "login" | "signup";
    onSuccess?: () => void;
    initialEmail?: string;
}

const FloatingInput = ({ label, type = "text", id, value, onChange, showToggle = false, isPasswordVisible = false, onToggleVisibility, ...props }: any) => {
    return (
        <div className="relative">
            <input
                type={showToggle ? (isPasswordVisible ? "text" : "password") : type}
                id={id}
                value={value}
                onChange={onChange}
                className="block px-4 pb-2 pt-6 w-full text-sm text-gray-900 bg-gray-50/50 rounded-xl border border-gray-100 focus:outline-none focus:border-blue-900/50 focus:bg-white peer transition-all"
                placeholder=" "
                {...props}
            />
            <label
                htmlFor={id}
                className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-focus:text-blue-900 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 pointer-events-none font-medium"
            >
                {label}
            </label>
            {showToggle && (
                <button
                    type="button"
                    onClick={onToggleVisibility}
                    className="absolute right-4 top-1/2 -translate-y-1/2 pt-3 text-gray-400 hover:text-blue-900 transition-colors"
                >
                    {isPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            )}
        </div>
    );
};

export function AuthPage({ defaultView = "login", onSuccess, initialEmail }: AuthPageProps) {
    const [view, setView] = useState<"login" | "signup" | "forgot_password">(defaultView);
    const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [resendLoading, setResendLoading] = useState(false);
    const [captchaKey, setCaptchaKey] = useState("");
    const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                setLoading(true);
                setErrorMsg("");
                const res = await fetch(`${API_BASE}/auth/google/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ access_token: tokenResponse.access_token }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Erreur lors de la connexion Google");

                localStorage.setItem("access_token", data.tokens.access);
                localStorage.setItem("refresh_token", data.tokens.refresh);
                await handleAuthSuccess(data.tokens.access);
            } catch (err: any) {
                setErrorMsg(err.message);
            } finally {
                setLoading(false);
            }
        },
        onError: () => {
            setErrorMsg("Échec de la connexion Google.");
        },
        prompt: 'select_account'
    });

    useEffect(() => {
        setView(defaultView);
        setErrorMsg("");
        if (initialEmail) {
            setFormData(prev => ({ ...prev, email: initialEmail }));
        }
    }, [defaultView, initialEmail]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async () => {
        setErrorMsg("");
        setLoading(true);

        try {
            if (view === "signup") {
                if (formData.password !== formData.confirmPassword) {
                    setErrorMsg("Les mots de passe ne correspondent pas.");
                    setLoading(false);
                    return;
                }
                if (!captchaKey) {
                    setErrorMsg("Veuillez valider le reCAPTCHA.");
                    setLoading(false);
                    return;
                }
                const res = await fetch(`${API_BASE}/auth/register/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        password_confirm: formData.confirmPassword,
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        recaptcha_key: captchaKey
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.email?.[0] || data.error || "Erreur d'inscription");

                setSuccessMsg("Compte créé ! Veuillez vérifier votre email pour l'activer.");
                setView("login");
            } else if (view === "login") {
                const res = await fetch(`${API_BASE}/auth/login/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || data.non_field_errors?.[0] || "Identifiants incorrects");

                localStorage.setItem("access_token", data.tokens.access);
                localStorage.setItem("refresh_token", data.tokens.refresh);

                if (rememberMe) {
                    localStorage.setItem("remember_me", "true");
                } else {
                    localStorage.removeItem("remember_me");
                }

                await handleAuthSuccess(data.tokens.access);
            } else if (view === "forgot_password") {
                const res = await fetch(`${API_BASE}/auth/forgot-password/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: formData.email }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || data.email?.[0] || "Erreur lors de la demande");

                setSuccessMsg(data.message || "Lien de réinitialisation envoyé.");
            }
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvitation = async (accessToken: string) => {
        const token = sessionStorage.getItem('invitation_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/auth/invite/accept/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify({ token }),
            });
            const data = await res.json();
            if (res.ok) {
                console.log("Invitation accepted:", data.message);
                sessionStorage.removeItem('invitation_token');
            }
        } catch (err) {
            console.error("Error accepting invitation:", err);
        }
    };

    const handleAuthSuccess = async (accessToken: string) => {
        await handleAcceptInvitation(accessToken);
        onSuccess?.();
    };

    const handleResendVerificationEmail = async () => {
        setErrorMsg("");
        setSuccessMsg("");
        setResendLoading(true);

        try {
            const res = await fetch(`${API_BASE}/auth/resend-verification/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email }),
            });
            const contentType = res.headers.get("content-type") || "";
            const data = contentType.includes("application/json")
                ? await res.json()
                : { error: await res.text() };
            if (!res.ok) throw new Error(data.error || "Impossible de renvoyer l'email de vérification.");
            setSuccessMsg(data.message || "Email de vérification renvoyé.");
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setResendLoading(false);
        }
    };

    const shouldShowResendVerificationButton = [errorMsg, successMsg]
        .filter(Boolean)
        .some((msg) => msg.toLowerCase().includes("vérifier votre email") || msg.toLowerCase().includes("verify your email"));

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-white bg-mesh p-4 md:p-8 relative">
            <div className="absolute top-4 left-4 z-50">
                <a
                    href="/landing"
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/80 hover:bg-white text-gray-700 hover:text-blue-900 font-bold text-xs rounded-full shadow-md border border-gray-100/50 backdrop-blur-md transition-all hover:scale-[1.02]"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au site
                </a>
            </div>

            <div className="w-full max-w-[900px] bg-white border border-gray-100/60 shadow-2xl rounded-3xl overflow-hidden relative flex flex-col md:flex-row min-h-[580px] animate-in fade-in zoom-in-95 duration-300">
                <a
                    href="/landing"
                    className="absolute top-4 right-4 z-50 p-2 bg-gray-100/50 hover:bg-gray-200 rounded-full transition-colors focus:outline-none backdrop-blur-sm"
                    aria-label="Fermer"
                >
                    <X className="w-5 h-5 text-gray-700" />
                </a>

                <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col justify-center relative bg-white z-10">
                    <div className="flex items-center gap-2 mb-6">
                        <a href="/landing" className="w-8 h-8 rounded-none flex items-center justify-center p-1 hover:scale-105 transition-transform duration-300">
                            <Logo />
                        </a>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-2xl font-extrabold text-blue-950 mb-1 tracking-tight">
                            {view === "login" ? "Bon retour !" : view === "forgot_password" ? "Mot de passe oublié ?" : "Créer un compte"}
                        </h2>
                        <p className="text-gray-500 text-xs">
                            {view === "login"
                                ? "Connectez-vous pour accéder à votre espace."
                                : view === "forgot_password"
                                    ? "Saisissez votre email. Nous vous enverrons un lien de réinitialisation."
                                    : "Rejoignez-nous et déployez vos agents IA."}
                        </p>
                    </div>

                    <form
                        className="space-y-3 animate-in slide-in-from-left-4 fade-in duration-500"
                        key={view}
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                    >
                        {errorMsg && (
                            <div className="p-3 bg-red-50/50 border border-red-100 text-red-600 text-[11px] rounded-xl font-bold animate-in fade-in slide-in-from-top-1">
                                {errorMsg}
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-3 bg-emerald-50/30 border border-emerald-100 text-emerald-600 text-[11px] rounded-xl font-bold animate-in fade-in slide-in-from-top-1">
                                {successMsg}
                            </div>
                        )}
                        {shouldShowResendVerificationButton && (
                            <div className="mt-3 text-center">
                                <button
                                    type="button"
                                    onClick={handleResendVerificationEmail}
                                    className="text-xs font-bold text-blue-900 hover:text-blue-700 transition-colors"
                                    disabled={resendLoading || !formData.email}
                                >
                                    {resendLoading ? "Rappel en cours..." : "Renvoyer l'email de vérification"}
                                </button>
                            </div>
                        )}

                        {view === "signup" && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <FloatingInput label="Prénom" id="firstName" value={formData.firstName} onChange={handleChange} />
                                    <FloatingInput label="Nom" id="lastName" value={formData.lastName} onChange={handleChange} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <FloatingInput label="Email" id="email" type="email" value={formData.email} onChange={handleChange} />
                                    <FloatingInput label="Téléphone" id="phone" type="tel" value={formData.phone} onChange={handleChange} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <FloatingInput
                                        label="Mot de passe"
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        showToggle={true}
                                        isPasswordVisible={showPassword}
                                        onToggleVisibility={() => setShowPassword(!showPassword)}
                                    />
                                    <FloatingInput
                                        label="Confirmer"
                                        id="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        showToggle={true}
                                        isPasswordVisible={showPassword}
                                        onToggleVisibility={() => setShowPassword(!showPassword)}
                                    />
                                </div>

                                <div
                                    className={cn(
                                        "p-3 bg-gray-50/50 border rounded-xl flex items-center justify-between transition-all duration-300",
                                        captchaKey ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100"
                                    )}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div
                                            onClick={() => {
                                                if (!captchaKey && !isVerifyingCaptcha) {
                                                    setIsVerifyingCaptcha(true);
                                                    setTimeout(() => {
                                                        setCaptchaKey("mock-token-" + Math.random());
                                                        setIsVerifyingCaptcha(false);
                                                    }, 1500);
                                                }
                                            }}
                                            className={cn(
                                                "w-6 h-6 border-2 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                                                captchaKey ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-white border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            {isVerifyingCaptcha ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-900" />
                                            ) : captchaKey ? (
                                                <Check className="w-3.5 h-3.5 text-white stroke-[4]" />
                                            ) : null}
                                        </div>
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer select-none">
                                            {isVerifyingCaptcha ? "Vérification..." : "Je ne suis pas un robot"}
                                        </label>
                                    </div>
                                    <div className="flex flex-col items-end opacity-20 grayscale scale-75 origin-right">
                                        <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="w-5 h-5 mb-0.5" />
                                        <span className="text-[6px] font-bold text-gray-900 leading-none">reCAPTCHA</span>
                                        <span className="text-[5px] text-gray-900 leading-none uppercase tracking-tighter">Confidentialité</span>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg"
                                    disabled={loading || !captchaKey}
                                >
                                    {loading ? "Création..." : "S'inscrire"}
                                </Button>

                                <div className="text-center pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setView("login")}
                                        className="text-xs text-gray-500 hover:text-blue-900 transition-colors"
                                    >
                                        Déjà un compte ? <span className="font-bold underline">Se connecter</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {view === "login" && (
                            <>
                                <FloatingInput label="Adresse Email" id="email" type="email" value={formData.email} onChange={handleChange} />
                                <FloatingInput
                                    label="Mot de passe"
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    showToggle={true}
                                    isPasswordVisible={showPassword}
                                    onToggleVisibility={() => setShowPassword(!showPassword)}
                                />
                                <div className="flex items-center justify-between text-[11px] py-1">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="remember"
                                            checked={rememberMe}
                                            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                            className="border-gray-300 data-[state=checked]:bg-blue-900 data-[state=checked]:border-blue-900"
                                        />
                                        <label htmlFor="remember" className="text-gray-600 font-medium cursor-pointer">
                                            Se souvenir de moi
                                        </label>
                                    </div>
                                    <button type="button" onClick={() => setView("forgot_password")} className="text-red-500 font-medium hover:text-red-600 transition-colors">
                                        Mot de passe oublié ?
                                    </button>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-950/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
                                    disabled={loading}
                                >
                                    {loading ? "Connexion..." : "Se connecter"}
                                </Button>
                                <div className="text-center pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setView("signup")}
                                        className="text-xs text-gray-500 hover:text-blue-900 transition-colors"
                                    >
                                        Pas encore de compte ? <span className="font-bold underline">S'inscrire</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {view === "forgot_password" && (
                            <>
                                <FloatingInput label="Adresse Email" id="email" type="email" value={formData.email} onChange={handleChange} />
                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-950/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
                                    disabled={loading}
                                >
                                    {loading ? "Envoi..." : "Envoyer le lien"}
                                </Button>
                                <div className="text-center pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setView("login")}
                                        className="text-xs text-gray-500 hover:text-blue-900 transition-colors font-bold underline"
                                    >
                                        Retour à la connexion
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-100" />
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase">
                                <span className="bg-white px-2 text-gray-400 font-medium tracking-wider">Ou</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50 h-11 rounded-xl text-gray-700 font-bold transition-all text-xs"
                            onClick={() => loginWithGoogle()}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continuer avec Google
                        </Button>
                    </form>

                    <div className="mt-8 pt-4 border-t border-gray-50">
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            En continuant, vous acceptez nos <span onClick={() => setShowTerms(true)} className="font-bold text-blue-900 cursor-pointer hover:underline">Conditions d'utilisation</span> et confirmez avoir lu notre <span onClick={() => setShowPrivacy(true)} className="font-bold text-blue-900 cursor-pointer hover:underline">Politique de confidentialité</span>.
                        </p>
                    </div>
                </div>

                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-yellow-400 rounded-full items-center justify-center shadow-lg shadow-yellow-400/30 cursor-pointer hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 text-white ml-1 fill-current" />
                </div>

                <div className="hidden md:block w-1/2 relative bg-blue-950 overflow-hidden">
                    <img
                        src={authImage}
                        alt="Futuristic AI Visualization"
                        className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-screen"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-transparent to-transparent"></div>

                    <div className="absolute inset-0 flex flex-col justify-end p-12 z-10">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                            <h3 className="text-white font-black text-2xl mb-3 tracking-tight uppercase">L'IA au service de votre business</h3>
                            <p className="text-blue-100 text-[13px] leading-relaxed font-medium">
                                Déployez des agents intelligents pour automatiser vos processus, répondre à vos clients et développer votre activité, pendant que vous vous concentrez sur l'essentiel.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Conditions d'utilisation */}
            {showTerms && (
                <div className="absolute inset-0 bg-white z-[300] animate-in fade-in duration-300 flex flex-col">
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Conditions d'utilisation</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Dernière mise à jour : Avril 2026</p>
                        </div>
                        <button onClick={() => setShowTerms(false)} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    <div className="p-10 overflow-y-auto custom-scrollbar prose prose-sm max-w-none">
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-widest mb-3">1. Acceptation des conditions</h3>
                                <p className="text-gray-600 leading-relaxed text-[13px]">
                                    En accédant à la plateforme MAGIA, vous acceptez d'être lié par les présentes conditions d'utilisation. MAGIA fournit une infrastructure de gestion d'agents IA autonomes. L'utilisation de ces services implique une acceptation sans réserve de ces clauses.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-widest mb-3">2. Description du service</h3>
                                <p className="text-gray-600 leading-relaxed text-[13px]">
                                    MAGIA permet la création, le déploiement et la gestion de "Teams" d'agents basés sur des modèles de langage avancés (LLM). Le service inclut l'automatisation des flux de travail, la communication omnicanale (WhatsApp, Email) et l'intégration de bases de connaissances.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-widest mb-3">3. Responsabilité de l'utilisateur</h3>
                                <p className="text-gray-600 leading-relaxed text-[13px]">
                                    L'utilisateur est seul responsable du paramétrage de ses agents et du contenu qu'ils diffusent. Il est strictement interdit d'utiliser MAGIA pour générer du contenu illégal, haineux, ou frauduleux. MAGIA se réserve le droit de suspendre tout compte ne respectant pas ces directives.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-widest mb-3">4. Limitation de responsabilité</h3>
                                <p className="text-gray-600 leading-relaxed text-[13px]">
                                    Les agents MAGIA utilisent des modèles IA tiers. Bien que nous visions une précision maximale, MAGIA ne peut être tenue responsable des erreurs d'interprétation ou des "hallucinations" produites par les modèles d'intelligence artificielle.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-widest mb-3">5. Propriété Intellectuelle</h3>
                                <p className="text-gray-600 leading-relaxed text-[13px]">
                                    Toute l'architecture logicielle, le design et les algorithmes de la plateforme MAGIA sont la propriété exclusive de MAGIA. Les données injectées dans les agents par l'utilisateur (bases de connaissances) restent sa propriété.
                                </p>
                            </section>
                        </div>
                    </div>
                    <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
                        <Button onClick={() => setShowTerms(false)} className="bg-blue-950 hover:bg-blue-900 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] h-11">
                            J'ai compris
                        </Button>
                    </div>
                </div>
            )}

            {/* Modal: Politique de confidentialité */}
            {showPrivacy && (
                <div className="absolute inset-0 bg-white z-[300] animate-in fade-in slide-in-from-bottom-5 duration-300 flex flex-col">
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Politique de confidentialité</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Protection de vos données</p>
                        </div>
                    </div>
                    <div className="p-10 overflow-y-auto custom-scrollbar prose prose-sm max-w-none">
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-widest mb-3">1. Données collectées</h3>
                                <p className="text-gray-600 leading-relaxed text-[13px]">
                                    Nous collectons les informations nécessaires à votre compte (nom, email, téléphone) ainsi que les données relatives à l'activité de vos agents afin d'assurer le bon fonctionnement du service.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-widest mb-3">2. Utilisation de l'IA</h3>
                                <p className="text-gray-600 leading-relaxed text-[13px]">
                                    MAGIA s'interface avec les API de Google Gemini. Aucune donnée utilisateur n'est vendue à des tiers. Vos conversations et documents servent exclusivement à alimenter l'intelligence de vos propres agents.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-widest mb-3">3. Sécurité des données</h3>
                                <p className="text-gray-600 leading-relaxed text-[13px]">
                                    Toutes les communications entre MAGIA et nos utilisateurs sont chiffrées via le protocole SSL. Vos documents de connaissance sont stockés dans des environnements sécurisés et isolés.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-widest mb-3">4. Cookies</h3>
                                <p className="text-gray-600 leading-relaxed text-[13px]">
                                    Nous utilisons des cookies essentiels pour maintenir votre session active et assurer la sécurité de l'authentification.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-widest mb-3">5. Vos droits (RGPD)</h3>
                                <p className="text-gray-600 leading-relaxed text-[13px]">
                                    Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Vous pouvez exercer ces droits directement depuis votre interface de gestion ou en contactant notre support.
                                </p>
                            </section>
                        </div>
                    </div>
                    <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
                        <Button onClick={() => setShowPrivacy(false)} className="bg-blue-950 hover:bg-blue-900 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] h-11">
                            Fermer
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
