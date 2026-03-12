import { useState } from "react";
import { cn } from "../ui/utils";

const SECTIONS = [
    { id: "profile", label: "Administrateur" },
    { id: "workspace", label: "Workspace" },
    { id: "integrations", label: "Intégrations" },
    { id: "security", label: "Sécurité" },
];

export function SettingsView() {
    const [activeSection, setActiveSection] = useState("profile");

    return (
        <div className="max-w-5xl space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h2 className="magia-h1 uppercase">Paramètre</h2>
                    <p className="magia-subtitle">Configuration des protocoles et accès réseau</p>
                </div>
            </div>

            <div className="flex gap-6 items-start">
                {/* Side Navigation */}
                <div className="w-64 shrink-0 space-y-1 bg-white border border-gray-100 rounded-lg p-2 shadow-sm">
                    {SECTIONS.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-md text-[11px] font-black uppercase tracking-widest transition-all",
                                activeSection === s.id
                                    ? "bg-gray-900 text-white shadow-lg shadow-gray-200"
                                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            <span className="text-sm">{s.icon}</span>
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                    <div className="p-8">
                        {activeSection === "profile" && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="magia-label mb-6 text-indigo-600">IDENTITÉ DU SYSTÈME</h3>
                                    <div className="flex items-center gap-8">
                                        <div className="relative group">
                                            <div className="w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center text-white text-3xl font-serif font-bold shadow-xl overflow-hidden relative">
                                                M
                                                <div className="absolute inset-0 bg-indigo-600/20 group-hover:bg-transparent transition-colors" />
                                            </div>
                                            <button className="absolute -bottom-2 -right-2 p-2 bg-white border border-gray-100 shadow-lg rounded-md hover:scale-110 transition-transform">
                                                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                                            <div className="space-y-1">
                                                <label className="magia-label">Nom Public</label>
                                                <input type="text" defaultValue="Mirahasina" className="w-full px-0 py-2 bg-transparent border-b border-gray-100 focus:border-indigo-600 outline-none text-sm font-black transition-colors font-serif" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email de secours</label>
                                                <input type="email" defaultValue="mirahasina@magia.ai" className="w-full px-0 py-2 bg-transparent border-b border-gray-100 focus:border-indigo-600 outline-none text-sm font-black transition-colors font-serif" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === "workspace" && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6">UNITÉ OPÉRATIONNELLE</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Label du Workspace</label>
                                            <input type="text" defaultValue="Magna Solutions" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-md text-sm font-black font-serif outline-none focus:border-indigo-600 transition-colors" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Localisation Temporelle</label>
                                            <select className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-md text-sm font-black font-serif outline-none focus:border-indigo-600 transition-colors cursor-pointer">
                                                <option>Antananarivo (GMT+3)</option>
                                                <option>Paris (GMT+1)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === "integrations" && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-2">PLUGIN HUB</h3>
                                    <p className="text-[11px] text-gray-400 italic mb-8">Connexions neurales avec outils tiers</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {['Slack', 'HubSpot', 'Salesforce', 'WhatsApp', 'Zendesk', 'Email'].map((app) => (
                                            <div key={app} className="p-5 bg-white border border-gray-100 rounded-lg flex items-center gap-4 hover:border-indigo-200 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden">
                                                <div className="w-10 h-10 bg-gray-50 rounded-md flex items-center justify-center text-sm font-black italic text-gray-300 group-hover:text-indigo-600 transition-colors">
                                                    {app.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest block">{app}</span>
                                                    <span className="text-[8px] text-emerald-500 font-black uppercase">Prêt</span>
                                                </div>
                                                <div className="absolute top-0 right-0 w-1 h-full bg-indigo-600 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === "security" && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="magia-label mb-6 text-indigo-600">PROTOCOLES DE SÉCURITÉ</h3>
                                    <div className="space-y-4">
                                        <div className="p-6 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between group">
                                            <div>
                                                <p className="magia-label text-gray-900 mb-1">Master API Key</p>
                                                <p className="text-[10px] font-mono text-gray-300 group-hover:text-indigo-600 transition-colors uppercase">wk_live_51P2u...8m9z</p>
                                            </div>
                                            <button className="px-5 py-2.5 bg-white border border-gray-100 rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all shadow-sm">RÉGÉNÉRER</button>
                                        </div>
                                        <div className="p-6 bg-gray-900 rounded-lg flex items-center justify-between text-white">
                                            <div>
                                                <p className="magia-label opacity-60 mb-1 text-white">Authentification 2FA</p>
                                                <p className="text-[11px] font-medium italic opacity-80">Protection biométrique activée</p>
                                            </div>
                                            <div className="w-10 h-5 bg-indigo-600 rounded-full flex items-center px-1">
                                                <div className="w-3 h-3 bg-white rounded-full ml-auto shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-50 flex justify-end gap-3">
                        <button className="px-8 py-2.5 rounded-md text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-900 transition-all">ANNULER</button>
                        <button className="px-10 py-2.5 bg-gray-900 text-white rounded-md font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-indigo-600 transition-all">SAUVEGARDER</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
