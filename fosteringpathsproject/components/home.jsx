// Home page: hero + deadlines + filterable, paginated career list.
// No flavor text below the list (per spec) — clean handoff to nav.

const PAGE_SIZE = 12;

const CpHome = ({ onOpen, onWizard, saved, toggleSave }) => {
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);

  const all = window.CAREERS.all();
  const filtered = React.useMemo(() => {
    let xs = all;
    if (filter !== "all") xs = xs.filter(c => (c.lengthBucket || 'mid') === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      xs = xs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        (c.interests || []).some(i => i.includes(q))
      );
    }
    return xs;
  }, [all, filter, query]);

  React.useEffect(() => { setPage(0); }, [filter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <main className="cp-main">
      <section className="cp-hero">
        <div className="cp-eyebrow">For foster youth in San Bernardino, Riverside &amp; Orange County</div>
        <h1 className="cp-h1">A straight answer on college, money, and what comes next.</h1>
        <p className="cp-lede">Real career paths. Real cost after aid. The five things to do this week. Nothing padded. Nothing sold.</p>
        <div className="cp-cta-row">
          <button className="cp-btn" onClick={() => document.querySelector('#careers').scrollIntoView({ behavior: 'smooth' })}>Browse all</button>
        </div>

        <div className="cp-hero-stats">
          <div><div className="cp-stat">{all.length}</div><div className="cp-stat-lbl">career paths</div></div>
          <div><div className="cp-stat">$26K+</div><div className="cp-stat-lbl">aid you can stack</div></div>
          <div><div className="cp-stat">$0</div><div className="cp-stat-lbl">typical real cost</div></div>
          <div><div className="cp-stat">3 hr</div><div className="cp-stat-lbl">first-week setup</div></div>
        </div>
      </section>

      <CpDeadlines />

      <section id="careers" className="cp-careers">
        <div className="cp-sec-head">
          <h2>{all.length} career paths</h2>
          <span className="cp-sec-meta">curated for Inland SoCal</span>
        </div>

        <div className="cp-filters" role="toolbar" aria-label="Filter careers">
          {[
            ["all", "All"],
            ["fast", "Under 2 yrs"],
            ["mid", "2–4 yrs"],
            ["long", "4+ yrs"],
          ].map(([k, l]) => (
            <button key={k} className={"cp-chip " + (filter === k ? "on" : "")} onClick={() => setFilter(k)} aria-pressed={filter === k}>{l}</button>
          ))}
          <input
            className="cp-search"
            type="search"
            placeholder="Search careers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search careers"
          />
        </div>
        <div className="cp-filter-meta">
          {filtered.length === all.length ? `Showing all ${all.length}` : `${filtered.length} of ${all.length} match`}
        </div>

        {pageItems.length === 0 ? (
          <div className="cp-empty">
            <p>No careers match those filters.</p>
            <button className="cp-btn-ghost" onClick={() => { setFilter("all"); setQuery(""); }}>Reset filters</button>
          </div>
        ) : (
          <div className="cp-career-list">
            {pageItems.map(c => (
              <CpCareerRow key={c.id} c={c} saved={saved} toggleSave={toggleSave} onOpen={onOpen} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="cp-pager">
            <button className="cp-pager-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Previous</button>
            <span className="cp-pager-info">Page {page + 1} of {totalPages}</span>
            <button className="cp-pager-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next →</button>
          </div>
        )}
      </section>
    </main>
  );
};

Object.assign(window, { CpHome });
