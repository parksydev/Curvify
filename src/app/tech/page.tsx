import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import TechShowcase from '@/components/marketing/TechShowcase';
import '../marketing.css';
import './tech.css';

export const metadata = {
  title: 'Technology — Curvify',
  description:
    'Curvify technology deep dive — Next.js, custom numerical engine, Web Workers, Supabase, Canvas 2D, KaTeX',
};

export default function TechPage() {
  return (
    <div className="mkt-page tech-page-root">
      <MarketingNav />
      <TechShowcase />
      <MarketingFooter />
    </div>
  );
}
