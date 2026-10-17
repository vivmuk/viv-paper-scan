import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Footer } from '@/components/almanac';
import './globals.css';

const bodoni = localFont({
  src: [
    { path: './fonts/bodoni-moda-semibold.ttf', weight: '600', style: 'normal' },
    { path: './fonts/bodoni-moda-italic.ttf', weight: '400', style: 'italic' },
  ],
  variable: '--font-display', display: 'swap', fallback: ['Georgia', 'Times New Roman'],
});
export const metadata: Metadata = {
  title: { default: 'VIV-PAPER-SCAN', template: '%s | VIV-PAPER-SCAN' },
  description: 'Seventy-four published reporting questions. Every answer points to the sentence it rests on.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={bodoni.variable}><body>
    <a className="skip-link" href="#main">Skip to content</a>
    <main id="main" className="paper">{children}</main><Footer />
  </body></html>;
}
