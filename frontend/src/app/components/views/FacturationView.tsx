import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Zap, CreditCard, Receipt, FileText, ArrowUpRight } from "lucide-react";
import { cn } from "../ui/utils";

interface SubscriptionData {
    plan_name: string;
    num_agents: number;
    is_annual: boolean;
    status: string;
    created_at: string;
    card_last4?: string;
    card_brand?: string;
    card_exp_month?: string;
    card_exp_year?: string;
}

export function FacturationView({ 
    refreshKey = 0, 
    onUpgrade,
    onUpdateCard
}: { 
    refreshKey?: number, 
    onUpgrade?: (details: any) => void,
    onUpdateCard?: () => void
}) {
    const [sub, setSub] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [agentsToBuy, setAgentsToBuy] = useState(2);

    useEffect(() => {
        const fetchSub = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const response = await fetch("http://localhost:8000/api/auth/subscription/", {
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
        fetchSub();
    }, [refreshKey]);

    if (loading) return <div className="p-8 text-center font-bold text-gray-400">Chargement...</div>;

    const planDisplay = sub?.plan_name === 'pro' ? 'Business Pro' : sub?.plan_name === 'entreprise' ? 'Entreprise' : 'Gratuit';
    const isGratuit = sub?.plan_name === 'gratuit';
    const pricePerAgent = 15;
    const monthlyTotal = isGratuit ? 0 : (sub?.num_agents || 0) * pricePerAgent;

    const nextBillDate = sub?.created_at && !isGratuit
        ? new Date(new Date(sub.created_at).setMonth(new Date(sub.created_at).getMonth() + 1)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : "Sans engagement";

    return (
        <div className="space-y-4 animate-in fade-in duration-500 overflow-hidden max-h-[calc(100vh-120px)] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Facturation</h2>
                    <p className="text-gray-500 text-xs font-medium">Gérez votre abonnement et vos paiements.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                <div className={cn(
                    "p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group transition-all duration-500",
                    isGratuit ? "bg-slate-900" : "bg-blue-900 shadow-blue-100"
                )}>
                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70">PLAN ACTUEL</h3>
                            </div>
                            <div className="text-3xl font-serif font-bold mb-1 tracking-tighter uppercase">{planDisplay}</div>
                            <p className="text-base opacity-90 font-bold">{monthlyTotal}€ <span className="text-xs opacity-60 font-medium">/ mois</span></p>
                        </div>
                        <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest items-center">
                                <span className="opacity-70">{sub?.num_agents} Agents configurés</span>
                                <div className="px-2 py-0.5 bg-white/10 rounded-full backdrop-blur-md italic font-black text-[8px]">ACTIF</div>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-white w-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                            </div>
                            <p className="text-[9px] opacity-40 italic uppercase tracking-widest">{isGratuit ? "Passez Pro pour débloquer les fonctions" : `Prélèvement le ${nextBillDate}`}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ajuster mon offre</h4>
                        <Zap className="w-3.5 h-3.5 text-blue-800" />
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-end justify-between">
                            <div className="space-y-0.5">
                                <span className="text-3xl font-serif font-black text-gray-900">{agentsToBuy}</span>
                                <span className="text-[10px] font-bold text-gray-400 ml-2 uppercase tracking-widest">Agents</span>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-blue-900 tracking-tighter">{agentsToBuy * 15}€<span className="text-[8px]">/m</span></p>
                            </div>
                        </div>

                        <div className="relative pt-2 pb-1">
                            <input 
                                type="range" 
                                min="2" 
                                max="50" 
                                value={agentsToBuy} 
                                onChange={(e) => setAgentsToBuy(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-900"
                            />
                        </div>

                        <Button 
                            onClick={() => onUpgrade?.({ numAgents: agentsToBuy, isAnnual: sub?.is_annual || false, totalPrice: agentsToBuy * 15 })}
                            className="w-full h-10 bg-blue-900 hover:bg-blue-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-blue-100 border-none mt-2"
                        >
                            {isGratuit ? 'Passer au Plan Pro' : 'Mettre à jour'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paiement</h4>
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-10 h-6 bg-gray-900 rounded-md flex items-center justify-center text-[8px] font-black italic text-white shadow-md">
                                {sub?.card_brand?.toUpperCase() || "VISA"}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-gray-900 italic tracking-tighter">•••• •••• •••• {sub?.card_last4 || "4242"}</p>
                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                    Expire le {sub?.card_exp_month || "12"}/{sub?.card_exp_year || "26"} • Auto-débit
                                </p>
                            </div>
                        </div>
                        <Button 
                            onClick={onUpdateCard}
                            variant="outline" 
                            className="h-9 px-4 border border-gray-100 hover:bg-gray-50 text-gray-900 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                        >
                            MODIFIER LA CARTE
                        </Button>
                    </div>
                </div>

                <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col justify-center items-center text-center space-y-2">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                        <FileText className="w-5 h-5 text-blue-800" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Facturation Simplifiée</p>
                        <p className="text-[9px] text-gray-500 font-medium max-w-[180px]">Téléchargez vos factures PDF directement depuis l'historique.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Transactions</h3>
                    <Receipt className="w-3.5 h-3.5 text-gray-300" />
                </div>
                <div className="overflow-y-auto flex-1 scrollbar-hide">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Objet</th>
                                <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sub && (
                                <tr className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-[10px] font-bold text-gray-900 uppercase">
                                        {new Date(sub.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-[10px] text-gray-400 font-medium">ABONNEMENT {planDisplay.toUpperCase()}</td>
                                    <td className="px-6 py-4 text-[10px] text-gray-900 font-black text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <span>{monthlyTotal},00 €</span>
                                            <button className="text-blue-800 hover:text-blue-900">
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
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
