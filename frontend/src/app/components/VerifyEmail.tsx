import { API_BASE } from "../../lib/api";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Logo } from "./Logo";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function VerifyEmail() {
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Vérification de votre compte en cours...");

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const uid = urlParams.get("uid");
        const token = urlParams.get("token");

        if (uid && token) {
            verify(uid, token);
        } else {
            setStatus("error");
            setMessage("Lien de vérification invalide.");
        }
    }, []);

    const verify = async (uid: string, token: string) => {
        try {
            const res = await fetch(`${API_BASE}/auth/verify-email/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid, token }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatus("success");
                setMessage(data.message || "Votre email a été vérifié avec succès !");
                if (data.tokens) {
                    localStorage.setItem('access_token', data.tokens.access);
                    localStorage.setItem('refresh_token', data.tokens.refresh);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setTimeout(() => {
                        window.location.href = "/dashboard";
                    }, 2000);
                }
            } else {
                setStatus("error");
                setMessage(data.error || "Le lien a expiré ou est invalide.");
            }
        } catch (err) {
            setStatus("error");
            setMessage("Une erreur est survenue lors de la vérification.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center p-2">
                        <Logo />
                    </div>
                </div>

                {status === "loading" && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-blue-900 animate-spin mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vérification...</h1>
                        <p className="text-gray-500">{message}</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Compte Activé !</h1>
                        <p className="text-gray-500 mb-8">{message}</p>
                        <Button
                            className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg transition-all"
                            onClick={() => window.location.href = "/dashboard"}
                        >
                            Accéder au Tableau de Bord
                        </Button>
                    </div>
                )}

                {status === "error" && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                            <XCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
                        <p className="text-gray-500 mb-8">{message}</p>
                        <Button
                            variant="outline"
                            className="w-full h-12 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl transition-all"
                            onClick={() => window.location.href = "/"}
                        >
                            Retour à l'accueil
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
