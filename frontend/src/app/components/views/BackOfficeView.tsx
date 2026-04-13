import { useState, useEffect } from "react";
import { cn } from "../ui/utils";
import {
    Users,
    Bot,
    CreditCard,
    Activity,
    Search,
    TrendingUp,
    Calendar,
    MessageSquare,
    Shield,
    ArrowUpRight,
    ArrowDownRight,
    Eye
} from "lucide-react";

type BackOfficeTab = "Tableau de bord" | "Utilisateurs" | "Agents" | "Transactions" | "Journal";

export function BackOfficeView({ activeTab: initialTab }: { activeTab?: BackOfficeTab }) {
    const [activeTab, setActiveTab] = useState<BackOfficeTab>(initialTab || "Tableau de bord");
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [dataList, setDataList] = useState<any[]>([]);

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
            case "Journal": endpoint = "stats"; break;
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const renderDashboard = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Utilisateurs"
                    value={stats?.kpis?.total_users}
                    icon={<Users className="w-6 h-6 text-blue-600" />}
                    trend={stats?.kpis?.recent_users_30d}
                    trendText="nouveaux (30j)"
                    color="blue"
                />
                <StatCard
                    title="Agents IA"
                    value={stats?.kpis?.total_agents}
                    icon={<Bot className="w-6 h-6 text-purple-600" />}
                    color="purple"
                />
                <StatCard
                    title="Revenu Total"
                    value={formatCurrency(stats?.kpis?.total_revenue)}
                    icon={<CreditCard className="w-6 h-6 text-emerald-600" />}
                    trend={formatCurrency(stats?.kpis?.recent_revenue_30d)}
                    trendText="ce mois"
                    color="emerald"
                />
                <StatCard
                    title="Abonnés Actifs"
                    value={stats?.kpis?.active_subscriptions}
                    icon={<Activity className="w-6 h-6 text-orange-600" />}
                    color="orange"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-500" />
                            Journal d'Audit Global
                        </h3>
                        <button onClick={() => setActiveTab("Journal")} className="text-sm text-blue-600 hover:underline">
                            Voir tout
                        </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {stats?.recent_logs?.map((log: any) => (
                            <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
                                <div className="p-2 bg-gray-100 rounded-xl mt-1">
                                    <Shield className="w-4 h-4 text-gray-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-medium text-sm">{log.action}</p>
                                        <span className="text-xs text-gray-400">
                                            {new Date(log.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 truncate">{log.details}</p>
                                    <p className="text-xs text-gray-400 mt-1">Par: {log.user}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="font-medium mb-1 opacity-80">Demandes de Contact</h4>
                            <div className="flex items-center gap-4 mt-4">
                                <div className="text-4xl font-bold">{stats?.pending_contacts || 0}</div>
                                <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-md">
                                    En attente
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            Performances
                        </h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                                <span className="text-sm text-gray-600">Satisfaction Client</span>
                                <span className="font-semibold text-emerald-600">4.8/5</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTable = () => (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={`Rechercher un ${activeTab.toLowerCase()}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-gray-100 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                        Filtrer
                    </button>
                    <button className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                        Exporter (CSV)
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                            <th className="px-6 py-4">Détails</th>
                            {activeTab === "Utilisateurs" && <th className="px-6 py-4">Plan</th>}
                            {activeTab === "Agents" && <th className="px-6 py-4">Propriétaire</th>}
                            {activeTab === "Transactions" && <th className="px-6 py-4">Montant</th>}
                            <th className="px-6 py-4">Statut</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {dataList
                            .filter(item =>
                                Object.values(item).some(val =>
                                    String(val).toLowerCase().includes(searchQuery.toLowerCase())
                                )
                            )
                            .map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                {String(item.email || item.name || item.user || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">
                                                    {item.email || item.name || item.user}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Inscrit le {new Date(item.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    {activeTab === "Utilisateurs" && (
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                item.plan === 'entreprise' ? "bg-purple-100 text-purple-700" :
                                                    item.plan === 'pro' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                            )}>
                                                {item.plan?.toUpperCase()}
                                            </span>
                                        </td>
                                    )}
                                    {activeTab === "Agents" && (
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {item.owner}
                                        </td>
                                    )}
                                    {activeTab === "Transactions" && (
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900">{item.amount} {item.currency}</span>
                                                <span className="text-xs text-gray-400 capitalize">{item.gateway}</span>
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                                            (item.is_active || item.is_deployed || item.status === 'completed' || item.is_staff)
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-700"
                                        )}>
                                            <span className="w-1 h-1 rounded-full bg-current" />
                                            {(item.is_active || item.is_deployed || item.status === 'completed' || item.is_staff) ? 'Actif' : 'Inactif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Magia Back-office</h2>
                    <p className="text-gray-500 mt-2">
                        Pilotage global de la plateforme et gestion administrative.
                    </p>
                </div>
            </div>

            {isLoading && !stats ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                </div>
            ) : (
                activeTab === "Tableau de bord" ? renderDashboard() : renderTable()
            )}
        </div>
    );
}

function StatCard({ title, value, icon, trend, trendText, color }: any) {
    const colorClasses: any = {
        blue: "bg-blue-50 text-blue-600",
        purple: "bg-purple-50 text-purple-600",
        emerald: "bg-emerald-50 text-emerald-600",
        orange: "bg-orange-50 text-orange-600"
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform", colorClasses[color])}>
                    {icon}
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-emerald-600 font-medium text-sm">
                        <ArrowUpRight className="w-4 h-4" />
                        {trend}
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <h4 className="text-2xl font-bold text-gray-900 mt-1">{value}</h4>
                {trendText && <p className="text-xs text-emerald-600 mt-1">{trendText}</p>}
            </div>
        </div>
    );
}
