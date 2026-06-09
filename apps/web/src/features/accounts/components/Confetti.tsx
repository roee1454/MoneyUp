import { useEffect, useRef } from 'react';

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = [
      '#f44336',
      '#e91e63',
      '#9c27b0',
      '#673ab7',
      '#3f51b5',
      '#2196f3',
      '#03a9f4',
      '#00bcd4',
      '#009688',
      '#4caf50',
      '#8bc34a',
      '#cddc39',
      '#ffeb3b',
      '#ffc107',
      '#ff9800',
      '#ff5722',
    ];
    const confettiCount = 120;
    const particles: any[] = [];

    class Particle {
      x = Math.random() * width;
      y = Math.random() * height - height - 20;
      r = Math.random() * 6 + 4;
      d = Math.random() * confettiCount;
      color = colors[Math.floor(Math.random() * colors.length)];
      tilt = Math.random() * 10 - 5;
      tiltAngleIncremental = Math.random() * 0.07 + 0.02;
      tiltAngle = 0;

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.lineWidth = this.r / 2;
        ctx.strokeStyle = this.color;
        ctx.moveTo(this.x + this.tilt + this.r / 2, this.y);
        ctx.lineTo(this.x + this.tilt, this.y + this.tilt + this.r / 2);
        ctx.stroke();
      }

      update() {
        this.tiltAngle += this.tiltAngleIncremental;
        this.y += (Math.cos(this.d) + 3 + this.r / 2) / 2;
        this.x += Math.sin(this.tiltAngle);
        this.tilt = Math.sin(this.tiltAngle - this.r / 2) * 5;
      }
    }

    for (let i = 0; i < confettiCount; i++) {
      particles.push(new Particle());
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      let active = false;
      for (const p of particles) {
        p.draw();
        p.update();
        if (p.y < height) {
          active = true;
        }
      }
      if (active) {
        animationFrameId = requestAnimationFrame(draw);
      }
    }

    draw();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
    />
  );
}
