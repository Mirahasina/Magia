import { useState } from "react";
import { Plus, Search, Filter, LayoutGrid, List, Sparkles, Zap, Shield, HelpCircle, AlertCircle, Trash2, Edit3, ExternalLink, Globe, Mail, MessageSquare, ChevronRight, ChevronDown, Settings, Check, Terminal, Puzzle, FileText, CreditCard, BarChart3, BookOpen, Users, LayoutDashboard, Clock, Bot, Database, Pause, Play, BarChart2, Target } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AgentCard } from "./AgentCard";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";

// Modular Imports
import { Agent } from "./dashboard/types";
import { NewAgentFlow } from "./dashboard/NewAgentFlow";
import { AgentDetailView } from "./dashboard/AgentDetailView";
import { PlaceholderView } from "./dashboard/PlaceholderView";

const agents: Agent[] = [
    {
        name: "Léa",
        role: "SDR Inbound Agent",
        category: "Qualifie les leads entrants",
        status: "active",
        stats: {
            conversations: "1 247",
            resolution: "92.3%",
            responseTime: "4.1s",
            leads: "89"
        },
        channels: ["website", "email"],
        avatarColor: "bg-yellow-400"
    },
    {
        name: "Max",
        role: "Qualifier B2B",
        category: "Qualification grands comptes",
        status: "active",
        stats: {
            conversations: "892",
            resolution: "89.7%",
            responseTime: "3.8s",
            leads: "45"
        },
        channels: ["email"],
        avatarColor: "bg-orange-500"
    },
    {
        name: "Emma",
        role: "Support Client",
        category: "Résolution tickets niveau 1",
        status: "active",
        stats: {
            conversations: "2 078",
            resolution: "78.4%",
            responseTime: "6.2s",
            leads: "-"
        },
        channels: ["website", "whatsapp"],
        avatarColor: "bg-red-500"
    },
    {
        name: "Oscar",
        role: "Invoice Assistant",
        category: "Traitement factures",
        status: "draft",
        stats: {
            conversations: "0",
            resolution: "0%",
            responseTime: "0s",
            leads: "0"
        },
        channels: [],
        avatarColor: "bg-gray-400"
    }
];

export function Dashboard({ onLogout }: { onLogout?: () => void }) {
    const [activeTab, setActiveTab] = useState("Tableau de bord");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);

    const renderContent = () => {
        if (isCreatingAgent) {
            return <NewAgentFlow
                onComplete={() => setIsCreatingAgent(false)}
                onCancel={() => setIsCreatingAgent(false)}
            />;
        }

        if (viewingAgent) {
            return <AgentDetailView agent={viewingAgent} onBack={() => setViewingAgent(null)} />;
        }

        switch (activeTab) {
            case "Tableau de bord":
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
                                <p className="text-gray-500">Aperçu global de votre activité IA</p>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" className="gap-2"> <ExternalLink className="w-4 h-4" /> Rapport PDF</Button>
                                <Button onClick={() => setIsCreatingAgent(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-200">
                                    <Plus className="w-4 h-4" /> Nouvel agent
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-blue-50 rounded-xl"> <MessageSquare className="w-5 h-5 text-blue-600" /> </div>
                                    <span className="text-green-500 text-xs font-bold">+12% vs hier</span>
                                </div>
                                <div className="text-sm text-gray-500 mb-1">Conversations actives</div>
                                <div className="text-3xl font-bold font-mono">4 281</div>
                            </div>
                            <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-purple-50 rounded-xl"> <Zap className="w-5 h-5 text-purple-600" /> </div>
                                    <span className="text-green-500 text-xs font-bold">Excellent</span>
                                </div>
                                <div className="text-sm text-gray-500 mb-1">Satisfaction client</div>
                                <div className="text-3xl font-bold font-mono">94.8%</div>
                            </div>
                            <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-orange-50 rounded-xl"> <Target className="w-5 h-5 text-orange-600" /> </div>
                                    <span className="text-orange-500 text-xs font-bold">8h restantes</span>
                                </div>
                                <div className="text-sm text-gray-500 mb-1">Objectif hebdomadaire</div>
                                <div className="text-3xl font-bold font-mono">82%</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
                                <h3 className="text-lg font-bold mb-6">Activité récente</h3>
                                <div className="space-y-6">
                                    {[
                                        { user: "Léa", action: "a résolu un ticket", time: "Il y a 2m" },
                                        { user: "Max", action: "a qualifié 12 leads", time: "Il y a 15m" },
                                        { user: "Emma", action: "est passée en mode veille", time: "Il y a 1h" }
                                    ].map((act, i) => (
                                        <div key={i} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{act.user}</p>
                                                    <p className="text-xs text-gray-500">{act.action}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-400 font-medium">{act.time}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-8 bg-gray-900 rounded-[2.5rem] text-white overflow-hidden relative">
                                <h3 className="text-lg font-bold mb-4 relative z-10">Optimisation suggérée</h3>
                                <p className="text-gray-400 text-sm mb-6 relative z-10">L'agent "Léa" rencontre des difficultés sur les demandes de remboursement complexes.</p>
                                <Button className="bg-white text-gray-900 hover:bg-gray-100 font-bold px-6 py-2 rounded-xl relative z-10">
                                    Améliorer les instructions
                                </Button>
                                <Sparkles className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 -rotate-12" />
                            </div>
                        </div>
                    </div>
                );
            case "Agents":
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        {/* Page Header */}
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">AI Workforce</h1>
                                <p className="text-gray-500">Gérez vos agents IA et leur performance</p>
                            </div>
                            <button
                                onClick={() => setIsCreatingAgent(true)}
                                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all hover:translate-y-[-1px] active:translate-y-[0px] shadow-lg shadow-gray-200 group"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                Nouvel agent
                            </button>
                        </div>

                        {/* Stats & Filters */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-6 p-1.5 bg-gray-100/50 rounded-xl px-4 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 text-green-600">
                                        <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                        <span className="text-sm font-bold">3 actifs</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-orange-500">
                                        <div className="w-2 h-2 rounded-full bg-current" />
                                        <span className="text-sm font-bold">0 en pause</span>
                                    </div>
                                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4 text-gray-400">
                                        <div className="w-2 h-2 rounded-full bg-current" />
                                        <span className="text-sm font-bold">1 brouillon</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 max-w-2xl">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Rechercher par nom, type, canal..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
                                        />
                                    </div>
                                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap">
                                        Services
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap">
                                        Status
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 p-1 bg-gray-100/50 rounded-xl shrink-0">
                                    <button
                                        onClick={() => setViewMode("grid")}
                                        className={cn("p-2 rounded-lg transition-all", viewMode === "grid" ? "bg-white text-blue-600 shadow-sm scale-110" : "text-gray-400 hover:text-gray-600")}
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className={cn("p-2 rounded-lg transition-all", viewMode === "list" ? "bg-white text-blue-600 shadow-sm scale-110" : "text-gray-400 hover:text-gray-600")}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Agents Grid/List */}
                        <div className={cn(
                            viewMode === "grid" ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : "space-y-4"
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
            case "Vue globale":
                return (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="p-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-4xl font-bold mb-4">Vue d'ensemble</h2>
                                <p className="text-blue-100 text-lg mb-8 max-w-xl">Votre main-d'œuvre IA a traité 12.4k requêtes cette semaine, avec un taux de satisfaction de 94%.</p>
                                <div className="flex gap-4">
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-1">
                                        <div className="text-3xl font-bold">89%</div>
                                        <div className="text-sm text-blue-100">Automatisation</div>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-1">
                                        <div className="text-3xl font-bold">1.2k</div>
                                        <div className="text-sm text-blue-100">Leads générés</div>
                                    </div>
                                </div>
                            </div>
                            <LayoutDashboard className="absolute -bottom-10 -right-10 w-64 h-64 text-white/10 rotate-12" />
                        </div>
                    </div>
                );
            case "Modèles":
                return (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Modèles d'Agents</h2>
                            <Button variant="outline" size="sm">Importer un JSON</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { title: "Service Client", desc: "Optimisé pour la résolution rapide", use: "45" },
                                { title: "Ventes B2B", desc: "Expert en prospection LinkedIn", use: "128" },
                                { title: "Analyse Data", desc: "Extraction d'insights complexes", use: "12" }
                            ].map((m) => (
                                <div key={m.title} className="p-6 bg-white border border-gray-100 rounded-2xl hover:border-blue-600 transition-all cursor-pointer">
                                    <FileText className="w-8 h-8 text-blue-600 mb-4" />
                                    <h4 className="font-bold mb-1">{m.title}</h4>
                                    <p className="text-sm text-gray-500 mb-4">{m.desc}</p>
                                    <div className="text-xs font-medium text-gray-400">Utilisé {m.use} fois</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case "Marché":
                return (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Marketplace MAGIA</h2>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">Populaire</span>
                                <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-bold">Nouveau</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border border-blue-100 rounded-3xl relative overflow-hidden group">
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6">
                                        <Plus className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Agent Traducteur Pro</h3>
                                    <p className="text-sm text-gray-600 mb-6">Traduisez vos documents techniques en 45 langues avec conservation de la mise en page.</p>
                                    <button className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold">Installer gratuit</button>
                                </div>
                                <Globe className="absolute -bottom-4 -right-4 w-32 h-32 text-purple-100 group-hover:rotate-12 transition-transform" />
                            </div>
                            <div className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-100 rounded-3xl relative overflow-hidden group">
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6">
                                        <MessageSquare className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Assistant WhatsApp 3.0</h3>
                                    <p className="text-sm text-gray-600 mb-6">Connectez vos agents à WhatsApp Business API avec des workflows automatisés.</p>
                                    <button className="px-6 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold">7 jours d'essai</button>
                                </div>
                                <Puzzle className="absolute -bottom-4 -right-4 w-32 h-32 text-orange-100 group-hover:-rotate-12 transition-transform" />
                            </div>
                        </div>
                    </div>
                );
            case "Base de connaissances":
                return (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Base de Connaissances</h2>
                            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold">
                                <Plus className="w-4 h-4" />
                                Ajouter une source
                            </button>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Document</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Taille</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Indexation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {[
                                        { name: "Guide_Produit_2024.pdf", size: "2.4 MB", status: "Indexé", color: "text-green-600" },
                                        { name: "FAQ_Standard.docx", size: "842 KB", status: "En cours", color: "text-blue-600" },
                                        { name: "Tarifs_Speciaux.xlsx", size: "1.1 MB", status: "Erreur", color: "text-red-600" }
                                    ].map((doc) => (
                                        <tr key={doc.name} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 rounded-lg"><BookOpen className="w-4 h-4 text-gray-600" /></div>
                                                <span className="text-sm font-bold text-gray-900">{doc.name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{doc.size}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-400">Prêt</td>
                                            <td className="px-6 py-4">
                                                <span className={cn("text-xs font-bold px-2 py-1 rounded-full bg-opacity-10", doc.color.replace('text', 'bg'))}>
                                                    {doc.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case "Boîte de réception":
                return (
                    <div className="h-full animate-in fade-in duration-500 flex flex-col items-center justify-center bg-gray-50/50 rounded-3xl border border-gray-100 p-20">
                        <MessageSquare className="w-16 h-16 text-gray-200 mb-6" />
                        <h2 className="text-xl font-bold text-gray-400 mb-2">Aucun message pour le moment</h2>
                        <p className="text-sm text-gray-400">Dès que vos agents interagiront, les conversations apparaîtront ici.</p>
                    </div>
                );
            case "Intégrations":
                return (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold">Marketplace & Apps</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {['Slack', 'HubSpot', 'Salesforce', 'WhatsApp', 'Zendesk', 'Email'].map((app) => (
                                <div key={app} className="p-6 bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-blue-500 transition-all group cursor-pointer shadow-sm">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                        <Puzzle className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{app}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case "Analyses":
                return (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold">Analyses & ROI</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[
                                { label: "Économie estimée", val: "4 250 €", icon: CreditCard, color: "text-green-600" },
                                { label: "Taux d'automatisation", val: "84%", icon: BarChart3, color: "text-blue-600" },
                                { label: "Conversations totales", val: "12,4k", icon: MessageSquare, color: "text-purple-600" },
                                { label: "Temps gagné", val: "420h", icon: Globe, color: "text-orange-600" }
                            ].map((s) => (
                                <div key={s.label} className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-opacity-10", s.color.replace('text', 'bg'))}>
                                        <s.icon className={cn("w-5 h-5", s.color)} />
                                    </div>
                                    <div className="text-sm text-gray-500 mb-1">{s.label}</div>
                                    <div className="text-2xl font-bold text-gray-900">{s.val}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case "Membres":
                return (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Équipe</h2>
                            <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold">
                                <Plus className="w-4 h-4" />
                                Inviter un membre
                            </button>
                        </div>
                        <div className="space-y-3">
                            {[
                                { name: "Jean Dupont", role: "Propriétaire", email: "jean@magia.com" },
                                { name: "Sarah Koné", role: "Manager", email: "sarah@magia.com" },
                                { name: "Marc Lova", role: "Développeur", email: "marc@magia.com" }
                            ].map((user) => (
                                <div key={user.email} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{user.name}</div>
                                            <div className="text-xs text-gray-400">{user.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{user.role}</span>
                                        <Settings className="w-4 h-4 text-gray-300 cursor-pointer hover:text-gray-600" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case "Journaux d'audit":
                return (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold font-mono">system.log</h2>
                        <div className="bg-gray-900 rounded-2xl p-6 font-mono text-sm overflow-hidden border border-gray-800 shadow-2xl">
                            <div className="flex gap-4 text-gray-500 border-b border-gray-800 pb-4 mb-4">
                                <span>TIMESTAMP</span>
                                <span>ACTION</span>
                                <span>USER</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-4">
                                    <span className="text-blue-400">11:04:22</span>
                                    <span className="text-green-400">AGENT_DEPLOYED</span>
                                    <span className="text-gray-300">jean@magia.com</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-blue-400">10:52:10</span>
                                    <span className="text-yellow-400">DOC_INDEXED</span>
                                    <span className="text-gray-300">system_worker</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-blue-400">09:15:45</span>
                                    <span className="text-purple-400">LOGIN_SUCCESS</span>
                                    <span className="text-gray-300">sarah@magia.com</span>
                                </div>
                                <div className="flex gap-4 text-gray-600 italic">
                                    <span>[...] system operational</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "Paramètres":
                return (
                    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold">Paramètres de l'espace</h2>

                        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-gray-900">Nom du Workspace</label>
                                    <input type="text" defaultValue="Magna Solutions" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-gray-900">Fuseau horaire</label>
                                    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm">
                                        <option>Antananarivo (GMT+3)</option>
                                        <option>Paris (GMT+1)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-100 space-y-6">
                                <h3 className="font-bold flex items-center gap-2"> <Shield className="w-4 h-4 text-blue-600" /> Sécurité & API</h3>
                                <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Clé API Workspace</p>
                                        <p className="text-xs text-mono text-gray-400">wk_live_51P2u...8m9z</p>
                                    </div>
                                    <Button variant="outline" size="sm">Régénérer</Button>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-100 flex justify-end gap-3">
                                <Button variant="outline" className="rounded-xl font-bold">Annuler</Button>
                                <Button className="bg-gray-900 text-white rounded-xl font-bold px-8">Enregistrer</Button>
                            </div>
                        </div>
                    </div>
                );
            case "Facturation":
                return (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold">Abonnement & Facturation</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-8 bg-blue-600 rounded-[2rem] text-white shadow-xl">
                                <h3 className="text-lg font-bold opacity-80 mb-2">Plan actuel</h3>
                                <div className="text-4xl font-black mb-6 uppercase tracking-tighter">Business Pro</div>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="opacity-70">Utilisation des crédits</span>
                                        <span className="font-bold">78%</span>
                                    </div>
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white w-[78%]" />
                                    </div>
                                    <p className="text-xs opacity-70 italic text-right">Expansion prévue dans 12 jours</p>
                                </div>
                            </div>
                            <div className="p-8 bg-white border border-gray-100 rounded-[2rem] flex flex-col justify-between shadow-sm">
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-900">Moyen de paiement</h4>
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="w-12 h-8 bg-gray-900 rounded-md flex items-center justify-center text-[10px] font-black italic text-white">VISA</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-900">•••• 4242</p>
                                            <p className="text-xs text-gray-400">Expire le 12/26</p>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full mt-4 rounded-xl border-blue-100 text-blue-600 font-bold hover:bg-blue-50">Modifier la carte</Button>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                            <div className="px-8 py-6 border-b border-gray-100">
                                <h3 className="font-bold">Dernières factures</h3>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                                        <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Montant</th>
                                        <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Statut</th>
                                        <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {[
                                        { d: "01 Mars 2024", a: "145.00 €", s: "Payé" },
                                        { d: "01 Fév 2024", a: "145.00 €", s: "Payé" },
                                        { d: "01 Jan 2024", a: "85.00 €", s: "Payé" }
                                    ].map((f, i) => (
                                        <tr key={i}>
                                            <td className="px-8 py-5 text-sm font-bold text-gray-900">{f.d}</td>
                                            <td className="px-8 py-5 text-sm text-gray-600 font-mono">{f.a}</td>
                                            <td className="px-8 py-5">
                                                <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">{f.s}</span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50"> <FileText className="w-4 h-4 mr-2" /> PDF</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            default:
                return <PlaceholderView title={activeTab} icon={LayoutGrid} />;
        }
    };

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar
                activeTab={activeTab}
                onNavigate={setActiveTab}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
            <div className={cn(
                "flex-1 flex flex-col min-h-screen transition-all duration-300",
                isSidebarCollapsed ? "ml-20" : "ml-64"
            )}>
                <Topbar onLogout={onLogout} />

                <main className="p-8 flex-1 overflow-x-hidden">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}
