import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { cn } from "./ui/utils";

interface TopbarProps {
    user: any;
    onLogout?: () => void;
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
    searchQuery?: string;
    onSearchChange?: (q: string) => void;
    title?: string;
}

export function Topbar({ user, onLogout, onToggleSidebar, isSidebarOpen, searchQuery, onSearchChange, title }: TopbarProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/auth/notifications/", {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                }
            } catch (e) { }
        };

        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 15000);
            return () => clearInterval(interval);
        }
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.notif-dropdown') && !target.closest('.notif-trigger')) {
                setIsNotificationsOpen(false);
            }
            if (!target.closest('.profile-dropdown') && !target.closest('.profile-trigger')) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id?: number) => {
        try {
            await fetch("http://localhost:8000/api/auth/notifications/", {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(id ? { id } : {})
            });
            setNotifications(prev => id
                ? prev.map(n => n.id === id ? { ...n, is_read: true } : n)
                : prev.map(n => ({ ...n, is_read: true }))
            );
        } catch (e) { }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const fullName = user?.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ""}` : "Utilisateur");
    const avatarUrl = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=312e81&color=fff`;

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
                <div className="relative group w-full flex items-center gap-4">
                    {title && (
                        <h1 className="text-lg font-bold text-slate-800 whitespace-nowrap animate-in fade-in slide-in-from-left-2">
                            {title}
                        </h1>
                    )}
                    <input
                        type="text"
                        placeholder="Rechercher globalement..."
                        value={searchQuery || ""}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                        className="w-full px-6 py-2.5 bg-gray-50/50 border border-transparent rounded-2xl text-[13px] focus:outline-none focus:bg-white shadow-sm focus:shadow-md transition-all duration-300 text-gray-900 font-medium"
                    />
                </div>
            </div>

            <div className="flex items-center gap-8">
                <div className="relative">
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className="relative p-2 text-blue-900 bg-blue-50/50 rounded-full hover:bg-blue-100 transition-colors duration-300 notif-trigger"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-900 rounded-full border-2 border-white shadow-sm animate-pulse"></span>}
                    </button>
                    {isNotificationsOpen && (
                        <div className="absolute right-0 mt-4 w-72 bg-white/95 backdrop-blur-3xl border border-gray-100/50 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-300 z-50 notif-dropdown">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">Notifications</h3>
                                {unreadCount > 0 && <button onClick={() => markAsRead()} className="text-[9px] text-blue-600 hover:text-blue-800 font-bold transition-colors">TOUT MARQUER LU</button>}
                            </div>
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                {notifications.length > 0 ? notifications.map(notif => (
                                    <div key={notif.id} onClick={() => notif.is_read ? null : markAsRead(notif.id)} className={cn("p-3 rounded-xl border transition-all", notif.is_read ? "opacity-50 border-gray-100 bg-gray-50/50" : notif.type === 'alert' ? "bg-amber-50/50 border-amber-100/50 cursor-pointer" : "bg-blue-50/50 border-blue-100/50 cursor-pointer")}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={cn("w-2 h-2 rounded-full", notif.type === 'alert' ? "bg-amber-500" : "bg-blue-900", notif.is_read && "opacity-30")} />
                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", notif.type === 'alert' ? "text-amber-600" : "text-blue-900")}>{notif.type}</span>
                                        </div>
                                        <h4 className="text-[11px] font-bold text-gray-900 mb-0.5">{notif.title}</h4>
                                        <p className="text-[10px] text-gray-600 font-medium leading-relaxed">{notif.message}</p>
                                    </div>
                                )) : (
                                    <p className="text-[11px] text-gray-400 font-medium text-center py-6 border-2 border-dashed border-gray-100 rounded-xl uppercase tracking-widest">Aucune alerte.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <div className="flex items-center gap-4 pl-8 border-l border-gray-100/50 group">
                        <div className="flex flex-col items-end">
                            <span className="text-[13px] font-serif font-black text-gray-900 leading-none">{fullName}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center overflow-hidden border-2 border-white shadow-xl group-hover:scale-105 transition-transform duration-300">
                            <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
