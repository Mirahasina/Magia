import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8000/api';

interface AgentsContextType {
    agents: any[];
    templates: any[];
    whatsappConfigs: any[];
    emailConfigs: any[];
    messages: any[];
    setMessages: React.Dispatch<React.SetStateAction<any[]>>;
    isTyping: boolean;
    securitySettings: any;
    teams: any[];
    links: any[];
    fetchAgents: () => Promise<void>;
    fetchTemplates: () => Promise<void>;
    fetchWhatsAppConfigs: () => Promise<void>;
    fetchEmailConfigs: () => Promise<void>;
    createAgent: (data: any) => Promise<any>;
    updateAgent: (agentId: string, payload: any) => Promise<boolean>;
    deleteAgent: (agentId: string) => Promise<boolean>;
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
    fetchSecuritySettings: () => Promise<void>;
    fetchTeams: () => Promise<void>;
    fetchLinks: () => Promise<void>;
    createTeam: (data: any) => Promise<any>;
    deleteTeam: (id: number) => Promise<void>;
    createLink: (data: any) => Promise<any>;
    deleteLink: (id: number) => Promise<void>;
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
    const [agents, setAgents] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [whatsappConfigs, setWhatsappConfigs] = useState<any[]>([]);
    const [emailConfigs, setEmailConfigs] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [securitySettings, setSecuritySettings] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [links, setLinks] = useState<any[]>([]);
    const pollRef = useRef<any>(null);

    const fetchAgents = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/agents/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAgents(await res.json());
        } catch (e) { }
    };

    const fetchTemplates = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/templates/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setTemplates(await res.json());
        } catch (e) { }
    };

    const fetchWhatsAppConfigs = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/whatsapp-config/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setWhatsappConfigs(await res.json());
        } catch (e) { }
    };

    const fetchEmailConfigs = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/email-config/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setEmailConfigs(await res.json());
        } catch (e) { }
    };

    const deleteAgent = async (agentId: string) => {
        if (!window.confirm("Voulez-vous vraiment supprimer cette unité IA ? Toutes les données (connaissances, messages) seront effacées.")) return false;
        try {
            const res = await fetch(`${API_BASE}/agents/${agentId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) {
                setAgents(prev => prev.filter(a => a.id !== agentId));
                return true;
            }
        } catch (e) { }
        return false;
    };

    const toggleAgentPause = async (agentId: string) => {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, is_active: !a.is_active } : a));
        try {
            const res = await fetch(`${API_BASE}/agents/${agentId}/toggle_pause/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (!res.ok) {
                setAgents(prev => prev.map(a => a.id === agentId ? { ...a, is_active: !a.is_active } : a));
            }
        } catch (e) {
            setAgents(prev => prev.map(a => a.id === agentId ? { ...a, is_active: !a.is_active } : a));
        }
    };

    const updateAgent = async (agentId: string, payload: any) => {
        try {
            const res = await fetch(`${API_BASE}/agents/${agentId}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                setAgents(prev => prev.map(a => a.id === agentId ? data : a));
                return true;
            }
        } catch (e) { }
        return false;
    };

    const createAgent = async (data: any) => {
        try {
            const res = await fetch(`${API_BASE}/agents/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const newAgent = await res.json();
                setAgents(prev => [...prev, newAgent]);
                return newAgent;
            }
        } catch (e) { }
        return null;
    };

    const deployAgent = async (agentId: string) => {
        try {
            const res = await fetch(`${API_BASE}/agents/${agentId}/deploy/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) {
                await fetchAgents();
                return true;
            }
        } catch (e) { }
        return false;
    };

    const sandboxChat = async (agentId: string, message: string) => {
        setIsTyping(true);
        try {
            const res = await fetch(`${API_BASE}/agents/${agentId}/sandbox_chat/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            if (res.ok) {
                const data = await res.json();
                return data.reply;
            }
        } catch (e) { }
        finally { setIsTyping(false); }
        return null;
    };

    const sendChatMessage = async (agentId: string, content: string, contactInfo: string, source: string) => {
        try {
            await fetch(`${API_BASE}/agents/${agentId}/send_manual_reply/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content, contact_info: contactInfo, source })
            });
            await fetchAgents();
        } catch (e) { }
    };

    const uploadKnowledge = async (agentId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
        formData.append('source_type', 'file');

        try {
            const res = await fetch(`${API_BASE}/agents/${agentId}/upload_knowledge/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
                body: formData
            });
            if (res.ok) {
                await fetchAgents();
            }
        } catch (e) { }
    };

    const startWhatsAppPairing = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/whatsapp-config/${id}/connect/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = setInterval(async () => {
                    await fetchWhatsAppConfigs();
                }, 3000) as any;
            }
        } catch (e) { }
    };

    const deleteEmailConfig = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/email-config/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) fetchEmailConfigs();
        } catch (e) { }
    };

    const deleteWhatsAppConfig = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/whatsapp-config/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) fetchWhatsAppConfigs();
        } catch (e) { }
    };

    const testEmailConnection = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/email-config/${id}/test_connection/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            return res.ok;
        } catch (e) { return false; }
    };

    const getEmailAuthUrl = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/email-config/${id}/get_auth_url/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                return data.url;
            }
        } catch (e) { }
        return null;
    };

    const fetchSecuritySettings = async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/security/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) setSecuritySettings(await res.json());
        } catch (e) { }
    };

    const fetchTeams = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/agent-teams/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setTeams(await res.json());
        } catch (e) { }
    };

    const fetchLinks = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/agent-links/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setLinks(await res.json());
        } catch (e) { }
    };

    const createTeam = async (data: any) => {
        try {
            const res = await fetch(`${API_BASE}/agent-teams/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const newTeam = await res.json();
                setTeams(prev => [...prev, newTeam]);
                return newTeam;
            }
        } catch (e) { }
        return null;
    };

    const deleteTeam = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/agent-teams/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) fetchTeams();
        } catch (e) { }
    };

    const createLink = async (data: any) => {
        try {
            const res = await fetch(`${API_BASE}/agent-links/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const newLink = await res.json();
                setLinks(prev => [...prev, newLink]);
                return newLink;
            }
        } catch (e) { }
        return null;
    };

    const deleteLink = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/agent-links/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) fetchLinks();
        } catch (e) { }
    };

    useEffect(() => {
        fetchAgents();
        fetchTemplates();
        fetchWhatsAppConfigs();
        fetchEmailConfigs();
        fetchTeams();
        fetchLinks();

        const interval = setInterval(() => {
            fetchWhatsAppConfigs();
            fetchEmailConfigs();
        }, 5000);

        return () => {
            clearInterval(interval as any);
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    return (
        <AgentsContext.Provider value={{
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
            createAgent,
            updateAgent,
            deleteAgent,
            toggleAgentPause,
            uploadKnowledge,
            sandboxChat,
            startWhatsAppPairing,
            sendChatMessage,
            deployAgent,
            testEmailConnection,
            getEmailAuthUrl,
            deleteEmailConfig,
            deleteWhatsAppConfig,
            fetchSecuritySettings,
            teams,
            links,
            fetchTeams,
            fetchLinks,
            createTeam,
            deleteTeam,
            createLink,
            deleteLink
        }}>
            {children}
        </AgentsContext.Provider>
    );
}

export function useAgentsContext() {
    const context = useContext(AgentsContext);
    if (context === undefined) {
        throw new Error('useAgentsContext must be used within an AgentsProvider');
    }
    return context;
}
