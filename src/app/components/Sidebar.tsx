import {
    BarChart3,
    BookOpen,
    CreditCard,
    Users,
    Settings,
    MessageSquare,
    Puzzle,
    LayoutDashboard,
    Globe,
    Terminal,
    FileText,
    ChevronDown,
    ChevronLeft,
    Search
} from "lucide-react";
import { cn } from "./ui/utils";
import { Logo } from "./Logo";

const menuItems = [
    { icon: Globe, label: "Vue globale", hasChevron: true },
    { icon: LayoutDashboard, label: "Tableau de bord", active: true },
];

const aiWorkforce = [
    { icon: Users, label: "Agents" },
    { icon: FileText, label: "Modèles", active: false },
    { icon: Globe, label: "Marché" },
];

const mainTools = [
    { icon: BookOpen, label: "Base de connaissances" },
    { icon: MessageSquare, label: "Boîte de réception", badge: "12" },
    { icon: Puzzle, label: "Intégrations" },
    { icon: BarChart3, label: "Analyses" },
];

const systemItems = [
    { icon: Settings, label: "Paramètres" },
    { icon: Users, label: "Membres" },
    { icon: CreditCard, label: "Facturation" },
    { icon: Terminal, label: "Journaux d'audit" },
];

interface SidebarProps {
    activeTab: string;
    onNavigate: (tab: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export function Sidebar({ activeTab, onNavigate, isCollapsed, onToggleCollapse }: SidebarProps) {
    return (
        <div className={cn(
            "h-screen border-r border-gray-100 bg-white flex flex-col fixed left-0 top-0 z-40 transition-all duration-300",
            isCollapsed ? "w-20" : "w-64"
        )}>
            <div className={cn("p-6 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
                <Logo isCollapsed={isCollapsed} />
                {!isCollapsed && (
                    <button
                        onClick={onToggleCollapse}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
                {isCollapsed && (
                    <button
                        onClick={onToggleCollapse}
                        className="absolute -right-3 top-8 w-6 h-6 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 shadow-sm hover:text-gray-600 transition-all"
                    >
                        <ChevronLeft className={cn("w-3 h-3 transition-transform", isCollapsed && "rotate-180")} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-8 pb-8 scrollbar-hide">
                {/* Main Navigation */}
                <div className="space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => onNavigate(item.label)}
                            className={cn(
                                "w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                isCollapsed ? "justify-center" : "justify-between",
                                activeTab === item.label
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                            title={isCollapsed ? item.label : ""}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className="w-4 h-4" />
                                {!isCollapsed && item.label}
                            </div>
                            {!isCollapsed && item.hasChevron && <ChevronDown className="w-3 h-3 text-gray-400" />}
                        </button>
                    ))}
                </div>

                {/* AI Workforce Section */}
                <div className="space-y-1">
                    {!isCollapsed && <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">ÉQUIPE IA</p>}
                    {aiWorkforce.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => onNavigate(item.label)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                isCollapsed ? "justify-center" : "",
                                activeTab === item.label
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                            title={isCollapsed ? item.label : ""}
                        >
                            <item.icon className="w-4 h-4" />
                            {!isCollapsed && item.label}
                        </button>
                    ))}
                </div>

                {/* Knowledge & Tools */}
                <div className="space-y-1">
                    {mainTools.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => onNavigate(item.label)}
                            className={cn(
                                "w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                isCollapsed ? "justify-center" : "justify-between",
                                activeTab === item.label
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                            title={isCollapsed ? item.label : ""}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className="w-4 h-4" />
                                {!isCollapsed && item.label}
                            </div>
                            {!isCollapsed && item.badge && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* System Section */}
                <div className="pt-4 border-t border-gray-50 space-y-1">
                    {systemItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => onNavigate(item.label)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                isCollapsed ? "justify-center" : "",
                                activeTab === item.label
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                            title={isCollapsed ? item.label : ""}
                        >
                            <item.icon className="w-4 h-4" />
                            {!isCollapsed && item.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

