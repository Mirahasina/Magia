import { cn } from "../ui/utils";
import { AgentCard } from "../AgentCard";

interface AgentsViewProps {
    agents: any[];
    viewMode: "grid" | "list";
    setViewMode: (mode: "grid" | "list") => void;
    setIsCreatingAgent: (open: boolean) => void;
    setViewingAgent: (agent: any) => void;
}

export function AgentsView({
    agents,
    viewMode,
    setViewMode,
    setIsCreatingAgent,
    setViewingAgent
}: AgentsViewProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="magia-h1">AI Workforce</h1>
                    <p className="magia-subtitle">Gestion et orchestration des agents autonomes</p>
                </div>
                <button
                    onClick={() => setIsCreatingAgent(true)}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-all"
                >
                    DÉPLOYER AGENT
                </button>
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">3 Actifs</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-gray-300" />
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">1 Brouillon</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-lg">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={cn("px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all", viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400")}
                        >
                            HUD
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn("px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all", viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400")}
                        >
                            LISTE
                        </button>
                    </div>
                </div>

                {/* Filter Bar (Compact) */}
                <div className="col-span-12 flex items-center gap-3">
                    <div className="relative flex-1 group">
                        <input
                            type="text"
                            placeholder="RECHERCHER DANS L'UNITÉ..."
                            className="w-full px-5 py-3 bg-white border border-gray-100 rounded-lg text-[11px] font-black focus:outline-none shadow-sm placeholder:text-gray-200 transition-all uppercase tracking-widest"
                        />
                    </div>
                    <button className="px-5 py-3 bg-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors shadow-sm">
                        SERVICES
                    </button>
                    <button className="px-5 py-3 bg-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors shadow-sm">
                        FILTRER
                    </button>
                </div>
            </div>

            {/* Agents Grid/List */}
            <div className={cn(
                viewMode === "grid" ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "space-y-3"
            )}>
                {agents.map((agent) => (
                    <AgentCard
                        key={agent.name}
                        {...agent}
                        viewMode={viewMode}
                        onClick={() => setViewingAgent(agent)}
                    />
                ))}
            </div>
        </div>
    );
}
