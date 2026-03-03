import { Button } from "./ui/button";
import { Bell } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full border border-purple-200">
              <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
              <span className="text-sm text-purple-700">Lancement imminent • Mars 2026</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                MAGIA
              </span>{" "}
              arrive bientôt
            </h1>

            <p className="text-xl text-gray-600 max-w-xl">
              La première plateforme AI Workforce qui permettra aux PME africaines de déployer et orchestrer des agents IA spécialisés en 24h. Automatisez vos opérations tout en gardant un contrôle humain total.
            </p>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 max-w-md">
              <h3 className="font-semibold mb-3">Soyez parmi les premiers informés</h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Votre email professionnel"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6">
                  <Bell className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Recevez les dernières actualités et l'accès prioritaire au lancement
              </p>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div>
                <div className="text-3xl font-bold text-gray-900">500K+</div>
                <div className="text-sm text-gray-600">Objectif utilisateurs 2030</div>
              </div>
              <div className="w-px h-12 bg-gray-300"></div>
              <div>
                <div className="text-3xl font-bold text-gray-900">24h</div>
                <div className="text-sm text-gray-600">Déploiement rapide</div>
              </div>
              <div className="w-px h-12 bg-gray-300"></div>
              <div>
                <div className="text-3xl font-bold text-gray-900">2026</div>
                <div className="text-sm text-gray-600">Lancement imminent</div>
              </div>
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