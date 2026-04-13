import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

interface AcceptInvitationProps {
    onAuthSuccess: () => void;
    openAuth: (tab: "login" | "signup") => void;
}

export function AcceptInvitation({ onAuthSuccess, openAuth }: AcceptInvitationProps) {
    const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
    const [message, setMessage] = useState("Traitement de votre invitation...");
    const [inviteData, setInviteData] = useState<any>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        const checkInvite = async () => {
            if (!token) {
                setStatus('error');
                setMessage("Lien d'invitation invalide (token manquant).");
                return;
            }

            try {
                const res = await fetch(`http://localhost:8000/api/auth/invite/check/?token=${token}`);
                const data = await res.json();

                if (res.ok) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    sessionStorage.setItem('invitation_token', token || "");

                    setStatus('redirecting');
                    setInviteData(data);

                    setTimeout(() => {
                        window.location.href = `/?autoOpen=${data.exists ? 'login' : 'signup'}&email=${encodeURIComponent(data.email)}`;
                    }, 1500);
                } else {
                    setStatus('error');
                    setMessage(data.error || "Erreur lors de la vérification de l'invitation.");
                }
            } catch (err) {
                setStatus('error');
                setMessage("Erreur réseau. Veuillez réessayer plus tard.");
            }
        };

        if (token) checkInvite();
    }, []);

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[9999]">
            <div className="max-w-md w-full p-8 bg-white/5 border border-white/10 rounded-2xl text-center space-y-6">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                        <h2 className="text-xl font-serif font-bold text-white">Vérification de l'invitation...</h2>
                    </>
                )}

                {status === 'redirecting' && (
                    <>
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                            <CheckCircle2 className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-serif font-bold text-white">Invitation validée !</h2>
                        <p className="text-slate-400 text-sm italic">
                            Redirection vers le workspace de <span className="text-white font-bold">{inviteData?.workspace_owner}</span>...
                        </p>
                        <div className="pt-4">
                            <p className="text-[10px] text-blue-400 uppercase tracking-widest font-black animate-pulse">
                                {inviteData?.exists ? "Veuillez vous connecter" : "Veuillez créer un compte"}
                            </p>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <button
                        onClick={() => window.location.href = "/"}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-gray-800 transition-all"
                    >
                        Retour à l'accueil
                    </button>
                )}
            </div>
        </div>
    );
}
