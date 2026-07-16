import { Card } from "./ui/card";
import { ScrollReveal } from "./ScrollReveal";

const agents = [
  {
    title: "QUALIFICATEUR DE LEADS PRO",
    description: "Qualification et scoring des leads entrants. Identifie les chauds, route les froids, enrichit HubSpot automatiquement.",
    tags: ["EMAIL", "CHAT WEB"],
    time: "90 sec",
  },
  {
    title: "RÉPONDEUR D'EMAILS",
    description: "Répond avec le ton de votre marque sur Gmail et Outlook. Score de confiance avant chaque envoi, brouillons en 1 clic.",
    tags: ["GMAIL", "OUTLOOK"],
    time: "2 min",
  },
  {
    title: "PLANIFICATEUR DE RÉUNIONS",
    description: "Prise de RDV automatique synchronisée avec Google Calendar. Mode Suggest par défaut - vous validez avant confirmation.",
    tags: ["GMAIL", "CHAT"],
    time: "2 min",
  },
  {
    title: "VENTES WHATSAPP",
    description: "Prospection et suivi sur le canal dominant en Afrique subsaharienne. WhatsApp Business API officielle. Add-on +€49.",
    tags: ["WHATSAPP", "OPTION"],
    time: "3 min",
  },
  {
    title: "AGENT DE RELANCE",
    description: "Relances intelligentes et personnalisées. Ne laissez plus jamais un prospect sans réponse. J+1, J+3, J+7 configurables.",
    tags: ["GMAIL", "SMS"],
    time: "90 sec",
  },
  {
    title: "ENRICHISSEUR CRM",
    description: "Enrichissement automatique de HubSpot et Salesforce. Full Auto - aucune intervention humaine. 99% de précision.",
    tags: ["HUBSPOT", "SALESFORCE"],
    time: "2 min",
  },
];

export function AgentsSection() {
  return (
    <section id="agents" className="py-24 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-100 overflow-hidden">
      <ScrollReveal className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-tight">
            <span className="bg-gradient-to-r from-blue-900 via-blue-900 to-blue-600 bg-clip-text text-transparent">
              AGENTS IA
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {agents.map((agent, index) => (
            <Card key={index} className="p-8 bg-white border border-gray-100 rounded-2xl hover:border-blue-100 transition-all group relative overflow-hidden shadow-sm hover-premium" style={{ transitionDelay: `${index * 100}ms` }}>
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-sm font-bold leading-none text-gray-900 group-hover:text-blue-900 transition-colors uppercase tracking-tight">
                    {agent.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-500 mb-6 flex-grow">
                  {agent.description}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                  <div className="flex gap-2">
                    {agent.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-black px-2 py-1 bg-gray-50 text-gray-400 rounded-md group-hover:bg-blue-50 group-hover:text-blue-900 transition-colors">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black text-orange-500">
                    {agent.time}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}