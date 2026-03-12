import { Card } from "./ui/card";
import { ScrollReveal } from "./ScrollReveal";

const milestones = [
  {
    title: "Madagascar",
    subtitle: "Marché primaire",
    description: "Lancement initial à Madagascar pour servir les PME malgaches et francophones"
  },
  {
    title: "Mars 2026",
    subtitle: "Lancement imminent",
    description: "Déploiement en cours avec accès anticipé pour les premiers inscrits"
  },
  {
    title: "15%",
    subtitle: "Objectif de marché",
    description: "Atteindre 15% des PME africaines francophones d'ici 2030"
  },
  {
    title: "500K+",
    subtitle: "Vision 2030",
    description: "500 000 utilisateurs actifs sur la plateforme à horizon 2030"
  }
];

export function AboutSection() {
  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <ScrollReveal className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-6xl font-extrabold mb-6 tracking-tight">
            Notre vision
          </h2>
          <p className="text-xl text-gray-600">
            Démocratiser l'accès à l'intelligence artificielle pour les PME africaines et leur permettre de se concentrer sur leur croissance
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {milestones.map((milestone, index) => {
            return (
              <Card key={index} className="p-6 text-center hover-premium h-full flex flex-col justify-center">
                <h3 className="text-3xl font-bold mb-1">{milestone.title}</h3>
                <p className="text-sm text-purple-600 font-semibold mb-2">{milestone.subtitle}</p>
                <p className="text-gray-600 text-sm">{milestone.description}</p>
              </Card>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Pourquoi MAGIA ?</h3>
            <p className="text-lg text-gray-700">
              Nous croyons que chaque PME africaine mérite d'avoir accès aux mêmes outils que les grandes entreprises internationales. MAGIA est conçu dès le départ pour le contexte africain, avec un ratio puissance/coût optimal et un support francophone complet.
            </p>
            <div className="grid md:grid-cols-3 gap-6 pt-6">
              <div>
                <h4 className="font-semibold mb-1">Innovation</h4>
                <p className="text-sm text-gray-600">Technologies de pointe adaptées au contexte local</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Afrique d'abord</h4>
                <p className="text-sm text-gray-600">Conçu pour et par l'Afrique</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Autonomie</h4>
                <p className="text-sm text-gray-600">Donnons le pouvoir aux entrepreneurs africains</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}