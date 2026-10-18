// Headless smoke test: serves the repo, loads routes for several states, and
// reports console errors. Needs Playwright with Chromium:
//   npm i -D playwright && npx playwright install chromium
//   node tools/smoke.js "home,map,career/nurse" "CA,TX"
// Env: PLAYWRIGHT_MODULE (path to playwright), CHROMIUM_PATH (executable), HTTPS_PROXY (optional).
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = require('path').resolve(__dirname, '..', '..');
const MIME = { '.html':'text/html', '.js':'application/javascript', '.jsx':'text/babel', '.css':'text/css', '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end('nf'); return; } res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'}); res.end(d); });
});
(async () => {
  await new Promise(r => server.listen(8765, r));
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', ...(proxy ? ['--proxy-pac-url=data:application/x-ns-proxy-autoconfig;base64,' + Buffer.from(`function FindProxyForURL(url, host) { if (host === 'localhost' || host === '127.0.0.1') return 'DIRECT'; return 'PROXY ${proxy.replace(/^https?:\/\//,'')}'; }`).toString('base64')] : [])] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; const logs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text().slice(0, 300)}`); else logs.push(m.text().slice(0,200)); });
  page.on('pageerror', e => errors.push('[pageerror] ' + String(e).slice(0, 500)));
  page.on('requestfailed', r => errors.push('[reqfail] ' + r.url().slice(0, 120) + ' ' + (r.failure() || {}).errorText));
  const base = 'http://localhost:8765/fosteringpathsproject/';
  const routes = (process.argv[2] || 'home,map,resources,scholarships,money,apprenticeships,state,week,about,career/paralegal,career/nurse').split(',');
  const states = (process.argv[3] || 'CA,TX').split(',');
  const outDir = process.argv[4] || require('os').tmpdir() + '/fp-shots';
  fs.mkdirSync(outDir, { recursive: true });
  for (const st of states) {
    await page.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
    await page.evaluate((st) => { localStorage.setItem('cp:location', JSON.stringify({ state: st, region: st === 'CA' ? 'Inland Empire' : '' })); localStorage.setItem('clearpath:profile:v1', JSON.stringify({status:'agedout',age:20,education:'hsdiploma',resident: st==='CA',completedAt:'x'})); }, st);
    await page.reload({ waitUntil: 'networkidle' });
    for (const r of routes) {
      const url = base + '#/' + (r === 'home' ? '' : r);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
      await page.waitForTimeout(1500);
      const text = await page.evaluate((n) => document.body.innerText.slice(0, n).replace(/\s+/g, ' '), process.env.TEXTLEN ? +process.env.TEXTLEN : 400);
      const counts = await page.evaluate(() => ({ programs: window.PROGRAMS.count(), res: window.RESOURCES.count(), sch: window.SCHOLARSHIPS.count(), guides: window.STATE_GUIDES.count(), status: window.stateLoadStatus(window.getLocation().state) }));
      console.log(`\n=== ${st} #/${r} ===\n${text}\n${JSON.stringify(counts)}`);
      await page.screenshot({ path: `${outDir}/${st}-${r.replace('/', '_')}.png`, fullPage: false });
    }
  }
  console.log('\n=== console errors/warnings (' + errors.length + ') ===');
  [...new Set(errors)].slice(0, 60).forEach(e => console.log(e));
  await browser.close(); server.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
