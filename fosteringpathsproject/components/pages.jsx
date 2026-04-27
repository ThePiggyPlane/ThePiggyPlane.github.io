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
  const rows = [
    { label: "people employed",        value: <><strong>{fmtNum(s.employed)} people</strong></> },
    { label: "yearly change",          value: <><strong>{fmtSigned(s.yearlyChange)} people</strong> <span className="cp-stat-meta">({fmtPct(s.yearlyChangePct, true)})</span></> },
    { label: "workforce fraction",     value: <><strong>{fmtPct(s.fractionPct)}</strong> <span className="cp-stat-meta">(1 in {fmtNum(s.oneInN)})</span> <span className="cp-stat-meta">({s.vsNational}× national average)</span></> },
    { label: "median wage",            value: <><strong>${fmtNum(s.medianWage)} per year</strong> <span className="cp-stat-meta">(US dollars per year)</span></> },
    { label: "median wage yearly change", value: <><strong>{s.wageChange >= 0 ? "+" : "-"}${fmtNum(Math.abs(s.wageChange))} per year</strong> <span className="cp-stat-meta">(US dollars per year)</span> <span className="cp-stat-meta">({fmtPct(s.wageChangePct, true)})</span></> },
    { label: "50% range",              value: <><strong>${fmtNum(s.range50Low)} to ${fmtNum(s.range50High)}</strong></> },
    { label: "80% range",              value: <><strong>${fmtNum(s.range80Low)} to ${fmtNum(s.range80High)}</strong> <span className="cp-stat-meta">per year</span></> },
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
        ({s.dataYear || 2022} BLS data — Riverside–San Bernardino–Ontario MSA)
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
        <p className="cp-lede">{career.tagline}</p>
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
                    <div className="cp-prog-real">${p.realCost}<span>/yr for you</span></div>
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

const CpMoney = ({ onOpenAid }) => {
  const aid = window.APP_META.aid;
  const [school, setSchool] = React.useState("uc");
  const [living, setLiving] = React.useState("dorms");
  const stickers = { cc: 1150, csu: 7400, uc: 14400, private: 65000 };
  const livingAdd = { home: 0, ils: 2000, dorms: 16000, solo: 20000 };
  const aidTotal = { cc: 12000, csu: 26000, uc: 27000, private: 65000 };
  const sticker = stickers[school] + livingAdd[living];
  const aidCovered = Math.min(sticker, aidTotal[school] + 5000);
  const gap = Math.max(0, sticker - aidCovered);

  return (
    <main className="cp-main narrow">
      <div className="cp-eyebrow">Real cost calculator</div>
      <h1 className="cp-h1">What this will actually cost you.</h1>
      <p className="cp-lede">Pick a school type and living situation. We'll stack the aid most foster youth qualify for.</p>

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
          <p className="cp-calc-note">{gap === 0 ? "Your stack covers everything. Any surplus goes to rent, food, books, savings." : "Gap typically closed by JBAY emergency grants, campus Guardian Scholars funds, or work-study."}</p>
        </div>
      </div>

      <h2 className="cp-h2">Seven aid sources</h2>
      <div className="cp-aid-grid">
        {aid.map(a => (
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
    <p>Clear Path is an independent guide for current and former California foster youth in San Bernardino, Riverside, and Orange County. We exist because the existing systems — financial aid letters, college websites, well-meaning counselors — almost never give a straight, accurate answer to the only question that matters: <em>what will this actually cost me?</em></p>
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
