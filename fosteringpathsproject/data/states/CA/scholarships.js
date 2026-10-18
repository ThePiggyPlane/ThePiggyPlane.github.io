// California scholarships, grants, waivers, emergency funds, and state benefits
// for current and former foster youth. See AGENTS.md for the schema.
// Every record was checked on its live page in October 2026.
window.registerScholarships([
  {
    id: "ca-chafee-grant",
    name: "California Chafee Grant for Foster Youth",
    provider: "California Student Aid Commission (CSAC) with the California Department of Social Services",
    type: "etv",
    scope: "state",
    state: "CA",
    amount: "Up to $5,000 per year ($2,500 per semester or $1,667 per quarter). For 2026-27 the state set awards at up to $4,500 per year ($2,250 per semester or $1,500 per quarter) so more students can be paid.",
    eligibility: "Current or former foster youth who was a dependent or ward of the court and lived in out-of-home foster care for at least one day between ages 16 and 18. Youth placed by a tribe count too. You must be under 26 on July 1 of the award year. Enrolled at least half time at an eligible college, university, or career or technical school in a program at least four months long. Schools in other states can qualify. Must keep Satisfactory Academic Progress. Youth who were only in adoption, Kin-GAP, or non-related guardianship do not qualify unless they were in foster care at some point between 16 and 18.",
    ages: "under 26",
    deadline: "Application opens October 1 and closes July 31 of the award year. Apply early: money is first come, first served and runs out.",
    renewable: true,
    url: "https://www.csac.ca.gov/chafee",
    howToApply: "1. File the FAFSA or California Dream Act Application (CADAA) for the school year. 2. Submit the one-time Chafee Grant application at mygrantinfo.csac.ca.gov/fosteryouthapplication. 3. Check your WebGrants 4 Students account. If your CDSS record says Incomplete, give a Foster Care Verification Form to your county ILP (Independent Living Program) coordinator. 4. Once awarded, your school certifies your enrollment and requests payment. Claim an award within 30 days or it goes back into the pool. To renew, just file a new FAFSA or CADAA each year; you do not redo the Chafee application.",
    notes: "You can get Chafee for up to five years (they do not have to be in a row) or until you turn 26, whichever comes first. Paid renewal students under 25 get first priority; brand new applicants are last, so apply the first year you can. Questions: chafee@csac.ca.gov or (888) 224-7268.",
    tags: ["etv", "chafee", "fafsa", "cadaa"],
    verified: "2026-10"
  },
  {
    id: "ca-cal-grant-foster-youth",
    name: "Cal Grant (A, B, or C) with the Foster Youth Access Award",
    provider: "California Student Aid Commission (CSAC)",
    type: "grant",
    scope: "state",
    state: "CA",
    amount: "Cal Grant A or B pays full tuition and fees at a UC (up to $15,588 in 2026-27) or CSU (up to $6,838), or a set amount at eligible private colleges. Cal Grant B also pays an access award for living costs, raised to up to $6,000 a year for foster youth (the standard amount is $1,648). Cal Grant C pays up to $4,000 for books and supplies for foster youth in career or technical programs.",
    eligibility: "California resident (or AB 540 student) working on a first undergraduate degree or certificate, enrolled at least half time at a Cal Grant eligible school, within income and asset limits, and making Satisfactory Academic Progress. For the foster youth provisions you must have been a dependent or ward of the court living in out-of-home foster care at any time since age 13, verified automatically by the California Department of Social Services (CDSS), and be under 26 on July 1 of the award year. You need a high school GPA, college GPA, or a test score (SAT, ACT, GED, TASC, HiSET) on file with CSAC; Cal Grant C does not need a GPA.",
    ages: "under 26 for the foster youth provisions",
    deadline: "March 2 if you will attend a UC, CSU, private college, or a bachelor's program at a community college. September 2 if you will attend a California Community College or a career or technical program. Foster youth at a community college can apply for the High School Entitlement award by September 2 instead of March 2.",
    renewable: true,
    url: "https://www.csac.ca.gov/cal-grant/access",
    howToApply: "File the FAFSA (studentaid.gov) or California Dream Act Application (dream.csac.ca.gov) every year and answer yes to the question about being in foster care, a dependent or ward of the court, or an orphan at any time since you turned 13. You do not report parent or foster parent income. Make sure your school sends your GPA to CSAC. About a week after filing, create a WebGrants 4 Students account at mygrantinfo.csac.ca.gov to check your award. No separate application is needed for the Foster Youth Access Award.",
    notes: "Foster youth get 8 years of Cal Grant eligibility instead of 4 (or until you earn a bachelor's degree), and the High School Entitlement window stays open until you are 26 instead of one year after high school, as long as a high school GPA is on file by the deadline. If you also have dependent children, CSAC picks the Foster Youth Access Award for you automatically. Amounts above are the 2026-27 maximums for full time enrollment and depend on your need and the state budget. Help: (888) 224-7268 or studentsupport@csac.ca.gov.",
    tags: ["cal-grant", "tuition", "fafsa", "cadaa", "living-costs"],
    verified: "2026-10"
  }
]);
