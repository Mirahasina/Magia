import { CheckCircle2 } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Inscrivez-vous",
    description: "Créez votre compte MAGIA en quelques secondes avec votre email professionnel."
  },
  {
    number: "02",
    title: "Choisissez vos agents",
    description: "Sélectionnez les agents IA adaptés à vos besoins depuis notre catalogue."
  },
  {
    number: "03",
    title: "Configurez et lancez",
    description: "Personnalisez les workflows et déployez vos agents IA immédiatement."
  },
  {
    number: "04",
    title: "Supervisez et optimisez",
    description: "Suivez les performances en temps réel et ajustez selon vos objectifs."
  }
];

export function HowItWorksSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4 reveal-on-scroll" style={{ transitionDelay: `${index * 150}ms` }}>
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                    {step.number}
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-extrabold mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}