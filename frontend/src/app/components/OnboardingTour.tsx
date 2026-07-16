import { useEffect, useState } from "react";
import { Joyride, STATUS, type EventData, type Step } from "react-joyride";
import { API_BASE, getAuthHeadersOnly } from "../../lib/api";

interface OnboardingTourProps {
  hasCompletedOnboarding: boolean;
  onComplete: () => void;
}

export function OnboardingTour({ hasCompletedOnboarding, onComplete }: OnboardingTourProps) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (hasCompletedOnboarding === false) {
      const timer = setTimeout(() => {
        setRun(true);
        fetch(`${API_BASE}/auth/complete_onboarding/`, {
          method: "POST",
          headers: getAuthHeadersOnly(),
        }).catch((error) => {
          console.error("Erreur lors de la validation du onboarding automatique:", error);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding]);

  const steps: Step[] = [
    {
      target: "body",
      content: (
        <div className="text-left space-y-3">
          <h3 className="text-lg font-bold text-slate-800">Bienvenue sur MAGIA ! 🎉</h3>
          <p className="text-sm text-slate-600">
            Nous sommes ravis de vous compter parmi nous. Laissez-nous vous faire une présentation rapide de votre nouvel espace de travail.
          </p>
        </div>
      ),
      placement: "center",
      skipBeacon: true,
    },
    {
      target: "#tour-tableau-de-bord",
      content: (
        <div className="text-left space-y-2">
          <h3 className="font-bold text-slate-800">Le Tableau de Bord</h3>
          <p className="text-sm text-slate-600">
            C'est ici que vous retrouverez une vue d'ensemble de vos statistiques, vos Agents IA, et l'activité récente.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: "#tour-agents",
      content: (
        <div className="text-left space-y-2">
          <h3 className="font-bold text-slate-800">Vos Agents IA</h3>
          <p className="text-sm text-slate-600">
            Créez et gérez vos assistants intelligents. Vous pourrez leur attribuer des connaissances et des rôles spécifiques.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: "#tour-bo-te-de-r-ception",
      content: (
        <div className="text-left space-y-2">
          <h3 className="font-bold text-slate-800">La Boîte de Réception Centrale</h3>
          <p className="text-sm text-slate-600">
            Retrouvez tous les messages provenant de WhatsApp, Facebook, LinkedIn et de vos emails. Vos Agents IA y répondront automatiquement !
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: "#tour-param-tres",
      content: (
        <div className="text-left space-y-2">
          <h3 className="font-bold text-slate-800">Paramètres et Intégrations</h3>
          <p className="text-sm text-slate-600">
            Très important : c'est ici que vous devrez connecter vos canaux (WhatsApp, etc.) pour que MAGIA puisse communiquer avec vos clients.
          </p>
        </div>
      ),
      placement: "right",
    },
  ];

  const handleJoyrideCallback = async (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      onComplete();

      try {
        await fetch(`${API_BASE}/auth/complete_onboarding/`, {
          method: "POST",
          headers: getAuthHeadersOnly(),
        });
      } catch (error) {
        console.error("Erreur lors de la validation du onboarding:", error);
      }
    }
  };

  if (hasCompletedOnboarding) {
    return null;
  }

  return (
    <Joyride
      onEvent={handleJoyrideCallback}
      continuous
      run={run}
      scrollToFirstStep
      steps={steps}
      options={{
        zIndex: 10000,
        primaryColor: '#3b82f6', // blue-500
        textColor: '#334155', // slate-700
        overlayColor: 'rgba(15, 23, 42, 0.75)', // slate-900 with opacity
        showProgress: true,
        buttons: ['back', 'skip', 'primary'], // hide close, show skip
      }}
      styles={{
        tooltip: {
          borderRadius: '16px',
          padding: '20px',
        },
        buttonPrimary: {
          backgroundColor: '#2563eb',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          padding: '10px 16px',
        },
        buttonBack: {
          color: '#64748b',
          fontSize: '14px',
          marginRight: '10px',
        },
        buttonSkip: {
          color: '#94a3b8',
          fontSize: '14px',
        }
      }}
      locale={{
        back: 'Précédent',
        close: 'Fermer',
        last: "J'ai compris",
        next: 'Suivant',
        skip: 'Passer le tutoriel',
      }}
    />
  );
}
