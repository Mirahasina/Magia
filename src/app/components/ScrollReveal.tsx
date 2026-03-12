import { useEffect, useRef, useState } from 'react';
import { cn } from './ui/utils';

export interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: 'left' | 'right' | 'bottom' | 'top' | 'none';
    distance?: number;
}

export function ScrollReveal({ 
    children, 
    className, 
    delay = 0,
    direction = 'left',
    distance = 150
}: ScrollRevealProps) {
    const elementRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let isTicking = false;

        const handleScroll = () => {
            if (!elementRef.current) return;
            
            const rect = elementRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            // L'animation commence quand le haut de l'élément est à 50px du bas de l'écran
            const startReveal = windowHeight - 50;
            // L'animation se termine quand le haut de l'élément a parcouru 300px supplémentaires
            const endReveal = windowHeight - 350; 
            
            const currentPosition = rect.top;
            
            let targetProgress = 0;
            if (currentPosition > startReveal) {
                targetProgress = 0;
            } else if (currentPosition < endReveal) {
                targetProgress = 1;
            } else {
                targetProgress = (startReveal - currentPosition) / (startReveal - endReveal);
            }

            setProgress((prev) => {
                // Seulement mettre à jour si la différence est au moins de 1% pour éviter trop de re-renders
                if (Math.abs(prev - targetProgress) < 0.01 && targetProgress !== 0 && targetProgress !== 1) {
                    return prev;
                }
                return targetProgress;
            });
        };

        const onScroll = () => {
            if (!isTicking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    isTicking = false;
                });
                isTicking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        
        // Timeout pour vérifier le positionnement initial après le rendu
        const timeout = setTimeout(handleScroll, delay + 100);

        return () => {
            window.removeEventListener('scroll', onScroll);
            clearTimeout(timeout);
        };
    }, [delay]);

    const getTransform = () => {
        if (progress === 1) return 'translate3d(0px, 0px, 0px)';
        // On rend l'animation plus douce et percutante avec easeOut
        const easedProgress = Math.pow(progress, 0.6); 
        const offset = distance * (1 - easedProgress);
        
        switch (direction) {
            case 'left': return `translate3d(${-offset}px, 0px, 0px)`;
            case 'right': return `translate3d(${offset}px, 0px, 0px)`;
            case 'bottom': return `translate3d(0px, ${offset}px, 0px)`;
            case 'top': return `translate3d(0px, ${-offset}px, 0px)`;
            case 'none': return 'translate3d(0px, 0px, 0px)';
            default: return `translate3d(${-offset}px, 0px, 0px)`;
        }
    };

    return (
        <div
            ref={elementRef}
            className={cn("will-change-transform", className)}
            style={{
                opacity: progress === 1 ? 1 : Math.max(0, progress),
                transform: getTransform(),
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
        >
            {children}
        </div>
    );
}
