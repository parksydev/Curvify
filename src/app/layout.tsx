import type { Metadata } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import AuthProvider from '@/components/providers/AuthProvider';
import './globals.css';
import 'katex/dist/katex.min.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Curvify',
    template: '%s · Curvify',
  },
  description: 'Sketch curves into equations — the graph workspace for visual mathematicians',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={sourceSans.className}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
