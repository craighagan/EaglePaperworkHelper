#!/usr/bin/env node
/*
 * Regenerate the README and home-page pictures in docs/ from the fictional
 * sample backup (tests/fixtures/sample-workbook.json). Never use real data.
 *
 *   node tools/screenshots.cjs
 *
 * Needs Node 22+ and Google Chrome or Chromium (set CHROME=/path/to/chrome).
 * Set CHROME_NO_SANDBOX=1 only where Chrome's sandbox cannot start.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find((p) => fs.existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (!CHROME) throw new Error('Chrome not found. Set CHROME=/path/to/chrome.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'eph-shots-'));
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'];
  if (process.env.CHROME_NO_SANDBOX) args.unshift('--no-sandbox');
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 80 && !fs.existsSync(portFile); i++) await sleep(250);
    if (!fs.existsSync(portFile)) throw new Error('Chrome did not start. If its sandbox cannot run here, set CHROME_NO_SANDBOX=1.');
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
    const send = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });
    const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
    const waitFor = async (expression) => { for (let t = 0; t < 15000; t += 100) { if (await evaluate(expression)) return; await sleep(100); } throw new Error(`Timed out: ${expression}`); };
    const open = async (file, ready) => { await send('Page.navigate', { url: pathToFileURL(path.join(ROOT, file)).href }); await waitFor(`document.readyState === 'complete' && (${ready})`); };
    const shot = async (out) => { await sleep(300); const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(ROOT, out), Buffer.from(data, 'base64')); console.log(`wrote ${out}`); };

    await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 1180, deviceScaleFactor: 1, mobile: false });
    const sample = fs.readFileSync(path.join(ROOT, 'tests/fixtures/sample-workbook.json'), 'utf8');

    // Guided workbook on the Proposal stage, with the sample saved an hour after its last backup file.
    await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
    await evaluate(`localStorage.clear(); localStorage.setItem('eagle_workbook_guided_v1', ${JSON.stringify(sample)});
      localStorage.setItem('eagle_workbook_guided_v1_saved', String(Date.now() - 3600e3)); localStorage.setItem('eagle_workbook_guided_v1_backup', String(Date.now() - 7200e3)); true`);
    await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
    await evaluate('document.querySelectorAll("nav button")[1].click()');
    await waitFor('document.querySelectorAll("nav button")[1].classList.contains("active")');
    await shot('docs/guided-workbook.png');

    // Fill page with nothing chosen yet (the saved draft above is offered).
    await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
    await shot('docs/fill-official-pdf.png');

    await evaluate('localStorage.clear(); true');
    ws.close();
  } finally {
    proc.kill();
    setTimeout(() => fs.rmSync(profile, { recursive: true, force: true }), 500);
  }
})().catch((error) => { console.error(error.message); process.exit(1); });
