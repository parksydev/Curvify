import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import './marketing.css';

const FEATURES = [
  {
    icon: '✎',
    title: 'Sketch to equation',
    description:
      'Draw freehand curves on a live graph. Curvify fits polynomials, trig, exponentials, and more — instantly.',
  },
  {
    icon: '◎',
    title: 'Cartesian & polar',
    description:
      'Switch coordinate systems without losing your flow. One workspace for every way you think about curves.',
  },
  {
    icon: '∫',
    title: 'Calculus overlays',
    description:
      'Visualize derivatives and definite integrals on top of your functions. Analysis, not just plotting.',
  },
  {
    icon: '⇪',
    title: 'Data regression',
    description:
      'Paste CSV points and let the engine find the best model. R² diagnostics included.',
  },
  {
    icon: 'TeX',
    title: 'LaTeX-native',
    description:
      'Every object renders as proper math notation. Copy, share, and publish without retyping.',
  },
  {
    icon: '⬡',
    title: 'Export anywhere',
    description:
      'PNG, SVG, and JSON project files. Your graphs leave the browser when you need them to.',
  },
];

export default function LandingPage() {
  return (
    <div className="mkt-page">
      <MarketingNav />

      <section className="mkt-hero">
        <div className="mkt-hero-bg" aria-hidden>
          <div className="mkt-hero-orb mkt-hero-orb-1" />
          <div className="mkt-hero-orb mkt-hero-orb-2" />
          <div className="mkt-hero-grid" />
        </div>

        <div className="mkt-hero-inner">
          <div className="mkt-hero-copy">
            <div className="mkt-hero-badge">
              <span className="mkt-hero-badge-dot" />
              Now in public beta — free to start
            </div>

            <h1>
              Turn hand-drawn curves into{' '}
              <span className="gradient-text">living equations</span>
            </h1>

            <p className="mkt-hero-lead">
              Curvify is the graph workspace for people who think with their hands. Sketch a curve,
              get a fitted function, analyze it — all in one beautiful canvas.
            </p>

            <div className="mkt-hero-cta">
              <Link href="/signup" className="mkt-btn mkt-btn-primary mkt-btn-lg">
                Start for free →
              </Link>
              <Link href="/pricing" className="mkt-btn mkt-btn-outline mkt-btn-lg">
                View pricing
              </Link>
            </div>

            <div className="mkt-hero-stats">
              <div className="mkt-stat">
                <strong>27+</strong>
                <span>fit algorithms</span>
              </div>
              <div className="mkt-stat">
                <strong>&lt;200ms</strong>
                <span>typical fit time</span>
              </div>
              <div className="mkt-stat">
                <strong>∞</strong>
                <span>undo levels</span>
              </div>
            </div>
          </div>

          <div className="mkt-hero-visual">
            <div className="mkt-float-card mkt-float-card-1">R² = 0.998</div>
            <div className="mkt-float-card mkt-float-card-2">Fit: polynomial</div>

            <div className="mkt-demo-window">
              <div className="mkt-demo-titlebar">
                <span className="mkt-demo-dot red" />
                <span className="mkt-demo-dot yellow" />
                <span className="mkt-demo-dot green" />
                <span>Curvify — Figure 1</span>
              </div>
              <div className="mkt-demo-canvas">
                <div className="mkt-demo-grid-lines" />
                <div className="mkt-demo-curve">
                  <svg viewBox="0 0 400 200" preserveAspectRatio="none">
                    <path
                      d="M 20 160 Q 80 180 120 120 T 200 80 T 280 100 T 380 40"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 20 158 Q 82 178 122 118 T 202 78 T 282 98 T 378 38"
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      opacity="0.7"
                    />
                  </svg>
                </div>
              </div>
              <div className="mkt-demo-equation">f(x) ≈ 0.12x³ − 1.4x² + 4.2x + 1.8</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section-alt" id="features">
        <div className="mkt-section-inner">
          <div className="mkt-section-header">
            <span className="mkt-section-label">Features</span>
            <h2>Everything you need to go from sketch to insight</h2>
            <p>
              Built for students, researchers, and anyone who&apos;s tired of retyping what they
              already drew.
            </p>
          </div>

          <div className="mkt-features-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="mkt-feature-card">
                <div className="mkt-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section" id="how-it-works">
        <div className="mkt-section-inner">
          <div className="mkt-section-header">
            <span className="mkt-section-label">How it works</span>
            <h2>Three steps. Zero friction.</h2>
            <p>No manual curve tracing. No spreadsheet gymnastics. Just draw.</p>
          </div>

          <div className="mkt-steps">
            <div className="mkt-step">
              <span className="mkt-step-num">1</span>
              <h3>Draw your curve</h3>
              <p>
                Pick the function tool and sketch on the graph. Cartesian or polar — your choice.
              </p>
            </div>
            <div className="mkt-step">
              <span className="mkt-step-num">2</span>
              <h3>Get the equation</h3>
              <p>
                Our engine smooths, resamples, and fits the best model. LaTeX appears in the algebra
                panel.
              </p>
            </div>
            <div className="mkt-step">
              <span className="mkt-step-num">3</span>
              <h3>Analyze & export</h3>
              <p>
                Toggle derivatives, integrals, and parameter sliders. Export PNG, SVG, or save your
                project.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-cta-band">
        <h2>Ready to curve smarter?</h2>
        <p>Join thousands of early users sketching their way to better math.</p>
        <Link href="/signup" className="mkt-btn mkt-btn-primary mkt-btn-lg">
          Get started — it&apos;s free
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}
