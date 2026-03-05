import { Bot, Inbox, BookOpen, BarChart3, Link, Shield } from "lucide-react";
import { Card } from "./ui/card";

const features = [
  {
    icon: Bot,
    title: "Agents IA spécialisés",
    description: "Des agents pré-entraînés par métier : vente, finance, scoring de leads. Chacun codé avec son propre contexte, avec son niveau d'autonomie."
  },
  {
    icon: Inbox,
    title: "Inbox unifiée",
    description: "Toutes les conversations, tous vos agents, centralisées en un seul endroit. Validez les brouillons ou réassignez en un clic."
  },
  {
    icon: BookOpen,
    title: "Knowledge Base RAG",
    description: "Importez PDF, DOCs, Excel ou connectez Google Drive. Vos agents répondent en citant vos propres sources."
  },
  {
    icon: BarChart3,
    title: "Dashboard Temps réel",
    description: "Taux d'automatisation, ROI estimé, feedback des agents. Visualisez l'impact de votre équipe IA en un seul coup d'œil."
  },
  {
    icon: Link,
    title: "Intégrations natives",
    description: "Workflows illimités, déclencheurs et actions pour connecter n'importe quel outil de votre stack (API, Webhooks, etc.)"
  },
  {
    icon: Shield,
    title: "Sécurité & conformité",
    description: "Audit trail complet. Toute action des agents est tracée et révocable. Les données ne servent jamais à entraîner les modèles."
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-4 py-2 bg-blue-50 rounded-full mb-4">
            <span className="text-sm text-blue-600 font-medium">FONCTIONNALITÉS CLÉS</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Tout ce dont votre équipe IA a besoin
          </h2>
          <p className="text-xl text-gray-600">
            Conçu pour les PME, optimisé pour le mobile et la connexion 3G.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-6 bg-gray-900 text-white border-gray-700 hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}