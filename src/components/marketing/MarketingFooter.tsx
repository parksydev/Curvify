import Link from 'next/link';

export default function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-inner">
        <div className="mkt-footer-brand">
          <Link href="/" className="mkt-logo">
            <span className="mkt-logo-mark" aria-hidden>
              ∿
            </span>
            Curvify
          </Link>
          <p className="mkt-footer-tagline">
            Sketch curves. Get equations. Ship insights faster.
          </p>
        </div>

        <div className="mkt-footer-columns">
          <div>
            <h4>Product</h4>
            <Link href="/#features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/app">Workspace</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/signup">Sign up</Link>
            <Link href="/login">Log in</Link>
          </div>
        </div>
      </div>

      <div className="mkt-footer-bottom">
        <span>© {new Date().getFullYear()} Curvify, Inc.</span>
        <span className="mkt-footer-badge">Powered by Supabase</span>
      </div>
    </footer>
  );
}
