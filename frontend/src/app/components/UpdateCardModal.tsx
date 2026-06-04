import { API_BASE } from "../../lib/api";
import { useState } from "react";
import { X, CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

interface UpdateCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function UpdateCardModal({ isOpen, onClose, onSuccess }: UpdateCardModalProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [cardName, setCardName] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvc, setCvc] = useState("");

    if (!isOpen) return null;

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        const token = localStorage.getItem("access_token");
        if (!token) {
            setLoading(false);
            return;
        }

        const cleanNumber = cardNumber.replace(/\s/g, '');
        const last4 = cleanNumber.slice(-4);
        
        const expiryParts = expiry.split('/');
        let expMonth = (expiryParts[0] || "").trim().padStart(2, '0').slice(-2);
        let expYear = (expiryParts[1] || "").trim().slice(-2);
        
        const brand = cleanNumber.startsWith('4') ? 'Visa' : cleanNumber.startsWith('5') ? 'Mastercard' : 'Card';

        try {
            const response = await fetch(`${API_BASE}/auth/subscription/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    card_last4: last4,
                    card_brand: brand,
                    card_exp_month: expMonth,
                    card_exp_year: expYear
                })
            });

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                    setSuccess(false);
                }, 2000);
            }
        } catch (error) {
            console.error("Error updating card", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-none w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
                <button 
                    onClick={onClose}
                    className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5 text-gray-400" />
                </button>

                <div className="p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-50 rounded-none flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-blue-900" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight leading-tight uppercase italic">Modifier la carte</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Mise à jour sécurisée</p>
                        </div>
                    </div>

                    {success ? (
                        <div className="py-12 text-center space-y-4 animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase">Carte mise à jour !</h3>
                            <p className="text-gray-500 text-xs font-medium uppercase tracking-widest italic opacity-60">Redirection en cours...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom du titulaire</label>
                                <input 
                                    required 
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value)}
                                    placeholder="NOM PRENOM" 
                                    className="w-full h-12 px-4 rounded-none border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 outline-none transition-all font-bold uppercase text-xs tracking-wider" 
                                />
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Numéro de carte</label>
                                <div className="relative">
                                    <input 
                                        required 
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(e.target.value)}
                                        placeholder="0000 0000 0000 0000" 
                                        className="w-full h-12 pl-4 pr-12 rounded-none border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 outline-none transition-all font-mono text-sm" 
                                    />
                                    <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expiration</label>
                                    <input 
                                        required 
                                        value={expiry}
                                        onChange={(e) => setExpiry(e.target.value)}
                                        placeholder="MM/YY" 
                                        className="w-full h-12 px-4 rounded-none border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 outline-none transition-all text-sm font-bold tracking-widest" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CVC</label>
                                    <input 
                                        required 
                                        value={cvc}
                                        onChange={(e) => setCvc(e.target.value)}
                                        placeholder="123" 
                                        type="password" 
                                        maxLength={3} 
                                        className="w-full h-12 px-4 rounded-none border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 outline-none transition-all text-sm font-bold tracking-[0.5em]" 
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button 
                                    disabled={loading}
                                    className="w-full h-14 bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all border-none"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Enregistrer les modifications"}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
