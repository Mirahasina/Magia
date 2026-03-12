import { cn } from "../ui/utils";
import { Button } from "../ui/button";

interface InboxViewProps {
    agents: any[];
    setViewingAgent: (agent: any) => void;
}

export function InboxView({ agents, setViewingAgent }: InboxViewProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="magia-h1">Communications</h1>
                    <p className="magia-subtitle">Flux d'interactions en temps réel avec vos unités IA</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                    <div 
                        key={agent.name} 
                        onClick={() => setViewingAgent(agent)} 
                        className="p-5 bg-white border border-gray-100 rounded-lg hover:border-indigo-100 transition-all cursor-pointer shadow-sm group relative overflow-hidden"
                    >
                        {/* Status Ring */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-black text-emerald-600 uppercase">Live</span>
                        </div>

                        <div className="flex items-center gap-4 mb-5">
                            <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-white font-black text-xl italic shadow-lg shrink-0 overflow-hidden", agent.avatarColor)}>
                                {agent.avatar ? (
                                    <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                                ) : (
                                    agent.name.charAt(0)
                                )}
                            </div>
                            <div>
                                <h3 className="font-serif font-bold text-gray-900 leading-tight uppercase tracking-tight">{agent.name}</h3>
                                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{agent.role}</div>
                            </div>
                        </div>
                        
                        <div className="space-y-2 mb-5">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-gray-400 font-medium">Bande passante</span>
                                <span className="text-indigo-600 font-black">78%</span>
                            </div>
                            <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 w-[78%] rounded-full shadow-[0_0_5px_rgba(79,70,229,0.3)]" />
                            </div>
                        </div>

                        <button className="w-full py-2.5 bg-gray-900 text-white hover:bg-indigo-600 rounded-md font-black text-[10px] uppercase tracking-widest transition-all shadow-md">
                            OUVRIR CANAL
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
