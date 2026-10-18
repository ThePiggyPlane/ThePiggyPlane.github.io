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

// All path types a career exposes, derived from its programs[] plus its
// CDSS-apprenticeship keyword matches (careers like Plumber or Barber may
// have no college programs at all — their pathway IS the apprenticeship).
const careerPathTypes = (career) => {
  const out = new Set();
  (career.programs || []).forEach(pid => {
    const p = window.PROGRAMS && window.PROGRAMS.get(pid);
    if (!p) return;
    programPathTypes(p).forEach(t => out.add(t));
  });
  if ((career.apprenticeshipMatch || []).length) out.add("apprenticeship");
  return out;
};

const CpHome = ({ onOpen, onWizard, saved, toggleSave, go, onPickLocation }) => {
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);
  const { loc, status } = useFpLocation();

  const all = window.CAREERS.all();
  const stateName = window.stateName(loc.state);
  const placeLabel = loc.region || stateName;
  const progsHere = React.useMemo(() => {
    const xs = window.PROGRAMS.byState(loc.state);
    return loc.region ? xs.filter(p => p.region === loc.region) : xs;
  }, [loc.state, loc.region, status, window.PROGRAMS.count()]);
  const instHere = React.useMemo(() => new Set(progsHere.map(p => p.inst)).size, [progsHere]);
  // programs per career in the current place (curated lists count too)
  const countsByCareer = React.useMemo(() => {
    const m = new Map();
    all.forEach(c => m.set(c.id, window.PROGRAMS.forCareer(c.id, loc.region ? { state: loc.state, region: loc.region } : { state: loc.state }).length));
    return m;
  }, [all, loc.state, loc.region, status, progsHere.length]);
  const resHere = window.RESOURCES.byState(loc.state).length;
  const schHere = window.SCHOLARSHIPS.byState(loc.state).length + window.SCHOLARSHIPS.national().length;
  const guide = window.STATE_GUIDES.get(loc.state);

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
        <h1 className="cp-h1">Career pathways for foster youth in {placeLabel}</h1>
        <p className="cp-lede">Real programs near you, what they cost after foster youth aid, and the people who help you get in. <button className="cp-link" onClick={onPickLocation}>Not in {placeLabel}? Change location</button></p>
        <div className="cp-cta-row">
          <button className="cp-btn" onClick={() => document.querySelector('#careers').scrollIntoView({ behavior: 'smooth' })}>Browse careers</button>
          <button className="cp-btn-ghost" onClick={() => go("start")}>New here? Start with your rights</button>
          <button className="cp-btn-ghost" onClick={() => go("resources")}>Find support near you</button>
          <button className="cp-btn-ghost" onClick={() => go("scholarships")}>Scholarships</button>
        </div>

        <div className="cp-hero-stats">
          <div><div className="cp-stat">{all.length}</div><div className="cp-stat-lbl">career paths</div></div>
          <div><div className="cp-stat">{status === "loading" && progsHere.length === 0 ? "…" : progsHere.length.toLocaleString()}</div><div className="cp-stat-lbl">programs in {loc.region ? "your region" : stateName}{instHere ? ` at ${instHere} schools` : ""}</div></div>
          <div><div className="cp-stat">{guide && guide.tuitionWaiver && guide.tuitionWaiver.exists ? "$0" : (loc.state === "CA" ? "$0" : "$12K+")}</div><div className="cp-stat-lbl">{guide && guide.tuitionWaiver && guide.tuitionWaiver.exists ? "public tuition with the state waiver" : (loc.state === "CA" ? "typical real cost at a CC or CSU" : "Pell + ETV you can stack every year")}</div></div>
          <div><div className="cp-stat">{resHere ? resHere : (schHere ? schHere : "26")}</div><div className="cp-stat-lbl">{resHere ? `support programs in ${stateName}` : (schHere ? "scholarships and aid sources" : "age your free health coverage can last, in every state")}</div></div>
        </div>
      </section>

      {loc.state === "CA" && <CpDeadlines />}

      <section id="careers" className="cp-careers">
        <div className="cp-sec-head">
          <h2>{all.length} career paths</h2>
          <span className="cp-sec-meta">programs shown for {placeLabel}</span>
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
              <CpCareerRow key={c.id} c={c} saved={saved} toggleSave={toggleSave} onOpen={onOpen} nearby={countsByCareer.get(c.id)} />
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
