# State fact sheet research prompt

Used with the Advanced Research tool, one state per run. Replace `{STATE}` and
`{ST}`. The report must begin with the JSON block so tools/import_state_json.py
can build the data files even if the narrative is cut off.

---

Build a verified fact sheet for current and former foster youth in {STATE} ({ST}) who want to go to college, a trade program, or an apprenticeship. Audience: a 17 to 25 year old reading on a phone. Use only official or primary sources: the state child welfare agency, the state higher education or student aid agency, the state Medicaid agency, statutes, public colleges' own pages, and established nonprofits (FosterClub, Foster Care to Success, Juvenile Law Center, John Burton Advocates for Youth, Casey Family Programs, iFoster, local foster youth organizations). Every fact needs a URL you actually opened. Never guess a phone number, dollar amount, or deadline; leave the field empty instead. No em dashes anywhere. Plain words a youth would use.

Cover:
1. The state child welfare agency (name, main url, foster care ombudsman or youth complaint line with phone).
2. Extended foster care: to what age, conditions, how to re-enter after leaving, the name of the program.
3. Tuition waiver or exemption at public colleges: whether one exists, statute or program name, exactly who qualifies (age at which the youth had to be in care, adoption or guardianship rules), age or time limits, whether it covers fees and housing, how to claim it.
4. ETV (Chafee Education and Training Voucher): who administers it in this state, yearly maximum, age limits, application url and deadline.
5. Medicaid for former foster youth to 26: the state program name and how to enroll.
6. Independent living / transition program: name, ages, what it gives (stipends, classes, housing help), how to get a referral.
7. State financial aid programs that foster youth can stack (state grants, special foster youth scholarships, fee waivers for applications), with amounts and deadlines.
8. Housing programs for youth leaving care (transitional housing, FYI vouchers, host homes) statewide and in the largest metro areas.
9. Campus foster youth support programs: list every public university and community college program you can verify with its name, campus, url, phone or email, and what it provides. Name the program at each of the ten largest public campuses at minimum.
10. Key organizations: legal aid for foster youth, CASA, youth advisory boards, alumni networks, mentoring, emergency funds, laptop programs.
11. Scholarships specifically for foster youth in this state (statewide and regional foundations), with amounts, deadlines, eligibility, urls.
12. The college application system (names and urls) and any application fee waiver for foster youth.
13. Anything a youth moving into or out of {STATE} should know (whether out-of-state foster care counts for the waiver, ETV, campus programs).

Output format. Start the report with a single fenced ```json block containing exactly this object, then the narrative with sources after it:

{
  "guide": { "state": "{ST}", "name": "{STATE}", "agency": {"name": "", "url": "", "phone": ""},
    "extendedFosterCare": {"toAge": 21, "notes": "", "url": ""},
    "tuitionWaiver": {"exists": true, "name": "", "covers": "", "eligibility": "", "ageLimit": "", "url": ""},
    "etv": {"admin": "", "maxAmount": "", "ages": "", "url": "", "deadline": ""},
    "medicaidTo26": {"exists": true, "name": "", "url": "", "how": ""},
    "ilp": {"name": "", "ages": "", "url": "", "how": ""},
    "collegeApps": [{"name": "", "url": "", "feeWaiver": ""}],
    "stateAid": [{"id": "{st}-...", "name": "", "amount": "", "desc": "", "eligibility": "", "apply": "", "gotchas": ""}],
    "firstWeek": [{"title": "", "body": "", "url": ""}],
    "keyOrgs": [{"name": "", "url": "", "what": ""}],
    "notes": "", "verified": "YYYY-MM" },
  "scholarships": [ {"id": "{st}-...", "name": "", "provider": "", "type": "etv|waiver|scholarship|emergency|grant|loan-forgiveness", "scope": "state|regional|campus", "state": "{ST}", "amount": "", "eligibility": "", "ages": "", "deadline": "", "renewable": true, "url": "", "howToApply": "", "notes": "", "tags": [], "verified": "YYYY-MM"} ],
  "resources": [ {"id": "{st}-...", "name": "", "org": "", "category": "campus|ilp|housing|health|legal|mentoring|emergency|employment|education|lgbtq|advocacy|agency|other", "state": "{ST}", "county": "", "city": "", "address": "", "url": "", "phone": "", "email": "", "serves": "", "ages": "", "provides": "", "howToStart": "", "notes": "", "tags": [], "verified": "YYYY-MM", "source": ""} ]
}

Rules for the JSON: ids are lower-kebab-case and start with "{st}-"; "verified" is the month you checked the source, like "2026-10"; include as many resources and scholarships as you verified (aim for 30 or more resources, 8 or more scholarships); leave a field as an empty string rather than guessing; every resource needs url, serves, provides; every scholarship needs amount, eligibility, url. Then write the narrative fact sheet with a Sources list of every URL used.
