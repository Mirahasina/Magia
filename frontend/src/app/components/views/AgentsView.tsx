import { cn } from "../ui/utils";
import { AgentCard } from "../AgentCard";
import { useAgents } from "../../hooks/useAgents";
import { Trash2, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { usePlan } from "../../context/PlanContext";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from "../ui/pagination";

const ITEMS_PER_PAGE = 8;

interface AgentsViewProps {
    agents: any[];
    user?: any;
    viewMode: "grid" | "list";
    setViewMode: (mode: "grid" | "list") => void;
    setIsCreatingAgent: (open: boolean) => void;
    setViewingAgent: (agent: any) => void;
    globalSearchQuery?: string;
}

export function AgentsView({
    agents,
    user,
    viewMode,
    setViewMode,
    setIsCreatingAgent,
    setViewingAgent,
    globalSearchQuery = ""
}: AgentsViewProps) {
    const { deleteAgent, toggleAgentPause } = useAgents();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterState, setFilterState] = useState<"ALL" | "ACTIVE" | "DRAFT">("ALL");
    const [teamFilter, setTeamFilter] = useState("ALL");
    const [channelFilter, setChannelFilter] = useState("ALL");
    const [activeCategory, setActiveCategory] = useState<"EQUIPE" | "SOLO">("EQUIPE");
    const { canCreateAgent, limits, usage, plan } = usePlan();

    const combinedSearchQuery = globalSearchQuery || searchQuery;

    const [currentPageTeam, setCurrentPageTeam] = useState(1);
    const [currentPageSolo, setCurrentPageSolo] = useState(1);

    const teams = useMemo(() => {
        const t = new Set(agents.filter(a => a.team_name).map(a => a.team_name));
        return Array.from(t);
    }, [agents]);

    const filteredAgents = useMemo(() => {
        return agents.filter((a) => {
            const matchesSearch = a.name.toLowerCase().includes(combinedSearchQuery.toLowerCase()) ||
                (a.role && a.role.toLowerCase().includes(combinedSearchQuery.toLowerCase()));
            const matchesStatus = filterState === "ALL" ? true :
                filterState === "ACTIVE" ? a.is_deployed : !a.is_deployed;
            const matchesTeamSelect = teamFilter === "ALL" ? true : a.team_name === teamFilter;
            const matchesChannel = channelFilter === "ALL" ? true :
                a.channels?.some((c: string) => c.toLowerCase().includes(channelFilter.toLowerCase()));

            return matchesSearch && matchesStatus && matchesTeamSelect && matchesChannel;
        });
    }, [agents, combinedSearchQuery, filterState, teamFilter, channelFilter]);

    const teamAgents = filteredAgents.filter(a => a.team_name);
    const soloAgents = filteredAgents.filter(a => !a.team_name);

    const activeList = activeCategory === "EQUIPE" ? teamAgents : soloAgents;
    const activePage = activeCategory === "EQUIPE" ? currentPageTeam : currentPageSolo;
    const setActivePage = activeCategory === "EQUIPE" ? setCurrentPageTeam : setCurrentPageSolo;

    const totalPages = Math.ceil(activeList.length / ITEMS_PER_PAGE);
    const paginatedAgents = useMemo(() => {
        const start = (activePage - 1) * ITEMS_PER_PAGE;
        return activeList.slice(start, start + ITEMS_PER_PAGE);
    }, [activeList, activePage]);

    const actifsCount = filteredAgents.filter((a) => a.is_deployed && a.is_active).length;
    const brouillonsCount = filteredAgents.filter((a) => !a.is_deployed || !a.is_active).length;

    const renderAgentList = (list: any[]) => (
        <div className={cn(
            viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"
        )}>
            {list.map((agent) => (
                <AgentCard
                    key={agent.id}
                    {...agent}
                    viewMode={viewMode}
                    onClick={() => setViewingAgent(agent)}
                    onTogglePause={(e) => {
                        e.stopPropagation();
                        toggleAgentPause(agent.id);
                    }}
                    onDelete={(e) => {
                        e.stopPropagation();
                        deleteAgent(agent.id);
                    }}
                />
            ))}
        </div>
    );

    return (
        <div className="h-full flex flex-col magia-page animate-page-fade overflow-hidden">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="magia-title">Unités IA</h1>
                    <div className="flex items-center gap-3">
                        <span className="magia-subtitle">
                            Capture : {usage.agents} / {limits.max_agents === null ? '∞' : limits.max_agents}
                        </span>
                        <div className="w-px h-3 bg-gray-200" />
                        <span className={cn("px-2 py-0.5 text-[8px] font-medium rounded-lg border",
                            plan === 'gratuit' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                                plan === 'pro' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        )}>{plan}</span>
                    </div>
                </div>
                <button
                    onClick={() => canCreateAgent && setIsCreatingAgent(true)}
                    disabled={!canCreateAgent}
                    className={cn(
                        "px-6 py-3 rounded-xl magia-button shadow-xl transition-all flex items-center gap-2",
                        canCreateAgent
                            ? "bg-blue-950 text-white hover:bg-black active:scale-95"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                    )}
                >
                    {!canCreateAgent && <Lock className="w-3 h-3" />}
                    DÉPLOYER AGENT
                </button>
            </div>

            <div className="bg-white/95 backdrop-blur-md z-30 py-4 border-b border-gray-100 mb-4 space-y-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-sm font-medium text-gray-900">{actifsCount} ACTIFS</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
                            <span className="text-sm font-medium text-gray-400">{brouillonsCount} ARCHIVÉS</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-gray-100/50 rounded-xl border border-gray-100">
                        <button onClick={() => setViewMode("grid")} className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600")}>HUD</button>
                        <button onClick={() => setViewMode("list")} className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600")}>LISTE</button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px] relative group">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPageTeam(1); setCurrentPageSolo(1); }}
                            placeholder="INITIALISATION SYSTÈME / RECHERCHE..."
                            className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-900 transition-all placeholder:text-gray-400"
                        />
                    </div>

                    <select
                        value={filterState}
                        onChange={(e) => { setFilterState(e.target.value as any); setCurrentPageTeam(1); setCurrentPageSolo(1); }}
                        className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-semibold focus:outline-none transition-all hover:border-gray-300"
                    >
                        <option value="ALL">STATUT : GLOBAL</option>
                        <option value="ACTIVE">FILTRE : DÉPLOYÉ</option>
                        <option value="DRAFT">FILTRE : BROUILLON</option>
                    </select>

                    <select
                        value={channelFilter}
                        onChange={(e) => { setChannelFilter(e.target.value); setCurrentPageTeam(1); setCurrentPageSolo(1); }}
                        className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-semibold focus:outline-none transition-all hover:border-gray-300"
                    >
                        <option value="ALL">CANAL : TOUS</option>
                        <option value="email">INTERFACE : EMAIL</option>
                        <option value="whatsapp">INTERFACE : WHATSAPP</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <button
                        onClick={() => setActiveCategory("EQUIPE")}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-all border-b-2",
                            activeCategory === "EQUIPE" ? "text-blue-950 border-blue-950 bg-blue-50/30" : "text-gray-400 border-transparent hover:text-gray-600"
                        )}
                    >
                        Agents d'Équipe ({teamAgents.length})
                    </button>
                    <button
                        onClick={() => setActiveCategory("SOLO")}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-all border-b-2",
                            activeCategory === "SOLO" ? "text-blue-950 border-blue-950 bg-blue-50/30" : "text-gray-400 border-transparent hover:text-gray-600"
                        )}
                    >
                        Agents Indépendants ({soloAgents.length})
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-12">
                {paginatedAgents.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                        <p className="text-sm text-gray-400">Séquence vide - Aucun agent détecté</p>
                    </div>
                ) : activeCategory === "EQUIPE" ? (() => {
                    const groupedByTeam: Record<string, { name: string, color?: string, agents: any[] }> = {};
                    paginatedAgents.forEach(agent => {
                        if (agent.team && agent.team_name) {
                            if (!groupedByTeam[agent.team]) {
                                groupedByTeam[agent.team] = { name: agent.team_name, color: agent.team_color, agents: [] };
                            }
                            groupedByTeam[agent.team].agents.push(agent);
                        }
                    });

                    return (
                        <div className="space-y-6">
                            {Object.values(groupedByTeam).map(group => (
                                <div key={group.name} className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-950" style={{ backgroundColor: group.color }} />
                                        <h3 className="text-[13px] font-medium text-gray-800">
                                            {group.name} - {group.agents.length} agent{group.agents.length > 1 ? 's' : ''}
                                        </h3>
                                        <div className="h-px bg-gray-100 flex-1" />
                                    </div>
                                    {renderAgentList(group.agents)}
                                </div>
                            ))}
                        </div>
                    );
                })() : (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <h3 className="text-sm font-medium text-gray-500">UNITÉS AUTONOMES</h3>
                            <div className="h-px bg-gray-100 flex-1" />
                        </div>
                        {renderAgentList(paginatedAgents)}
                    </div>
                )}
            </div>

            {filteredAgents.length === 0 && combinedSearchQuery && (
                <div className="py-16 text-center">
                    <p className="text-[11px] font-semibold text-gray-300">Aucun agent ne correspond à "{combinedSearchQuery}"</p>
                </div>
            )}

            {totalPages > 1 && (
                <div className="pt-8 border-t border-gray-50">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setActivePage((p: number) => Math.max(1, p - 1))}
                                    className={cn("cursor-pointer", activePage === 1 && "pointer-events-none opacity-20")}
                                />
                            </PaginationItem>
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <PaginationItem key={i}>
                                    <PaginationLink
                                        isActive={activePage === i + 1}
                                        onClick={() => setActivePage(i + 1)}
                                        className="cursor-pointer font-semibold text-[10px]"
                                    >
                                        {i + 1}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setActivePage((p: number) => Math.min(totalPages, p + 1))}
                                    className={cn("cursor-pointer", activePage === totalPages && "pointer-events-none opacity-20")}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
}
