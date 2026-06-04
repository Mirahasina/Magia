import { API_BASE } from "../../../lib/api";
import { useState, useEffect } from "react";
import { Loader2, Shield, Calendar, User, Activity } from "lucide-react";

interface AuditLog {
    id: number;
    action: string;
    details: string;
    created_at: string;
}

export function JournauxAuditView() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            const res = await fetch(`${API_BASE}/audit-logs/`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`
                }
            });
            if (res.ok) {
                setLogs(await res.json());
            }
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Audit Log</h1>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Historique des actions système</p>
                </div>
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl flex items-center gap-2 border border-primary/20">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Sécurisé</span>
                </div>
            </div>

            <div className="bg-white rounded-none shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Heure</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type d'action</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Détails</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <Activity className="w-8 h-8" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Aucun log enregistré</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.map((log) => {
                                const date = new Date(log.created_at);
                                return (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                                <Calendar className="w-3.5 h-3.5 text-gray-300" />
                                                <span>{date.toLocaleDateString()}</span>
                                                <span className="text-gray-300 font-bold">•</span>
                                                <span className="font-bold">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                                log.action.includes("Déploiement") ? "bg-emerald-50 text-emerald-600" :
                                                    log.action.includes("Création") ? "bg-blue-50 text-blue-600" :
                                                        "bg-gray-100 text-gray-500"
                                            )}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-gray-500 font-medium">
                                                {log.details}
                                            </p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-gray-900 rounded-none p-6 font-mono text-sm overflow-hidden border border-gray-800 shadow-2xl mt-8">
                <div className="flex items-center gap-2 text-gray-500 mb-4 text-[10px] font-bold uppercase tracking-widest border-b border-gray-800 pb-4">
                    <Activity className="w-3 h-3" />
                    <span>system_terminal_output</span>
                </div>
                <div className="space-y-1.5">
                    {logs.slice(0, 5).map((log, i) => (
                        <div key={i} className="flex gap-4 text-[11px]">
                            <span className="text-blue-500/80">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                            <span className="text-green-500/80">{log.action.toUpperCase().replace(/ /g, "_")}</span>
                            <span className="text-gray-500 truncate">{log.details}</span>
                        </div>
                    ))}
                    <div className="text-gray-600 italic text-[11px] animate-pulse">
                        $ listening_for_system_events...
                    </div>
                </div>
            </div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
