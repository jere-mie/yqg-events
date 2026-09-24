import { CalendarPlus, Rss, ArrowUpRight } from 'lucide-react';
import { appUrl } from '@/lib/config';
export const metadata = { title: 'Stay in the loop', alternates: { canonical: '/subscribe' } };
export default function Subscribe() {
  return (
    <main id="main" className="container prose-page">
      <div className="eyebrow">GOOD PLANS, WITHOUT THE INBOX CLUTTER</div>
      <h1>
        Keep a little local
        <br />
        in your day.
      </h1>
      <p className="lead">
        Two simple ways to follow what’s happening. No signup, no newsletter, just the events.
      </p>
      <div className="info-grid">
        <section className="info-card">
          <Rss size={30} />
          <h2>Follow the RSS feed</h2>
          <p>
            Add the feed URL to your favourite reader for upcoming listings, with links back to
            every original source.
          </p>
          <code>{appUrl()}/feed.xml</code>
          <a className="button dark" href="/feed.xml">
            Open RSS feed <ArrowUpRight size={16} />
          </a>
        </section>
        <section className="info-card">
          <CalendarPlus size={30} />
          <h2>Subscribe in your calendar</h2>
          <p>
            In Google Calendar, choose “From URL”. In Apple Calendar, choose “New Calendar
            Subscription”. Paste this URL to receive updates, including cancellations.
          </p>
          <code>{appUrl()}/calendar.ics</code>
          <a className="button dark" href="/calendar.ics">
            Download calendar <ArrowUpRight size={16} />
          </a>
        </section>
      </div>
      <p className="gentle-note">
        Feeds include up to 100 upcoming events. Calendar subscriptions refresh on your calendar
        app’s schedule; downloaded files are snapshots.
      </p>
    </main>
  );
}
