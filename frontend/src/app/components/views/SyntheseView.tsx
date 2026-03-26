import { cn } from "../ui/utils";
import { useState, useEffect } from "react";

interface SyntheseViewProps {
    setIsCreatingAgent: (open: boolean) => void;
}

export function SyntheseView({ setIsCreatingAgent }: SyntheseViewProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/agents/dashboard_stats/", {
                    headers: {
                        "Authorization": "Bearer " + localStorage.getItem("access_token")
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
            </div>
        );
    }

    const displayStats = stats || {
        conversations: 0,
        ai_responses: 0,
        automation_rate: '0%',
        time_saved: '0h',
        economy_eur: '0 €',
        csat: '0%',
        active_agents: 0,
        recent_activity: []
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-2">
            <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-4">
                    <h1 className="magia-h1">Tableau de bord</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsCreatingAgent(true)} className="px-4 py-2 bg-blue-900 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-[1.02] transition-all rounded-lg">
                        NOUVEL AGENT
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: "CONVERSATIONS", value: (displayStats?.conversations ?? 0).toString(), change: "TOTAL", color: "text-blue-900", spark: "M0 15 Q10 5, 20 15 T40 10 T60 18 T80 5" },
                    { label: "SATISFACTION", value: displayStats?.csat ?? "0%", change: "EXCELLENT", color: "text-emerald-600", spark: "M0 10 Q10 12, 20 5 T40 8 T60 5 T80 7" },
                    { label: "RÉPONSES IA", value: (displayStats?.ai_responses ?? 0).toString(), change: "GÉRÉES", color: "text-blue-600", spark: "M0 18 Q10 15, 20 18 T40 12 T60 15 T80 18" },
                    { label: "AGENTS ACTIFS", value: (displayStats?.active_agents ?? 0).toString(), change: "EN LIGNE", color: "text-amber-600", spark: "M0 12 Q10 8, 20 12 T40 10 T60 14 T80 12" },
                ].map((stat, i) => (
                    <div key={i} className="p-4 bg-white border border-gray-100 flex flex-col justify-between rounded-lg shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-1">
                            <span className="magia-label">{stat.label}</span>
                            <span className={cn("text-[9px] font-black uppercase tracking-widest", stat.color)}>{stat.change}</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <p className="text-2xl font-serif font-bold text-gray-900 tracking-tighter">{stat.value}</p>
                            <svg viewBox="0 0 80 20" className="w-12 h-6 opacity-40 group-hover:opacity-100 transition-opacity">
                                <path d={stat.spark} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={stat.color} />
                            </svg>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8 p-4 bg-white border border-gray-100 flex flex-col justify-between rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="magia-h3 text-sm">Croissance & Engagement</h3>
                        <div className="flex gap-4 text-[10px]">
                            <span className="flex items-center gap-2 font-bold text-blue-900 uppercase tracking-widest leading-none">
                                <span className="w-2 h-0.5 bg-current" /> LIVE
                            </span>
                        </div>
                    </div>
                    <svg viewBox="0 0 600 120" className="w-full h-24">
                        <defs>
                            <linearGradient id="growthGradPremium" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgb(30, 58, 138)" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="rgb(30, 58, 138)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {displayStats.conversations > 0 ? (
                            <>
                                <path d="M0 100 Q100 85, 150 65 T300 45 T450 25 T600 15 L600 120 L0 120Z" fill="url(#growthGradPremium)" />
                                <path d="M0 100 Q100 85, 150 65 T300 45 T450 25 T600 15" fill="none" stroke="rgb(30, 58, 138)" strokeWidth="2.5" strokeLinecap="round" />
                                {[0, 150, 300, 450, 600].map((x, i) => (
                                    <circle key={i} cx={x} cy={100 - (i * 20) + (i % 2 * 10)} r="3" fill="white" stroke="rgb(30, 58, 138)" strokeWidth="2" />
                                ))}
                            </>
                        ) : (
                            <>
                                <path d="M0 110 L600 110 L600 120 L0 120Z" fill="url(#growthGradPremium)" />
                                <path d="M0 110 L600 110" fill="none" stroke="rgb(30, 58, 138)" strokeWidth="2.5" strokeLinecap="round" />
                                {[0, 150, 300, 450, 600].map((x, i) => (
                                    <circle key={i} cx={x} cy={110} r="3" fill="white" stroke="rgb(30, 58, 138)" strokeWidth="2" />
                                ))}
                            </>
                        )}
                    </svg>
                </div>

                <div className="col-span-4 p-4 bg-white border border-gray-100 flex flex-col rounded-lg">
                    <h3 className="text-sm font-serif font-bold text-gray-900 mb-3 uppercase tracking-tight">Activité Récente</h3>
                    <div className="space-y-2 flex-1">
                        {displayStats.recent_activity.length > 0 ? displayStats.recent_activity.map((act: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] text-white font-black overflow-hidden shrink-0", act.color)}>
                                        {act.avatar ? (
                                            <img src={act.avatar} alt={act.user} className="w-full h-full object-cover" />
                                        ) : (
                                            act.user.charAt(0)
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight truncate">{act.user}</p>
                                        <p className="text-[10px] text-gray-400 font-medium italic truncate w-[130px]" title={act.action}>{act.action}</p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-bold text-gray-300 ml-2">{act.time}</span>
                            </div>
                        )) : (
                            <p className="text-xs text-gray-400 italic text-center mt-4">Aucune activité récente.</p>
                        )}
                    </div>
                </div>

                {/* ROI Small Section */}
                <div className="col-span-8 grid grid-cols-4 gap-4">
                    {[
                        { label: "ÉCONOMIE", val: displayStats.economy_eur, icon: "💰" },
                        { label: "AUTOMAT.", val: displayStats.automation_rate, icon: "🤖" },
                        { label: "RÉPONSES", val: displayStats.ai_responses.toString(), icon: "💬" },
                        { label: "GAIN TEMPS", val: displayStats.time_saved, icon: "⌛" }
                    ].map((s) => (
                        <div key={s.label} className="p-4 bg-white border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all rounded-lg relative overflow-hidden group">
                            <div className="absolute -right-1 -bottom-1 text-2xl opacity-5 group-hover:scale-125 transition-transform">{s.icon}</div>
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">{s.label}</div>
                            <div className="text-xl font-serif font-bold text-gray-900 tracking-tight relative z-10">{s.val}</div>
                        </div>
                    ))}
                </div>

                {/* Donut Conversion - Glassmorphic Overlay */}
                <div className="col-span-4 p-4 bg-blue-900 flex items-center justify-between overflow-hidden relative group rounded-lg shadow-lg shadow-blue-100">
                    <div className="relative z-10">
                        <h3 className="text-sm font-serif font-bold text-white leading-tight uppercase tracking-tight">Optimisation<br />Machine</h3>
                        <p className="text-[32px] font-serif font-bold text-white tracking-tighter mt-1">{displayStats.automation_rate}</p>
                    </div>
                    <div className="relative z-10 p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
                        <svg viewBox="0 0 40 40" className="w-12 h-12">
                            <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                            <circle cx="20" cy="20" r="18" fill="none" stroke="white" strokeWidth="2.5"
                                strokeDasharray="113" strokeDashoffset="31.6" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                </div>
            </div>

            {/* Bottom Insight Bar - Alert Style */}
            <div className="p-3 bg-blue-50 border border-blue-100 flex items-center justify-between rounded-lg">
                <div className="flex items-center gap-3">
                    <span className="flex h-2 w-2 rounded-full bg-blue-900 animate-pulse" />
                    <p className="text-[11px] font-bold text-blue-950 italic font-serif">
                        Status Système: Tableau de bord synchronisé en temps réel avec tous vos agents déployés.
                    </p>
                </div>
                <button onClick={() => window.location.reload()} className="px-3 py-1 bg-blue-900 text-white text-[9px] font-black uppercase tracking-widest rounded-md hover:bg-blue-950 shadow-sm transition-all">
                    ACTUALISER
                </button>
            </div>
        </div>
    );
}
