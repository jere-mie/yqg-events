export default function Loading() {
  return (
    <main
      id="main"
      className="container loading-state"
      aria-busy="true"
      aria-label="Loading events"
    >
      <div className="skeleton skeleton-hero" />
      <div className="event-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </main>
  );
}
