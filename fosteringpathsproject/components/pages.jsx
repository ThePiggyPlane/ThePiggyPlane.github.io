// Career detail, Money calculator, First Week, About: secondary pages.

// Format an integer with thin spaces for thousands (Wolfram Alpha style: "34 570").
const fmtNum = (n) => {
  if (n == null || Number.isNaN(n)) return "n/a";
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
const fmtSigned = (n) => (n >= 0 ? "+" + fmtNum(n) : "-" + fmtNum(-n));
const fmtPct = (n, sign = false) => {
  if (n == null || Number.isNaN(n)) return "n/a";
  const s = (Math.round(n * 10) / 10).toString();
  return (sign && n >= 0 ? "+" : "") + s + "%";
};

const CpDolStats = ({ stats }) => {
  const s = stats;
  // Wage premium / discount vs US national median — only when both medians exist
  const wagePremiumPct = (s.nationalMedianWage != null && s.medianWage != null)
    ? ((s.medianWage - s.nationalMedianWage) / s.nationalMedianWage) * 100
    : null;

  // Rows render only when their primary value exists — BLS suppresses MSA
  // cells for small occupations, and a table of em-dashes helps nobody.
  const rows = [];
  if (s.employed != null) rows.push({
    label: "people employed",
    value: <>
      <strong>{fmtNum(s.employed)} people</strong>
      {s.nationalEmployed != null && (
        <span className="cp-stat-meta"> (US: {fmtNum(s.nationalEmployed)})</span>
      )}
    </>,
  });
  if (s.yearlyChange != null) rows.push({
    label: "yearly change",
    value: <>
      <strong>{fmtSigned(s.yearlyChange)} people</strong>
      <span className="cp-stat-meta"> ({fmtPct(s.yearlyChangePct, true)})</span>
      {s.nationalGrowthPct != null && (
        <span className="cp-stat-meta"> (US: {fmtPct(s.nationalGrowthPct, true)})</span>
      )}
    </>,
  });
  if (s.oneInN != null) rows.push({
    label: "how common",
    value: <>
      <strong>1 in {fmtNum(s.oneInN)} jobs</strong>
      {s.fractionPct != null && s.fractionPct >= 0.1 && <span className="cp-stat-meta"> ({fmtPct(s.fractionPct)} of all jobs)</span>}
      {s.vsNational != null && (
        <span className="cp-stat-meta"> ({s.vsNational}× the national concentration)</span>
      )}
    </>,
  });
  if (s.medianWage != null) rows.push({
    label: "median wage",
    value: <>
      <strong>${fmtNum(s.medianWage)} per year</strong>
      {wagePremiumPct != null ? (
        <span className="cp-stat-meta"> (US: ${fmtNum(s.nationalMedianWage)}, {wagePremiumPct >= 0 ? "+" : ""}{Math.round(wagePremiumPct)}% local{wagePremiumPct >= 0 ? " premium" : " discount"})</span>
      ) : (
        <span className="cp-stat-meta"> (US dollars per year)</span>
      )}
    </>,
  });
  if (s.wageChange != null) rows.push({
    label: "median wage yearly change",
    value: <>
      <strong>{s.wageChange >= 0 ? "+" : "-"}${fmtNum(Math.abs(s.wageChange))} per year</strong>
      <span className="cp-stat-meta"> ({fmtPct(s.wageChangePct, true)})</span>
    </>,
  });
  if (s.range50Low != null && s.range50High != null) rows.push({
    label: "50% range",
    value: <><strong>${fmtNum(s.range50Low)} to ${fmtNum(s.range50High)}</strong></>,
  });
  if (s.range80Low != null && s.range80High != null) rows.push({
    label: "80% range",
    value: <><strong>${fmtNum(s.range80Low)} to ${fmtNum(s.range80High)}</strong> <span className="cp-stat-meta"> per year; new hires usually start near the low end</span></>,
  });
  if (s.hourlyMedian != null) rows.push({
    label: "median hourly",
    value: <><strong>${s.hourlyMedian.toFixed(2)} an hour</strong></>,
  });

  if (rows.length === 0) return null;
  return (
    <figure className="cp-dol">
      <table className="cp-dol-tbl">
        <tbody>
          {rows.map(r => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="cp-dol-cap">
(BLS Occupational Employment and Wage Statistics, May {s.dataYear || 2025}: {s.geoLabel || "Riverside-San Bernardino-Ontario metro"}, with national figures for comparison. Yearly change is May {(s.dataYear || 2025) - 1} to May {s.dataYear || 2025}.)
      </figcaption>
    </figure>
  );
};

// Apprenticeships from the CDSS registry whose occupation matches this
// career's apprenticeshipMatch keywords. Occupation-only matching — sponsor
// names cause false positives (a plumbers' union sponsoring an HVAC program).
const matchApprenticeships = (career) => {
  const kws = career.apprenticeshipMatch || [];
  if (!kws.length || !window.APPRENTICESHIPS) return [];
  return window.APPRENTICESHIPS.all()
    .filter(a => {
      const occ = (a.occupation || "").toLowerCase();
      return kws.some(k => occ.includes(k));
    })
    .sort((a, b) => (a.occupation || "").localeCompare(b.occupation || ""));
};

const APPR_PREVIEW_COUNT = 12;

const CpCareerApprenticeships = ({ career }) => {
  const matches = React.useMemo(() => matchApprenticeships(career), [career]);
  if (matches.length === 0) return null;
  const shown = matches.slice(0, APPR_PREVIEW_COUNT);
  return (
    <>
      <h2 className="cp-h2">Paid apprenticeships ({matches.length})</h2>
      <div className="cp-app-list">
        {shown.map(a => <CpApprenticeshipCard key={a.id} a={a} />)}
      </div>
      {matches.length > shown.length && (
        <p className="cp-app-more">
          <a href="#/apprenticeships">See all {matches.length} in CDSS Apprenticeships →</a>
        </p>
      )}
    </>
  );
};

// "What the job is" from O*NET, when we have it for this career.
const CpCareerAbout = ({ career, onOpen }) => {
  const d = window.CAREER_DETAILS && window.CAREER_DETAILS.get(career.id);
  const [more, setMore] = React.useState(false);
  if (!d) return null;
  const tasks = more ? d.tasks : d.tasks.slice(0, 4);
  return (
    <section className="cp-about-job">
      <h2 className="cp-h2">What the job is</h2>
      <p className="cp-job-desc">{d.description}</p>
      {d.tasks && d.tasks.length > 0 && (
        <>
          <h3 className="cp-h3">What you would actually do</h3>
          <ul className="cp-job-tasks">{tasks.map((t, i) => <li key={i}>{t}</li>)}</ul>
          {d.tasks.length > 4 && <button className="cp-link" onClick={() => setMore(m => !m)}>{more ? "Show fewer" : `Show all ${d.tasks.length}`}</button>}
        </>
      )}
      <div className="cp-job-grid">
        {d.jobZoneText && (
          <div className="cp-aside-card">
            <div className="cp-aside-eyebrow">How much school</div>
            <div className="cp-aside-body">{d.jobZoneText}{d.education && d.education.length ? <span className="cp-stat-meta"> People in this job: {d.education.map(e => `${e.pct}% ${e.level.toLowerCase()}`).join(", ")}.</span> : null}</div>
          </div>
        )}
        {d.interests && d.interests.length > 0 && (
          <div className="cp-aside-card">
            <div className="cp-aside-eyebrow">You might like it if you are</div>
            <div className="cp-aside-body">{d.interests.join(" · ")}</div>
          </div>
        )}
        {d.titles && d.titles.length > 0 && (
          <div className="cp-aside-card">
            <div className="cp-aside-eyebrow">Job titles you will see</div>
            <div className="cp-aside-body">{d.titles.join(", ")}</div>
          </div>
        )}
        {d.tech && d.tech.length > 0 && (
          <div className="cp-aside-card">
            <div className="cp-aside-eyebrow">Tools and software</div>
            <div className="cp-aside-body">{d.tech.join(", ")}</div>
          </div>
        )}
      </div>
      {d.related && d.related.length > 0 && (
        <p className="cp-job-related"><strong>Related paths:</strong> {d.related.map((r, i) => (
          <span key={i}>{i > 0 ? ", " : ""}{r.career ? <button className="cp-link" onClick={() => onOpen(r.career)}>{(window.CAREERS.byId(r.career) || {}).name || r.career}</button> : r.title}</span>
        ))}</p>
      )}
      <p className="cp-app-source">Job description, tasks and preparation from the O*NET 30.1 Database (U.S. Department of Labor), CC BY 4.0.</p>
    </section>
  );
};

const TIER_ORDER = { cc: 0, csu: 1, public4: 1, uc: 2, private: 3, trade: 4 };
const sortPrograms = (xs) => [...xs].sort((a, b) =>
  (b.curated ? 1 : 0) - (a.curated ? 1 : 0) ||
  (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9) ||
  (b.grads || 0) - (a.grads || 0) ||
  (a.inst || a.name).localeCompare(b.inst || b.name));

const fmtMiles = (m) => m == null ? "" : (m < 10 ? m.toFixed(1) : Math.round(m)) + " mi";
const withDistance = (xs) => {
  const g = window.getGeo && window.getGeo();
  if (!g) return xs;
  return xs.map(x => (typeof x.lat === "number" && typeof x.lng === "number") ? { ...x, miles: window.distanceMiles(g.lat, g.lng, x.lat, x.lng) } : x);
};
const byDistance = (a, b) => (a.miles ?? 1e9) - (b.miles ?? 1e9);

const fmtK = (n) => n == null ? null : "$" + Math.round(n / 1000) + "K";

const CpProgramCard = ({ p }) => {
  const tierLabels = window.APP_META.tierLabels;
  const e = p.earnings || null;
  const earnLine = e && (e.yr1 || e.yr4) ? (
    <div className="cp-prog-earn">
      <strong>{e.yr1 ? `Grads earned ${fmtK(e.yr1)} a year out` : `Grads earned ${fmtK(e.yr4)} four years out`}</strong>
      {e.yr1 && e.yr1Pell ? ` (Pell students ${fmtK(e.yr1Pell)})` : ""}
      {e.yr1 && e.yr1Nat ? ` · US average for this program ${fmtK(e.yr1Nat)}` : ""}
      {e.yr1 && e.yr4 ? ` · ${fmtK(e.yr4)} after four years` : ""}
    </div>
  ) : null;
  return (
    <div className={"cp-prog " + p.tier} key={p.id}>
      <div className="cp-prog-head">
        <div>
          <div className="cp-prog-tier">{tierLabels[p.tier] || p.tier}{p.forProfit ? <span className="cp-badge warn" title="For-profit school: compare cost and job placement rates carefully before enrolling">for-profit</span> : null}{p.curated ? <span className="cp-badge good">verified listing</span> : null}{p.housing ? <span className="cp-badge info" title="This school has on-campus housing">campus housing</span> : null}{p.childcare ? <span className="cp-badge info" title="On-campus childcare available">childcare</span> : null}</div>
          <div className="cp-prog-name">{p.name}</div>
          <div className="cp-prog-loc">{p.miles != null && <strong>{fmtMiles(p.miles)} · </strong>}{p.loc}{p.region && p.region !== p.loc ? `, ${p.region}` : ""} · {p.duration}{p.grads ? ` · ${p.grads} grads in 2023-24` : ""}{p.gradRate != null && p.tier !== "cc" ? <span title="Share of first-time, full-time students who finish within 150% of the normal time (transfers out are not counted)">{` · ${p.gradRate}% graduate`}</span> : ""}</div>
          {earnLine}
        </div>
        {(p.sticker > 0 || p.netPrice30k != null) && (
          <div className="cp-prog-money">
            {p.sticker > 0 && <div className="cp-prog-sticker">tuition ${p.sticker.toLocaleString()}</div>}
            {p.netPrice30k != null
              ? <div className="cp-prog-real">${p.netPrice30k.toLocaleString()}<span>/yr typical, low-income students, incl. living costs</span></div>
              : <div className="cp-prog-real">${(p.realCost || 0).toLocaleString()}<span>/yr tuition after aid</span></div>}
          </div>
        )}
      </div>
      <div className="cp-prog-action">
        <span>Next: {p.action}{p.applFee === 0 ? " (no application fee)" : ""}</span>
        <span className="cp-prog-links">
          {p.phone && <a href={"tel:" + String(p.phone).replace(/[^0-9+]/g, "")} className="cp-prog-link">{p.phone}</a>}
          {p.url && <a href={p.url} target="_blank" rel="noopener" className="cp-prog-link">Visit site →</a>}
        </span>
      </div>
    </div>
  );
};

const PROG_PREVIEW = 20;

// The main program list for a career: filterable by school/city, 20 at a time.
const CpProgramList = ({ progs, careerId }) => {
  const [showAll, setShowAll] = React.useState(false);
  const [pq, setPq] = React.useState("");
  const [level, setLevel] = React.useState("all");
  React.useEffect(() => { setShowAll(false); setPq(""); setLevel("all"); }, [careerId]);
  const q = pq.trim().toLowerCase();
  const levels = {};
  progs.forEach(p => { if (p.level) levels[p.level] = (levels[p.level] || 0) + 1; });
  const hasGeo = !!(window.getGeo && window.getGeo());
  const [nearest, setNearest] = React.useState(true);
  let filtered = sortPrograms(withDistance(progs).filter(p =>
    (level === "all" || p.level === level) &&
    (!q || [p.inst, p.name, p.loc, p.region, p.county].filter(Boolean).join(" ").toLowerCase().includes(q))));
  if (hasGeo && nearest) filtered = [...filtered].sort(byDistance);
  const shown = showAll ? filtered : filtered.slice(0, PROG_PREVIEW);
  const LEVEL_LABEL = { cert: "Certificate", assoc: "Associate", bach: "Bachelor's", grad: "Graduate" };
  return (
    <>
      {progs.length > 8 && (
        <div className="cp-filters" role="toolbar" aria-label="Filter programs">
          {Object.keys(levels).length > 1 && (
            <>
              <button className={"cp-chip " + (level === "all" ? "on" : "")} onClick={() => setLevel("all")} aria-pressed={level === "all"}>All levels</button>
              {["cert", "assoc", "bach", "grad"].filter(l => levels[l]).map(l => (
                <button key={l} className={"cp-chip " + (level === l ? "on" : "")} onClick={() => setLevel(l)} aria-pressed={level === l}>{LEVEL_LABEL[l]} <span className="cp-chip-n">{levels[l]}</span></button>
              ))}
            </>
          )}
          {hasGeo && <button className={"cp-chip " + (nearest ? "on" : "")} onClick={() => setNearest(n => !n)} aria-pressed={nearest}>Nearest first</button>}
          <input className="cp-search" type="search" placeholder="Filter by school or city…" value={pq} onChange={e => setPq(e.target.value)} aria-label="Filter programs by school or city" />
        </div>
      )}
      <div className="cp-prog-list">{shown.map(p => <CpProgramCard key={p.id} p={p} />)}</div>
      {filtered.length > shown.length && (
        <p className="cp-app-more"><button className="cp-link" onClick={() => setShowAll(true)}>Show all {filtered.length} programs →</button></p>
      )}
      {filtered.length === 0 && progs.length > 0 && <p className="cp-filter-meta">Nothing matches that filter.</p>}
    </>
  );
};

const CpProgramGroup = ({ title, progs, open, emptyText }) => {
  const [showAll, setShowAll] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(open);
  React.useEffect(() => { setIsOpen(open); setShowAll(false); }, [open, title]);
  const shown = showAll ? progs : progs.slice(0, PROG_PREVIEW);
  return (
    <section className="cp-prog-group">
      <button className="cp-prog-group-h" onClick={() => setIsOpen(o => !o)} aria-expanded={isOpen}>
        <span>{title}</span><span className="cp-prog-group-n">{progs.length} {isOpen ? "▴" : "▾"}</span>
      </button>
      {isOpen && (progs.length === 0 ? <p className="cp-filter-meta">{emptyText}</p> : (
        <>
          <div className="cp-prog-list">{shown.map(p => <CpProgramCard key={p.id} p={p} />)}</div>
          {progs.length > shown.length && (
            <p className="cp-app-more"><button className="cp-link" onClick={() => setShowAll(true)}>Show all {progs.length} →</button></p>
          )}
        </>
      ))}
    </section>
  );
};

const CpCareer = ({ careerId, saved, toggleSave, onBack, onOpenAid }) => {
  const career = window.CAREERS.byId(careerId);
  const { loc, status } = useFpLocation();
  if (!career) return <main className="cp-main narrow"><button className="cp-back" onClick={onBack}>← Careers</button><p>Career not found.</p></main>;
  const stateName = window.stateName(loc.state);
  const inState = sortPrograms(window.PROGRAMS.forCareer(career.id, { state: loc.state }));
  const here = loc.region ? inState.filter(p => p.region === loc.region) : inState;
  const elsewhere = loc.region ? inState.filter(p => p.region !== loc.region) : [];
  const guide = window.STATE_GUIDES.get(loc.state);
  // Wages: the metro or state figures from the BLS files when the state has
  // them, else the career file's California (Inland Empire) numbers.
  const local = window.WAGES.local(career.id, loc);
  const nat = window.WAGES.national(career.id) || (career.dolStats ? { medianWage: career.dolStats.nationalMedianWage, employed: career.dolStats.nationalEmployed, yearlyChangePct: career.dolStats.nationalGrowthPct } : null);
  const wages = local ? local.rec : null;
  const medianK = wages && wages.medianWage ? Math.round(wages.medianWage / 1000) : career.salary.median;
  const payLabel = wages && wages.medianWage ? (local.level === "region" ? `median pay, ${loc.region}` : `median pay, ${stateName}`) : "median pay, CA";
  const dolStats = wages && wages.medianWage
    ? { ...wages, nationalEmployed: nat && nat.employed, nationalMedianWage: nat && nat.medianWage, nationalGrowthPct: nat && nat.yearlyChangePct, dataYear: local.dataYear, geoLabel: local.geo }
    : career.dolStats;
  const steps = guide && guide.firstWeek && guide.firstWeek.length ? guide.firstWeek.slice(0, 4).map(s => s.title)
    : (loc.state === "CA" ? ["FAFSA / CADAA", "Chafee ETV app", "CCCApply or Cal State Apply", "Email Guardian Scholars"]
                           : ["FAFSA (independent student)", `${stateName} ETV application`, "Apply to the school (ask for a fee waiver)", "Email the campus foster youth program"]);
  return (
    <main className="cp-main narrow">
      <button className="cp-back" onClick={onBack}>← All careers</button>
      <div className="cp-detail-head">
        <h1 className="cp-h1">{career.name}</h1>
      </div>
      <div className="cp-detail-grid">
        <div>
          <div className="cp-detail-stats">
            <div><div className="cp-stat">${medianK}K</div><div className="cp-stat-lbl">{payLabel}</div></div>
            <div><div className="cp-stat">{career.length}</div><div className="cp-stat-lbl">time</div></div>
            <div><div className="cp-stat">{career.demand}</div><div className="cp-stat-lbl">demand</div></div>
            <div><div className="cp-stat">{(career.grads2yr || 'n/a').split(' ')[0]}</div><div className="cp-stat-lbl">grads employed</div></div>
          </div>

          {dolStats && (loc.state === "CA" || (wages && wages.medianWage)) && <CpDolStats stats={dolStats} />}
          {!(wages && wages.medianWage) && loc.state !== "CA" && status !== "loading" && nat && nat.medianWage && (
            <p className="cp-filter-meta">Pay shown is California's. Nationally, the median is ${fmtNum(nat.medianWage)} a year{nat.employed ? ` across ${fmtNum(nat.employed)} jobs` : ""} (BLS, 2025). BLS does not publish a {stateName} figure for this job.</p>
          )}
          {wages && wages.medianWage && local.level === "state" && loc.region && (
            <p className="cp-filter-meta">BLS does not publish {loc.region} figures for this job; statewide {stateName} numbers are shown.</p>
          )}

          <CpCareerAbout career={career} onOpen={(id) => { window.location.hash = "#/career/" + encodeURIComponent(id); }} />

          <h2 className="cp-h2">Programs in {loc.region || stateName}</h2>
          {status === "loading" && here.length === 0 && <p className="cp-filter-meta">Loading {stateName} programs…</p>}
          {status !== "loading" && here.length === 0 && (
            <p className="cp-filter-meta">No {career.name} programs found in {loc.region || stateName}{elsewhere.length ? ", but there are some elsewhere in the state below." : ". Try the map, or check a nearby state."}</p>
          )}
          <CpProgramList progs={here} careerId={career.id} />
          {loc.region && elsewhere.length > 0 && (
            <CpProgramGroup title={`Elsewhere in ${stateName}`} progs={sortPrograms(elsewhere)} open={here.length < 3} emptyText="" />
          )}
          <p className="cp-app-source">Program lists come from each school's federal reporting (IPEDS, 2023-24 graduates) plus verified listings. "Typical, low-income students" is the school's average net price for students from families earning under $30,000 (2022-23, housing and food included, before foster youth aid like ETV and waivers). Earnings are College Scorecard medians for graduates of that program. Confirm with the school.</p>

          <CpCareerApprenticeships career={career} />
        </div>

        <aside className="cp-aside">
          <button
            className={"cp-save-big " + (saved.includes(career.id) ? "on" : "")}
            onClick={() => toggleSave(career.id)}
            aria-pressed={saved.includes(career.id)}
          >
            {saved.includes(career.id) ? "✓ Saved to compare" : "+ Save this path"}
          </button>
          {career.grads2yr && (
            <div className="cp-aside-card">
              <div className="cp-aside-eyebrow">Grads 2 yrs out</div>
              <div className="cp-aside-body">{career.grads2yr}</div>
            </div>
          )}
          <div className="cp-aside-card">
            <div className="cp-aside-eyebrow">This week</div>
            <ol className="cp-aside-steps">
              {steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
};

// ----------------------------------------------------------------------
//  Intake survey + aid logic
// ----------------------------------------------------------------------

// Default aid totals per school tier, for foster youth. Used as a fallback
// when no profile exists, and as the ceiling that the profile multipliers
// scale down from.
const AID_TOTALS = {
  foster:    { cc: 12000, csu: 26000, uc: 27000, private: 65000 },
  agedout:   { cc: 12000, csu: 26000, uc: 27000, private: 50000 },
  adopted:   { cc: 11000, csu: 22000, uc: 25000, private: 30000 },
  probation: { cc:  9000, csu: 13000, uc: 22000, private: 10000 },
  none:      { cc:  9000, csu: 13000, uc: 22000, private: 10000 },
};

// Which aid IDs each profile status typically qualifies for.
const AID_FOR_STATUS = {
  foster:    new Set(["chafee","pell","calgrant","mcs","ccpg","nextup","gs","jbay"]),
  agedout:   new Set(["chafee","pell","calgrant","mcs","ccpg","nextup","gs","jbay"]),
  adopted:   new Set(["chafee","pell","calgrant","mcs","ccpg","gs"]),
  probation: new Set(["pell","calgrant","ccpg"]),
  none:      new Set(["pell","calgrant","ccpg"]),
};

const aidStackForProfile = (profile, school) => {
  if (!profile) return AID_TOTALS.foster[school];
  const status = profile.status || "foster";
  const base   = (AID_TOTALS[status] || AID_TOTALS.foster)[school] || 0;
  // Out-of-state students lose Cal Grant / Promise Grant — drop ~$5K-$14K
  if (!profile.resident) {
    const caHit = { cc: 1150, csu: 6000, uc: 10000, private: 9000 }[school] || 0;
    return Math.max(0, base - caHit);
  }
  return base;
};

const isAidEligible = (aidId, profile) => {
  if (!profile) return true;
  const set = AID_FOR_STATUS[profile.status] || AID_FOR_STATUS.foster;
  if (!set.has(aidId)) return false;
  // Cal Grant + CCPG require CA residency
  if ((aidId === "calgrant" || aidId === "ccpg") && !profile.resident) return false;
  return true;
};

const CpSurvey = ({ profile, onComplete, onCancel }) => {
  const [status, setStatus]       = React.useState(profile?.status || "");
  const [age, setAge]             = React.useState(profile?.age ?? "");
  const [education, setEducation] = React.useState(profile?.education || "");
  const [resident, setResident]   = React.useState(profile?.resident == null ? "" : (profile.resident ? "yes" : "no"));

  const ageNum = parseInt(age, 10);
  const ageOk = ageNum >= 14 && ageNum <= 60;
  const canSubmit = status && ageOk && education && resident;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onComplete({
      status, age: ageNum, education,
      resident: resident === "yes",
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <main className="cp-main narrow">
      {profile && onCancel && <button className="cp-back" onClick={onCancel}>← Cost calculator</button>}
      <div className="cp-eyebrow">Quick check-in (60 seconds)</div>
      <h1 className="cp-h1">Help us calculate your aid.</h1>
      <p className="cp-lede">Foster youth, probation youth, and others qualify for different aid. Four questions, then we'll show you what programs actually cost.</p>

      <form className="cp-survey" onSubmit={submit}>
        <fieldset className="cp-survey-q">
          <legend>1. Which describes you right now?</legend>
          {[
            ["foster",    "Currently in foster care"],
            ["agedout",   "Aged out of foster care (within the last 6 years)"],
            ["adopted",   "Adopted from foster care after age 16"],
            ["probation", "On probation, or in a probation placement"],
            ["none",      "None of the above"],
          ].map(([v, l]) => (
            <label key={v} className={"cp-survey-opt" + (status === v ? " on" : "")}>
              <input type="radio" name="status" value={v} checked={status === v} onChange={() => setStatus(v)} />
              <span>{l}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="cp-survey-q">
          <legend>2. Your age</legend>
          <input
            type="number"
            inputMode="numeric"
            min="14" max="60"
            className="cp-survey-num"
            placeholder="e.g. 19"
            value={age}
            onChange={e => setAge(e.target.value)}
          />
        </fieldset>

        <fieldset className="cp-survey-q">
          <legend>3. Highest school you've completed</legend>
          {[
            ["inhs",      "Currently in high school"],
            ["hsdiploma", "HS diploma or GED"],
            ["somecoll",  "Some college, no degree yet"],
            ["degree",    "Associate's or bachelor's degree"],
          ].map(([v, l]) => (
            <label key={v} className={"cp-survey-opt" + (education === v ? " on" : "")}>
              <input type="radio" name="education" value={v} checked={education === v} onChange={() => setEducation(v)} />
              <span>{l}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="cp-survey-q">
          <legend>4. Are you a California resident?</legend>
          {[["yes","Yes"],["no","No / out of state"]].map(([v, l]) => (
            <label key={v} className={"cp-survey-opt" + (resident === v ? " on" : "")}>
              <input type="radio" name="resident" value={v} checked={resident === v} onChange={() => setResident(v)} />
              <span>{l}</span>
            </label>
          ))}
        </fieldset>

        <p className="cp-survey-priv">Your answers stay on this device and are not shared. Update them anytime from the cost calculator.</p>

        <div className="cp-survey-actions">
          <button type="submit" className="cp-btn" disabled={!canSubmit}>Show me my aid →</button>
        </div>
      </form>
    </main>
  );
};

const STATUS_LABEL = {
  foster:    "current foster youth",
  agedout:   "former foster youth",
  adopted:   "adopted from foster care",
  probation: "probationary youth",
  none:      "non-foster, non-probation",
};

// Profile-aware "how do you close the gap" note shown under the bar.
const gapNote = (gap, profile) => {
  if (gap === 0) return "Your stack covers everything. Any surplus goes to rent, food, books, savings.";
  const fosterLike = ["foster","agedout","adopted"].includes(profile.status);
  if (fosterLike) {
    return "Gap typically closed by JBAY emergency grants, campus Guardian Scholars funds, or work-study.";
  }
  if (profile.status === "probation") {
    return "Probation-specific scholarships (Project Rebound at CSU, BESH, restorative-justice funds) often close the rest.";
  }
  // status: none
  return "Gap typically closed by Federal Direct Loans (subsidized first, ~$5.5K/yr first year), campus work-study, employer tuition benefits, or local scholarships.";
};

// Median in-state sticker (tuition + fees) for a tier, from the loaded programs of a state.
const medianSticker = (st, tiers, fallback) => {
  const vals = window.PROGRAMS.byState(st).filter(p => tiers.includes(p.tier) && p.sticker > 0 && !p.forProfit).map(p => p.sticker).sort((a, b) => a - b);
  if (!vals.length) return fallback;
  return vals[Math.floor(vals.length / 2)];
};

// Cost view for states other than California: Pell + ETV + the state's own
// waiver, against that state's typical tuition.
const CpMoneyState = ({ loc, profile, onEdit, go }) => {
  const st = loc.state;
  const stateName = window.stateName(st);
  const guide = window.STATE_GUIDES.get(st);
  const [school, setSchool] = React.useState("cc");
  const [living, setLiving] = React.useState("home");
  const stickers = {
    cc: medianSticker(st, ["cc"], 4000),
    public4: medianSticker(st, ["public4"], 11000),
    private: medianSticker(st, ["private"], 40000),
  };
  const livingAdd = { home: 0, ils: 2000, dorms: 14000, solo: 18000 };
  const sticker = stickers[school] + livingAdd[living];
  const fosterLike = ["foster", "agedout", "adopted"].includes(profile.status);
  const pell = 7395;
  const etv = fosterLike && profile.age >= 14 && profile.age <= 26 ? 5000 : 0;
  const waiverApplies = fosterLike && guide && guide.tuitionWaiver && guide.tuitionWaiver.exists && school !== "private";
  const waiver = waiverApplies ? stickers[school] : 0;
  const aidCovered = Math.min(sticker, pell + etv + waiver);
  const gap = Math.max(0, sticker - aidCovered);
  const stateAid = (guide && guide.stateAid) || [];
  const natAid = window.SCHOLARSHIPS.national().filter(s => s.type === "etv" || s.type === "grant").slice(0, 6);

  return (
    <main className="cp-main narrow">
      <h1 className="cp-h1">Cost Calculator</h1>
      <div className="cp-profile-summary">
        <span>Calculated for: <strong>{STATUS_LABEL[profile.status] || profile.status}</strong>, age {profile.age}, in <strong>{stateName}</strong>.</span>
        <button className="cp-link" onClick={onEdit}>Retake aid quiz</button>
      </div>

      <div className="cp-calc">
        <div className="cp-calc-controls">
          <label>School type
            <select value={school} onChange={e => setSchool(e.target.value)}>
              <option value="cc">Community college</option>
              <option value="public4">Public university</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label>Living
            <select value={living} onChange={e => setLiving(e.target.value)}>
              <option value="home">With family / foster home</option>
              <option value="ils">Transitional housing</option>
              <option value="dorms">Campus dorms</option>
              <option value="solo">Renting solo</option>
            </select>
          </label>
        </div>
        <div className="cp-calc-out">
          <div className="cp-calc-eyebrow">Your cost (estimate)</div>
          <div className="cp-calc-num">${gap.toLocaleString()}<span>/yr</span></div>
          <div className="cp-calc-sticker">sticker: ${sticker.toLocaleString()}/yr (typical in-state tuition and fees in {stateName}{living !== "home" ? " plus housing" : ""})</div>
          <div className="cp-calc-bar">
            <div className="cp-bar-stack">
              <div className="cp-bar-seg" style={{ width: `${Math.min(100, (aidCovered / sticker) * 100)}%`, background: '#1e3a5f' }}>Aid ${aidCovered.toLocaleString()}</div>
              {gap > 0 && <div className="cp-bar-seg" style={{ width: `${(gap / sticker) * 100}%`, background: '#d4c3a8', color: '#1a1a1a' }}>Gap ${gap.toLocaleString()}</div>}
            </div>
          </div>
          <p className="cp-calc-note">
            Stack: Pell up to ${pell.toLocaleString()}{etv ? `, ${stateName} ETV up to $${etv.toLocaleString()}` : ""}{waiverApplies ? `, and the ${guide.tuitionWaiver.name} covering public tuition` : ""}.
            {!guide ? ` We are still confirming ${stateName}'s waiver and ETV rules, so this leaves them out.` : ""}
            {gap > 0 ? " Campus foster youth programs, scholarships, and work-study usually close the rest." : " Any surplus goes to rent, food, books, savings."}
          </p>
        </div>
      </div>

      <h2 className="cp-h2">Aid in {stateName}</h2>
      {stateAid.length === 0 && <p className="cp-filter-meta">State-specific aid for {stateName} is still being added. The national programs below apply everywhere.</p>}
      <div className="cp-aid-grid">
        {stateAid.map(a => (
          <a className="cp-aid-card" key={a.id} href={a.apply && a.apply.startsWith("http") ? a.apply : undefined} target="_blank" rel="noopener">
            <div className="cp-aid-amt">{a.amount}</div>
            <div className="cp-aid-name">{a.name}</div>
            <p>{a.desc}{a.gotchas ? ` ${a.gotchas}` : ""}</p>
          </a>
        ))}
        {natAid.map(s => (
          <a className="cp-aid-card" key={s.id} href={s.url} target="_blank" rel="noopener">
            <div className="cp-aid-amt">{s.amount}</div>
            <div className="cp-aid-name">{s.name}</div>
            <p>{s.eligibility}</p>
          </a>
        ))}
      </div>
      <p className="cp-app-more"><button className="cp-link" onClick={() => go("scholarships")}>See every scholarship for {stateName} →</button></p>
    </main>
  );
};

const CpMoney = ({ onOpenAid, profile, setProfile, go }) => {
  const aid = window.APP_META.aid;
  const [school, setSchool] = React.useState("uc");
  const [living, setLiving] = React.useState("dorms");
  const [editing, setEditing] = React.useState(false);
  const { loc } = useFpLocation();

  // Gate: until they fill out the survey, only show the survey.
  if (!profile || editing) {
    return <CpSurvey
      profile={editing ? profile : null}
      onComplete={(p) => { setProfile(p); setEditing(false); }}
      onCancel={editing ? () => setEditing(false) : null}
    />;
  }
  if (loc.state !== "CA") {
    return <CpMoneyState loc={loc} profile={profile} onEdit={() => setEditing(true)} go={go || (() => {})} />;
  }

  const stickers   = { cc: 1150, csu: 7400, uc: 14400, private: 65000 };
  const livingAdd  = { home: 0, ils: 2000, dorms: 16000, solo: 20000 };
  const sticker    = stickers[school] + livingAdd[living];
  const baseAid    = aidStackForProfile(profile, school);
  const chafeeBonus = (["foster","agedout"].includes(profile.status) && profile.age >= 16 && profile.age <= 25) ? 4500 : 0;
  const aidCovered = Math.min(sticker, baseAid + chafeeBonus);
  const gap        = Math.max(0, sticker - aidCovered);
  const eligibleAid = aid.filter(a => isAidEligible(a.id, profile));

  return (
    <main className="cp-main narrow">
      <h1 className="cp-h1">Cost Calculator</h1>

      <div className="cp-profile-summary">
        <span>Calculated for: <strong>{STATUS_LABEL[profile.status] || profile.status}</strong>, age {profile.age}, {profile.resident ? "CA resident" : "out of state"}.</span>
        <button className="cp-link" onClick={() => setEditing(true)}>Retake aid quiz</button>
      </div>

      <div className="cp-calc">
        <div className="cp-calc-controls">
          <label>School type
            <select value={school} onChange={e => setSchool(e.target.value)}>
              <option value="cc">Community College</option>
              <option value="csu">CSU</option>
              <option value="uc">UC</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label>Living
            <select value={living} onChange={e => setLiving(e.target.value)}>
              <option value="home">With family / group home</option>
              <option value="ils">Transitional / ILS / SILP</option>
              <option value="dorms">Campus dorms</option>
              <option value="solo">Renting solo</option>
            </select>
          </label>
        </div>
        <div className="cp-calc-out">
          <div className="cp-calc-eyebrow">Your cost</div>
          <div className="cp-calc-num">${gap.toLocaleString()}<span>/yr</span></div>
          <div className="cp-calc-sticker">sticker: ${sticker.toLocaleString()}/yr</div>
          <div className="cp-calc-bar">
            <div className="cp-bar-stack">
              <div className="cp-bar-seg" style={{ width: `${Math.min(100, (aidCovered / sticker) * 100)}%`, background: '#1e3a5f' }}>Aid ${aidCovered.toLocaleString()}</div>
              {gap > 0 && <div className="cp-bar-seg" style={{ width: `${(gap / sticker) * 100}%`, background: '#d4c3a8', color: '#1a1a1a' }}>Gap ${gap.toLocaleString()}</div>}
            </div>
          </div>
          <p className="cp-calc-note">{gapNote(gap, profile)}</p>
        </div>
      </div>

      <h2 className="cp-h2">{eligibleAid.length} aid source{eligibleAid.length === 1 ? "" : "s"} you likely qualify for</h2>
      <div className="cp-aid-grid">
        {eligibleAid.map(a => (
          <button className="cp-aid-card" key={a.id} onClick={() => onOpenAid(a.id)} aria-label={`Learn more about ${a.name}`}>
            <div className="cp-aid-amt">{a.amount}</div>
            <div className="cp-aid-name">{a.name}</div>
            <p>{a.desc}</p>
          </button>
        ))}
      </div>
    </main>
  );
};

const CpAidDetail = ({ aidId, onBack }) => {
  const a = window.APP_META.aid.find(x => x.id === aidId);
  if (!a) return null;
  return (
    <main className="cp-main narrow">
      <button className="cp-back" onClick={onBack}>← Cost &amp; aid</button>
      <div className="cp-eyebrow">Aid source</div>
      <h1 className="cp-h1">{a.name}</h1>
      <p className="cp-lede">{a.desc}</p>
      <div className="cp-aid-detail">
        <div className="cp-aid-amt-big">{a.amount}</div>
        <h3>Eligibility</h3>
        <p>{a.eligibility}</p>
        <h3>How to apply</h3>
        <p>{a.apply.startsWith('http') ? <a href={a.apply} target="_blank" rel="noopener">{a.apply}</a> : a.apply}</p>
        <h3>Common gotchas</h3>
        <p>{a.gotchas}</p>
      </div>
    </main>
  );
};

const Ext = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener" className="cp-step-link">{children}</a>
);

const STEPS = [
  {
    title: "FAFSA or CADAA",
    body: <>Federal (FAFSA) or state-only (CADAA, for non-citizens) financial aid application. Required for Pell, Cal Grant, CCPG, and most campus aid. Foster youth file as "unaccompanied youth" — parent income not required.</>,
    links: [
      { label: "FAFSA",  href: "https://studentaid.gov/h/apply-for-aid/fafsa" },
      { label: "CADAA",  href: "https://dream.csac.ca.gov/" },
    ],
  },
  {
    title: "Chafee Grant (ETV)",
    body: <>California's Chafee Grant for Foster Youth. $4,500 per year for 2026-27 (program maximum $5,000) for foster youth who were in care between 16 and 18, under 26, enrolled at least half time. One application, valid until 26, first come first served.</>,
    links: [
      { label: "Apply at chafee.csac.ca.gov", href: "https://chafee.csac.ca.gov/" },
    ],
  },
  {
    title: "Apply to schools",
    body: <>CCCApply for community colleges (free, no limit). Cal State Apply for CSU campuses (Oct 1 – Nov 30 priority). UC Application for UC campuses (Aug 1 – Nov 30).</>,
    links: [
      { label: "CCCApply",        href: "https://www.cccapply.org/" },
      { label: "Cal State Apply", href: "https://www.calstate.edu/apply" },
      { label: "UC Application",  href: "https://apply.universityofcalifornia.edu/" },
    ],
  },
  {
    title: "Contact Guardian Scholars / NextUp",
    body: <>Foster youth support programs at every CSU and UC campus (Guardian Scholars and similar) and at all 115 California community colleges (NextUp). Email or visit before applying to confirm eligibility and ask about housing over breaks, priority registration, and grants.</>,
    links: [
      { label: "CSAC foster youth page",           href: "https://www.csac.ca.gov/foster-youth" },
      { label: "NextUp (community colleges)",      href: "https://icangotocollege.com/financial-aid/foster-youth-support" },
      { label: "Campus program search (CCP)",      href: "https://cacollegepathways.org/search/" },
    ],
  },
  {
    title: "Gather documents",
    body: <>High school transcript, foster care verification letter (request it from the Foster Care Ombudsperson, 1-877-846-1602, or your social worker), Social Security card or number, photo ID. Keep digital copies on your phone.</>,
    links: [
      { label: "Request a verification letter", href: "https://fosteryouthhelp.ca.gov/verification-request-form/" },
    ],
  },
];

// Steps that are true in every state, used when a state guide has not written its own.
const NATIONAL_STEPS = (stateName) => [
  { title: "FAFSA", body: <>File at studentaid.gov. Answer yes to the foster care question: you are an independent student and no parent income is needed. This unlocks Pell (up to $7,395 a year) and most campus aid.</>, links: [{ label: "FAFSA", href: "https://studentaid.gov/h/apply-for-aid/fafsa" }] },
  { title: `${stateName} ETV (Chafee) voucher`, body: <>Every state runs an Education and Training Voucher of up to $5,000 a year for youth who were in foster care. Your state's child welfare agency or its contractor takes the application. See the state guide for the link.</>, links: [{ label: "Find your state's ETV", href: "https://www.fc2success.org/programs/education-training-vouchers/" }] },
  { title: "Apply to schools", body: <>Community colleges are open admission. Ask the admissions office for a fee waiver; foster youth qualify as independent, low-income applicants almost everywhere.</>, links: [] },
  { title: "Contact the campus foster youth program", body: <>Most public campuses have a program for students from foster care (names vary: Guardian Scholars, Fostering Success, Renaissance Scholars). Email before you enroll; they often hold housing, grants, and priority registration.</>, links: [] },
  { title: "Gather documents", body: <>Transcript, a foster care verification letter from your caseworker or agency, Social Security card or number, photo ID. Keep photos of each on your phone.</>, links: [] },
];

const CpWeek = ({ go }) => {
  const { loc } = useFpLocation();
  const stateName = window.stateName(loc.state);
  const guide = window.STATE_GUIDES.get(loc.state);
  let steps;
  if (loc.state === "CA") steps = STEPS;
  else if (guide && guide.firstWeek && guide.firstWeek.length) steps = guide.firstWeek.map(s => ({ title: s.title, body: s.body, links: s.url ? [{ label: "Open", href: s.url }] : [] }));
  else steps = NATIONAL_STEPS(stateName);
  return (
    <main className="cp-main narrow">
      <div className="cp-eyebrow">This week · {stateName}</div>
      <h1 className="cp-h1">Do these first</h1>
      {steps.map((s, i) => (
        <div className="cp-week-row" key={i}>
          <div className="cp-week-n">{String(i + 1).padStart(2, "0")}</div>
          <div>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            {s.links.length > 0 && (
              <div className="cp-step-links">
                {s.links.map(l => <Ext key={l.href} href={l.href}>{l.label} →</Ext>)}
              </div>
            )}
          </div>
        </div>
      ))}
      {go && <p className="cp-app-more"><button className="cp-link" onClick={() => go("state")}>See the full {stateName} guide →</button></p>}
    </main>
  );
};

const CpAbout = () => {
  const [cleared, setCleared] = React.useState(false);
  const clearData = () => {
    try {
      localStorage.removeItem("clearpath:saved:v1");
      localStorage.removeItem("clearpath:profile:v1");
      Object.keys(localStorage)
        .filter(k => k.startsWith("cp:"))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
    setCleared(true);
  };
  return (
    <main className="cp-main narrow cp-about">
      <h2 className="cp-h2">Where the numbers come from</h2>
      <div className="cp-about-meta">
        <div><strong>Programs, nationwide</strong>U.S. Dept. of Education IPEDS: institutions (HD2024), completions by program 2023-24 (C2024_A), tuition and fees (IC2023_AY), on-campus housing and childcare (IC2023), and average net price for students from families earning under $30,000 (SFA 2022-23). Only programs that graduated at least one student are listed.</div>
        <div><strong>Job descriptions</strong>This site includes information from the O*NET 30.1 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), used under the CC BY 4.0 license. O*NET is a trademark of USDOL/ETA. Fostering Paths is not endorsed by USDOL/ETA.</div>
        <div><strong>Graduate earnings</strong>U.S. Dept. of Education College Scorecard: median earnings of graduates by program and credential, one and four years after completion, including Pell recipients, with the national median for the same program type.</div>
        <div><strong>Verified listings (Inland SoCal)</strong>Each school's own program page, checked by hand</div>
        <div><strong>Support resources, scholarships, state guides</strong>Each program's or agency's own page; every record carries the month it was checked</div>
        <div><strong>Cal Grant</strong>California Student Aid Commission, current cycle</div>
        <div><strong>Pell Grant</strong>U.S. Dept. of Education, 2025–26 schedule</div>
        <div><strong>Chafee ETV</strong>CSAC Chafee program, current annual maximum</div>
        <div><strong>Pay and employment</strong>U.S. Bureau of Labor Statistics, Occupational Employment and Wage Statistics, May 2025 state and metro tables (with May 2024 for the yearly change). Every state and about 390 metro areas. The figures are for all workers in the job, not just new graduates; new hires usually start near the low end of the 80% range.</div>
        <div><strong>Apprenticeships</strong>CA Division of Apprenticeship Standards public registry</div>
        <div><strong>Coverage</strong>{Object.keys(window.STATE_INDEX || {}).length} states · {Object.values(window.STATE_INDEX || {}).reduce((n, s) => n + (s.counts ? s.counts.programs : 0), 0).toLocaleString()} programs · {Object.values(window.STATE_INDEX || {}).reduce((n, s) => n + (s.counts ? s.counts.resources : 0), 0).toLocaleString()} support resources · {Object.values(window.STATE_INDEX || {}).filter(s => s.counts && s.counts.guide).length} state guides · wages for {Object.values(window.STATE_INDEX || {}).filter(s => s.counts && s.counts.wages).length} states</div>
        <div><strong>Updated</strong>October 2026 · v2.0</div>
      </div>
      <p>Something wrong or missing? Tell Tyler through the contact form at <a href="https://www.tylerjohnpeters.com/#contact">tylerjohnpeters.com</a>. A wrong phone number gets fixed the same week.</p>

      <h2 className="cp-h2">Your privacy</h2>
      <p>This site stores your aid-quiz answers and saved careers in your own browser only. Nothing is sent to a server. Anyone with access to this browser can see those answers, so if you're on a shared or public computer, clear your data before handing the device back.</p>
      <p>
        <button className="cp-btn-ghost" onClick={clearData} disabled={cleared}>
          {cleared ? "✓ Data cleared" : "Clear my saved data"}
        </button>
      </p>
    </main>
  );
};

Object.assign(window, { CpCareer, CpMoney, CpAidDetail, CpWeek, CpAbout });
