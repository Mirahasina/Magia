import logoImg from "../../assets/logo.jpeg";

export function Logo({ className = "", isCollapsed = false }: { className?: string; isCollapsed?: boolean }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className={`flex items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-blue-500/10 transition-all ${isCollapsed ? "w-10 h-10" : "w-25 h-20"}`}>
                <img src={logoImg} alt="MAGIA Logo" className="w-full h-full object-cover scale-110" />
            </div>
        </div>
    );
}
