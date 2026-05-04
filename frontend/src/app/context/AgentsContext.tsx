import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { API_BASE, getAuthHeaders, getAuthHeadersOnly } from "../../lib/api";

/* ───────────────────── Domain Interfaces ───────────────────── */

export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  role: string;
  system_prompt: string;
  llm_model: string;
  temperature: number;
  channels: string[];
  execution_mode: string;
  confidence_threshold: number;
  is_deployed: boolean;
  is_active: boolean;
  is_team_agent: boolean;
  stats?: { conversations?: number };
  messages?: unknown[];
  whatsapp_config?: number | null;
  email_config?: number | null;
  team?: number | null;
}

export interface AgentTeam {
  id: number;
  name: string;
  description?: string;
  color: string;
  avatar?: string;
  created_at: string;
}

export interface AgentLink {
  id: number;
  source_agent: string;
  target_agent: string;
  trigger_type: string;
  description?: string;
}

export interface WhatsAppConfig {
  id: number;
  name: string;
  is_connected: boolean;
  phone_number?: string;
  qr_code?: string;
  updated_at: string;
}

export interface EmailConfig {
  id: number;
  name: string;
  is_active: boolean;
  email?: string;
  imap_server?: string;
  smtp_server?: string;
  updated_at: string;
}

export interface LinkedInConfig {
  id: number;
  name: string;
  is_connected: boolean;
  api_key?: string;
  updated_at: string;
}


interface AgentsContextType {
  agents: Agent[];
  templates: unknown[];
  whatsappConfigs: WhatsAppConfig[];
  emailConfigs: EmailConfig[];
  linkedinConfigs: LinkedInConfig[];
  messages: unknown[];
  setMessages: React.Dispatch<React.SetStateAction<unknown[]>>;
  isTyping: boolean;
  securitySettings: unknown;
  teams: AgentTeam[];
  links: AgentLink[];
  fetchAgents: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  fetchWhatsAppConfigs: () => Promise<void>;
  fetchEmailConfigs: () => Promise<void>;
  fetchLinkedInConfigs: () => Promise<void>;
  createAgent: (data: Partial<Agent>) => Promise<Agent | null>;
  updateAgent: (agentId: string, payload: Partial<Agent>) => Promise<boolean>;
  deleteAgent: (agentId: string) => Promise<boolean>;
  updateLinkedInConfig: (id: number, payload: Partial<LinkedInConfig>) => Promise<boolean>;
  toggleAgentPause: (agentId: string) => Promise<void>;
  uploadKnowledge: (agentId: string, file: File) => Promise<void>;
  sandboxChat: (agentId: string, message: string) => Promise<string | null>;
  startWhatsAppPairing: (configId: number) => Promise<void>;
  sendChatMessage: (agentId: string, content: string, contactInfo: string, source: string) => Promise<void>;
  deployAgent: (agentId: string) => Promise<boolean>;
  testEmailConnection: (configId: number) => Promise<boolean>;
  getEmailAuthUrl: (configId: number) => Promise<string | null>;
  deleteEmailConfig: (id: number) => Promise<void>;
  deleteWhatsAppConfig: (id: number) => Promise<void>;
  addLinkedInConfig: (data: Record<string, unknown>) => Promise<void>;
  deleteLinkedInConfig: (id: number) => Promise<void>;
  fetchSecuritySettings: () => Promise<void>;
  fetchTeams: () => Promise<void>;
  fetchLinks: () => Promise<void>;
  createTeam: (data: Partial<AgentTeam>) => Promise<AgentTeam | null>;
  deleteTeam: (id: number) => Promise<void>;
  createLink: (data: Partial<AgentLink>) => Promise<AgentLink | null>;
  deleteLink: (id: number) => Promise<void>;
  syncLinkedInMessages: (id: number) => Promise<void>;
  getLinkedInConnectionUrl: (id: number) => Promise<string | null>;
  startLinkedInProspecting: (id: number, query: string, message: string) => Promise<void>;
}


const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<unknown[]>([]);
  const [whatsappConfigs, setWhatsappConfigs] = useState<WhatsAppConfig[]>([]);
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
  const [linkedinConfigs, setLinkedinConfigs] = useState<LinkedInConfig[]>([]);
  const [messages, setMessages] = useState<unknown[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<unknown>(null);
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [links, setLinks] = useState<AgentLink[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Fetch helpers ── */

  const requireToken = (): string | null => localStorage.getItem("access_token");

  const fetchAgents = async () => {
    const token = requireToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/agents/`, { headers: getAuthHeadersOnly() });
      if (res.ok) setAgents(await res.json());
    } catch {
    }
  };

  const fetchTemplates = async () => {
    const token = requireToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/templates/`, { headers: getAuthHeadersOnly() });
      if (res.ok) setTemplates(await res.json());
    } catch {
    }
  };

  const fetchWhatsAppConfigs = async () => {
    const token = requireToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/whatsapp-config/`, { headers: getAuthHeadersOnly() });
      if (res.ok) setWhatsappConfigs(await res.json());
    } catch {
    }
  };

  const fetchEmailConfigs = async () => {
    const token = requireToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/email-config/`, { headers: getAuthHeadersOnly() });
      if (res.ok) setEmailConfigs(await res.json());
    } catch {
    }
  };

  const fetchLinkedInConfigs = async () => {
    const token = requireToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/linkedin-config/`, { headers: getAuthHeadersOnly() });
      if (res.ok) setLinkedinConfigs(await res.json());
    } catch {
    }
  };


  const deleteAgent = async (agentId: string): Promise<boolean> => {
    if (
      !window.confirm(
        "Voulez-vous vraiment supprimer cette unité IA ? Toutes les données (connaissances, messages) seront effacées."
      )
    )
      return false;
    try {
      const res = await fetch(`${API_BASE}/agents/${agentId}/`, {
        method: "DELETE",
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
        return true;
      }
    } catch {
      /* network failure */
    }
    return false;
  };

  const toggleAgentPause = async (agentId: string): Promise<void> => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, is_active: !a.is_active } : a))
    );
    try {
      const res = await fetch(`${API_BASE}/agents/${agentId}/toggle_pause/`, {
        method: "POST",
        headers: getAuthHeadersOnly(),
      });
      if (!res.ok) {
        setAgents((prev) =>
          prev.map((a) => (a.id === agentId ? { ...a, is_active: !a.is_active } : a))
        );
      }
    } catch {
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, is_active: !a.is_active } : a))
      );
    }
  };

  const updateAgent = async (agentId: string, payload: Partial<Agent>): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/agents/${agentId}/`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data: Agent = await res.json();
        setAgents((prev) => prev.map((a) => (a.id === agentId ? data : a)));
        return true;
      }
    } catch {
      /* network failure */
    }
    return false;
  };

  const createAgent = async (data: Partial<Agent>): Promise<Agent | null> => {
    try {
      const res = await fetch(`${API_BASE}/agents/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newAgent: Agent = await res.json();
        setAgents((prev) => [...prev, newAgent]);
        return newAgent;
      }
    } catch {
      /* network failure */
    }
    return null;
  };

  const deployAgent = async (agentId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/agents/${agentId}/deploy/`, {
        method: "POST",
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) {
        await fetchAgents();
        return true;
      }
    } catch {
      /* network failure */
    }
    return false;
  };

  /* ── Sandbox & Chat ── */

  const sandboxChat = async (agentId: string, message: string): Promise<string | null> => {
    setIsTyping(true);
    try {
      const res = await fetch(`${API_BASE}/agents/${agentId}/sandbox_chat/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.reply;
      }
    } catch {
      /* network failure */
    } finally {
      setIsTyping(false);
    }
    return null;
  };

  const sendChatMessage = async (
    agentId: string,
    content: string,
    contactInfo: string,
    source: string
  ): Promise<void> => {
    try {
      await fetch(`${API_BASE}/agents/${agentId}/send_manual_reply/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ content, contact_info: contactInfo, source }),
      });
      await fetchAgents();
    } catch {
      /* network failure */
    }
  };

  /* ── Knowledge ── */

  const uploadKnowledge = async (agentId: string, file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);
    formData.append("source_type", "file");
    try {
      const res = await fetch(`${API_BASE}/agents/${agentId}/upload_knowledge/`, {
        method: "POST",
        headers: getAuthHeadersOnly(),
        body: formData,
      });
      if (res.ok) await fetchAgents();
    } catch {
      /* network failure */
    }
  };


  const startWhatsAppPairing = async (id: number): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/whatsapp-config/${id}/connect/`, {
        method: "POST",
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(fetchWhatsAppConfigs, 3000);
      }
    } catch {
      /* network failure */
    }
  };

  const deleteWhatsAppConfig = async (id: number): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/whatsapp-config/${id}/`, {
        method: "DELETE",
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) fetchWhatsAppConfigs();
    } catch {
      /* network failure */
    }
  };

  const addLinkedInConfig = async (data: Record<string, unknown>): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/linkedin-config/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) fetchLinkedInConfigs();
    } catch {
      /* network failure */
    }
  };

  const deleteLinkedInConfig = async (id: number): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/linkedin-config/${id}/`, {
        method: "DELETE",
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) fetchLinkedInConfigs();
    } catch {
      /* network failure */
    }
  };

  const updateLinkedInConfig = async (id: number, payload: Partial<LinkedInConfig>): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/linkedin-config/${id}/`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchLinkedInConfigs();
        return true;
      }
    } catch {
      /* network failure */
    }
    return false;
  };

  const syncLinkedInMessages = async (id: number): Promise<void> => {
    try {
      await fetch(`${API_BASE}/linkedin-config/${id}/sync_messages/`, {
        method: "POST",
        headers: getAuthHeadersOnly(),
      });
    } catch {
      /* network failure */
    }
  };

  const getLinkedInConnectionUrl = async (id: number): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/linkedin-config/${id}/get_connection_url/`, {
        method: "GET",
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch {
      /* network failure */
    }
    return null;
  };

  const startLinkedInProspecting = async (id: number, query: string, message: string): Promise<void> => {
    try {
      await fetch(`${API_BASE}/linkedin-config/${id}/prospect/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ query, message }),
      });
    } catch {
      /* network failure */
    }
  };

  const deleteEmailConfig = async (id: number): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/email-config/${id}/`, {
        method: "DELETE",
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) fetchEmailConfigs();
    } catch {
      /* network failure */
    }
  };

  const testEmailConnection = async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/email-config/${id}/test_connection/`, {
        method: "POST",
        headers: getAuthHeadersOnly(),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const getEmailAuthUrl = async (id: number): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/email-config/${id}/get_auth_url/`, {
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch {
      /* network failure */
    }
    return null;
  };


  const fetchSecuritySettings = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/auth/security/`, { headers: getAuthHeadersOnly() });
      if (res.ok) setSecuritySettings(await res.json());
    } catch {
      /* network failure */
    }
  };


  const fetchTeams = async () => {
    const token = requireToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/agent-teams/`, { headers: getAuthHeadersOnly() });
      if (res.ok) setTeams(await res.json());
    } catch {
      /* network failure */
    }
  };

  const fetchLinks = async () => {
    const token = requireToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/agent-links/`, { headers: getAuthHeadersOnly() });
      if (res.ok) setLinks(await res.json());
    } catch {
      /* network failure */
    }
  };

  const createTeam = async (data: Partial<AgentTeam>): Promise<AgentTeam | null> => {
    try {
      const res = await fetch(`${API_BASE}/agent-teams/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newTeam: AgentTeam = await res.json();
        setTeams((prev) => [...prev, newTeam]);
        return newTeam;
      }
    } catch {
      /* network failure */
    }
    return null;
  };

  const deleteTeam = async (id: number): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/agent-teams/${id}/`, {
        method: "DELETE",
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) fetchTeams();
    } catch {
      /* network failure */
    }
  };

  const createLink = async (data: Partial<AgentLink>): Promise<AgentLink | null> => {
    try {
      const res = await fetch(`${API_BASE}/agent-links/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newLink: AgentLink = await res.json();
        setLinks((prev) => [...prev, newLink]);
        return newLink;
      }
    } catch {
      /* network failure */
    }
    return null;
  };

  const deleteLink = async (id: number): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/agent-links/${id}/`, {
        method: "DELETE",
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) fetchLinks();
    } catch {
      /* network failure */
    }
  };


  useEffect(() => {
    fetchAgents();
    fetchTemplates();
    fetchWhatsAppConfigs();
    fetchEmailConfigs();
    fetchLinkedInConfigs();
    fetchTeams();
    fetchLinks();

    const interval = setInterval(() => {
      fetchWhatsAppConfigs();
      fetchEmailConfigs();
    }, 5000);

    return () => {
      clearInterval(interval);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <AgentsContext.Provider
      value={{
        agents,
        templates,
        whatsappConfigs,
        emailConfigs,
        messages,
        setMessages,
        isTyping,
        securitySettings,
        fetchAgents,
        fetchTemplates,
        fetchWhatsAppConfigs,
        fetchEmailConfigs,
        fetchLinkedInConfigs,
        createAgent,
        updateAgent,
        deleteAgent,
        toggleAgentPause,
        uploadKnowledge,
        sandboxChat,
        updateLinkedInConfig,
        startWhatsAppPairing,
        sendChatMessage,
        deployAgent,
        testEmailConnection,
        getEmailAuthUrl,
        deleteEmailConfig,
        deleteWhatsAppConfig,
        linkedinConfigs,
        addLinkedInConfig,
        deleteLinkedInConfig,
        fetchSecuritySettings,
        teams,
        links,
        fetchTeams,
        fetchLinks,
        createTeam,
        deleteTeam,
        createLink,
        deleteLink,
        syncLinkedInMessages,
        getLinkedInConnectionUrl,
        startLinkedInProspecting,
      }}
    >
      {children}
    </AgentsContext.Provider>
  );
}

export function useAgentsContext(): AgentsContextType {
  const context = useContext(AgentsContext);
  if (context === undefined) {
    throw new Error("useAgentsContext must be used within an AgentsProvider");
  }
  return context;
}
