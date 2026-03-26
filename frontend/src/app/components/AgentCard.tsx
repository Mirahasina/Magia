import { cn } from "./ui/utils";
import { Trash2 } from "lucide-react";

interface AgentCardProps {
    id?: number;
    name: string;
    avatar?: string;
    role: string;
    description?: string;
    llm_model?: string;
    status?: "active" | "paused" | "draft" | string;
    is_deployed?: boolean;
    stats?: {
        conversations?: string;
        resolution?: string;
        responseTime?: string;
        leads?: string;
    };
    messages?: any[];
    channels: string[];
    avatarColor?: string;
    viewMode?: "grid" | "list";
    onClick?: () => void;
    onDelete?: (e: React.MouseEvent) => void;
}

export function AgentCard({
    name,
    role,
    description,
    is_deployed,
    stats,
    channels,
    avatarColor = "bg-blue-900",
    viewMode = "grid",
    onClick,
    onDelete,
    avatar,
    llm_model,
    messages
}: AgentCardProps) {

    const displayStatus = is_deployed ? "active" : "draft";

    const conversationsCount = messages ? messages.length.toString() : (stats?.conversations || "0");

    const displayStats = {
        conversations: conversationsCount,
        resolution: stats?.resolution || "0%",
        responseTime: stats?.responseTime || "0s",
        leads: stats?.leads || "0"
    };

    if (viewMode === "list") {
        return (
            <div
                onClick={onClick}
                className="bg-white border border-gray-100 rounded-lg p-3 hover:shadow-md transition-all group flex items-center justify-between gap-4 cursor-pointer"
            >
                <div className="flex items-center gap-4 flex-1">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 font-black italic shadow-sm overflow-hidden", avatarColor)}>
                        {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full object-cover" />
                        ) : (
                            name.charAt(0)
                        )}
                    </div>
                    <div className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-tight">{name}</h3>
                            <span className={cn("w-1.5 h-1.5 rounded-full", displayStatus === "active" ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-gray-300")} />
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium truncate uppercase">{role}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 px-4 border-x border-gray-50 flex-1 justify-center">
                    <div className="text-center">
                        <p className="text-[11px] font-black text-gray-900">{displayStats.conversations}</p>
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-tighter">CONVS</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[11px] font-black text-gray-900">{displayStats.resolution}</p>
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-tighter">RESOL.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 justify-end">
                    <div className="flex -space-x-1.5">
                        {channels.map(c => (
                            <div key={c} className="w-5 h-5 rounded-md bg-white border border-gray-100 flex items-center justify-center text-[8px] font-black italic text-gray-400 shadow-xs uppercase">{c.charAt(0)}</div>
                        ))}
                    </div>
                    <button className="px-3 py-1.5 rounded-md bg-gray-900 text-white font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all">
                        {displayStatus === "active" ? "PAUSE" : "LANCER"}
                    </button>
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className="bg-white border border-gray-100 rounded-lg p-5 hover:border-blue-100 transition-all group relative overflow-hidden cursor-pointer shadow-sm hover:shadow-md"
        >
            <div className="flex items-start justify-between mb-6">
                <div className="flex gap-4">
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-lg font-black italic text-xl overflow-hidden", avatarColor)}>
                        {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full object-cover" />
                        ) : (
                            name.charAt(0)
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="magia-h3 group-hover:text-blue-900 transition-colors uppercase">{name}</h3>
                            <span className={cn("w-2 h-2 rounded-full", displayStatus === "active" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-gray-300")} />
                        </div>
                        <p className="text-[11px] text-gray-400 leading-tight mt-0.5 uppercase tracking-wide font-black">
                            {role} <span className="text-gray-200 mx-1">|</span> {llm_model}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                    { l: "CONVERSATIONS", v: displayStats.conversations },
                    { l: "RÉSOLUTION", v: displayStats.resolution },
                    { l: "T. RÉPONSE", v: displayStats.responseTime },
                    { l: "LEADS QUAL.", v: displayStats.leads }
                ].map((s, i) => (
                    <div key={i} className="p-3 bg-gray-50/50 rounded-lg border border-transparent group-hover:border-gray-100 transition-all">
                        <p className="magia-label mb-1">{s.l}</p>
                        <p className="text-lg font-serif font-bold text-gray-900">{s.v}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-gray-50">
                <div className="flex gap-1.5">
                    {channels.map(c => (
                        <div key={c} className="w-6 h-6 rounded-md bg-white border border-gray-100 flex items-center justify-center text-[9px] font-black italic text-gray-300 shadow-xs uppercase">{c.charAt(0)}</div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button className="px-5 py-2 rounded-md bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-lg shadow-gray-100">
                        OPÉRER
                    </button>
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="px-3 py-2 rounded-md border border-gray-100 text-gray-300 hover:text-red-500 hover:border-red-100 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-50/50 to-transparent rounded-bl-full -translate-y-8 translate-x-8" />
        </div>
    );
}
