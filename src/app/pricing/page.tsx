import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingCards from '@/components/marketing/PricingCards';
import '../marketing.css';

export const metadata = {
  title: 'Pricing — Curvify',
  description: 'Simple, transparent pricing for Curvify',
};

const FAQ = [
  {
    q: 'Do I need a credit card to sign up?',
    a: 'No. Starter is free. Create an account with email and password — your projects sync to your Curvify cloud library.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Projects are saved to Supabase (PostgreSQL) tied to your account. Graph state syncs on save and auto-save every 30 seconds when you edit.',
  },
  {
    q: 'Can I still export locally?',
    a: 'Yes. Use Ctrl+O to import a JSON file. Local export is available from the workspace file menu when needed.',
  },
  {
    q: 'Is there an education discount?',
    a: 'We love classrooms. Email us when Team billing launches — edu pricing is on the roadmap.',
  },
];

export default function PricingPage() {
  return (
    <div className="mkt-page">
      <MarketingNav />

      <section className="mkt-pricing-hero">
        <span className="mkt-section-label">Pricing</span>
        <h1>Simple plans for every curve</h1>
        <p>
          Start free. Scale when your sketches become publications. No hidden fees, no per-export
          charges.
        </p>
      </section>

      <PricingCards />

      <p className="mkt-pricing-note">
        Payment processing is not enabled yet. All plans include cloud project storage with a free account.
      </p>

      <section className="mkt-faq">
        <h2>Frequently asked questions</h2>
        {FAQ.map((item) => (
          <div key={item.q} className="mkt-faq-item">
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
      </section>

      <section className="mkt-cta-band">
        <h2>Still on the fence?</h2>
        <p>Try the full workspace free — no trial timer, no nag screens.</p>
        <Link href="/signup" className="mkt-btn mkt-btn-primary mkt-btn-lg">
          Create free account
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}
