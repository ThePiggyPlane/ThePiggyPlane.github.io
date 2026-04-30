// CDSS Apprenticeship view — searchable list of every California Division of
// Apprenticeship Standards (DAS) registered program.

const CpApprenticeships = () => {
  const allApps = React.useMemo(() => window.APPRENTICESHIPS?.all() || [], []);
  const [query, setQuery] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [state, setState] = React.useState("CA"); // default to CA-only since most users want California

  const industries = React.useMemo(() => {
    const counts = {};
    allApps.forEach(a => {
      if (a.industry) counts[a.industry] = (counts[a.industry] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allApps]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return allApps.filter(a => {
      if (state === "CA" && a.state && a.state !== "CA") return false;
      if (industry && a.industry !== industry) return false;
      if (q) {
        const hay = (
          (a.occupation || "") + " " +
          (a.sponsor || "") + " " +
          (a.industry || "") + " " +
          (a.county || "") + " " +
          (a.loc || "")
        ).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allApps, query, industry, state]);

  const showCount = Math.min(filtered.length, 200);

  if (allApps.length === 0) {
    return (
      <main className="cp-main narrow">
        <h1 className="cp-h1">CDSS Apprenticeships</h1>
        <p className="cp-lede">No apprenticeship data loaded. Refresh the page or check your connection.</p>
      </main>
    );
  }

  return (
    <main className="cp-main">
      <h1 className="cp-h1">CDSS Apprenticeships</h1>

      <div className="cp-app-filters">
        <input
          type="search"
          className="cp-app-search"
          placeholder="Search occupation, sponsor, industry, county…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search apprenticeships"
        />
        <select className="cp-app-select" value={industry} onChange={e => setIndustry(e.target.value)} aria-label="Filter by industry">
          <option value="">All industries ({allApps.length})</option>
          {industries.map(([name, count]) => (
            <option key={name} value={name}>{name} ({count})</option>
          ))}
        </select>
        <select className="cp-app-select" value={state} onChange={e => setState(e.target.value)} aria-label="Filter by state">
          <option value="CA">California only</option>
          <option value="">All states</option>
        </select>
        {(query || industry) && (
          <button className="cp-link" onClick={() => { setQuery(""); setIndustry(""); }}>Clear filters</button>
        )}
      </div>

      <p className="cp-app-count">{filtered.length} program{filtered.length === 1 ? "" : "s"}{filtered.length > showCount ? ` (showing first ${showCount}; refine search to narrow)` : ""}</p>

      <div className="cp-app-list">
        {filtered.slice(0, showCount).map(a => <CpApprenticeshipCard key={a.id} a={a} />)}
      </div>

      <p className="cp-app-source">
        Data source: <a href="https://www.dir.ca.gov/databases/das/aigstart.asp" target="_blank" rel="noopener">CA DIR / Division of Apprenticeship Standards</a>.
        Programs listed here are registered, but not all are recruiting — contact each one directly to ask about open intake.
      </p>
    </main>
  );
};

const CpApprenticeshipCard = ({ a }) => (
  <details className="cp-app">
    <summary>
      <div className="cp-app-summary">
        <div>
          <div className="cp-app-occ">{a.occupation}</div>
          <div className="cp-app-spon">{a.sponsor}</div>
          <div className="cp-app-meta">
            {a.industry && <span className="cp-app-tag">{a.industry}</span>}
            {a.length && <span>{a.length}</span>}
            {a.minAge && <span>min age {a.minAge}</span>}
            {a.loc && <span>{a.loc}</span>}
          </div>
        </div>
      </div>
    </summary>
    <div className="cp-app-detail">
      <div className="cp-app-detail-grid">
        {a.educationPrereq && <div><dt>Education</dt><dd>{a.educationPrereq}</dd></div>}
        {a.additionalPrereq && <div><dt>Other prereqs</dt><dd>{a.additionalPrereq}</dd></div>}
        {a.physical && a.physical !== "No" && <div><dt>Physical requirements</dt><dd>{a.physical}</dd></div>}
        {a.exams && <div><dt>Exams</dt><dd>{a.exams}</dd></div>}
        {a.startWage && a.startWage !== "Contact the Program" && <div><dt>Starting wage</dt><dd>{a.startWage}</dd></div>}
        {a.veteranApproved && <div><dt>Veteran benefits</dt><dd>{a.veteranApproved}</dd></div>}
      </div>
      <div className="cp-app-contact">
        <div className="cp-app-contact-h">Contact</div>
        {a.contactPerson && <div>{a.contactPerson}</div>}
        {a.address && <div>{a.address}</div>}
        {a.phone && <div><a href={`tel:${a.phone.replace(/[^0-9+]/g,"")}`}>{a.phone}</a></div>}
        {a.email && <div><a href={`mailto:${a.email}`}>{a.email}</a></div>}
        {a.websiteUrl && <div><a href={a.websiteUrl} target="_blank" rel="noopener">{a.website || a.websiteUrl}</a></div>}
      </div>
    </div>
  </details>
);

window.CpApprenticeships = CpApprenticeships;
