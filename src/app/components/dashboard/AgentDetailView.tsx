import { useState } from "react";
import { ChevronRight, Pause, Settings, Globe, Mail, MessageSquare, Terminal, BookOpen, Clock, Shield, Plus, FileText, Database, Search, Filter, ExternalLink, Zap } from "lucide-react";
import { Agent } from "./types";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { PlaceholderView } from "./PlaceholderView";

export function AgentDetailView({ agent, onBack }: { agent: Agent; onBack: () => void }) {
    const [activeDetailTab, setActiveDetailTab] = useState("Aperçu");

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl italic shadow-sm overflow-hidden shrink-0", agent.avatarColor || "bg-indigo-500")}>
                        {agent.avatar ? (
                            <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                        ) : (
                            agent.name.charAt(0)
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-gray-900">{agent.name}</h2>
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", agent.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                                {agent.status === "active" ? "Actif" : "En pause"}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">{agent.role} — {agent.category}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2"> <Pause className="w-4 h-4" /> Pause </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2"> <Settings className="w-4 h-4" /> Modifier </Button>
                </div>
            </div>

            {/* Detail Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100/50 rounded-xl w-fit">
                {["Aperçu", "Configuration", "Connaissance", "Activité"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveDetailTab(tab)}
                        className={cn(
                            "px-6 py-2 text-sm font-bold rounded-xl transition-all",
                            activeDetailTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeDetailTab === "Aperçu" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Conversations</p>
                                <p className="text-2xl font-bold text-gray-900">{agent.stats.conversations}</p>
                            </div>
                            <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Résolution</p>
                                <p className="text-2xl font-bold text-gray-900">{agent.stats.resolution}</p>
                            </div>
                            <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Leads</p>
                                <p className="text-2xl font-bold text-gray-900">{agent.stats.leads}</p>
                            </div>
                        </div>

                        {/* Recent History Table */}
                        <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 text-sm">Dernières interactions</h3>
                                <button className="text-xs font-bold text-blue-600">Voir tout</button>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {[
                                    { user: "Client #892", label: "Demande tarif", date: "Il y a 5m", status: "Résolu" },
                                    { user: "Client #891", label: "Problème accès", date: "Il y a 12m", status: "Résolu" },
                                    { user: "Client #890", label: "Lead Qualifié", date: "Il y a 1h", status: "Succès" }
                                ].map((item, i) => (
                                    <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-[10px]">C</div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{item.user}</p>
                                                <p className="text-xs text-gray-500">{item.label}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-gray-900">{item.status}</p>
                                            <p className="text-[10px] text-gray-400">{item.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Channels Status */}
                        <div className="p-8 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"> <Globe className="w-4 h-4 text-gray-400" /> Canaux actifs</h3>
                            <div className="space-y-4">
                                {agent.channels.map((chan) => (
                                    <div key={chan} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            {chan === 'website' && <Globe className="w-4 h-4 text-blue-500" />}
                                            {chan === 'email' && <Mail className="w-4 h-4 text-orange-500" />}
                                            {chan === 'whatsapp' && <MessageSquare className="w-4 h-4 text-green-500" />}
                                            <span className="text-sm font-bold capitalize">{chan}</span>
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="p-8 bg-gray-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                            <h3 className="font-bold mb-4 relative z-10">Test Sandbox</h3>
                            <p className="text-xs text-gray-400 mb-6 relative z-10">Lancez une simulation pour tester les nouvelles instructions.</p>
                            <Button className="w-full bg-white text-gray-900 hover:bg-blue-50 font-bold rounded-xl relative z-10">Démarrer le test</Button>
                            <Terminal className="absolute -bottom-6 -right-6 w-24 h-24 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform" />
                        </div>
                    </div>
                </div>
            )}

            {activeDetailTab === "Configuration" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Instructions Système</h3>
                                <textarea
                                    className="w-full h-64 p-6 bg-gray-50 border border-gray-100 rounded-xl text-sm leading-relaxed text-gray-600 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all resize-none"
                                    defaultValue={`Tu es ${agent.name}, un ${agent.role} expert. Ta mission principale est : ${agent.category}.

Directives :
1. Sois toujours professionnel et courtois.
2. Utilise le vouvoiement avec les clients.
3. Si tu ne connais pas la réponse, redirige vers un agent humain.`}
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline">Réinitialiser</Button>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">Enregistrer les instructions</Button>
                            </div>
                        </div>

                        <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm space-y-6">
                            <h3 className="text-lg font-bold text-gray-900">Intelligence & Modèle</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Modèle de base</label>
                                    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium">
                                        <option>GPT-4o (Actuel)</option>
                                        <option>Claude 3.5 Sonnet</option>
                                        <option>Gemini 1.5 Pro</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Température</label>
                                    <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                                        <input type="range" className="flex-1 accent-blue-600" min="0" max="100" defaultValue="70" />
                                        <span className="text-sm font-bold text-gray-900 w-8">0.7</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"> <Shield className="w-5 h-5 text-blue-600" /> Sécurité & État</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Mode Filtrage</p>
                                        <p className="text-[10px] text-gray-500">Bloque le contenu inapproprié</p>
                                    </div>
                                    <div className="w-12 h-6 bg-blue-600 rounded-full relative p-1 cursor-pointer">
                                        <div className="w-4 h-4 bg-white rounded-full absolute right-1" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Anonymisation</p>
                                        <p className="text-[10px] text-gray-500">Masque les données sensibles</p>
                                    </div>
                                    <div className="w-12 h-6 bg-gray-200 rounded-full relative p-1 cursor-pointer">
                                        <div className="w-4 h-4 bg-white rounded-full absolute left-1" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-red-50 border border-red-100 rounded-[2.5rem] space-y-4">
                            <h3 className="text-sm font-bold text-red-900">Zone de danger</h3>
                            <p className="text-xs text-red-600 leading-relaxed">Supprimer cet agent effacera définitivement toutes ses données et son historique.</p>
                            <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-all font-bold">Supprimer l'agent</Button>
                        </div>
                    </div>
                </div>
            )}

            {activeDetailTab === "Connaissance" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Base de Connaissances</h3>
                            <p className="text-sm text-gray-500">Gérez les documents et sources de données de votre agent.</p>
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-200">
                            <Plus className="w-4 h-4" /> Ajouter une source
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { name: "Guide_Tarifaire_2026.pdf", type: "PDF", size: "2.4 MB", status: "Indexé", icon: FileText, color: "text-blue-600" },
                            { name: "FAQ_Process_V2.docx", type: "Word", size: "1.1 MB", status: "Indexé", icon: BookOpen, color: "text-blue-500" },
                            { name: "https://magia.ai/docs", type: "Web", size: "45 pages", status: "Synchronisé", icon: Globe, color: "text-purple-500" }
                        ].map((file, i) => (
                            <div key={i} className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={cn("p-3 rounded-xl bg-gray-50 group-hover:bg-white transition-colors border border-transparent group-hover:border-gray-100", file.color)}>
                                        <file.icon className="w-6 h-6" />
                                    </div>
                                    <span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-lg uppercase tracking-wider">{file.status}</span>
                                </div>
                                <h4 className="font-bold text-gray-900 mb-1 truncate">{file.name}</h4>
                                <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold uppercase tracking-tight">
                                    <span>{file.type}</span>
                                    <span>{file.size}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-12 border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/50 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6">
                            <Database className="w-8 h-8 text-blue-100" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Étendre les connaissances</h4>
                        <p className="text-sm text-gray-400 max-w-sm mb-8">Glissez-déposez de nouveaux fichiers ou connectez une source API externe pour enrichir les capacités de réponse.</p>
                        <div className="flex gap-3">
                            <Button variant="outline">Connecter Notion</Button>
                            <Button variant="outline">Connecter Drive</Button>
                        </div>
                    </div>
                </div>
            )}

            {activeDetailTab === "Activité" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher dans les logs..."
                                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 shadow-sm"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="gap-2"> <Filter className="w-4 h-4" /> Filtres </Button>
                            <Button variant="outline" className="gap-2"> <ExternalLink className="w-4 h-4" /> Exporter </Button>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <div className="divide-y divide-gray-50">
                            {[
                                { user: "Client #892", time: "11:42", type: "Resolution", prompt: "Combien coûte le pack Business ?", model: "GPT-4o", fidelity: "98%" },
                                { user: "Système", time: "10:15", type: "Sync", prompt: "Mise à jour de la base de connaissances (Guide_Tarifaire_2026.pdf)", model: "RAG Engine", fidelity: "-" },
                                { user: "Client #891", time: "09:30", type: "Handover", prompt: "Je voudrais parler à un humain pour une demande spéciale.", model: "GPT-4o", fidelity: "85%" },
                                { user: "Client #890", time: "Hier, 18:20", type: "Lead", prompt: "Je suis intéressé par une démo personnalisée.", model: "GPT-4o", fidelity: "92%" },
                            ].map((log, i) => (
                                <div key={i} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{log.time}</span>
                                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                                log.type === 'Resolution' ? "bg-green-100 text-green-700" :
                                                    log.type === 'Sync' ? "bg-blue-100 text-blue-700" :
                                                        log.type === 'Handover' ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"
                                            )}>{log.type}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400">
                                            <span className="flex items-center gap-1"> <Zap className="w-3 h-3" /> {log.model}</span>
                                            <span className="flex items-center gap-1"> <Shield className="w-3 h-3" /> {log.fidelity}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 mb-1">{log.user}</p>
                                            <p className="text-sm text-gray-500 line-clamp-1">{log.prompt}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
