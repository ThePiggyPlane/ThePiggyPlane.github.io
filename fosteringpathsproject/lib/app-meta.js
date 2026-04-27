// Static data: aid sources, deadlines, tier labels, helpers.
// Career-specific data lives in careers/*.js — this file is for things that
// don't change when you add a new career.

window.APP_META = {
  aid: [
    {
      id: "chafee",
      name: "Chafee ETV",
      amount: "$5,000/yr",
      desc: "Was in CA foster care any time after age 16. Renewable each year through age 26. Must enroll at least half-time.",
      eligibility: "In CA foster care any time after age 16. Continues to age 26.",
      apply: "https://chafee.csac.ca.gov/",
      gotchas: "Must enroll at least half-time. Reapply each year — set a calendar reminder.",
    },
    {
      id: "pell",
      name: "Pell Grant",
      amount: "$7,395/yr",
      desc: "Filed through FAFSA. Need-based: SAI calculation. Foster youth file as independent (parent income excluded). No GPA or age limits.",
      eligibility: "Federal aid based on income. Foster youth report 'unaccompanied youth' status, skipping parent income.",
      apply: "https://studentaid.gov/",
      gotchas: "Filed via FAFSA. Check the unaccompanied/foster checkbox — life-changing.",
    },
    {
      id: "calgrant",
      name: "Cal Grant B",
      amount: "$14,226/yr",
      desc: "CA resident attending a CA school. 2.0+ GPA verified by your high school. Income/asset caps apply. March 2 deadline (FAFSA + GPA Verification Form).",
      eligibility: "CA resident, 2.0+ GPA verified, attending CA school.",
      apply: "https://www.csac.ca.gov/cal-grants",
      gotchas: "GPA Verification Form due Mar 2 every year. Counselor or registrar submits.",
    },
    {
      id: "ccpg",
      name: "CCPG (Promise Grant)",
      amount: "$0 enrollment fees",
      desc: "CA resident enrolled at any CA community college. Income-eligible, OR self-certify foster / homeless / TANF / SSI / general assistance.",
      eligibility: "Any CA resident at a community college.",
      apply: "Auto-applied via FAFSA at CC.",
      gotchas: "Doesn't cover books or transport — pair with NextUp.",
    },
    {
      id: "nextup",
      name: "NextUp / EOPS",
      amount: "Books + bus + food",
      desc: "Foster youth ages 16–25, enrolled at a participating CA community college (~45 of 116 campuses). Must enroll in 9+ units. Apply through campus EOPS office.",
      eligibility: "Foster youth at participating CA community colleges.",
      apply: "Visit your CC's NextUp office in person.",
      gotchas: "Limited slots — apply the moment you enroll. Not at every CC.",
    },
    {
      id: "gs",
      name: "Guardian Scholars",
      amount: "Often full ride",
      desc: "Foster youth at a participating UC, CSU, or private campus. Each program runs differently — some require an essay/interview, all need verified foster history.",
      eligibility: "Foster youth at participating UC/CSU/private campuses.",
      apply: "Email the office at your dream campus before you apply.",
      gotchas: "Programs vary wildly. USC's covers 100% of need; some CSUs cover less.",
    },
    {
      id: "jbay",
      name: "JBAY Emergency Grant",
      amount: "up to $1,000",
      desc: "Foster youth ages 18–25, currently enrolled in college. One-time grant per emergency (laptop, rent, car repair, books). Apply when the need is urgent.",
      eligibility: "Currently-enrolled foster youth, ages 18–25.",
      apply: "https://jbaforyouth.org/emergency-grants/",
      gotchas: "Limited annual budget. Apply the moment a need arises.",
    },
  ],

  deadlines: [
    { label: "Cal Grant GPA Verification", date: "2026-03-02", urgency: "high" },
    { label: "FAFSA priority (CA)", date: "2026-03-02", urgency: "high" },
    { label: "Cal State Apply — Fall 2026", date: "2026-11-30", urgency: "med" },
    { label: "UC Application — Fall 2026", date: "2026-11-30", urgency: "med" },
    { label: "Chafee ETV renewal window", date: "2026-07-15", urgency: "med" },
    { label: "CCCApply Spring 2026", date: "2026-01-10", urgency: "low" },
  ],

  tierLabels: {
    cc: "Community College",
    csu: "CSU",
    uc: "UC",
    private: "Private",
    trade: "Trades / Apprenticeship",
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
