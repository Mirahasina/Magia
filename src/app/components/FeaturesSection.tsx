import { Zap, Shield, TrendingUp, Users, Clock, Globe } from "lucide-react";
import { Card } from "./ui/card";

const features = [
  {
    icon: Zap,
    title: "Déploiement Express",
    description: "Mettez en place votre équipe d'agents IA en moins de 24 heures sans expertise technique requise."
  },
  {
    icon: Shield,
    title: "Contrôle Total",
    description: "Gardez un contrôle humain granulaire sur chaque action de vos agents IA avec des workflows personnalisables."
  },
  {
    icon: TrendingUp,
    title: "Scalabilité Garantie",
    description: "Architecture pensée pour grandir avec vous, de 10 à 500 000 utilisateurs sans refonte."
  },
  {
    icon: Users,
    title: "Agents Spécialisés",
    description: "Agents IA spécialisés par métier : vente, support client, comptabilité, RH et plus encore."
  },
  {
    icon: Clock,
    title: "Gain de Temps",
    description: "Automatisez jusqu'à 80% de vos tâches répétitives et concentrez-vous sur la croissance."
  },
  {
    icon: Globe,
    title: "Adapté à l'Afrique",
    description: "Conçu pour le contexte africain avec un ratio puissance/coût optimal et support francophone."
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Ce que <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">MAGIA</span> vous apportera
          </h2>
          <p className="text-xl text-gray-600">
            Une plateforme complète pour transformer vos opérations avec l'intelligence artificielle
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-6 glass-card hover:shadow-2xl transition-all hover:-translate-y-2 border-transparent hover:border-purple-200 group">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}