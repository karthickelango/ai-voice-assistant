import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types/index.ts';

interface AtmosphericBackgroundProps {
  state: AssistantState;
  audioLevel: number;
}

export const AtmosphericBackground: React.FC<AtmosphericBackgroundProps> = ({ state, audioLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrame: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Subtle atmospheric particles
    const particleCount = prefersReducedMotion ? 25 : 55;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.15,
      speedY: (Math.random() - 0.5) * 0.15,
      opacity: Math.random() * 0.4 + 0.1,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw faint particles
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x += p.speedX * (state === 'THINKING' ? 1.8 : 1);
          p.y += p.speedY * (state === 'THINKING' ? 1.8 : 1);

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

        if (state === 'ERROR') {
          ctx.fillStyle = `rgba(251, 113, 133, ${p.opacity * 0.7})`;
        } else if (state === 'LISTENING') {
          ctx.fillStyle = `rgba(103, 232, 249, ${p.opacity * 0.9})`;
        } else {
          ctx.fillStyle = `rgba(125, 211, 252, ${p.opacity * 0.6})`;
        }

        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
    };
  }, [state]);

  // Dynamic glow calculation based on state and audio level
  const getAmbientColors = () => {
    switch (state) {
      case 'LISTENING':
        return {
          glow1: `rgba(6, 182, 212, ${0.15 + audioLevel * 0.15})`,
          glow2: `rgba(14, 165, 233, ${0.1 + audioLevel * 0.1})`,
        };
      case 'THINKING':
        return {
          glow1: 'rgba(56, 189, 248, 0.18)',
          glow2: 'rgba(99, 102, 241, 0.14)',
        };
      case 'SPEAKING':
        return {
          glow1: `rgba(34, 211, 238, ${0.14 + audioLevel * 0.12})`,
          glow2: `rgba(14, 116, 144, ${0.12 + audioLevel * 0.1})`,
        };
      case 'ERROR':
        return {
          glow1: 'rgba(244, 63, 94, 0.15)',
          glow2: 'rgba(190, 24, 93, 0.08)',
        };
      case 'IDLE':
      default:
        return {
          glow1: 'rgba(6, 182, 212, 0.08)',
          glow2: 'rgba(15, 23, 42, 0.6)',
        };
    }
  };

  const ambient = getAmbientColors();

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#05070c]">
      {/* Dynamic central radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[140px] transition-all duration-1000 ease-out"
        style={{
          background: `radial-gradient(circle, ${ambient.glow1} 0%, ${ambient.glow2} 45%, transparent 70%)`,
        }}
      />

      {/* Subtle top vignetting */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070c]/80 via-transparent to-[#05070c]/90" />

      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />

      {/* Subtle futuristic coordinate grid lines (very low opacity) */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)',
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
};
