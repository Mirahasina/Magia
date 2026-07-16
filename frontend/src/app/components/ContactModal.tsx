import { API_BASE } from "../../lib/api";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { X } from "lucide-react";

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        company: "",
        message: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth/contact/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                setSent(true);
            }
        } catch (error) {
            console.error("Error sending contact request", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange => !onOpenChange && onClose()}>
            <DialogContent className="sm:max-w-[500px] p-8 rounded-3xl bg-white border-none shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-gray-100/50 hover:bg-gray-200 rounded-full transition-colors focus:outline-none"
                    aria-label="Fermer"
                >
                    <X className="w-5 h-5 text-gray-700" />
                </button>

                {!sent ? (
                    <>
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-3xl font-black text-gray-900 tracking-tight text-center">
                                Contactez l'équipe
                            </DialogTitle>
                            <DialogDescription className="text-center text-gray-500 font-medium">
                                Parlez-nous de vos besoins spécifiques pour votre organisation.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nom complet</label>
                                <input
                                    id="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email professionnel</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="company" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Entreprise</label>
                                <input
                                    id="company"
                                    required
                                    value={formData.company}
                                    onChange={handleChange}
                                    className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="message" className="text-xs font-bold text-gray-400 uppercase tracking-widest">Votre message</label>
                                <textarea
                                    id="message"
                                    required
                                    rows={4}
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition-all resize-none"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg transition-all"
                            >
                                {loading ? "Envoi en cours..." : "Envoyer ma demande"}
                            </Button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-10">
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Message envoyé !</h3>
                        <p className="text-gray-500 mb-8 font-medium">Notre équipe reviendra vers vous sous 24h.</p>
                        <Button onClick={onClose} className="bg-gray-900 text-white px-8 rounded-xl h-11 font-bold">Fermer</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
