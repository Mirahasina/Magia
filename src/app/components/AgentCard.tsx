import { MoreHorizontal, MessageSquare, Target, Clock, Globe, Mail, Pause, Play, BarChart2, Settings } from "lucide-react";
import { cn } from "./ui/utils";

interface AgentCardProps {
    name: string;
    role: string;
    category: string;
    status: "active" | "paused" | "draft";
    stats: {
        conversations: string;
        resolution: string;
        responseTime: string;
        leads: string;
    };
    channels: readonly ("website" | "email" | "whatsapp")[];

    avatarColor: string;
    viewMode?: "grid" | "list";
    onClick?: () => void;
}

export function AgentCard({ name, role, category, status, stats, channels, avatarColor, viewMode = "grid", onClick }: AgentCardProps) {
    if (viewMode === "list") {
        return (
            <div
                onClick={onClick}
                className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-lg transition-all group flex items-center justify-between gap-6 cursor-pointer"
            >
                <div className="flex items-center gap-4 flex-1">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0", avatarColor)}>
                        <Target className="w-5 h-5" />
                    </div>
                    <div className="min-w-[150px]">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">{name}</h3>
                            <div className={cn("w-1.5 h-1.5 rounded-full", status === "active" ? "bg-green-500" : "bg-gray-300")} />
                        </div>
                        <p className="text-xs text-gray-500 truncate">{role}</p>
                    </div>
                    <div className="hidden lg:block flex-1">
                        <p className="text-xs text-gray-400 font-medium uppercase mb-1">Catégorie</p>
                        <p className="text-sm text-gray-600 truncate">{category}</p>
                    </div>
                </div>

                <div className="flex items-center gap-8 px-6 border-x border-gray-50">
                    <div>
                        <p className="text-sm font-bold text-gray-900">{stats.conversations}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">convs</p>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">{stats.resolution}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">résol.</p>
                    </div>
                    <div className="hidden xl:block">
                        <p className="text-sm font-bold text-gray-900">{stats.responseTime}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">rép.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 min-w-[140px] justify-end">
                    <div className="flex -space-x-1">
                        {channels.includes("website") && <div className="w-6 h-6 rounded-full bg-gray-50 border border-white flex items-center justify-center text-gray-400"><Globe className="w-3 h-3" /></div>}
                        {channels.includes("email") && <div className="w-6 h-6 rounded-full bg-gray-50 border border-white flex items-center justify-center text-gray-400"><Mail className="w-3 h-3" /></div>}
                        {channels.includes("whatsapp") && <div className="w-6 h-6 rounded-full bg-gray-50 border border-white flex items-center justify-center text-gray-400"><MessageSquare className="w-3 h-3" /></div>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors">
                            <Settings className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors">
                            {status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden cursor-pointer"
        >
            <div className="flex items-start justify-between mb-6">
                <div className="flex gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", avatarColor)}>
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">{name}</h3>
                            <div className={cn("w-2 h-2 rounded-full", status === "active" ? "bg-green-500" : "bg-gray-300")} />
                        </div>
                        <p className="text-sm text-gray-500 leading-tight mt-1">
                            <span className="font-medium text-gray-700">{role}</span> — {category}
                        </p>
                        <div className="mt-2 flex">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 uppercase tracking-wider">
                                {channels.join(" & ")}
                            </span>
                        </div>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 p-1">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
                <div>
                    <p className="text-xl font-bold text-gray-900">{stats.conversations}</p>
                    <p className="text-[11px] text-gray-400 font-medium uppercase mt-1">conversations</p>
                </div>
                <div>
                    <p className="text-xl font-bold text-gray-900">{stats.resolution}</p>
                    <p className="text-[11px] text-gray-400 font-medium uppercase mt-1">résolution</p>
                </div>
                <div>
                    <p className="text-xl font-bold text-gray-900">{stats.responseTime}</p>
                    <p className="text-[11px] text-gray-400 font-medium uppercase mt-1">temp réponse</p>
                </div>
                <div>
                    <p className="text-xl font-bold text-gray-900">{stats.leads}</p>
                    <p className="text-[11px] text-gray-400 font-medium uppercase mt-1">leads qualifiés</p>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Canaux :</p>
                <div className="flex gap-2">
                    {channels.includes("website") && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-gray-600 text-xs font-medium">
                            <Globe className="w-3 h-3" />
                            Website
                        </div>
                    )}
                    {channels.includes("email") && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-gray-600 text-xs font-medium">
                            <Mail className="w-3 h-3" />
                            Email
                        </div>
                    )}
                    {channels.includes("whatsapp") && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-gray-600 text-xs font-medium">
                            <MessageSquare className="w-3 h-3" />
                            WhatsApp
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 pt-6 border-t border-gray-50">
                <button className="flex-1 py-2.5 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors">
                    Gérer
                </button>
                <button className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                </button>
                <button className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors">
                    <BarChart2 className="w-4 h-4" />
                </button>
                <button className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors">
                    {status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}
