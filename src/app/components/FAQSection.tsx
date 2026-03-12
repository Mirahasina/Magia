import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./ui/utils";

const faqs = [
    {
        question: "Mes données professionnelles sont-elles en sécurité ?",
        answer: "Absolument. Vos données sont cryptées au repos et en transit. De plus, nous garantissons que vos informations ne sont jamais utilisées pour entraîner les modèles publics d'OpenAI ou Anthropic. Vous gardez le contrôle total."
    },
    {
        question: "Puis-je tester avant de m'engager ?",
        answer: "Oui ! Nous proposons un plan gratuit à vie pour tester vos premiers agents. Aucun numéro de carte bancaire n'est requis pour démarrer. Vous pouvez passer au plan Pro à tout moment pour plus de capacité."
    },
    {
        question: "Quelle est la rapidité de déploiement ?",
        answer: "Grâce à nos templates pré-configurés, vous pouvez lancer un agent fonctionnel en moins de 2 minutes. La personnalisation avancée (connexion à votre base de connaissances) prend généralement moins d'une heure."
    },
    {
        question: "Dois-je savoir coder pour utiliser MAGIA ?",
        answer: "Pas du tout. MAGIA est une plateforme 100% no-code. Toute la configuration se fait via une interface visuelle intuitive. Si vous savez envoyer un email, vous savez déployer un agent MAGIA."
    },
    {
        question: "Dans quels pays MAGIA est-il disponible ?",
        answer: "MAGIA est disponible mondialement, mais nous mettons un accent particulier sur l'Afrique francophone avec un support local et des optimisations pour les connexions internet de la région."
    }
];

export function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50/50 relative overflow-hidden">
            <div className="container mx-auto max-w-4xl">
                <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                        Tout ce qu'il faut savoir
                    </h2>
                    <p className="text-xl text-gray-500">
                        Une équipe IA suscite des questions. Voici nos réponses en toute transparence.
                    </p>
                </div>

                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className={cn(
                                "group bg-white border rounded-xl transition-all duration-300 overflow-hidden",
                                openIndex === i ? "border-blue-200 shadow-xl shadow-blue-500/5 ring-1 ring-blue-50" : "border-gray-100 hover:border-blue-100"
                            )}
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 sm:p-8 text-left focus:outline-none"
                            >
                                <div className="flex items-center gap-6">
                                    <span className={cn(
                                        "text-lg font-bold transition-colors",
                                        openIndex === i ? "text-gray-900" : "text-gray-600"
                                    )}>
                                        {faq.question}
                                    </span>
                                </div>
                                <ChevronDown className={cn(
                                    "w-5 h-5 text-gray-300 transition-transform duration-300",
                                    openIndex === i && "rotate-180 text-blue-500"
                                )} />
                            </button>

                            <div className={cn(
                                "transition-all duration-300 ease-in-out px-8 sm:px-24",
                                openIndex === i ? "max-h-96 pb-8 opacity-100" : "max-h-0 opacity-0"
                            )}>
                                <p className="text-gray-500 leading-relaxed">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-16 p-8 bg-blue-600 rounded-[1rem] flex flex-col md:flex-row items-center justify-between gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="text-white text-center md:text-left">
                        <h3 className="text-2xl font-bold mb-1">D'autres questions ?</h3>
                        <p className="text-blue-100 opacity-80">Notre équipe d'experts est là pour vous accompagner.</p>
                    </div>
                    <button className="px-8 py-4 bg-white text-blue-600 rounded-xl font-black shadow-xl hover:bg-gray-50 transition-colors whitespace-nowrap">
                        Contacter le support
                    </button>
                </div>
            </div>
        </section>
    );
}
