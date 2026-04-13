import { useState } from "react";
import { X, Star, Send } from "lucide-react";
import { cn } from "./ui/utils";

interface SatisfactionSurveyProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (score: number, comment: string) => void;
}

export function SatisfactionSurvey({ isOpen, onClose, onSubmit }: SatisfactionSurveyProps) {
    const [score, setScore] = useState<number | null>(null);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (score === null) return;
        setIsSubmitting(true);
        await onSubmit(score, comment);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 text-center bg-gray-50/50 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-blue-900 fill-blue-900" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Votre avis nous intéresse !</h3>
                    <p className="text-sm text-gray-500">Quelle est la probabilité que vous recommandiez MAGIA à un ami ou un collègue ?</p>
                </div>

                <div className="p-8 space-y-8">
                    <div className="flex justify-between gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                            <button
                                key={s}
                                onClick={() => setScore(s)}
                                className={cn(
                                    "w-8 h-8 rounded-lg text-[10px] font-bold transition-all border",
                                    score === s 
                                        ? "bg-blue-900 text-white border-blue-900" 
                                        : "bg-white text-gray-400 border-gray-100 hover:border-blue-200"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase text-gray-300 tracking-tighter px-1">
                        <span>Pas du tout</span>
                        <span>Tout à fait</span>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Un commentaire ? (Optionnel)</p>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Dites-nous en plus sur votre expérience..."
                            className="w-full h-24 p-4 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-blue-900/5 focus:bg-white transition-all resize-none font-medium"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={score === null || isSubmitting}
                        className={cn(
                            "w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100",
                            score !== null ? "bg-blue-900 text-white hover:bg-black" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        {isSubmitting ? "ENVOI..." : "ENVOYER MON AVIS"}
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
