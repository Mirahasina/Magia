import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { DemoModal } from "./DemoModal";
import { ScrollReveal } from "./ScrollReveal";
import landingImage1 from "../../assets/hero-futuristic.png";
import landingImage2 from "../../assets/lading.jpeg";
import landingImage3 from "../../assets/lading2.jpeg";
import landingImage4 from "../../assets/lading3.jpeg";

const images = [landingImage1, landingImage2, landingImage3, landingImage4];

export function HeroSection() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <section id="home" className="relative min-h-[calc(100vh-64px)] flex items-center pt-32 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] -z-10" />
        <ScrollReveal className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col justify-center space-y-8">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight">
                Déployez votre équipe{" "}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  commerciale
                </span>{" "}
                IA en 24h
              </h1>

              <p className="text-xl text-gray-600 max-w-xl">
                Des agents IA qui captent les leads, analysent les besoins, engagent les prospects et transforment les conversations en opportunités commerciales.
              </p>

              <div className="flex gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="hover:scale-105 transition-all shadow-sm hover:shadow-lg border-2 border-indigo-100 hover:border-indigo-300 rounded-xl"
                  onClick={() => setIsDemoOpen(true)}
                >
                  Voir la démo
                </Button>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/30 to-blue-600/30 rounded-full blur-[100px] animate-pulse"></div>
              <div 
                className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-2xl transform transition-transform hover:scale-[1.02] duration-500 animate-[float_6s_ease-in-out_infinite]"
                style={{ aspectRatio: '4/3' }}
              >
                {images.map((img, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                      }`}
                  >
                    <ImageWithFallback
                      src={img}
                      alt={`Équipe d'affaires africaine ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <DemoModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
      />
    </>
  );
}