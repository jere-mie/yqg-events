import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export const metadata = { title: 'About the guide', alternates: { canonical: '/about' } };
export default function About() {
  return (
    <main id="main" className="container prose-page">
      <div className="eyebrow">A GUIDE TO OUR OWN BACKYARD</div>
      <h1>
        There’s a lot to love
        <br />
        around here.
      </h1>
      <p className="lead">
        YQG Events brings Windsor–Essex plans into one little corner of the internet. For the
        spontaneous Saturday, the night out, and the “what should we do?” group chat.
      </p>
      <div className="prose-columns">
        <section>
          <h2>Local first. Sources always.</h2>
          <p>
            Every listing links to its original source. The guide helps you discover something good;
            the organizer is the best place for the latest details, ticket availability, and
            changes.
          </p>
          <p>
            Events can be collected and summarized with AI, but dates, venues, prices and other
            facts must come from a source. We keep those details structured so they can be checked
            and updated.
          </p>
        </section>
        <section>
          <h2>From the city to the county.</h2>
          <p>
            Music in Windsor. A market in Kingsville. An afternoon in Amherstburg. This is a guide
            for the whole region, with room for the small gatherings as well as the big weekends.
          </p>
          <p>
            No accounts needed to browse. No ticket markups. Just an easier way to find something to
            look forward to.
          </p>
        </section>
      </div>
      <Link href="/#explore" className="button dark">
        Find your next local plan <ArrowUpRight size={18} />
      </Link>
    </main>
  );
}
