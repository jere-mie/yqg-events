import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarPlus,
  Clock3,
  MapPin,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { getPublicEvent } from '@/lib/events';
import { appUrl } from '@/lib/config';
import { displayDate } from '@/lib/dates';
import { EventArt } from '@/components/event-art';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const event = await getPublicEvent((await params).slug);
  if (!event) return { title: 'Event not found' };
  return {
    title: event.title,
    description: event.description || undefined,
    alternates: { canonical: `/events/${event.slug}` },
    robots: event.isDemo ? { index: false } : undefined,
    openGraph: {
      title: event.title,
      description: event.description || undefined,
      url: `/events/${event.slug}`,
      images: event.imageUrl ? [event.imageUrl] : ['/opengraph-image'],
    },
  };
}
export default async function EventDetail({ params }: Context) {
  const event = await getPublicEvent((await params).slug);
  if (!event) notFound();
  // All-day ends are exclusive in storage/calendar feeds; show the last occupied day.
  const displayEnd = event.endDateTime
    ? event.allDay
      ? new Date(Date.parse(event.endDateTime) - 1).toISOString()
      : event.endDateTime
    : null;
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.startDateTime,
    endDate: event.endDateTime || undefined,
    eventStatus:
      event.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: `${appUrl()}/events/${event.slug}`,
    image: event.imageUrl || undefined,
    isAccessibleForFree: event.isFree ?? undefined,
    location: {
      '@type': 'Place',
      name: event.venueName || event.city,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.address || undefined,
        addressLocality: event.city,
        addressRegion: 'ON',
        addressCountry: 'CA',
        postalCode: event.postalCode || undefined,
      },
    },
  };
  return (
    <main id="main" className="container detail-page">
      {!event.isDemo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}
        />
      )}
      <Link href="/#explore" className="back-link">
        <ArrowLeft size={15} /> Back to all events
      </Link>
      {event.isDemo && (
        <div className="demo-banner">
          Fictional demo listing — not a real event. Dates, venues and descriptions are for preview
          only.
        </div>
      )}
      {event.status === 'cancelled' && (
        <div className="cancel-banner">
          This event has been cancelled. Check the original source for updates.
        </div>
      )}
      <div className="detail-grid">
        <article>
          <div className="detail-art">
            <EventArt
              category={event.categories[0]}
              title={event.title}
              imageUrl={event.imageUrl}
            />
          </div>
          <div className="detail-tags">
            {event.categories.map((c) => (
              <Link key={c} href={`/?category=${encodeURIComponent(c)}#explore`}>
                {c}
              </Link>
            ))}
            {event.isFree && <span>Free entry</span>}
            {event.isFamilyFriendly && <span>Family friendly</span>}
          </div>
          <h1>{event.title}</h1>
          <p className="detail-lead">{event.description}</p>
          <div className="markdown">
            <Markdown
              remarkPlugins={[remarkGfm]}
              skipHtml
              components={{
                a: ({ children, href }) => (
                  <a href={href} rel="noopener noreferrer" target="_blank">
                    {children}
                  </a>
                ),
                img: () => null,
              }}
            >
              {event.contentMarkdown || 'Visit the original listing for the full event details.'}
            </Markdown>
          </div>
          {event.tags.length > 0 && (
            <div className="tags">
              {event.tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
          )}
        </article>
        <aside className="detail-sidebar">
          <div className="plan-card">
            <div className="eyebrow">YOUR NEXT LOCAL PLAN</div>
            <h2>The details</h2>
            <div className="detail-row">
              <CalendarDays size={21} />
              <div>
                <strong>{displayDate(event.startDateTime, 'EEEE, MMMM d, yyyy')}</strong>
                {displayEnd &&
                  displayDate(event.startDateTime, 'yyyy-MM-dd') !==
                    displayDate(displayEnd, 'yyyy-MM-dd') && (
                    <span>Ends {displayDate(displayEnd, 'EEE, MMM d')}</span>
                  )}
              </div>
            </div>
            <div className="detail-row">
              <Clock3 size={21} />
              <div>
                <strong>
                  {event.allDay
                    ? 'All day'
                    : `${displayDate(event.startDateTime, 'h:mm a')}${event.endDateTime ? ` – ${displayDate(event.endDateTime, 'h:mm a')}` : ''}`}
                </strong>
                <span>Windsor–Essex local time</span>
              </div>
            </div>
            <div className="detail-row">
              <MapPin size={21} />
              <div>
                <strong>{event.venueName || event.city}</strong>
                <span>
                  {[event.address, event.city, event.postalCode].filter(Boolean).join(', ')}
                </span>
                {event.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.address}, ${event.city}, Ontario`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get directions ↗
                  </a>
                )}
              </div>
            </div>
            <div className="admission">
              <span>Admission</span>
              <strong>
                {event.isFree === true
                  ? 'Free'
                  : event.isFree === false
                    ? 'Paid · see source'
                    : 'Check original listing'}
              </strong>
            </div>
            <a
              className="button dark full"
              href={event.eventUrl || event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {event.eventUrl ? 'Event & ticket details' : 'View original listing'}
              <ArrowUpRight size={17} />
            </a>
            <a className="button outline full" href={`/events/${event.slug}/calendar.ics`}>
              <CalendarPlus size={17} /> Add to calendar
            </a>
            <p className="source-note">
              <CheckCircle2 size={16} /> Source:{' '}
              <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
                {event.sourceName || new URL(event.sourceUrl).hostname}
              </a>
            </p>
            {event.lastVerifiedAt && (
              <p className="verified-note">
                Last checked {displayDate(event.lastVerifiedAt, 'MMM d, yyyy')}
              </p>
            )}
          </div>
          <p className="gentle-note">
            Plans can change. Always check the original source before heading out.
          </p>
        </aside>
      </div>
    </main>
  );
}
