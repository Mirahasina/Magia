import { Card } from "./ui/card";
import { ScrollReveal } from "./ScrollReveal";
import { Bot, Inbox, Database, BarChart3, Zap, ShieldCheck } from "lucide-react";
import bgImage from "../../assets/hero-futuristic.png";

const features = [
  {
    title: "Agents IA spécialisés",
    description: "Des agents pré-entraînés par métier : vente, finance, scoring de leads. Chacun codé avec son propre contexte, avec son niveau d'autonomie.",
    icon: Bot
  },
  {
    title: "Inbox unifiée",
    description: "Toutes les conversations, tous vos agents, centralisées en un seul endroit. Validez les brouillons ou réassignez en un clic.",
    icon: Inbox
  },
  {
    title: "Knowledge Base RAG",
    description: "Importez PDF, DOCs, Excel ou connectez Google Drive. Vos agents répondent en citant vos propres sources.",
    icon: Database
  },
  {
    title: "Dashboard Temps réel",
    description: "Taux d'automatisation, ROI estimé, feedback des agents. Visualisez l'impact de votre équipe IA en un seul coup d'œil.",
    icon: BarChart3
  },
  {
    title: "Intégrations natives",
    description: "Workflows illimités, déclencheurs et actions pour connecter n'importe quel outil de votre stack (API, Webhooks, etc.)",
    icon: Zap
  },
  {
    title: "Sécurité & conformité",
    description: "Audit trail complet. Toute action des agents est tracée et révocable. Les données ne servent jamais à entraîner les modèles.",
    icon: ShieldCheck
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      {/* Background Grids and Images */}
      <div className="absolute inset-0 bg-dot-slate-200 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] -z-20 opacity-30" />
      
      {/* Blurred background image */}
      <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full overflow-hidden blur-[100px] opacity-40 -z-10 pointer-events-none">
        <img src={bgImage} alt="" className="w-full h-full object-cover" />
      </div>
      
      <ScrollReveal className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-4 py-2 bg-blue-50 rounded-full mb-4">
            <span className="text-sm text-blue-600 font-medium">FONCTIONNALITÉS CLÉS</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">
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
              <Card key={index} className="relative p-10 bg-white/80 backdrop-blur-sm border-gray-100 shadow-sm hover-neon transition-all duration-500 group overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl group-hover:opacity-40 transition-opacity">
                  <Icon className="w-24 h-24 text-indigo-600" />
                </div>
                <div className="mb-6 relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-100 group-hover:border-indigo-300 rounded-xl flex items-center justify-center transition-all duration-300 shadow-[inset_0_0_15px_rgba(79,70,229,0.1)] group-hover:shadow-[inset_0_0_20px_rgba(79,70,229,0.3)]">
                    <Icon className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-indigo-600 transition-colors relative z-10">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed relative z-10">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}