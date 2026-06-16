import Link from 'next/link';

export const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    price: '$0',
    period: 'forever',
    description: 'For students and solo explorers getting started with curve fitting.',
    cta: 'Get started free',
    ctaHref: '/signup',
    highlighted: false,
    features: [
      'Cartesian & polar graphs',
      'Sketch-to-equation fitting',
      '5 projects saved locally',
      'PNG export',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/ month',
    description: 'For researchers and power users who live in their graphs.',
    cta: 'Start Pro trial',
    ctaHref: '/signup?plan=pro',
    highlighted: true,
    features: [
      'Everything in Starter',
      'Unlimited projects',
      'Advanced fit models (Fourier, spline)',
      'Derivative & integral overlays',
      'SVG export & CSV import',
      'Priority email support',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$49',
    period: '/ seat / mo',
    description: 'For labs and classrooms collaborating on visual math.',
    cta: 'Contact sales',
    ctaHref: '/signup?plan=team',
    highlighted: false,
    features: [
      'Everything in Pro',
      'Shared project library',
      'Admin dashboard',
      'SSO & audit logs',
      'Custom branding',
      'Dedicated success manager',
    ],
  },
] as const;

export default function PricingCards() {
  return (
    <div className="pricing-grid">
      {PLANS.map((plan) => (
        <article
          key={plan.id}
          className={`pricing-card${plan.highlighted ? ' pricing-card-featured' : ''}`}
        >
          {plan.highlighted && <span className="pricing-badge">Most popular</span>}
          <h3>{plan.name}</h3>
          <div className="pricing-price">
            <span className="pricing-amount">{plan.price}</span>
            <span className="pricing-period">{plan.period}</span>
          </div>
          <p className="pricing-desc">{plan.description}</p>
          <ul className="pricing-features">
            {plan.features.map((f) => (
              <li key={f}>
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href={plan.ctaHref}
            className={`mkt-btn mkt-btn-full${plan.highlighted ? ' mkt-btn-primary' : ' mkt-btn-outline'}`}
          >
            {plan.cta}
          </Link>
        </article>
      ))}
    </div>
  );
}
