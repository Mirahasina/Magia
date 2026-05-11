import { useState, useEffect, useRef } from "react";
import { cn } from "../ui/utils";
import { useAgents } from "../../hooks/useAgents";

const SECTIONS = [
    { id: "profile", label: "Administrateur" },
    { id: "workspace", label: "Espace de travail" },
    { id: "integrations", label: "Intégrations" },
    { id: "security", label: "Sécurité" },
];

export function ParametresView({ onProfileUpdate, onLogout }: { onProfileUpdate?: () => void, onLogout: () => void }) {
    const [activeSection, setActiveSection] = useState("profile");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('profil');
    const [linkedInTab, setLinkedInTab] = useState<'prospecting' | 'messaging'>('prospecting');

    const handleDeleteAccount = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/auth/me/', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            if (res.ok) {
                onLogout();
            } else {
                alert("Erreur lors de la suppression du compte.");
            }
        } catch (e) {
            console.error("Delete account error", e);
        }
    };
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        recovery_email: "",
        workspace_label: "",
        timezone: "Indian/Antananarivo",
        avatar_url: ""
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [redirectingIds, setRedirectingIds] = useState<number[]>([]);

    const {
        whatsappConfigs, addWhatsAppConfig, deleteWhatsAppConfig, getWhatsAppConnectionUrl, refreshWhatsAppConnection,
        emailConfigs, addEmailConfig, deleteEmailConfig, getEmailConnectionUrl, refreshEmailConnection,
        linkedinConfigs, addLinkedInConfig, deleteLinkedInConfig, getLinkedInConnectionUrl, refreshLinkedInConnection,
        facebookConfigs, addFacebookConfig, deleteFacebookConfig, getFacebookConnectionUrl, refreshFacebookConnection,
        securitySettings, fetchSecuritySettings, regenerateMasterKey, toggle2FA
    } = useAgents();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const tab = urlParams.get('tab');
        
        if (status === 'success' && tab) {
            const configs = {
                linkedin: { list: linkedinConfigs, refresh: refreshLinkedInConnection },
                whatsapp: { list: whatsappConfigs, refresh: refreshWhatsAppConnection },
                facebook: { list: facebookConfigs, refresh: refreshFacebookConnection },
                email: { list: emailConfigs, refresh: refreshEmailConnection }
            }[tab as keyof typeof configs];

            if (configs) {
                configs.list.forEach(c => {
                    if (!('is_connected' in c ? c.is_connected : (c as any).is_active)) {
                        configs.refresh(c.id);
                    }
                });
            }
            
            const newUrl = window.location.pathname + (urlParams.get('view') ? `?view=${urlParams.get('view')}` : '');
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [linkedinConfigs, whatsappConfigs, facebookConfigs, emailConfigs]);

    const [configTarget, setConfigTarget] = useState<"whatsapp" | "email" | "linkedin" | "facebook" | null>(null);
    const [activeConfig, setActiveConfig] = useState<any>(null);

    useEffect(() => {
        if (activeSection === 'security') {
            fetchSecuritySettings();
        }
    }, [activeSection]);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch("http://localhost:8000/api/auth/me/", {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    first_name: data.first_name || "",
                    last_name: data.last_name || "",
                    recovery_email: data.recovery_email || "",
                    workspace_label: data.workspace_label || "Mon espace de travail",
                    timezone: data.timezone || "Indian/Antananarivo",
                    avatar_url: data.avatar_url || ""
                });
            }
        } catch (err) {
            console.error("Failed to fetch profile", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const data = new FormData();
            data.append("first_name", formData.first_name);
            data.append("last_name", formData.last_name);
            data.append("recovery_email", formData.recovery_email);
            data.append("workspace_label", formData.workspace_label);
            data.append("timezone", formData.timezone);

            if (selectedFile) {
                data.append("avatar", selectedFile);
            }

            const res = await fetch("http://localhost:8000/api/auth/me/", {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("access_token")}`
                },
                body: data
            });

            if (res.ok) {
                onProfileUpdate?.();
                await fetchProfile();
                setSelectedFile(null);
                alert("Profil mis à jour avec succès !");
            } else {
                const errorData = await res.json();
                console.error("Profile save error", errorData);
                alert("Erreur lors de la sauvegarde : " + (JSON.stringify(errorData) || res.statusText));
            }
        } catch (err) {
            console.error("Failed to save profile", err);
            alert("Erreur réseau lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => ({ ...prev, avatar_url: event.target?.result as string }));
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    if (isLoading) {
        return <div className="p-8 text-gray-500">Chargement des paramètres...</div>;
    }

    return (
        <div className="h-full flex flex-col space-y-6 animate-page-fade overflow-hidden">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h2 className="magia-h1 uppercase text-2xl">Paramètres</h2>
                </div>
            </div>

            <div className="flex gap-6 items-start flex-1 overflow-hidden">
                <div className="w-64 shrink-0 space-y-1 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
                    {SECTIONS.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-md text-[11px] font-black uppercase tracking-widest transition-all",
                                activeSection === s.id
                                    ? "bg-gray-900 text-white shadow-lg shadow-gray-200"
                                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-xl"
                            )}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                        {activeSection === "profile" && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="magia-label mb-6 text-blue-900">IDENTITÉ DU SYSTÈME</h3>
                                    <div className="flex items-center gap-8">
                                        <div className="relative group">
                                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                                            <div onClick={handleAvatarClick} className="w-24 h-24 bg-gray-900 rounded-2xl flex items-center justify-center text-white text-3xl font-serif font-bold shadow-xl overflow-hidden relative cursor-pointer">
                                                {formData.avatar_url ? (
                                                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    formData.first_name ? formData.first_name.charAt(0).toUpperCase() : "M"
                                                )}
                                                <div className="absolute inset-0 bg-blue-900/20 group-hover:bg-transparent transition-colors" />
                                            </div>
                                            <button onClick={handleAvatarClick} className="absolute -bottom-2 -right-2 p-2 bg-white border border-gray-100 shadow-lg rounded-xl hover:scale-110 transition-transform">
                                                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                                            <div className="space-y-1">
                                                <label className="magia-label">Prénom</label>
                                                <input name="first_name" value={formData.first_name} onChange={handleChange} type="text" placeholder="Prénom" className="w-full px-0 py-2 bg-transparent border-b border-gray-100 focus:border-blue-900 outline-none text-sm font-black transition-colors font-serif" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="magia-label">Nom</label>
                                                <input name="last_name" value={formData.last_name} onChange={handleChange} type="text" placeholder="Nom" className="w-full px-0 py-2 bg-transparent border-b border-gray-100 focus:border-blue-900 outline-none text-sm font-black transition-colors font-serif" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === "workspace" && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900 mb-6">UNITÉ OPÉRATIONNELLE</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Label du Workspace</label>
                                            <input name="workspace_label" value={formData.workspace_label} onChange={handleChange} type="text" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm font-black font-serif outline-none focus:border-blue-900 transition-colors" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Localisation Temporelle</label>
                                            <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm font-black font-serif outline-none focus:border-blue-900 transition-colors cursor-pointer">
                                                <option value="Indian/Antananarivo">Antananarivo (GMT+3)</option>
                                                <option value="Europe/Paris">Paris (GMT+1)</option>
                                                <option value="UTC">UTC</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === "integrations" && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900 mb-2">PLUGIN HUB</h3>
                                    <p className="text-[11px] text-gray-400 italic mb-8">Connexions neurales avec outils tiers</p>

                                    {configTarget === null ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {['WhatsApp', 'Email', 'LinkedIn', 'Facebook'].map((app) => {
                                                const configs = 
                                                    app === 'WhatsApp' ? whatsappConfigs : 
                                                    (app === 'Email' ? emailConfigs : 
                                                    (app === 'LinkedIn' ? linkedinConfigs : facebookConfigs));
                                                
                                                const isConnected = configs.some((c: any) => c.is_connected || c.is_active);

                                                return (
                                                    <div
                                                        key={app}
                                                        onClick={() => setConfigTarget(app.toLowerCase() as any)}
                                                        className={cn(
                                                            "p-5 bg-white border border-gray-100 rounded-2xl flex flex-col items-center gap-4 hover:border-blue-200 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden text-center"
                                                        )}
                                                    >
                                                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-lg font-black italic text-gray-300 group-hover:text-blue-900 transition-colors">
                                                            {app.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest block mb-1">{app}</span>
                                                            <span className={cn(
                                                                "text-[8px] font-black uppercase px-2 py-1 rounded-md",
                                                                isConnected ? "text-emerald-600 bg-emerald-50 border border-emerald-100" : "text-gray-400 bg-gray-50"
                                                            )}>{isConnected ? "Connecté" : "Prêt"}</span>
                                                        </div>
                                                        <div className="absolute top-0 right-0 w-1 h-full bg-blue-900 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <button onClick={() => { setConfigTarget(null); setActiveConfig(null); }} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                                    Retour au Hub
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (configTarget === 'whatsapp') addWhatsAppConfig({ name: 'Nouveau WhatsApp' });
                                                        else if (configTarget === 'email') addEmailConfig({ name: 'Nouveau Email' });
                                                        else if (configTarget === 'linkedin') addLinkedInConfig({ name: 'Nouveau LinkedIn' });
                                                        else if (configTarget === 'facebook') addFacebookConfig({ name: 'Nouveau Facebook' });
                                                    }}
                                                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-900 transition-colors"
                                                >
                                                    + Nouveau {configTarget === 'whatsapp' ? 'Numéro' : (configTarget === 'email' ? 'Compte' : 'Accès')}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4">
                                                {(configTarget === 'whatsapp' ? whatsappConfigs : 
                                                  (configTarget === 'email' ? emailConfigs : 
                                                  (configTarget === 'linkedin' ? linkedinConfigs : facebookConfigs))).map((c: any) => {
                                                    const isConnected = c.is_connected || c.is_active;
                                                    const providerInfo = {
                                                        whatsapp: { icon: 'W', color: '#25D366', label: 'WhatsApp', getUrl: getWhatsAppConnectionUrl, refresh: refreshWhatsAppConnection },
                                                        email: { icon: 'E', color: '#EA4335', label: 'Email', getUrl: getEmailConnectionUrl, refresh: refreshEmailConnection },
                                                        linkedin: { icon: 'L', color: '#0A66C2', label: 'LinkedIn', getUrl: getLinkedInConnectionUrl, refresh: refreshLinkedInConnection },
                                                        facebook: { icon: 'F', color: '#1877F2', label: 'Facebook', getUrl: getFacebookConnectionUrl, refresh: refreshFacebookConnection }
                                                    }[configTarget!];

                                                    return (
                                                        <div key={c.id} className="p-6 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between group">
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn(
                                                                    "w-3 h-3 rounded-full shadow-sm",
                                                                    isConnected ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                                                                )} />
                                                                <div>
                                                                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{c.name}</p>
                                                                    <p className="text-[9px] text-gray-400 font-medium italic">{c.phone_number || c.email || (isConnected ? 'Compte lié' : 'Non configuré')}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                {!isConnected ? (
                                                                    <div className="flex flex-col gap-2 items-end">
                                                                        <button
                                                                            disabled={redirectingIds.includes(c.id)}
                                                                            onClick={async () => {
                                                                                setRedirectingIds(prev => [...prev, c.id]);
                                                                                try {
                                                                                    const url = await providerInfo.getUrl(c.id);
                                                                                    if (url) window.location.assign(url);
                                                                                    else throw new Error("No URL");
                                                                                } catch (err) {
                                                                                    setRedirectingIds(prev => prev.filter(id => id !== c.id));
                                                                                    alert("Erreur lors de la génération de l'URL.");
                                                                                }
                                                                            }}
                                                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group min-w-[180px] justify-center disabled:opacity-50"
                                                                        >
                                                                            {redirectingIds.includes(c.id) ? (
                                                                                <div className="flex items-center gap-2 text-blue-900">
                                                                                    <div className="w-3 h-3 border-2 border-blue-900 border-t-transparent animate-spin rounded-full"></div>
                                                                                    <span className="text-[10px] font-bold">Redirection...</span>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <div className="w-4 h-4 flex items-center justify-center rounded-sm font-black text-[10px] text-white" style={{ backgroundColor: providerInfo.color }}>
                                                                                        {providerInfo.icon}
                                                                                    </div>
                                                                                    <span className="text-[10px] font-bold text-gray-700">Connecter via Unipile</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => providerInfo.refresh(c.id)}
                                                                            className="text-[8px] font-black uppercase tracking-widest text-blue-900 hover:underline"
                                                                        >
                                                                            Déjà connecté ? Synchroniser
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                                                                            Connecté
                                                                        </span>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (configTarget === 'whatsapp') deleteWhatsAppConfig(c.id);
                                                                                else if (configTarget === 'email') deleteEmailConfig(c.id);
                                                                                else if (configTarget === 'linkedin') deleteLinkedInConfig(c.id);
                                                                                else deleteFacebookConfig(c.id);
                                                                            }}
                                                                            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                                                                        >
                                                                            Déconnecter
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        if (configTarget === 'whatsapp') deleteWhatsAppConfig(c.id);
                                                                        else if (configTarget === 'email') deleteEmailConfig(c.id);
                                                                        else if (configTarget === 'linkedin') deleteLinkedInConfig(c.id);
                                                                        else deleteFacebookConfig(c.id);
                                                                    }}
                                                                    className={cn("p-2 text-gray-300 hover:text-red-500 transition-colors", isConnected && "hidden")}
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeSection === "security" && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="magia-label mb-6 text-blue-900">PROTOCOLES DE SÉCURITÉ</h3>
                                    <div className="space-y-4">
                                        <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between group">
                                            <div>
                                                <p className="magia-label text-gray-900 mb-1">Master API Key</p>
                                                <p className="text-[10px] font-mono text-gray-300 group-hover:text-blue-900 transition-colors uppercase">
                                                    {securitySettings?.master_api_key || '••••••••••••••••'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={regenerateMasterKey}
                                                className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all shadow-sm"
                                            >
                                                RÉGÉNÉRER
                                            </button>
                                        </div>
                                        <div className="p-6 bg-gray-900 rounded-2xl flex items-center justify-between text-white">
                                            <div>
                                                <p className="magia-label opacity-60 mb-1 text-white">Authentification 2FA</p>
                                                <p className="text-[11px] font-medium italic opacity-80">
                                                    {securitySettings?.is_2fa_enabled ? "Protection biométrique activée" : "Protection non activée"}
                                                </p>
                                            </div>
                                            <div
                                                onClick={() => toggle2FA(!securitySettings?.is_2fa_enabled)}
                                                className={`w-10 h-5 rounded-full flex items-center px-1 cursor-pointer transition-colors ${securitySettings?.is_2fa_enabled ? 'bg-blue-900' : 'bg-gray-700'}`}
                                            >
                                                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${securitySettings?.is_2fa_enabled ? 'ml-auto' : ''}`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 mt-8 border-t border-gray-100">
                                        <div className="p-6 bg-red-50 rounded-none border border-red-100 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider">Zone Danger</h3>
                                                <p className="text-[11px] text-red-600 font-medium italic">
                                                    La suppression du compte est irréversible. Toutes vos données seront effacées.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm("Êtes-vous certain de vouloir supprimer votre compte MAGIA ? Cette action est définitive.")) {
                                                        handleDeleteAccount();
                                                    }
                                                }}
                                                className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                                            >
                                                SUPPRIMER MON COMPTE
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-50 flex justify-end gap-3 flex-shrink-0">
                        <button className="px-8 py-2.5 rounded-xl text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-900 transition-all" onClick={fetchProfile}>ANNULER</button>
                        <button
                            className="px-10 py-2.5 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-blue-900 transition-all disabled:opacity-50"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? "SAUVEGARDE..." : "SAUVEGARDER"}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}

const style = document.createElement('style');
style.innerHTML = `
  @keyframes loading {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(0); }
    100% { transform: translateX(100%); }
  }
`;
document.head.appendChild(style);
