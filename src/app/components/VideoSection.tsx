import { Play, Volume2 } from "lucide-react";
import { useState, useRef } from "react";

export function VideoSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
      {/* Top Transition */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-t from-transparent to-white pointer-events-none"></div>

      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm mb-6">
            <Volume2 className="w-4 h-4" />
            <span className="text-sm">Aperçu de la plateforme</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Découvrez MAGIA en action
          </h2>
          <p className="text-xl text-purple-100">
            Une démonstration rapide de la plateforme qui révolutionnera la façon dont les PME africaines utilisent l'IA
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl bg-gray-900 group">
            {/* Video Element */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              poster="https://images.unsplash.com/photo-1551434678-e076c223a692?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkYXNoYm9hcmQlMjB1aSUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzQxMTk5Mzg4fDA&ixlib=rb-4.1.0&q=80&w=1080"
              controls={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            >
              <source src="https://videos.pexels.com/video-files/3130284/3130284-uhd_2560_1440_30fps.mp4" type="video/mp4" />
              Votre navigateur ne supporte pas la lecture de vidéos.
            </video>

            {/* Play Button Overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer transition-all group-hover:bg-black/50" onClick={handlePlayClick}>
                <div className="relative">
                  {/* Pulse rings */}
                  <div className="absolute inset-0 rounded-full bg-white/30 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>

                  {/* Play button */}
                  <div className="relative w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110">
                    <Play className="w-10 h-10 text-white ml-1" fill="white" />
                  </div>
                </div>
              </div>
            )}

            {/* Video Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">MAGIA Platform Demo</h3>
                  <p className="text-sm text-gray-300">2 minutes • Mars 2026</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-red-600 rounded text-xs font-semibold">
                    PREVIEW
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Video Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold">01</span>
              </div>
              <h4 className="font-semibold mb-2">Interface intuitive</h4>
              <p className="text-sm text-gray-300">Déployez vos agents IA en quelques clics</p>
            </div>
            <div className="text-center p-6 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold">02</span>
              </div>
              <h4 className="font-semibold mb-2">Contrôle total</h4>
              <p className="text-sm text-gray-300">Supervisez et ajustez vos agents en temps réel</p>
            </div>
            <div className="text-center p-6 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold">03</span>
              </div>
              <h4 className="font-semibold mb-2">Analytics puissants</h4>
              <p className="text-sm text-gray-300">Mesurez l'impact de vos agents IA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-white pointer-events-none"></div>
    </section>
  );
}