// "Start here": what foster youth get in every state, in one page.
// Federal rules only; the state guide covers what changes by state.

const START_ITEMS = [
  {
    title: "You file the FAFSA as an independent student",
    body: "If you were in foster care at any time at age 13 or older, were a ward of the court, or were an emancipated minor, you answer yes to the foster care question and leave parent income off the form. That alone unlocks a Pell Grant (up to $7,395 a year) and most campus aid.",
    link: { label: "FAFSA", href: "https://studentaid.gov/h/apply-for-aid/fafsa" },
  },
  {
    title: "Every state has an ETV (Chafee) voucher",
    body: "Up to $5,000 a year for college or training if you were in foster care as a teen (rules vary a little by state, usually in care at 14 or later, or adopted or in guardianship after 16). It pays for tuition, housing, books, a laptop, or transportation. Apply through your state's child welfare agency or its ETV contractor; the state guide has the link.",
    go: { label: "Your state's ETV", view: "state" },
  },
  {
    title: "Free health coverage to 26",
    body: "If you were in foster care at 18 (or older, in states with extended care) and on Medicaid, you can stay on Medicaid until you turn 26, with no income test, in any state you move to. Ask the state Medicaid office for the former foster youth group.",
    go: { label: "How your state enrolls you", view: "state" },
  },
  {
    title: "You can usually stay in care to 21",
    body: "Most states let you stay in foster care, or come back into it, until 21 if you are in school, working, or in a program. That means a place to live, a monthly payment, and a caseworker while you start college or a trade. Ask your caseworker about extended foster care before your 18th birthday.",
    go: { label: "Your state's rules", view: "state" },
  },
  {
    title: "Many states waive tuition at public colleges",
    body: "About 35 states waive tuition and fees at public colleges for youth who were in foster care. Texas, Florida, Washington, Oregon, Arizona and others cover tuition entirely. California does it through grants that add up to the same thing at most public campuses. Check your state guide; this is the single biggest dollar amount on this site.",
    go: { label: "Does my state waive tuition?", view: "state" },
  },
  {
    title: "Campus programs are built for you",
    body: "Most public colleges have a program for students from foster care (Guardian Scholars, NextUp, Fostering Success, Renaissance Scholars, and other names). They hold grants, priority registration, housing over breaks, laptops, and a person who knows the paperwork. Email them before you enroll.",
    go: { label: "Find campus programs", view: "resources" },
  },
  {
    title: "A housing voucher exists just for you",
    body: "Foster Youth to Independence (FYI) vouchers pay most of your rent for 36 months (extendable to 60) if you are 18 to 24 and leaving or recently left foster care. Your child welfare agency refers you to the housing authority. Ask for it by name.",
    go: { label: "Housing help near you", view: "resources" },
  },
  {
    title: "Money you may not know you have",
    body: "Some states deposit money in accounts for foster youth (California's CalKIDS and HOPE accounts, for example). Many offer a state tax credit for former foster youth. Scholarships from Foster Care to Success, Foster Love, and local foundations stack on top of everything above.",
    go: { label: "Scholarships for your state", view: "scholarships" },
  },
];

const CpStart = ({ go }) => {
  const { loc } = useFpLocation();
  const stateName = window.stateName(loc.state);
  return (
    <main className="cp-main narrow">
      <div className="cp-eyebrow">Start here</div>
      <h1 className="cp-h1">What foster youth get, in every state</h1>
      <p className="cp-lede">Eight things that are true for you no matter where you live. The <button className="cp-link" onClick={() => go("state")}>{stateName} guide</button> has the details and links for your state.</p>
      {START_ITEMS.map((it, i) => (
        <div className="cp-week-row" key={i}>
          <div className="cp-week-n">{String(i + 1).padStart(2, "0")}</div>
          <div>
            <h3>{it.title}</h3>
            <p>{it.body}</p>
            <div className="cp-step-links">
              {it.link && <a className="cp-step-link" href={it.link.href} target="_blank" rel="noopener">{it.link.label} →</a>}
              {it.go && <button className="cp-step-link cp-link" onClick={() => go(it.go.view)}>{it.go.label} →</button>}
            </div>
          </div>
        </div>
      ))}
      <p className="cp-app-more"><button className="cp-link" onClick={() => go("faq")}>Questions youth actually ask, and a glossary →</button></p>
      <div className="cp-callout">
        <strong>Two documents to get now:</strong> a foster care verification letter from your caseworker or state ombudsperson, and your Social Security card. Schools, ETV, Medicaid, and housing all ask for them. Keep photos on your phone.
      </div>
    </main>
  );
};

Object.assign(window, { CpStart });
