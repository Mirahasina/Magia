import { cn } from "./ui/utils";
import { Logo } from "./Logo";
import {
    LayoutDashboard,
    Users,
    Bot,
    CreditCard,
    Shield,
    ChevronLeft,
    LogOut,
    Activity,
    FileText,
    Settings
} from "lucide-react";

interface BackOfficeSidebarProps {
    activeTab: string;
    onNavigate: (tab: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    onLogout: () => void;
}

const adminMenu = [
    { label: "Tableau de bord", icon: LayoutDashboard },
    { label: "Utilisateurs", icon: Users },
    { label: "Agents", icon: Bot },
    { label: "Transactions", icon: CreditCard },
    { label: "Demandes", icon: Shield },
    { label: "Historique", icon: FileText },
    { label: "Contacts", icon: FileText },
];

export function BackOfficeSidebar({
    activeTab,
    onNavigate,
    isOpen,
    onToggle,
    onClose,
    onLogout
}: BackOfficeSidebarProps) {
    const handleItemClick = (label: string) => {
        onNavigate(label);
        if (window.innerWidth < 1024) {
            onClose();
        }
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <div className={cn(
                "h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out border-r border-slate-700",
                "bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617]",
                isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:w-20 lg:translate-x-0"
            )}>
                <div className="p-6 flex items-center justify-between mb-8">
                    <div className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 lg:opacity-0 lg:w-0 overflow-hidden")}>
                        <div className="flex items-center gap-2">
                            <Logo isCollapsed={false} variant="white" />
                            <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Admin</span>
                        </div>
                    </div>
                    <button
                        onClick={onToggle}
                        className={cn(
                            "p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors bg-slate-800/50 shrink-0",
                            !isOpen && "mx-auto rotate-180"
                        )}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pl-4 pr-0 space-y-8 pb-8 scrollbar-hide">
                    <div className="space-y-1">
                        <p className={cn("px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 transition-opacity duration-300", !isOpen && "lg:opacity-0")}>
                            {isOpen ? "ADMINISTRATION" : " "}
                        </p>
                        {adminMenu.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => handleItemClick(item.label)}
                                className={cn(
                                    "relative w-full flex items-center px-6 py-4 rounded-l-[30px] rounded-r-none text-[13px] font-bold transition-all duration-300 group",
                                    activeTab === item.label
                                        ? "bg-emerald-500/10 text-emerald-400 border-r-[3px] border-emerald-500"
                                        : "text-slate-400 hover:text-slate-100"
                                )}
                            >
                                <div className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                                    <item.icon className="w-full h-full" />
                                </div>
                                <span className={cn(
                                    "transition-all duration-300 overflow-hidden whitespace-nowrap text-left",
                                    isOpen ? "ml-3 opacity-100 max-w-[200px]" : "ml-0 opacity-0 max-w-0"
                                )}>
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-slate-800 space-y-1">
                        <p className={cn("px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 transition-opacity duration-300", !isOpen && "lg:opacity-0")}>
                            {isOpen ? "NAVIGATION" : " "}
                        </p>
                        <button
                            onClick={onLogout}
                            className={cn(
                                "relative w-full flex items-center px-6 py-4 rounded-l-[30px] rounded-r-none text-[13px] font-bold transition-all duration-300 group text-red-400 hover:text-red-300 hover:bg-red-400/5"
                            )}
                        >
                            <div className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                                <LogOut className="w-full h-full" />
                            </div>
                            <span className={cn(
                                "transition-all duration-300 overflow-hidden whitespace-nowrap text-left",
                                isOpen ? "ml-3 opacity-100 max-w-[200px]" : "ml-0 opacity-0 max-w-0"
                            )}>
                                Se déconnecter
                            </span>
                        </button>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800">
                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", !isOpen && "justify-center")}>
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-100">
                            A
                        </div>
                        {isOpen && (
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-white truncate">Administrateur</p>
                                <p className="text-[10px] text-slate-500 truncate">Mode Back-office</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
