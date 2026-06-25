'use client';

import { useEffect, useRef, useState } from 'react';

/** Animated sketch → clean curve for preprocessing section */
export function PreprocessViz({ progress }: { progress: number }) {
  const raw = 'M 20 140 L 45 135 L 70 120 L 95 125 L 120 90 L 145 95 L 170 70 L 195 75 L 220 50';
  const smooth = 'M 20 138 Q 60 130 100 110 T 180 55 L 220 48';

  return (
    <svg className="tech-math-svg" viewBox="0 0 240 160" aria-hidden>
      <defs>
        <pattern id="techGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="240" height="160" fill="url(#techGrid)" />
      {/* Raw noisy points */}
      {[
        [20, 140], [45, 135], [70, 120], [95, 125], [120, 90],
        [145, 95], [170, 70], [195, 75], [220, 50],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={3}
          className="tech-pt-raw"
          style={{ opacity: 1 - progress * 0.85, transform: `scale(${1 - progress * 0.3})` }}
        />
      ))}
      <path
        d={raw}
        fill="none"
        stroke="rgba(255,100,100,0.5)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        style={{ opacity: 1 - progress }}
      />
      <path
        d={smooth}
        fill="none"
        stroke="#2997ff"
        strokeWidth="2.5"
        className="tech-curve-draw"
        style={{
          strokeDashoffset: 300 * (1 - progress),
          opacity: progress,
        }}
      />
    </svg>
  );
}

/** QR matrix visualization */
export function QRViz({ active }: { active: boolean }) {
  return (
    <div className={`tech-qr-viz ${active ? 'tech-qr-viz--on' : ''}`}>
      <div className="tech-matrix tech-matrix--a">
        <span className="tech-matrix-label">A (m×n)</span>
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="tech-cell" style={{ '--d': i } as React.CSSProperties} />
        ))}
      </div>
      <span className="tech-qr-op">→ QR →</span>
      <div className="tech-matrix tech-matrix--r">
        <span className="tech-matrix-label">R (n×n)</span>
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="tech-cell upper" style={{ '--d': i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}

/** Model family cards with LaTeX-style labels */
export function ModelFamilyViz({ highlight }: { highlight: number }) {
  const models = [
    { id: 'poly', tex: 'y = Σ aᵢxⁱ', name: '다항식', sub: 'AIC 자동 차수' },
    { id: 'exp', tex: 'y = ae^(bx)', name: '지수', sub: 'ln 선형화' },
    { id: 'pow', tex: 'y = ax^b', name: '거듭제곱', sub: 'log-log 회귀' },
    { id: 'fourier', tex: 'a₀+Σ(aₖsin kx+bₖcos kx)', name: '푸리에', sub: '4 고조파' },
    { id: 'pchip', tex: 'C¹ PCHIP', name: '스플라인', sub: 'Fritsch–Carlson' },
    { id: 'log', tex: 'y = a+b·ln x', name: '로그', sub: '반로그 회귀' },
  ];

  return (
    <div className="tech-model-grid">
      {models.map((m, i) => (
        <div
          key={m.id}
          className={`tech-model-card ${highlight === i ? 'tech-model-card--active' : ''}`}
        >
          <span className="tech-model-tex">{m.tex}</span>
          <strong>{m.name}</strong>
          <small>{m.sub}</small>
        </div>
      ))}
    </div>
  );
}

/** R² gauge animation */
export function RSquaredGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="tech-r2-gauge">
      <svg viewBox="0 0 120 70" aria-hidden>
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" strokeLinecap="round" />
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="url(#r2grad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${pct * 1.57} 157`}
          className="tech-r2-arc"
        />
        <defs>
          <linearGradient id="r2grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0072bd" />
            <stop offset="100%" stopColor="#5ac8fa" />
          </linearGradient>
        </defs>
      </svg>
      <span className="tech-r2-value">R² = {value.toFixed(3)}</span>
    </div>
  );
}

/** Hero floating particles */
export function MathParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0004,
      vy: (Math.random() - 0.5) * 0.0004,
      r: Math.random() * 2 + 0.5,
      sym: ['∫', '∑', 'π', 'θ', 'ƒ', '∂'][Math.floor(Math.random() * 6)],
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#5ac8fa';
        ctx.font = `${10 + p.r * 4}px serif`;
        ctx.fillText(p.sym, p.x * w, p.y * h);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="tech-particles" aria-hidden />;
}

/** Scroll progress for pinned chapter — starts earlier, completes with less scroll */
export function useChapterProgress(sectionRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Begin when section enters upper 70% of viewport; finish over a shorter range
      const startLine = vh * 0.7;
      const scrolled = startLine - rect.top;
      const scrollRange = Math.max(vh * 0.55, el.offsetHeight - vh * 0.45);
      setProgress(Math.min(1, Math.max(0, scrolled / scrollRange)));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sectionRef]);

  return progress;
}
