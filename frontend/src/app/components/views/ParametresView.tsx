import { API_BASE, getAuthHeaders, getAuthHeadersOnly } from "../../../lib/api";
import { useState, useEffect, useRef } from "react";
import { cn } from "../ui/utils";
import { useAgents } from "../../hooks/useAgents";
import { toast } from "sonner";
import { ModalShell } from "../shared/ModalShell";
import { confirmDialog } from "../shared/ConfirmDialog";
import { PageSpinner } from "../shared/PageSpinner";

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
                toast.error("Erreur lors de la suppression du compte.");
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

    // Poll while QR modal awaits a code or after scan completes
    useEffect(() => {
        if (!qrModalConfig || qrModalConfig.loading) return;
        let cancelled = false;
        const tick = async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/whatsapp-config/${qrModalConfig.id}/get_connection_url/`,
                    { headers: getAuthHeadersOnly() }
                );
                const data = await res.json();
                if (cancelled) return;
                if (data.status === "connected") {
                    setQrModalConfig(null);
                    toast.success("WhatsApp connecté", {
                        description: data.phone_number
                            ? `Numéro : ${data.phone_number}`
                            : "Scan réussi.",
                    });
                    refreshWhatsAppConnection(qrModalConfig.id);
                    return;
                }
                if (data.qr_code && !qrModalConfig.qr_code) {
                    setQrModalConfig((prev) =>
                        prev ? { ...prev, qr_code: data.qr_code, loading: false } : null
                    );
                }
            } catch {
                /* ignore poll errors */
            }
        };
        const id = window.setInterval(tick, 2500);
        tick();
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [qrModalConfig?.id, qrModalConfig?.loading, qrModalConfig?.qr_code]);

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
                    // Must match handleFacebookOAuth redirect_uri exactly
                    const redirectUri =
                        window.location.origin +
                        window.location.pathname +
                        "?facebook_callback=true&view=integration";
                    const res = await exchangeFacebookCode(configId, code, redirectUri);
                    setIsExchangingCode(false);
                    if (res && res.pages) {
                        setFacebookPages(res.pages);
                        if (res.pages.length === 0) {
                            toast.warning("Aucune page Facebook trouvée pour ce compte.");
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

    const [isSavingConfig, setIsSavingConfig] = useState(false);

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
                toast.success(`Page Facebook "${data.page_name}" connectée avec succès !`);
                if (data.webhook_warning) {
                    toast.warning("Webhook Facebook", { description: data.webhook_warning });
                }
                refreshFacebookConnection(activeConfig.id);
                setFacebookPages([]);
                setSelectedPageId("");
                setActiveConfig(null);
            } else {
                toast.error("Échec de la connexion Facebook", { description: data.error || "Token ou ID de page invalide" });
            }
        } catch (err) {
            console.error("Save facebook config failed", err);
            toast.error("Erreur réseau.");
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleFacebookOAuth = async () => {
        if (!activeConfig) return;
        const redirectUri = window.location.origin + window.location.pathname + `?facebook_callback=true&view=integration`;
        const { url, error } = await getFacebookConnectionUrl(activeConfig.id, redirectUri);
        if (url) {
            window.location.href = url;
            return;
        }
        toast.error("Connexion Facebook impossible", {
            description: error || "Vérifiez que FACEBOOK_APP_ID est configuré dans le backend.",
        });
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
                toast.success("Profil mis à jour avec succès !");
            } else {
                const errorData = await res.json();
                console.error("Profile save error", errorData);
                toast.error("Erreur lors de la sauvegarde", { description: JSON.stringify(errorData) || res.statusText });
            }
        } catch (err) {
            console.error("Failed to save profile", err);
            toast.error("Erreur réseau lors de la sauvegarde.");
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
        return <PageSpinner label="Chargement des paramètres…" />;
    }

    return (
        <>
        <div className="h-full flex flex-col magia-page animate-page-fade overflow-hidden">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="magia-title">Paramètres</h1>
                    <p className="magia-subtitle">
                        Identité, unité, plugins et protocoles
                    </p>
                </div>
            </div>

            <div className="flex gap-6 items-start flex-1 overflow-hidden">
                <div className="w-64 shrink-0 space-y-1 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
                    {SECTIONS.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all",
                                activeSection === s.id
                                    ? "bg-gray-900 text-white shadow-lg shadow-gray-200"
                                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-xl"
                            )}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        {activeSection === "profile" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="magia-label mb-6 text-blue-900">IDENTITÉ DU SYSTÈME</h3>
                                    <div className="flex items-center gap-8">
                                        <div className="relative group">
                                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                                            <div onClick={handleAvatarClick} className="w-24 h-24 bg-gray-900 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-xl overflow-hidden relative cursor-pointer">
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
                                                <input name="first_name" value={formData.first_name} onChange={handleChange} type="text" placeholder="Prénom" className="w-full px-0 py-2 bg-transparent border-b border-gray-100 focus:border-blue-900 outline-none text-sm font-semibold transition-colors" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="magia-label">Nom</label>
                                                <input name="last_name" value={formData.last_name} onChange={handleChange} type="text" placeholder="Nom" className="w-full px-0 py-2 bg-transparent border-b border-gray-100 focus:border-blue-900 outline-none text-sm font-semibold transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === "workspace" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-xs font-medium text-blue-900 mb-6">UNITÉ OPÉRATIONNELLE</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-semibold text-gray-400">Label du Workspace</label>
                                            <input name="workspace_label" value={formData.workspace_label} onChange={handleChange} type="text" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm font-semibold outline-none focus:border-blue-900 transition-colors" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-semibold text-gray-400">Localisation Temporelle</label>
                                            <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm font-semibold outline-none focus:border-blue-900 transition-colors cursor-pointer">
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
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-xs font-medium text-blue-900 mb-2">PLUGIN HUB</h3>
                                    <p className="text-sm text-gray-500 mb-8">Connexions neurales avec outils tiers</p>

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
                                                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-lg font-semibold italic text-gray-300 group-hover:text-blue-900 transition-colors">
                                                            {app.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-semibold text-gray-900 block mb-1">{app}</span>
                                                            <span className={cn(
                                                                "text-xs font-medium px-2 py-1 rounded-md",
                                                                isConnected ? "text-emerald-600 bg-emerald-50 border border-emerald-100" : "text-gray-400 bg-gray-50"
                                                            )}>{isConnected ? "Connecté" : "Prêt"}</span>
                                                        </div>
                                                        <div className="absolute top-0 right-0 w-1 h-full bg-blue-900 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                                                    </div>
                                                );
                                            })}
                                            <div className="p-5 bg-gray-50 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-4 text-center opacity-70 cursor-not-allowed">
                                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-lg font-semibold italic text-gray-300">
                                                    L
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-semibold text-gray-500 block mb-1">LinkedIn</span>
                                                    <span className="text-[8px] font-semibold px-2 py-1 rounded-md text-amber-700 bg-amber-50 border border-amber-100">Indisponible</span>
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
                                                            <button onClick={() => setActiveConfig(null)} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                                                Retour aux comptes
                                                            </button>
                                                            <h4 className="text-sm font-bold text-gray-800">Connexion Gmail</h4>
                                                        </div>

                                                        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900">Se connecter avec Google</p>
                                                                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                                                    Seule méthode autorisée : connexion sécurisée via votre compte Google.
                                                                    Aucune configuration SMTP / mot de passe d&apos;application.
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    if (!activeConfig?.id) return;
                                                                    const { url, error } = await getEmailConnectionUrl(activeConfig.id);
                                                                    if (url) {
                                                                        window.location.href = url;
                                                                        return;
                                                                    }
                                                                    toast.error("Connexion Google impossible", {
                                                                        description: error || "Vérifiez GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI dans le .env du backend.",
                                                                    });
                                                                }}
                                                                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl text-sm font-semibold transition shadow-sm"
                                                            >
                                                                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                                                </svg>
                                                                Continuer avec Google
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveConfig(null)}
                                                                className="w-full py-2.5 text-xs font-medium text-gray-500 hover:text-gray-800"
                                                            >
                                                                Annuler
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                                                            <button onClick={() => { setActiveConfig(null); setFacebookPages([]); setSelectedPageId(""); }} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                                                Retour aux pages
                                                            </button>
                                                            <h4 className="text-sm font-bold text-gray-800">Connexion Facebook Messenger</h4>
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
                                                                    <label className="text-[10px] font-semibold text-gray-400 block">Votre Page Facebook</label>
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
                                                                        className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition"
                                                                    >
                                                                        Changer de compte
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const page = facebookPages.find(p => p.id === selectedPageId);
                                                                            if (page) handleSaveFacebookConfig(page.id, page.access_token);
                                                                            else toast.warning("Veuillez sélectionner une page.");
                                                                        }}
                                                                        disabled={isSavingConfig || !selectedPageId}
                                                                        className="px-8 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-medium transition disabled:opacity-50"
                                                                    >
                                                                        {isSavingConfig ? "Connexion..." : "Confirmer la connexion"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-6">
                                                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-xs text-blue-900 space-y-2">
                                                                    <p className="font-bold">Connexion en un clic via Facebook</p>
                                                                    <p className="opacity-90 leading-relaxed">
                                                                        Connectez votre compte, choisissez une Page, puis MAGIA s&apos;abonne au webhook Messenger.
                                                                        En local, exposez le backend (ngrok) et configurez dans Meta Developers :
                                                                    </p>
                                                                    <p className="font-mono text-[10px] bg-white/70 border border-blue-100 rounded-lg px-2 py-1.5 break-all">
                                                                        Callback URL : {window.location.protocol}//{window.location.hostname === 'localhost' ? 'VOTRE_URL_PUBLIQUE' : window.location.host}/api/webhooks/facebook/
                                                                    </p>
                                                                    <p className="opacity-80 text-[10px]">
                                                                        Verify Token : valeur de <code className="bg-white/80 px-1 rounded">FACEBOOK_VERIFY_TOKEN</code> dans le .env backend (défaut : magia_fb_webhook_2024). Champs : messages.
                                                                    </p>
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
                                                        <button onClick={() => { setConfigTarget(null); setActiveConfig(null); }} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors">
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
                                                            className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-blue-900 transition-colors"
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
                                                                                    <p className="text-[10px] font-semibold text-gray-900">{c.name}</p>
                                                                                    <p className="text-[9px] text-gray-400 font-medium italic">{c.phone_number || c.email || (isConnected ? 'Compte lié' : 'Non configuré')}</p>
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center gap-3">
                                                                                {isDirectConfig ? (
                                                                                    <div className="flex items-center gap-3">
                                                                                        {configTarget === 'email' && !isConnected && (
                                                                                            <button
                                                                                                onClick={async () => {
                                                                                                    const { url, error } = await getEmailConnectionUrl(c.id);
                                                                                                    if (url) {
                                                                                                        window.location.href = url;
                                                                                                        return;
                                                                                                    }
                                                                                                    toast.error("Connexion Google impossible", {
                                                                                                        description: error || "Vérifiez les variables Google dans le .env backend.",
                                                                                                    });
                                                                                                }}
                                                                                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all shadow-sm"
                                                                                            >
                                                                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                                                                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                                                                                </svg>
                                                                                                Se connecter avec Google
                                                                                            </button>
                                                                                        )}
                                                                                        {configTarget === 'facebook' && (
                                                                                            <button
                                                                                                onClick={() => setActiveConfig(c)}
                                                                                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium hover:bg-gray-900 hover:text-white transition-all shadow-sm"
                                                                                            >
                                                                                                Configurer
                                                                                            </button>
                                                                                        )}
                                                                                        {isConnected && (
                                                                                            <span className="text-xs font-medium text-emerald-500 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                                                                                                Actif
                                                                                            </span>
                                                                                        )}
                                                                                        <button
                                                                                            onClick={async () => {
                                                                                                if (configTarget === 'email') {
                                                                                                    const ok = await confirmDialog({
                                                                                                        title: "Déconnecter ce compte email ?",
                                                                                                        description: "MAGIA ne pourra plus lire ni envoyer d'emails via ce compte.",
                                                                                                        confirmLabel: "Déconnecter",
                                                                                                        danger: true,
                                                                                                    });
                                                                                                    if (!ok) return;
                                                                                                    deleteEmailConfig(c.id);
                                                                                                } else {
                                                                                                    deleteFacebookConfig(c.id);
                                                                                                }
                                                                                            }}
                                                                                            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-medium hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
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
                                                                                                                // start_session force-restarts Node and waits for QR / reconnect
                                                                                                                const res = await fetch(`${API_BASE}/whatsapp-config/${c.id}/start_session/`, {
                                                                                                                    method: "POST",
                                                                                                                    headers: getAuthHeaders(),
                                                                                                                });
                                                                                                                const data = await res.json();
                                                                                                                if (data.status === "connected") {
                                                                                                                    setQrModalConfig(null);
                                                                                                                    toast.success("WhatsApp déjà connecté", {
                                                                                                                        description: data.phone_number
                                                                                                                            ? `Numéro : ${data.phone_number}`
                                                                                                                            : undefined,
                                                                                                                    });
                                                                                                                    refreshWhatsAppConnection(c.id);
                                                                                                                    return;
                                                                                                                }
                                                                                                                if (data.qr_code || data.status === "qr_ready") {
                                                                                                                    setQrModalConfig({ id: c.id, qr_code: data.qr_code || null, loading: false });
                                                                                                                    return;
                                                                                                                }
                                                                                                                setQrModalConfig({ id: c.id, qr_code: null, loading: false });
                                                                                                            } catch {
                                                                                                                setQrModalConfig(null);
                                                                                                                toast.error("Impossible de récupérer le QR code WhatsApp.");
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
                                                                                                                <div className="w-4 h-4 flex items-center justify-center rounded-sm font-semibold text-[10px] text-white" style={{ backgroundColor: '#25D366' }}>
                                                                                                                    W
                                                                                                                </div>
                                                                                                                <span className="text-[10px] font-bold text-gray-700">Scanner le QR Code</span>
                                                                                                            </>
                                                                                                        )}
                                                                                                    </button>
                                                                                                ) : configTarget === 'linkedin' ? (
                                                                                                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                                                                                                        Non disponible
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <button
                                                                                                        disabled={redirectingIds.includes(c.id)}
                                                                                                        onClick={async () => {
                                                                                                            setRedirectingIds(prev => [...prev, c.id]);
                                                                                                            try {
                                                                                                                const result = await providerInfo.getUrl(c.id);
                                                                                                                const url = typeof result === 'string' ? result : result?.url;
                                                                                                                const error = typeof result === 'object' && result ? result.error : undefined;
                                                                                                                if (url) window.location.assign(url);
                                                                                                                else throw new Error(error || "No URL");
                                                                                                            } catch (err: any) {
                                                                                                                setRedirectingIds(prev => prev.filter(id => id !== c.id));
                                                                                                                toast.error("Impossible d'obtenir l'URL de connexion", { description: err?.message });
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
                                                                                                                <div className="w-4 h-4 flex items-center justify-center rounded-sm font-semibold text-[10px] text-white" style={{ backgroundColor: providerInfo.color }}>
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
                                                                                                <span className="text-xs font-medium text-emerald-500 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                                                                                                    Connecté
                                                                                                </span>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        if (configTarget === 'whatsapp') deleteWhatsAppConfig(c.id);
                                                                                                        else deleteLinkedInConfig(c.id);
                                                                                                    }}
                                                                                                    className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-medium hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
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
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="magia-label mb-6 text-blue-900">PROTOCOLES DE SÉCURITÉ</h3>
                                    <div className="space-y-4">
                                        <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between group">
                                            <div>
                                                <p className="magia-label text-gray-900 mb-1">Master API Key</p>
                                                <p className="text-[10px] font-mono text-gray-300 group-hover:text-blue-900 transition-colors">
                                                    {security?.master_api_key || '••••••••••••••••'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={regenerateMasterKey}
                                                className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-medium hover:bg-gray-900 hover:text-white transition-all shadow-sm"
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
                                                <h3 className="text-sm font-bold text-red-900">Zone Danger</h3>
                                                <p className="text-[11px] text-red-600 font-medium italic">
                                                    La suppression du compte est irréversible. Toutes vos données seront effacées.
                                                </p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const ok = await confirmDialog({
                                                        title: "Supprimer votre compte MAGIA ?",
                                                        description: "Cette action est définitive. Toutes vos données (agents, conversations, connaissances) seront effacées.",
                                                        confirmLabel: "Supprimer définitivement",
                                                        danger: true,
                                                    });
                                                    if (ok) handleDeleteAccount();
                                                }}
                                                className="px-6 py-3 bg-red-600 text-white rounded-xl text-xs font-medium hover:bg-red-700 transition-all shadow-lg shadow-red-200"
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
                        <button className="px-8 py-2.5 rounded-xl text-gray-400 magia-button hover:text-gray-900 transition-all" onClick={fetchProfile}>ANNULER</button>
                        <button
                            className="px-10 py-2.5 bg-gray-900 text-white rounded-xl magia-button shadow-xl shadow-gray-200 hover:bg-blue-900 transition-all disabled:opacity-50"
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
            <ModalShell
                title="Connecter WhatsApp"
                onClose={() => {
                    const id = qrModalConfig.id;
                    setQrModalConfig(null);
                    // Session may finish connecting in background after close
                    refreshWhatsAppConnection(id);
                }}
                className="max-w-sm"
            >
                <div className="bg-white rounded-3xl shadow-2xl p-8 w-full flex flex-col items-center gap-6">
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900">Connecter WhatsApp</h3>
                            <p className="text-[10px] text-gray-400 mt-1">Scannez avec l'application WhatsApp</p>
                        </div>
                        <button
                            onClick={() => {
                                const id = qrModalConfig.id;
                                setQrModalConfig(null);
                                refreshWhatsAppConnection(id);
                            }}
                            aria-label="Fermer"
                            className="p-2 hover:bg-gray-100 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40"
                        >
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
                                <p className="text-[10px] font-bold text-green-800 mb-1">Instructions</p>
                                <p className="text-[11px] text-green-700 leading-relaxed">
                                    Ouvrez WhatsApp → <strong>Appareils liés</strong> → <strong>Lier un appareil</strong> → Scannez ce code
                                </p>
                            </div>
                            <button
                                onClick={async () => {
                                    setQrModalConfig(prev => prev ? { ...prev, loading: true } : null);
                                    try {
                                        const res = await fetch(`${API_BASE}/whatsapp-config/${qrModalConfig.id}/get_connection_url/`, { headers: getAuthHeadersOnly() });
                                        const data = await res.json();
                                        if (data.status === 'connected') {
                                            setQrModalConfig(null);
                                            toast.success("WhatsApp connecté");
                                            refreshWhatsAppConnection(qrModalConfig.id);
                                        } else {
                                            setQrModalConfig(prev => prev ? { ...prev, qr_code: data.qr_code || prev.qr_code, loading: false } : null);
                                        }
                                    } catch {
                                        setQrModalConfig(prev => prev ? { ...prev, loading: false } : null);
                                    }
                                }}
                                className="w-full px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-medium transition"
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
                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                Aucune connexion automatique. Attendez le QR puis scannez-le avec WhatsApp
                                (Appareils liés → Lier un appareil).
                            </p>
                            <button
                                onClick={async () => {
                                    setQrModalConfig(prev => prev ? { ...prev, loading: true } : null);
                                    try {
                                        const res = await fetch(`${API_BASE}/whatsapp-config/${qrModalConfig.id}/get_connection_url/`, { headers: getAuthHeadersOnly() });
                                        const data = await res.json();
                                        if (data.status === "connected") {
                                            setQrModalConfig(null);
                                            toast.success("WhatsApp connecté", {
                                                description: data.phone_number
                                                    ? `Numéro : ${data.phone_number}`
                                                    : "Scan réussi.",
                                            });
                                            refreshWhatsAppConnection(qrModalConfig.id);
                                            return;
                                        }
                                        setQrModalConfig(prev => prev ? {
                                            ...prev,
                                            qr_code: data.qr_code || null,
                                            loading: false,
                                        } : null);
                                    } catch {
                                        setQrModalConfig(prev => prev ? { ...prev, loading: false } : null);
                                    }
                                }}
                                className="px-6 py-2.5 bg-gray-900 hover:bg-blue-900 text-white rounded-xl text-xs font-medium transition"
                            >
                                Actualiser
                            </button>
                        </div>
                    )}
                </div>
            </ModalShell>
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
