import { useState } from "react";
import { cn } from "../ui/utils";
import { useAgents } from "../../hooks/useAgents";
import { Users, Link as LinkIcon, Plus, Trash2, ArrowRight, Info, Sparkles, ChevronRight, X } from "lucide-react";
import { Button } from "../ui/button";
import { AITeamWizard } from "./AITeamWizard";

// ── Predefined team templates ─────────────────────────────────────────────────
const TEAM_TEMPLATES = [
    {
        id: "commercial",
        label: "Équipe Commerciale",
        color: "#1e3a8a",
        description: "Prospection, qualification, closing et suivi client. Chaque agent prend le relais au bon moment du cycle de vente.",
        agents: [
            { name: "Prospecteur", role: "Qualification de leads", system_prompt: "Tu es un agent de prospection. Ton rôle est d'accueillir les prospects, de cerner leur besoin et de détecter leur niveau d'intérêt. Tu es chaleureux, curieux et efficace. Dès qu'un prospect montre un intérêt concret, tu passes le relais." },
            { name: "Closer", role: "Closing & proposition commerciale", system_prompt: "Tu es un expert en closing. Tu reçois des leads déjà qualifiés et intéressés. Ton rôle est de les convaincre, de répondre à leurs objections et de finaliser la vente ou le rendez-vous." },
            { name: "Agent Email", role: "Suivi par email", system_prompt: "Tu es responsable du suivi par email. Tu rédiges des emails professionnels et personnalisés pour relancer les prospects ou confirmer les prochaines étapes." },
            { name: "Agent WhatsApp", role: "Suivi WhatsApp", system_prompt: "Tu es responsable du suivi WhatsApp. Tu envoies des messages courts, directs et engageants pour maintenir le contact avec les prospects sur leur canal préféré." },
        ],
        links: [
            { from: 0, to: 1, trigger: "interest", description: "Dès que le prospect exprime un intérêt, le Closer prend le relais pour finaliser." },
            { from: 1, to: 2, trigger: "email_requested", description: "Si le prospect demande des informations par email, l'Agent Email prend en charge." },
            { from: 1, to: 3, trigger: "whatsapp_requested", description: "Si le prospect préfère WhatsApp, l'Agent WhatsApp continue la conversation." },
        ]
    },
    {
        id: "support",
        label: "Équipe Support",
        color: "#10b981",
        description: "FAQ automatique, escalade vers un expert et passage manuel pour les cas complexes.",
        agents: [
            { name: "Réception", role: "Triage & FAQ", system_prompt: "Tu es le premier contact du support. Tu réponds aux questions fréquentes et tu qualifies la demande. Si le problème est technique ou complexe, tu passes le relais à l'expert." },
            { name: "Expert Technique", role: "Résolution technique", system_prompt: "Tu es un expert technique. Tu reçois les demandes escaladées et tu résous les problèmes complexes avec précision et professionnalisme." },
        ],
        links: [
            { from: 0, to: 1, trigger: "interest", description: "Problème complexe détecté : transfert vers l'Expert Technique." },
            { from: 1, to: 0, trigger: "manual", description: "Passage manuel si l'expert décide de renvoyer vers la réception." },
        ]
    },
    {
        id: "marketing",
        label: "Équipe Marketing",
        color: "#ec4899",
        description: "Lead nurturing automatisé : contenu, email marketing et qualification pour les commerciaux.",
        agents: [
            { name: "Éducateur", role: "Content & Lead Nurturing", system_prompt: "Tu partages du contenu de valeur pour éduquer les prospects sur notre offre. Tu entretiens la relation sur le long terme." },
            { name: "Qualificateur", role: "Lead Scoring & Qualification", system_prompt: "Tu analyses le niveau de maturité du prospect et tu décides quand il est prêt à être transféré à l'équipe commerciale." },
        ],
        links: [
            { from: 0, to: 1, trigger: "interest", description: "Le prospect montre de l'intérêt → Le Qualificateur évalue et prépare le passage aux commerciaux." },
        ]
    },
];

export function EquipeView() {
    const { agents, teams, links, createTeam, deleteTeam, createLink, deleteLink, createAgent, fetchAgents } = useAgents();

    // ── Team creation state ───────────────────────────────────────────────────
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamColor, setNewTeamColor] = useState("#1e3a8a");
    const [newTeamAvatar, setNewTeamAvatar] = useState("");
    const [newTeamDescription, setNewTeamDescription] = useState("");
    const [templateAgents, setTemplateAgents] = useState<{ name: string; role: string; system_prompt: string }[]>([]);
    const [templateLinks, setTemplateLinks] = useState<{ from: number; to: number; trigger: string; description: string }[]>([]);
    const [selectedTeamForDetails, setSelectedTeamForDetails] = useState<any | null>(null);

    const applyTemplate = (tpl: typeof TEAM_TEMPLATES[0]) => {
        setSelectedTemplate(tpl.id);
        setNewTeamName(tpl.label);
        setNewTeamColor(tpl.color);
        setNewTeamDescription(tpl.description);
        setTemplateAgents(tpl.agents.map(a => ({ ...a })));
        setTemplateLinks(tpl.links.map(l => ({ ...l })));
    };

    const resetTeamModal = () => {
        setIsCreatingTeam(false);
        setSelectedTemplate(null);
        setNewTeamName("");
        setNewTeamColor("#1e3a8a");
        setNewTeamAvatar("");
        setNewTeamDescription("");
        setTemplateAgents([]);
        setTemplateLinks([]);
    };

    // ── Inline agent creation (from team card) ────────────────────────────────
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [selectedTeamForNewAgent, setSelectedTeamForNewAgent] = useState<number | null>(null);
    const [newAgent, setNewAgent] = useState({
        name: "",
        role: "",
        system_prompt: "",
        avatar: "/avatars/avatar_1.png",
        llm_model: "gemini-1.5-flash"
    });

    // ── Link creation state ───────────────────────────────────────────────────
    const [isCreatingLink, setIsCreatingLink] = useState(false);
    const [newLink, setNewLink] = useState({
        source_agent: "",
        target_agent: "",
        trigger_type: "interest",
        description: ""
    });

    const colors = [
        { name: 'Bleu Magia', value: '#1e3a8a' },
        { name: 'Émeraude', value: '#10b981' },
        { name: 'Indigo', value: '#6366f1' },
        { name: 'Violet', value: '#8b5cf6' },
        { name: 'Rose', value: '#ec4899' },
        { name: 'Orange', value: '#f97316' },
        { name: 'Cyan', value: '#06b6d4' },
    ];

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleCreateTeam = async () => {
        if (!newTeamName) return;
        const team = await createTeam({
            name: newTeamName,
            description: newTeamDescription,
            color: newTeamColor,
            avatar: newTeamAvatar || null
        });
        if (team && templateAgents.length > 0) {
            const createdAgents: any[] = [];
            for (const agentDef of templateAgents) {
                const a = await createAgent({
                    ...agentDef,
                    team: team.id,
                    is_team_agent: true,
                    is_deployed: true,
                    llm_model: "gemini-2.0-flash",
                    execution_mode: "auto"
                });
                createdAgents.push(a);
            }
            for (const linkDef of templateLinks) {
                const src = createdAgents[linkDef.from];
                const tgt = createdAgents[linkDef.to];
                if (src && tgt) {
                    await createLink({
                        source_agent: src.id,
                        target_agent: tgt.id,
                        trigger_type: linkDef.trigger,
                        description: linkDef.description
                    });
                }
            }
            fetchAgents();
        }
        resetTeamModal();
    };

    const handleCreateAgent = async () => {
        if (!newAgent.name) return;
        const agent = await createAgent({
            ...newAgent,
            team: selectedTeamForNewAgent,
            is_deployed: true
        });
        if (agent) {
            setNewAgent({ name: "", role: "", system_prompt: "", avatar: "/avatars/avatar_1.png", llm_model: "gemini-1.5-flash" });
            setIsCreatingAgent(false);
            fetchAgents();
        }
    };

    const handleCreateLink = async () => {
        if (!newLink.source_agent || !newLink.target_agent) return;
        await createLink(newLink);
        setIsCreatingLink(false);
    };

    return (
        <div className="h-full flex flex-col space-y-8 animate-page-fade overflow-hidden">
            {showWizard && <AITeamWizard onClose={() => { setShowWizard(false); fetchAgents(); }} />}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
                <div className="space-y-1">
                    <h1 className="magia-h1 text-2xl sm:text-3xl">Gestion d'équipe</h1>
                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-gray-400 max-w-md">
                        Organisez vos agents et créez des flux de travail automatisés
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button
                        onClick={() => setShowWizard(true)}
                        variant="outline"
                        className="flex-1 sm:flex-none border-blue-200 text-blue-900 hover:bg-blue-50 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-4 sm:px-5 py-2.5 h-auto flex items-center justify-center gap-2 rounded-xl"
                    >
                        <Sparkles className="w-3.5 h-3.5" /> CRÉER AVEC IA
                    </Button>
                    <Button
                        onClick={() => setIsCreatingTeam(true)}
                        className="flex-1 sm:flex-none bg-blue-900 text-white hover:bg-blue-800 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-4 sm:px-6 py-2.5 h-auto flex items-center justify-center whitespace-nowrap rounded-xl"
                    >
                        <Plus className="w-4 h-4 mr-2" /> CRÉER ÉQUIPE
                    </Button>
                </div>
            </div>

            {/* Teams Grid - Scrollable area for content */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
                {teams.map(team => (
                    <div
                        key={team.id}
                        onClick={() => setSelectedTeamForDetails(team)}
                        className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative group overflow-hidden cursor-pointer"
                        style={{ borderLeft: `6px solid ${team.color || '#1e3a8a'}` }}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm overflow-hidden"
                                style={{ backgroundColor: team.color || '#1e3a8a' }}
                            >
                                {team.avatar ? (
                                    <img src={team.avatar} alt={team.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Users className="w-5 h-5" />
                                )}
                            </div>
                            <h3 className="text-[13px] font-black uppercase tracking-widest text-gray-900">{team.name}</h3>
                        </div>
                        <div className="flex flex-col gap-4">
                            {team.description && (
                                <p className="text-[10px] text-gray-500 italic line-clamp-2 border-l-2 border-gray-100 pl-3 py-1">
                                    {team.description}
                                </p>
                            )}
                            <div className="space-y-2 border-t border-gray-50 pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Composition de l'unité :</p>
                                    <div className="flex items-center gap-1.5">
                                        {/* Dynamic channel visibility based on roles/tasks */}
                                        {agents.some(a => a.team === team.id && (a.role?.toLowerCase().includes('email') || a.system_prompt?.toLowerCase().includes('email'))) && (
                                            <span className="w-3.5 h-3.5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-[7px] font-black border border-blue-100" title="Email active">E</span>
                                        )}
                                        {agents.some(a => a.team === team.id && (a.role?.toLowerCase().includes('whatsapp') || a.system_prompt?.toLowerCase().includes('whatsapp'))) && (
                                            <span className="w-3.5 h-3.5 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-[7px] font-black border border-green-100" title="WhatsApp active">W</span>
                                        )}
                                    </div>
                                </div>
                                {agents.filter(a => a.team === team.id).map(agent => (
                                    <div key={agent.id} className="flex items-start gap-2 group/item">
                                        <div className="w-1 h-4 mt-0.5 rounded-none" style={{ backgroundColor: team.color || '#1e3a8a' }} />
                                        <div className="flex-1">
                                            <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{agent.name}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase">{agent.role}</p>
                                        </div>
                                    </div>
                                ))}
                                {agents.filter(a => a.team === team.id).length === 0 && (
                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Aucun agent assigné</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {agents.filter(a => a.team === team.id).length} AGENT{agents.filter(a => a.team === team.id).length > 1 ? 'S' : ''}
                                </p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTeamForNewAgent(team.id);
                                        setIsCreatingAgent(true);
                                    }}
                                    className="text-[9px] font-black uppercase tracking-widest text-blue-900 hover:underline flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> AJOUTER AGENT
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteTeam(team.id);
                            }}
                            className="absolute top-4 right-4 p-2 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                    <div className="flex items-center gap-3">
                        <LinkIcon className="w-5 h-5 text-blue-900" />
                        <h2 className="text-[14px] font-black uppercase tracking-widest text-gray-900">Liaisons & Passages de témoin</h2>
                    </div>
                    <Button
                        onClick={() => setIsCreatingLink(true)}
                        variant="outline"
                        className="text-[9px] font-black uppercase tracking-widest border-gray-200"
                    >
                        <Plus className="w-3 h-3 mr-2" /> AJOUTER LIAISON
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {links.map(link => (
                        <div key={link.id} className="bg-gray-50/50 p-6 rounded-none border border-gray-100 flex items-center justify-between group">
                            <div className="flex items-center gap-8">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">DE :</span>
                                    <span className="text-[12px] font-black text-gray-900 uppercase tracking-widest">{link.source_agent_name}</span>
                                    <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">{agents.find(a => a.id === link.source_agent)?.role}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className={cn(
                                        "px-3 py-1 rounded-none text-[9px] font-black uppercase tracking-widest mb-2 border",
                                        link.trigger_type === 'manual'
                                            ? "bg-amber-100 text-amber-700 border-amber-200 ring-4 ring-amber-50"
                                            : "bg-blue-100 text-blue-700 border-blue-200"
                                    )}>
                                        {link.trigger_type === 'interest' ? 'INTÉRÊT DÉTECTÉ' : link.trigger_type === 'email_requested' ? "DEMANDE D'EMAIL" : link.trigger_type === 'whatsapp_requested' ? 'DEMANDE WHATSAPP' : 'PASSAGE MANUEL'}
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300 transition-transform group-hover:translate-x-1" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">VERS :</span>
                                    <span className="text-[12px] font-black text-gray-900 uppercase tracking-widest">{link.target_agent_name}</span>
                                    <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">{agents.find(a => a.id === link.target_agent)?.role}</span>
                                </div>
                                {link.description && (
                                    <div className="max-w-[200px] border-l border-gray-200 pl-4 py-1">
                                        <p className="text-[10px] text-gray-400 italic leading-snug">{link.description}</p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => deleteLink(link.id)}
                                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    {links.length === 0 && (
                        <div className="py-12 text-center bg-gray-50/30 rounded-none border border-dashed border-gray-100">
                            <Info className="w-8 h-8 text-gray-200 mx-auto mb-4" />
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Aucune liaison configurée</p>
                        </div>
                    )}
                </div>
            </div> */}

            </div>

            {/* ── Modal: Team Details ────────────────────────────────────────────── */}
            {selectedTeamForDetails && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
                        <div className="relative h-32 flex-shrink-0" style={{ backgroundColor: selectedTeamForDetails.color || '#1e3a8a' }}>
                            <button 
                                onClick={() => setSelectedTeamForDetails(null)}
                                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="absolute -bottom-8 left-10 w-24 h-24 bg-white rounded-3xl p-1 shadow-xl">
                                <div className="w-full h-full rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: selectedTeamForDetails.color || '#1e3a8a' }}>
                                    {selectedTeamForDetails.avatar ? (
                                        <img src={selectedTeamForDetails.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
                                    ) : (
                                        <Users className="w-8 h-8" />
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-12 px-10 pb-10 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{selectedTeamForDetails.name}</h2>
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Unité Opérationnelle</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">
                                        {agents.filter(a => a.team === selectedTeamForDetails.id).length} AGENTS
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5" /> Mission & Objectifs
                                    </h4>
                                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50/50 p-5 rounded-2xl border border-gray-100 italic">
                                        "{selectedTeamForDetails.description || "Aucune mission définie pour cette équipe."}"
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5" /> Membres de l'unité
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {agents.filter(a => a.team === selectedTeamForDetails.id).map(agent => (
                                            <div key={agent.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-400">
                                                        {agent.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[12px] font-black text-gray-900 uppercase tracking-tight">{agent.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{agent.role}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="text-[10px] font-black text-blue-900 uppercase tracking-widest px-3 py-1 hover:bg-blue-50 rounded-lg">Gérer</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-3 flex-shrink-0">
                            <Button 
                                onClick={() => setSelectedTeamForDetails(null)}
                                variant="outline" 
                                className="flex-1 rounded-xl h-12 text-[11px] font-black uppercase tracking-widest"
                            >
                                Fermer
                            </Button>
                            <Button 
                                className="flex-1 bg-blue-950 hover:bg-black rounded-xl h-12 text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20"
                                onClick={() => {
                                    setSelectedTeamForNewAgent(selectedTeamForDetails.id);
                                    setIsCreatingAgent(true);
                                    setSelectedTeamForDetails(null);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" /> AJOUTER AGENT
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isCreatingTeam && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[16px] font-black uppercase tracking-widest text-gray-900">Nouvelle Équipe</h2>
                            {selectedTemplate && (
                                <button
                                    onClick={() => { setSelectedTemplate(null); setTemplateAgents([]); setTemplateLinks([]); }}
                                    className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-700"
                                >
                                    ← Changer de modèle
                                </button>
                            )}
                        </div>

                        {!selectedTemplate && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" /> Démarrer depuis un modèle prédéfini
                                </p>
                                <div className="grid grid-cols-1 gap-3">
                                    {TEAM_TEMPLATES.map(tpl => (
                                        <button
                                            key={tpl.id}
                                            onClick={() => applyTemplate(tpl)}
                                            className="w-full text-left p-4 rounded-none border border-gray-100 bg-gray-50 hover:border-blue-900/30 hover:bg-blue-50/30 transition-all group flex items-start gap-4"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-black text-gray-900 uppercase tracking-widest">{tpl.label}</p>
                                                <p className="text-[10px] text-gray-500 mt-1 leading-snug">{tpl.description}</p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {tpl.agents.map(a => (
                                                        <span key={a.name} className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[9px] font-black text-gray-500 uppercase tracking-widest">{a.name}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-900 flex-shrink-0 mt-1" />
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setSelectedTemplate("blank")}
                                        className="w-full text-left p-4 rounded-none border border-dashed border-gray-200 hover:border-gray-400 transition-all flex items-center gap-4 text-gray-400 hover:text-gray-700"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Créer depuis zéro</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedTemplate && (
                            <>
                                {selectedTemplate !== "blank" && templateAgents.length > 0 && (
                                    <div className="bg-blue-50 rounded-none p-4 space-y-3 border border-blue-100">
                                        <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3" /> Ce modèle créera automatiquement :
                                        </p>
                                        <div className="space-y-1.5">
                                            {templateAgents.map((a, i) => (
                                                <div key={i} className="flex items-center gap-3 bg-white/50 p-2 rounded-xl border border-blue-100/50">
                                                    <span className="w-6 h-6 rounded-lg bg-blue-900 text-white text-[9px] font-black flex items-center justify-center shadow-md">{i + 1}</span>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-gray-700">{a.name}</span>
                                                            <input
                                                                value={a.name}
                                                                onChange={e => setTemplateAgents(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                                                className="px-2 py-1 bg-white border border-blue-200 rounded-lg text-[10px] font-bold outline-none w-24 focus:border-blue-900"
                                                            />
                                                        </div>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{a.role}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-2 border-t border-blue-100 space-y-1">
                                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                                                {templateLinks.length} liaison{templateLinks.length > 1 ? "s" : ""} automatique{templateLinks.length > 1 ? "s" : ""}
                                            </p>
                                            {templateLinks.map((l, i) => (
                                                <p key={i} className="text-[9px] text-gray-500 flex items-center gap-1">
                                                    <span className="font-bold text-gray-700">{templateAgents[l.from]?.name}</span>
                                                    <ArrowRight className="w-3 h-3" />
                                                    <span className="font-bold text-gray-700">{templateAgents[l.to]?.name}</span>
                                                    <span className="italic ml-1 text-gray-400">
                                                        via {l.trigger === 'interest' ? 'intérêt' : l.trigger === 'email_requested' ? 'email' : l.trigger === 'whatsapp_requested' ? 'WhatsApp' : 'manuel'}
                                                    </span>
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <input
                                    type="text"
                                    placeholder="NOM DE L'ÉQUIPE..."
                                    value={newTeamName}
                                    onChange={e => setNewTeamName(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-xl text-[12px] font-bold focus:outline-none focus:border-blue-900/50 placeholder:text-gray-300 uppercase tracking-[0.2em] transition-all"
                                    onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                                />
                                <input
                                    type="text"
                                    placeholder="URL DE L'AVATAR (OPTIONNEL)..."
                                    value={newTeamAvatar}
                                    onChange={e => setNewTeamAvatar(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-xl text-[12px] font-bold focus:outline-none focus:border-blue-900/50 placeholder:text-gray-300 uppercase tracking-[0.2em] transition-all"
                                />
                                <textarea
                                    placeholder="OBJECTIFS ET TÂCHES DE L'ÉQUIPE (QUI FAIT QUOI ?)..."
                                    value={newTeamDescription}
                                    onChange={e => setNewTeamDescription(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-xl text-[12px] font-medium focus:outline-none focus:border-blue-900/50 placeholder:text-gray-300 min-h-[100px] transition-all"
                                />
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Couleur d'identité</label>
                                    <div className="flex flex-wrap gap-2">
                                        {colors.map(c => (
                                            <button
                                                key={c.value}
                                                onClick={() => setNewTeamColor(c.value)}
                                                className={cn(
                                                    "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                                    newTeamColor === c.value ? "border-gray-900 scale-110" : "border-transparent"
                                                )}
                                                style={{ backgroundColor: c.value }}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button variant="ghost" onClick={resetTeamModal} className="flex-1 text-[10px] font-black uppercase tracking-widest">Annuler</Button>
                                    <Button onClick={handleCreateTeam} className="flex-1 bg-blue-900 text-white text-[10px] font-black uppercase tracking-widest py-3 h-auto">
                                        {templateAgents.length > 0 ? `Créer l'équipe + ${templateAgents.length} agents` : "Valider l'Équipe"}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Modal: New Agent ────────────────────────────────────────────── */}
            {isCreatingAgent && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-[16px] font-black uppercase tracking-[0.2em] text-blue-900 text-center">Nouveau Spécialiste</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="magia-label">Nom de l'unité</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:border-blue-900"
                                    value={newAgent.name}
                                    onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
                                    placeholder="Ex: Prospecteur"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="magia-label">Expertise / Rôle</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:border-blue-900"
                                    value={newAgent.role}
                                    onChange={e => setNewAgent({ ...newAgent, role: e.target.value })}
                                    placeholder="Ex: Qualification"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="magia-label">Avatar URL</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:border-blue-900"
                                value={newAgent.avatar}
                                onChange={e => setNewAgent({ ...newAgent, avatar: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="magia-label">Instructions Spécifiques</label>
                            <textarea
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-medium outline-none min-h-[100px] focus:border-blue-900"
                                value={newAgent.system_prompt}
                                onChange={e => setNewAgent({ ...newAgent, system_prompt: e.target.value })}
                                placeholder="Définissez comment cet agent doit se comporter..."
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="ghost" onClick={() => setIsCreatingAgent(false)} className="flex-1 text-[10px] font-black uppercase tracking-widest">Annuler</Button>
                            <Button onClick={handleCreateAgent} className="flex-1 bg-blue-900 text-white text-[10px] font-black uppercase tracking-widest py-3 h-auto">Créer l'unité</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: New Link ─────────────────────────────────────────────── */}
            {isCreatingLink && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-[16px] font-black uppercase tracking-[0.2em] text-blue-950 text-center">Créer une liaison</h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="magia-label">Agent Source</label>
                                <select
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-900"
                                    value={newLink.source_agent}
                                    onChange={e => {
                                        const agentId = e.target.value;
                                        setNewLink({ ...newLink, source_agent: agentId, target_agent: "" });
                                    }}
                                >
                                    <option value="">SÉLECTIONNER UN AGENT SOURCE...</option>
                                    {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
                                </select>
                            </div>

                            <div className="space-y-2 text-center text-gray-300">
                                <ArrowRight className="w-6 h-6 mx-auto rotate-90 md:rotate-0" />
                            </div>

                            <div className="space-y-2">
                                <label className="magia-label">Agent Cible</label>
                                <select
                                    disabled={!newLink.source_agent}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-900 disabled:opacity-50"
                                    value={newLink.target_agent}
                                    onChange={e => setNewLink({ ...newLink, target_agent: e.target.value })}
                                >
                                    <option value="">SÉLECTIONNER UN AGENT CIBLE...</option>
                                    {agents
                                        .filter(a => {
                                            const sourceAgent = agents.find(sa => sa.id.toString() === newLink.source_agent);
                                            return sourceAgent && a.team === sourceAgent.team && a.id.toString() !== newLink.source_agent;
                                        })
                                        .map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)
                                    }
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="magia-label">Déclencheur (Trigger)</label>
                                <select
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-900"
                                    value={newLink.trigger_type}
                                    onChange={e => setNewLink({ ...newLink, trigger_type: e.target.value })}
                                >
                                    <option value="interest">INTÉRÊT DÉTECTÉ</option>
                                    <option value="email_requested">DEMANDE D'EMAIL</option>
                                    <option value="whatsapp_requested">DEMANDE WHATSAPP</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="magia-label">Description du transfert</label>
                                <textarea
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-medium outline-none min-h-[80px] focus:border-blue-900"
                                    value={newLink.description}
                                    onChange={e => setNewLink({ ...newLink, description: e.target.value })}
                                    placeholder="Ex: Le prospecteur transfère au closer..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="ghost" onClick={() => setIsCreatingLink(false)} className="flex-1 text-[10px] font-black uppercase tracking-widest">Annuler</Button>
                            <Button
                                onClick={handleCreateLink}
                                disabled={!newLink.source_agent || !newLink.target_agent}
                                className="flex-1 bg-blue-900 text-white text-[10px] font-black uppercase tracking-widest py-3 h-auto"
                            >
                                Finaliser la liaison
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
