import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "./ui/utils";

interface TopbarProps {
    onLogout?: () => void;
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
}

export function Topbar({ onLogout, onToggleSidebar, isSidebarOpen }: TopbarProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <header className="h-16 border-b border-gray-200/30 bg-white/40 backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
            <div className="flex-1 flex items-center gap-4 max-w-xl">
                <button 
                    onClick={onToggleSidebar}
                    className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors lg:hidden"
                    aria-label="Toggle Sidebar"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <div className="relative group w-full">
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        className="w-full px-6 py-2.5 bg-gray-50/50 border border-transparent rounded-2xl text-[13px] focus:outline-none focus:bg-white shadow-sm focus:shadow-md transition-all duration-300 text-gray-900 font-medium"
                    />
                </div>
            </div>

            <div className="flex items-center gap-8">
                <button className="relative p-2 text-indigo-600 bg-indigo-50/50 rounded-full hover:bg-indigo-100 transition-colors duration-300">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white shadow-sm"></span>
                </button>

                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-4 pl-8 border-l border-gray-100/50 cursor-pointer group"
                    >
                        <div className="flex flex-col items-end">
                            <span className="text-[13px] font-serif font-black text-gray-900 leading-none">Marie Dupont</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center overflow-hidden border-2 border-white shadow-xl group-hover:scale-105 transition-transform duration-300">
                            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150" alt="Marie Dupont" className="w-full h-full object-cover" />
                        </div>
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-4 w-56 bg-white/80 backdrop-blur-2xl border border-gray-100/50 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-300 z-50">
                            <button
                                onClick={onLogout}
                                className="w-full text-left px-5 py-3 text-[12px] text-red-600 hover:bg-red-50/50 rounded-xl transition-all duration-200 font-black"
                            >
                                Se déconnecter
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
