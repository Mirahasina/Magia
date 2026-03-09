import { XCircle, CheckCircle2, Clock, Zap, AlertCircle, TrendingDown, TrendingUp, ShieldCheck } from "lucide-react";
import { cn } from "./ui/utils";

const comparisonData = [
    {
        category: "Vitesse de réponse",
        before: { text: "2 à 24 heures", status: "bad" },
        after: { text: "Moins de 10 secondes", status: "good" }
    },
    {
        category: "Précision des données",
        before: { text: "Erreurs de saisie fréquentes", status: "bad" },
        after: { text: "Fiabilité RAG 99%", status: "good" }
    },
    {
        category: "Coût de traitement",
        before: { text: "15€ - 45€ par ticket", status: "bad" },
        after: { text: "Moins de 0.10€ par ticket", status: "good" }
    },
    {
        category: "Disponibilité",
        before: { text: "Horaires de bureau uniquement", status: "bad" },
        after: { text: "24h/24, 7j/7 sans pause", status: "good" }
    }
];

export function ComparisonSection() {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl opacity-5 pointer-events-none">
                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20 reveal-on-scroll">
                    <h2 className="text-5xl sm:text-6xl font-extrabold mb-6 tracking-tight">
                        Multipliez votre <span className="text-indigo-600">productivité par 10</span>
                    </h2>
                    <p className="text-xl text-gray-600">
                        L'IA ne remplace pas l'humain, elle le libère des tâches répétitives pour qu'il se concentre sur la valeur.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 items-stretch reveal-on-scroll">
                    {/* Avant Card */}
                    <div className="group p-8 bg-gray-50 border border-gray-100 rounded-[2.5rem] hover:bg-white hover:border-red-100 transition-all duration-500 hover:shadow-xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                                <TrendingDown className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 uppercase tracking-tighter italic">L'Approche Traditionnelle</h3>
                        </div>

                        <div className="space-y-6">
                            {comparisonData.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-gray-200 transition-colors">
                                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{item.category}</span>
                                    <div className="flex items-center gap-3 text-gray-600 font-medium">
                                        <span>{item.before.text}</span>
                                        <XCircle className="w-5 h-5 text-red-400" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 p-6 bg-red-50/50 rounded-3xl border border-red-50 text-red-800 text-sm font-medium">
                            Résultat : Saturation, clients frustrés et coûts opérationnels élevés.
                        </div>
                    </div>

                    {/* Après Card */}
                    <div className="group p-8 bg-blue-600 text-white rounded-[2.5rem] shadow-2xl shadow-blue-500/20 relative overflow-hidden transform hover:scale-[1.02] transition-all duration-500">
                        {/* Glossy overlay */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                                    <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-white uppercase tracking-tighter italic">L'Expérience MAGIA</h3>
                            </div>

                            <div className="space-y-6">
                                {comparisonData.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
                                        <span className="text-sm font-bold text-blue-200 uppercase tracking-widest">{item.category}</span>
                                        <div className="flex items-center gap-3 text-white font-bold">
                                            <span>{item.after.text}</span>
                                            <CheckCircle2 className="w-5 h-5 text-green-300" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 text-blue-50 text-sm font-bold flex items-center gap-3">
                                <Zap className="w-5 h-5 text-yellow-300" />
                                Résultat : Scalabilité infinie et satisfaction client instantanée.
                            </div>
                        </div>
                    </div>
                </div>

                {/* ROI Highlight */}
                <div className="mt-16 p-8 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-[2.5rem] text-center reveal-on-scroll">
                    <div className="max-w-2xl mx-auto space-y-4">
                        <h4 className="text-blue-400 font-bold uppercase tracking-widest text-sm">ROI ESTIMÉ</h4>
                        <p className="text-3xl text-white font-bold tracking-tight">
                            En moyenne, nos clients économisent <span className="text-green-400">18 heures par semaine</span> dès le premier mois.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
