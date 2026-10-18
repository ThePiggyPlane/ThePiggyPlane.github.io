// Scholarships view: money for the current state plus national programs.

const SCHOL_TYPE_LABEL = {
  etv: "ETV / Chafee",
  waiver: "Tuition waiver",
  scholarship: "Scholarship",
  grant: "Grant",
  emergency: "Emergency fund",
  "loan-forgiveness": "Loan forgiveness",
};
const SCHOL_TYPE_ORDER = ["waiver", "etv", "grant", "scholarship", "emergency", "loan-forgiveness"];

const CpScholarshipCard = ({ s }) => (
  <article className={"cp-sch " + s.type}>
    <div className="cp-sch-head">
      <div>
        <div className="cp-sch-type">{SCHOL_TYPE_LABEL[s.type] || s.type}{s.scope === "national" ? " · National" : (s.scope === "state" ? ` · ${window.stateName(s.state)}` : (s.scope === "regional" ? " · Regional" : " · Campus"))}</div>
        <h3 className="cp-sch-name">{s.name}</h3>
        <div className="cp-res-org">{s.provider}</div>
      </div>
      <div className="cp-sch-amt">{s.amount}</div>
    </div>
    <p className="cp-res-line"><strong>Who:</strong> {s.eligibility}</p>
    {s.deadline && <p className="cp-res-line"><strong>Deadline:</strong> {s.deadline}{s.renewable ? " · renewable" : ""}</p>}
    {s.howToApply && <p className="cp-res-line"><strong>How:</strong> {s.howToApply}</p>}
    {s.notes && <p className="cp-res-note">{s.notes}</p>}
    <div className="cp-res-contact">
      <a href={s.url} target="_blank" rel="noopener" className="cp-prog-link">Apply / learn more →</a>
    </div>
  </article>
);

const CpScholarships = ({ onPickLocation }) => {
  const { loc, status } = useFpLocation();
  const [type, setType] = React.useState("all");
  const [scope, setScope] = React.useState("all");
  const [query, setQuery] = React.useState("");

  const stateS = window.SCHOLARSHIPS.byState(loc.state);
  const national = window.SCHOLARSHIPS.national();
  const all = [...stateS, ...national];
  const pool = scope === "state" ? stateS : (scope === "national" ? national : all);
  const typeCounts = {};
  pool.forEach(s => { typeCounts[s.type] = (typeCounts[s.type] || 0) + 1; });
  const q = query.trim().toLowerCase();
  const shown = pool.filter(s => (type === "all" || s.type === type) && (!q || [s.name, s.provider, s.eligibility, s.amount, (s.tags || []).join(" ")].join(" ").toLowerCase().includes(q)));
  shown.sort((a, b) => {
    const as = a.scope === "national" ? 1 : 0, bs = b.scope === "national" ? 1 : 0;
    return as - bs || SCHOL_TYPE_ORDER.indexOf(a.type) - SCHOL_TYPE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name);
  });
  const stateLabel = window.stateName(loc.state);
  const guide = window.STATE_GUIDES.get(loc.state);

  return (
    <main className="cp-main">
      <div className="cp-eyebrow">Money for school</div>
      <h1 className="cp-h1">Scholarships and aid for foster youth in {stateLabel}</h1>
      <p className="cp-lede">
        Start with the money you are owed as a foster youth (tuition waivers, ETV, Pell), then stack scholarships on top. Amounts and deadlines are from each provider's page; confirm before you plan around them.
        {" "}<button className="cp-link" onClick={onPickLocation}>Change state</button>
      </p>

      {guide && guide.tuitionWaiver && (
        <div className={"cp-callout " + (guide.tuitionWaiver.exists ? "good" : "warn")}>
          {guide.tuitionWaiver.exists
            ? <><strong>{stateLabel} has a tuition waiver for foster youth: {guide.tuitionWaiver.name}.</strong> {guide.tuitionWaiver.covers}{guide.tuitionWaiver.ageLimit ? ` ${guide.tuitionWaiver.ageLimit}.` : ""} {guide.tuitionWaiver.url && <a href={guide.tuitionWaiver.url} target="_blank" rel="noopener">How to claim it →</a>}</>
            : <><strong>{stateLabel} does not have a statewide tuition waiver for foster youth.</strong> Pell, ETV, and campus programs do most of the work here. {guide.tuitionWaiver.notes || ""}</>}
        </div>
      )}

      <div className="cp-filters" role="toolbar" aria-label="Filter scholarships">
        {[["all", "All", all.length], ["state", stateLabel, stateS.length], ["national", "National", national.length]].map(([k, l, n]) => (
          <button key={k} className={"cp-chip " + (scope === k ? "on" : "")} onClick={() => setScope(k)} aria-pressed={scope === k}>{l} <span className="cp-chip-n">{n}</span></button>
        ))}
        <input className="cp-search" type="search" placeholder="Search scholarships…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search scholarships" />
      </div>
      <div className="cp-filters cp-filters-cats" role="toolbar" aria-label="Filter by type">
        <button className={"cp-chip " + (type === "all" ? "on" : "")} onClick={() => setType("all")} aria-pressed={type === "all"}>All types</button>
        {SCHOL_TYPE_ORDER.filter(t => typeCounts[t]).map(t => (
          <button key={t} className={"cp-chip " + (type === t ? "on" : "")} onClick={() => setType(t)} aria-pressed={type === t}>{SCHOL_TYPE_LABEL[t]} <span className="cp-chip-n">{typeCounts[t]}</span></button>
        ))}
      </div>

      {status === "loading" && <p className="cp-filter-meta">Loading {stateLabel}…</p>}
      {status !== "loading" && shown.length === 0 && (
        <div className="cp-empty">
          <p>{pool.length === 0 ? `We have not finished adding ${scope === "national" ? "national" : stateLabel} scholarships yet.` : "Nothing matches those filters."}</p>
          {pool.length === 0 && scope !== "national" && national.length > 0 && <button className="cp-btn-ghost" onClick={() => setScope("national")}>Show national scholarships</button>}
        </div>
      )}
      <div className="cp-res-list">
        {shown.map(s => <CpScholarshipCard key={s.id} s={s} />)}
      </div>
    </main>
  );
};

Object.assign(window, { CpScholarships, CpScholarshipCard, SCHOL_TYPE_LABEL });
