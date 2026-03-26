import { cn } from "../ui/utils";
import { AgentCard } from "../AgentCard";
import { useAgents } from "../../hooks/useAgents";
import { Trash2 } from "lucide-react";
import { useState } from "react";

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
    const { deleteAgent } = useAgents();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterState, setFilterState] = useState<"ALL" | "ACTIVE" | "DRAFT">("ALL");

    const actifsCount = agents.filter((a) => a.is_deployed).length;
    const brouillonsCount = agents.filter((a) => !a.is_deployed).length;

    const filteredAgents = agents.filter((a) => {
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (a.role && a.role.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFilter = filterState === "ALL" ? true : 
                              filterState === "ACTIVE" ? a.is_deployed : !a.is_deployed;
        return matchesSearch && matchesFilter;
    });

    const toggleFilter = () => {
        if (filterState === "ALL") setFilterState("ACTIVE");
        else if (filterState === "ACTIVE") setFilterState("DRAFT");
        else setFilterState("ALL");
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="magia-h1">Unités IA</h1>
                </div>
                <button
                    onClick={() => setIsCreatingAgent(true)}
                    className="px-5 py-2.5 bg-blue-900 text-white rounded-lg text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-100 hover:scale-[1.02] transition-all"
                >
                    DÉPLOYER AGENT
                </button>
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">{actifsCount} Actifs</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-gray-300" />
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{brouillonsCount} Brouillon{brouillonsCount !== 1 ? 's' : ''}</span>
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
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="RECHERCHER DANS L'UNITÉ..."
                            className="w-full px-5 py-3 bg-white border border-gray-100 rounded-lg text-[11px] font-black focus:outline-none shadow-sm placeholder:text-gray-200 transition-all uppercase tracking-widest"
                        />
                    </div>
                    <button className="px-5 py-3 bg-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors shadow-sm cursor-not-allowed">
                        SERVICES
                    </button>
                    <button onClick={toggleFilter} className={cn("px-5 py-3 bg-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm", filterState !== "ALL" ? "text-blue-900 border-blue-200 bg-blue-50" : "text-gray-400 hover:text-gray-900")}>
                        {filterState === "ALL" ? "FILTRER : TOUS" : filterState === "ACTIVE" ? "FILTRER : ACTIFS" : "FILTRER : BROUILLONS"}
                    </button>
                </div>
            </div>

            {/* Agents Grid/List */}
            <div className={cn(
                viewMode === "grid" ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "space-y-3"
            )}>
                {filteredAgents.length > 0 ? filteredAgents.map((agent) => (
                    <AgentCard
                        key={agent.id}
                        {...agent}
                        viewMode={viewMode}
                        onClick={() => setViewingAgent(agent)}
                        onDelete={(e) => {
                            e.stopPropagation();
                            deleteAgent(agent.id);
                        }}
                    />
                )) : (
                    <div className="col-span-1 xl:col-span-2 py-12 text-center border-2 border-dashed border-gray-100 rounded-xl">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Aucun agent trouvé</p>
                    </div>
                )}
            </div>
        </div>
    );
}
