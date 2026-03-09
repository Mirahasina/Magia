import { Card } from "./ui/card";
import {
  Target,
  Coins,
  Users,
  Package,
  Headphones,
  Scale
} from "lucide-react";

const agents = [
  {
    icon: Target,
    name: "Ventes",
    description: "SDR, BDR, AE"
  },
  {
    icon: Coins,
    name: "Finance",
    description: "Compta, facturation"
  },
  {
    icon: Users,
    name: "RH",
    description: "Recrutement, paie"
  },
  {
    icon: Package,
    name: "Logistique",
    description: "Stock, livraison"
  },
  {
    icon: Headphones,
    name: "Support",
    description: "Service client"
  },
  {
    icon: Scale,
    name: "Juridique",
    description: "Contrats, conformité"
  }
];

export function AgentsSection() {
  return (
    <section id="agents" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Des agents dédiés à votre métier
          </h2>
          <p className="text-xl text-gray-600">
            Activez un pack entier d'agents IA de 5 dashboards calibrés pour votre secteur.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {agents.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <Card key={index} className="p-6 bg-white border-gray-200 hover-premium reveal-on-scroll cursor-pointer text-center" style={{ transitionDelay: `${index * 100}ms` }}>
                <div className="mb-4 flex justify-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1">{agent.name}</h3>
                <p className="text-gray-600 text-sm">{agent.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}