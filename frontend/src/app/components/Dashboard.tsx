import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { BackOfficeSidebar } from "./BackOfficeSidebar";
import { Topbar } from "./Topbar";
import { cn } from "./ui/utils";

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
import { EquipeView } from "./views/EquipeView";
import { BackOfficeView } from "./views/BackOfficeView";
import { ProspectionView } from "./views/ProspectionView";
import { useAgents } from "../hooks/useAgents";
import { API_BASE, getAuthHeadersOnly } from "../../lib/api";
import { StorageKeys } from "../../lib/storage";
import type { Agent } from "../context/AgentsContext";

const noop = () => {};

type ActiveTab =
  | "Tableau de bord"
  | "Agents"
  | "Boîte de réception"
  | "Membres"
  | "Journaux d'audit"
  | "Paramètres"
  | "Facturation"
  | "Équipe"
  | "Prospection (CRM)";

interface DashboardProps {
  onLogout?: () => void;
  refreshKey?: number;
  onUpgrade?: (details: { numAgents: number; isAnnual: boolean; totalPrice: number }) => void;
  onUpdateCard?: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  subscription?: {
    plan_name: string;
    num_agents: number;
    is_annual: boolean;
    status: string;
    active_until: string;
  };
  [key: string]: unknown;
}

export function Dashboard({ onLogout, refreshKey = 0, onUpgrade, onUpdateCard }: DashboardProps) {
  const { agents, fetchAgents } = useAgents();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    (localStorage.getItem(StorageKeys.ACTIVE_TAB) as ActiveTab) || "Tableau de bord"
  );
  const [isBackOfficeMode, setIsBackOfficeMode] = useState(
    localStorage.getItem(StorageKeys.BACKOFFICE_MODE) === "true"
  );
  const [backOfficeTab, setBackOfficeTab] = useState(
    localStorage.getItem(StorageKeys.BACKOFFICE_TAB) || "Tableau de bord"
  );

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  useEffect(() => {
    if (window.innerWidth >= 1024) setIsSidebarOpen(true);
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isBackOfficeMode) {
      localStorage.setItem(StorageKeys.ACTIVE_TAB, activeTab);
    } else {
      localStorage.setItem(StorageKeys.BACKOFFICE_TAB, backOfficeTab);
    }
    setIsCreatingAgent(false);
    setViewingAgent(null);
  }, [activeTab, backOfficeTab, isBackOfficeMode]);

  useEffect(() => {
    localStorage.setItem(StorageKeys.BACKOFFICE_MODE, String(isBackOfficeMode));
  }, [isBackOfficeMode]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me/`, { headers: getAuthHeadersOnly() });
      if (res.ok) {
        const data: UserProfile = await res.json();
        setUser(data);
        setIsBackOfficeMode(data.is_staff);
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const renderContent = () => {
    if (isBackOfficeMode) {
      return <BackOfficeView activeTab={backOfficeTab as any} />;
    }

    if (isCreatingAgent) {
      return (
        <NewAgentFlow
          user={user}
          onComplete={() => { setIsCreatingAgent(false); fetchAgents(); }}
          onCancel={() => setIsCreatingAgent(false)}
        />
      );
    }

    if (viewingAgent) {
      const currentAgent = agents.find((a) => a.id === viewingAgent.id) || viewingAgent;
      return (
        <AgentDetailView
          user={user}
          agent={currentAgent}
          onBack={() => setViewingAgent(null)}
          onRefresh={fetchAgents}
          onNavigateToInbox={() => {
            setViewingAgent(null);
            setActiveTab("Boîte de réception");
          }}
        />
      );
    }

    switch (activeTab) {
      case "Tableau de bord":
        return <SyntheseView setIsCreatingAgent={setIsCreatingAgent} />;
      case "Agents":
        return (
          <AgentsView
            agents={agents}
            user={user}
            viewMode={viewMode}
            setViewMode={setViewMode}
            setIsCreatingAgent={setIsCreatingAgent}
            setViewingAgent={setViewingAgent}
            globalSearchQuery={globalSearchQuery}
          />
        );
      case "Boîte de réception":
        return (
          <BoiteReceptionView
            setViewingAgent={setViewingAgent}
            globalSearchQuery={globalSearchQuery}
          />
        );
      case "Membres":
        return <MembresView />;
      case "Prospection (CRM)":
        return <ProspectionView />;
      case "Journaux d'audit":
        return <JournauxAuditView />;
      case "Paramètres":
        return <ParametresView onProfileUpdate={fetchProfile} onLogout={onLogout || noop} />;
      case "Facturation":
        return <FacturationView refreshKey={refreshKey} onUpgrade={onUpgrade} onUpdateCard={onUpdateCard} />;
      case "Équipe":
        return <EquipeView />;
      default:
        return <PlaceholderView title={activeTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-blue-50/50 relative overflow-hidden p-4 lg:p-8">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className={cn(
            "absolute top-[10%] left-[30%] w-[500px] h-[500px] rounded-full blur-[120px] animate-float",
            isBackOfficeMode ? "bg-slate-300/20" : "bg-blue-200/20"
          )}
        />
        <div
          className={cn(
            "absolute top-[50%] right-[10%] w-[400px] h-[400px] rounded-full blur-[100px] animate-float-reverse",
            isBackOfficeMode ? "bg-emerald-200/10" : "bg-blue-200/15"
          )}
        />
      </div>

      <div className="flex-1 flex w-full bg-white rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-gray-100">
        {isBackOfficeMode ? (
          <BackOfficeSidebar
            activeTab={backOfficeTab}
            onNavigate={setBackOfficeTab}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setIsSidebarOpen(false)}
            onLogout={onLogout || noop}
          />
        ) : (
          <Sidebar
            activeTab={activeTab}
            onNavigate={(tab) => {
              if (tab === "Back-office") {
                setIsBackOfficeMode(true);
                setBackOfficeTab("Tableau de bord");
              } else {
                setActiveTab(tab as ActiveTab);
              }
            }}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setIsSidebarOpen(false)}
            inboxBadge={agents.reduce((sum, ag) => sum + (ag.messages?.length || 0), 0)}
            user={user}
            onLogout={onLogout}
          />
        )}

        <div
          className={cn(
            "flex-1 flex flex-col min-h-0 transition-all duration-300 relative z-10",
            isSidebarOpen ? "lg:ml-64" : "ml-0 lg:ml-20"
          )}
        >
          <Topbar
            user={user}
            onLogout={onLogout}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            searchQuery={globalSearchQuery}
            onSearchChange={setGlobalSearchQuery}
            title={isBackOfficeMode ? "Console d'Administration" : undefined}
          />

          <main className="p-8 flex-1 flex flex-col min-h-0 relative z-10 w-full overflow-y-auto">
            <div
              key={isBackOfficeMode ? backOfficeTab : activeTab}
              className="flex-1 flex flex-col min-h-0 animate-page-fade w-full"
            >
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
