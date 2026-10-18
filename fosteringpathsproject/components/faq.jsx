// Questions youth actually ask, plus a glossary of the alphabet soup.
// Federal rules only unless marked California; state guides carry the rest.

const FAQ = [
  {
    q: "Do I have to put my parents on the FAFSA?",
    a: "No. If you were in foster care at any time at age 13 or older, were a dependent or ward of the court, or were an emancipated minor, you answer yes to that question and the form stops asking about parents. You are an independent student. Same for the California Dream Act Application (CADAA).",
  },
  {
    q: "What is a foster care verification letter and where do I get one?",
    a: "A letter from your child welfare agency (or in California, the Foster Care Ombudsperson at 1-877-846-1602) stating the dates you were in care. Colleges, ETV, Medicaid, housing programs, and tax credits all accept it. Ask for it once, keep a photo on your phone, and you will stop re-proving your history every semester.",
  },
  {
    q: "I left care at 17, or was adopted or put in guardianship. Do I still count?",
    a: "Often yes, but each program draws its own line. FAFSA counts foster care at 13 or later. ETV usually counts care at 14 or later, or adoption and guardianship after 16. Medicaid to 26 requires being in care at 18. Tuition waivers vary the most. Read the eligibility line on each item on this site; it is written for exactly this question.",
  },
  {
    q: "Can I keep my Medicaid if I move to another state?",
    a: "Usually. If you turned 18 in foster care on or after January 1, 2023, every state must cover you until 26, even if you aged out somewhere else. If you aged out before 2023, the state you were in care in covers you to 26 and other states may choose to. Apply in the new state and name the former foster youth group. California calls it Medi-Cal for Former Foster Youth (aid code 4M).",
  },
  {
    q: "Is a for-profit school a bad idea?",
    a: "Not always, but check three numbers first: the net price for low-income students, the graduation rate, and what graduates actually earn (all shown on program cards here when the school reports them). Cosmetology, barber, and some trade certificates are mostly offered by for-profit schools and can be fine. A for-profit bachelor's degree that costs $30,000 a year with a 25% graduation rate is a trap. Public community colleges offer most of the same certificates for a fraction of the cost.",
  },
  {
    q: "Can I get the Chafee ETV voucher for a trade program or a certificate?",
    a: "Yes. ETV covers any school eligible for federal aid: community college certificates, trade schools, apprenticeship-related classes, and four-year degrees. It can pay for tuition, housing, books, a laptop, or transportation.",
  },
  {
    q: "What if I'm undocumented?",
    a: "You cannot file the FAFSA or get federal aid, but you may qualify for state aid. California uses the Dream Act Application (CADAA) for Cal Grant, the Chafee Grant, and campus aid. Other states have their own rules; the state guide names the application. Campus foster youth programs usually help regardless of status.",
  },
  {
    q: "I'm 24 and never went to college. Is it too late for any of this?",
    a: "No. ETV runs to 26 in most states (you must start before 26 in many). Medicaid runs to 26. Pell has no age limit. Campus programs usually accept students who first enroll before 26, and keep them after. Some tuition waivers have deadlines (apply before 25 in Texas, for example), so check your state guide this week rather than next year.",
  },
  {
    q: "How do I prove I was in foster care in another state?",
    a: "Contact the child welfare agency of the state you were in care in and ask for a verification letter or your placement history. Most states have an alumni or records request process. FosterClub's state pages list the contacts. Keep the letter; California programs like NextUp and Medi-Cal to 26 accept out-of-state care.",
  },
  {
    q: "Do I have to pay the money back?",
    a: "Grants, vouchers, waivers, and scholarships do not get paid back. Loans do. Everything on this site is grant or waiver money unless it says loan. If an aid letter includes loans, you can decline them and keep the grants.",
  },
  {
    q: "Who do I call when my caseworker will not call back?",
    a: "Your state has a foster care ombudsperson or youth complaint line; in California it is 1-877-846-1602. Your dependency attorney still represents you while you are in care, including extended foster care. Campus foster youth programs and CASA volunteers can also push on your behalf.",
  },
  {
    q: "Where does the data on this site come from?",
    a: "Programs come from each school's federal reporting (IPEDS), earnings from the College Scorecard, job descriptions from O*NET, and every resource, scholarship, and state rule from the agency's or organization's own page, with the month it was checked. See About for the full list and how to report a mistake.",
  },
];

const GLOSSARY = [
  ["AB 12 / Extended Foster Care", "California's law letting youth stay in foster care to 21. Most states have a similar option under the federal Fostering Connections Act."],
  ["Aging out", "Leaving foster care because of your age, usually 18 or 21, rather than reunifying or being adopted."],
  ["CADAA", "California Dream Act Application: the state aid form for students who cannot file the FAFSA."],
  ["Cal Grant", "California's main state grant. Foster youth get extra time, a higher access award, and can qualify to age 26."],
  ["CASA / GAL", "Court Appointed Special Advocate or Guardian ad Litem: a trained volunteer or attorney assigned to speak for you in dependency court."],
  ["Chafee / ETV", "The federal John H. Chafee program; its Education and Training Voucher pays up to $5,000 a year for school. Each state runs it under its own name (California calls it the Chafee Grant)."],
  ["CCPG", "California College Promise Grant: waives community college enrollment fees."],
  ["Dependency court", "The court that handles foster care cases. Your attorney there is your dependency attorney."],
  ["EFC / NMD", "Extended Foster Care; a Non-Minor Dependent is a youth 18 to 21 who stays in care."],
  ["EOPS", "Extended Opportunity Programs and Services at California community colleges; NextUp usually lives inside it."],
  ["FAFSA", "Free Application for Federal Student Aid. Unlocks Pell, work-study, and most state and campus aid."],
  ["FYI voucher", "Foster Youth to Independence: a federal housing voucher for youth 18 to 24 leaving foster care, 36 months plus a possible 24 more."],
  ["FYSCP", "Foster Youth Services Coordinating Program: the foster youth education office at each California county office of education."],
  ["Guardian Scholars", "The most common name for a campus program for students from foster care. Also called Renaissance Scholars, Fostering Success, Hope Scholars, and others."],
  ["ILP", "Independent Living Program: county or state classes, stipends, and help for youth 16 to 21 who were in care."],
  ["McKinney-Vento", "The federal law that gives homeless students (including many youth leaving care) school enrollment rights and a liaison at every school district."],
  ["Medicaid to 26 / Medi-Cal 4M", "Free health coverage until 26 for youth who were in foster care at 18, no income test, now in every state."],
  ["NextUp", "California's community college program for foster youth: priority registration, books, food, emergency grants."],
  ["Pell Grant", "The main federal grant, up to $7,395 a year, based on the FAFSA."],
  ["SILP", "Supervised Independent Living Placement: living on your own while still in extended foster care and receiving the payment directly (California)."],
  ["THP-Plus / THP-NMD", "California transitional housing programs: THP-NMD while in extended care (18 to 21), THP-Plus after care (18 to 24)."],
  ["TILP", "Transitional Independent Living Plan: the written plan you and your worker make for life after care."],
  ["Tuition waiver", "A state law that cancels tuition and fees at public colleges for youth who were in foster care. About 35 states have one."],
];

const CpFaq = ({ go }) => {
  const [open, setOpen] = React.useState(null);
  const [q, setQ] = React.useState("");
  const needle = q.trim().toLowerCase();
  const faqs = FAQ.filter(f => !needle || (f.q + " " + f.a).toLowerCase().includes(needle));
  const terms = GLOSSARY.filter(([t, d]) => !needle || (t + " " + d).toLowerCase().includes(needle));
  return (
    <main className="cp-main narrow">
      <div className="cp-eyebrow">Questions</div>
      <h1 className="cp-h1">Questions youth actually ask</h1>
      <p className="cp-lede">Plain answers to the things that trip people up, and a glossary for the alphabet soup caseworkers use. For state-specific rules, see <button className="cp-link" onClick={() => go("state")}>your state guide</button>.</p>
      <input className="cp-search cp-faq-search" type="search" placeholder="Search questions and terms…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search questions" />
      <div className="cp-faq-list">
        {faqs.map((f, i) => (
          <details key={i} className="cp-app" open={open === i || !!needle} onToggle={(e) => { if (e.target.open) setOpen(i); }}>
            <summary><div className="cp-app-summary"><div className="cp-app-occ">{f.q}</div></div></summary>
            <div className="cp-app-detail"><p className="cp-faq-a">{f.a}</p></div>
          </details>
        ))}
        {faqs.length === 0 && <p className="cp-filter-meta">No question matches that; try the glossary below or the state guide.</p>}
      </div>
      <h2 className="cp-h2">Glossary</h2>
      <dl className="cp-gloss">
        {terms.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
      </dl>
    </main>
  );
};

Object.assign(window, { CpFaq });
