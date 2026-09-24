import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="container empty-state">
      <span className="eyebrow">A LITTLE OFF THE BEATEN PATH</span>
      <h1>That plan isn’t here.</h1>
      <p>The listing may be private, archived, or the link may have changed.</p>
      <Link className="button dark" href="/">
        Back to local events →
      </Link>
    </main>
  );
}
