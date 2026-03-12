import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Slider } from "./ui/slider";

export function PricingSection() {
  const [numAgents, setNumAgents] = useState(2);
  const [selectedPlan, setSelectedPlan] = useState<string>("Pro (Personnalisé)");
  const [isAnnual, setIsAnnual] = useState(false);

  const basePrice = 29;
  const pricePerAgent = 15;
  const monthlyPrice = basePrice + (numAgents - 1) * pricePerAgent;
  const totalPrice = isAnnual ? Math.floor(monthlyPrice * 0.8) : monthlyPrice;
  const credits = numAgents * 1000;

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
        `${numAgents * 2} places utilisateur`,
        "Whatsapp Business inclus",
        "Analytics avancées",
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
    <section id="pricing" className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Payez uniquement pour ce que vous utilisez
          </h2>
          <p className="text-xl text-gray-600">
            Ajustez le curseur pour définir votre équipe IA idéale.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-16 bg-gray-50 p-8 rounded-xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div>
                <div className="font-bold text-gray-900">{numAgents} Agents IA</div>
                <div className="text-sm text-gray-500">Choisissez votre taille d'équipe</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{totalPrice}€<span className="text-sm text-gray-500 font-normal">/mois</span></div>
              <div className="text-sm text-purple-600 font-medium">Facturé {isAnnual ? "annuellement" : "mensuellement"}</div>
            </div>
          </div>
          <div className="flex justify-center mb-8">
            <div className="bg-white p-1 rounded-xl border border-gray-200 inline-flex shadow-sm">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isAnnual ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Annuel <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] uppercase">-20%</span>
              </button>
            </div>
          </div>
          <Slider
            defaultValue={[numAgents]}
            max={50}
            min={1}
            step={1}
            onValueChange={(value) => {
              setNumAgents(value[0]);
              setSelectedPlan("Pro (Personnalisé)");
            }}
            className="mb-4"
          />
          <div className="flex justify-between text-xs text-gray-400 font-medium">
            <span>1 AGENT</span>
            <span>25 AGENTS</span>
            <span>50 AGENTS</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12 items-stretch">
          {plans.map((plan, index) => {
            const isSelected = selectedPlan === plan.name;
            return (
              <div key={index} className="h-full animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both" style={{ animationDelay: `${index * 150}ms` }}>
                <Card
                  onClick={() => setSelectedPlan(plan.name)}
                  className={`h-full p-8 relative flex flex-col transition-all duration-300 cursor-pointer group/card ${isSelected
                    ? 'border-2 border-purple-600 shadow-2xl scale-105 z-10 bg-white'
                    : 'border border-gray-100 hover:border-purple-200 bg-white/50 hover:bg-white hover-premium'
                    }`}
                >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wider shadow-lg">
                      RECOMMANDÉ
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className={`text-xs uppercase font-extrabold tracking-[0.2em] mb-4 transition-colors ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {plan.name}
                  </div>
                  <div className="mb-4">
                    {plan.price === "Enterprise" ? (
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
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isSelected ? 'bg-purple-600' : 'bg-blue-600'}`} />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="lg"
                  className={`w-full rounded-xl h-12 font-bold transition-all ${isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 text-white'
                    : 'bg-white border-gray-200 text-gray-900 hover:bg-purple-50 hover:border-purple-200'
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
      </div>
    </section>
  );
}

