import { useAgentsContext } from "../context/AgentsContext";
import { API_BASE, getAuthHeaders, getAuthHeadersOnly } from "../../lib/api";

export function useAgents() {
  const context = useAgentsContext();

  const regenerateMasterKey = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/auth/security/regenerate_master_key/`, {
        method: "POST",
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) context.fetchSecuritySettings();
    } catch {
      /* network failure */
    }
  };

  const toggle2FA = async (enabled: boolean): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/auth/security/toggle_2fa/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) context.fetchSecuritySettings();
    } catch {
      /* network failure */
    }
  };


  const addWhatsAppConfig = async (data: Record<string, unknown>): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/whatsapp-config/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) context.fetchWhatsAppConfigs();
    } catch {
    }
  };

  const addEmailConfig = async (data: Record<string, unknown>): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/email-config/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) context.fetchEmailConfigs();
    } catch {
    }
  };

  const addLinkedInConfig = async (data: Record<string, unknown>): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/linkedin-config/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) context.fetchLinkedInConfigs();
    } catch {
    }
  };

  const deleteLinkedInConfig = async (id: number): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/linkedin-config/${id}/`, {
        method: "DELETE",
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) context.fetchLinkedInConfigs();
    } catch {
    }
  };

  return {
    ...context,
    regenerateMasterKey,
    toggle2FA,
    addWhatsAppConfig,
    addEmailConfig,
    addLinkedInConfig,
    deleteLinkedInConfig,
    updateLinkedInConfig: context.updateLinkedInConfig,
    refreshLinkedInConnection: context.refreshLinkedInConnection,
    addFacebookConfig: context.addFacebookConfig,
    deleteFacebookConfig: context.deleteFacebookConfig,
    getFacebookConnectionUrl: context.getFacebookConnectionUrl,
    refreshFacebookConnection: context.refreshFacebookConnection,
    getWhatsAppConnectionUrl: context.getWhatsAppConnectionUrl,
    refreshWhatsAppConnection: context.refreshWhatsAppConnection,
    getEmailConnectionUrl: context.getEmailConnectionUrl,
    refreshEmailConnection: context.refreshEmailConnection,
  };
}
