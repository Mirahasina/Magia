import { useState } from "react";
import { Button } from "./ui/button";
import { AuthModals } from "./AuthModals";
import { ScrollReveal } from "./ScrollReveal";

export function CTASection() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <>
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-indigo-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100/[0.04] [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute inset-0 opacity-40 mix-blend-screen">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] animate-[pulse_4s_ease-in-out_infinite]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[100px]"></div>
        </div>

        <ScrollReveal className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 bg-white/5 backdrop-blur-xl border border-white/10 p-12 md:p-20 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 animate-shine"></div>

            <h2 className="text-5xl sm:text-6xl font-extrabold leading-[1.1] tracking-tight text-white mb-6">
              Prêt à déployer<br />votre première équipe IA ?
            </h2>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
              Créez votre compte en 30 secondes. Votre premier agent est opérationnel en moins de 10 minutes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button
                size="lg"
                className="relative group bg-white text-gray-900 hover:bg-gray-50 px-8 h-14 rounded-xl font-bold text-lg overflow-hidden flex items-center gap-2"
                onClick={() => setIsAuthOpen(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-purple-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 flex items-center gap-2">
                  Créer mon compte gratuit
                  <svg className="w-4 h-4 group-hover:translate-x-1 font-black transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-black hover:bg-white/10 h-14 rounded-xl px-8 hover:-translate-y-0.5 transition-transform"
              >
                Parler à un expert
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <AuthModals
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultView="signup"
      />
    </>
  );
}