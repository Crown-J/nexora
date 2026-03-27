'use client';

import { useEffect, useRef } from 'react';

export function PlanetOrbit({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      const orbits = [
        { rx: 130, ry: 50, rotation: -25, speed: 0.008, dotAngle: 0, hasGear: true },
        { rx: 155, ry: 60, rotation: 25, speed: -0.006, dotAngle: Math.PI / 2, hasGear: false },
        { rx: 110, ry: 42, rotation: 60, speed: 0.01, dotAngle: Math.PI, hasGear: true },
      ];

      orbits.forEach((orbit, index) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((orbit.rotation * Math.PI) / 180);

        ctx.beginPath();
        ctx.ellipse(0, 0, orbit.rx, orbit.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(160, 160, 170, ${0.25 - index * 0.05})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (orbit.hasGear) {
          const tickCount = 36;
          for (let t = 0; t < tickCount; t++) {
            const tickAngle = (t * Math.PI * 2) / tickCount;
            const innerX = Math.cos(tickAngle) * (orbit.rx - 3);
            const innerY = Math.sin(tickAngle) * (orbit.ry - 3);
            const outerX = Math.cos(tickAngle) * (orbit.rx + 3);
            const outerY = Math.sin(tickAngle) * (orbit.ry + 3);

            ctx.beginPath();
            ctx.moveTo(innerX, innerY);
            ctx.lineTo(outerX, outerY);
            ctx.strokeStyle = `rgba(120, 120, 130, ${0.3 - index * 0.08})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        const dotAngle = orbit.dotAngle + time * orbit.speed;
        const dotX = Math.cos(dotAngle) * orbit.rx;
        const dotY = Math.sin(dotAngle) * orbit.ry;

        ctx.beginPath();
        ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180, 180, 190, 1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 100, 110, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 200, 80, 0.95)';
        ctx.fill();

        const gradient = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 15);
        gradient.addColorStop(0, 'rgba(255, 200, 80, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 200, 80, 0)');
        ctx.beginPath();
        ctx.arc(dotX, dotY, 15, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
      });

      const planetRadius = 38;

      const planetGradient = ctx.createRadialGradient(
        centerX - 12,
        centerY - 12,
        0,
        centerX,
        centerY,
        planetRadius
      );
      planetGradient.addColorStop(0, 'rgba(200, 200, 210, 1)');
      planetGradient.addColorStop(0.3, 'rgba(160, 160, 170, 1)');
      planetGradient.addColorStop(0.7, 'rgba(100, 100, 110, 1)');
      planetGradient.addColorStop(1, 'rgba(60, 60, 70, 1)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
      ctx.fillStyle = planetGradient;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
      ctx.clip();

      const bands = [-20, -8, 8, 20];
      bands.forEach((y) => {
        ctx.beginPath();
        ctx.moveTo(centerX - planetRadius, centerY + y);
        ctx.lineTo(centerX + planetRadius, centerY + y);
        ctx.strokeStyle = 'rgba(80, 80, 90, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      const hexSize = 12;
      for (let row = -3; row <= 3; row++) {
        for (let col = -3; col <= 3; col++) {
          const offsetX = (row % 2) * (hexSize * 0.5);
          const hx = centerX + col * hexSize + offsetX;
          const hy = centerY + row * hexSize * 0.9;
          const dist = Math.sqrt((hx - centerX) ** 2 + (hy - centerY) ** 2);

          if (dist < planetRadius - 5) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3 - Math.PI / 6;
              const px = hx + Math.cos(angle) * (hexSize * 0.4);
              const py = hy + Math.sin(angle) * (hexSize * 0.4);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(70, 70, 80, ${0.5 - dist * 0.008})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      const notchCount = 24;
      for (let i = 0; i < notchCount; i++) {
        const angle = (i * Math.PI * 2) / notchCount;
        const innerR = planetRadius - 8;
        const outerR = planetRadius - 4;
        const x1 = centerX + Math.cos(angle) * innerR;
        const y1 = centerY + Math.sin(angle) * innerR;
        const x2 = centerX + Math.cos(angle) * outerR;
        const y2 = centerY + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(50, 50, 60, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 12);
      coreGradient.addColorStop(0, 'rgba(255, 200, 80, 0.8)');
      coreGradient.addColorStop(0.5, 'rgba(255, 180, 60, 0.4)');
      coreGradient.addColorStop(1, 'rgba(255, 160, 40, 0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 200, 80, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      ctx.beginPath();
      ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(180, 180, 190, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const glowGradient = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, 90);
      glowGradient.addColorStop(0, 'rgba(255, 200, 80, 0.15)');
      glowGradient.addColorStop(1, 'rgba(255, 200, 80, 0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      time += 1;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

export function ParticleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }

    const particles: Particle[] = [];
    const particleCount = 50;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
    };

    resize();
    initParticles();
    window.addEventListener('resize', () => {
      resize();
      initParticles();
    });

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();
      });

      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 200, 80, ${0.15 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
