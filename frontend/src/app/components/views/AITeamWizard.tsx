import { API_BASE } from "../../../lib/api";
import { useState, useRef, useEffect } from "react";
import { Sparkles, ArrowRight, Send, Loader2, X, CheckCircle2, Bot } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { useAgents } from "../../hooks/useAgents";

interface Message {
    role: "user" | "ai";
    content: string;
    options?: string[];
    allow_multiple?: boolean;
}

interface AgentDef { name: string; role: string; system_prompt: string; }
interface LinkDef { from: number; to: number; trigger: string; description: string; }
interface TeamPlan {
    name: string;
    description: string;
    color: string;
    agents: AgentDef[];
    links: LinkDef[];
}

interface Props {
    onClose: () => void;
}

const TRIGGER_LABELS: Record<string, string> = {
    interest: "Intérêt détecté",
    email_requested: "Demande d'email",
    whatsapp_requested: "Demande WhatsApp",
    manual: "Passage manuel",
};

async function callDesignTeam(history: Message[], message: string): Promise<{ reply: string; options: string[]; ready: boolean; plan: TeamPlan | null }> {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/agent-teams/design_team/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ history, message }),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erreur réseau");
    }
    return res.json();
}

async function deployTeamPlan(plan: TeamPlan): Promise<any> {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/agent-teams/deploy_plan/`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error("Deployment failed");
    return res.json();
}

export function AITeamWizard({ onClose }: Props) {
    const { fetchAgents } = useAgents();
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "ai",
            content: "👋 Bonjour ! Je suis MAGIA AI. Décrivez-moi en quelques mots l'équipe que vous souhaitez créer : secteur d'activité, objectif, canaux utilisés... Je vais vous guider étape par étape pour concevoir la structure idéale."
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<TeamPlan | null>(null);
    const [creating, setCreating] = useState(false);
    const [done, setDone] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, loading]);

    const sendMessage = async (overriddenMessage?: string) => {
        const text = overriddenMessage || input.trim();
        if (!text && selectedOptions.length === 0) return;
        if (loading) return;

        const finalMessage = overriddenMessage || (selectedOptions.length > 0 ? selectedOptions.join(", ") : input.trim());
        
        const newHistory = [...messages, { role: "user" as const, content: finalMessage }];
        setMessages(newHistory);
        setInput("");
        setSelectedOptions([]);
        setLoading(true);

        try {
            const data = await callDesignTeam(newHistory, finalMessage);
            setMessages([...newHistory, { 
                role: "ai", 
                content: data.reply, 
                options: data.options,
                allow_multiple: (data as any).allow_multiple 
            }]);
            if (data.ready && data.plan) {
                setPlan(data.plan);
            }
        } catch (e: any) {
            setMessages([...newHistory, { role: "ai", content: `❌ Erreur AI : ${e.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    const toggleOption = (opt: string) => {
        setSelectedOptions(prev => 
            prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
        );
    };

    const handleConfirm = async () => {
        if (!plan) return;
        setCreating(true);
        try {
            await deployTeamPlan(plan);
            fetchAgents();
            setDone(true);
        } catch (e) {
            setMessages(prev => [...prev, { role: "ai", content: "❌ Erreur lors du déploiement. Réessayez." }]);
        } finally {
            setCreating(false);
        }
    };

    if (done) {
        return (
            <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-none shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Équipe Déployée !</h2>
                    <p className="text-gray-500 mb-8">Votre équipe d'agents est maintenant opérationnelle et prête à travailler.</p>
                    <Button onClick={onClose} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold">
                        Accéder au tableau de bord
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-[200] flex items-center justify-center p-0 md:p-4 transition-all">
            <div className="bg-white w-full h-full md:h-auto md:max-w-2xl md:rounded-none shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" style={{ height: "min(100vh, 680px)" }}>
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-none flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Magia Team Architect</h2>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Conception d'équipe par IA</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Chat Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 min-h-0">
                    {messages.map((m, i) => (
                        <div key={i} className={cn("flex flex-col max-w-[85%]", m.role === "user" ? "ml-auto items-end" : "items-start")}>
                            <div className={cn(
                                "px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm",
                                m.role === "user" 
                                    ? "bg-primary text-white rounded-tr-none font-medium" 
                                    : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                            )}>
                                {m.content}
                            </div>
                            {m.options && m.options.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {m.options.map((opt, idx) => {
                                        const isSelected = selectedOptions.includes(opt);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => m.allow_multiple ? toggleOption(opt) : sendMessage(opt)}
                                                disabled={loading}
                                                className={cn(
                                                    "px-4 py-2 border rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50",
                                                    isSelected 
                                                        ? "bg-blue-950 text-white border-blue-950" 
                                                        : "bg-white border-gray-200 hover:border-blue-900 hover:text-blue-900 text-gray-600"
                                                )}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                    {m.allow_multiple && selectedOptions.length > 0 && (
                                        <button 
                                            onClick={() => sendMessage()}
                                            className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 animate-in fade-in zoom-in-95"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Valider la sélection
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {loading && (
                        <div className="flex items-center gap-2 text-primary font-bold animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-[10px] uppercase tracking-widest">Analyse en cours...</span>
                        </div>
                    )}

                    {/* Team Plan Card */}
                    {plan && (
                        <div className="mt-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white border-2 border-primary/20 rounded-none overflow-hidden shadow-xl">
                                <div className="p-1 px-4 text-center" style={{ backgroundColor: plan.color }}>
                                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Structure Proposée</span>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-none flex items-center justify-center text-white" style={{ backgroundColor: plan.color }}>
                                            <Bot className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900">{plan.name}</h3>
                                            <p className="text-sm text-gray-500">{plan.description}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membres de l'équipe ({plan.agents.length})</p>
                                        <div className="grid grid-cols-1 gap-3">
                                            {plan.agents.map((a, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-none border border-gray-100">
                                                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-none flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-900">{a.name}</h4>
                                                        <p className="text-[10px] text-gray-500 line-clamp-1 italic">{a.role}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Flux de travail</p>
                                        <div className="space-y-2">
                                            {plan.links.map((l, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                                                    <span className="font-bold text-primary">{plan.agents[l.from].name}</span>
                                                    <ArrowRight className="w-3 h-3 text-gray-300" />
                                                    <span className="font-bold text-primary">{plan.agents[l.to].name}</span>
                                                    <span className="ml-auto px-2 py-0.5 bg-gray-100 rounded-full text-[9px] font-black uppercase text-gray-400">
                                                        {TRIGGER_LABELS[l.trigger] || l.trigger}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Button 
                                        onClick={handleConfirm}
                                        disabled={creating}
                                        className="w-full mt-8 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                        Déployer l'équipe maintenant
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                {!plan && (
                    <div className="p-6 bg-white border-t border-gray-100 flex-shrink-0">
                        <div className="flex items-center gap-3 bg-gray-50 rounded-none px-5 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 border-2 border-transparent focus-within:border-primary/10 transition-all group">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder="Dites-moi tout..."
                                className="flex-grow bg-transparent border-none outline-none text-sm font-medium text-gray-900 py-2 resize-none max-h-32 scrollbar-hide"
                                rows={1}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || loading}
                                className="w-10 h-10 bg-primary hover:bg-primary/95 text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-all active:scale-90 shrink-0 disabled:bg-gray-200 disabled:shadow-none"
                            >
                                <Send className="w-5 h-5 -rotate-45" />
                            </button>
                        </div>
                        <p className="mt-3 text-[10px] text-center text-gray-300 font-bold uppercase tracking-widest">
                            Shift + Entrée pour un saut de ligne
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
