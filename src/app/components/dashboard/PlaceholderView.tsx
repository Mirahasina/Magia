export function PlaceholderView({ title, description }: { title: string; icon?: any; description?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-12 bg-white rounded-[3rem] border border-gray-100/50 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-8 relative shadow-inner">
                <span className="text-3xl font-black italic text-gray-200">{title.charAt(0)}</span>
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 rounded-full animate-pulse" />
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic mb-4">{title}</h2>
            <p className="text-gray-400 max-w-lg mx-auto leading-relaxed text-sm">
                {description || `Explorez et gérez vos ${title.toLowerCase()} avec des outils IA avancés. Cette section sera bientôt entièrement personnalisable.`}
            </p>
            <div className="mt-10 flex items-center gap-4">
                <button className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">
                    Démarrer maintenant
                </button>
                <button className="px-8 py-4 bg-white border border-gray-100/50 text-gray-600 rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
                    Documentation
                </button>
            </div>
        </div>
    );
}
