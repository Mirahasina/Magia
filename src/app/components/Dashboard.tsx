import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AgentCard } from "./AgentCard";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";

import { Agent } from "./dashboard/types";
import { NewAgentFlow } from "./dashboard/NewAgentFlow";
import { AgentDetailView } from "./dashboard/AgentDetailView";
import { PlaceholderView } from "./dashboard/PlaceholderView";

import { OverviewView } from "./views/OverviewView";
import { AgentsView } from "./views/AgentsView";
import { InboxView } from "./views/InboxView";
import { MembersView } from "./views/MembersView";
import { AuditLogsView } from "./views/AuditLogsView";
import { SettingsView } from "./views/SettingsView";
import { BillingView } from "./views/BillingView";

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
        avatarColor: "bg-yellow-400",
        avatar: "/avatars/avatar_1.png"
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
        avatarColor: "bg-orange-500",
        avatar: "/avatars/avatar_2.png"
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
        avatarColor: "bg-red-500",
        avatar: "/avatars/avatar_3.png"
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
                return <OverviewView setIsCreatingAgent={setIsCreatingAgent} />;
            case "Agents":
                return <AgentsView 
                    agents={agents} 
                    viewMode={viewMode} 
                    setViewMode={setViewMode} 
                    setIsCreatingAgent={setIsCreatingAgent} 
                    setViewingAgent={setViewingAgent} 
                />;
            case "Boîte de réception":
                return <InboxView agents={agents} setViewingAgent={setViewingAgent} />;
            case "Membres":
                return <MembersView />;
            case "Journaux d'audit":
                return <AuditLogsView />;
            case "Paramètres":
                return <SettingsView />;
            case "Facturation":
                return <BillingView />;
            default:
                return <PlaceholderView title={activeTab} />;
        }
    };

    return (
        <div className="flex min-h-screen bg-violet-50/50 relative overflow-hidden p-4 lg:p-8">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] left-[30%] w-[500px] h-[500px] bg-violet-200/20 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[50%] right-[10%] w-[400px] h-[400px] bg-indigo-200/15 rounded-full blur-[100px] animate-float-reverse" />
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
                    <Topbar onLogout={onLogout} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

                    <main className="p-8 flex-1 overflow-x-hidden overflow-y-auto">
                        {renderContent()}
                    </main>
                </div>
            </div>
        </div>
    );
}
