import Link from 'next/link';
import { ArrowUpRight, MapPin, Clock3 } from 'lucide-react';
import type { LocalEvent } from '@/db/schema';
import { displayDate } from '@/lib/dates';
import { EventArt } from './event-art';
export function EventCard({ event }: { event: LocalEvent }) {
  return (
    <article className={`event-card ${event.status === 'cancelled' ? 'is-cancelled' : ''}`}>
      <Link
        href={`/events/${event.slug}`}
        className="card-art-link"
        tabIndex={-1}
        aria-hidden="true"
      >
        <EventArt category={event.categories[0]} title={event.title} imageUrl={event.imageUrl} />
        <span className="date-stamp">
          <span>{displayDate(event.startDateTime, 'MMM')}</span>
          <strong>{displayDate(event.startDateTime, 'dd')}</strong>
        </span>
        {event.isFree && <span className="free-stamp">Free entry</span>}
      </Link>
      <div className="card-body">
        <div className="card-category">
          {event.categories[0] || 'Around the community'}
          {event.isDemo && <span className="demo-chip">Demo</span>}
          {event.status === 'cancelled' && <span className="cancelled-chip">Cancelled</span>}
        </div>
        <h3>
          <Link href={`/events/${event.slug}`}>
            {event.title}
            <ArrowUpRight size={20} />
          </Link>
        </h3>
        <p className="card-description">
          {event.description ||
            'Discover something happening in your community. See the original source for details.'}
        </p>
        <div className="card-meta">
          <span>
            <Clock3 size={14} />
            {displayDate(event.startDateTime, 'EEE, MMM d')} <span className="meta-dot">·</span>{' '}
            {event.allDay ? 'All day' : displayDate(event.startDateTime, 'h:mm a')}
          </span>
          <span>
            <MapPin size={14} />
            {event.venueName ? `${event.venueName}, ` : ''}
            {event.city}
          </span>
        </div>
        <div className="card-bottom">
          <span>
            {event.isFamilyFriendly ? 'Family friendly' : event.tags[0] || 'Explore locally'}
          </span>
          <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
            Original source <ArrowUpRight size={12} />
          </a>
        </div>
      </div>
    </article>
  );
}
