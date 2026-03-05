import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              Votre équipe IA,{" "}
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                opérationnelle
              </span>{" "}
              en 10 min
            </h1>

            <p className="text-xl text-gray-600 max-w-xl">
              Déployez des agents IA spécialisés qui gèrent vos ventes, finances et RH — avec un contrôle humain total à chaque étape.
            </p>

            <div className="flex gap-4">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Commencer gratuitement
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <span>▶</span>
                Voir la démo
              </Button>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur-3xl opacity-20"></div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758519289200-384c7ef2d163?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwYnVzaW5lc3MlMjB0ZWFtJTIwbWVldGluZ3xlbnwxfHx8fDE3NzI1NDAwODd8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Équipe d'affaires africaine"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}