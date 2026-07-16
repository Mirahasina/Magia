import { API_BASE } from "../../../lib/api";
import { cn } from "../ui/utils";
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PageSpinner } from "../shared/PageSpinner";

interface SyntheseViewProps {
    setIsCreatingAgent: (open: boolean) => void;
}

// Generate some initial dynamic mock data for the chart to make it look alive
const generateChartData = () => {
    const data = [];
    let value = 40;
    for (let i = 0; i < 7; i++) {
        value += Math.floor(Math.random() * 30) - 10;
        data.push({
            name: `Jour ${i + 1}`,
            conversations: Math.max(10, value),
            responses: Math.max(5, value - 5),
        });
    }
    return data;
};

export function SyntheseView({ setIsCreatingAgent }: SyntheseViewProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE}/agents/dashboard_stats/`, {
                headers: {
                    "Authorization": "Bearer " + localStorage.getItem("access_token")
                }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                if (data.graph_data) {
                    setChartData(data.graph_data);
                }
            }
        } catch (err) {
            console.error("Failed to fetch dashboard stats", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();

        // Polling to keep the dashboard feeling live
        const interval = setInterval(() => {
            fetchStats();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-[400px] h-full">
                <PageSpinner label="Chargement de la synthèse…" />
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
        <div className="magia-page animate-in fade-in slide-in-from-bottom-4 duration-500 pb-2">
            <div className="magia-page-header">
                <div className="flex items-baseline gap-4">
                    <h1 className="magia-title">Tableau de bord</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsCreatingAgent(true)} className="px-4 py-2 bg-blue-900 text-white magia-button shadow-lg shadow-blue-100 hover:scale-[1.05] active:scale-[0.98] transition-all duration-300 rounded-lg relative overflow-hidden group">
                        <span className="relative z-10">NOUVEL AGENT</span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 magia-grid">
                {[
                    { label: "CONVERSATIONS", value: (displayStats?.conversations ?? 0).toString(), change: "TOTAL", color: "text-blue-900", spark: "M0 15 Q10 5, 20 15 T40 10 T60 18 T80 5" },
                    { label: "RÉPONSES IA", value: (displayStats?.ai_responses ?? 0).toString(), change: "GÉRÉES", color: "text-blue-600", spark: "M0 18 Q10 15, 20 18 T40 12 T60 15 T80 18" },
                    { label: "AGENTS ACTIFS", value: (displayStats?.active_agents ?? 0).toString(), change: "EN LIGNE", color: "text-amber-600", spark: "M0 12 Q10 8, 20 12 T40 10 T60 14 T80 12" },
                ].map((stat, i) => (
                    <div key={i} className="magia-card flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
                        <div className="flex items-center justify-between mb-1">
                            <span className="magia-label">{stat.label}</span>
                            <span className={cn("magia-detail", stat.color)}>{stat.change}</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <p className="magia-value text-3xl group-hover:scale-110 origin-left transition-transform duration-300">{stat.value}</p>
                            <svg viewBox="0 0 80 20" className="w-16 h-8 opacity-40 group-hover:opacity-100 group-hover:stroke-[3px] transition-all duration-300">
                                <path d={stat.spark} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={stat.color} />
                            </svg>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-12 magia-grid">
                <div className="col-span-8 magia-card flex flex-col justify-between hover:shadow-lg transition-all duration-300 min-h-[260px]">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="magia-section text-base">Croissance & Engagement</h3>
                        <div className="flex gap-4 text-[10px]">
                            <span className="flex items-center gap-2 font-bold text-blue-900 leading-none">
                                <span className="w-2 h-0.5 bg-current" /> CONVERSATIONS
                            </span>
                            <span className="flex items-center gap-2 font-bold text-blue-400 leading-none">
                                <span className="w-2 h-0.5 bg-current" /> IA
                            </span>
                            <span className="flex items-center gap-2 font-bold text-emerald-500 leading-none bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> LIVE
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 w-full mt-4 -ml-4 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorResp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="conversations" stroke="#1e3a8a" strokeWidth={3} fillOpacity={1} fill="url(#colorConv)" animationDuration={1500} />
                                <Area type="monotone" dataKey="responses" stroke="#60a5fa" strokeWidth={3} fillOpacity={1} fill="url(#colorResp)" animationDuration={1500} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="col-span-4 magia-card flex flex-col hover:shadow-lg transition-all duration-300 min-h-[260px]">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                        Activité Récente
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">LIVE</span>
                    </h3>
                    <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {(displayStats?.recent_activity?.length ?? 0) > 0 ? displayStats.recent_activity.map((act: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 border border-transparent hover:border-gray-100 hover:bg-gray-50 hover:shadow-sm cursor-pointer transition-all duration-200 rounded-xl group animate-in fade-in slide-in-from-right-4" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-[11px] text-white font-semibold overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-300", act.color)}>
                                        {act.avatar ? (
                                            <img src={act.avatar} alt={act.user} className="w-full h-full object-cover" />
                                        ) : (
                                            act.user?.charAt(0) || "?"
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[12px] font-semibold text-gray-900 truncate group-hover:text-blue-900 transition-colors">{act.user}</p>
                                        <p className="text-[11px] text-gray-400 font-medium italic truncate w-[130px]" title={act.action}>{act.action}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-gray-300 ml-2 group-hover:text-blue-900 transition-colors">{act.time}</span>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50 py-16">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <p className="text-xs text-gray-500 font-bold">Aucune activité</p>
                                <p className="text-[10px] text-gray-400 italic">En attente de nouvelles interactions...</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-span-12 grid grid-cols-4 magia-grid">
                    {[
                        { label: "ÉCONOMIE", val: displayStats?.economy_eur || "0 €" },
                        { label: "AUTOMATISATION", val: displayStats?.automation_rate || "0%" },
                        { label: "RÉPONSES", val: (displayStats?.ai_responses ?? 0).toString() },
                        { label: "GAIN TEMPS", val: displayStats?.time_saved || "0h" }
                    ].map((s, i) => (
                        <div key={s.label} className="magia-card hover:border-blue-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-pointer animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="text-[10px] font-semibold text-gray-400 mb-1 relative z-10 group-hover:text-blue-900 transition-colors">{s.label}</div>
                            <div className="text-2xl font-bold text-gray-900 tracking-tight relative z-10">{s.val}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-100 flex items-center justify-between rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-900"></span>
                    </div>
                    <p className="magia-description text-blue-950/80">
                        Données synchronisées en temps réel.
                    </p>
                </div>
                <button onClick={() => fetchStats()} className="px-4 py-1.5 bg-white text-blue-900 magia-button rounded-md hover:bg-blue-50 hover:scale-105 active:scale-95 border border-blue-100 shadow-sm transition-all duration-200">
                    ACTUALISER
                </button>
            </div>
        </div>
    );
}
