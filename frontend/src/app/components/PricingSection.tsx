import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Slider } from "./ui/slider";
import { ScrollReveal } from "./ScrollReveal";

interface PricingSectionProps {
  openAuth: (view: "login" | "signup") => void;
  openContact: () => void;
  onRequestEnterprise: () => void;
  openPayment: (details: { numAgents: number; isAnnual: boolean; totalPrice: number }) => void;
}

export function PricingSection({ openAuth, openContact, onRequestEnterprise, openPayment }: PricingSectionProps) {
  const [numAgents, setNumAgents] = useState(2);
  const [selectedPlan, setSelectedPlan] = useState<string>("Pro (Personnalisé)");
  const [isAnnual, setIsAnnual] = useState(false);

  const basePrice = 29;
  const pricePerAgent = 15;
  const monthlyPrice = basePrice + (numAgents - 1) * pricePerAgent;
  const totalPrice = isAnnual ? Math.floor(monthlyPrice * 12 * 0.8 / 12) : monthlyPrice;
  const credits = numAgents * 1000;
  const userPlaces = numAgents * 2;

  const handlePlanClick = (planName: string) => {
    setSelectedPlan(planName);
  };

  const handleCTA = (planName: string) => {
    if (planName === "Gratuit") openAuth("signup");
    else if (planName === "Sur mesure") onRequestEnterprise();
    else openPayment({ numAgents, isAnnual, totalPrice });
  };

  const plans = [
    {
      name: "Gratuit",
      price: "0",
      period: "/mois",
      subtitle: "Pour découvrir MAGIA et tester les premiers agents.",
      features: [
        "2 agents IA inclus",
        "500 crédits / mois",
        "2 places utilisateur",
        "1 inbox unifiée",
        "Support Email"
      ],
      cta: "Commencer gratuitement",
      variant: "outline" as const,
      popular: false
    },
    {
      name: "Pro (Personnalisé)",
      price: totalPrice.toString(),
      period: "/mois",
      subtitle: "Ajustez selon vos besoins et ne payez que ce que vous utilisez.",
      features: [
        `${numAgents} agents IA inclus`,
        `${credits.toLocaleString()} crédits / mois`,
        `${userPlaces} places utilisateur`,
        `Puissance Machine : ${Math.min(100, 20 + numAgents * 2)}%`,
        `Optimisation IA : ${Math.min(100, 85 + Math.floor(numAgents/2))}%`,
        "Whatsapp Business inclus",
        "API & Webhooks",
        "Support prioritaire"
      ],
      cta: "Démarrer en Pro",
      variant: "default" as const,
      popular: true
    },
    {
      name: "Sur mesure",
      price: "Entreprise",
      period: "",
      subtitle: "Pour les grandes organisations avec des besoins spécifiques.",
      features: [
        "Agents & places illimités",
        "SSO & MMR 2.0",
        "Audit Trail complet",
        "Marque blanche dédiée",
        "Analytics avancées",
        "SLA garanti 99.9%",
        "Hébergement dédié",
        "Accompagnement dédié"
      ],
      cta: "Contacter l'équipe",
      variant: "outline" as const,
      popular: false
    }
  ];


  return (
    <section id="pricing" className="py-32 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <ScrollReveal className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Payez uniquement pour ce que vous utilisez
          </h2>
        </div>

        {selectedPlan === "Pro (Personnalisé)" && (
          <div className="max-w-2xl mx-auto mb-16 bg-gray-50/50 p-10 sm:p-12 rounded-3xl border border-gray-100 shadow-xl shadow-blue-800/5 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/40 to-transparent rounded-full -mr-16 -mt-16 blur-3xl"></div>

            <div className="text-center mb-10 relative z-10">
              <div className="inline-flex items-center justify-center gap-2 mb-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white shadow-sm">
                <span className="text-2xl sm:text-3xl font-black text-blue-950 tabular-nums">{numAgents}</span>
                <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-900 to-blue-900 bg-clip-text text-transparent uppercase tracking-tight">Agents IA</span>
              </div>
              <p className="text-gray-500 font-bold text-sm sm:text-base uppercase tracking-widest opacity-80">
                Choisissez votre taille d'équipe
              </p>
            </div>
            <div className="flex justify-center mb-8">
              <div className="bg-white p-1 rounded-xl border border-gray-200 inline-flex shadow-sm">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isAnnual ? 'bg-blue-50 text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Mensuel
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'bg-blue-50 text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Annuel <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] uppercase">-20%</span>
                </button>
              </div>
            </div>
            <Slider
              value={[numAgents]}
              max={50}
              min={1}
              step={1}
              onValueChange={(value) => setNumAgents(value[0])}
              className="mb-4"
            />
            <div className="flex justify-between text-xs text-gray-400 font-medium">
              <span>1 AGENT</span>
              <span>25 AGENTS</span>
              <span>50 AGENTS</span>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12 items-stretch">
          {plans.map((plan, index) => {
            const isSelected = selectedPlan === plan.name;
            return (
              <div key={index} className="h-full" style={{ transitionDelay: `${index * 150}ms` }}>
                <Card
                  onClick={() => handlePlanClick(plan.name)}
                  className={`h-full p-8 relative flex flex-col transition-all duration-300 cursor-pointer group/card ${isSelected
                    ? 'border-2 border-blue-900 shadow-2xl scale-105 z-10 bg-white'
                    : 'border border-gray-100 hover:border-blue-200 bg-white/50 hover:bg-white hover-premium'
                    }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="bg-gradient-to-r from-blue-900 to-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wider shadow-lg">
                        RECOMMANDÉ
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <div className={`text-xs uppercase font-extrabold tracking-[0.2em] mb-4 transition-colors ${isSelected ? 'text-blue-900' : 'text-gray-400'}`}>
                      {plan.name}
                    </div>
                    <div className="mb-4">
                      {plan.price === "Entreprise" ? (
                        <div className="text-5xl font-black text-gray-900 py-2">{plan.price}</div>
                      ) : (
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-6xl font-extrabold text-gray-900 tracking-tighter">{plan.price === "0" ? "0€" : `${plan.price}€`}</span>
                          <span className="text-gray-400 font-medium">{plan.period}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed px-4">{plan.subtitle}</p>
                  </div>

                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isSelected ? 'bg-blue-900' : 'bg-blue-600'}`} />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCTA(plan.name);
                    }}
                    className={`w-full rounded-xl h-12 font-bold transition-all ${isSelected
                      ? 'bg-gradient-to-r from-blue-900 to-blue-600 hover:from-blue-950 hover:to-blue-700 shadow-lg shadow-blue-900/25 text-white'
                      : 'bg-white border-gray-200 text-gray-900 hover:bg-blue-50 hover:border-blue-200'
                      }`}
                  >
                    {plan.cta}
                  </Button>
                </Card>
              </div>
            );
          })}
        </div>

        <div className="text-center text-sm text-gray-500 bg-gray-50 inline-block px-10 py-4 rounded-xl mx-auto w-full max-w-2xl border border-gray-100 italic">
          <p>Tous les plans incluent : Installation Guidée, Support Tech 24/7, Conformité RGPD & Hébergement local.</p>
        </div>
      </ScrollReveal>
    </section>
  );
}

