#!/usr/bin/env node
// Validates every data file under fosteringpathsproject/data against AGENTS.md.
// Usage:  node tools/validate.js            (all files)
//         node tools/validate.js path/to/file.js [more files]   (subset; still checks ids across the subset)
// Exit code 1 on any error. Warnings do not fail the run.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");

const STATES = new Set(("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR GU VI AS MP US").split(" "));
const RESOURCE_CATS = new Set(["campus","ilp","housing","health","legal","mentoring","emergency","employment","education","lgbtq","advocacy","agency","other"]);
const SCHOL_TYPES = new Set(["etv","waiver","scholarship","emergency","grant","loan-forgiveness"]);
const SCHOL_SCOPES = new Set(["national","state","regional","campus"]);
const TIERS = new Set(["cc","csu","uc","private","public4","trade"]);
const CA_REGIONS = new Set(["Inland Empire","Orange County","Los Angeles","San Diego","Central Coast","Central Valley","Bay Area","Sacramento","North State","Sierra","Imperial"]);

const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`${path.relative(ROOT, f)}: ${m}`);
const warn = (f, m) => warnings.push(`${path.relative(ROOT, f)}: ${m}`);

// ---------- collect files ----------
const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && p.endsWith(".js")) out.push(p);
  }
  return out;
};
const argFiles = process.argv.slice(2).map(f => path.resolve(f));
const files = argFiles.length ? argFiles : walk(DATA);

// ---------- career ids ----------
const careerIds = new Set();
for (const f of walk(path.join(DATA, "careers"))) {
  const m = fs.readFileSync(f, "utf8").match(/id:\s*"([^"]+)"/);
  if (m) careerIds.add(m[1]);
}

// ---------- load each file in a sandbox ----------
const allIds = new Map(); // id -> file
const counts = { programs: 0, resources: 0, scholarships: 0, guides: 0, apprenticeships: 0, careers: 0 };
const isUrl = (u) => typeof u === "string" && /^https?:\/\/[^\s"']+$/i.test(u);
const isVerified = (v) => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const takeId = (f, id, kind) => {
  if (typeof id !== "string" || !id) return err(f, `${kind} record missing id`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) err(f, `${kind} id "${id}" must be lower-case kebab-case ASCII`);
  if (allIds.has(id)) err(f, `duplicate id "${id}" (also in ${path.relative(ROOT, allIds.get(id))})`);
  else allIds.set(id, f);
};
const latOk = (v) => typeof v === "number" && v >= 17 && v <= 72;   // covers PR/HI/AK
const lngOk = (v) => typeof v === "number" && v >= -180 && v <= -64;

const checkResource = (f, r) => {
  counts.resources++;
  takeId(f, r.id, "resource");
  const id = r.id || "?";
  for (const k of ["name","org","category","state","url","serves","provides","verified"]) {
    if (r[k] == null || r[k] === "") err(f, `resource ${id}: missing ${k}`);
  }
  if (r.category && !RESOURCE_CATS.has(r.category)) err(f, `resource ${id}: bad category "${r.category}"`);
  if (r.state && !STATES.has(r.state)) err(f, `resource ${id}: bad state "${r.state}"`);
  if (r.url && !isUrl(r.url)) err(f, `resource ${id}: url not http(s): ${r.url}`);
  if (r.verified && !isVerified(r.verified)) err(f, `resource ${id}: verified must be "YYYY-MM"`);
  if (r.lat != null || r.lng != null) {
    if (!latOk(r.lat) || !lngOk(r.lng)) err(f, `resource ${id}: lat/lng out of range (${r.lat}, ${r.lng})`);
  }
  if (r.state && r.state !== "US" && r.id && !r.id.startsWith(r.state.toLowerCase() + "-")) warn(f, `resource ${id}: id should start with "${r.state.toLowerCase()}-"`);
  if (r.state === "US" && r.id && !r.id.startsWith("nat-")) warn(f, `resource ${id}: national id should start with "nat-"`);
  if (r.phone && !/[\d]{3}.*[\d]{3}.*[\d]{4}/.test(r.phone)) warn(f, `resource ${id}: phone looks odd "${r.phone}"`);
  if (r.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(r.email)) warn(f, `resource ${id}: email looks odd "${r.email}"`);
  if (typeof r.serves === "string" && /—/.test(r.serves + (r.provides||"") + (r.notes||""))) warn(f, `resource ${id}: em dash in youth-facing text`);
};

const checkScholarship = (f, s) => {
  counts.scholarships++;
  takeId(f, s.id, "scholarship");
  const id = s.id || "?";
  for (const k of ["name","provider","type","scope","amount","eligibility","url","verified"]) {
    if (s[k] == null || s[k] === "") err(f, `scholarship ${id}: missing ${k}`);
  }
  if (s.type && !SCHOL_TYPES.has(s.type)) err(f, `scholarship ${id}: bad type "${s.type}"`);
  if (s.scope && !SCHOL_SCOPES.has(s.scope)) err(f, `scholarship ${id}: bad scope "${s.scope}"`);
  if (s.scope && s.scope !== "national" && (!s.state || !STATES.has(s.state))) err(f, `scholarship ${id}: scope ${s.scope} needs a valid state`);
  if (s.scope === "national" && s.state) warn(f, `scholarship ${id}: national scope should have state null`);
  if (s.url && !isUrl(s.url)) err(f, `scholarship ${id}: url not http(s)`);
  if (s.verified && !isVerified(s.verified)) err(f, `scholarship ${id}: verified must be "YYYY-MM"`);
};

const checkGuide = (f, g) => {
  counts.guides++;
  if (!g.state || !STATES.has(g.state)) err(f, `guide: bad state "${g.state}"`);
  for (const k of ["name","agency","extendedFosterCare","tuitionWaiver","etv","medicaidTo26","ilp","verified"]) {
    if (g[k] == null) err(f, `guide ${g.state}: missing ${k}`);
  }
  if (g.agency && (!g.agency.name || !isUrl(g.agency.url))) err(f, `guide ${g.state}: agency needs name + url`);
  if (g.extendedFosterCare && typeof g.extendedFosterCare.toAge !== "number") err(f, `guide ${g.state}: extendedFosterCare.toAge must be a number`);
  if (g.tuitionWaiver && typeof g.tuitionWaiver.exists !== "boolean") err(f, `guide ${g.state}: tuitionWaiver.exists must be boolean`);
  if (g.tuitionWaiver && g.tuitionWaiver.exists && !isUrl(g.tuitionWaiver.url)) warn(f, `guide ${g.state}: tuitionWaiver.url missing`);
  if (g.etv && !isUrl(g.etv.url)) warn(f, `guide ${g.state}: etv.url missing`);
  if (g.medicaidTo26 && typeof g.medicaidTo26.exists !== "boolean") err(f, `guide ${g.state}: medicaidTo26.exists must be boolean`);
  if (g.verified && !isVerified(g.verified)) err(f, `guide ${g.state}: verified must be "YYYY-MM"`);
  (g.stateAid || []).forEach(a => { takeId(f, a.id, "stateAid"); for (const k of ["name","amount","desc"]) if (!a[k]) err(f, `guide ${g.state} stateAid ${a.id}: missing ${k}`); });
  (g.firstWeek || []).forEach((s, i) => { if (!s.title || !s.body) err(f, `guide ${g.state} firstWeek[${i}]: title + body required`); });
  (g.keyOrgs || []).forEach((o, i) => { if (!o.name || !isUrl(o.url)) err(f, `guide ${g.state} keyOrgs[${i}]: name + url required`); });
};

const checkProgram = (f, id, p, legacy) => {
  counts.programs++;
  takeId(f, id, "program");
  for (const k of ["name","tier","loc"]) if (p[k] == null || p[k] === "") err(f, `program ${id}: missing ${k}`);
  if (p.tier && !TIERS.has(p.tier)) err(f, `program ${id}: bad tier "${p.tier}"`);
  if (!legacy) {
    if (!p.state || !STATES.has(p.state)) err(f, `program ${id}: missing/bad state`);
    if (!Array.isArray(p.careers) || !p.careers.length) err(f, `program ${id}: careers[] required`);
    (p.careers || []).forEach(c => { if (!careerIds.has(c)) err(f, `program ${id}: unknown career "${c}"`); });
  }
  if (p.state === "CA" && p.region && !CA_REGIONS.has(p.region)) warn(f, `program ${id}: non-standard CA region "${p.region}"`);
  if (p.lat != null || p.lng != null) { if (!latOk(p.lat) || !lngOk(p.lng)) err(f, `program ${id}: lat/lng out of range`); }
  if (p.url && !isUrl(p.url)) warn(f, `program ${id}: url not http(s)`);
  if (p.sticker != null && typeof p.sticker !== "number") err(f, `program ${id}: sticker must be a number`);
};

const checkApprenticeship = (f, a, legacy) => {
  counts.apprenticeships++;
  takeId(f, a.id, "apprenticeship");
  if (!a.occupation || !a.sponsor) err(f, `apprenticeship ${a.id}: occupation + sponsor required`);
  if (!legacy) {
    if (!a.state || !STATES.has(a.state)) err(f, `apprenticeship ${a.id}: bad state`);
    if (!(a.address || (a.lat != null && a.lng != null))) err(f, `apprenticeship ${a.id}: address or lat/lng required`);
    if (!(a.websiteUrl || a.phone || a.email)) err(f, `apprenticeship ${a.id}: need websiteUrl, phone, or email`);
    if (!isVerified(a.verified)) err(f, `apprenticeship ${a.id}: verified "YYYY-MM" required`);
  }
  if (a.lat != null && (!latOk(a.lat) || !lngOk(a.lng))) err(f, `apprenticeship ${a.id}: lat/lng out of range`);
};

const checkCareer = (f, c) => {
  counts.careers++;
  takeId(f, c.id, "career");
  for (const k of ["name","tagline","interests","length","salary"]) if (c[k] == null) err(f, `career ${c.id}: missing ${k}`);
};

for (const f of files) {
  const legacy = /data\/(programs|apprenticeships)\.js$/.test(f);
  const win = {
    registerResources: (arr) => Array.isArray(arr) ? arr.forEach(r => checkResource(f, r)) : err(f, "registerResources expects an array"),
    registerResource: (r) => checkResource(f, r),
    registerScholarships: (arr) => Array.isArray(arr) ? arr.forEach(s => checkScholarship(f, s)) : err(f, "registerScholarships expects an array"),
    registerStateGuide: (g) => checkGuide(f, g),
    registerPrograms: (obj) => (obj && typeof obj === "object" && !Array.isArray(obj)) ? Object.entries(obj).forEach(([id, p]) => checkProgram(f, id, p, legacy)) : err(f, "registerPrograms expects an object keyed by id"),
    registerProgram: (p) => checkProgram(f, p && p.id, p, legacy),
    registerApprenticeships: (arr) => Array.isArray(arr) ? arr.forEach(a => checkApprenticeship(f, a, legacy)) : err(f, "registerApprenticeships expects an array"),
    registerApprenticeship: (a) => checkApprenticeship(f, a, legacy),
    registerCareer: (c) => checkCareer(f, c),
    registerCareers: (arr) => arr.forEach(c => checkCareer(f, c)),
    STATE_INDEX: null,
  };
  const ctx = { window: win, console };
  ctx.globalThis = ctx;
  let src;
  try { src = fs.readFileSync(f, "utf8"); } catch (e) { err(f, "unreadable: " + e.message); continue; }
  if (/data\/states\/index\.js$/.test(f)) continue; // generated manifest, checked by build-index
  try {
    vm.runInNewContext(src, ctx, { filename: f, timeout: 20000 });
  } catch (e) {
    err(f, "does not execute: " + (e && e.message));
    continue;
  }
  if (/—/.test(src) && /data\/states\//.test(f) && !/programs/.test(f)) {
    // em dash in youth-facing files (programs keep the "Inst — Program" separator)
    warn(f, "contains em dash characters; prefer commas or periods in youth-facing text");
  }
}

// ---------- report ----------
const rel = (f) => path.relative(ROOT, f);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.slice(0, 200).forEach(w => console.log("  warn  " + w));
  if (warnings.length > 200) console.log(`  ... ${warnings.length - 200} more warnings`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  errors.slice(0, 300).forEach(e => console.log("  ERROR " + e));
  if (errors.length > 300) console.log(`  ... ${errors.length - 300} more errors`);
  console.log(`\nFAILED. files=${files.length} ${JSON.stringify(counts)}`);
  process.exit(1);
}
console.log(`OK. files=${files.length} ${JSON.stringify(counts)}`);
