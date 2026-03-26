import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AgentCard } from "./AgentCard";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";

import { NewAgentFlow } from "./dashboard/NewAgentFlow";
import { AgentDetailView } from "./dashboard/AgentDetailView";
import { PlaceholderView } from "./dashboard/PlaceholderView";

import { SyntheseView } from "./views/SyntheseView";
import { AgentsView } from "./views/AgentsView";
import { BoiteReceptionView } from "./views/BoiteReceptionView";
import { MembresView } from "./views/MembresView";
import { JournauxAuditView } from "./views/JournauxAuditView";
import { ParametresView } from "./views/ParametresView";
import { FacturationView } from "./views/FacturationView";
import { useAgents } from "../hooks/useAgents";

export function Dashboard({
    onLogout,
    refreshKey = 0,
    onUpgrade,
    onUpdateCard
}: {
    onLogout?: () => void,
    refreshKey?: number,
    onUpgrade?: (details: any) => void,
    onUpdateCard?: () => void
}) {
    const { agents, fetchAgents } = useAgents();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState(localStorage.getItem("active_tab") || "Tableau de bord");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [viewingAgent, setViewingAgent] = useState<any>(null);

    useEffect(() => {
        localStorage.setItem("active_tab", activeTab);
        // Reset sub-views when changing main tabs
        setIsCreatingAgent(false);
        setViewingAgent(null);
    }, [activeTab]);

    const fetchProfile = async () => {
        try {
            const res = await fetch("http://localhost:8000/api/auth/me/", {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            }
        } catch (err) {
            console.error("Failed to fetch profile", err);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const renderContent = () => {
        if (isCreatingAgent) {
            return <NewAgentFlow
                onComplete={() => {
                    setIsCreatingAgent(false);
                    fetchAgents();
                }}
                onCancel={() => setIsCreatingAgent(false)}
            />;
        }

        if (viewingAgent) {
            return <AgentDetailView agent={viewingAgent} onBack={() => setViewingAgent(null)} />;
        }

        switch (activeTab) {
            case "Tableau de bord":
                return <SyntheseView setIsCreatingAgent={setIsCreatingAgent} />;
            case "Agents":
                return <AgentsView
                    agents={agents}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    setIsCreatingAgent={setIsCreatingAgent}
                    setViewingAgent={setViewingAgent}
                />;
            case "Boîte de réception":
                return <BoiteReceptionView agents={agents} setViewingAgent={setViewingAgent} />;
            case "Membres":
                return <MembresView />;
            case "Journaux d'audit":
                return <JournauxAuditView />;
            case "Paramètres":
                return <ParametresView onProfileUpdate={fetchProfile} onLogout={onLogout || (() => {})} />;
            case "Facturation":
                return <FacturationView refreshKey={refreshKey} onUpgrade={onUpgrade} onUpdateCard={onUpdateCard} />;
            default:
                return <PlaceholderView title={activeTab} />;
        }
    };

    return (
        <div className="flex min-h-screen bg-blue-50/50 relative overflow-hidden p-4 lg:p-8">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] left-[30%] w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[50%] right-[10%] w-[400px] h-[400px] bg-blue-200/15 rounded-full blur-[100px] animate-float-reverse" />
            </div>

            <div className="flex-1 flex w-full bg-white rounded-r-[2rem] shadow-2xl relative z-10 overflow-hidden border border-gray-100">
                <Sidebar
                    activeTab={activeTab}
                    onNavigate={setActiveTab}
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    onClose={() => setIsSidebarOpen(false)}
                />
                <div className={cn(
                    "flex-1 flex flex-col min-h-full transition-all duration-300 relative z-10",
                    isSidebarOpen ? "lg:ml-64" : "ml-0 lg:ml-20"
                )}>
                    <Topbar user={user} onLogout={onLogout} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

                    <main className="p-8 flex-1 overflow-x-hidden overflow-y-auto">
                        {renderContent()}
                    </main>
                </div>
            </div>
        </div>
    );
}
