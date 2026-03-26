import { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8000/api';

export function useAgents() {
    const [whatsappConfigs, setWhatsappConfigs] = useState<any[]>([]);
    const [emailConfigs, setEmailConfigs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    const fetchWhatsAppConfigs = async () => {
        try {
            const res = await fetch(`${API_BASE}/whatsapp-config/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) setWhatsappConfigs(await res.json());
        } catch (e) {}
    };

    const fetchEmailConfigs = async () => {
        try {
            const res = await fetch(`${API_BASE}/email-config/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) setEmailConfigs(await res.json());
        } catch (e) {}
    };

    const startWhatsAppPairing = async (id: number) => {
        if (pollRef.current) clearInterval(pollRef.current);
        try {
            await fetch(`${API_BASE}/whatsapp-config/${id}/connect/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            fetchWhatsAppConfigs();
            pollRef.current = setInterval(async () => {
                const res = await fetch(`${API_BASE}/whatsapp-config/${id}/`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setWhatsappConfigs(prev => prev.map(c => c.id === id ? data : c));
                    if (data.is_connected) {
                        if (pollRef.current) clearInterval(pollRef.current);
                    }
                }
            }, 3000);
        } catch (e) {}
    };

    const toggleWhatsAppConnection = async (id: number) => {
        try {
            await fetch(`${API_BASE}/whatsapp-config/${id}/toggle_connection/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            fetchWhatsAppConfigs();
        } catch (e) {}
    };

    const addWhatsAppConfig = async (name: string = "Nouveau WhatsApp") => {
        try {
            await fetch(`${API_BASE}/whatsapp-config/`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });
            fetchWhatsAppConfigs();
        } catch (e) {}
    };

    const deleteWhatsAppConfig = async (id: number) => {
        if (!window.confirm("Supprimer ce numéro ?")) return;
        try {
            await fetch(`${API_BASE}/whatsapp-config/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            fetchWhatsAppConfigs();
        } catch (e) {}
    };

    const addEmailConfig = async (name: string = "Nouveau Email") => {
        try {
            await fetch(`${API_BASE}/email-config/`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });
            fetchEmailConfigs();
        } catch (e) {}
    };

    const deleteEmailConfig = async (id: number) => {
        if (!window.confirm("Supprimer cette configuration email ?")) return;
        try {
            await fetch(`${API_BASE}/email-config/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            fetchEmailConfigs();
        } catch (e) {}
    };

    const getEmailAuthUrl = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/email-config/${id}/get_auth_url/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                return data.auth_url;
            }
        } catch (e) {}
        return null;
    };

    const testEmailConnection = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/email-config/${id}/test_connection/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) return await res.json();
        } catch (e) {}
        return null;
    };

    const [agents, setAgents] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    const fetchAgents = async () => {
        try {
            const res = await fetch(`${API_BASE}/agents/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) setAgents(await res.json());
        } catch (e) {}
    };

    const fetchTemplates = async () => {
        try {
            const res = await fetch(`${API_BASE}/templates/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) setTemplates(await res.json());
        } catch (e) {}
    };

    const createAgent = async (payload: any) => {
        try {
            const res = await fetch(`${API_BASE}/agents/`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) return await res.json();
        } catch (e) {}
        return null;
    };

    const uploadKnowledge = async (agentId: number, file: File) => {
        const formData = new FormData();
        formData.append('agent', agentId.toString());
        formData.append('name', file.name);
        formData.append('source_type', 'file');
        formData.append('file', file);
        try {
            const res = await fetch(`${API_BASE}/knowledge-base/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
                body: formData
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    };

    const sendChatMessage = async (agentId: number, message: string) => {
        setIsTyping(true);
        try {
            const res = await fetch(`${API_BASE}/agents/${agentId}/chat/`, {
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
        } catch (e) {}
        finally { setIsTyping(false); }
        return null;
    };

    const [securitySettings, setSecuritySettings] = useState<{master_api_key: string, is_2fa_enabled: boolean} | null>(null);

    const fetchSecuritySettings = async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/security/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) setSecuritySettings(await res.json());
        } catch (e) {}
    };

    const regenerateMasterKey = async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/security/regenerate/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSecuritySettings(prev => prev ? { ...prev, master_api_key: data.master_api_key } : null);
                return true;
            }
        } catch (e) {}
        return false;
    };

    const toggle2FA = async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/security/toggle-2fa/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSecuritySettings(prev => prev ? { ...prev, is_2fa_enabled: data.is_2fa_enabled } : null);
                return true;
            }
        } catch (e) {}
        return false;
    };

    const deployAgent = async (agentId: number) => {
        try {
            const res = await fetch(`${API_BASE}/agents/${agentId}/deploy/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            return res.ok;
        } catch (e) { return false; }
    };

    const deleteAgent = async (agentId: string) => {
        if (!window.confirm("Voulez-vous vraiment supprimer cette unité IA ? Toutes les données (connaissances, messages) seront effacées.")) return;
        try {
            const res = await fetch(`${API_BASE}/agents/${agentId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) {
                setAgents(prev => prev.filter(a => a.id !== agentId));
                return true;
            }
        } catch (e) {}
        return false;
    };

    useEffect(() => {
        fetchAgents();
        fetchTemplates();
        fetchWhatsAppConfigs();
        fetchEmailConfigs();

        const interval = setInterval(() => {
            fetchWhatsAppConfigs();
            fetchEmailConfigs();
        }, 5000);

        return () => {
            clearInterval(interval);
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    return {
        whatsappConfigs,
        emailConfigs,
        agents,
        templates,
        messages,
        setMessages,
        isTyping,
        fetchWhatsAppConfigs,
        fetchEmailConfigs,
        fetchAgents,
        fetchTemplates,
        startWhatsAppPairing,
        toggleWhatsAppConnection,
        addWhatsAppConfig,
        deleteWhatsAppConfig,
        addEmailConfig,
        deleteEmailConfig,
        getEmailAuthUrl,
        testEmailConnection,
        securitySettings,
        fetchSecuritySettings,
        regenerateMasterKey,
        toggle2FA,
        createAgent,
        uploadKnowledge,
        sendChatMessage,
        deployAgent,
        deleteAgent
    };
}
