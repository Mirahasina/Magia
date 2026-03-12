import { ScrollReveal } from "./ScrollReveal";
const steps = [
  {
    number: "01",
    title: "Créez votre compte",
    description: "Email ou Google OAuth. Sélectionnez votre vertical principal — MAGIA Sales pour commencer.",
    time: "30 secondes"
  },
  {
    number: "02",
    title: "Connectez vos outils",
    description: "Gmail ou HubSpot en OAuth. L'agent accède à vos données sans jamais les quitter.",
    time: "60 secondes"
  },
  {
    number: "03",
    title: "Déployez votre agent",
    description: "Choisissez un template, configurez le persona, réglez l'autonomie. Flow guidé en 7 étapes.",
    time: "2 minutes"
  },
  {
    number: "04",
    title: "Votre IA travaille",
    description: "Leads qualifiés, emails répondus, RDV posés. Votre Inbox centralise tout - vous validez ce qui compte.",
    time: "En continu"
  }
];

export function HowItWorksSection() {
  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-100 overflow-hidden">
      <ScrollReveal className="container mx-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase leading-tight">
              DE ZÉRO À L'AGENT <br />
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">EN 10 MINUTES</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-x-8 gap-y-12">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col relative" style={{ transitionDelay: `${index * 150}ms` }}>
                {index > 0 && (
                  <div className="hidden md:block absolute -left-4 top-12 bottom-0 w-px bg-gray-200/60"></div>
                )}
                <div className="text-7xl font-black text-gray-200/80 mb-6 tracking-tighter leading-none">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-8">{step.description}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-px bg-purple-600"></div>
                    <span className="text-[11px] font-mono font-bold text-purple-600 tracking-widest uppercase">{step.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}