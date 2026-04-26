// Wizard, Wizard Result, Compare view.

const CpWizard = ({ onClose, onMatch }) => {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState({});

  const questions = [
    { key: "interest", q: "What pulls you in most?", opts: [
      ["helping", "Helping people directly"],
      ["building", "Building or fixing things with my hands"],
      ["numbers", "Numbers, patterns, problem-solving"],
      ["art", "Art, design, or creating"],
      ["words", "Writing or telling stories"],
      ["outdoors", "Being outdoors or moving around"],
    ]},
    { key: "speed", q: "How fast do you want to be earning real money?", opts: [
      ["fast", "ASAP — under 2 years"],
      ["mid", "2–4 years is fine"],
      ["long", "I'll go as long as it takes"],
    ]},
    { key: "school", q: "How do you feel about school right now?", opts: [
      ["love", "I like it. I'd go further if it pays off."],
      ["ok", "It's okay. I'll do what's needed."],
      ["done", "I'm done with classrooms — give me hands-on."],
    ]},
    { key: "stay", q: "Do you want to stay close to home?", opts: [
      ["close", "Yes — Inland Empire / OC only"],
      ["ca", "Anywhere in California is fine"],
      ["far", "Take me far away"],
    ]},
  ];

  const pick = (val) => {
    const next = { ...answers, [questions[step].key]: val };
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      onMatch(window.matchCareer(next));
    }
  };

  const cur = questions[step];
  return (
    <CpModal onClose={onClose} ariaLabel="Find your path quiz">
      <button className="cp-wiz-x" onClick={onClose}>Close</button>
      <div className="cp-wiz-prog" aria-hidden="true">
        {questions.map((_, i) => <span key={i} className={i <= step ? "on" : ""} />)}
      </div>
      <div className="cp-wiz-step">Question {step + 1} of {questions.length}</div>
      <h2 className="cp-wiz-q">{cur.q}</h2>
      <div className="cp-wiz-opts">
        {cur.opts.map(([v, l]) => (
          <button key={v} onClick={() => pick(v)}>{l}</button>
        ))}
      </div>
      {step > 0 && <button className="cp-wiz-back" onClick={() => setStep(step - 1)}>← Back</button>}
    </CpModal>
  );
};

const CpResult = ({ result, onOpen, onRetake, onBack }) => {
  if (!result) return null;
  const top = window.CAREERS.byId(result.topId);
  const alts = result.altIds.map(id => window.CAREERS.byId(id)).filter(Boolean);
  return (
    <main className="cp-main narrow">
      <button className="cp-back" onClick={onBack}>← Careers</button>
      <div className="cp-result-match">
        <div className="cp-result-eyebrow">Best match for your answers</div>
        <h1 className="cp-result-name">{top.name}</h1>
        <p className="cp-result-tag">{top.tagline}</p>
        <div className="cp-result-because">
          <strong>Why:</strong> {result.reasoning}
        </div>
        <div className="cp-result-actions">
          <button className="cp-btn" onClick={() => onOpen(top.id)}>See full path →</button>
          <button className="cp-btn-ghost" onClick={onRetake}>Retake quiz</button>
        </div>
      </div>
      {alts.length > 0 && (
        <>
          <div className="cp-sec-head"><h2>Also worth a look</h2></div>
          <div className="cp-alt-list">
            {alts.map(c => (
              <button className="cp-alt" key={c.id} onClick={() => onOpen(c.id)}>
                <div className="cp-alt-name">{c.name}</div>
                <div className="cp-alt-tag">{c.tagline}</div>
                <div className="cp-alt-meta"><span>${c.salary.median}K</span><span>{c.length}</span></div>
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
};

const CpCompare = ({ saved, toggleSave, onOpen, onBack }) => {
  const careers = saved.map(id => window.CAREERS.byId(id)).filter(Boolean);
  if (careers.length < 2) {
    return (
      <main className="cp-main narrow">
        <button className="cp-back" onClick={onBack}>← Careers</button>
        <div className="cp-eyebrow">Compare</div>
        <h1 className="cp-h1">Save 2 or more careers to compare them.</h1>
        <p className="cp-lede">Tap "+ Save" on any career row, then come back here. You'll see them side-by-side.</p>
      </main>
    );
  }
  return (
    <main className="cp-main">
      <button className="cp-back" onClick={onBack}>← Careers</button>
      <div className="cp-eyebrow">Compare</div>
      <h1 className="cp-h1">Your saved careers, side-by-side.</h1>
      <table className="cp-cmp-table">
        <thead>
          <tr>
            <th></th>
            {careers.map(c => (
              <th key={c.id}>
                <div className="cp-cmp-name">
                  <a href="#" onClick={(e) => { e.preventDefault(); onOpen(c.id); }}>{c.name}</a>
                  <button className="cp-cmp-rm" onClick={() => toggleSave(c.id)}>Remove</button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr><th>Median pay</th>{careers.map(c => <td key={c.id}>${c.salary.median}K/yr</td>)}</tr>
          <tr><th>Range</th>{careers.map(c => <td key={c.id}>${c.salary.low}K – ${c.salary.high}K</td>)}</tr>
          <tr><th>Time to start</th>{careers.map(c => <td key={c.id}>{c.length}</td>)}</tr>
          <tr><th>Demand</th>{careers.map(c => <td key={c.id}>{c.demand}</td>)}</tr>
          <tr><th>Grads 2 yrs out</th>{careers.map(c => <td key={c.id}>{c.grads2yr}</td>)}</tr>
          <tr><th>Programs</th>{careers.map(c => <td key={c.id}>{(c.programs || []).length} listed</td>)}</tr>
        </tbody>
      </table>
    </main>
  );
};

Object.assign(window, { CpWizard, CpResult, CpCompare });
