"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "./ui/dialog";
import { Logo } from "./Logo";
import { Play, X, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import authImage from "../../assets/auth-futuristic.png";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultView?: "login" | "signup";
    onSuccess?: () => void;
}

const FloatingInput = ({ label, type = "text", id, value, onChange, showToggle = false, isPasswordVisible = false, onToggleVisibility, ...props }: any) => {
    return (
        <div className="relative">
            <input
                type={showToggle ? (isPasswordVisible ? "text" : "password") : type}
                id={id}
                value={value}
                onChange={onChange}
                className="block px-4 pb-2 pt-6 w-full text-sm text-gray-900 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 peer transition-all"
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

export function AuthModals({ isOpen, onClose, defaultView = "signup", onSuccess }: AuthModalProps) {

    const [view, setView] = useState<"login" | "signup" | "forgot_password">(defaultView);
    const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [captchaKey, setCaptchaKey] = useState("");

    useEffect(() => {
        if (isOpen) {
            setView(defaultView);
            setErrorMsg("");
        }
    }, [isOpen, defaultView]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async () => {
        setErrorMsg("");
        setLoading(true);
        console.log("Submitting", view);

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
                const res = await fetch("http://localhost:8000/api/auth/register/", {
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
                const res = await fetch("http://localhost:8000/api/auth/login/", {
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

                onSuccess?.();
            } else if (view === "forgot_password") {
                const res = await fetch("http://localhost:8000/api/auth/forgot-password/", {
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl animate-in fade-in zoom-in-95 duration-300 bg-white">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-gray-100/50 hover:bg-gray-200 rounded-full transition-colors focus:outline-none backdrop-blur-sm"
                    aria-label="Fermer"
                >
                    <X className="w-5 h-5 text-gray-700" />
                </button>
                <DialogTitle className="sr-only">
                    {view === "signup" ? "Créer un compte MAGIA" : view === "forgot_password" ? "Mot de passe oublié" : "Connexion MAGIA"}
                </DialogTitle>
                <div className="flex flex-col md:flex-row h-full min-h-[600px] relative">

                    <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative bg-white z-10">
                        <div className="flex items-center gap-2 mb-10">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center p-1">
                                <Logo />
                            </div>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-3xl font-extrabold text-blue-950 mb-2 tracking-tight">
                                {view === "login" ? "Bon retour !" : view === "forgot_password" ? "Mot de passe oublié ?" : "Créer un compte"}
                            </h2>
                            <p className="text-gray-500 text-sm">
                                {view === "login"
                                    ? "Connectez-vous pour accéder à votre espace."
                                    : view === "forgot_password"
                                    ? "Saisissez votre email. Nous vous enverrons un lien de réinitialisation."
                                    : "Rejoignez-nous et déployez vos agents IA."}
                            </p>
                        </div>

                        <div className="space-y-4 animate-in slide-in-from-left-4 fade-in duration-500" key={view}>
                            {errorMsg && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                                    {errorMsg}
                                </div>
                            )}
                            {successMsg && (
                                <div className="p-3 bg-green-50 border border-green-200 text-green-600 text-sm rounded-xl">
                                    {successMsg}
                                </div>
                            )}
                            {view === "signup" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FloatingInput label="Prénom" id="firstName" value={formData.firstName} onChange={handleChange} />
                                    <FloatingInput label="Nom" id="lastName" value={formData.lastName} onChange={handleChange} />
                                </div>
                            )}

                            <FloatingInput label="Adresse Email" id="email" type="email" value={formData.email} onChange={handleChange} />

                            {view === "signup" && (
                                <FloatingInput label="Numéro de téléphone" id="phone" type="tel" value={formData.phone} onChange={handleChange} />
                            )}

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

                            {view === "signup" && (
                                <FloatingInput 
                                    label="Confirmer le mot de passe" 
                                    id="confirmPassword" 
                                    type="password" 
                                    value={formData.confirmPassword} 
                                    onChange={handleChange}
                                    showToggle={true}
                                    isPasswordVisible={showPassword}
                                    onToggleVisibility={() => setShowPassword(!showPassword)}
                                />
                            )}

                            {view === "login" && (
                                <div className="flex items-center justify-between text-sm py-2">
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
                                    <button onClick={() => setView("forgot_password")} className="text-red-500 font-medium hover:text-red-600 transition-colors">
                                        Mot de passe oublié ?
                                    </button>
                                </div>
                            )}

                            {view === "signup" && (
                                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <Checkbox 
                                            id="captcha" 
                                            checked={!!captchaKey}
                                            onCheckedChange={(checked) => setCaptchaKey(checked ? "mock-token-" + Math.random() : "")}
                                            className="w-6 h-6 border-gray-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" 
                                        />
                                        <label htmlFor="captcha" className="text-sm font-bold text-gray-700 cursor-pointer">
                                            Je ne suis pas un robot
                                        </label>
                                    </div>
                                    <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="w-6 h-6 opacity-50" />
                                </div>
                            )}

                            <div className="pt-4 flex flex-col gap-3 sm:flex-row">
                                {view === "login" ? (
                                    <>
                                        <Button
                                            className="flex-1 h-12 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-950/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
                                            onClick={handleSubmit}
                                            disabled={loading}
                                        >
                                            {loading ? "Connexion..." : "Se connecter"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-12 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl transition-all"
                                            onClick={() => setView("signup")}
                                            disabled={loading}
                                        >
                                            Créer un compte
                                        </Button>
                                    </>
                                ) : view === "forgot_password" ? (
                                    <>
                                        <Button
                                            className="flex-1 h-12 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-950/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
                                            onClick={handleSubmit}
                                            disabled={loading}
                                        >
                                            {loading ? "Envoi..." : "Envoyer le lien"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-12 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl transition-all"
                                            onClick={() => setView("login")}
                                            disabled={loading}
                                        >
                                            Retour à la connexion
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            className="flex-1 h-12 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-950/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
                                            onClick={handleSubmit}
                                            disabled={loading}
                                        >
                                            {loading ? "Création..." : "S'inscrire"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-12 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl transition-all"
                                            onClick={() => setView("login")}
                                            disabled={loading}
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
                                En continuant, vous acceptez nos <a href="#" className="font-medium text-blue-900 hover:underline">Conditions d'utilisation</a> et confirmez avoir lu notre <a href="#" className="font-medium text-blue-900 hover:underline">Politique de confidentialité</a>.
                            </p>
                        </div>
                    </div>

                    {/* Bouton Cercle central superposé */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-yellow-400 rounded-full items-center justify-center shadow-lg shadow-yellow-400/30 cursor-pointer hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 text-white ml-1 fill-current" />
                    </div>

                    {/* Colonne de droite (Image / Illustration) */}
                    <div className="hidden md:block w-1/2 relative bg-blue-950 overflow-hidden">
                        <img 
                            src={authImage} 
                            alt="Futuristic AI Visualization" 
                            className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-screen"
                        />
                        
                        {/* Overlay pour assurer la lisibilité du texte si besoin */}
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-transparent to-transparent"></div>

                        {/* Contenu superposé / Texte d'inspiration */}
                        <div className="absolute inset-0 flex flex-col justify-end p-12 z-10">
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-700"></div>
                                <h3 className="text-white font-bold text-2xl mb-3 tracking-tight">L'IA au service de votre business</h3>
                                <p className="text-blue-100 text-sm leading-relaxed">
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
