import { useState } from 'react';
import { X, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';

export function CheckoutModal({
    details,
    onClose,
    onSuccess
}: {
    details: { numAgents: number, isAnnual: boolean, totalPrice: number },
    onClose: () => void,
    onSuccess?: () => void
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch("http://localhost:8000/api/auth/payments/checkout-intent/", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    plan_name: "pro",
                    num_agents: details.numAgents,
                    gateway: "stripe"
                })
            });
            const data = await res.json();

            if (res.ok && data.checkout_url) {
                window.location.href = data.checkout_url;
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-none shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-900">Finaliser la commande</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
                </div>

                <div className="p-6 space-y-6 flex-1">
                    <div className="bg-blue-50/50 p-4 rounded-none space-y-1 border border-blue-100/50">
                        <div className="flex justify-between items-center text-sm font-black text-blue-900">
                            <span>Licence MAGIA Pro</span>
                            <span>{(details.totalPrice * 5000).toLocaleString('fr-FR')} Ar / mois</span>
                        </div>
                        <div className="text-xs text-blue-700 font-medium">Pour {details.numAgents} agents IA configurés</div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Mode de paiement</p>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="p-4 border rounded-xl flex flex-col items-center gap-2 transition-all shadow-sm border-blue-900 bg-blue-50/30 ring-1 ring-blue-900">
                                <CreditCard className="w-6 h-6 text-blue-900" />
                                <span className="text-[10px] font-black tracking-wider uppercase text-blue-900">Carte Bancaire (Stripe)</span>
                            </div>
                        </div>
                    </div>

                    {error && <div className="text-[10px] font-bold tracking-wider text-red-600 p-3 bg-red-50 rounded-none border border-red-100">{error}</div>}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
                    <Button
                        onClick={handleCheckout}
                        disabled={loading}
                        className="w-full h-12 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all bg-blue-900 hover:bg-blue-800 shadow-blue-100"
                    >
                        {loading ? 'Redirection sécurisée...' : `Payer ${(details.totalPrice * 5000).toLocaleString('fr-FR')} Ar`}
                        {!loading && <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-70" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
