import Link from 'next/link';
import { ArrowUpRight, Asterisk, MapPin } from 'lucide-react';
export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/" aria-label="YQG Events home">
          <span className="brand-mark">
            <Asterisk size={29} />
          </span>
          <span>
            yqg<span className="brand-light">events</span>
            <span className="brand-dot">.</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/" className="nav-current">
            Explore events
          </Link>
          <Link href="/about">About the guide</Link>
        </nav>
        <span className="local-label">
          <MapPin size={14} /> Windsor–Essex, Ontario
        </span>
        <Link href="/?period=weekend#explore" className="header-cta">
          Find your weekend <ArrowUpRight size={16} />
        </Link>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <div>
          <Link className="brand" href="/">
            <Asterisk size={25} />
            yqg<span className="brand-light">events.</span>
          </Link>
          <p>A little closer to everything happening here.</p>
        </div>
        <div className="footer-links">
          <Link href="/about">About</Link>
          <Link href="/subscribe">RSS & calendar</Link>
          <Link href="/connect">Connect ChatGPT</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>Made for Windsor–Essex. All times are local.</span>
        <span>Small plans. Good company. Great place.</span>
      </div>
    </footer>
  );
}
