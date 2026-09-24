import type { Metadata } from 'next';
import { appUrl } from '@/lib/config';
import { Header, Footer } from '@/components/brand';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: 'YQG Events — A little more local', template: '%s | YQG Events' },
  description:
    'Discover markets, music, festivals and things to do in Windsor–Essex. Your source-backed guide to a good day out.',
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': '/feed.xml', 'text/calendar': '/calendar.ics' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    siteName: 'YQG Events',
    title: 'YQG Events — A little more local',
    description: 'Good things are happening around here. Find your next local plan.',
    images: ['/opengraph-image'],
  },
  twitter: { card: 'summary_large_image' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA" data-scroll-behavior="smooth">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
