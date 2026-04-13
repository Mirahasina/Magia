import { useState } from "react";
import { cn } from "./ui/utils";
import { Trash2, Loader2, Crown } from "lucide-react";

interface AgentCardProps {
    id?: number;
    name: string;
    avatar?: string;
    role: string;
    description?: string;
    llm_model?: string;
    is_active?: boolean;
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
    owner_name?: string;
    owner_email?: string;
    team_name?: string;
    team_color?: string;
    onClick?: () => void;
    onTogglePause?: (e: React.MouseEvent) => void;
    onDelete?: (e: React.MouseEvent) => void;
}


export function AgentCard({
    name,
    role,
    description,
    is_active = true,
    is_deployed,
    stats,
    channels,
    avatarColor = "bg-blue-900",
    viewMode = "grid",
    onClick,
    onTogglePause,
    onDelete,
    avatar,
    llm_model,
    messages,
    owner_name,
    owner_email,
    team_name,
    team_color
}: AgentCardProps) {
    const isShared = !!owner_email;


    const [localActive, setLocalActive] = useState(is_active);
    const [isToggling, setIsToggling] = useState(false);

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextState = !localActive;
        setLocalActive(nextState); // Optimistic
        setIsToggling(true);
        try {
            if (onTogglePause) {
                await onTogglePause(e);
            }
        } catch (err) {
            setLocalActive(!nextState); // Revert on error
        } finally {
            setIsToggling(false);
        }
    };

    const displayStatus = localActive ? (is_deployed ? "active" : "draft") : "paused";

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
                className="bg-white border border-gray-100 rounded-xl p-3 hover:shadow-lg hover:border-blue-100 transition-all group flex items-center justify-between gap-4 cursor-pointer"
            >
                <div className="flex items-center gap-4 flex-1">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 font-black italic shadow-sm overflow-hidden", avatarColor)}>
                        {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full object-cover" />
                        ) : (
                            name.charAt(0)
                        )}
                    </div>
                    <div className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-tight">{name}</h3>
                            {isShared && (
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-[7px] font-black text-blue-600 uppercase tracking-tighter border border-blue-100 flex items-center gap-1">
                                    <Crown className="w-2 h-2" /> {owner_name}
                                </span>
                            )}
                            <span className={cn(
                                "px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border",
                                displayStatus === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                displayStatus === "paused" ? "bg-amber-50 text-amber-600 border-amber-100" : 
                                "bg-gray-50 text-gray-400 border-gray-100"
                            )}>
                                {displayStatus === "active" ? "Actif" : displayStatus === "paused" ? "Pause" : "Brouillon"}
                            </span>
                            {team_name && (
                                <span 
                                    className="px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest text-white"
                                    style={{ backgroundColor: team_color || '#1e3a8a' }}
                                >
                                    {team_name}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium truncate uppercase">{role}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 px-4 border-x border-gray-50 flex-1 justify-center">
                    <div className="flex -space-x-1.5">
                        {channels.map(c => (
                            <div key={c} className="w-5 h-5 rounded-md bg-white border border-gray-100 flex items-center justify-center text-[8px] font-black italic text-gray-400 shadow-xs uppercase">{c.charAt(0)}</div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 justify-end">

                    <button 
                        onClick={handleToggle}
                        disabled={isToggling}
                        className={cn(
                            "px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all shadow-sm flex items-center justify-center min-w-[70px]",
                            localActive ? "bg-gray-100 text-gray-900 border border-gray-200" : "bg-blue-900 text-white"
                        )}
                    >
                        {isToggling ? <Loader2 className="w-3 h-3 animate-spin" /> : (localActive ? "PAUSE" : "LANCER")}
                    </button>
                    <button 
                        disabled={!is_active}
                        className={cn(
                            "px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all",
                            is_active ? "bg-gray-900 text-white hover:bg-blue-900 shadow-md" : "bg-gray-100 text-gray-300 cursor-not-allowed"
                        )}
                    >
                        OPÉRER
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
            className="bg-white border border-gray-100 rounded-3xl p-5 hover:border-blue-200 transition-all group relative overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-1"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-950 opacity-0 group-hover:opacity-100 transition-all" />
            
            <div className="flex items-start justify-between mb-5">
                <div className="flex gap-4">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic text-xl overflow-hidden shrink-0 relative", avatarColor)}>
                        {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="relative z-10">{name.charAt(0)}</span>
                        )}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-black text-gray-900 group-hover:text-blue-950 transition-colors uppercase tracking-tight truncate max-w-[180px]">{name}</h3>
                            {isShared && (
                                <span className="px-1.5 py-0.5 rounded-none bg-blue-50 text-[8px] font-black text-blue-600 uppercase tracking-widest border border-blue-100 flex items-center gap-1">
                                    <Crown className="w-2.5 h-2.5" /> {owner_name}
                                </span>
                            )}
                            <div className={cn(
                                "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border flex items-center gap-1.5 transition-colors",
                                displayStatus === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100" : 
                                displayStatus === "paused" ? "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-100" : 
                                "bg-gray-50 text-gray-400 border-gray-100 group-hover:bg-gray-100"
                            )}>
                                <span className={cn(
                                    "w-1 h-1 rounded-full animate-pulse",
                                    displayStatus === "active" ? "bg-emerald-500" : 
                                    displayStatus === "paused" ? "bg-amber-400" : "bg-gray-300"
                                )} />
                                {displayStatus === "active" ? "OPÉRATIONNEL" : displayStatus === "paused" ? "SUSPENDU" : "INITIALISATION"}
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 font-black uppercase mt-1 truncate tracking-wider opacity-80">{role}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
                {[
                    { l: "SYNC", v: displayStats.conversations, u: "MSGS" },
                    { l: "SUCCESS", v: displayStats.resolution, u: "RATE" },
                    { l: "LATENCY", v: displayStats.responseTime, u: "AVG" },
                    { l: "CAPTURED", v: displayStats.leads, u: "UNIT" }
                ].map((s, i) => (
                    <div key={i} className="p-3 bg-gray-50/50 rounded-xl border border-transparent group-hover:bg-blue-50/20 group-hover:border-blue-50 transition-all">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em]">{s.l}</p>
                            <p className="text-[7px] font-black text-blue-900/40 uppercase">{s.u}</p>
                        </div>
                        <p className="text-base font-black text-gray-900 tracking-tight">{s.v}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex gap-1.5">
                    {channels.map(c => (
                        <div key={c} className="px-2 py-1 bg-gray-50 border border-gray-100 flex items-center justify-center text-[8px] font-black text-gray-400 uppercase tracking-tighter hover:bg-gray-100 transition-colors">{c}</div>
                    ))}
                    {team_name && (
                    <div 
                            className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-white shadow-sm"
                            style={{ backgroundColor: team_color || '#1e3a8a' }}
                        >
                            UNIT {team_name}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleToggle}
                        disabled={isToggling}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center min-w-[80px] border",
                            localActive ? "bg-white text-gray-900 border-gray-200 hover:bg-gray-50" : "bg-blue-950 text-white border-blue-950 hover:bg-black"
                        )}
                    >
                        {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : (localActive ? "STANDBY" : "ENGAGE")}
                    </button>
                    <button 
                        disabled={!is_active}
                        className={cn(
                            "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl",
                            is_active ? "bg-black text-white hover:bg-blue-900 ring-2 ring-transparent hover:ring-blue-100" : "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"
                        )}
                    >
                        ACCESS
                    </button>
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-2 border border-gray-100 text-gray-300 rounded-xl hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
