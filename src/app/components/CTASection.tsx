import { Button } from "./ui/button";
import { Bell } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <span className="text-sm">Lancement imminent • Mars 2026</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold leading-tight">
              Restez informé du lancement de MAGIA
            </h2>
            <p className="text-xl text-purple-100">
              Inscrivez-vous pour recevoir les dernières actualités, obtenir un accès anticipé et bénéficier d'offres exclusives lors du lancement.
            </p>

            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md">
              <h3 className="text-gray-900 font-semibold mb-4">Rejoignez la liste d'attente</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Votre nom"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                />
                <input
                  type="email"
                  placeholder="Votre email professionnel"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                />
                <input
                  type="text"
                  placeholder="Nom de votre entreprise"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
                />
                <Button 
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Bell className="mr-2 w-5 h-5" />
                  M'inscrire à la liste d'attente
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Les premiers inscrits bénéficieront d'offres exclusives
              </p>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 border-2 border-white"
                  ></div>
                ))}
              </div>
              <div>
                <div className="font-semibold">Rejoignez des centaines d'entrepreneurs</div>
                <div className="text-purple-200 text-sm">déjà sur la liste d'attente</div>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758598307046-22f11e2a6917?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b3Jrc3BhY2UlMjBsYXB0b3B8ZW58MXx8fHwxNzcyNTQwMDg4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Espace de travail professionnel"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}