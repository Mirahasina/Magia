import { useAgentsContext } from "../context/AgentsContext";

const API_BASE = "http://localhost:8000/api";

export function useAgents() {
    const context = useAgentsContext();

    const regenerateMasterKey = async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/security/regenerate_master_key/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) context.fetchSecuritySettings();
        } catch (e) { }
    };

    const toggle2FA = async (enabled: boolean) => {
        try {
            const res = await fetch(`${API_BASE}/auth/security/toggle_2fa/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled })
            });
            if (res.ok) context.fetchSecuritySettings();
        } catch (e) { }
    };

    const toggleWhatsAppConnection = async (configId: number) => {
        try {
            await fetch(`${API_BASE}/whatsapp-config/${configId}/toggle_connection/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            context.fetchWhatsAppConfigs();
        } catch (e) { }
    };

    const addWhatsAppConfig = async (data: any) => {
        try {
            const res = await fetch(`${API_BASE}/whatsapp-config/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) context.fetchWhatsAppConfigs();
        } catch (e) { }
    };

    const addEmailConfig = async (data: any) => {
        try {
            const res = await fetch(`${API_BASE}/email-config/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) context.fetchEmailConfigs();
        } catch (e) { }
    };

    return {
        ...context,
        regenerateMasterKey,
        toggle2FA,
        toggleWhatsAppConnection,
        addWhatsAppConfig,
        addEmailConfig
    };
}
