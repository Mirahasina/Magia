import { Play, Volume2, X } from "lucide-react";
import { useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import magiaVideo from "../../assets/MAGIA.mp4";

interface DemoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handlePlayClick = () => {
        if (videoRef.current) {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] animate-in fade-in duration-300" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-5xl z-[101] animate-in zoom-in-95 duration-300">
                    <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-gray-900 group border border-white/10">
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center z-20 backdrop-blur-sm transition-colors border border-white/10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            poster="https://images.unsplash.com/photo-1551434678-e076c223a692?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkYXNoYm9hcmQlMjB1aSUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzQxMTk5Mzg4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                            controls={isPlaying}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                        >
                            <source src={magiaVideo} type="video/mp4" />
                            Votre navigateur ne supporte pas la lecture de vidéos.
                        </video>

                        {!isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer transition-all group-hover:bg-black/50" onClick={handlePlayClick}>
                                <div className="relative">
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
                                    <h3 className="text-xl font-bold text-white mb-1">Démonstration MAGIA</h3>
                                    <p className="text-sm text-gray-300">Découvrez comment déployer vos agents IA en quelques minutes.</p>
                                </div>
                                <div className="hidden sm:flex items-center gap-2">
                                    <div className="px-3 py-1 bg-purple-600 rounded text-xs font-bold text-white tracking-wider">
                                        HD 1080P
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
