import { useState } from "react";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { DemoModal } from "./DemoModal";

export function HeroSection() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  return (
    <>
      <section className="min-h-[calc(100vh-64px)] flex items-center pt-32 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="flex flex-col justify-center space-y-8 reveal-on-scroll">
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold leading-[1.1] tracking-tight">
                Déployez votre équipe{" "}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  commerciale
                </span>{" "}
                IA en 24h
              </h1>

              <p className="text-xl text-gray-600 max-w-xl">
                Déployez des agents IA spécialisés qui gèrent vos ventes, finances et RH avec un contrôle humain total à chaque étape.
              </p>

              <div className="flex gap-4">
                {/* <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  Commencer gratuitement
                </Button> */}
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setIsDemoOpen(true)}
                >
                  Voir la démo
                </Button>
              </div>
            </div>

            <div className="relative flex items-center justify-center reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur-3xl opacity-20 scale-110"></div>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl w-full max-w-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1758519289200-384c7ef2d163?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwYnVzaW5lc3MlMjB0ZWFtJTIwbWVldGluZ3xlbnwxfHx8fDE3NzI1NDAwODd8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Équipe d'affaires africaine"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <DemoModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
      />
    </>
  );
}