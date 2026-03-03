import { ImageWithFallback } from "./figma/ImageWithFallback";
import { CheckCircle2 } from "lucide-react";
import React from "react";
import etapeImg from "../../assets/etape.png"; 

const steps = [
  {
    number: "01",
    title: "Sélectionnez vos agents",
    description: "Choisissez parmi notre catalogue d'agents IA spécialisés selon vos besoins métier."
  },
  {
    number: "02",
    title: "Configurez les workflows",
    description: "Définissez les règles et les processus que vos agents devront suivre avec notre interface intuitive."
  },
  {
    number: "03",
    title: "Pilotez et optimisez",
    description: "Surveillez les performances en temps réel et ajustez votre équipe IA selon vos objectifs."
  }
];

export function HowItWorksSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Comment ça fonctionnera ?
          </h2>
          <p className="text-xl text-gray-600">
            Trois étapes simples pour déployer votre AI Workforce
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Steps */}
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                    {step.number}
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-lg">{step.description}</p>
                </div>
              </div>
            ))}

            <div className="pt-6 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Aucune expertise technique requise</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Support francophone dédié</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Formation et accompagnement inclus</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-3xl opacity-20"></div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl w-full h-[400px]">
              <img
                src={etapeImg}
                alt="Dashboard MAGIA"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}