import { useState, useEffect, useRef } from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Search, MoreVertical, Send, Phone, Video, Info, User, ChevronLeft } from "lucide-react";

interface BoiteReceptionViewProps {
    agents: any[];
    setViewingAgent: (agent: any) => void;
}

export function BoiteReceptionView({ agents }: BoiteReceptionViewProps) {
    const [selectedAgent, setSelectedAgent] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (selectedAgent) {
            setMessages([]);
            fetchMessages();
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedAgent]);

    useEffect(scrollToBottom, [messages]);

    const fetchMessages = async () => {
        if (!selectedAgent) return;
        try {
            const res = await fetch(`http://localhost:8000/api/agents/${selectedAgent.id}/messages/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (e) { }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedAgent) return;
        const text = newMessage;
        setNewMessage("");

        // Optimistic UI update
        const tempMsg = { id: Date.now(), sender: 'ai', content: text, created_at: new Date().toISOString(), status: 'new' };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await fetch(`http://localhost:8000/api/agents/${selectedAgent.id}/send_manual_reply/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: text,
                    source: 'chat',
                    contact_info: 'Manual Intercept'
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.reply) {
                    setMessages(prev => [...prev, {
                        id: Date.now() + 1,
                        sender: 'ai',
                        content: data.reply,
                        created_at: new Date().toISOString()
                    }]);
                }
            }
            fetchMessages();
        } catch (e) { }
    };

    if (!selectedAgent) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h1 className="magia-h1 uppercase">Boîte de Réception</h1>
                        <p className="magia-subtitle italic text-[10px]">Interceptez les communications de vos unités IA.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            onClick={() => setSelectedAgent(agent)}
                            className="p-6 bg-white border border-gray-100 rounded-2xl hover:border-primary/20 transition-all cursor-pointer shadow-sm group relative overflow-hidden flex flex-col h-full"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xl overflow-hidden shrink-0 shadow-lg shadow-primary/10">
                                    {agent.avatar ? <img src={agent.avatar} className="w-full h-full object-cover" /> : agent.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 leading-tight uppercase text-sm tracking-tight">{agent.name}</h3>
                                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">{agent.role}</div>
                                </div>
                            </div>

                            <div className="flex-grow space-y-3 mb-6">
                                <p className="text-[11px] text-gray-500 line-clamp-2 italic">"{agent.system_prompt.substring(0, 100)}..."</p>
                                <div className="flex gap-2">
                                    {agent.channels?.map((c: string) => (
                                        <span key={c} className="px-2 py-0.5 bg-gray-50 text-[8px] font-black uppercase tracking-tighter rounded border border-gray-100">{c}</span>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent); }}
                                className="w-full py-3 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                INTERCEPTER CANAL
                            </button>
                        </div>
                    ))}
                    {agents.length === 0 && (
                        <div className="col-span-full py-32 text-center border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Aucune discussion active</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-180px)] bg-white border border-gray-100 rounded-3xl shadow-xl overflow-hidden flex animate-in zoom-in-95 duration-300">
            {/* Sidebar with Contacts/Agents */}
            <div className="w-80 border-r border-gray-50 bg-gray-50/30 flex flex-col hidden md:flex">
                <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
                    <h2 className="text-sm font-black uppercase tracking-widest mb-4">Discussions</h2>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-100/50 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {agents.map(a => (
                        <div
                            key={a.id}
                            onClick={() => setSelectedAgent(a)}
                            className={cn(
                                "p-4 flex items-center gap-3 cursor-pointer transition-all border-l-4",
                                selectedAgent.id === a.id ? "bg-white border-primary shadow-sm" : "border-transparent hover:bg-gray-100/50"
                            )}
                        >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                {a.name.charAt(0)}
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-baseline">
                                    <h4 className="text-[11px] font-bold text-gray-900 truncate">{a.name}</h4>
                                    <span className="text-[8px] text-gray-400">12:45</span>
                                </div>
                                <p className="text-[10px] text-gray-500 truncate italic">Actif sur {a.channels[0] || 'Web'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-grow flex flex-col bg-white">
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedAgent(null)} className="md:hidden p-2 hover:bg-gray-50 rounded-lg">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/10">
                            {selectedAgent.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">{selectedAgent.name}</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Canal Intercepté</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="rounded-xl text-gray-400 hover:text-primary hover:bg-primary/5"><Phone className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="rounded-xl text-gray-400 hover:text-primary hover:bg-primary/5"><Video className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="rounded-xl text-gray-400 hover:text-primary hover:bg-primary/5 active:rotate-90 transition-transform"><MoreVertical className="w-4 h-4" /></Button>
                    </div>
                </div>

                {/* Messages viewport */}
                <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-[#f8fbff]/50">
                    <div className="flex flex-col items-center mb-8">
                        <div className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px] font-black uppercase text-gray-400 tracking-widest shadow-sm">Aujourd'hui</div>
                    </div>

                    {messages.map((m, idx) => {
                        const isMe = m.sender === 'ai' || m.sender === selectedAgent.name;
                        return (
                            <div key={idx} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                                <div className={cn(
                                    "px-5 py-3 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm",
                                    isMe
                                        ? "bg-primary text-white rounded-tr-none"
                                        : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                                )}>
                                    {m.content}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 px-1">
                                    <span className="text-[9px] font-black text-gray-300 uppercase">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isMe && <span className="text-[9px] text-primary/50 font-black tracking-widest">VU</span>}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>

                {/* Input area */}
                <div className="p-6 bg-white border-t border-gray-50">
                    <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all group border border-transparent focus-within:border-primary/10">
                        <Button variant="ghost" size="icon" className="rounded-xl text-gray-400 hover:bg-white active:scale-95">+</Button>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Écrivez votre message..."
                            className="flex-grow bg-transparent border-none outline-none text-xs font-medium text-gray-900 px-2"
                        />
                        <button
                            onClick={handleSend}
                            className="w-10 h-10 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-all active:scale-90"
                        >
                            <Send className="w-4 h-4 -rotate-45" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
