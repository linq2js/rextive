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

// Sound effect generator using Web Audio API
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  // Resume if suspended (required by browsers after user interaction)
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

export function playCoinSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // High-pitched coin sound
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    oscillator.frequency.setValueAtTime(1108, ctx.currentTime + 0.05); // C#6
    oscillator.frequency.setValueAtTime(1318, ctx.currentTime + 0.1); // E6

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.type = "square";
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch {
    // Ignore audio errors
  }
}

export function playCollisionSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Low crash sound
    oscillator.frequency.setValueAtTime(150, ctx.currentTime);
    oscillator.frequency.setValueAtTime(80, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(50, ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.type = "sawtooth";
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Ignore audio errors
  }
}

export function playMatchSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Happy match sound
    oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
    oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5

    gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.35);

    oscillator.type = "sine";
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio errors
  }
}

export function playMismatchSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Sad mismatch sound
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.setValueAtTime(250, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.25);

    oscillator.type = "sine";
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignore audio errors
  }
}

export function playFlipSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.03);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.08);

    oscillator.type = "sine";
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  } catch {
    // Ignore audio errors
  }
}

export function playWinSound() {
  try {
    const ctx = getAudioContext();
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.15);

      osc.type = "sine";
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.2);
    });
  } catch {
    // Ignore audio errors
  }
}

// Inline chime sound (base64 encoded)
export const WELCOME_CHIME =
  "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJSqtbWrnYR0aWFvhJqvsLKpnI98bWRqd4ugsLeyqp2PgXRrbnuMnrC1s6qejn90aWt6jJ6wtbSqno+BdGlte4yesLS0qp6Pf3Rpa3uMnrC0tKqej390aWt7jJ6wtLWqno9/dGlre4yesLS0qp6Pf3Rpa3uMnrC0tKqej390aWt7jJ6w";

// Background music controller
class BackgroundMusicController {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private isPlaying = false;
  private intervalId: number | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.08;
      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playRacingMusic() {
    if (this.isPlaying) return;
    this.stop();
    
    try {
      const ctx = this.getContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      this.isPlaying = true;

      // Racing music - fast arpeggios
      const bassNotes = [110, 130.81, 146.83, 130.81]; // A2, C3, D3, C3
      const melodyNotes = [440, 523.25, 587.33, 659.25, 587.33, 523.25]; // A4, C5, D5, E5, D5, C5
      let bassIndex = 0;
      let melodyIndex = 0;

      const playBeat = () => {
        if (!this.isPlaying) return;

        try {
          const ctx = this.getContext();
          
          // Bass note
          const bassOsc = ctx.createOscillator();
          const bassGain = ctx.createGain();
          bassOsc.connect(bassGain);
          bassGain.connect(this.gainNode!);
          bassOsc.frequency.value = bassNotes[bassIndex % bassNotes.length];
          bassOsc.type = "sawtooth";
          bassGain.gain.setValueAtTime(0.3, ctx.currentTime);
          bassGain.gain.setValueAtTime(0.01, ctx.currentTime + 0.15);
          bassOsc.start();
          bassOsc.stop(ctx.currentTime + 0.15);
          bassIndex++;

          // Melody note (every other beat)
          if (bassIndex % 2 === 0) {
            const melodyOsc = ctx.createOscillator();
            const melodyGain = ctx.createGain();
            melodyOsc.connect(melodyGain);
            melodyGain.connect(this.gainNode!);
            melodyOsc.frequency.value = melodyNotes[melodyIndex % melodyNotes.length];
            melodyOsc.type = "square";
            melodyGain.gain.setValueAtTime(0.15, ctx.currentTime);
            melodyGain.gain.setValueAtTime(0.01, ctx.currentTime + 0.1);
            melodyOsc.start();
            melodyOsc.stop(ctx.currentTime + 0.12);
            melodyIndex++;
          }
        } catch {
          // Ignore individual beat errors
        }
      };

      playBeat();
      this.intervalId = window.setInterval(playBeat, 180); // ~167 BPM
    } catch {
      this.isPlaying = false;
    }
  }

  playMemoryMusic() {
    if (this.isPlaying) return;
    this.stop();

    try {
      const ctx = this.getContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      this.isPlaying = true;

      // Calm, dreamy music for memory game
      const notes = [261.63, 329.63, 392.00, 329.63, 293.66, 349.23, 293.66, 261.63]; // C4, E4, G4, E4, D4, F4, D4, C4
      let noteIndex = 0;

      const playNote = () => {
        if (!this.isPlaying) return;

        try {
          const ctx = this.getContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(this.gainNode!);

          osc.frequency.value = notes[noteIndex % notes.length];
          osc.type = "sine";

          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.01, ctx.currentTime + 0.5);

          osc.start();
          osc.stop(ctx.currentTime + 0.55);
          noteIndex++;
        } catch {
          // Ignore individual note errors
        }
      };

      playNote();
      this.intervalId = window.setInterval(playNote, 600); // Slower tempo
    } catch {
      this.isPlaying = false;
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.oscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // Ignore
      }
    });
    this.oscillators = [];
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}

export const backgroundMusic = new BackgroundMusicController();

