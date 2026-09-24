import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Search,
  SlidersHorizontal,
  MapPin,
  Sparkles,
  Rss,
  X,
} from 'lucide-react';
import { listEvents, facets } from '@/lib/events';
import { listInput } from '@/lib/validation';
import { displayDate } from '@/lib/dates';
import { EventCard } from '@/components/event-card';
import { RiverArt } from '@/components/river-art';
export const dynamic = 'force-dynamic';
const periods = [
  { value: 'upcoming', label: 'All upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'week', label: 'This week' },
];
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const get = (name: string) => (typeof raw[name] === 'string' ? (raw[name] as string) : undefined);
  const period = periods.some((p) => p.value === get('period')) ? get('period')! : 'upcoming';
  const page = Math.min(4166, Math.max(1, Number.parseInt(get('page') || '1') || 1));
  const filters = listInput.parse({
    q: get('q')?.slice(0, 150),
    city: get('city')?.slice(0, 100),
    category: get('category')?.slice(0, 50),
    period,
    free: get('free') === 'true',
    family: get('family') === 'true',
    sort: get('sort') === 'newest' ? 'newest' : 'date',
    limit: 12,
    offset: (page - 1) * 12,
  });
  const [result, options] = await Promise.all([listEvents(filters), facets()]);
  const link = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(raw))
      if (typeof value === 'string' && key !== 'page') params.set(key, value);
    for (const [key, value] of Object.entries(changes))
      if (value) params.set(key, value);
      else params.delete(key);
    return `/?${params.toString()}#explore`;
  };
  const active = Boolean(
    filters.q || filters.city || filters.category || filters.free || filters.family,
  );
  return (
    <main id="main">
      <div className="container">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> YOUR WINDSOR–ESSEX FIELD GUIDE
            </div>
            <h1>
              A little more local.
              <br />
              <span>A lot to look forward to.</span>
            </h1>
            <p>
              The big nights, the small discoveries, the just-around-the-corner plans. Find your
              next good thing, right here.
            </p>
            <Link href="/?period=weekend#explore" className="button dark">
              Explore this weekend <ArrowUpRight size={18} />
            </Link>
            <div className="hero-note">
              <span className="tiny-sun">✳</span> Less searching. More getting out there.
            </div>
          </div>
          <div className="hero-visual">
            <RiverArt />
            <span className="art-caption">
              <MapPin size={13} /> GOOD THINGS HAPPEN HERE.
            </span>
            <span className="hero-coordinate">42.3149° N · 83.0364° W</span>
          </div>
        </section>
        <div className="under-hero">
          <span>
            <MapPin size={14} /> From the riverfront to the county.
          </span>
          <span>
            Windsor · LaSalle · Amherstburg · Essex · Kingsville & beyond <ArrowRight size={14} />
          </span>
        </div>
        <section id="explore" className="explore-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow muted">MAKE A LITTLE ROOM FOR SOMETHING GOOD</div>
              <h2>What’s happening around here</h2>
            </div>
            <span className="today-label">
              <CalendarDays size={15} />
              {displayDate(new Date().toISOString(), 'EEEE, MMMM d')}
            </span>
          </div>
          {options.demo && (
            <div className="demo-banner">
              <Sparkles size={16} />
              <span>
                You’re exploring a demo. These sample listings are fictional, not verified local
                events.
              </span>
            </div>
          )}
          <div className="browse-toolbar">
            <div className="period-tabs" role="navigation" aria-label="Browse by date">
              {periods.map((p) => (
                <Link
                  href={link({ period: p.value })}
                  key={p.value}
                  className={period === p.value ? 'active' : ''}
                  aria-current={period === p.value ? 'page' : undefined}
                >
                  {p.label}
                </Link>
              ))}
            </div>
            <Link
              href={link({ sort: filters.sort === 'newest' ? undefined : 'newest' })}
              className="sort-link"
            >
              <SlidersHorizontal size={14} />
              {filters.sort === 'newest' ? 'Recently added' : 'Soonest first'}
            </Link>
          </div>
          <form action="/#explore" className="filter-bar">
            <input type="hidden" name="period" value={period} />
            {filters.sort === 'newest' && <input type="hidden" name="sort" value="newest" />}
            <label className="search-field">
              <Search size={18} />
              <span className="sr-only">Search events</span>
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="A gig, a market, a good time…"
                maxLength={150}
              />
            </label>
            <label className="select-field">
              <span className="sr-only">Town or city</span>
              <select name="city" defaultValue={filters.city || ''}>
                <option value="">All towns & cities</option>
                {options.cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="select-field">
              <span className="sr-only">Category</span>
              <select name="category" defaultValue={filters.category || ''}>
                <option value="">All categories</option>
                {options.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <button className="filter-submit" type="submit">
              Find events <ArrowRight size={16} />
            </button>
            <div className="filter-options">
              <label>
                <input type="checkbox" name="free" value="true" defaultChecked={filters.free} />{' '}
                Free events
              </label>
              <label>
                <input type="checkbox" name="family" value="true" defaultChecked={filters.family} />{' '}
                Family friendly
              </label>
              <span className="filter-help">Pick your filters, then find your plans.</span>
            </div>
          </form>
          <div className="results-heading">
            <p>
              <strong>{result.total}</strong> {result.total === 1 ? 'event' : 'events'} to look
              forward to {filters.city && <span>in {filters.city}</span>}
            </p>
            {active && (
              <Link
                className="clear-link"
                href={link({
                  q: undefined,
                  city: undefined,
                  category: undefined,
                  free: undefined,
                  family: undefined,
                })}
              >
                Clear filters <X size={13} />
              </Link>
            )}
          </div>
          {result.events.length ? (
            <div className="event-grid">
              {result.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">
                <CalendarDays size={30} />
              </span>
              <h3>{active ? 'No plans found. Yet.' : 'Good things are on the way.'}</h3>
              <p>
                {active
                  ? 'Try another town, a different date, or a little less filtering.'
                  : 'The calendar is ready for its first local discoveries. Check back soon for something worth stepping out for.'}
              </p>
              <Link
                className="button dark"
                href={active || period !== 'upcoming' || page > 1 ? '/#explore' : '/connect'}
              >
                {active || period !== 'upcoming' || page > 1
                  ? 'See all upcoming events'
                  : 'Add events with ChatGPT'}
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
          {(page > 1 || page * 12 < result.total) && (
            <nav className="pagination" aria-label="Event pages">
              {page > 1 && (
                <Link className="button outline" href={link({ page: String(page - 1) })}>
                  ← Previous
                </Link>
              )}
              <span>Page {page}</span>
              {page * 12 < result.total && (
                <Link className="button outline" href={link({ page: String(page + 1) })}>
                  Next →
                </Link>
              )}
            </nav>
          )}
        </section>
        <section className="subscribe-banner">
          <span className="subscribe-icon">
            <Rss size={27} />
          </span>
          <div>
            <div className="eyebrow">KEEP GOOD PLANS CLOSE</div>
            <h2>Your next outing, on your terms.</h2>
            <p>Follow the feed or add local events to your calendar. No inbox clutter.</p>
          </div>
          <Link href="/subscribe" className="button light">
            Stay in the loop <ArrowUpRight size={17} />
          </Link>
        </section>
      </div>
    </main>
  );
}
