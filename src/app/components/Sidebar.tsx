import { cn } from "./ui/utils";
import { Logo } from "./Logo";
import { LayoutDashboard, Users, Inbox, Puzzle, BarChart3, Settings, CreditCard, Shield, Bot, ChevronLeft } from "lucide-react";

const menuItems = [
    { label: "Tableau de bord", icon: LayoutDashboard },
];

const aiWorkforce = [
    { label: "Agents", icon: Bot },
];

const mainTools = [
    { label: "Boîte de réception", icon: Inbox, badge: "12" },
];

const systemItems = [
    { label: "Paramètres", icon: Settings },
    { label: "Membres", icon: Users },
    { label: "Facturation", icon: CreditCard },
    { label: "Journaux d'audit", icon: Shield },
];

interface SidebarProps {
    activeTab: string;
    onNavigate: (tab: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
}

const SidebarLink = ({ item, isActive, isOpen, onClick }: {
    item: { label: string, icon: any, badge?: string },
    isActive: boolean,
    isOpen: boolean,
    onClick: () => void
}) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative w-full flex items-center px-6 py-4 rounded-l-[30px] rounded-r-none text-[13px] font-bold transition-all duration-300 group sidebar-tab-item",
                isActive ? "sidebar-tab-active" : "text-white/50"
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

            {item.badge && (
                <span className={cn(
                    "ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors whitespace-nowrap",
                    isActive
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-violet-500/30 text-violet-200 group-hover:bg-indigo-100 group-hover:text-indigo-700",
                    !isOpen && "hidden"
                )}>
                    {item.badge}
                </span>
            )}
        </button>
    );
};

export function Sidebar({ activeTab, onNavigate, isOpen, onToggle, onClose }: SidebarProps) {
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
                    className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <div className={cn(
                "h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out border-r border-[#2D1B69]",
                "bg-gradient-to-b from-[#2D1B69] via-[#1E1145] to-[#0F0A2E]",
                isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:w-20 lg:translate-x-0"
            )}>
                <div className="p-6 flex items-center justify-between mb-2">
                    <div className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 lg:opacity-0 lg:w-0 overflow-hidden")}>
                        <Logo isCollapsed={false} />
                    </div>
                    {/* Collapsed logo if wanted, or just nothing. We'll leave it empty for now, or just let Chevron be the only thing */}
                    <button
                        onClick={onToggle}
                        className={cn(
                            "p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors bg-white/5 shrink-0",
                            !isOpen && "mx-auto rotate-180"
                        )}
                        title={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pl-4 pr-0 space-y-8 pb-8 scrollbar-hide">
                    {/* Main Navigation */}
                    <div className="space-y-1">
                        {menuItems.map((item) => (
                            <SidebarLink key={item.label} item={item} isActive={activeTab === item.label} isOpen={isOpen} onClick={() => handleItemClick(item.label)} />
                        ))}
                    </div>

                    <div className="space-y-1">
                        <p className={cn("px-4 magia-label text-white/30 mb-3 transition-opacity duration-300", !isOpen && "lg:opacity-0")}>
                            {isOpen ? "ÉQUIPE IA" : " "}
                        </p>
                        {aiWorkforce.map((item) => (
                            <SidebarLink key={item.label} item={item} isActive={activeTab === item.label} isOpen={isOpen} onClick={() => handleItemClick(item.label)} />
                        ))}
                    </div>

                    {/* Knowledge & Tools */}
                    <div className="space-y-1">
                        <p className={cn("px-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 transition-opacity duration-300", !isOpen && "lg:opacity-0")}>
                            {isOpen ? "OUTILS" : " "}
                        </p>
                        {mainTools.map((item) => (
                            <SidebarLink key={item.label} item={item} isActive={activeTab === item.label} isOpen={isOpen} onClick={() => handleItemClick(item.label)} />
                        ))}
                    </div>

                    {/* System Section */}
                    <div className="pt-6 border-t border-white/10 space-y-1">
                        <p className={cn("px-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 transition-opacity duration-300", !isOpen && "lg:opacity-0")}>
                            {isOpen ? "SYSTÈME" : " "}
                        </p>
                        {systemItems.map((item) => (
                            <SidebarLink key={item.label} item={item} isActive={activeTab === item.label} isOpen={isOpen} onClick={() => handleItemClick(item.label)} />
                        ))}
                    </div>
                </div>

                {/* Sidebar glow effect */}
                <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-violet-500/20 via-transparent to-indigo-500/20" />
            </div>
        </>
    );
}
