import { Card } from "./ui/card";

const agents = [
  {
    name: "Ventes",
    description: "SDR, BDR, AE"
  },
  {
    name: "Finance",
    description: "Compta, facturation"
  },
  {
    name: "RH",
    description: "Recrutement, paie"
  },
  {
    name: "Logistique",
    description: "Stock, livraison"
  },
  {
    name: "Support",
    description: "Service client"
  },
  {
    name: "Juridique",
    description: "Contrats, conformité"
  }
];

export function AgentsSection() {
  return (
    <section id="agents" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Des agents dédiés à votre métier
          </h2>
          <p className="text-xl text-gray-600">
            Activez un pack entier d'agents IA de 5 dashboards calibrés pour votre secteur.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card key={index} className="p-6 bg-white border-gray-200 hover-premium animate-in fade-in slide-in-from-bottom-4 duration-700 cursor-pointer text-center h-full flex flex-col justify-center" style={{ animationDelay: `${index * 100}ms`, fillMode: "both" }}>
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