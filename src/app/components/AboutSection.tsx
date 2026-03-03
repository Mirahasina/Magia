import { Card } from "./ui/card";
import { MapPin, Calendar, Target, Rocket } from "lucide-react";

const milestones = [
  {
    icon: MapPin,
    title: "Madagascar",
    subtitle: "Marché primaire",
    description: "Lancement initial à Madagascar pour servir les PME malgaches et francophones"
  },
  {
    icon: Calendar,
    title: "Mars 2026",
    subtitle: "Lancement imminent",
    description: "Déploiement en cours avec accès anticipé pour les premiers inscrits"
  },
  {
    icon: Target,
    title: "15%",
    subtitle: "Objectif de marché",
    description: "Atteindre 15% des PME africaines francophones d'ici 2030"
  },
  {
    icon: Rocket,
    title: "500K+",
    subtitle: "Vision 2030",
    description: "500 000 utilisateurs actifs sur la plateforme à horizon 2030"
  }
];

export function AboutSection() {
  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Notre vision
          </h2>
          <p className="text-xl text-gray-600">
            Démocratiser l'accès à l'intelligence artificielle pour les PME africaines et leur permettre de se concentrer sur leur croissance
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {milestones.map((milestone, index) => {
            const Icon = milestone.icon;
            return (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-3xl font-bold mb-1">{milestone.title}</h3>
                <p className="text-sm text-purple-600 font-semibold mb-2">{milestone.subtitle}</p>
                <p className="text-gray-600 text-sm">{milestone.description}</p>
              </Card>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-3xl p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h3 className="text-3xl font-bold">Pourquoi MAGIA ?</h3>
            <p className="text-lg text-gray-700">
              Nous croyons que chaque PME africaine mérite d'avoir accès aux mêmes outils que les grandes entreprises internationales. MAGIA est conçu dès le départ pour le contexte africain, avec un ratio puissance/coût optimal et un support francophone complet.
            </p>
            <div className="grid md:grid-cols-3 gap-6 pt-6">
              <div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold mb-1">Innovation</h4>
                <p className="text-sm text-gray-600">Technologies de pointe adaptées au contexte local</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold mb-1">Afrique d'abord</h4>
                <p className="text-sm text-gray-600">Conçu pour et par l'Afrique</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold mb-1">Autonomie</h4>
                <p className="text-sm text-gray-600">Donnons le pouvoir aux entrepreneurs africains</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}