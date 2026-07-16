import { API_BASE, getAuthHeadersOnly } from "../../../lib/api";
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
            const res = await fetch(`${API_BASE}/auth/me/`, {
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
    const [qrModalConfig, setQrModalConfig] = useState<{ id: number; qr_code: string | null; loading: boolean } | null>(null);

    const {
        whatsappConfigs, addWhatsAppConfig, deleteWhatsAppConfig, getWhatsAppConnectionUrl, refreshWhatsAppConnection,
        emailConfigs, addEmailConfig, deleteEmailConfig, getEmailConnectionUrl, refreshEmailConnection,
        linkedinConfigs, addLinkedInConfig, deleteLinkedInConfig, getLinkedInConnectionUrl, refreshLinkedInConnection,
        facebookConfigs, addFacebookConfig, deleteFacebookConfig, getFacebookConnectionUrl, exchangeFacebookCode, refreshFacebookConnection,
        securitySettings, fetchSecuritySettings, regenerateMasterKey, toggle2FA
    } = useAgents();

    const security = securitySettings as any;

    const [facebookPages, setFacebookPages] = useState<any[]>([]);
    const [isExchangingCode, setIsExchangingCode] = useState(false);
    const [selectedPageId, setSelectedPageId] = useState("");

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const tab = urlParams.get('tab');
        const idStr = urlParams.get('id');

        if (status === 'success' && tab) {
            const configsMap = {
                linkedin: { refresh: refreshLinkedInConnection },
                whatsapp: { refresh: refreshWhatsAppConnection },
                facebook: { refresh: refreshFacebookConnection },
                email: { refresh: refreshEmailConnection },
                gmail: { refresh: refreshEmailConnection }
            };
            const configs = configsMap[tab as keyof typeof configsMap];

            if (configs && idStr) {
                const id = parseInt(idStr, 10);
                if (!isNaN(id)) {
                    configs.refresh(id);
                }
            }

            const newUrl = window.location.pathname + (urlParams.get('view') ? `?view=${urlParams.get('view')}` : '');
            window.history.replaceState({}, document.title, newUrl);
        }

        // Facebook OAuth Callback Detection
        const fbCallback = urlParams.get('facebook_callback');
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (fbCallback && code && state) {
            const configId = parseInt(state, 10);
            if (!isNaN(configId)) {
                setConfigTarget('facebook');
                const targetConfig = facebookConfigs.find((c: any) => c.id === configId);
                if (targetConfig) {
                    setActiveConfig(targetConfig);
                } else {
                    setActiveConfig({ id: configId, name: 'Facebook' });
                }

                const exchange = async () => {
                    setIsExchangingCode(true);
                    const redirectUri = window.location.origin + window.location.pathname + '?facebook_callback=true';
                    const res = await exchangeFacebookCode(configId, code, redirectUri);
                    setIsExchangingCode(false);
                    if (res && res.pages) {
                        setFacebookPages(res.pages);
                        if (res.pages.length === 0) {
                            alert("Aucune page Facebook trouvée pour ce compte.");
                        }
                    }
                };
                exchange();
            }

            const newUrl = window.location.pathname + (urlParams.get('view') ? `?view=${urlParams.get('view')}` : '');
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [facebookConfigs]);

    const [configTarget, setConfigTarget] = useState<"whatsapp" | "email" | "linkedin" | "facebook" | null>(null);
    const [activeConfig, setActiveConfig] = useState<any>(null);

    const [emailForm, setEmailForm] = useState({
        name: "",
        email: "",
        password: "",
        imap_server: "",
        smtp_server: "",
    });

    const [fbForm, setFbForm] = useState({
        name: "",
        page_id: "",
        page_access_token: "",
    });

    const [isTestingEmail, setIsTestingEmail] = useState(false);
    const [emailTestResult, setEmailTestResult] = useState<any>(null);
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    useEffect(() => {
        if (activeConfig) {
            if (configTarget === 'email') {
                setEmailForm({
                    name: activeConfig.name || "",
                    email: activeConfig.email || "",
                    password: "",
                    imap_server: activeConfig.imap_server || "",
                    smtp_server: activeConfig.smtp_server || "",
                });
                setEmailTestResult(null);
            } else if (configTarget === 'facebook') {
                setFbForm({
                    name: activeConfig.name || "",
                    page_id: activeConfig.page_id || "",
                    page_access_token: activeConfig.page_access_token || "",
                });
            }
        }
    }, [activeConfig, configTarget]);

    const applyEmailPreset = (provider: 'gmail' | 'outlook' | 'yahoo') => {
        const presets = {
            gmail: {
                imap_server: "imap.gmail.com",
                smtp_server: "smtp.gmail.com",
            },
            outlook: {
                imap_server: "outlook.office365.com",
                smtp_server: "smtp-mail.outlook.com",
            },
            yahoo: {
                imap_server: "imap.mail.yahoo.com",
                smtp_server: "smtp.mail.yahoo.com",
            }
        };
        setEmailForm(prev => ({
            ...prev,
            ...presets[provider]
        }));
    };

    const handleTestEmailConnection = async () => {
        if (!activeConfig) return;
        setIsTestingEmail(true);
        setEmailTestResult(null);
        try {
            // First patch current details (excluding password if blank)
            const patchData: any = { ...emailForm };
            if (!patchData.password) delete patchData.password;

            await fetch(`${API_BASE}/email-config/${activeConfig.id}/`, {
                method: "PATCH",
                headers: {
                    ...getAuthHeadersOnly(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(patchData)
            });

            // Run connection test
            const res = await fetch(`${API_BASE}/email-config/${activeConfig.id}/test_connection/`, {
                method: "POST",
                headers: {
                    ...getAuthHeadersOnly(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ password: emailForm.password || undefined })
            });
            const data = await res.json();
            setEmailTestResult(data);
        } catch (err) {
            console.error("Test email config failed", err);
            alert("Erreur lors du test de connexion.");
        } finally {
            setIsTestingEmail(false);
        }
    };

    const handleSaveEmailConfig = async () => {
        if (!activeConfig) return;
        setIsSavingConfig(true);
        try {
            const patchData: any = { ...emailForm };
            if (!patchData.password) delete patchData.password;

            const resSave = await fetch(`${API_BASE}/email-config/${activeConfig.id}/`, {
                method: "PATCH",
                headers: {
                    ...getAuthHeadersOnly(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(patchData)
            });
            if (!resSave.ok) {
                alert("Erreur lors de l'enregistrement de la configuration.");
                return;
            }

            const resConfig = await fetch(`${API_BASE}/email-config/${activeConfig.id}/configure/`, {
                method: "POST",
                headers: {
                    ...getAuthHeadersOnly(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(emailForm)
            });
            if (resConfig.ok) {
                alert("Configuration Email enregistrée et activée avec succès !");
                refreshEmailConnection(activeConfig.id);
                setActiveConfig(null);
            } else {
                const data = await resConfig.json();
                alert("Erreur de configuration : " + (data.error || "Vérifiez vos paramètres"));
            }
        } catch (err) {
            console.error("Save email config failed", err);
            alert("Erreur réseau.");
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleSaveFacebookConfig = async (page_id: string, page_access_token: string) => {
        if (!activeConfig) return;
        setIsSavingConfig(true);
        try {
            const res = await fetch(`${API_BASE}/facebook-config/${activeConfig.id}/configure/`, {
                method: "POST",
                headers: {
                    ...getAuthHeadersOnly(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ page_id, page_access_token })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`"message":"Page Facebook "${data.page_name}" connectée avec succès !"}`);
                refreshFacebookConnection(activeConfig.id);
                setFacebookPages([]);
                setSelectedPageId("");
                setActiveConfig(null);
            } else {
                alert("Échec de la connexion : " + (data.error || "Token ou ID de page invalide"));
            }
        } catch (err) {
            console.error("Save facebook config failed", err);
            alert("Erreur réseau.");
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleFacebookOAuth = async () => {
        if (!activeConfig) return;
        const redirectUri = window.location.origin + window.location.pathname + `?facebook_callback=true&view=integration`;
        const url = await getFacebookConnectionUrl(activeConfig.id, redirectUri);
        if (url) {
            window.location.href = url;
        } else {
            alert("Impossible d'obtenir l'URL de connexion Facebook. Vérifiez que FACEBOOK_APP_ID est configuré dans le backend.");
        }
    };

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
            const res = await fetch(`${API_BASE}/auth/me/`, {
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

            const res = await fetch(`${API_BASE}/auth/me/`, {
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
        <>
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
                                            {['WhatsApp', 'Email', 'Facebook'].map((app) => {
                                                const configs =
                                                    app === 'WhatsApp' ? whatsappConfigs :
                                                        (app === 'Email' ? emailConfigs : facebookConfigs);

                                                const isConnected = configs && configs.some((c: any) => c.is_connected || c.is_active);

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
                                            <div className="p-5 bg-gray-50 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-4 text-center opacity-70 cursor-not-allowed">
                                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-lg font-black italic text-gray-300">
                                                    L
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">LinkedIn</span>
                                                    <span className="text-[8px] font-black uppercase px-2 py-1 rounded-md text-amber-700 bg-amber-50 border border-amber-100">Indisponible</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {activeConfig ? (
                                                /* RENDER DIRECT CONFIGURATION FORM */
                                                configTarget === 'email' ? (
                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                                                            <button onClick={() => setActiveConfig(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                                                Retour aux comptes
                                                            </button>
                                                            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Configuration SMTP / IMAP</h4>
                                                        </div>

                                                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-4 text-xs text-blue-900 flex flex-col gap-2">
                                                            <p className="font-bold">💡 Configuration rapide & Presets</p>
                                                            <p className="opacity-90">Cliquez sur un bouton ci-dessous pour pré-remplir les serveurs d'envoi et de réception :</p>
                                                            <div className="flex gap-2 mt-2">
                                                                {['Gmail', 'Outlook', 'Yahoo'].map(provider => (
                                                                    <button
                                                                        key={provider}
                                                                        type="button"
                                                                        onClick={() => applyEmailPreset(provider.toLowerCase() as any)}
                                                                        className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm text-[10px] uppercase tracking-wider transition-all"
                                                                    >
                                                                        {provider}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <p className="mt-3 text-[10px] opacity-80 leading-relaxed">
                                                                * Pour <strong>Gmail</strong> et d'autres fournisseurs sécurisés, vous devez impérativement générer et utiliser un <strong>Mot de passe d'application</strong> (App Password) dans les options de sécurité de votre compte, et non votre mot de passe habituel.
                                                            </p>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Nom de la configuration</label>
                                                                <input
                                                                    type="text"
                                                                    value={emailForm.name}
                                                                    onChange={e => setEmailForm(prev => ({ ...prev, name: e.target.value }))}
                                                                    placeholder="Ex: Mon adresse Gmail"
                                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-900 transition"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Adresse Email</label>
                                                                <input
                                                                    type="email"
                                                                    value={emailForm.email}
                                                                    onChange={e => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                                                                    placeholder="adresse@domaine.com"
                                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-900 transition"
                                                                />
                                                            </div>
                                                            <div className="space-y-2 md:col-span-2">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Mot de passe / Mot de passe d'application</label>
                                                                <input
                                                                    type="password"
                                                                    value={emailForm.password}
                                                                    onChange={e => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                                                                    placeholder="••••••••••••••••"
                                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-900 transition font-mono"
                                                                />
                                                                <span className="text-[9px] text-gray-400 italic">Laissez vide pour conserver le mot de passe enregistré.</span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Serveur IMAP (Réception)</label>
                                                                <input
                                                                    type="text"
                                                                    value={emailForm.imap_server}
                                                                    onChange={e => setEmailForm(prev => ({ ...prev, imap_server: e.target.value }))}
                                                                    placeholder="imap.gmail.com"
                                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-900 transition"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Serveur SMTP (Envoi)</label>
                                                                <input
                                                                    type="text"
                                                                    value={emailForm.smtp_server}
                                                                    onChange={e => setEmailForm(prev => ({ ...prev, smtp_server: e.target.value }))}
                                                                    placeholder="smtp.gmail.com"
                                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-900 transition"
                                                                />
                                                            </div>
                                                        </div>

                                                        {emailTestResult && (
                                                            <div className={cn(
                                                                "p-4 border rounded-xl text-xs flex flex-col gap-2 mt-4",
                                                                emailTestResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-red-50 border-red-200 text-red-950"
                                                            )}>
                                                                <p className="font-bold flex items-center gap-1.5">
                                                                    {emailTestResult.success ? "✓ Connexion réussie !" : "✗ Échec de connexion"}
                                                                </p>
                                                                <div className="grid grid-cols-2 gap-4 mt-1">
                                                                    <div>
                                                                        <span className="font-semibold block">IMAP (Réception) :</span>
                                                                        <span className="capitalize">{emailTestResult.imap?.status === 'success' ? 'OK' : `Échec (${emailTestResult.imap?.message || 'Inconnu'})`}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-semibold block">SMTP (Envoi) :</span>
                                                                        <span className="capitalize">{emailTestResult.smtp?.status === 'success' ? 'OK' : `Échec (${emailTestResult.smtp?.message || 'Inconnu'})`}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex gap-3 mt-6 justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveConfig(null)}
                                                                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                                                            >
                                                                Annuler
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleTestEmailConnection}
                                                                disabled={isTestingEmail}
                                                                className="px-6 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50"
                                                            >
                                                                {isTestingEmail ? "Test en cours..." : "Tester la connexion"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleSaveEmailConfig}
                                                                disabled={isSavingConfig}
                                                                className="px-8 py-2.5 bg-gray-900 hover:bg-blue-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50"
                                                            >
                                                                {isSavingConfig ? "Sauvegarde..." : "Enregistrer & Activer"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                                                            <button onClick={() => { setActiveConfig(null); setFacebookPages([]); setSelectedPageId(""); }} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                                                Retour aux pages
                                                            </button>
                                                            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Connexion Facebook Messenger</h4>
                                                        </div>

                                                        {isExchangingCode ? (
                                                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                                                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                                <p className="text-sm text-gray-500 font-medium">Récupération de vos pages Facebook...</p>
                                                            </div>
                                                        ) : facebookPages.length > 0 ? (
                                                            <div className="space-y-4">
                                                                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-xs text-green-800">
                                                                    <p className="font-bold mb-1">✅ Compte Facebook connecté</p>
                                                                    <p>Sélectionnez la page à associer à MAGIA pour la messagerie.</p>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Votre Page Facebook</label>
                                                                    <select
                                                                        value={selectedPageId}
                                                                        onChange={e => setSelectedPageId(e.target.value)}
                                                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-900 transition"
                                                                    >
                                                                        <option value="">-- Choisir une page --</option>
                                                                        {facebookPages.map(p => (
                                                                            <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div className="flex gap-3 mt-4 justify-end">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setFacebookPages([]); setSelectedPageId(""); }}
                                                                        className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                                                                    >
                                                                        Changer de compte
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const page = facebookPages.find(p => p.id === selectedPageId);
                                                                            if (page) handleSaveFacebookConfig(page.id, page.access_token);
                                                                            else alert("Veuillez sélectionner une page.");
                                                                        }}
                                                                        disabled={isSavingConfig || !selectedPageId}
                                                                        className="px-8 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50"
                                                                    >
                                                                        {isSavingConfig ? "Connexion..." : "Confirmer la connexion"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-6">
                                                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-xs text-blue-900 space-y-2">
                                                                    <p className="font-bold">📘 Connexion en un clic via Facebook</p>
                                                                    <p className="opacity-90 leading-relaxed">Cliquez sur le bouton ci-dessous pour vous connecter à votre compte Facebook. Vous serez redirigé vers Facebook pour autoriser l'accès à vos pages, puis MAGIA récupérera automatiquement la liste de vos pages disponibles.</p>
                                                                    <p className="opacity-75">⚠️ Assurez-vous que <strong>FACEBOOK_APP_ID</strong> et <strong>FACEBOOK_APP_SECRET</strong> sont bien configurés dans le fichier <code className="bg-blue-100 px-1 rounded">.env</code> du backend.</p>
                                                                </div>

                                                                <div className="flex flex-col items-center gap-4 py-6">
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleFacebookOAuth}
                                                                        className="flex items-center gap-3 px-8 py-4 bg-[#1877F2] hover:bg-[#166FE5] active:bg-[#1464D2] text-white rounded-2xl text-sm font-bold transition-all shadow-lg hover:shadow-xl active:scale-95"
                                                                    >
                                                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                                                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                                        </svg>
                                                                        Se connecter avec Facebook
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setActiveConfig(null); setFacebookPages([]); }}
                                                                        className="text-xs text-gray-400 hover:text-gray-700 transition underline"
                                                                    >
                                                                        Annuler
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <button onClick={() => { setConfigTarget(null); setActiveConfig(null); }} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                                            Retour au Hub
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (configTarget === 'whatsapp') await addWhatsAppConfig({ name: 'Nouveau WhatsApp' });
                                                                else if (configTarget === 'email') await addEmailConfig({ name: 'Nouveau Email' });
                                                                else if (configTarget === 'linkedin') await addLinkedInConfig({ name: 'Nouveau LinkedIn' });
                                                                else if (configTarget === 'facebook') await addFacebookConfig({ name: 'Nouveau Facebook' });
                                                            }}
                                                            className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-900 transition-colors"
                                                        >
                                                            + Nouveau {configTarget === 'whatsapp' ? 'Numéro' : (configTarget === 'email' ? 'Compte' : (configTarget === 'linkedin' ? 'Accès' : 'Compte'))}
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

                                                                    const isDirectConfig = configTarget === 'email' || configTarget === 'facebook';

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
                                                                                {isDirectConfig ? (
                                                                                    <div className="flex items-center gap-3">
                                                                                        <button
                                                                                            onClick={() => setActiveConfig(c)}
                                                                                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all shadow-sm"
                                                                                        >
                                                                                            Configurer
                                                                                        </button>
                                                                                        {isConnected && (
                                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                                                                                                Actif
                                                                                            </span>
                                                                                        )}
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                if (configTarget === 'email') deleteEmailConfig(c.id);
                                                                                                else deleteFacebookConfig(c.id);
                                                                                            }}
                                                                                            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                                                                                        >
                                                                                            Supprimer
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <>
                                                                                        {!isConnected ? (
                                                                                            <div className="flex flex-col gap-2 items-end">
                                                                                                {configTarget === 'whatsapp' ? (
                                                                                                    <button
                                                                                                        disabled={qrModalConfig?.loading}
                                                                                                        onClick={async () => {
                                                                                                            setQrModalConfig({ id: c.id, qr_code: null, loading: true });
                                                                                                            try {
                                                                                                                const res = await fetch(`${(await import('../../../lib/api')).API_BASE}/whatsapp-config/${c.id}/get_connection_url/`, { headers: (await import('../../../lib/api')).getAuthHeadersOnly() });
                                                                                                                const data = await res.json();
                                                                                                                setQrModalConfig({ id: c.id, qr_code: data.qr_code || null, loading: false });
                                                                                                            } catch {
                                                                                                                setQrModalConfig(null);
                                                                                                                alert("Impossible de récupérer le QR code WhatsApp.");
                                                                                                            }
                                                                                                        }}
                                                                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-green-300 transition-all group min-w-[180px] justify-center disabled:opacity-50"
                                                                                                    >
                                                                                                        {qrModalConfig?.loading && qrModalConfig.id === c.id ? (
                                                                                                            <div className="flex items-center gap-2 text-green-700">
                                                                                                                <div className="w-3 h-3 border-2 border-green-700 border-t-transparent animate-spin rounded-full"></div>
                                                                                                                <span className="text-[10px] font-bold">Chargement QR...</span>
                                                                                                            </div>
                                                                                                        ) : (
                                                                                                            <>
                                                                                                                <div className="w-4 h-4 flex items-center justify-center rounded-sm font-black text-[10px] text-white" style={{ backgroundColor: '#25D366' }}>
                                                                                                                    W
                                                                                                                </div>
                                                                                                                <span className="text-[10px] font-bold text-gray-700">Scanner le QR Code</span>
                                                                                                            </>
                                                                                                        )}
                                                                                                    </button>
                                                                                                ) : configTarget === 'linkedin' ? (
                                                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                                                                                                        Non disponible
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <button
                                                                                                        disabled={redirectingIds.includes(c.id)}
                                                                                                        onClick={async () => {
                                                                                                            setRedirectingIds(prev => [...prev, c.id]);
                                                                                                            try {
                                                                                                                const url = await providerInfo.getUrl(c.id);
                                                                                                                if (url) window.location.assign(url);
                                                                                                                else throw new Error("No URL");
                                                                                                            } catch {
                                                                                                                setRedirectingIds(prev => prev.filter(id => id !== c.id));
                                                                                                                alert("Impossible d'obtenir l'URL de connexion.");
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
                                                                                                                <span className="text-[10px] font-bold text-gray-700">Connecter</span>
                                                                                                            </>
                                                                                                        )}
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex items-center gap-3">
                                                                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                                                                                                    Connecté
                                                                                                </span>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        if (configTarget === 'whatsapp') deleteWhatsAppConfig(c.id);
                                                                                                        else deleteLinkedInConfig(c.id);
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
                                                                                                else deleteLinkedInConfig(c.id);
                                                                                            }}
                                                                                            className={cn("p-2 text-gray-300 hover:text-red-500 transition-colors", isConnected && "hidden")}
                                                                                        >
                                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                    </div>
                                                </>
                                            )}
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
                                                    {security?.master_api_key || '••••••••••••••••'}
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
                                                    {security?.is_2fa_enabled ? "Protection biométrique activée" : "Protection non activée"}
                                                </p>
                                            </div>
                                            <div
                                                onClick={() => toggle2FA(!security?.is_2fa_enabled)}
                                                className={`w-10 h-5 rounded-full flex items-center px-1 cursor-pointer transition-colors ${security?.is_2fa_enabled ? 'bg-blue-900' : 'bg-gray-700'}`}
                                            >
                                                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${security?.is_2fa_enabled ? 'ml-auto' : ''}`} />
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

        {qrModalConfig && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-6">
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Connecter WhatsApp</h3>
                            <p className="text-[10px] text-gray-400 mt-1">Scannez avec l'application WhatsApp</p>
                        </div>
                        <button onClick={() => setQrModalConfig(null)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    {qrModalConfig.loading ? (
                        <div className="flex flex-col items-center gap-3 py-8">
                            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-gray-500">Génération du QR code...</p>
                        </div>
                    ) : qrModalConfig.qr_code ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl shadow-inner">
                                <img src={qrModalConfig.qr_code} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
                            </div>
                            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                                <p className="text-[10px] font-bold text-green-800 uppercase tracking-widest mb-1">Instructions</p>
                                <p className="text-[11px] text-green-700 leading-relaxed">
                                    Ouvrez WhatsApp → <strong>Appareils liés</strong> → <strong>Lier un appareil</strong> → Scannez ce code
                                </p>
                            </div>
                            <button
                                onClick={async () => {
                                    setQrModalConfig(prev => prev ? { ...prev, loading: true } : null);
                                    try {
                                        const { API_BASE, getAuthHeadersOnly } = await import('../../../lib/api');
                                        const res = await fetch(`${API_BASE}/whatsapp-config/${qrModalConfig.id}/get_connection_url/`, { headers: getAuthHeadersOnly() });
                                        const data = await res.json();
                                        if (data.status === 'connected') {
                                            setQrModalConfig(null);
                                            refreshWhatsAppConnection(qrModalConfig.id);
                                        } else {
                                            setQrModalConfig(prev => prev ? { ...prev, qr_code: data.qr_code || prev.qr_code, loading: false } : null);
                                        }
                                    } catch {
                                        setQrModalConfig(prev => prev ? { ...prev, loading: false } : null);
                                    }
                                }}
                                className="w-full px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                            >
                                Vérifier la connexion
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <div className="w-12 h-12 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <p className="text-sm font-bold text-gray-800">QR code en cours de génération</p>
                            <p className="text-[11px] text-gray-500 leading-relaxed">Le service WhatsApp génère votre QR code. Veuillez patienter quelques secondes puis réessayer.</p>
                            <button
                                onClick={async () => {
                                    setQrModalConfig(prev => prev ? { ...prev, loading: true } : null);
                                    try {
                                        const { API_BASE, getAuthHeadersOnly } = await import('../../../lib/api');
                                        const res = await fetch(`${API_BASE}/whatsapp-config/${qrModalConfig.id}/get_connection_url/`, { headers: getAuthHeadersOnly() });
                                        const data = await res.json();
                                        setQrModalConfig(prev => prev ? { ...prev, qr_code: data.qr_code || null, loading: false } : null);
                                    } catch {
                                        setQrModalConfig(prev => prev ? { ...prev, loading: false } : null);
                                    }
                                }}
                                className="px-6 py-2.5 bg-gray-900 hover:bg-blue-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                            >
                                Actualiser
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
    </>
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
