// Static data: aid sources, deadlines, tier labels, helpers.
// Career-specific data lives in careers/*.js — this file is for things that
// don't change when you add a new career.

window.APP_META = {
  aid: [
    {
      id: "chafee",
      name: "Chafee Grant (ETV)",
      amount: "$4,500/yr",
      desc: "Was in CA foster care at least one day between 16 and 18. Under 26 on July 1. Enrolled at least half time. Up to 5 years. The 2026-27 award is $4,500 (program maximum $5,000).",
      eligibility: "In foster care between ages 16 and 18. Under 26 on July 1 of the award year. Half time or more.",
      apply: "https://www.csac.ca.gov/chafee",
      gotchas: "One-time application, but first come, first served: file it the same week as your FAFSA or CADAA.",
    },
    {
      id: "pell",
      name: "Pell Grant",
      amount: "$7,395/yr",
      desc: "Filed through FAFSA. Need-based. Foster youth file as independent students (parent income excluded). No GPA or age limits.",
      eligibility: "Federal aid based on income. Foster youth answer yes to the foster care question and skip parent income.",
      apply: "https://studentaid.gov/",
      gotchas: "Filed via FAFSA. Check the foster care box. It changes everything.",
    },
    {
      id: "calgrant",
      name: "Cal Grant B + Foster Youth Access Award",
      amount: "Tuition + up to $6,000/yr",
      desc: "Pays tuition at UC ($15,588), CSU ($6,838) or private nonprofit colleges ($9,358) for 2026-27, plus a living-cost access award of up to $6,000 for foster youth. Eligible to age 26, renewable up to 8 years. 2.0+ GPA for Cal Grant B.",
      eligibility: "Dependency established or continued by a court at 13 or later; under 26; 2.0+ GPA; attending a CA school.",
      apply: "https://www.csac.ca.gov/foster-youth",
      gotchas: "March 2 deadline (September 2 for community college). Your GPA must be on file at CSAC; check WebGrants.",
    },
    {
      id: "mcs",
      name: "Middle Class Scholarship (foster youth)",
      amount: "100% of remaining cost",
      desc: "At UC, CSU, or a community college bachelor's program, covers everything left after other gift aid and a self-help amount, for up to four years. No age cap.",
      eligibility: "In foster care at 13 or older; at least half time at UC, CSU, or a CCC bachelor's program.",
      apply: "https://csac.ca.gov/mcs/foster-youth",
      gotchas: "Verified automatically through FAFSA or CADAA. File by March 2.",
    },
    {
      id: "ccpg",
      name: "CCPG (Promise Grant)",
      amount: "$0 enrollment fees",
      desc: "CA resident enrolled at any CA community college. Foster youth answer yes to the foster care question and are treated as independent students; the waiver cannot be lost for academic probation.",
      eligibility: "Any CA resident at a community college who meets the income rules.",
      apply: "Apply via CCCApply or FAFSA/CADAA.",
      gotchas: "Covers fees only, not books or transport. Pair with NextUp.",
    },
    {
      id: "nextup",
      name: "NextUp / EOPS",
      amount: "Books + bus + food",
      desc: "Foster youth who were in care at 13 or later, enrolled in 9+ units (or on a plan toward it), first enrolling before 26. Now at all 115 CA community colleges. Apply through the campus EOPS or NextUp office.",
      eligibility: "Foster youth at any CA community college.",
      apply: "Visit your college's NextUp or EOPS office in person.",
      gotchas: "Limited slots. Apply the week you enroll.",
    },
    {
      id: "gs",
      name: "Guardian Scholars",
      amount: "Often full ride",
      desc: "Foster youth at a participating UC, CSU, or private campus. Each program runs differently; some require an essay or interview, all need verified foster history. CSU also waives tuition and the application fee for qualifying foster youth.",
      eligibility: "Foster youth at participating UC/CSU/private campuses.",
      apply: "Email the office at your target campus before you apply.",
      gotchas: "Programs vary a lot. Ask about year-round housing and grants.",
    },
    {
      id: "jbay",
      name: "JBAY Burton Fund",
      amount: "Emergency help",
      desc: "Foster youth ages 16 to 26. Urgent needs (laptop, rent, car repair, books) paid through a partner agency such as your campus program, THP provider, or ILP. No set maximum.",
      eligibility: "Ages 16 to 26 who were in foster care or experienced homelessness.",
      apply: "https://jbay.org/new-fund/",
      gotchas: "Requests go through a partner agency, not directly. Ask your case manager.",
    },
  ],

  deadlines: [
    { label: "Cal State Apply priority deadline (Fall 2027)", date: "2026-11-30", urgency: "high" },
    { label: "UC Application deadline (Fall 2027)", date: "2026-11-30", urgency: "high" },
    { label: "Cal Grant GPA Verification + FAFSA/CADAA priority", date: "2027-03-02", urgency: "high" },
    { label: "Middle Class Scholarship priority (FAFSA/CADAA)", date: "2027-03-02", urgency: "med" },
    { label: "Cal Grant deadline for community college students", date: "2027-09-02", urgency: "med" },
    { label: "FAFSA / CADAA opens for 2027-28", date: "2026-10-01", urgency: "low" },
  ],

  tierLabels: {
    cc: "Community College",
    csu: "CSU",
    uc: "UC",
    public4: "Public University",
    private: "Private",
    trade: "Trades / Apprenticeship",
    support: "Support program",
  },

  interests: [
    { id: "design", label: "Designing things" },
    { id: "building", label: "Building things" },
    { id: "helping", label: "Helping people" },
    { id: "words", label: "Words & stories" },
    { id: "numbers", label: "Numbers & systems" },
    { id: "art", label: "Art & visuals" },
    { id: "tech", label: "Computers & code" },
    { id: "outdoors", label: "Outdoors & hands-on" },
    { id: "science", label: "Science & research" },
  ],
};

// Helpers
window.daysUntil = function (dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return Math.round((d - now) / 86400000);
};

window.cpStorage = {
  get: (key, fallback) => {
    try {
      const v = localStorage.getItem("cp:" + key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  },
  set: (key, val) => {
    try { localStorage.setItem("cp:" + key, JSON.stringify(val)); } catch (e) {}
  },
};
