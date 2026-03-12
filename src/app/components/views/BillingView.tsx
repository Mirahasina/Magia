import { Button } from "../ui/button";

export function BillingView() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h2 className="magia-h2">Espace facturation</h2>
                    <p className="magia-subtitle">Gestion des plans et flux de crédits</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-indigo-600 rounded-lg text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <h3 className="magia-label opacity-60 mb-1">PLAN ACTUEL</h3>
                            <div className="text-3xl font-serif font-bold mb-6 tracking-tighter uppercase">Business Pro</div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="opacity-60">Consommation</span>
                                <span className="text-white">78%</span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-white w-[78%] rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                            </div>
                            <p className="text-[9px] opacity-40 italic">Prochain cycle dans 12 jours</p>
                        </div>
                    </div>
                    {/* Decorative glass overlay */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-1000" />
                </div>

                <div className="p-6 bg-white border border-gray-100 rounded-lg flex flex-col justify-between shadow-sm relative overflow-hidden group">
                    <div className="space-y-4 relative z-10">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MÉTHODE DE PAIEMENT</h4>
                        <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-lg border border-gray-100 group-hover:border-indigo-100 transition-colors">
                            <div className="w-10 h-6 bg-gray-900 rounded flex items-center justify-center text-[8px] font-black italic text-white">VISA</div>
                            <div className="flex-1">
                                <p className="text-[12px] font-black text-gray-900 uppercase italic tracking-tighter">•••• 4242</p>
                                <p className="text-[10px] text-gray-300 font-medium">EXP: 12/26</p>
                            </div>
                        </div>
                    </div>
                    <button className="w-full mt-4 py-2.5 rounded-md border border-gray-100 text-gray-900 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all relative z-10">MODIFIER</button>
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">HISTORIQUE DES TRANSACTIONS</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-50">
                                <th className="px-6 py-4 text-[9px] font-black text-gray-300 uppercase tracking-widest">DATE</th>
                                <th className="px-6 py-4 text-[9px] font-black text-gray-300 uppercase tracking-widest">MONTANT</th>
                                <th className="px-6 py-4 text-[9px] font-black text-gray-300 uppercase tracking-widest">STATUT</th>
                                <th className="px-6 py-4 text-[9px] font-black text-gray-300 uppercase tracking-widest"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {[
                                { d: "01 MARS 2024", a: "145.00 €", s: "PAYÉ" },
                                { d: "01 FÉV 2024", a: "145.00 €", s: "PAYÉ" },
                                { d: "01 JAN 2024", a: "85.00 €", s: "PAYÉ" }
                            ].map((f, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-[11px] font-black text-gray-900 font-serif">{f.d}</td>
                                    <td className="px-6 py-4 text-[11px] text-gray-600 font-bold">{f.a}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase">{f.s}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors opacity-0 group-hover:opacity-100">PDF ↗</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
