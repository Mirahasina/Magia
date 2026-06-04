import { API_BASE } from "../../../lib/api";
import { useState, useEffect, useRef } from "react";
import { ChevronRight, Pause, Play, Settings, Globe, Mail, MessageSquare, Terminal, BookOpen, Clock, Shield, Plus, FileText, Database, Search, Filter, ExternalLink, Zap, Send, Loader2, User, Upload, Trash2, X, ThumbsUp, ThumbsDown, Linkedin, AlertTriangle } from "lucide-react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { useAgents } from "../../hooks/useAgents";

interface Agent {
    id: string;
    name: string;
    role: string;
    llm_model: string;
    system_prompt: string;
    avatar?: string;
    is_active: boolean;
    is_deployed: boolean;
    channels: string[];
    messages?: any[];
    stats?: any;
}

export function AgentDetailView({ user, agent, onBack, onRefresh, onNavigateToInbox }: { user?: any; agent: Agent; onBack: () => void; onRefresh?: () => void; onNavigateToInbox?: (agentId?: string) => void }) {
    const [activeDetailTab, setActiveDetailTab] = useState("Aperçu");
    const { messages: _unused, isTyping: hookIsTyping, sandboxChat, toggleAgentPause, updateAgent, uploadKnowledge } = useAgents();

    const [sandboxMessages, setSandboxMessages] = useState<any[]>([]);
    const [sandboxInput, setSandboxInput] = useState("");
    const [isSandboxTyping, setIsSandboxTyping] = useState(false);
    const [showSandbox, setShowSandbox] = useState(false);

    const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt || "");
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const [isPausing, setIsPausing] = useState(false);

    const kbFileRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    useEffect(() => {
        if (isAtBottom && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [sandboxMessages, isSandboxTyping]);

    const handleSendSandboxMessage = async () => {
        if (!sandboxInput.trim() || isSandboxTyping) return;
        const msg = sandboxInput;
        setSandboxInput("");
        setSandboxMessages(prev => [...prev, { role: 'user', content: msg }]);

        setIsSandboxTyping(true);
        const reply = await sandboxChat(agent.id, msg);
        setIsSandboxTyping(false);

        if (reply) {
            setSandboxMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        }
    };

    const handleTogglePause = async () => {
        setIsPausing(true);
        await toggleAgentPause(agent.id);
        setIsPausing(false);
        onRefresh?.();
    };

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        await updateAgent(agent.id, { system_prompt: systemPrompt });
        setIsSavingConfig(false);
        onRefresh?.();
    };

    const handleToggleChannel = async (chan: string) => {
        let newChannels = [...(agent.channels || [])];
        if (newChannels.includes(chan)) {
            newChannels = newChannels.filter(c => c !== chan);
        } else {
            newChannels.push(chan);
        }
        await updateAgent(agent.id, { channels: newChannels });
        onRefresh?.();
    };

    const handleKbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setIsUploading(true);
        const files = Array.from(e.target.files);
        for (const file of files) {
            await uploadKnowledge(agent.id, file);
        }
        setIsUploading(false);
        e.target.value = '';
        onRefresh?.();
    };

    const displayStatus = agent.is_active ? (agent.is_deployed ? "active" : "draft") : "paused";

    const displayStats = agent.stats || {
        conversations: (agent.messages?.length || 0).toString(),
        resolution: "92%",
        responseTime: "1.2s",
        leads: "14"
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl italic shadow-sm overflow-hidden shrink-0 bg-blue-900")}>
                        {agent.avatar ? (
                            <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                        ) : (
                            agent.name.charAt(0)
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-gray-900">{agent.name}</h2>
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                displayStatus === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            )}>
                                {displayStatus === "active" ? "Actif" : "Brouillon"}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">{agent.role} — {agent.llm_model}</p>
                    </div>
                </div>

            </div>

            <div className="flex items-center gap-1 p-1 bg-gray-100/50 rounded-xl w-fit">
                {["Aperçu", "Configuration", "Connaissance"].map((tab) => (
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
                        <div className="grid grid-cols-3 gap-6">
                            <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Conversations</p>
                                <p className="text-2xl font-bold text-gray-900">{displayStats.conversations}</p>
                            </div>
                            <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Résolution</p>
                                <p className="text-2xl font-bold text-gray-900">{displayStats.resolution}</p>
                            </div>
                            <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Leads</p>
                                <p className="text-2xl font-bold text-gray-900">{displayStats.leads}</p>
                            </div>
                        </div>


                        {/* Recent History Table */}
                        <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 text-sm">Dernières interactions</h3>
                                <button
                                    onClick={() => onNavigateToInbox?.(agent.id)}
                                    className="text-xs font-bold text-blue-600 hover:underline"
                                >
                                    Voir tout
                                </button>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {(agent.messages?.slice() || []).reverse().slice(0, 5).map((msg: any, i: number) => (
                                    <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px]",
                                                (msg.sender === 'user' || msg.sender === 'USER') ? "bg-blue-50 text-blue-600" : "bg-gray-900 text-white"
                                            )}>
                                                {(msg.sender === 'user' || msg.sender === 'USER') ? 'U' : 'A'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{(msg.sender === 'user' || msg.sender === 'USER') ? (msg.contact_info || 'Utilisateur') : agent.name}</p>
                                                <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{msg.content}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[9px] font-black uppercase tracking-tighter text-gray-300 px-1.5 py-0.5 border border-gray-100 rounded">{msg.source || 'chat'}</span>
                                            <p className="text-[10px] font-bold text-gray-400">{new Date(msg.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!agent.messages || agent.messages.length === 0) && (
                                    <p className="px-6 py-8 text-center text-sm text-gray-400 font-medium">Aucune interaction récente.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Channels Status */}
                        <div className="p-8 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"> <Globe className="w-4 h-4 text-gray-400" /> Canaux actifs</h3>
                            <div className="space-y-4">
                                {['chat', 'email', 'whatsapp', 'linkedin'].map((chan) => {
                                    const isActive = agent.channels?.includes(chan);
                                    return (
                                        <div key={chan} className={cn(
                                            "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group",
                                            isActive
                                                ? "bg-blue-50/50 border-blue-100"
                                                : "bg-gray-50/30 border-gray-100 grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                                        )}
                                            onClick={() => handleToggleChannel(chan)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {chan === 'chat' && <Globe className={cn("w-4 h-4", isActive ? "text-blue-500" : "text-gray-400")} />}
                                                {chan === 'email' && <Mail className={cn("w-4 h-4", isActive ? "text-orange-500" : "text-gray-400")} />}
                                                {chan === 'whatsapp' && <MessageSquare className={cn("w-4 h-4", isActive ? "text-green-500" : "text-gray-400")} />}
                                                {chan === 'linkedin' && <Linkedin className={cn("w-4 h-4", isActive ? "text-blue-700" : "text-gray-400")} />}
                                                <span className={cn("text-sm font-bold capitalize", isActive ? "text-blue-900" : "text-gray-400")}>{chan === 'chat' ? 'Web Chat' : chan}</span>
                                            </div>
                                            <div className={cn(
                                                "w-10 h-5 rounded-full relative transition-all duration-300 p-1",
                                                isActive ? "bg-blue-900" : "bg-gray-200"
                                            )}>
                                                <div className={cn(
                                                    "w-3 h-3 bg-white rounded-full transition-all",
                                                    isActive ? "translate-x-5" : "translate-x-0"
                                                )} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="mt-4 text-[10px] text-gray-400 italic text-center">Cliquez sur un canal pour l'activer ou le désactiver.</p>
                        </div>

                        {/* Quick Actions (Sandbox) */}
                        <div className="p-8 bg-gray-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                            <h3 className="font-bold mb-4 relative z-10">Test Sandbox</h3>
                            <p className="text-xs text-gray-400 mb-6 relative z-10">Lancez une simulation pour tester les nouvelles instructions en mode isolé.</p>
                            <Button
                                onClick={() => { setSandboxMessages([]); setShowSandbox(true); }}
                                className="w-full bg-white text-gray-900 hover:bg-blue-50 font-bold rounded-xl relative z-10"
                            >
                                DÉMARRER LE TEST
                            </Button>
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
                                    className="w-full h-80 p-6 bg-gray-50 border border-gray-100 rounded-xl text-sm leading-relaxed text-gray-600 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all resize-none font-medium"
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    placeholder="Décrivez les instructions de l'agent..."
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setSystemPrompt(agent.system_prompt)}
                                >
                                    Réinitialiser
                                </Button>
                                <Button
                                    onClick={handleSaveConfig}
                                    disabled={isSavingConfig || systemPrompt === agent.system_prompt}
                                    className="bg-blue-900 hover:bg-black text-white shadow-lg shadow-blue-100"
                                >
                                    {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                                    Enregistrer les modifications
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-8 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4">Détails de l'unité</h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-gray-400">Modèle IA</p>
                                    <select
                                        className="w-full p-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-none"
                                        value={agent.llm_model || ""}
                                        onChange={async (e) => {
                                            await updateAgent(agent.id, { llm_model: e.target.value });
                                            onRefresh?.();
                                        }}
                                    >
                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Gratuit)</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (PRO)</option>
                                        <option value="gpt-4o-mini">GPT-4o Mini (Gratuit)</option>
                                        <option value="gpt-4o">GPT-4o (PRO)</option>
                                        <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (PRO)</option>
                                        <option value="o1-preview">OpenAI o1 (ENTREPRISE)</option>
                                    </select>
                                    {/* Plan Logic Feedback */}
                                    {(() => {
                                        const plan = user?.subscription?.plan_name || 'gratuit';
                                        const model = agent.llm_model;
                                        const isProModel = model === 'gemini-1.5-pro' || model === 'gpt-4o' || model === 'claude-3-5-sonnet-20240620';
                                        const isEnterpriseModel = model === 'o1-preview';

                                        if (plan === 'gratuit' && (isProModel || isEnterpriseModel)) {
                                            return <p className="text-[9px] text-orange-500 font-bold mt-1 animate-pulse flex items-center gap-1">
                                                <Zap className="w-2.5 h-2.5" /> Modèle dégradé (Plan Gratuit)
                                            </p>
                                        }
                                        if (plan === 'pro' && isEnterpriseModel) {
                                            return <p className="text-[9px] text-orange-500 font-bold mt-1 animate-pulse flex items-center gap-1">
                                                <Zap className="w-2.5 h-2.5" /> Modèle dégradé (Plan PRO)
                                            </p>
                                        }
                                        if ((plan === 'pro' && isProModel) || (plan === 'entreprise')) {
                                            return <p className="text-[9px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                                                <Sparkles className="w-2.5 h-2.5" /> Performance Maximale
                                            </p>
                                        }
                                        return null;
                                    })()}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-gray-400">Température</p>
                                    <p className="text-sm font-bold">{agent.temperature}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-gray-400">Mode d'exécution</p>
                                    <p className="text-sm font-bold capitalize">{agent.execution_mode.replace('_', ' ')}</p>
                                </div>
                                <div className="space-y-1 pt-4 border-t border-gray-100">
                                    <p className="text-[10px] font-black uppercase text-gray-400">Équipe Assignée</p>
                                    <div className="flex items-center gap-2">
                                        {agent.team_color && (
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: agent.team_color }} />
                                        )}
                                        <select
                                            className="w-full p-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-none"
                                            value={agent.team || ""}
                                            onChange={async (e) => {
                                                const val = e.target.value === "" ? null : parseInt(e.target.value);
                                                await updateAgent(agent.id, { team: val });
                                                onRefresh?.();
                                            }}
                                        >
                                            <option value="">AUCUNE ÉQUIPE</option>
                                            {((useAgents() as any).teams || []).map((t: any) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeDetailTab === "Connaissance" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Base de Connaissance</h3>
                            <p className="text-sm text-gray-400">Documents utilisés par l'IA pour répondre.</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            ref={kbFileRef}
                            multiple
                            onChange={handleKbUpload}
                        />
                        <Button
                            onClick={() => kbFileRef.current?.click()}
                            disabled={isUploading}
                            className="bg-blue-900 text-white gap-2"
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Ajouter des documents
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {agent.knowledge_bases?.map((kb: any) => (
                            <div key={kb.id} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-200 transition-all flex items-start gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 truncate">{kb.name}</h4>
                                    <p className="text-xs text-gray-400 uppercase font-black">{kb.source_type}</p>
                                    <p className="text-[10px] text-gray-300 mt-2">{new Date(kb.created_at).toLocaleDateString()}</p>
                                </div>
                                <button className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {(!agent.knowledge_bases || agent.knowledge_bases.length === 0) && (
                            <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                                <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">Aucune connaissance chargée</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <SandboxModal
                isOpen={showSandbox}
                onClose={() => setShowSandbox(false)}
                agent={agent}
                messages={sandboxMessages}
                input={sandboxInput}
                setInput={setSandboxInput}
                onSend={handleSendSandboxMessage}
                isTyping={isSandboxTyping}
                scrollRef={scrollRef}
                isAtBottom={isAtBottom}
                setIsAtBottom={setIsAtBottom}
                onFeedback={async (msgId: any, rating: string) => {
                    const token = localStorage.getItem('access_token');
                    if (!token) return;
                    try {
                        await fetch(`${API_BASE}/agents/${agent.id}/feedback/`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message_id: msgId, rating })
                        });
                        setSandboxMessages((prev: any[]) => prev.map((m, i) => i === msgId ? { ...m, feedback: rating } : m));
                    } catch (e) { }
                }}
            />
        </div>
    );
}

function SandboxModal({ isOpen, onClose, agent, messages, input, setInput, onSend, isTyping, scrollRef, onFeedback, isAtBottom, setIsAtBottom }: any) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-end p-4 lg:p-8">
            <div className="w-full max-w-2xl h-[90vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-12 duration-500">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-900 rounded-xl text-white">
                            <Terminal className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Sandbox Test — {agent.name}</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Environnement de simulation Isolé</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30"
                    onScroll={(e) => {
                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                        setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100);
                    }}
                >
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-12">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                                <MessageSquare className="w-8 h-8 text-blue-100" />
                            </div>
                            <h4 className="font-bold text-gray-900">Début de la simulation</h4>
                            <p className="text-sm text-gray-400">Envoyez un message pour tester comment l'agent réagit avec ses instructions actuelles sans affecter l'historique réel.</p>
                        </div>
                    )}

                    {messages.map((msg: any, i: number) => (
                        <div
                            key={i}
                            className={cn(
                                "flex gap-4 max-w-[85%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 font-bold text-[10px]",
                                msg.role === 'user' ? "bg-gray-900" : "bg-blue-900"
                            )}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : agent.name.charAt(0)}
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className={cn(
                                    "p-4 rounded-2xl text-sm leading-relaxed shadow-sm group relative",
                                    msg.role === 'user' ? "bg-gray-900 text-white rounded-tr-none" : "bg-white border border-gray-100 text-gray-700 rounded-tl-none"
                                )}>
                                    {msg.content}
                                    {msg.role !== 'user' && !msg.feedback && (
                                        <div className="absolute top-1/2 -translate-y-1/2 -right-12 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onFeedback(i, 'good')} className="p-1 hover:text-emerald-500 text-gray-300 transition-colors"><ThumbsUp className="w-3 h-3" /></button>
                                            <button onClick={() => onFeedback(i, 'bad')} className="p-1 hover:text-red-500 text-gray-300 transition-colors"><ThumbsDown className="w-3 h-3" /></button>
                                        </div>
                                    )}
                                    {msg.feedback && (
                                        <div className="absolute top-1/2 -translate-y-1/2 -right-10">
                                            <span className={cn("text-[8px] font-black uppercase", msg.feedback === 'good' ? "text-emerald-500" : "text-red-400")}>
                                                {msg.feedback === 'good' ? 'Utile' : 'Inutile'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex gap-4 mr-auto">
                            <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center text-white shrink-0">
                                <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                            <div className="p-4 bg-white border border-gray-100 rounded-2xl rounded-tl-none shadow-sm">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-gray-200 rounded-full animate-bounce" />
                                    <span className="w-1.5 h-1.5 bg-gray-200 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <span className="w-1.5 h-1.5 bg-gray-200 rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white border-t border-gray-100">
                    <div className="relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onSend()}
                            placeholder="Simuler un message client..."
                            className="w-full pl-6 pr-16 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-800/5 focus:bg-white transition-all font-medium"
                        />
                        <button
                            onClick={onSend}
                            disabled={!input.trim() || isTyping}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-900 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
