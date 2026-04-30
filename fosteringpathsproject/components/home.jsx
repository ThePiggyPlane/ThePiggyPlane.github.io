// Home page: hero + deadlines + filterable, paginated career list.
// No flavor text below the list (per spec) — clean handoff to nav.

const PAGE_SIZE = 12;

// Classify a single program (from programs.js) into one or more path-type
// buckets. A program can be in multiple — e.g. "AS / Certificate of
// Achievement" matches both Degree and Certificate.
const DEGREE_RX        = /\b(as|aa|aas|asn|adn|bs|ba|bfa|barch|as-?t|aa-?t|bsn|bsme|bsce|dvm|ms|ma|mfa|mds|murp|mba|md|mse|ph\.?d|bachelor|master|doctor|associate)\b/i;
const CERTIFICATE_RX   = /\b(cert(ificate)?|diploma)\b/i;
const APPRENTICESHIP_RX = /\b(apprentic|paid|jatc)\b/i;

const programPathTypes = (p) => {
  const text = ((p?.name || "") + " " + (p?.duration || "")).trim();
  const types = [];
  if (p?.tier === "trade" || APPRENTICESHIP_RX.test(text)) types.push("apprenticeship");
  if (DEGREE_RX.test(text))        types.push("degree");
  if (CERTIFICATE_RX.test(text))   types.push("certificate");
  return types;
};

// All path types a career exposes, derived from its programs[].
const careerPathTypes = (career) => {
  const out = new Set();
  (career.programs || []).forEach(pid => {
    const p = window.PROGRAMS && window.PROGRAMS.get(pid);
    if (!p) return;
    programPathTypes(p).forEach(t => out.add(t));
  });
  return out;
};

const CpHome = ({ onOpen, onWizard, saved, toggleSave }) => {
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);

  const all = window.CAREERS.all();

  // Per-career path-type sets, computed once per career list change.
  const pathTypesByCareer = React.useMemo(() => {
    const m = new Map();
    all.forEach(c => m.set(c.id, careerPathTypes(c)));
    return m;
  }, [all]);

  const filtered = React.useMemo(() => {
    let xs = all;
    if (filter !== "all") {
      xs = xs.filter(c => pathTypesByCareer.get(c.id)?.has(filter));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      xs = xs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        (c.interests || []).some(i => i.includes(q))
      );
    }
    return xs;
  }, [all, filter, query, pathTypesByCareer]);

  React.useEffect(() => { setPage(0); }, [filter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <main className="cp-main">
      <section className="cp-hero">
        <h1 className="cp-h1">Career Pathways in San Bernardino, Riverside, &amp; Orange County</h1>
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
            ["all",            "All"],
            ["degree",         "Degree"],
            ["certificate",    "Certificate"],
            ["apprenticeship", "Apprenticeship"],
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
