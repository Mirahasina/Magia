import { API_BASE } from "../../../lib/api";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Zap, CreditCard, Receipt, FileText, ArrowUpRight } from "lucide-react";
import { cn } from "../ui/utils";

interface SubscriptionData {
    plan_name: string;
    num_agents: number;
    is_annual: boolean;
    status: string;
    active_until: string;
    created_at: string;
    card_last4?: string;
    card_brand?: string;
    card_exp_month?: string;
    card_exp_year?: string;
}

interface TransactionData {
    id: string;
    amount: string;
    currency: string;
    gateway: string;
    status: string;
    created_at: string;
}

export function FacturationView({
    refreshKey = 0,
    onUpgrade,
    onUpdateCard,
    onRequestEnterprise,
}: {
    refreshKey?: number,
    onUpgrade?: (details: any) => void,
    onUpdateCard?: () => void,
    onRequestEnterprise?: () => void,
}) {
    const [sub, setSub] = useState<SubscriptionData | null>(null);
    const [transactions, setTransactions] = useState<TransactionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [agentsToBuy, setAgentsToBuy] = useState(5);

    useEffect(() => {
        const fetchSub = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const response = await fetch(`${API_BASE}/auth/subscription/`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setSub(data);
                    setAgentsToBuy(data.num_agents);
                }
            } catch (error) {
                console.error("Error fetching subscription", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchTransactions = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const res = await fetch(`${API_BASE}/auth/payments/transactions/`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    setTransactions(await res.json());
                }
            } catch (err) {
                console.error("Error fetching transactions", err);
            }
        };

        const handleDownloadInvoice = async (transactionId: string) => {
            try {
                const token = localStorage.getItem("access_token");
                const response = await fetch(`${API_BASE}/auth/payments/transactions/${transactionId}/download/`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (response.ok) {
                    const blob = await response.json();
                }
            } catch (err) {
                console.error("Error downloading invoice", err);
            }
        };

        fetchSub();
        fetchTransactions();
    }, [refreshKey]);

    const handleDownload = async (id: string) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${API_BASE}/auth/payments/transactions/${id}/download/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `facture_${id.substring(0, 8)}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        } catch (err) {
            console.error("Download failed", err);
        }
    };

    const handleDownloadFull = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${API_BASE}/auth/payments/transactions/download-history/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `historique_magia.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        } catch (err) {
            console.error("Full history download failed", err);
        }
    };

    if (loading) return <div className="p-8 text-center font-bold text-gray-400">Chargement...</div>;

    const planDisplay = sub?.plan_name === 'pro' ? 'Pro (Personnel)' : sub?.plan_name === 'entreprise' ? 'Entreprise' : 'Gratuit';
    const isGratuit = sub?.plan_name === 'gratuit';
    const isPro = sub?.plan_name === 'pro';
    const isEnterprise = sub?.plan_name === 'entreprise';
    const pricePerAgent = 15;
    const monthlyTotal = isGratuit ? 0 : (sub?.num_agents || 0) * pricePerAgent;

    const nextBillDate = sub?.active_until && !isGratuit
        ? new Date(sub.active_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : "Sans engagement";

    return (
        <div className="space-y-6 animate-in fade-in duration-500 overflow-y-auto max-h-[calc(100vh-120px)] pr-2">
            <div className="flex items-center justify-between shrink-0">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Facturation</h2>
                    <p className="text-gray-500 text-xs font-medium">Gérez votre abonnement, vos moyens de paiement et vos factures.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
                {/* Card 1: Mon Abonnement */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[180px] hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-400">PLAN ACTUEL</h3>
                            </div>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-black text-[9px] uppercase tracking-wider">
                                {sub?.status === 'active' ? 'ACTIF' : sub?.status || 'ACTIF'}
                            </span>
                        </div>

                        <div>
                            <div className="text-2xl font-black text-gray-900 tracking-tight uppercase font-serif">
                                {planDisplay}
                            </div>
                            <p className="text-base font-bold text-blue-900 mt-1">
                                {(monthlyTotal * 5000).toLocaleString('fr-FR')} Ar <span className="text-xs text-gray-500 font-medium">/ mois</span>
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-medium text-gray-600">
                            <span>{sub?.plan_name === 'entreprise' ? 'Agents Illimités' : `${sub?.num_agents} Agents configurés`}</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                {isGratuit ? "Gratuit" : `Renouvellement`}
                            </span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 w-full rounded-full" />
                        </div>
                        <p className="text-[9px] text-gray-400 italic">
                            {isGratuit ? "Débloquez plus de fonctions en passant Pro" : `Prochain prélèvement : ${nextBillDate}`}
                        </p>
                    </div>
                </div>

                {/* Card 2: Moyen de Paiement */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[180px] hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-400">MOYEN DE PAIEMENT</h3>
                            <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100/50">
                            <div className="w-10 h-6 bg-slate-900 rounded flex items-center justify-center text-[8px] font-black italic text-white shadow-sm tracking-wider">
                                {sub?.card_brand?.toUpperCase() || "VISA"}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-black text-gray-800 tracking-tighter">•••• •••• •••• {sub?.card_last4 || "4242"}</p>
                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                    Expire le {sub?.card_exp_month || "12"}/{sub?.card_exp_year || "26"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Auto-débit</span>
                        <Button
                            onClick={onUpdateCard}
                            variant="outline"
                            className="h-7 px-3 border border-gray-200 hover:bg-gray-50 text-gray-800 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all"
                        >
                            Modifier
                        </Button>
                    </div>
                </div>

                {/* Card 3: Export & Documents */}
                <div
                    onClick={transactions.length > 0 ? handleDownloadFull : undefined}
                    className={cn(
                        "bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[180px] hover:shadow-md transition-all duration-300 relative overflow-hidden group",
                        transactions.length > 0 ? "cursor-pointer hover:border-blue-200" : "opacity-90"
                    )}
                >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-400">FACTURES & EXPORTS</h3>
                            <FileText className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-800">Facturation Simplifiée</p>
                            <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                                {transactions.length > 0
                                    ? "Téléchargez l'historique complet de vos transactions au format PDF."
                                    : "Aucune facture ou transaction disponible pour le moment."}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                            {transactions.length} TRANSACTION{transactions.length > 1 ? 'S' : ''}
                        </span>
                        {transactions.length > 0 && (
                            <span className="text-[9px] text-blue-600 font-black uppercase tracking-wider group-hover:underline flex items-center gap-0.5">
                                Télécharger <ArrowUpRight className="w-2.5 h-2.5" />
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Upgrade / Renewal Options Section */}
            {(isGratuit || isPro) && (
                <div className="space-y-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Faire évoluer votre offre
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Pro Plan Card */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[220px]">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-[9px] font-black uppercase tracking-wider rounded-md">
                                        PLAN PRO
                                    </span>
                                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                                </div>

                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-serif font-black text-gray-900">145 000</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ar / mois</span>
                                </div>

                                <div className="text-[10px] text-gray-500 font-medium space-y-1.5 border-t border-gray-50 pt-3">
                                    <p className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        1 000 crédits / mois inclus
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        WhatsApp Business inclus
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        Boîte de réception unifiée
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4">
                                <Button
                                    onClick={() => onUpgrade?.({ numAgents: 1, isAnnual: sub?.is_annual || false, totalPrice: 29, currentPlan: sub?.plan_name || 'gratuit', targetPlan: 'pro' })}
                                    className="w-full h-9 bg-blue-900 hover:bg-blue-950 text-white font-black text-[9px] uppercase tracking-[0.2em] rounded-xl shadow-md border-none transition-all duration-300"
                                >
                                    {isPro ? "Renouveler mon Plan Pro" : "Passer au Plan Pro"}
                                </Button>
                            </div>
                        </div>

                        {/* Enterprise Plan Card */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[220px]">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-800 text-[9px] font-black uppercase tracking-wider rounded-md">
                                        PLAN ENTREPRISE
                                    </span>
                                    <Zap className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-2xl font-serif font-black text-gray-900">{agentsToBuy}</span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Agent{agentsToBuy > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-blue-900 tracking-tight">
                                            {((99 + (agentsToBuy - 1) * 20) * 5000).toLocaleString('fr-FR')} Ar <span className="text-[8px] text-gray-400 font-normal">/m</span>
                                        </p>
                                        <p className="text-[8px] text-gray-400 font-medium">
                                            {99 + (agentsToBuy - 1) * 20}€ / mois
                                        </p>
                                    </div>
                                </div>

                                <div className="relative pt-1 pb-1">
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={agentsToBuy}
                                        onChange={(e) => setAgentsToBuy(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-900"
                                    />
                                    <div className="flex justify-between text-[8px] text-gray-400 font-medium mt-1">
                                        <span>1 agent</span>
                                        <span>50</span>
                                        <span>100</span>
                                    </div>
                                </div>

                                <div className="text-[10px] text-gray-500 font-medium space-y-1.5 border-t border-gray-50 pt-3">
                                    <p className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                        Agents IA Illimités
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                        WhatsApp, LinkedIn, Facebook, Email
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                        API & Webhooks avancés • Support 24/7
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4">
                                <Button
                                    onClick={() => onUpgrade?.({ numAgents: agentsToBuy, isAnnual: sub?.is_annual || false, totalPrice: 99 + (agentsToBuy - 1) * 20, currentPlan: sub?.plan_name || 'gratuit', targetPlan: 'entreprise' })}
                                    className="w-full h-9 bg-white border border-blue-900 text-blue-900 hover:bg-blue-50 font-black text-[9px] uppercase tracking-[0.2em] rounded-xl shadow-sm transition-all duration-300"
                                >
                                    Passer au Plan Entreprise
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transactions Section */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex flex-col shrink-0">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Transactions Effectuées</h3>
                    <Receipt className="w-3.5 h-3.5 text-gray-300" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/30">
                                <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">N° Facture</th>
                                <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Statut</th>
                                <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {transactions.length > 0 ? transactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-[10px] font-bold text-gray-900 uppercase">
                                        {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-[10px] text-gray-400 font-mono font-bold">
                                        {tx.id.substring(0, 8).toUpperCase()}
                                    </td>
                                    <td className="px-6 py-4 text-[10px] text-gray-900 font-medium">
                                        Abonnement MAGIA {sub?.plan_name?.toUpperCase() || ''}
                                        <span className="block text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Via {tx.gateway.toUpperCase()}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
                                            tx.status === 'completed' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                        )}>
                                            {tx.status === 'completed' ? 'Payé' : tx.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[10px] text-gray-900 font-black text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <span>{parseFloat(tx.amount).toLocaleString('fr-FR')} {tx.currency === 'EUR' ? '€' : tx.currency}</span>
                                            <button
                                                onClick={() => handleDownload(tx.id)}
                                                className="p-1.5 bg-gray-50 hover:bg-white hover:shadow-md rounded-lg text-blue-800 transition-all active:scale-95 group-hover:bg-white"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        Aucune transaction pour le moment
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
