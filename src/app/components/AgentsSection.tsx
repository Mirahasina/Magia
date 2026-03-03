import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Headphones,
  ShoppingCart,
  Calculator,
  UserCheck,
  BarChart3,
  MessageSquare,
  FileText,
  Briefcase
} from "lucide-react";

const agents = [
  {
    icon: ShoppingCart,
    name: "Agent Commercial",
    description: "Prospection, qualification de leads, suivi des opportunités et automatisation du cycle de vente.",
    tags: ["Vente", "CRM", "Lead Gen"]
  },
  {
    icon: Headphones,
    name: "Agent Support Client",
    description: "Réponses automatiques, gestion des tickets, support multicanal 24/7 en français.",
    tags: ["Support", "Chat", "Tickets"]
  },
  {
    icon: Calculator,
    name: "Agent Comptable",
    description: "Facturation, rapprochement bancaire, suivi de trésorerie et reporting financier.",
    tags: ["Finance", "Compta", "Facturation"]
  },
  {
    icon: UserCheck,
    name: "Agent RH",
    description: "Recrutement, onboarding, gestion des congés et automatisation des processus RH.",
    tags: ["RH", "Recrutement", "Gestion"]
  },
  {
    icon: BarChart3,
    name: "Agent Analytics",
    description: "Collecte et analyse de données, tableaux de bord personnalisés et insights métier.",
    tags: ["Data", "Analytics", "BI"]
  },
  {
    icon: MessageSquare,
    name: "Agent Marketing",
    description: "Gestion des campagnes, création de contenu, social media et email marketing.",
    tags: ["Marketing", "Content", "Social"]
  },
  {
    icon: FileText,
    name: "Agent Documentation",
    description: "Création et gestion de documents, knowledge base et automatisation administrative.",
    tags: ["Docs", "Admin", "KB"]
  },
  {
    icon: Briefcase,
    name: "Agent Opérations",
    description: "Gestion de projets, coordination d'équipes et optimisation des processus métier.",
    tags: ["Ops", "Projets", "Process"]
  }
];

export function AgentsSection() {
  return (
    <section id="agents" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Nos futurs <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">agents IA</span>
          </h2>
          <p className="text-xl text-gray-600">
            Des agents spécialisés pour chaque fonction de votre entreprise
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <Card key={index} className="p-6 glass-card hover:shadow-2xl transition-all hover:-translate-y-2 cursor-pointer group">
                <div className="flex flex-col h-full">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-xl font-bold mb-2">{agent.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 flex-1">{agent.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {agent.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center space-y-4">
          <p className="text-gray-600">
            Nouveau vertical métier déployé tous les 2 à 3 mois
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow-md">
            <span className="text-sm font-medium">Marketplace prévue après le lancement</span>
            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600">2026</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}