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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl opacity-5 pointer-events-none">
                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <h2 className="text-5xl sm:text-6xl font-extrabold mb-6 tracking-tight">
                        Multipliez votre <span className="text-indigo-600">productivité par 10</span>
                    </h2>
                    <p className="text-xl text-gray-600">
                        L'IA ne remplace pas l'humain, elle le libère des tâches répétitives pour qu'il se concentre sur la valeur.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="group p-8 bg-gray-50 border border-gray-100 rounded-xl hover:bg-white hover:border-red-100 transition-all duration-500 hover:shadow-xl">
                        <div className="flex items-center gap-3 mb-8">
                            <h3 className="text-2xl font-bold text-gray-900 uppercase tracking-tighter italic">L'approche traditionnelle</h3>
                        </div>

                        <div className="space-y-6">
                            {comparisonData.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-transparent hover:border-gray-200 transition-colors">
                                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{item.category}</span>
                                    <div className="flex items-center gap-3 text-gray-600 font-medium text-right">
                                        <span>{item.before.text}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 p-6 bg-red-50/50 rounded-xl border border-red-100 text-red-900 text-sm font-medium">
                            Résultat : Saturation, clients frustrés et coûts opérationnels élevés.
                        </div>
                    </div>

                    <div className="group p-8 bg-blue-600 text-white rounded-xl shadow-2xl shadow-blue-500/10 relative overflow-hidden transform hover:-translate-y-1 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 blur-3xl translate-y-1/2 -translate-x-1/2" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <h3 className="text-2xl font-bold text-white uppercase tracking-tighter italic">L'expérience MAGIA</h3>
                            </div>

                            <div className="space-y-6">
                                {comparisonData.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all">
                                        <span className="text-sm font-bold text-blue-100 uppercase tracking-widest">{item.category}</span>
                                        <div className="flex items-center gap-3 text-white font-bold text-right">
                                            <span>{item.after.text}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white text-sm font-bold">
                                Résultat : Scalabilité infinie et satisfaction client instantanée.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-16 p-8 bg-slate-900 rounded-xl text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 to-indigo-900/50" />
                    <div className="relative z-10 max-w-2xl mx-auto space-y-4">
                        <h4 className="text-blue-400 font-bold uppercase tracking-widest text-xs">ROI ESTIMÉ</h4>
                        <p className="text-3xl text-white font-bold tracking-tight">
                            En moyenne, nos clients économisent <span className="text-green-400">18 heures par semaine</span> dès le premier mois.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
