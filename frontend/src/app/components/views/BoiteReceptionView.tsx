import { useState, useEffect, useRef } from "react";
import { cn } from "../ui/utils";
import { Search, Send, ChevronRight, Bot, Mail, MessageSquare, ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";
import { SatisfactionSurvey } from "../SatisfactionSurvey";

interface BoiteReceptionViewProps {
    setViewingAgent: (agent: any) => void;
    globalSearchQuery?: string;
}

export function BoiteReceptionView({ setViewingAgent, globalSearchQuery = "" }: BoiteReceptionViewProps) {
    const [agents, setAgents] = useState<any[]>([]);
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedThread, setSelectedThread] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [activeTab, setActiveTab] = useState<'agents' | 'whatsapp' | 'email'>('agents');
    const [searchQuery, setSearchQuery] = useState(globalSearchQuery);
    const [showSurvey, setShowSurvey] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setSearchQuery(globalSearchQuery); }, [globalSearchQuery]);

    useEffect(() => {
        fetchAgents();
        fetchConversations();
        const interval = setInterval(() => {
            fetchConversations();
            if (activeTab === 'agents') fetchAgents();
        }, 5000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const fetchAgents = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch('http://localhost:8000/api/agents/', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setAgents(await res.json());
        } catch (e) { }
    };

    const fetchConversations = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch('http://localhost:8000/api/agents/all_conversations/', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setConversations(await res.json());
        } catch (e) { }
    };

    useEffect(() => {
        if (selectedThread) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 3000);
            return () => clearInterval(interval);
        }
    }, [selectedThread]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100);
    };

    useEffect(() => {
        if (isAtBottom) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const fetchMessages = async () => {
        if (!selectedThread) return;
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            let url = '';
            if (selectedThread.type === 'agent') {
                url = `http://localhost:8000/api/agents/${selectedThread.id}/messages/`;
            } else {
                url = `http://localhost:8000/api/agents/contact_messages/?contact=${encodeURIComponent(selectedThread.contact)}&source=${encodeURIComponent(selectedThread.source)}`;
            }
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setMessages(await res.json());
        } catch (e) { }
    };

    const handleFeedback = async (messageId: number, rating: 'good' | 'bad') => {
        const token = localStorage.getItem('access_token');
        if (!token || !selectedThread) return;
        try {
            const agentId = selectedThread.type === 'agent' ? selectedThread.id : selectedThread.agent?.id;
            if (!agentId) return;
            await fetch(`http://localhost:8000/api/agents/${agentId}/feedback/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message_id: messageId, rating })
            });
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: rating } : m));
        } catch (e) { }
    };

    const handleSurveySubmit = async (score: number, comment: string) => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            await fetch('http://localhost:8000/api/auth/survey/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ nps_score: score, feedback: comment })
            });
        } catch (e) { }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedThread) return;
        const text = newMessage;
        setNewMessage("");
        setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', content: text, created_at: new Date().toISOString() }]);
        try {
            let res;
            if (selectedThread.type === 'agent') {
                res = await fetch(`http://localhost:8000/api/agents/${selectedThread.id}/send_manual_reply/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: text, source: 'chat', contact_info: 'Manual' })
                });
            } else {
                const agentId = selectedThread.agent?.id;
                if (!agentId) return;
                res = await fetch(`http://localhost:8000/api/agents/${agentId}/send_manual_reply/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: text, source: selectedThread.source, contact_info: selectedThread.contact })
                });
            }
            if (res?.ok) {
                const data = await res.json();
                if (data.reply) {
                    setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', content: data.reply, created_at: new Date().toISOString() }]);
                }
            }
            fetchMessages();
        } catch (e) { }
    };

    let displayList: any[] = [];
    if (activeTab === 'agents') {
        displayList = agents
            .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(a => ({ ...a, type: 'agent' }));
    } else {
        displayList = conversations
            .filter(c => c.source === activeTab)
            .filter(c => !searchQuery || c.contact.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(c => ({ ...c, type: 'contact' }));
    }

    const tabStyle = (tab: string, color: string) =>
        cn("px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all",
            activeTab === tab ? `${color} text-white` : 'text-gray-500 hover:bg-gray-100');

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] animate-in fade-in duration-300">
            {/* Top tabs */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h1 className="magia-h1 uppercase">Boîte de Réception</h1>
                <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 gap-1">
                    <button onClick={() => { setActiveTab('agents'); setSelectedThread(null); }} className={tabStyle('agents', 'bg-primary')}>
                        <Bot className="w-4 h-4" /> Agents
                    </button>
                    <button onClick={() => { setActiveTab('whatsapp'); setSelectedThread(null); }} className={tabStyle('whatsapp', 'bg-[#25D366]')}>
                        <MessageSquare className="w-4 h-4" /> WhatsApp
                    </button>
                    <button onClick={() => { setActiveTab('email'); setSelectedThread(null); }} className={tabStyle('email', 'bg-blue-500')}>
                        <Mail className="w-4 h-4" /> Email
                    </button>
                </div>
            </div>

            <div className="flex-grow bg-white border border-gray-100 rounded-none shadow-xl overflow-hidden flex min-h-0">
                <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-none text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {displayList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Aucune discussion</p>
                            </div>
                        ) : displayList.map((item, idx) => {
                            const isSelected = selectedThread && (
                                item.type === 'agent' ? selectedThread.id === item.id : selectedThread.contact === item.contact && selectedThread.source === item.source
                            );
                            return (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedThread(item)}
                                    className={cn(
                                        "p-4 flex items-center gap-3 cursor-pointer transition-all border-l-4",
                                        isSelected ? "bg-gray-50 border-primary" : "border-transparent hover:bg-gray-50/80"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-none flex items-center justify-center font-bold text-sm text-white overflow-hidden shrink-0",
                                        item.type === 'agent' ? 'bg-primary' : (item.source === 'whatsapp' ? 'bg-[#25D366]' : 'bg-blue-500')
                                    )}>
                                        {item.type === 'agent'
                                            ? (item.avatar ? <img src={item.avatar} className="w-full h-full object-cover" /> : item.name.charAt(0))
                                            : item.contact.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <h4 className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
                                            {item.type === 'agent' ? item.name : item.contact}
                                            {item.type === 'agent' && item.is_team_agent && (
                                                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded text-[8px] font-black uppercase tracking-tighter border border-blue-100">
                                                    Équipe
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                            {item.type === 'agent'
                                                ? (item.channels?.join(', ') || 'Agent IA')
                                                : (item.lastMsg?.content?.substring(0, 40) || 'Aucun message récent')}
                                        </p>
                                    </div>
                                    {isSelected && <ChevronRight className="w-3 h-3 text-primary shrink-0" />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right — chat panel */}
                <div className="flex-grow flex flex-col min-w-0 bg-[#f8fbff]/30">
                    {!selectedThread ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-12">
                            <div className="w-16 h-16 rounded-none bg-gray-100 flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">Sélectionnez une discussion</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat header */}
                            <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center gap-4 flex-shrink-0">
                                <div className={cn(
                                    "w-10 h-10 rounded-none flex items-center justify-center text-white font-bold shadow-lg overflow-hidden",
                                    selectedThread.type === 'agent' ? 'bg-primary shadow-primary/20' : (selectedThread.source === 'whatsapp' ? 'bg-[#25D366]' : 'bg-blue-500')
                                )}>
                                    {selectedThread.type === 'agent'
                                        ? (selectedThread.avatar ? <img src={selectedThread.avatar} className="w-full h-full object-cover" /> : selectedThread.name.charAt(0))
                                        : selectedThread.contact.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">
                                        {selectedThread.type === 'agent' ? selectedThread.name : selectedThread.contact}
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                                            {selectedThread.type === 'agent' ? 'Agent IA' : selectedThread.source}
                                        </span>
                                    </div>
                                </div>

                            </div>

                            {/* Messages */}
                            <div
                                className="flex-grow overflow-y-auto p-6 space-y-4"
                                onScroll={handleScroll}
                                ref={scrollContainerRef}
                            >
                                {messages.length === 0 && (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Aucun message</p>
                                    </div>
                                )}
                                {messages.map((m, idx) => {
                                    const isMe = m.sender === 'ai' || m.sender === 'bot' || (selectedThread.type === 'agent' && m.sender === selectedThread.name);
                                    return (
                                        <div key={idx} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                                            <div className={cn(
                                                "px-4 py-3 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm whitespace-pre-wrap break-words",
                                                isMe ? "bg-primary text-white rounded-tr-none" : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                                            )}>
                                                {m.content}
                                            </div>
                                            <span className="text-[9px] font-black text-gray-300 uppercase mt-1 px-1 flex items-center gap-2">
                                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isMe && !m.feedback && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleFeedback(m.id, 'good')} className="p-1 hover:text-emerald-500"><ThumbsUp className="w-3 h-3" /></button>
                                                        <button onClick={() => handleFeedback(m.id, 'bad')} className="p-1 hover:text-red-500"><ThumbsDown className="w-3 h-3" /></button>
                                                    </div>
                                                )}
                                                {m.feedback && (
                                                    <span className={cn("text-[8px] font-bold", m.feedback === 'good' ? "text-emerald-500" : "text-red-400")}>
                                                        {m.feedback === 'good' ? 'Utile' : 'Pas utile'}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
                                <div className="flex items-center gap-3 bg-gray-50 rounded-none px-4 py-2 focus-within:ring-2 focus-within:ring-primary/20 border border-transparent focus-within:border-primary/10 transition-all">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Écrivez votre message..."
                                        className="flex-grow bg-transparent border-none outline-none text-xs font-medium text-gray-900 py-2"
                                    />
                                    <button
                                        onClick={handleSend}
                                        className="w-9 h-9 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-all active:scale-90 shrink-0"
                                    >
                                        <Send className="w-4 h-4 -rotate-45" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <SatisfactionSurvey
                isOpen={showSurvey}
                onClose={() => setShowSurvey(false)}
                onSubmit={handleSurveySubmit}
            />
        </div>
    );
}
