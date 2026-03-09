import { useState } from "react";
import { Search, Bell, ChevronDown, LogOut, Settings, Shield } from "lucide-react";
import { cn } from "./ui/utils";

interface TopbarProps {
    onLogout?: () => void;
}

export function Topbar({ onLogout }: TopbarProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-8 sticky top-0 z-30">
            <div className="flex-1 max-w-xl">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-gray-600"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                        2
                    </span>
                </button>

                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 pl-6 border-l border-gray-100 cursor-pointer group"
                    >
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-gray-900 leading-none">Jean Dupont</span>
                            <span className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-bold">Admin</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center overflow-hidden border border-white shadow-sm ring-2 ring-gray-50">
                            <img
                                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jean"
                                alt="User"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-all", isProfileOpen && "rotate-180")} />
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Compte</p>
                            </div>
                            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium">
                                <Settings className="w-4 h-4 text-gray-400" /> Profil
                            </button>
                            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium">
                                <Shield className="w-4 h-4 text-gray-400" /> Sécurité
                            </button>
                            <div className="my-1 border-t border-gray-50"></div>
                            <button
                                onClick={onLogout}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold"
                            >
                                <LogOut className="w-4 h-4" /> Se déconnecter
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
