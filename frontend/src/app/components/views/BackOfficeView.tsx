import { useState, useEffect } from "react";
import { cn } from "../ui/utils";
import {
    Users,
    Bot,
    CreditCard,
    Activity,
    Search,
    TrendingUp,
    Shield,
    ArrowUpRight,
    ArrowDownRight,
    Eye,
    MessageSquare
} from "lucide-react";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";

type BackOfficeTab = "Tableau de bord" | "Utilisateurs" | "Agents" | "Transactions" | "Demandes" | "Journal" | "Contacts" | "Historique";

export function BackOfficeView({ activeTab: initialTab }: { activeTab?: BackOfficeTab }) {
    const [activeTab, setActiveTab] = useState<BackOfficeTab>(initialTab || "Tableau de bord");
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [dataList, setDataList] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
    const [notifForm, setNotifForm] = useState({ title: "", message: "", type: "system" });

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        if (activeTab === "Tableau de bord") {
            fetchStats();
        } else {
            fetchData(activeTab);
        }
    }, [activeTab]);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("http://localhost:8000/api/admin/stats/", {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error("Failed to fetch admin stats", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchData = async (tab: BackOfficeTab) => {
        setIsLoading(true);
        let endpoint = "";
        switch (tab) {
            case "Utilisateurs": endpoint = "users"; break;
            case "Agents": endpoint = "agents"; break;
            case "Transactions": endpoint = "transactions"; break;
            case "Demandes": endpoint = "pending_requests"; break;
            case "Historique": endpoint = "enterprise_history"; break;
            case "Journal": endpoint = "stats"; break;
            case "Contacts": endpoint = "contacts"; break;
        }

        try {
            const res = await fetch(`http://localhost:8000/api/admin/stats/${endpoint}/`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setDataList(data);
            }
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (action: 'approve_enterprise' | 'reject_enterprise', reqId: string) => {
        try {
            const res = await fetch(`http://localhost:8000/api/admin/stats/${action}/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ request_id: reqId })
            });
            if (res.ok) {
                fetchData(activeTab);
                fetchStats();
            } else {
                const err = await res.json();
                alert(err.error || "Une erreur est survenue");
            }
        } catch (err) {
            console.error("Action failed", err);
        }
    };

    const handleExport = () => {
        if (!dataList.length) return;
        const headers = Object.keys(dataList[0]);
        const csvContent = [
            headers.join(','),
            ...dataList.map(row => headers.map(header => JSON.stringify(row[header] || "")).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `export_${activeTab.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRefund = async (txId: string) => {
        if (!confirm("Voulez-vous vraiment rembourser cette transaction ?")) return;
        try {
            const res = await fetch(`http://localhost:8000/api/admin/stats/refund_transaction/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ transaction_id: txId })
            });
            if (res.ok) {
                fetchData("Transactions");
            } else {
                alert("Erreur lors du remboursement");
            }
        } catch (err) {
            console.error("Refund failed", err);
        }
    };

    const handleSendGlobalNotification = async (title: string, message: string, type: string) => {
        try {
            const res = await fetch(`http://localhost:8000/api/admin/stats/send_global_notification/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ title, message, type })
            });
            if (res.ok) {
                alert("Notification envoyée avec succès !");
                setIsNotifModalOpen(false);
            } else {
                alert("Erreur lors de l'envoi");
            }
        } catch (err) {
            console.error("Notif failed", err);
        }
    };

    const renderDashboard = () => {
        if (!stats) return null;
        const kpis = stats.kpis || {};
        const charts = stats.charts || { revenue: [], users: [] };

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Utilisateurs"
                        value={kpis.total_users}
                        icon={<Users className="w-6 h-6 text-blue-600" />}
                        trend={kpis.recent_users_30d}
                        trendText="nouveaux (30j)"
                        color="blue"
                    />
                    <StatCard
                        title="Agents IA"
                        value={kpis.total_agents}
                        icon={<Bot className="w-6 h-6 text-purple-600" />}
                        color="purple"
                    />
                    <StatCard
                        title="Revenu Total"
                        value={`${kpis.total_revenue?.toLocaleString()} Ar`}
                        icon={<CreditCard className="w-6 h-6 text-emerald-600" />}
                        trend={`${kpis.recent_revenue_30d?.toLocaleString()} Ar`}
                        trendText="ce mois"
                        color="emerald"
                    />
                    <StatCard
                        title="Abonnés Actifs"
                        value={kpis.active_subscriptions}
                        icon={<Activity className="w-6 h-6 text-orange-600" />}
                        color="orange"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm h-[350px] flex flex-col">
                        <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            Revenu Mensuel (Ar)
                        </h3>
                        <div className="flex-1 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={charts.revenue}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm h-[350px] flex flex-col">
                        <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            Nouveaux Utilisateurs
                        </h3>
                        <div className="flex-1 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.users}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-500" />
                                Journal d'Audit
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {stats.recent_logs?.map((log: any) => (
                                <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
                                    <div className="p-2 bg-gray-100 rounded-xl mt-1">
                                        <Shield className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-medium text-sm">{log.action}</p>
                                            <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 truncate">{log.details}</p>
                                        <p className="text-xs text-gray-400 mt-1">Par: {log.user}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div onClick={() => setActiveTab("Demandes")} className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform">
                            <h4 className="font-medium mb-1 opacity-80 uppercase text-[10px] tracking-widest font-black">Entreprise</h4>
                            <div className="text-4xl font-bold mt-2">{stats.pending_enterprise || 0}</div>
                            <p className="text-xs mt-1 opacity-60">Demandes en attente</p>
                        </div>
                        <div onClick={() => setActiveTab("Contacts")} className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform">
                            <h4 className="font-medium mb-1 opacity-80 uppercase text-[10px] tracking-widest font-black">Messages</h4>
                            <div className="text-4xl font-bold mt-2">{stats.pending_contacts || 0}</div>
                            <p className="text-xs mt-1 opacity-60">Requêtes de contact</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderTable = () => (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={`Rechercher dans ${activeTab.toLowerCase()}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all"
                    />
                </div>
                <button onClick={handleExport} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4" /> Exporter (CSV)
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                            <th className="px-6 py-4">Détails</th>
                            {activeTab === "Utilisateurs" && <th className="px-6 py-4">Plan</th>}
                            {activeTab === "Agents" && <th className="px-6 py-4">Propriétaire</th>}
                            {activeTab === "Transactions" && <th className="px-6 py-4">Montant</th>}
                            {activeTab === "Demandes" && <th className="px-6 py-4">Entreprise</th>}
                            {activeTab === "Historique" && <th className="px-6 py-4">Status Final</th>}
                            {activeTab === "Contacts" && <th className="px-6 py-4">Message</th>}
                            <th className="px-6 py-4">Statut</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {dataList.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()))).map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold uppercase">
                                            {String(item.email || item.name || item.user_email || "?").charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">{item.email || item.name || item.user_email}</p>
                                            <p className="text-xs text-gray-500">
                                                {item.created_at ? `Le ${new Date(item.created_at).toLocaleDateString()}` : (item.requested_at ? `Demandé le ${new Date(item.requested_at).toLocaleDateString()}` : '')}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                {activeTab === "Utilisateurs" && (
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase",
                                            item.plan === 'entreprise' ? "bg-purple-100 text-purple-700" : item.plan === 'pro' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                        )}>
                                            {item.plan}
                                        </span>
                                    </td>
                                )}
                                {activeTab === "Agents" && <td className="px-6 py-4 text-sm text-gray-600">{item.owner}</td>}
                                {activeTab === "Transactions" && (
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                        {item.amount?.toLocaleString()} {item.currency}
                                    </td>
                                )}
                                {activeTab === "Demandes" && <td className="px-6 py-4 text-sm text-gray-600">{item.company || "N/A"}</td>}
                                {activeTab === "Historique" && (
                                    <td className="px-6 py-4">
                                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium uppercase", item.status === 'approved' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                                            {item.status}
                                        </span>
                                    </td>
                                )}
                                {activeTab === "Contacts" && <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.message}</td>}
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                                        (item.is_active || item.is_deployed || item.status === 'completed' || item.status === 'active' || item.status === 'approved') ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                    )}>
                                        <span className="w-1 h-1 rounded-full bg-current" />
                                        {item.status || 'Actif'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {activeTab === "Demandes" ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleAction('approve_enterprise', item.request_id)} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">Approuver</button>
                                            <button onClick={() => handleAction('reject_enterprise', item.request_id)} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700">Rejeter</button>
                                        </div>
                                    ) : (
                                        <>
                                            {activeTab === "Transactions" && item.status === 'completed' && (
                                                <button 
                                                    onClick={() => handleRefund(item.id)}
                                                    className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors mr-2"
                                                >
                                                    Rembourser
                                                </button>
                                            )}
                                            <button onClick={() => setSelectedItem(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-8 max-w-7xl mx-auto pb-12">
                <div className="flex items-end justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Magia Back-office</h2>
                        <p className="text-gray-500 mt-2 font-medium">Console d'administration globale</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsNotifModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Notification Globale
                        </button>
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                            <Search className="w-4 h-4 text-gray-400 ml-2" />
                            <input type="text" placeholder="Recherche globale..." className="border-none focus:ring-0 text-sm w-64 bg-transparent" />
                        </div>
                    </div>
                </div>

            {isLoading && !stats ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                </div>
            ) : (
                activeTab === "Tableau de bord" ? renderDashboard() : renderTable()
            )}

            {selectedItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-lg">Détails</h3>
                            <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Shield className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {Object.entries(selectedItem).map(([key, value]: [string, any]) => (
                                <div key={key} className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{key}</span>
                                    <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 break-all">{String(value)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Global Notification Modal */}
            {isNotifModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-lg">Notification globale</h3>
                            <button onClick={() => setIsNotifModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <Shield className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Titre</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Ex: Maintenance"
                                    value={notifForm.title}
                                    onChange={e => setNotifForm({...notifForm, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Message</label>
                                <textarea 
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500/20 h-32"
                                    placeholder="Contenu..."
                                    value={notifForm.message}
                                    onChange={e => setNotifForm({...notifForm, message: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setIsNotifModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-100 rounded-xl font-bold text-gray-600">Annuler</button>
                            <button onClick={() => handleSendGlobalNotification(notifForm.title, notifForm.message, notifForm.type)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100">Envoyer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon, trend, trendText, color }: any) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600",
        purple: "bg-purple-50 text-purple-600",
        emerald: "bg-emerald-50 text-emerald-600",
        orange: "bg-orange-50 text-orange-600"
    };
    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform", colors[color])}>{icon}</div>
                {trend && (
                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg">
                        <ArrowUpRight className="w-3 h-3" /> {trend}
                    </div>
                )}
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</p>
            <h4 className="text-2xl font-bold text-gray-900 mt-1">{value}</h4>
            {trendText && <p className="text-[10px] text-gray-400 font-medium mt-1">{trendText}</p>}
        </div>
    );
}
