/**
 * Shown the instant a link is clicked, while the next page renders on the
 * server. There was no loading state anywhere, so a click gave no feedback
 * until the whole next page was ready — on a slow one, several seconds of
 * nothing.
 *
 * Deliberately almost nothing: the nav bar's shape (so the page doesn't jump
 * when the real one arrives — each page renders its own `SiteNav`) and three
 * quiet dots. No design of its own; if Sasha draws a loading state, it goes
 * here.
 */
export default function Loading() {
  return (
    <>
      <nav className="site-nav" aria-hidden="true" />
      <main className="page-loading" role="status" aria-label="Loading">
        <span />
        <span />
        <span />
      </main>
    </>
  );
}
