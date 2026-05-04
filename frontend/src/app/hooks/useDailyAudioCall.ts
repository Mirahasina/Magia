import { useState, useCallback, useEffect } from "react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

interface UseDailyAudioCallReturn {
  callState: "idle" | "calling" | "active" | "error";
  callError: string;
  isMuted: boolean;
  startCall: (roomUrl: string) => Promise<void>;
  handleHangup: () => void;
  toggleMute: () => void;
}

export function useDailyAudioCall(): UseDailyAudioCallReturn {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [callState, setCallState] = useState<"idle" | "calling" | "active" | "error">("idle");
  const [callError, setCallError] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    const co = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: false,
    });
    setCallObject(co);

    return () => {
      co.destroy();
    };
  }, []);

  useEffect(() => {
    if (!callObject) return;

    const handleJoined = () => {
      setCallState("active");
    };

    const handleError = (e: any) => {
      setCallState("error");
      setCallError(e?.errorMsg || "Erreur de connexion Daily");
    };

    const handleLeft = () => {
      setCallState("idle");
      setIsMuted(false);
    };

    callObject.on("joined-meeting", handleJoined);
    callObject.on("error", handleError);
    callObject.on("left-meeting", handleLeft);

    return () => {
      callObject.off("joined-meeting", handleJoined);
      callObject.off("error", handleError);
      callObject.off("left-meeting", handleLeft);
    };
  }, [callObject]);

  const startCall = useCallback(async (roomUrl: string) => {
    if (!callObject) return;
    setCallState("calling");
    setCallError("");

    try {
      await callObject.join({ url: roomUrl });
    } catch (err: any) {
      setCallState("error");
      setCallError(err.message || "Failed to join room");
    }
  }, [callObject]);

  const handleHangup = useCallback(() => {
    if (callObject) {
      callObject.leave();
    }
  }, [callObject]);

  const toggleMute = useCallback(() => {
    if (callObject) {
      const currentAudio = callObject.localAudio();
      callObject.setLocalAudio(!currentAudio);
      setIsMuted(currentAudio);
    }
  }, [callObject]);

  return { callState, callError, isMuted, startCall, handleHangup, toggleMute };
}
