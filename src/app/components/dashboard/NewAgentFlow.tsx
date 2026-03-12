import { useState, useEffect } from "react";
import { ChevronRight, Target, Mail, Clock, MessageSquare, Zap, Database, Globe, Terminal, FileText, Check, Sparkles, Shield, Plus, Loader2 } from "lucide-react";
import { cn } from "../ui/utils";

export function NewAgentFlow({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) {
    const [step, setStep] = useState(1);
    const [isDeploying, setIsDeploying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [deploymentMessage, setDeploymentMessage] = useState("Initialisation du moteur d'exécution...");
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [config, setConfig] = useState({
        name: "",
        role: "",
        systemPrompt: "",
        llm: "GPT-4o (Recommandé)",
        temperature: 0.7,
        channels: [] as string[],
        kb: [] as string[],
        mode: "Auto (seuil)",
        confidence: 85,
        avatar: "/avatars/avatar_1.png"
    });

    const templates = [
        { id: "lead_qualifier", name: "Qualificateur de leads pro", desc: "Qualification et scoring des leads entrants", time: "90 sec", mode: "Auto 85%" },
        { id: "email_responder", name: "Répondeur d'email", desc: "Réponses email avec ton de marque", time: "2 min", mode: "Auto 85%" },
        { id: "meeting_setter", name: "Prise de RDV expert", desc: "Planification automatique des réunions", time: "2 min", mode: "Suggest" },
        { id: "whatsapp_sales", name: "Ventes whatsApp", desc: "Prospection et suivi sur WhatsApp", time: "3 min", mode: "Suggest" },
        { id: "follow_up", name: "Agent de relance", desc: "Relances intelligentes et personnalisées", time: "90 sec", mode: "Auto 85%" },
        { id: "crm_enricher", name: "Enrichisseur CRM", desc: "Enrichessement automatique des données client", time: "2 min", mode: "Full Auto" },
    ];

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

                    // Dynamic messages based on progress
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

    if (isDeploying) {
        return (
            <div className="max-w-xl mx-auto py-24 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-blue-50 flex items-center justify-center relative z-10 mx-auto">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    </div>
                    <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Déploiement en cours...</h2>
                    <p className="text-gray-500 font-medium">{deploymentMessage}</p>
                </div>

                <div className="space-y-3">
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden p-1 border border-gray-50 shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[11px] font-black uppercase text-gray-400 tracking-widest px-1">
                        <span>{progress}% Complété</span>
                        <span>Estimé : {Math.ceil((100 - progress) * 0.05)}s restants</span>
                    </div>
                </div>

                <div className="pt-8 grid grid-cols-2 gap-4 text-left">
                    <div className="p-4 bg-white border border-gray-100 rounded-xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs font-bold text-gray-900">Infrastructure prête</span>
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-xl flex items-center gap-3 opacity-50">
                        <div className={cn("w-2 h-2 rounded-full", progress > 40 ? "bg-green-500" : "bg-gray-300")} />
                        <span className="text-xs font-bold text-gray-900">LLM Connecté</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8">
            {/* Standard Header with 7 steps progress */}
            <div className="flex items-center justify-between mb-12">
                <button onClick={onCancel} className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Annuler la création
                </button>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                        <div key={s} className={cn("w-10 h-1 rounded-full", s <= step ? "bg-blue-600" : "bg-gray-100")} />
                    ))}
                </div>
            </div>

            {/* Step 1: Template Selection */}
            {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="magia-label text-blue-600">Étape 01</span>
                            {selectedTemplate && <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">Estimé: {selectedTemplate.time}</span>}
                        </div>
                        <h2 className="magia-h2">Moteur d'Agents IA</h2>
                        <p className="magia-subtitle">Choisissez un template vertical pour démarrer en moins de 2 minutes.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => {
                                    setSelectedTemplate(t);
                                    setConfig({ ...config, name: t.name, role: t.desc });
                                    setStep(2);
                                }}
                                className={cn(
                                    "p-6 bg-white border rounded-xl shadow-sm transition-all cursor-pointer group",
                                    selectedTemplate?.id === t.id ? "border-blue-600 ring-4 ring-blue-50" : "border-gray-100 hover:border-blue-200"
                                )}
                            >
                                <div className="p-3 bg-gray-50 rounded-xl mb-4 group-hover:bg-blue-50 transition-colors bg-white border border-gray-50 w-fit">
                                    {t.icon}
                                </div>
                                <h3 className="font-bold text-gray-900 mb-1">{t.name}</h3>
                                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{t.desc}</p>
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                                    <span className="text-blue-600">{t.mode}</span>
                                    <span className="text-gray-400">{t.time}</span>
                                </div>
                            </div>
                        ))}
                        <div
                            onClick={() => {
                                setSelectedTemplate({ name: "Agent Personnalisé", time: "5 min" });
                                setStep(2);
                            }}
                            className="p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center hover:bg-white hover:border-blue-400 transition-all cursor-pointer group"
                        >
                            <Plus className="w-8 h-8 text-gray-400 mb-2 group-hover:text-blue-600 transition-colors" />
                            <h3 className="font-bold text-gray-500 group-hover:text-gray-900">Partir de zéro</h3>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Identity & Persona */}
            {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                        <span className="magia-label text-blue-600">Étape 02</span>
                        <h2 className="magia-h2">Identité & Persona</h2>
                        <p className="magia-subtitle">Définissez le caractère et l'intelligence de votre agent.</p>
                    </div>
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <label className="magia-label ml-1">Choisir un avatar</label>
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    onClick={() => setConfig({ ...config, avatar: `/avatars/avatar_${i}.png` })}
                                    className={cn(
                                        "aspect-square rounded-xl border-2 transition-all cursor-pointer overflow-hidden relative group",
                                        config.avatar === `/avatars/avatar_${i}.png` ? "border-blue-600 ring-4 ring-blue-50" : "border-gray-100 hover:border-blue-200"
                                    )}
                                >
                                    <img src={`/avatars/avatar_${i}.png`} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                                    {config.avatar === `/avatars/avatar_${i}.png` && (
                                        <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                                            <div className="bg-blue-600 rounded-full p-1 shadow-lg">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div className="space-y-2">
                            <label className="magia-label ml-1">Nom de l'agent</label>
                            <input
                                type="text"
                                value={config.name}
                                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="magia-label ml-1">Modèle LLM</label>
                            <select
                                value={config.llm}
                                onChange={(e) => setConfig({ ...config, llm: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl"
                            >
                                <option>GPT-4o (Recommandé)</option>
                                <option>Claude 3.5 Sonnet</option>
                                <option>Gemini 1.5 Pro</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="magia-label ml-1">System Prompt (Instructions)</label>
                        <textarea
                            rows={4}
                            value={config.systemPrompt}
                            onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                            placeholder="Tu es un assistant expert en..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl resize-none"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                    <button onClick={() => setStep(1)} className="px-6 py-3 text-sm font-bold text-gray-500">Précédent</button>
                    <button onClick={() => setStep(3)} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">Continuer</button>
                </div>
            </div>
        </div>
    )}

            {/* Step 3: Activation Channels */}
            {step === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                        <span className="magia-label text-blue-600">Étape 03</span>
                        <h2 className="magia-h2">Canaux d'activation</h2>
                        <p className="magia-subtitle">Où cet agent doit-il intervenir ?</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { id: 'email', name: 'Email', icon: Mail },
                            { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare },
                            { id: 'web', name: 'Web Chat', icon: Globe },
                            { id: 'api', name: 'API / SDK', icon: Terminal }
                        ].map((c) => (
                            <div
                                key={c.id}
                                onClick={() => {
                                    const newChannels = config.channels.includes(c.id)
                                        ? config.channels.filter(id => id !== c.id)
                                        : [...config.channels, c.id];
                                    setConfig({ ...config, channels: newChannels });
                                }}
                                className={cn(
                                    "p-6 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-4",
                                    config.channels.includes(c.id) ? "border-blue-600 bg-blue-50/50" : "border-gray-100 bg-white hover:border-blue-200"
                                )}
                            >
                                <c.icon className={cn("w-8 h-8", config.channels.includes(c.id) ? "text-blue-600" : "text-gray-300")} />
                                <span className="font-bold text-sm text-gray-900">{c.name}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-8">
                        <button onClick={() => setStep(2)} className="px-6 py-3 text-sm font-bold text-gray-500">Précédent</button>
                        <button onClick={() => setStep(4)} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold">Continuer</button>
                    </div>
                </div>
            )}

            {/* Step 4: Knowledge Base */}
            {step === 4 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                        <span className="magia-label text-blue-600">Étape 04</span>
                        <h2 className="magia-h2">Sources & Base de Connaissances</h2>
                        <p className="magia-subtitle">Associez des documents pour un moteur RAG efficace.</p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl p-12 bg-gray-50/50">
                            <Plus className="w-10 h-10 text-gray-300 mb-4" />
                            <p className="font-bold text-gray-900 mb-1">Glissez-déposez vos fichiers</p>
                            <p className="text-sm text-gray-400">PDF, DOCX, TXT ou URLs (max 50 MB)</p>
                        </div>
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Sources récemment utilisées</p>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm"><FileText className="w-4 h-4 text-gray-400" /></div>
                                    <span className="text-sm font-bold text-gray-900">Guide_Produit_V2.pdf</span>
                                </div>
                                <Check className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            <button onClick={() => setStep(3)} className="px-6 py-3 text-sm font-bold text-gray-500">Précédent</button>
                            <button onClick={() => setStep(5)} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold">Continuer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 5: Autonomy Level */}
            {step === 5 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                        <span className="magia-label text-blue-600">Étape 05</span>
                        <h2 className="magia-h2">Niveau d'autonomie</h2>
                        <p className="magia-subtitle">Déterminez comment l'agent doit répondre.</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { id: 'Suggest', title: 'Suggestion', desc: 'L\'humain approuve avant envoi. Idéal pour débuter.' },
                            { id: 'Auto (seuil)', title: 'Auto (seuil)', desc: 'Envoi automatique si le score de confiance est élevé (85%+).' },
                            { id: 'Full Auto', title: 'Full Auto', desc: 'Réponses instantanées sans validation. Pour les FAQs simples.' }
                        ].map((m) => (
                            <div
                                key={m.id}
                                onClick={() => setConfig({ ...config, mode: m.id })}
                                className={cn(
                                    "p-6 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between",
                                    config.mode === m.id ? "border-blue-600 bg-blue-50/50" : "border-gray-100 bg-white hover:border-blue-200"
                                )}
                            >
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 mb-1">{m.title}</h4>
                                    <p className="text-sm text-gray-500">{m.desc}</p>
                                </div>
                                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", config.mode === m.id ? "border-blue-600 bg-blue-600" : "border-gray-300")}>
                                    {config.mode === m.id && <Check className="w-3 h-3 text-white" />}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-8">
                        <button onClick={() => setStep(4)} className="px-6 py-3 text-sm font-bold text-gray-500">Précédent</button>
                        <button onClick={() => setStep(6)} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold">Continuer</button>
                    </div>
                </div>
            )}

            {/* Step 6: Sandbox Test */}
            {step === 6 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                        <span className="magia-label text-blue-600">Étape 06</span>
                        <h2 className="magia-h2">Sandbox Test (Dry Run)</h2>
                        <p className="magia-subtitle">Simulez une interaction pour valider le comportement.</p>
                    </div>

                    <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative overflow-hidden">
                        <div className="flex items-center gap-4 text-white/40 text-xs font-mono uppercase tracking-widest border-b border-white/10 pb-4">
                            <Terminal className="w-4 h-4" />
                            Simulation d'environnement sandbox
                        </div>
                        <div className="space-y-4 min-h-[200px]">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0" />
                                <div className="bg-white/5 rounded-xl p-4 text-sm text-white/80 max-w-[80%]">
                                    Simuler une demande de client : "Bonjour, quels sont vos tarifs pour le pack Business ?"
                                </div>
                            </div>
                            <div className="flex gap-4 flex-row-reverse">
                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex-shrink-0" />
                                <div className="bg-blue-600 rounded-xl p-4 text-sm text-white max-w-[80%] shadow-lg shadow-blue-900/40">
                                    <span className="flex items-center gap-2 mb-2 italic text-xs text-blue-200">
                                        <Sparkles className="w-3 h-3" /> Agent thinking... (Confiance: 92%)
                                    </span>
                                    D'après notre Guide Produit, le pack Business est à 149€/mois et inclut toutes les fonctionnalités IA avancées.
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-white/5 flex gap-2">
                            <input type="text" placeholder="Entrez une question de test..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" />
                            <button className="bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-sm">Tester</button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <button onClick={() => setStep(5)} className="px-6 py-3 text-sm font-bold text-gray-500">Précédent</button>
                        <button onClick={() => setStep(7)} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold">Passer au déploiement</button>
                    </div>
                </div>
            )}

            {/* Step 7: Final Deployment */}
            {step === 7 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                        <span className="magia-label text-blue-600">Étape finale</span>
                        <h2 className="magia-h2">Prêt pour le déploiement</h2>
                        <p className="magia-subtitle">Vérifiez les derniers détails avant la mise en ligne.</p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-10">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text">Identité</p>
                                <p className="font-bold text-gray-900">{config.name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IA</p>
                                <p className="font-bold text-gray-900">{config.llm}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Canaux</p>
                                <p className="font-bold text-gray-900">{config.channels.length || 'Web Chat'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mode</p>
                                <p className="font-bold text-blue-600">{config.mode}</p>
                            </div>
                        </div>

                        <div className="p-8 bg-blue-50 rounded-xl border border-blue-100 text-center relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="text-4xl font-black text-blue-600 mb-2">90%</div>
                                <p className="text-sm font-bold text-blue-900">Score de fidélité au template</p>
                                <div className="mt-8 flex justify-center">
                                    <button
                                        onClick={() => setIsDeploying(true)}
                                        className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-lg shadow-xl shadow-blue-200 transition-all active:scale-95"
                                    >
                                        Lancer mon agent en production
                                    </button>
                                </div>
                                <p className="mt-4 text-xs font-bold text-blue-400 uppercase tracking-widest">Déploiement estimé : <span className="text-blue-600">5 secondes</span></p>
                            </div>
                            <Shield className="absolute -bottom-10 -right-10 w-48 h-48 text-blue-100/50 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                        </div>
                    </div>
                    <button onClick={() => setStep(6)} className="px-6 py-3 text-sm font-bold text-gray-500 w-full text-center">Réajuster la configuration</button>
                </div>
            )}
        </div>
    );
}
