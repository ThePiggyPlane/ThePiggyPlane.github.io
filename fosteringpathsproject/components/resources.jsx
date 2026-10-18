// Resources view: foster youth support programs for the current location,
// plus national ones. Filter by category and search.

const RESOURCE_CATEGORIES = [
  ["campus", "Campus programs"],
  ["ilp", "ILP / transition"],
  ["housing", "Housing"],
  ["emergency", "Emergency help"],
  ["health", "Health"],
  ["legal", "Legal"],
  ["mentoring", "Mentors / peers"],
  ["employment", "Jobs"],
  ["education", "School help"],
  ["lgbtq", "LGBTQ+"],
  ["advocacy", "Advocacy"],
  ["agency", "The agency"],
  ["other", "Other"],
];
const RESOURCE_LABEL = Object.fromEntries(RESOURCE_CATEGORIES);

const telHref = (p) => "tel:" + String(p).replace(/[^0-9+]/g, "");

const CpResourceCard = ({ r }) => (
  <article className={"cp-res " + r.category}>
    <div className="cp-res-head">
      <div>
        <div className="cp-res-cat">{RESOURCE_LABEL[r.category] || r.category}{r.state === "US" ? " · National" : (r.county ? ` · ${r.county} County` : (r.city ? ` · ${r.city}` : ""))}{r.miles != null ? ` · ${fmtMiles(r.miles)}` : ""}</div>
        <h3 className="cp-res-name">{r.name}</h3>
        {r.org && r.org !== r.name && <div className="cp-res-org">{r.org}</div>}
      </div>
      {r.ages && <div className="cp-res-ages">ages {r.ages}</div>}
    </div>
    <p className="cp-res-line"><strong>Who:</strong> {r.serves}</p>
    <p className="cp-res-line"><strong>What:</strong> {r.provides}</p>
    {r.howToStart && <p className="cp-res-line"><strong>Start:</strong> {r.howToStart}</p>}
    {r.notes && <p className="cp-res-note">{r.notes}</p>}
    <div className="cp-res-contact">
      {r.phone && <a href={telHref(r.phone)}>{r.phone}</a>}
      {r.email && <a href={"mailto:" + r.email}>{r.email}</a>}
      {r.address && <span>{r.address}</span>}
      {r.url && <a href={r.url} target="_blank" rel="noopener" className="cp-prog-link">Open site →</a>}
    </div>
  </article>
);

const CpResources = ({ onPickLocation }) => {
  const { loc, status } = useFpLocation();
  const [cat, setCat] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [scope, setScope] = React.useState("here"); // here | state | national

  const stateRes = window.RESOURCES.byState(loc.state);
  const national = window.RESOURCES.national();
  const hereRes = loc.region ? stateRes.filter(r => r.region === loc.region || !r.region) : stateRes;

  const pool = scope === "national" ? national : (scope === "state" ? stateRes : hereRes);
  const catCounts = {};
  pool.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });

  const q = query.trim().toLowerCase();
  const hasGeo = !!(window.getGeo && window.getGeo());
  const shown = withDistance(pool).filter(r => {
    if (cat !== "all" && r.category !== cat) return false;
    if (!q) return true;
    const hay = [r.name, r.org, r.city, r.county, r.serves, r.provides, (r.tags || []).join(" ")].join(" ").toLowerCase();
    return hay.includes(q);
  });
  // Nearest first when we know where you are; otherwise regional first, then by org.
  shown.sort((a, b) => {
    if (hasGeo && (a.miles != null || b.miles != null)) {
      if (a.miles == null) return 1;
      if (b.miles == null) return -1;
      return a.miles - b.miles;
    }
    const ar = loc.region && a.region === loc.region ? 0 : 1;
    const br = loc.region && b.region === loc.region ? 0 : 1;
    return ar - br || (a.org || a.name).localeCompare(b.org || b.name);
  });

  const stateLabel = window.stateName(loc.state);
  const loading = status === "loading";

  return (
    <main className="cp-main">
      <div className="cp-eyebrow">Support near you</div>
      <h1 className="cp-h1">Help for foster youth in {loc.region || stateLabel}</h1>
      <p className="cp-lede">
        Campus programs, housing, emergency money, legal help, and the people who are paid to help you. Everything here was checked on the program's own page.
        {" "}<button className="cp-link" onClick={onPickLocation}>Change location</button>
      </p>

      <div className="cp-callout warn cp-crisis">
        <strong>Need help right now?</strong> Call or text <a href="tel:988">988</a> (Suicide and Crisis Lifeline, 24/7). No safe place to sleep tonight? National Runaway Safeline <a href="tel:18007862929">1-800-786-2929</a>, 24/7, for youth up to 21.{loc.state === "CA" ? <> California foster youth: Foster Care Ombudsperson <a href="tel:18778461602">1-877-846-1602</a> (weekdays).</> : null}
      </div>

      <div className="cp-filters" role="toolbar" aria-label="Filter resources">
        {[
          ["here", loc.region ? loc.region : stateLabel, hereRes.length],
          ["state", stateLabel, stateRes.length],
          ["national", "National", national.length],
        ].filter(([k], i, arr) => !(k === "state" && !loc.region)).map(([k, l, n]) => (
          <button key={k} className={"cp-chip " + (scope === k ? "on" : "")} onClick={() => setScope(k)} aria-pressed={scope === k}>{l} <span className="cp-chip-n">{n}</span></button>
        ))}
        <input className="cp-search" type="search" placeholder="Search by name, city, county, need…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search resources" />
      </div>
      <div className="cp-filters cp-filters-cats" role="toolbar" aria-label="Filter by category">
        <button className={"cp-chip " + (cat === "all" ? "on" : "")} onClick={() => setCat("all")} aria-pressed={cat === "all"}>All <span className="cp-chip-n">{pool.length}</span></button>
        {RESOURCE_CATEGORIES.filter(([k]) => catCounts[k]).map(([k, l]) => (
          <button key={k} className={"cp-chip " + (cat === k ? "on" : "")} onClick={() => setCat(k)} aria-pressed={cat === k}>{l} <span className="cp-chip-n">{catCounts[k]}</span></button>
        ))}
      </div>

      {loading && <p className="cp-filter-meta">Loading {stateLabel}…</p>}
      {!loading && shown.length === 0 && (
        <div className="cp-empty">
          <p>{pool.length === 0
            ? `We have not finished adding support resources for ${scope === "national" ? "the national list" : stateLabel} yet. The national list and the state guide still apply to you.`
            : "Nothing matches those filters."}</p>
          {pool.length === 0 && scope !== "national" && <button className="cp-btn-ghost" onClick={() => setScope("national")}>Show national resources</button>}
          {pool.length > 0 && <button className="cp-btn-ghost" onClick={() => { setCat("all"); setQuery(""); }}>Reset filters</button>}
        </div>
      )}
      <div className="cp-res-list">
        {shown.slice(0, 300).map(r => <CpResourceCard key={r.id} r={r} />)}
      </div>
      {shown.length > 300 && <p className="cp-filter-meta">Showing 300 of {shown.length}. Narrow the search to see the rest.</p>}
    </main>
  );
};

Object.assign(window, { CpResources, CpResourceCard, RESOURCE_LABEL, RESOURCE_CATEGORIES });
