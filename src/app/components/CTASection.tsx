import { Button } from "./ui/button";
import { Sparkles } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-bold leading-tight">
            Prêt à déployer<br />votre première équipe IA ?
          </h2>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">
            Créez votre compte en 30 secondes. Votre premier agent est opérationnel en moins de 10 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 px-8"
            >
              <Sparkles className="mr-2 w-5 h-5" />
              Créer mon compte — gratuit
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              Parler à un expert →
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}