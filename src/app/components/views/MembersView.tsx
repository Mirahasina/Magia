import { cn } from "../ui/utils";

export function MembersView() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="magia-h2">Espace Équipe</h2>
                    <p className="magia-subtitle">Gestion des accès et privilèges opérationnels</p>
                </div>
                <button className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-gray-100 hover:scale-[1.02] transition-all">
                    INVITER UNITÉ
                </button>
            </div>
            <div className="space-y-3">
                {[
                    { name: "Jean Dupont", role: "Directeur", email: "jean@magia.com", access: "FULL_ACCESS" },
                    { name: "Sarah Koné", role: "Manager", email: "sarah@magia.com", access: "EDITOR" },
                    { name: "Marc Lova", role: "Ingénieur IA", email: "marc@magia.com", access: "DEV" }
                ].map((user) => (
                    <div key={user.email} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg hover:border-indigo-100 transition-all group shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center font-black text-gray-300 italic text-lg shadow-inner border border-gray-100">
                                {user.name.charAt(0)}
                            </div>
                            <div>
                                <div className="text-[12px] font-black text-gray-900 uppercase tracking-tight font-serif">{user.name}</div>
                                <div className="text-[10px] text-gray-400 font-medium italic">{user.email}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right hidden md:block">
                                <p className="magia-label leading-none mb-1">ACCÈS</p>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{user.access}</p>
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-md">{user.role}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
