import { LayoutGrid } from "lucide-react";

export function PlaceholderView({ title, icon: Icon, description }: { title: string; icon: any; description?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-12 bg-white rounded-3xl border border-dashed border-gray-200 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 relative">
                <Icon className="w-10 h-10 text-blue-600" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center animate-pulse">
                    <span className="w-3 h-3 bg-white rounded-full" />
                </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
            <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
                {description || `Explorez et gérez vos ${title.toLowerCase()} avec des outils IA avancés. Cette section sera bientôt entièrement personnalisable.`}
            </p>
            <div className="mt-10 flex items-center gap-4">
                <button className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
                    Démarrer maintenant
                </button>
                <button className="px-8 py-3 bg-white border border-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all">
                    Documentation
                </button>
            </div>
        </div>
    );
}
