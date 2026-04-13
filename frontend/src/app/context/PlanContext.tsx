import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface PlanLimits {
  max_agents: number | null;
  max_members: number | null;
  max_kb_per_agent: number | null;
  max_credits: number | null;
  channels: string[];
  boite_reception: boolean;
}

interface PlanUsage {
  agents: number;
  members: number;
  credits: number;
}

interface PlanContextType {
  plan: string;
  limits: PlanLimits;
  usage: PlanUsage;
  canCreateAgent: boolean;
  canInviteMembers: boolean;
  canUseWhatsApp: boolean;
  canUseInbox: boolean;
  refresh: () => void;
}


const defaultLimits: PlanLimits = {
  max_agents: 2, max_members: 0, max_kb_per_agent: 2, max_credits: 500,
  channels: ['email'], boite_reception: false,
};

const PlanContext = createContext<PlanContextType>({
  plan: 'gratuit', limits: defaultLimits, usage: { agents: 0, members: 0, credits: 0 },
  canCreateAgent: true, canInviteMembers: false, canUseWhatsApp: false, canUseInbox: false,
  refresh: () => {},
});

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState('gratuit');
  const [limits, setLimits] = useState<PlanLimits>(defaultLimits);
  const [usage, setUsage] = useState<PlanUsage>({ agents: 0, members: 0, credits: 0 });


  const fetchLimits = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/auth/plan-limits/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        setLimits(data.limits);
        setUsage(data.usage);
      }
    } catch (e) {}
  };

  useEffect(() => { 
    fetchLimits();
    const handleAuthSuccess = () => fetchLimits();
    window.addEventListener('auth-success', handleAuthSuccess);
    return () => window.removeEventListener('auth-success', handleAuthSuccess);
  }, []);

  const canCreateAgent = limits.max_agents === null || usage.agents < limits.max_agents;
  const canInviteMembers = limits.max_members === null || (limits.max_members > 0 && usage.members < limits.max_members);
  const canUseWhatsApp = limits.channels.includes('whatsapp');
  const canUseInbox = limits.boite_reception;

  return (
    <PlanContext.Provider value={{ plan, limits, usage, canCreateAgent, canInviteMembers, canUseWhatsApp, canUseInbox, refresh: fetchLimits }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);
