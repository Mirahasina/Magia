import { useState, useEffect, useRef } from "react";
import { ChevronRight, Target, Mail, Clock, MessageSquare, Zap, Database, Globe, Terminal, FileText, Check, Sparkles, Shield, Plus, Loader2 } from "lucide-react";
import { cn } from "../ui/utils";
import { useAgents } from "../../hooks/useAgents";

export function NewAgentFlow({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) {
    const {
        whatsappConfigs,
        emailConfigs,
        templates,
        createAgent,
        uploadKnowledge,
        deployAgent
    } = useAgents();

    const [step, setStep] = useState(1);
    const [isDeploying, setIsDeploying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [deploymentMessage, setDeploymentMessage] = useState("Initialisation du moteur d'exécution...");
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [config, setConfig] = useState({
        name: "",
        role: "",
        systemPrompt: "",
        llm: "Gemini 1.5 Flash",
        temperature: 0.7,
        channels: [] as string[],
        kb: [] as any[],
        mode: "Auto (seuil)",
        confidence: 85,
        avatar: "/avatars/avatar_1.png",
        whatsapp_config: null as number | null,
        email_config: null as number | null,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDeploy = async () => {
        setIsDeploying(true);
        let execution_mode = 'auto';
        let confidence_threshold = config.confidence;

        if (config.mode === 'Suggest') {
            execution_mode = 'suggest';
            confidence_threshold = 100;
        } else if (config.mode === 'Full Auto') {
            execution_mode = 'full_auto';
            confidence_threshold = 0;
        }

        const agent = await createAgent({
            name: config.name,
            role: config.role,
            system_prompt: config.systemPrompt || config.role,
            llm_model: config.llm,
            channels: config.channels,
            execution_mode,
            confidence_threshold,
            whatsapp_config: config.whatsapp_config,
            email_config: config.email_config,
            is_deployed: false
        });

        if (agent) {
            for (const file of config.kb) {
                await uploadKnowledge(agent.id, file);
            }
            await deployAgent(agent.id);
        }
    };

    useEffect(() => {
        if (isDeploying) {
            const timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(timer);
                        setTimeout(onComplete, 500);
                        return 100;
                    }
                    const next = prev + 1;

                    if (next < 20) setDeploymentMessage("Allocation des ressources serveurs...");
                    else if (next < 40) setDeploymentMessage("Configuration du modèle " + config.llm + "...");
                    else if (next < 60) setDeploymentMessage("Indexation de la base de connaissances...");
                    else if (next < 80) setDeploymentMessage("Sécurisation des points d'accès...");
                    else setDeploymentMessage("Lancement final de l'agent...");

                    return next;
                });
            }, 50);
            return () => clearInterval(timer);
        }
    }, [isDeploying, onComplete, config.llm]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setConfig(prev => ({ ...prev, kb: [...prev.kb, ...files] }));
        }
    };

    if (isDeploying) {
        return (
            <div className="max-w-xl mx-auto py-24 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-blue-50 flex items-center justify-center relative z-10 mx-auto">
                        <Loader2 className="w-12 h-12 text-blue-900 animate-spin" />
                    </div>
                    <div className="absolute inset-0 bg-blue-700/20 rounded-full blur-3xl animate-pulse"></div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Déploiement en cours...</h2>
                    <p className="text-gray-500 font-medium">{deploymentMessage}</p>
                </div>

                <div className="space-y-3">
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden p-1 border border-gray-50 shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-blue-900 to-blue-900 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400 tracking-widest px-1">
                        <span>{progress}% Complété</span>
                        <span>Estimé : {Math.ceil((100 - progress) * 0.05)}s restants</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="flex items-center justify-between mb-12">
                <button onClick={onCancel} className="text-sm font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 flex items-center gap-2 transition-colors">
                    <ChevronRight className="w-3 h-3 rotate-180" />
                    Annuler la création
                </button>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                        <div key={s} className={cn("w-10 h-1 rounded-full transition-all duration-500", s <= step ? "bg-blue-900 shadow-md shadow-blue-100" : "bg-gray-100")} />
                    ))}
                </div>
            </div>

            {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-1">
                        <span className="magia-label text-blue-900">Configuration Initiale / Étape 01</span>
                        <h2 className="magia-h1 uppercase">Architecture Métier</h2>
                        <p className="magia-subtitle italic">Sélectionnez une structure neuronale pré-configurée.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => {
                                    setSelectedTemplate(t);
                                    setConfig({ ...config, name: t.name, role: t.description });
                                    setStep(2);
                                }}
                                className={cn(
                                    "p-8 bg-white border rounded-xl shadow-sm transition-all cursor-pointer group relative overflow-hidden",
                                    selectedTemplate?.id === t.id ? "border-blue-900 ring-4 ring-blue-50" : "border-gray-100 hover:border-blue-200"
                                )}
                            >
                                <div className="p-4 bg-gray-50 rounded-lg mb-6 group-hover:bg-blue-50 transition-colors w-12 h-12 flex items-center justify-center font-black italic text-gray-300 group-hover:text-blue-900">
                                    {t.name.charAt(0)}
                                </div>
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-2">{t.name}</h3>
                                <p className="text-[11px] text-gray-500 mb-6 line-clamp-2 leading-relaxed">{t.description}</p>
                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest border-t border-gray-50 pt-4">
                                    <span className="text-blue-900">{t.estimated_time}s</span>
                                    <span className="text-gray-300">Template</span>
                                </div>
                                <div className="absolute top-0 right-0 w-1 h-full bg-blue-900 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                            </div>
                        ))}
                        <div
                            onClick={() => {
                                setSelectedTemplate({ name: "Custom Agent", estimated_time: 300 });
                                setStep(2);
                            }}
                            className="p-8 bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center text-center hover:bg-white hover:border-blue-700 transition-all cursor-pointer group"
                        >
                            <Plus className="w-8 h-8 text-gray-300 mb-3 group-hover:text-blue-900 transition-colors" />
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-900">Architecture Custom</h3>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-1">
                        <span className="magia-label text-blue-900">Identité / Étape 02</span>
                        <h2 className="magia-h1 uppercase">Persona & Cognition</h2>
                        <p className="magia-subtitle italic">Définissez le spectre d'action et le ton de l'agent.</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-10 shadow-sm space-y-10">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="magia-label">Nom opérationnel</label>
                                    <input
                                        type="text"
                                        value={config.name}
                                        onChange={(e) => setConfig({ ...config, name: e.target.value })}
                                        className="w-full px-0 py-3 bg-transparent border-b border-gray-100 focus:border-blue-900 outline-none text-sm font-black transition-colors font-serif"
                                        placeholder="Ex: SDR Expert"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="magia-label">Cœur Logique (LLM)</label>
                                    <select
                                        value={config.llm}
                                        onChange={(e) => setConfig({ ...config, llm: e.target.value })}
                                        className="w-full px-0 py-3 bg-transparent border-b border-gray-100 focus:border-blue-900 outline-none text-sm font-black transition-colors cursor-pointer"
                                    >
                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                        <option value="gpt-4o">GPT-4o</option>
                                        <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <label className="magia-label">Directives Systèmes (Rôles)</label>
                                <textarea
                                    rows={4}
                                    value={config.role}
                                    onChange={(e) => setConfig({ ...config, role: e.target.value })}
                                    placeholder="Décrivez précisément le rôle et les limites de l'agent..."
                                    className="w-full px-4 py-4 bg-gray-50/50 border border-gray-100 rounded-lg text-sm font-medium leading-relaxed outline-none focus:border-blue-900 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                            <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">Précédent</button>
                            <button onClick={() => setStep(3)} className="px-12 py-3 bg-gray-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-blue-900 transition-all">Suivant</button>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-1">
                        <span className="magia-label text-blue-900">Transmission / Étape 03</span>
                        <h2 className="magia-h1 uppercase">Flux de Communication</h2>
                        <p className="magia-subtitle italic">Activez les canaux de sortie de l'agent.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { id: 'email', name: 'Email Protocol', icon: Mail, configs: emailConfigs },
                            { id: 'whatsapp', name: 'WhatsApp API', icon: MessageSquare, configs: whatsappConfigs },
                        ].map((c: any) => (
                            <div key={c.id} className="space-y-4">
                                <div
                                    onClick={() => {
                                        const newChannels = config.channels.includes(c.id)
                                            ? config.channels.filter(id => id !== c.id)
                                            : [...config.channels, c.id];
                                        setConfig({ ...config, channels: newChannels });
                                    }}
                                    className={cn(
                                        "p-8 rounded-xl border transition-all cursor-pointer flex items-center gap-6 relative overflow-hidden group",
                                        config.channels.includes(c.id) ? "border-blue-900 bg-white" : "border-gray-100 bg-white hover:border-blue-200"
                                    )}
                                >
                                    <div className={cn("p-4 rounded-lg transition-colors", config.channels.includes(c.id) ? "bg-blue-900 text-white" : "bg-gray-50 text-gray-300")}>
                                        <c.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest block">{c.name}</span>
                                        <span className="text-[8px] font-black uppercase text-gray-400">{config.channels.includes(c.id) ? 'Activé' : 'Désactivé'}</span>
                                    </div>
                                    <div className="absolute top-0 right-0 w-1 h-full bg-blue-900 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                                </div>

                                {config.channels.includes(c.id) && c.configs && (
                                    <div className="px-2 animate-in slide-in-from-top-2 duration-300">
                                        <select
                                            value={c.id === 'whatsapp' ? (config.whatsapp_config || '') : (config.email_config || '')}
                                            onChange={(e) => setConfig({ ...config, [c.id === 'whatsapp' ? 'whatsapp_config' : 'email_config']: Number(e.target.value) || null })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-900 transition-all"
                                        >
                                            <option value="">Sélectionner un compte</option>
                                            {c.configs.map((cfg: any) => (
                                                <option key={cfg.id} value={cfg.id}>{cfg.name} ({cfg.phone_number || cfg.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-10">
                        <button onClick={() => setStep(2)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">Précédent</button>
                        <button onClick={() => setStep(4)} className="px-12 py-3 bg-gray-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-blue-900 transition-all">Suivant</button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-1">
                        <span className="magia-label text-blue-900">Mémoire / Étape 04</span>
                        <h2 className="magia-h1 uppercase">Base de Connaissances</h2>
                        <p className="magia-subtitle italic">Importez les données contextuelles pour le moteur RAG.</p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl p-10 shadow-sm space-y-8">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl p-16 bg-gray-50/50 hover:bg-white hover:border-blue-200 transition-all cursor-pointer group"
                        >
                            <Plus className="w-10 h-10 text-gray-300 mb-6 group-hover:text-blue-900 transition-colors" />
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1">Architecture Documentation</p>
                            <p className="text-[9px] text-gray-400 font-medium italic">PDF, DOCX, TXT ou URLs (Max 50MB)</p>
                        </div>

                        {config.kb.length > 0 && (
                            <div className="space-y-3 pt-4">
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest pl-2">Files indexées ({config.kb.length})</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {config.kb.map((f: any, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded shadow-sm text-blue-900"><FileText className="w-4 h-4" /></div>
                                                <span className="text-[10px] font-black text-gray-900 uppercase truncate max-w-[150px]">{f.name}</span>
                                            </div>
                                            <button
                                                onClick={() => setConfig(prev => ({ ...prev, kb: prev.kb.filter((_, i) => i !== idx) }))}
                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-8 border-t border-gray-50">
                            <button onClick={() => setStep(3)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">Précédent</button>
                            <button onClick={() => setStep(5)} className="px-12 py-3 bg-gray-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-blue-900 transition-all">Suivant</button>
                        </div>
                    </div>
                </div>
            )}

            {step === 5 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-1">
                        <span className="magia-label text-blue-900">Autonomie / Étape 05</span>
                        <h2 className="magia-h1 uppercase">Niveau de Contrôle</h2>
                        <p className="magia-subtitle italic">Déterminez le degré de liberté décisionnelle de l'agent.</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { id: 'Suggest', title: 'Mode Suggestion', desc: 'L\'opérateur humain valide chaque réponse. Idéal en phase de rodage.' },
                            { id: 'Auto (seuil)', title: 'Mode Autonome Conditionnel', desc: 'Réponse automatique si le score de confiance est supérieur à 85%.' },
                            { id: 'Full Auto', title: 'Mode Autonomie Totale', desc: 'Traitement instantané sans intervention humaine pour une vélocité maximale.' }
                        ].map((m) => (
                            <div
                                key={m.id}
                                onClick={() => setConfig({ ...config, mode: m.id })}
                                className={cn(
                                    "p-8 rounded-xl border transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden",
                                    config.mode === m.id ? "border-blue-900 bg-white" : "border-gray-100 bg-white hover:border-blue-200"
                                )}
                            >
                                <div className="flex-1">
                                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-2">{m.title}</h4>
                                    <p className="text-[11px] text-gray-500 italic leading-relaxed">{m.desc}</p>
                                </div>
                                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", config.mode === m.id ? "border-blue-900 bg-blue-900" : "border-gray-200")}>
                                    {config.mode === m.id && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="absolute top-0 right-0 w-1 h-full bg-blue-900 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-10">
                        <button onClick={() => setStep(4)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">Précédent</button>
                        <button onClick={() => setStep(7)} className="px-12 py-3 bg-gray-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-blue-900 transition-all">Phase de Lancement</button>
                    </div>
                </div>
            )}

            {step === 7 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-1">
                        <span className="magia-label text-blue-900">Déploiement / Étape Finale</span>
                        <h2 className="magia-h1 uppercase">Initialisation de l'Agent</h2>
                        <p className="magia-subtitle italic">Vérifiez les paramètres de déploiement réseau.</p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl p-10 shadow-sm space-y-12">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
                            {[
                                { label: 'Cluster', value: config.name },
                                { label: 'Modèle', value: config.llm },
                                { label: 'Nexus', value: config.channels.length || 'Web Chat' },
                                { label: 'Mode', value: config.mode, color: 'text-blue-900' }
                            ].map((item, i) => (
                                <div key={i} className="space-y-2">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                                    <p className={cn("text-[10px] font-black uppercase tracking-widest truncate", item.color || "text-gray-900")}>{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="p-12 bg-gray-900 rounded-xl text-center relative overflow-hidden group">
                            <div className="relative z-10 space-y-8">
                                <div className="space-y-2">
                                    <div className="text-4xl font-serif italic text-white flex items-center justify-center gap-2">
                                        98.4<span className="text-blue-700 text-2xl">%</span>
                                    </div>
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Score de Fidélité Cognitive</p>
                                </div>
                                <button
                                    onClick={handleDeploy}
                                    className="px-16 py-4 bg-blue-900 hover:bg-blue-900 text-white rounded-md font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-800/20 transition-all active:scale-95 group"
                                >
                                    DÉPLOYER L'UNITÉ IA
                                    <ChevronRight className="w-4 h-4 inline ml-2 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <p className="text-[9px] font-black text-blue-700/60 uppercase tracking-widest">Temps de synchronisation estimé : 8.2s</p>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-900" />
                            <Shield className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
