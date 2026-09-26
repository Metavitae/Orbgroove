// Render Ribbons dancing a genre routine, frame by frame (exact timing, not screen capture),
// to JPEGs + a 15 fps limb timeline for the app's live match meter.
// usage: node render.mjs <genre> <beats> [preview]
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire('/home/metavitae/.npm/_npx/705bc6b22212b352/node_modules/');
const { chromium } = require('playwright-core');
const DIR = path.dirname(new URL(import.meta.url).pathname);
const [genre, beatsArg, preview] = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  const f = path.join(DIR, decodeURIComponent(q.url.split('?')[0]));
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1246/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('console', (m) => { if (m.type() === 'error') console.error('page:', m.text()); });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
await page.goto(`http://127.0.0.1:${port}/render.html`);
await page.waitForFunction('window.ready === true', null, { timeout: 60000 });
const info = await page.evaluate((g) => window.loadGenre(g), genre);
const FPS = 30, beats = +beatsArg, seconds = beats * 60 / info.bpm, n = Math.round(seconds * FPS);
const out = path.join(DIR, 'out', genre); fs.mkdirSync(out, { recursive: true });
const timeline = [], moves = [];
const last = preview ? Math.min(n, +preview) : n;
for (let i = 0; i < last; i++) {
  const r = await page.evaluate(([t, dt, img]) => window.frame(t, dt, img), [i / FPS, 1 / FPS, !preview || i % 30 === 0]);
  if (r.img) fs.writeFileSync(path.join(out, String(i).padStart(5, '0') + '.jpg'), Buffer.from(r.img.split(',')[1], 'base64'));
  if (i % 2 === 0) timeline.push(r.limbs);
  if (!moves.length || moves[moves.length - 1].name !== r.move) moves.push({ name: r.move, atSec: +(i / FPS).toFixed(2) });
  if (i % 150 === 0) console.error(genre, i, '/', n);
}
fs.writeFileSync(path.join(out, 'timeline.json'), JSON.stringify({ genre, fps: 15, bpm: info.bpm, seconds: +seconds.toFixed(3), limbs: ['uaR', 'faR', 'uaL', 'faL', 'thR', 'shR', 'thL', 'shL'], moves, frames: timeline }));
console.error('done', genre, last, 'frames', JSON.stringify(info));
await browser.close(); server.close();
