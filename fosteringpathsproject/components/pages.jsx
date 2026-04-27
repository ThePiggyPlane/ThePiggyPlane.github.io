// Career detail, Money calculator, First Week, About — secondary pages.

// Format an integer with thin spaces for thousands (Wolfram Alpha style: "34 570").
const fmtNum = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
const fmtSigned = (n) => (n >= 0 ? "+" + fmtNum(n) : "-" + fmtNum(-n));
const fmtPct = (n, sign = false) => {
  if (n == null || Number.isNaN(n)) return "—";
  const s = (Math.round(n * 10) / 10).toString();
  return (sign && n >= 0 ? "+" : "") + s + "%";
};

const CpDolStats = ({ stats }) => {
  const s = stats;
  // Wage premium / discount vs US national median
  const wagePremiumPct = s.nationalMedianWage
    ? ((s.medianWage - s.nationalMedianWage) / s.nationalMedianWage) * 100
    : null;

  const rows = [
    {
      label: "people employed",
      value: <>
        <strong>{fmtNum(s.employed)} people</strong>
        {s.nationalEmployed != null && (
          <span className="cp-stat-meta"> (US: {fmtNum(s.nationalEmployed)})</span>
        )}
      </>,
    },
    {
      label: "yearly change",
      value: <>
        <strong>{fmtSigned(s.yearlyChange)} people</strong>
        <span className="cp-stat-meta"> ({fmtPct(s.yearlyChangePct, true)})</span>
        {s.nationalGrowthPct != null && (
          <span className="cp-stat-meta"> (US: {fmtPct(s.nationalGrowthPct, true)})</span>
        )}
      </>,
    },
    {
      label: "workforce fraction",
      value: <>
        <strong>{fmtPct(s.fractionPct)}</strong>
        <span className="cp-stat-meta"> (1 in {fmtNum(s.oneInN)})</span>
        <span className="cp-stat-meta"> ({s.vsNational}× national average)</span>
      </>,
    },
    {
      label: "median wage",
      value: <>
        <strong>${fmtNum(s.medianWage)} per year</strong>
        {s.nationalMedianWage != null ? (
          <span className="cp-stat-meta"> (US: ${fmtNum(s.nationalMedianWage)}, {wagePremiumPct >= 0 ? "+" : ""}{Math.round(wagePremiumPct)}% local{wagePremiumPct >= 0 ? " premium" : " discount"})</span>
        ) : (
          <span className="cp-stat-meta"> (US dollars per year)</span>
        )}
      </>,
    },
    {
      label: "median wage yearly change",
      value: <>
        <strong>{s.wageChange >= 0 ? "+" : "-"}${fmtNum(Math.abs(s.wageChange))} per year</strong>
        <span className="cp-stat-meta"> ({fmtPct(s.wageChangePct, true)})</span>
      </>,
    },
    { label: "50% range", value: <><strong>${fmtNum(s.range50Low)} to ${fmtNum(s.range50High)}</strong></> },
    { label: "80% range", value: <><strong>${fmtNum(s.range80Low)} to ${fmtNum(s.range80High)}</strong> <span className="cp-stat-meta"> per year</span></> },
  ];
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
        ({s.dataYear || 2022} BLS OES — Riverside–San Bernardino–Ontario MSA, with national figures for comparison)
      </figcaption>
    </figure>
  );
};

const CpCareer = ({ careerId, saved, toggleSave, onBack, onOpenAid }) => {
  const career = window.CAREERS.byId(careerId);
  if (!career) return <main className="cp-main narrow"><button className="cp-back" onClick={onBack}>← Careers</button><p>Career not found.</p></main>;
  const progs = (career.programs || []).map(pid => window.PROGRAMS.get(pid)).filter(Boolean);
  const tierLabels = window.APP_META.tierLabels;
  return (
    <main className="cp-main narrow">
      <button className="cp-back" onClick={onBack}>← All careers</button>
      <div className="cp-detail-head">
        <h1 className="cp-h1">{career.name}</h1>
      </div>
      <div className="cp-detail-grid">
        <div>
          <div className="cp-detail-stats">
            <div><div className="cp-stat">${career.salary.median}K</div><div className="cp-stat-lbl">median pay, CA</div></div>
            <div><div className="cp-stat">{career.length}</div><div className="cp-stat-lbl">time</div></div>
            <div><div className="cp-stat">{career.demand}</div><div className="cp-stat-lbl">demand</div></div>
            <div><div className="cp-stat">{(career.grads2yr || '—').split(' ')[0]}</div><div className="cp-stat-lbl">grads employed</div></div>
          </div>

          {career.dolStats && <CpDolStats stats={career.dolStats} />}

          <h2 className="cp-h2">Programs</h2>
          <div className="cp-prog-list">
            {progs.map(p => (
              <div className={"cp-prog " + p.tier} key={p.id}>
                <div className="cp-prog-head">
                  <div>
                    <div className="cp-prog-tier">{tierLabels[p.tier]}</div>
                    <div className="cp-prog-name">{p.name}</div>
                    <div className="cp-prog-loc">{p.loc} · {p.duration}</div>
                  </div>
                  <div className="cp-prog-money">
                    <div className="cp-prog-sticker">was ${p.sticker.toLocaleString()}</div>
                    <div className="cp-prog-real">${p.realCost.toLocaleString()}<span>/yr after aid</span></div>
                  </div>
                </div>
                <div className="cp-prog-action">Next: {p.action}</div>
              </div>
            ))}
          </div>
        </div>

        <aside className="cp-aside">
          <button
            className={"cp-save-big " + (saved.includes(career.id) ? "on" : "")}
            onClick={() => toggleSave(career.id)}
            aria-pressed={saved.includes(career.id)}
          >
            {saved.includes(career.id) ? "✓ Saved to compare" : "+ Save this path"}
          </button>
          <div className="cp-aside-card">
            <div className="cp-aside-eyebrow">Grads 2 yrs out</div>
            <div className="cp-aside-body">{career.grads2yr}</div>
          </div>
          <div className="cp-aside-card">
            <div className="cp-aside-eyebrow">This week</div>
            <ol className="cp-aside-steps">
              <li>FAFSA / CADAA</li>
              <li>Chafee ETV app</li>
              <li>CCCApply or Cal State Apply</li>
              <li>Email Guardian Scholars</li>
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
  foster:    new Set(["chafee","pell","calgrant","ccpg","nextup","gs","jbay"]),
  agedout:   new Set(["chafee","pell","calgrant","ccpg","nextup","gs","jbay"]),
  adopted:   new Set(["chafee","pell","calgrant","ccpg","gs"]),
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

        <p className="cp-survey-priv">Your answers stay on this device — they're stored in your browser and never sent anywhere. Update them anytime from the cost calculator.</p>

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

const CpMoney = ({ onOpenAid, profile, setProfile }) => {
  const aid = window.APP_META.aid;
  const [school, setSchool] = React.useState("uc");
  const [living, setLiving] = React.useState("dorms");
  const [editing, setEditing] = React.useState(false);

  // Gate: until they fill out the survey, only show the survey.
  if (!profile || editing) {
    return <CpSurvey
      profile={editing ? profile : null}
      onComplete={(p) => { setProfile(p); setEditing(false); }}
      onCancel={editing ? () => setEditing(false) : null}
    />;
  }

  const stickers   = { cc: 1150, csu: 7400, uc: 14400, private: 65000 };
  const livingAdd  = { home: 0, ils: 2000, dorms: 16000, solo: 20000 };
  const sticker    = stickers[school] + livingAdd[living];
  const baseAid    = aidStackForProfile(profile, school);
  const chafeeBonus = (["foster","agedout"].includes(profile.status) && profile.age >= 14 && profile.age <= 23) ? 5000 : 0;
  const aidCovered = Math.min(sticker, baseAid + chafeeBonus);
  const gap        = Math.max(0, sticker - aidCovered);
  const eligibleAid = aid.filter(a => isAidEligible(a.id, profile));

  return (
    <main className="cp-main narrow">
      <h1 className="cp-h1">Cost Calculator.</h1>

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
      {eligibleAid.length < aid.length && (
        <p className="cp-calc-note cp-aid-note">{aid.length - eligibleAid.length} other aid source{aid.length - eligibleAid.length === 1 ? " is" : "s are"} foster-youth specific and not shown for your situation.</p>
      )}
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

const CpWeek = () => (
  <main className="cp-main narrow">
    <div className="cp-eyebrow">This week</div>
    <h1 className="cp-h1">Five things. About three hours.</h1>
    <p className="cp-lede">Every path in this guide branches from these five. Do them once.</p>
    {[
      ["FAFSA or CADAA", "Master key. Unlocks Pell, Cal Grant, CCPG, campus aid. Check 'unaccompanied youth' — skip parent info."],
      ["Chafee ETV", "$5K/yr. Twenty minutes."],
      ["CCCApply or Cal State Apply", "CCCApply for CC (free, all of them). Cal State Apply opens Oct 1."],
      ["Email Guardian Scholars / NextUp", "The biggest unlock. \"I'm a foster youth thinking about applying — what does your program offer?\""],
      ["Gather documents", "HS transcript, foster-care proof letter (social worker/ILP), SSN, photo ID. Digital copies on your phone."]
    ].map(([t, p], i) => (
      <div className="cp-week-row" key={i}>
        <div className="cp-week-n">{String(i + 1).padStart(2, "0")}</div>
        <div><h3>{t}</h3><p>{p}</p></div>
      </div>
    ))}
  </main>
);

const CpAbout = () => (
  <main className="cp-main narrow cp-about">
    <div className="cp-eyebrow">About</div>
    <h1 className="cp-h1">How this guide is built — and how to trust it.</h1>
    <p>Fostering Paths is an independent guide for current and former California foster youth in San Bernardino, Riverside, and Orange County. We exist because the existing systems — financial aid letters, college websites, well-meaning counselors — almost never give a straight, accurate answer to the only question that matters: <em>what will this actually cost me?</em></p>
    <p>Every dollar figure is verified against current state and federal sources. Every program is one we've spoken to directly. Quotes are from real foster youth who agreed to share their story. Nothing on this site is paid for by a campus or scholarship.</p>

    <h2 className="cp-h2">Where the numbers come from</h2>
    <div className="cp-about-meta">
      <div><strong>Cal Grant</strong>California Student Aid Commission, current cycle</div>
      <div><strong>Pell Grant</strong>U.S. Dept. of Education, 2025–26 schedule</div>
      <div><strong>Chafee ETV</strong>CSAC Chafee program, current annual maximum</div>
      <div><strong>Tuition stickers</strong>Each school's published 2025–26 cost of attendance</div>
      <div><strong>Salary medians</strong>BLS &amp; EDD California Occupational Employment Statistics</div>
      <div><strong>Verified</strong>April 2026 · v1.0</div>
    </div>

    <h2 className="cp-h2">If something is wrong, tell us</h2>
    <p>Numbers change. Programs change. If you spot an error, email <a href="mailto:corrections@example.org">corrections@example.org</a>. We update within 7 days and publish a changelog.</p>

    <h2 className="cp-h2">Who built this</h2>
    <p>A small team of foster-youth alumni, social workers, and former Guardian Scholars staff. Independently funded. No campus pays us. No scholarship pays us.</p>
  </main>
);

Object.assign(window, { CpCareer, CpMoney, CpAidDetail, CpWeek, CpAbout });
