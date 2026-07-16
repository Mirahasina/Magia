import { API_BASE } from "../../../lib/api";
import { useState, useEffect } from "react";
import { usePlan } from "../../context/PlanContext";
import { UserPlus, Trash2, Crown, Eye, Edit3, AlertCircle } from "lucide-react";
import { cn } from "../ui/utils";
import { confirmDialog } from "../shared/ConfirmDialog";

interface Member {
    id: string;
    email: string;
    name: string;
    role: 'viewer' | 'editor';
    joined_at: string;
    has_account: boolean;
}

interface Teammate {
    email: string;
    name: string;
    role: 'viewer' | 'editor';
    joined_at: string;
}

interface WorkspaceTeam {
    workspace_owner_name: string;
    workspace_owner_email: string;
    teammates: Teammate[];
}

interface Membership {
    id: string;
    owner_email: string;
    owner_name: string;
    role: 'viewer' | 'editor';
    joined_at: string;
}


export function MembresView() {
    const { plan, limits, usage, canInviteMembers, refresh } = usePlan();
    const [members, setMembers] = useState<Member[]>([]);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [teams, setTeams] = useState<WorkspaceTeam[]>([]);
    const [loading, setLoading] = useState(true);

    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
    const [inviting, setInviting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const token = () => localStorage.getItem('access_token');

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/members/`, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMembers(data.my_members || []);
                setMemberships(data.my_memberships || []);
                setTeams(data.my_teams || []);
            }

        } catch (e) { }
        setLoading(false);
    };

    useEffect(() => { fetchMembers(); }, []);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_BASE}/auth/invite/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
            });
            const data = await res.json();
            if (res.ok) {
                setFeedback({ type: 'success', msg: data.message });
                setInviteEmail(''); setShowInviteForm(false);
                fetchMembers(); refresh();
            } else {
                setFeedback({ type: 'error', msg: data.error || 'Erreur lors de l\'invitation.' });
            }
        } catch (e) {
            setFeedback({ type: 'error', msg: 'Erreur réseau.' });
        }
        setInviting(false);
    };

    const handleRemove = async (id: string) => {
        const ok = await confirmDialog({
            title: "Retirer ce membre du workspace ?",
            confirmLabel: "Retirer",
            danger: true,
        });
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/auth/members/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) { fetchMembers(); refresh(); }
        } catch (e) { }
    };

    const planColor = plan === 'pro' ? 'text-blue-700 bg-blue-50' : plan === 'entreprise' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500 bg-gray-100';

    return (
        <div className="h-full flex flex-col magia-page animate-page-fade overflow-hidden">
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h1 className="magia-title">Mon espace de travail</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="magia-subtitle">
                                {usage.members} / {limits.max_members === null ? '∞' : limits.max_members} membres
                            </span>
                            <span className={cn("px-2 py-0.5 text-[8px] font-medium rounded-full", planColor)}>
                                {plan}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <button
                            onClick={() => canInviteMembers ? setShowInviteForm(true) : undefined}
                            disabled={!canInviteMembers}
                            className={cn(
                                "px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg transition-all flex items-center gap-2",
                                canInviteMembers
                                    ? "bg-gray-900 text-white hover:scale-[1.02] shadow-gray-100"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            <UserPlus className="w-4 h-4" />
                            INVITER MEMBRE
                        </button>
                    </div>
                </div>

                {(plan === 'gratuit' || plan === 'pro') && (
                    <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex-shrink-0">
                        <Crown className="w-5 h-5 text-orange-400 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-orange-700">Fonctionnalité Entreprise</p>
                            <p className="text-[11px] text-orange-500 font-medium">L'invitation de collaborateurs est réservée au plan Entreprise. Passez à l'Entreprise pour gérer votre équipe.</p>
                        </div>
                    </div>
                )}

                {feedback && (
                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl border flex-shrink-0 animate-in slide-in-from-top-2", feedback.type === 'success' ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100")}>
                        <AlertCircle className={cn("w-4 h-4 shrink-0", feedback.type === 'success' ? "text-emerald-500" : "text-red-500")} />
                        <p className={cn("text-xs font-bold", feedback.type === 'success' ? "text-emerald-700" : "text-red-700")}>{feedback.msg}</p>
                    </div>
                )}

                {showInviteForm && (
                    <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-300 flex-shrink-0 border-blue-100">
                        <h3 className="text-xs font-medium text-blue-900">Nouvelle invitation</h3>
                        <div className="flex gap-4">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                placeholder="email@exemple.com"
                                className="flex-grow px-5 py-3 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-900 bg-gray-50/50 transition-all placeholder:text-gray-300"
                            />
                            <select
                                value={inviteRole}
                                onChange={e => setInviteRole(e.target.value as 'viewer' | 'editor')}
                                className="px-5 py-3 border border-gray-100 rounded-xl text-xs font-medium bg-gray-50/50 focus:outline-none cursor-pointer hover:border-blue-900 transition-all"
                            >
                                <option value="viewer">Lecture Seule</option>
                                <option value="editor">Accès Éditeur</option>
                            </select>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowInviteForm(false)} className="px-5 py-2.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors">Annuler</button>
                            <button
                                onClick={handleInvite}
                                disabled={inviting || !inviteEmail.trim()}
                                className="px-8 py-2.5 bg-blue-950 text-white rounded-xl text-xs font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition-all"
                            >
                                {inviting ? 'ENVOI...' : 'DÉPLOYER INVITATION'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-12 space-y-4">
                    {loading ? (
                        <div className="py-8 text-center text-[10px] font-semibold text-gray-300">Chargement...</div>
                    ) : members.length === 0 ? (
                        <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                            <p className="text-sm font-medium text-gray-300">Aucun membre détecté dans l'espace</p>
                        </div>
                    ) : members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-sm group">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center font-semibold text-white text-lg shadow-lg">
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-[12px] font-semibold text-gray-900">{member.name}</div>
                                    <div className="text-[10px] text-gray-400">{member.email}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col items-end">
                                    <span className={cn(
                                        "px-3 py-1 text-xs font-medium rounded-full mb-1",
                                        member.role === 'editor' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-50 text-gray-400 border border-gray-100'
                                    )}>
                                        {member.role === 'editor' ? 'Éditeur (Écriture)' : 'Lecteur (Lecture)'}
                                    </span>
                                    <span className={cn(
                                        "text-[8px] font-bold tracking-tighter",
                                        member.has_account ? "text-emerald-500" : "text-amber-500 animate-pulse"
                                    )}>
                                        {member.has_account ? "● Actif" : "○ En attente (Lien envoyé)"}
                                    </span>
                                </div>
                                <button onClick={() => handleRemove(member.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" title="Retirer">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {memberships.length > 0 && (
                <div className="space-y-12 pt-12 border-t border-gray-100">
                    <div className="space-y-1">
                        <h2 className="magia-section opacity-80">Workspaces rejoints</h2>
                        <p className="magia-detail italic">Workspaces dont vous êtes membre</p>
                    </div>

                    <div className="grid grid-cols-1 magia-grid">
                        {memberships.map((m) => {
                            const workspaceTeam = teams.find(t => t.workspace_owner_email === m.owner_email);
                            return (
                                <div key={m.id} className="space-y-4">
                                    <div className="p-5 bg-slate-50 border border-gray-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center group hover:border-blue-200 hover:bg-white hover:shadow-xl transition-all gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-semibold text-blue-900">{m.role === 'editor' ? 'Droit Éditeur' : 'Lecture Seule'}</p>
                                            <h3 className="text-lg font-semibold text-gray-900 leading-tight">Workspace de {m.owner_name}</h3>
                                            <p className="text-[11px] text-gray-400 font-medium italic">{m.owner_email}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[9px] font-semibold text-gray-400 leading-none bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-50">Membre depuis {new Date(m.joined_at).toLocaleDateString()}</span>
                                            <div className="p-3 bg-blue-950 rounded-xl shadow-lg text-white">
                                                <Crown className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>

                                    {workspaceTeam && workspaceTeam.teammates.length > 0 && (
                                        <div className="ml-6 pl-6 border-l-2 border-slate-50 space-y-3">
                                            <h4 className="text-[9px] font-semibold text-slate-400 pl-1">Mes Coéquipiers ({workspaceTeam.teammates.length})</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {workspaceTeam.teammates.map((t, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-gray-50 rounded-xl hover:border-blue-100 hover:shadow-md transition-all">
                                                        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-semibold text-slate-400 italic">
                                                            {t.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[10px] font-semibold text-slate-700 truncate">{t.name}</div>
                                                            <div className="text-[8px] font-bold text-slate-300 tracking-tighter">{t.role === 'editor' ? 'ÉDITEUR' : 'LECTEUR'}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
}

