import { useCallback, useRef } from "react";

export function useSound(src: string, options: { volume?: number } = {}) {
  const { volume = 1 } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.volume = volume;
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      // Ignore autoplay errors - browser may block
    });
  }, [src, volume]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  return { play, stop };
}

// Inline chime sound (base64 encoded)
export const WELCOME_CHIME =
  "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJSqtbWrnYR0aWFvhJqvsLKpnI98bWRqd4ugsLeyqp2PgXRrbnuMnrC1s6qejn90aWt6jJ6wtbSqno+BdGlte4yesLS0qp6Pf3Rpa3uMnrC0tKqej390aWt7jJ6wtLWqno9/dGlre4yesLS0qp6Pf3Rpa3uMnrC0tKqej390aWt7jJ6w";

