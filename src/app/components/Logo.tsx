import logoImg from "../../assets/logo.png";

export function Logo({ className = "", isCollapsed = false }: { className?: string; isCollapsed?: boolean }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className={`flex items-center justify-center transition-all duration-300 ${isCollapsed ? "w-10 h-10" : "w-32 h-16 sm:w-40 sm:h-20"}`}>
                <img src={logoImg} alt="MAGIA Logo" className="w-full h-full object-contain" />
            </div>
        </div>
    );
}
