import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Check } from "lucide-react";

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
    name: "Pro",
    price: "79",
    period: "/mois",
    subtitle: "Plus les PME voulant automatiser leurs meilleures opérations.",
    features: [
      "10 agents IA inclus",
      "5 000 crédits / mois",
      "10 places utilisateur",
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
    price: "Enterprise",
    period: "",
    subtitle: "Pour les grandes organisations avec des besoins spécifiques.",
    features: [
      "Agents & places illimités",
      "SSO & MMR 2.0",
      "Audit TRAIL acc",
      "Whitelabel dédié",
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

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-4 py-2 bg-blue-50 rounded-full mb-4">
            <span className="text-sm text-blue-600 font-medium">TARIFS</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Simple et transparent
          </h2>
          <p className="text-xl text-gray-600">
            Disponible en Ariary (MGA) et en CFA. Aucune surprise en fin de mois.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`p-8 relative ${
                plan.popular 
                  ? 'border-2 border-blue-600 shadow-xl' 
                  : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    POPULAIRE
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="text-sm text-gray-500 uppercase font-semibold mb-2">
                  {plan.name === "Gratuit" ? "STARTER" : plan.name.toUpperCase()}
                </div>
                <div className="mb-2">
                  {plan.price === "Enterprise" ? (
                    <div className="text-4xl font-bold">{plan.price}</div>
                  ) : (
                    <div>
                      <span className="text-5xl font-bold">{plan.price === "0" ? "Gratuit" : `€${plan.price}`}</span>
                      <span className="text-gray-500">{plan.period}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">{plan.subtitle}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={plan.variant}
                className={`w-full ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white' 
                    : ''
                }`}
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>Tous les plans incluent : SSL inclus, Backups quotidiens, Support français</p>
        </div>
      </div>
    </section>
  );
}
