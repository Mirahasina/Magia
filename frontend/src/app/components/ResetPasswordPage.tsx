import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Logo } from "./Logo";

export function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{type: "error" | "success", text: string} | null>(null);
    const [uid, setUid] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setUid(params.get("uid"));
        setToken(params.get("token"));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        
        if (password !== confirmPassword) {
            setMessage({ type: "error", text: "Les mots de passe ne correspondent pas." });
            return;
        }

        if (!uid || !token) {
            setMessage({ type: "error", text: "Lien de réinitialisation invalide." });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("http://localhost:8000/api/auth/reset-password/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uidb64: uid,
                    token: token,
                    new_password: password,
                    new_password_confirm: confirmPassword
                }),
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || data.new_password?.[0] || data.new_password_confirm?.[0] || "Erreur de réinitialisation");
            }
            
            setMessage({ type: "success", text: "Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers l'accueil." });
            setTimeout(() => {
                window.location.href = "/";
            }, 3000);
        } catch (err: any) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-blue-50/50 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] left-[30%] w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[50%] right-[10%] w-[400px] h-[400px] bg-blue-200/15 rounded-full blur-[100px] animate-float-reverse" />
            </div>

            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl z-10 border border-gray-100">
                <div className="flex justify-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center p-2">
                        <Logo />
                    </div>
                </div>

                <h2 className="text-2xl font-extrabold text-blue-950 text-center mb-2 tracking-tight">Nouveau mot de passe</h2>
                <p className="text-gray-500 text-sm text-center mb-8">
                    Veuillez saisir votre nouveau mot de passe ci-dessous.
                </p>

                {message && (
                    <div className={`p-3 mb-6 border text-sm rounded-xl ${message.type === "error" ? "bg-red-50 border-red-200 text-red-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <input
                            type="password"
                            id="new_password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="block px-4 pb-2 pt-6 w-full text-sm text-gray-900 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 peer transition-all"
                            placeholder=" "
                            required
                        />
                        <label
                            htmlFor="new_password"
                            className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-focus:text-blue-900 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 pointer-events-none font-medium"
                        >
                            Nouveau mot de passe
                        </label>
                    </div>

                    <div className="relative">
                        <input
                            type="password"
                            id="confirm_password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="block px-4 pb-2 pt-6 w-full text-sm text-gray-900 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 peer transition-all"
                            placeholder=" "
                            required
                        />
                        <label
                            htmlFor="confirm_password"
                            className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-focus:text-blue-900 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 pointer-events-none font-medium"
                        >
                            Confirmer le mot de passe
                        </label>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full h-12 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-950/20 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? "Réinitialisation..." : "Enregistrer le mot de passe"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
