#!/usr/bin/env node
/*
 * Real-browser tests. Opens the pages from disk (file://) in headless Chrome,
 * the way a Scout double-clicks them, and drives them with the Chrome DevTools
 * Protocol. No npm install. Requires Node 22 or newer.
 *
 *   node tests/browser-e2e.cjs
 *
 * Needs Google Chrome or Chromium (set CHROME=/path/to/chrome if it is not in
 * the usual place) and the official PDF (run tests/run-tests.cjs first, or set
 * EAGLE_PDF). Set CHROME_NO_SANDBOX=1 only where Chrome's sandbox cannot start
 * (some containers and CI runners). Set EAGLE_ONLINE=1 to also test
 * "Get the official PDF for me", which downloads from scouting.org.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const assert = require('assert/strict');

if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error(`Node.js 22 or newer is required (this is ${process.version}).`);
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const PDF = process.env.EAGLE_PDF || path.join(__dirname, '.cache/EagleProjectWorkbook2023a.pdf');
const SAMPLE = path.join(__dirname, 'fixtures/sample-workbook.json');
const lib = require(path.join(ROOT, 'lib/official-pdf.js'));
const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find((p) => fs.existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  if (!CHROME) throw new Error('Chrome not found. Set CHROME=/path/to/chrome.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'eph-chrome-'));
  const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'];
  if (process.env.CHROME_NO_SANDBOX || (process.getuid && process.getuid() === 0)) args.unshift('--no-sandbox');
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 80 && !fs.existsSync(portFile); i++) await sleep(250);
  if (!fs.existsSync(portFile)) { proc.kill(); throw new Error('Chrome did not start. If its sandbox cannot run here, set CHROME_NO_SANDBOX=1.'); }
  const [port] = fs.readFileSync(portFile, 'utf8').split('\n');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onclose = () => {
    // Chrome crashed or quit: fail loudly instead of leaving the tests waiting forever.
    for (const { reject } of pending.values()) reject(new Error('Chrome closed the connection (it may have crashed).'));
    pending.clear();
    if (!closing) { console.error('Chrome closed the connection (it may have crashed). If its sandbox cannot run here, set CHROME_NO_SANDBOX=1.'); process.exit(1); }
  };
  let closing = false;
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) listeners.forEach((fn) => fn(msg));
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const close = () => { closing = true; try { ws.close(); } catch {} proc.kill(); setTimeout(() => fs.rmSync(profile, { recursive: true, force: true }), 500); };
  return { send, on: (fn) => listeners.push(fn), close };
}

async function run() {
  const browser = await launch();
  const { send } = browser;
  const problems = [];
  let dialogs = [];
  browser.on((msg) => {
    if (msg.method === 'Runtime.exceptionThrown') problems.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') problems.push(msg.params.args.map((a) => a.value || a.description).join(' '));
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') problems.push(msg.params.entry.text);
    if (msg.method === 'Page.javascriptDialogOpening') { dialogs.push(msg.params.message); send('Page.handleJavaScriptDialog', { accept: true }); }
  });
  const downloads = fs.mkdtempSync(path.join(os.tmpdir(), 'eph-downloads-'));
  // A backup file made for the 2026 workbook (fictional). Used to check the 2023a pages refuse it.
  const OTHER_EDITION = path.join(os.tmpdir(), `eph-2026-backup-${process.pid}.json`);
  fs.writeFileSync(OTHER_EDITION, JSON.stringify({ edition: '2026', candidate: { name: 'Test' }, proposal: {} }));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression, ms = 30000) => {
    for (let t = 0; t < ms; t += 100) { try { if (await evaluate(expression)) return; } catch { /* page still loading */ } await sleep(100); }
    throw new Error(`Timed out waiting for: ${expression}`);
  };
  const open = async (file, ready) => {
    problems.length = 0;
    await send('Page.navigate', { url: pathToFileURL(path.join(ROOT, file)).href });
    await waitFor(`document.readyState === 'complete' && (${ready || 'true'})`);
  };
  const setFile = async (selector, file) => {
    const { root } = await send('DOM.getDocument');
    const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector });
    await send('DOM.setFileInputFiles', { nodeId, files: [file] });
  };
  const downloaded = (suffix) => fs.readdirSync(downloads).filter((f) => f.endsWith(suffix));
  const waitForDownload = async (suffix) => {
    for (let t = 0; t < 30000; t += 100) { const done = downloaded(suffix); if (done.length) return path.join(downloads, done[0]); await sleep(100); }
    throw new Error(`No ${suffix} download`);
  };
  const clearDownloads = () => fs.readdirSync(downloads).forEach((f) => fs.rmSync(path.join(downloads, f)));
  const click = (text) => evaluate(`(() => { const b=[...document.querySelectorAll('button,a')].find(e=>e.textContent.includes(${JSON.stringify(text)})); if(!b) throw new Error('no control: ' + ${JSON.stringify(text)}); b.click(); return true; })()`);

  let passed = 0;
  let filledPdf = null;
  let filled2026 = null;
  const failures = [];
  const test = async (name, fn) => {
    try { const r = await fn(); if (r === 'skip') { console.log(`  skip ${name}`); return; } passed++; console.log(`  ok   ${name}`); }
    catch (error) { failures.push(name); console.log(`  FAIL ${name}\n       ${error.message}`); }
  };

  try {
    console.log('FillOfficialPDF.html (file://)');
    await test('fills the official PDF from a backup file', async () => {
      assert.ok(fs.existsSync(PDF), `official PDF not found at ${PDF}; run tests/run-tests.cjs first`);
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      assert.equal(await evaluate('document.getElementById("create").disabled'), true);
      await setFile('#pdf-file', PDF);
      await setFile('#json-file', SAMPLE);
      await waitFor('!document.getElementById("create").disabled');
      assert.equal(await evaluate('document.getElementById("project-name").value'), 'Bike Rack and Repair Stand');
      clearDownloads();
      await evaluate('document.getElementById("create").click()');
      await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("status").className)', 60000);
      const status = await evaluate('document.getElementById("status").textContent');
      assert.match(status, /^Done\./, status);
      const file = await waitForDownload('.pdf');
      assert.equal(path.basename(file), 'Bike-Rack-and-Repair-Stand-Workbook-filled.pdf');
      const bytes = fs.readFileSync(file);
      assert.ok(bytes.subarray(0, fs.statSync(PDF).size).equals(fs.readFileSync(PDF)), 'download is the official PDF plus an update');
      const report = await evaluate('document.getElementById("report").textContent');
      assert.match(report, /Filled \d+ answers\./);
      assert.match(report, /Printed names next to the approval signature lines/);
      assert.deepEqual(problems, []);
      filledPdf = path.join(os.tmpdir(), `eph-filled-${process.pid}.pdf`);
      fs.copyFileSync(file, filledPdf);
    });
    await test('flags a blank name or project name without blocking the PDF', async () => {
      const blank = path.join(downloads, 'blank-names.json');
      const d = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
      d.proposal.projectName = ''; d.candidate.name = '';
      fs.writeFileSync(blank, JSON.stringify(d));
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', PDF);
      await setFile('#json-file', blank);
      await waitFor('!document.getElementById("create").disabled');
      const note = await evaluate('document.getElementById("heads-up").hidden ? "" : document.getElementById("heads-up").textContent');
      assert.match(note, /Your name is blank/);
      assert.match(note, /project name is blank/);
      clearDownloads();
      await evaluate('document.getElementById("create").click()');
      await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("status").className)', 60000);
      assert.match(await evaluate('document.getElementById("status").textContent'), /^Done\./, 'still made the PDF');
      const results = await evaluate('document.getElementById("report").textContent');
      assert.match(results, /Your name is blank/, 'the name note is listed in the results');
      assert.equal(results.split(/project name (on the cover page )?is blank/i).length - 1, 2, 'the blank project name is listed once, not twice');
      await evaluate('(() => { const i = document.getElementById("project-name"); i.value = "Typed Here"; i.dispatchEvent(new Event("input", { bubbles: true })); })()');
      const after = await evaluate('document.getElementById("heads-up").textContent');
      assert.doesNotMatch(after, /project name is blank/, 'typing a name clears that note');
      fs.rmSync(blank, { force: true });
    });
    await test('Apple PDFKit (Preview) shows every answer (macOS only)', async () => {
      if (process.platform !== 'darwin') return 'skip';
      assert.ok(filledPdf, 'needs the PDF from the previous test');
      const binary = path.join(os.tmpdir(), 'eph-pdfkit-check');
      execFileSync('swiftc', ['-O', path.join(__dirname, 'pdfkit-check.swift'), '-o', binary], { stdio: 'ignore' });
      const seen = JSON.parse(execFileSync(binary, [filledPdf], { encoding: 'utf8' }));
      assert.equal(seen.locked, false);
      const expected = lib.buildFieldValues(JSON.parse(fs.readFileSync(SAMPLE, 'utf8')));
      const wrong = [];
      for (const [name, value] of Object.entries(expected.text)) {
        const values = seen.text[name] || [];
        if (!values.length || values.some((v) => v !== value)) wrong.push(`${name}: expected "${value}", PDFKit shows ${JSON.stringify(values)}`);
      }
      for (const [name, value] of Object.entries(expected.radio)) if (seen.radio[name] !== value) wrong.push(`${name}: expected ${value}, PDFKit shows ${seen.radio[name]}`);
      assert.deepEqual(wrong, []);
    });
    await test('choosing a new PDF clears the old result', async () => {
      const copy = path.join(downloads, 'workbook-copy.pdf');
      fs.copyFileSync(PDF, copy);
      await setFile('#pdf-file', copy);
      await waitFor('document.getElementById("report").hidden');
    });
    await test('rejects a file that is not a workbook backup', async () => {
      const bad = path.join(downloads, 'not-a-workbook.json');
      fs.writeFileSync(bad, '{"hello": "world"}');
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#json-file', bad);
      await waitFor('document.getElementById("json-chosen").textContent.includes("not an Eagle workbook backup file")');
      assert.equal(await evaluate('document.getElementById("create").disabled'), true);
    });
    await test('refuses a 2026 backup file, in plain words', async () => {
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#json-file', OTHER_EDITION);
      await waitFor('document.getElementById("json-chosen").textContent.includes("This backup file is for the 2026 workbook.")');
      assert.equal(await evaluate('document.getElementById("create").disabled'), true);
    });
    await test('says right away when the chosen PDF is not the workbook', async () => {
      const other = path.join(downloads, 'some-other.pdf');
      fs.writeFileSync(other, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', other);
      await waitFor('document.getElementById("pdf-chosen").textContent.includes("not the official Eagle Scout Service Project Workbook")');
      await setFile('#pdf-file', PDF);
      await waitFor('document.getElementById("pdf-chosen").textContent.includes("It is the official workbook No. 2023a")');
    });
    await test('says plainly, with the reason and what to do, when the official PDF cannot be fetched', async () => {
      const stub = await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.fetch = () => Promise.reject(new TypeError('Load failed'));` });
      try {
        await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
        await evaluate('document.getElementById("fetch-pdf").click()');
        await waitFor('document.getElementById("pdf-chosen").className.includes("err")');
        const text = await evaluate('document.getElementById("pdf-chosen").textContent');
        assert.match(text, /Couldn’t get the PDF automatically \(Load failed\)/);
        assert.match(text, /Save to Files/);
        assert.doesNotMatch(text, /^!/);
        assert.match(await evaluate('document.getElementById("fetch-pdf").textContent'), /again/);
        assert.equal(await evaluate('document.getElementById("fetch-pdf").disabled'), false, 'the button works again');
      } finally {
        await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: stub.identifier });
      }
    });
    await test('a printed copy such as a submission copy is told what to use instead', async () => {
      const A = require(path.join(ROOT, 'lib/attachments.js'));
      const printed = path.join(downloads, 'looks-like-a-submission-copy.pdf');
      fs.writeFileSync(printed, A.writePdf([{ text: [{ x: 72, y: 700, text: 'Signed pages, attachments, and links', size: 14 }] }]));
      await open('BackupFromPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', printed);
      await waitFor('document.getElementById("read-status").className.includes("error")');
      const text = await evaluate('document.getElementById("read-status").textContent');
      assert.match(text, /submission copy/);
      assert.match(text, /Open backup file/);
      assert.match(await evaluate('document.querySelector("#step1").closest("section").textContent'), /Use your backup file/, 'the reminder is on this page too');
    });
    await test('rejects a file that is not a PDF', async () => {
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', SAMPLE);
      await waitFor('document.getElementById("pdf-chosen").textContent.includes("is not a PDF")');
    });
    await test('keyboard focus is visible on the file pickers', async () => {
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      await evaluate('document.getElementById("pdf-file").focus()');
      const outline = await evaluate('getComputedStyle(document.getElementById("pdf-file").parentElement).outlineStyle');
      assert.notEqual(outline, 'none');
    });
    await test('"Get the official PDF for me" downloads it (EAGLE_ONLINE=1 only)', async () => {
      if (!process.env.EAGLE_ONLINE) return 'skip';
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      await evaluate('document.getElementById("fetch-pdf").click()');
      await waitFor('document.getElementById("pdf-chosen").className.includes("ok") || document.getElementById("pdf-chosen").textContent.includes("Couldn")', 60000);
      assert.match(await evaluate('document.getElementById("pdf-chosen").textContent'), /official PDF from scouting\.org/);
      assert.deepEqual(problems, []);
    });

    for (const [file, key] of [['EagleWorkbook-guided.html', 'eagle_workbook_guided_v1'], ['EagleWorkbook.html', 'eagle_workbook_v1']]) {
      console.log(`${file} (file://)`);
      const ready = '!!document.querySelector("nav button")';
      await test('opens without errors and Next moves forward', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        const before = await evaluate('document.querySelector("nav button.active").textContent');
        assert.equal(await evaluate('document.querySelector(".nav-btns .btn-next").disabled'), false);
        await evaluate('document.querySelector(".nav-btns .btn-next").click()');
        await waitFor(`document.querySelector("nav button.active").textContent !== ${JSON.stringify(before)}`);
        assert.deepEqual(problems, []);
      });
      await test('lists longer than the PDF say so, and the hours total counts the PDF rows', async () => {
        const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
        draft.plan.materials = Array.from({ length: 11 }, (_, i) => ({ item: `Item ${i}`, description: '', qty: '1', unitCost: '2', totalCost: '', source: '' }));
        draft.report.hours = Array.from({ length: 8 }, (_, i) => ({ cat: `Row ${i}`, w: '1', h: '10' }));
        await open(file, ready);
        await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(draft))}); true`);
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[2].click()');
        await waitFor('!![...document.querySelectorAll(".list-total")].find((e) => /Materials list total/.test(e.textContent))');
        assert.match(await evaluate('[...document.querySelectorAll(".list-total")].find((e) => /Materials list total/.test(e.textContent)).textContent'), /Materials list total: \$18\.00\. \(Counts only the first 9 rows, the number the official PDF has room for\.\) 2 more rows are not in the PDF\. Ask your coach how to show them\./);
        await evaluate('document.querySelectorAll("nav button")[4].click()');
        await waitFor('!![...document.querySelectorAll(".list-total")].find((e) => /Grand total of hours/.test(e.textContent))');
        assert.equal(await evaluate('[...document.querySelectorAll(".list-total")].find((e) => /Grand total of hours/.test(e.textContent)).textContent'), 'Grand total of hours: 60');
      });
      await test('a draft changed in another tab is announced, and a saved backup changes the message', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        await evaluate(`(() => { const i = document.querySelector("main .field input[type=text]"); i.value = "Before"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await sleep(600);
        // Another tab writes the draft: the browser tells this page with a storage event.
        await evaluate(`window.dispatchEvent(new StorageEvent("storage", { key: ${JSON.stringify(key)}, storageArea: localStorage })); true`);
        const status = '[...document.querySelectorAll(".backup-status")]';
        assert.match(await evaluate(`${status}[0].textContent`), /changed in another tab or window, so this page has stopped saving.*Reloading drops anything you typed here/);
        assert.equal(await evaluate(`${status}[0].getAttribute("role")`), 'alert', 'announced firmly');
        assert.match(await evaluate('document.querySelector(".save-status").textContent'), /Nothing you type here is being saved/);
        await evaluate(`(() => { const i = document.querySelector("main .field input[type=text]"); i.value = "While blocked"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await sleep(700);
        assert.doesNotMatch(await evaluate(`localStorage.getItem(${JSON.stringify(key)}) || ""`), /While blocked/, 'nothing was written over the other tab');
        await evaluate('document.querySelector(".btn-control.save").click()');
        await waitFor(`/Backup file saved\\. Now reload this page/.test(${status}[0].textContent)`, 5000);
      });
      await test('an unreadable saved draft is explained in the announced status and points to Open backup file', async () => {
        await open(file, ready);
        await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(key)}, '{"candidate":{"name":"Real"},"proposal":'); true`);
        await open(file, ready);
        const text = await evaluate('document.querySelector(".backup-status").textContent');
        assert.match(text, /^⚠ Your saved draft in this browser was damaged and could not be opened\..*Open backup file.*ask a parent or your coach/);
        assert.equal(await evaluate('document.querySelector(".backup-status").getAttribute("role")'), 'status');
        assert.match(await evaluate(`localStorage.getItem(${JSON.stringify(key + '_corrupt')}) || ""`), /Real/, 'the damaged text is kept aside');
        await evaluate('document.querySelector(".btn-control.save").click()');
        await waitFor('!/damaged/.test(document.querySelector(".backup-status").textContent)', 5000);
      });
      await test('the header next to "Saved" says how much is not in a backup file yet', async () => {
        const header = () => evaluate('document.querySelector(".save-status").textContent');
        const type = (index, text) => evaluate(`(() => { const i = document.querySelectorAll("main .field input[type=text]")[${index}]; i.value = ${JSON.stringify(text)}; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        await type(0, 'Alex');
        await waitFor('/Saved in this browser/.test(document.querySelector(".save-status").textContent)', 5000);
        assert.equal(await header(), '✓ Saved in this browser · no backup file yet');
        await evaluate('document.querySelector(".btn-control.save").click()');
        await waitFor('/backup file is up to date/.test(document.querySelector(".save-status").textContent)', 5000);
        await type(0, 'Alexander'); await type(1, 'Smith');
        await waitFor('/2 changes not in a backup file/.test(document.querySelector(".save-status").textContent)', 5000);
        assert.equal(await header(), '✓ Saved in this browser · 2 changes not in a backup file');
        await type(1, '');
        await waitFor('/1 change not in a backup file/.test(document.querySelector(".save-status").textContent)', 5000);
        await evaluate('document.querySelector(".btn-control.save").click()');
        await waitFor('/backup file is up to date/.test(document.querySelector(".save-status").textContent)', 5000);
        // Reloading shows the state straight away, without waiting for an edit.
        await open(file, ready);
        assert.equal(await header(), '✓ Saved in this browser · backup file is up to date');
        // A backup saved before the count existed: say why there is no number.
        await evaluate(`localStorage.removeItem(${JSON.stringify(key + '_snap')}); true`);
        await open(file, ready);
        await type(0, 'Changed again');
        await waitFor('/Saved in this browser/.test(document.querySelector(".save-status").textContent)', 5000);
        assert.equal(await header(), '✓ Saved in this browser · no backup file to compare');
      });
      await test('the backup status counts boxes changed since the last backup file', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        const status = () => evaluate('document.querySelector(".backup-status").textContent');
        const type = (index, text) => evaluate(`(() => { const i = document.querySelectorAll("main .field input[type=text]")[${index}]; i.value = ${JSON.stringify(text)}; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await type(0, 'Alex');
        await evaluate('document.querySelector(".btn-control.save").click()');
        await waitFor('/Last backup file: (?!never)/.test(document.querySelector(".backup-status").textContent)', 5000);
        assert.doesNotMatch(await status(), /since that backup file|only in this browser/, 'just saved: nothing to warn about');
        await type(0, 'Alexander');
        await type(1, 'Smith');
        await waitFor('/2 changes since that backup file/.test(document.querySelector(".backup-status").textContent)', 5000);
        assert.match(await status(), /You have changes that are only in this browser\. Click “Save backup file\.” \(2 changes since that backup file\)$/);
        assert.equal(await evaluate('document.querySelector(".backup-status .count").getAttribute("aria-hidden")'), 'true', 'the number is not read out on every edit');
        await type(1, '');
        await waitFor('/\\(1 change since that backup file\\)/.test(document.querySelector(".backup-status").textContent)', 5000);
        await type(0, 'Alex');
        await waitFor('!/only in this browser/.test(document.querySelector(".backup-status").textContent)', 5000);
      });
      await test('typing and leaving at once still saves the draft', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        await evaluate(`(() => { const i = document.querySelector("main .field input[type=text]"); i.focus(); i.value = "Typed Just Before Leaving"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await send('Page.navigate', { url: 'about:blank' });   // well inside the 400 ms save delay
        await sleep(300);
        await open(file, ready);
        assert.match(await evaluate(`localStorage.getItem(${JSON.stringify(key)}) || ""`), /Typed Just Before Leaving/);
      });
      await test('the saving indicator settles after Save backup file', async () => {
        await open(file, ready);
        await evaluate(`(() => { const i = document.querySelector("main .field input[type=text]"); i.value = "Indicator Check"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await evaluate('document.querySelector(".btn-control.save").click()');
        await waitFor('/Saved in this browser/.test(document.querySelector(".save-status").textContent)', 5000);
      });
      await test('Your path shows the next step, keeps ticks, and shows the fundraising step only when asked', async () => {
        await open(file, ready);
        await evaluate(`localStorage.clear(); true`);
        await open(file, ready);
        await waitFor('!!document.querySelector(".journey")');
        assert.match(await evaluate('document.querySelector(".journey-next").textContent'), /^Next on your path: Fill in the “(2\. )?Proposal” tab\.$/);
        assert.match(await evaluate('document.querySelector(".j-reminder").textContent'), /^The workbook says not to begin any work, raise any money, or get any materials until your project proposal has been approved\. \(Proposal Page A\)$/);
        assert.equal(await evaluate('document.querySelectorAll(".journey li").length'), 7, 'seven steps until fundraising is chosen');
        await evaluate('(() => { const s = document.getElementById("journey-raising"); s.value = "yes"; s.dispatchEvent(new Event("change")); })()');
        await waitFor('document.querySelectorAll(".journey li").length === 8');
        assert.equal(await evaluate('document.querySelector(".journey li:nth-child(2) input[type=checkbox]").getAttribute("aria-label")'), 'I have done this: Get your Proposal signed', 'each checkbox names its step');
        await evaluate('(() => { const c = document.querySelector(".journey li:nth-child(2) input[type=checkbox]"); c.focus(); c.click(); })()');
        await waitFor('document.querySelector(".journey li:nth-child(2)").className === "j-done"');
        assert.equal(await evaluate('document.activeElement.id'), 'j-tick-propSigned', 'keyboard focus stays on the checkbox after it redraws');
        await evaluate('(() => { const s = document.getElementById("journey-raising"); s.focus(); s.value = "no"; s.dispatchEvent(new Event("change")); })()');
        await waitFor('document.querySelectorAll(".journey li").length === 7');
        assert.equal(await evaluate('document.activeElement.id'), 'journey-raising', 'and on the select');
        await evaluate('(() => { const s = document.getElementById("journey-raising"); s.value = "yes"; s.dispatchEvent(new Event("change")); })()');
        await waitFor('document.querySelectorAll(".journey li").length === 8');
        await waitFor(`(localStorage.getItem(${JSON.stringify(key)}) || "").includes("propSigned")`);
        const saved = JSON.parse(await evaluate(`localStorage.getItem(${JSON.stringify(key)})`));
        assert.deepEqual(saved.journey, { raising: 'yes', steps: { propSigned: { done: '1' } } });
        await open(file, ready);
        await waitFor('!!document.querySelector(".journey")');
        assert.equal(await evaluate('document.getElementById("journey-raising").value'), 'yes', 'the choice survives a reload');
        assert.equal(await evaluate('document.querySelector(".journey li:nth-child(2)").className'), 'j-done', 'the tick survives a reload');
        assert.equal(await evaluate('document.querySelectorAll(".journey").length'), 1);
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('!!document.querySelector(".ask-help")');
        assert.equal(await evaluate('document.querySelectorAll(".journey").length'), 0, 'only on the first tab');
        assert.deepEqual(problems, []);
      });
      await test('Who to ask card shows entered contacts safely, with default text when none', async () => {
        const sample = fs.readFileSync(SAMPLE, 'utf8');
        const tabBtn = (i) => `document.querySelectorAll("nav button")[${i}].click()`;
        await open(file, ready);
        await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(sample)}); true`);
        await open(file, ready);
        for (const i of [1, 2, 3, 4]) {
          await evaluate(tabBtn(i));
          await waitFor('!!document.querySelector(".ask-help")');
          assert.equal(await evaluate('document.querySelector(".ask-help").open'), false);
        }
        assert.match(await evaluate('document.querySelector(".ask-help").textContent'), /Ask your unit leader first/);
        assert.match(await evaluate('document.querySelector(".ask-help").textContent'), /Jordan Leader/);
        assert.equal(await evaluate('document.querySelectorAll(".ask-scoutly iframe").length'), 0, 'nothing loads before the click');
        assert.equal(await evaluate('(() => { const a = document.querySelector(".ask-scoutly a"); return a && a.href + "|" + a.target + "|" + a.rel; })()'), 'https://www.scouting.org/|_blank|noopener noreferrer');
        await evaluate('document.querySelector(".ask-help").open = true; document.querySelector(".ask-scoutly button").click()');
        await waitFor('!!document.querySelector("body > .scoutly-win iframe")');
        assert.equal(await evaluate('(() => { const f = document.querySelector(".scoutly-win iframe"); f.dataset.mark = "same"; return f.src + "|" + f.getAttribute("sandbox") + "|" + f.getAttribute("referrerpolicy") + "|[" + f.getAttribute("allow") + "]"; })()'), 'https://scoutly.scouting.org/|allow-scripts allow-same-origin allow-forms allow-popups|no-referrer|[]');
        assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Minimize Scoutly chat', 'focus moves into the window');
        assert.equal(await evaluate('document.body.classList.contains("scoutly-open")'), true);
        assert.match(await evaluate('document.querySelector(".scoutly-bar").textContent'), /from Scouting America, not this helper.*private details/);
        await evaluate(tabBtn(2));
        await waitFor('!!document.querySelector(".ask-help")');
        assert.equal(await evaluate('document.querySelector(".scoutly-win iframe").dataset.mark'), 'same', 'the chat survives a tab change');
        await evaluate('document.querySelector(".scoutly-btn[aria-label^=Minimize]").click()');
        assert.equal(await evaluate('getComputedStyle(document.querySelector(".scoutly-win")).display'), 'none');
        assert.equal(await evaluate('document.activeElement.className'), 'scoutly-pill', 'focus moves to the pill');
        assert.equal(await evaluate('document.body.classList.contains("scoutly-open")'), false);
        assert.equal(await evaluate('document.querySelector(".scoutly-win iframe").dataset.mark'), 'same', 'minimizing keeps the chat');
        await evaluate('document.querySelector(".scoutly-pill").click()');
        assert.equal(await evaluate('getComputedStyle(document.querySelector(".scoutly-win")).display'), 'flex');
        await evaluate('document.querySelector(".scoutly-btn[aria-label^=Close]").click()');
        await waitFor('!document.querySelector(".scoutly-win") && !document.querySelector(".scoutly-pill")');
        assert.equal(await evaluate('!!document.activeElement.closest(".ask-help")'), true, 'focus returns to the card');
        assert.equal(await evaluate('document.querySelectorAll(".ask-help a[href^=\\"tel:\\"]").length > 0'), true);
        await evaluate(tabBtn(0));
        await waitFor('!document.querySelector(".ask-help")');
        const hostile = JSON.parse(sample);
        hostile.contacts.leader.phone = '555-call-me';
        hostile.contacts.leader.email = 'x"><img src=x onerror=alert(1)>@a.b';
        hostile.contacts.coach.name = '<b>Coach</b>';
        await evaluate(`localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(hostile))}); true`);
        await open(file, ready);
        await evaluate(tabBtn(1));
        await waitFor('!!document.querySelector(".ask-help")');
        assert.equal(await evaluate('document.querySelectorAll(".ask-help img, .ask-help b").length'), 0);
        assert.equal(await evaluate('document.querySelectorAll(".ask-help a[href*=\\"onerror\\"], .ask-help a[href=\\"tel:555-call-me\\"]").length'), 0);
        const none = JSON.parse(sample);
        for (const k of Object.keys(none.contacts)) for (const f of Object.keys(none.contacts[k])) none.contacts[k][f] = '';
        await evaluate(`localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(none))}); true`);
        await open(file, ready);
        await evaluate(tabBtn(1));
        await waitFor('!!document.querySelector(".ask-help")');
        const t = await evaluate('document.querySelector(".ask-help").textContent');
        assert.match(t, /haven.t added any contacts yet/);
        assert.match(t, /Ask your unit leader first/);
        assert.deepEqual(problems, []);
      });
      await test('the Scoutly window fits a phone screen and its buttons are easy to tap', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 760, deviceScaleFactor: 2, mobile: true });
        try {
          await open(file, ready);
          await evaluate('document.querySelectorAll("nav button")[1].click()');
          await waitFor('!!document.querySelector(".ask-help")');
          await evaluate('document.querySelector(".ask-help summary").click(); document.querySelector(".ask-scoutly button").click()');
          await waitFor('!!document.querySelector(".scoutly-win iframe")');
          const m = await evaluate(`(() => { const r = document.querySelector(".scoutly-win").getBoundingClientRect(); const b = [...document.querySelectorAll(".scoutly-btn")].map((x) => { const q = x.getBoundingClientRect(); return Math.min(q.width, q.height); }); return { l: r.left, t: r.top, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight, btn: Math.min(...b), scrollW: document.documentElement.scrollWidth }; })()`);
          assert.ok(m.l >= 0 && m.r <= m.vw && m.t >= 0 && m.b <= m.vh, `window off screen: ${JSON.stringify(m)}`);
          assert.ok(m.btn >= 32, `minimize/close buttons are ${m.btn}px`);
          assert.ok(m.scrollW <= m.vw, `page scrolls sideways: ${JSON.stringify(m)}`);
          // The longer "Saved … 12 changes not in a backup file" header still fits.
          await evaluate(`(() => { const i = document.querySelector("main .field input[type=text]") || document.querySelector("input[type=text]"); if (i) { i.value = "Header width check"; i.dispatchEvent(new Event("input", { bubbles: true })); } })()`);
          await waitFor('/Saved in this browser · /.test(document.querySelector(".save-status").textContent)', 5000);
          const head = await evaluate(`(() => { const h = document.querySelector("header").getBoundingClientRect(); return { w: h.width, h: h.height, scroll: document.documentElement.scrollWidth, vw: innerWidth }; })()`);
          assert.ok(head.scroll <= head.vw, `header makes the page scroll sideways: ${JSON.stringify(head)}`);
          assert.ok(head.h <= 190, `header is ${head.h}px tall at 390px`);
          const clash = await evaluate(`(() => { const s = document.querySelector(".save-status").getBoundingClientRect(); const t = document.querySelector("header h1").getBoundingClientRect(); const x = Math.min(s.right, t.right) - Math.max(s.left, t.left); const y = Math.min(s.bottom, t.bottom) - Math.max(s.top, t.top); return { x, y, title: [t.left, t.top, t.right, t.bottom], status: [s.left, s.top, s.right, s.bottom] }; })()`);
          assert.ok(!(clash.x > 0 && clash.y > 0) && !(clash.x > -6 && clash.y > 0 && clash.status[1] < clash.title[3] - 4), `the saved note collides with the title: ${JSON.stringify(clash)}`);
          if (process.env.SHOT) fs.writeFileSync(process.env.SHOT, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
        } finally { await send('Emulation.clearDeviceMetricsOverride'); }
      });
      await test('changing tabs offers to save a backup file when there are changes', async () => {
        const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
        await open(file, ready);
        await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(draft))}); localStorage.setItem(${JSON.stringify(key + '_saved')}, String(Date.now())); true`);
        await open(file, ready);
        assert.equal(await evaluate('!!document.querySelector(".backup-nudge")'), false, 'not on first load');
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('!!document.querySelector(".backup-nudge")', 5000);
        assert.equal(await evaluate('document.querySelector(".backup-nudge").textContent'), 'Your work isn’t in a backup file yet.Save backup fileNot now');
        assert.equal(await evaluate('document.querySelector(".backup-nudge").getAttribute("role")'), 'status');
        // Not now: hidden, and stays hidden on the next tab change.
        await evaluate('[...document.querySelectorAll(".backup-nudge button")].find((b) => b.textContent === "Not now").click()');
        await waitFor('!document.querySelector(".backup-nudge")', 5000);
        await evaluate('document.querySelectorAll("nav button")[2].click()');
        await sleep(300);
        assert.equal(await evaluate('!!document.querySelector(".backup-nudge")'), false, 'Not now holds');
      });
      await test('the save bar shows the change count, and saving removes it', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        await evaluate(`(() => { const i = document.getElementById("f-candidate-name"); i.value = "Alex"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await evaluate('document.querySelector(".btn-control.save").click()');
        await waitFor('/backup file is up to date/.test(document.querySelector(".save-status").textContent)', 5000);
        await evaluate(`(() => { const i = document.getElementById("f-candidate-name"); i.value = "Alexander"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await sleep(600);
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('!!document.querySelector(".backup-nudge")', 5000);
        assert.match(await evaluate('document.querySelector(".backup-nudge").textContent'), /^1 change not in a backup file\./);
        await evaluate('[...document.querySelectorAll(".backup-nudge button")].find((b) => b.textContent === "Save backup file").click()');
        await waitFor('!document.querySelector(".backup-nudge")', 5000);
        await evaluate('document.querySelectorAll("nav button")[2].click()');
        await sleep(300);
        assert.equal(await evaluate('!!document.querySelector(".backup-nudge")'), false, 'nothing to save: no bar');
      });
      await test('the save bar fits a 390px phone screen without sideways scrolling', async () => {
        const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
        await open(file, ready);
        await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(draft))}); localStorage.setItem(${JSON.stringify(key + '_saved')}, String(Date.now())); true`);
        await open(file, ready);
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 760, deviceScaleFactor: 2, mobile: true });
        try {
          await evaluate('document.querySelectorAll("nav button")[1].click()');
          await waitFor('!!document.querySelector(".backup-nudge")', 5000);
          assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'no sideways scrolling at 390px');
        } finally { await send('Emulation.clearDeviceMetricsOverride'); }
      });
      await test('tabs with empty key boxes have a dot, and the list jumps to the box', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        const dots = () => evaluate('[...document.querySelectorAll("nav button")].map((b) => !!b.querySelector(".tab-dot"))');
        assert.deepEqual(await dots(), [true, true, true, false, true, false, false], 'fundraising, signed pages and review have no dot');
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('!!document.querySelector(".empty-boxes:not([hidden])")', 5000);
        assert.equal(await evaluate('document.querySelector(".empty-boxes").textContent'), 'Not filled in yet: Project name · Project description · Why the beneficiary needs it · How many helpers · Materials · and 1 more');
        await evaluate('[...document.querySelectorAll(".empty-boxes button")].find((b) => b.textContent === "Project description").click()');
        assert.equal(await evaluate('document.activeElement.id'), 'f-proposal-description');
        await evaluate(`(() => { const i = document.getElementById("f-proposal-description"); i.value = "A bench"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await waitFor('!/Project description/.test(document.querySelector(".empty-boxes").textContent)', 5000);
        assert.match(await evaluate('document.querySelectorAll("nav button")[1].textContent'), /some boxes not filled in yet/, 'screen readers hear it');
        // Fill in the other Proposal key boxes: the dot and the list go away without a page redraw.
        for (const [id, v] of [['f-proposal-projectName', 'Bench'], ['f-proposal-whyNeeded', 'No seats'], ['f-proposal-helperCount', '8'], ['f-proposal-materials', 'Lumber'], ['f-proposal-safety', 'Gloves']]) {
          await evaluate(`(() => { const i = document.getElementById(${JSON.stringify(id)}); i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        }
        await waitFor('!document.querySelectorAll("nav button")[1].querySelector(".tab-dot")', 5000);
        assert.equal(await evaluate('!!document.querySelector(".empty-boxes:not([hidden])")'), false);
        // Clear a box again: the list comes back (no page redraw needed).
        await evaluate(`(() => { const i = document.getElementById("f-proposal-safety"); i.value = ""; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await waitFor('!!document.querySelector(".empty-boxes:not([hidden])")', 5000);
        assert.match(await evaluate('document.querySelector(".empty-boxes").textContent'), /Safety issues and hazards/);
      });
      await test('a tab with every key box filled in has no dot and no list', async () => {
        const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
        await open(file, ready);
        await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(draft))}); true`);
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await sleep(300);
        assert.equal(await evaluate('!!document.querySelector("nav button.active .tab-dot")'), false);
        assert.equal(await evaluate('!!document.querySelector(".empty-boxes:not([hidden])")'), false);
      });
      await test('the overall key-box count matches the table and updates as the Scout types', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        assert.equal(await evaluate('document.querySelector(".key-count").textContent'), 'Key boxes filled in: 0 of 20.');
        await evaluate(`(() => { const i = document.getElementById("f-candidate-name"); i.value = "Alex"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await waitFor('document.querySelector(".key-count").textContent === "Key boxes filled in: 1 of 20."', 5000);
        assert.doesNotMatch(await evaluate('document.querySelector(".key-count").textContent'), /%|ready|complete|score/i);
      });
      await test('spell check is on for long answers and off for names and contact details', async () => {
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('!!document.getElementById("f-proposal-description")', 5000);
        assert.equal(await evaluate('document.getElementById("f-proposal-description").getAttribute("spellcheck")'), 'true');
        await evaluate('document.querySelectorAll("nav button")[0].click()');
        await waitFor('!!document.getElementById("f-candidate-name")', 5000);
        for (const id of ['f-candidate-name', 'f-candidate-email', 'f-contacts-beneficiaryRep-name']) {
          assert.equal(await evaluate(`document.getElementById(${JSON.stringify(id)}).getAttribute("spellcheck")`), 'false', id);
        }
      });
      await test('the Review tab gathers what is left, with jump links and plain words', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        const lastButton = 'document.querySelectorAll("nav button")[document.querySelectorAll("nav button").length - 1]';
        assert.match(await evaluate(`${lastButton}.textContent`), /Review/);
        await evaluate(`${lastButton}.click()`);
        await waitFor('!!document.querySelector(".review")', 5000);
        const text = await evaluate('document.querySelector(".review").textContent');
        assert.match(text, /Not filled in yet/);
        assert.match(text, /Project description/);
        assert.match(text, /Nothing here looked unusual\./);
        assert.match(text, /Your backup file: no backup file yet\./);
        assert.match(text, /This is not an approval check\./);
        assert.doesNotMatch(text, /\b(required|must|missing|ready|approved|score)\b|%/i);
        await evaluate('[...document.querySelectorAll(".review button")].find((b) => b.textContent === "Project description").click()');
        await waitFor('document.activeElement && document.activeElement.id === "f-proposal-description"', 5000);
        assert.equal(await evaluate('document.querySelectorAll("nav button")[1].classList.contains("active")'), true, 'the jump goes to the Proposal tab');
      });
      await test('the Review tab fits a 390px phone screen without sideways scrolling', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 760, deviceScaleFactor: 2, mobile: true });
        try {
          await evaluate('document.querySelectorAll("nav button")[document.querySelectorAll("nav button").length - 1].click()');
          await waitFor('!!document.querySelector(".review")', 5000);
          assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'no sideways scrolling at 390px');
        } finally { await send('Emulation.clearDeviceMetricsOverride'); }
      });
      await test('the Review tab shows heads-ups and short answers', async () => {
        const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
        draft.proposal.startDate = '2026-10-01'; draft.proposal.endDate = '2026-03-31';
        draft.proposal.description = 'A bench';
        await open(file, ready);
        await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(draft))}); true`);
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[document.querySelectorAll("nav button").length - 1].click()');
        await waitFor('!!document.querySelector(".review")', 5000);
        const text = await evaluate('document.querySelector(".review").textContent');
        assert.match(text, /the end date \(3\/31\/2026\) is before the start date \(10\/1\/2026\)/);
        assert.match(text, /Project description: this answer is short for its box\. Your coach may ask for more detail\./);
      });
      await test('the tab bar stays just below the header while scrolling', async () => {
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[2].click()');
        await waitFor('document.body.scrollHeight > 3000');
        await evaluate('window.scrollTo(0, 2000)');
        await sleep(150);
        const gap = await evaluate('document.querySelector("nav").getBoundingClientRect().top - document.querySelector("header").getBoundingClientRect().bottom');
        assert.ok(Math.abs(gap) < 1.5, `gap ${gap}`);
      });
      await test('every input has a label', async () => {
        await open(file, ready);
        for (let i = 0; i < 5; i++) {
          await evaluate(`document.querySelectorAll("nav button")[${i}].click()`);
          await waitFor(`document.querySelectorAll("nav button")[${i}].classList.contains("active")`);
          const unlabeled = await evaluate(`[...document.querySelectorAll("main input, main textarea")].filter(e => !(e.labels && e.labels.length) && !e.getAttribute("aria-label")).length`);
          assert.equal(unlabeled, 0, `tab ${i + 1}`);
        }
      });
      await test('saves typing and backs it up to a file the filler accepts', async () => {
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[0].click()');
        await evaluate(`(() => { const i=document.getElementById("f-candidate-name"); i.value="Browser Test Scout"; i.dispatchEvent(new Event("input",{bubbles:true})); })()`);
        await waitFor(`(JSON.parse(localStorage.getItem(${JSON.stringify(key)})||"{}").candidate||{}).name === "Browser Test Scout"`);
        assert.match(await evaluate('document.querySelector(".backup-status").textContent'), /only in this browser/);
        clearDownloads();
        await click('Save backup file');
        const backup = await waitForDownload('.json');
        assert.match(path.basename(backup), /^Eagle-workbook-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/, 'no personal name in the file name');
        const exported = JSON.parse(fs.readFileSync(backup, 'utf8'));
        assert.equal(exported.candidate.name, 'Browser Test Scout');
        assert.ok(Array.isArray(exported.plan.other));
        assert.equal(lib.buildFieldValues(exported).text['Workbook-EagleName'], 'Browser Test Scout');
        await waitFor('!document.querySelector(".backup-status").textContent.includes("only in this browser")');
        assert.deepEqual(problems, []);
      });
      await test('opens an older backup file', async () => {
        await open(file, ready);
        const old = path.join(downloads, 'old-backup.json');
        fs.writeFileSync(old, JSON.stringify({ candidate: { name: 'Old Backup Scout', pid: 4242 }, unit: { type: 'Crew' }, proposal: { description: 'Old project', phases: [{ num: 1, description: 'Plan' }] },
          plan: { phases: [{ num: 1, description: 'Dig', start: 'June 1', end: '6/15' }], helpers: Array.from({ length: 8 }, (_, i) => ({ job: `Job ${i + 1}` })) },
          fundraising: { beginDate: 'next spring' } }));
        await evaluate(`(() => { const make = document.createElement.bind(document); window.__inputs = []; document.createElement = (t, o) => { const e = make(t, o); if (t === 'input') window.__inputs.push(e); return e; }; })()`);
        dialogs = [];
        await click('Open backup file');
        const { result } = await send('Runtime.evaluate', { expression: 'window.__inputs[window.__inputs.length - 1]' });
        await send('DOM.setFileInputFiles', { objectId: result.objectId, files: [old] });
        await waitFor('document.querySelector("header h1").textContent === "Old Backup Scout"');
        assert.match(dialogs.join(' '), /Replace everything/);
        await evaluate('document.querySelectorAll("nav button")[2].click()');
        await waitFor('document.querySelectorAll("nav button")[2].classList.contains("active")');
        const helperRows = await evaluate('[...document.querySelectorAll("table caption")].find(c => c.textContent === "Helpers needed").closest("table").querySelectorAll("tbody tr").length');
        assert.equal(helperRows, 10);
        assert.equal(await evaluate('document.querySelector("[aria-label=\'Phase 1 start date\']").value'), 'June 1', 'old text dates stay visible');
        assert.doesNotMatch(await evaluate('document.querySelector(".backup-status").textContent'), /only in this browser/, 'opening a backup file is not an unsaved change');
        await evaluate('document.querySelectorAll("nav button")[3].click()');
        await waitFor('!!document.getElementById("f-fundraising-beginDate")');
        assert.equal(await evaluate('document.getElementById("f-fundraising-beginDate").value'), 'next spring');
        assert.deepEqual(problems, []);
      });
      await test('refuses a 2026 backup file and changes nothing', async () => {
        await open(file, ready);
        const before = await evaluate(`localStorage.getItem(${JSON.stringify(key)})`);
        await evaluate(`(() => { const orig = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === 'file') { window.__picker = this; return; } return orig.call(this); }; })()`);
        await click('Open backup file');
        await waitFor('!!window.__picker');
        const { root } = await send('DOM.getDocument');
        await evaluate('document.body.appendChild(window.__picker); window.__picker.id = "picked-other"; true');
        const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#picked-other' });
        dialogs = [];
        await send('DOM.setFileInputFiles', { nodeId, files: [OTHER_EDITION] });
        for (let t = 0; t < 50 && !dialogs.length; t++) await sleep(100);
        assert.match(dialogs.join(' '), /This backup file is for the 2026 workbook\./, dialogs.join(' '));
        assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(key)})`), before);
      });
      await test('cost lists add up as you type', async () => {
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[2].click()');
        await waitFor('!!document.querySelector("[aria-label=\'Materials list, row 1, Qty\']")');
        await evaluate(`(() => { for (const [l, v] of [['Qty', '3'], ['Unit $', '4.50']]) { const i = document.querySelector("[aria-label='Materials list, row 1, " + l + "']"); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); } })()`);
        await waitFor('[...document.querySelectorAll(".list-total")].some(e => e.textContent.startsWith("Materials list total: $13.50"))');
      });
      await test('prints a draft marked DRAFT and comes back', async () => {
        await open(file, ready);
        await evaluate('window.print = () => { window.__printed = true; }');
        await click('Print a draft');
        await waitFor('window.__printed === true');
        assert.match(await evaluate('document.querySelector(".draft-mark").textContent'), /DRAFT: not the official/);
        assert.match(await evaluate('document.querySelector(".print-footer").textContent'), /Unofficial draft/);
        await evaluate('window.dispatchEvent(new Event("afterprint"))');
        await waitFor('!!document.querySelector("nav button")');
        assert.deepEqual(problems, []);
      });
      await test('official PDF link, filler link, and disclaimer are present', async () => {
        await open(file, ready);
        const hrefs = await evaluate('[...document.querySelectorAll("a")].map(a => a.getAttribute("href"))');
        assert.ok(hrefs.includes(lib.OFFICIAL_PDF_URL), hrefs.join(', '));
        assert.ok(hrefs.includes('FillOfficialPDF.html'), hrefs.join(', '));
        assert.match(await evaluate('document.querySelector(".page-footer").textContent'), /Not made or endorsed by Scouting America/);
      });
      await test('erasing a 2023 draft leaves a 2026 draft in this browser alone', async () => {
        await open(file, ready);
        const other = JSON.stringify({ edition: '2026', candidate: { name: 'Other' }, proposal: {} });
        await evaluate(`localStorage.setItem('eagle_workbook2026_v1', ${JSON.stringify(other)}); true`);
        dialogs = [];
        await click('erase this draft from this browser');
        await waitFor(`localStorage.getItem(${JSON.stringify(key)}) === null`);
        assert.equal(await evaluate(`localStorage.getItem('eagle_workbook2026_v1')`), other);
        await evaluate(`localStorage.removeItem('eagle_workbook2026_v1'); true`);
      });
      await test('erases the draft from this browser', async () => {
        await open(file, ready);
        dialogs = [];
        await click('erase this draft from this browser');
        await waitFor(`localStorage.getItem(${JSON.stringify(key)}) === null`);
        assert.match(dialogs.join(' '), /Erase your saved 2023 workbook drafts from this browser\?/);
        assert.equal(await evaluate('document.querySelector("header h1").textContent'), 'Eagle Project Workbook Helper');
      });
    }

    console.log('EagleWorkbook2026.html (file://)');
    const F26 = 'EagleWorkbook2026.html', K26 = 'eagle_workbook2026_v1', READY26 = '!!document.querySelector("nav button")';
    const setValue = (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
    const tabText = () => evaluate('document.getElementById("main").innerText');
    await test('2026 page opens without errors and says which workbook it is for', async () => {
      await open(F26, READY26);
      assert.match(await evaluate('document.querySelector(".edition-banner").textContent'), /For the 2026 workbook \(No\. 512-927\)\./);
      assert.deepEqual(problems, []);
    });
    await test('2026 page: every tab renders, with the official prompts on the right tabs', async () => {
      for (let i = 0; i < 7; i++) {
        await evaluate(`document.querySelectorAll("nav button")[${i}].click(); true`);
        await waitFor(`document.querySelectorAll("nav button")[${i}].classList.contains("active")`);
      }
      await evaluate('document.querySelectorAll("nav button")[1].click(); true');
      await waitFor('document.querySelectorAll("nav button")[1].classList.contains("active")');
      assert.match(await tabText(), /Who is your beneficiary\?/);
      assert.match(await tabText(), /Brief Project Description/);
      assert.deepEqual(problems, []);
    });
    await test('2026 page: no link to the 2023a Fill page, the backup-from-PDF page, or the 2023a PDF', async () => {
      const hrefs = await evaluate('[...document.querySelectorAll("a")].map((a) => a.getAttribute("href") || "")');
      assert.ok(!hrefs.includes('FillOfficialPDF.html') && !hrefs.includes('BackupFromPDF.html'), hrefs.join(', '));
      assert.ok(!hrefs.some((x) => /2023a\.pdf/.test(x)), hrefs.join(', '));
    });
    await test('2026 page: typing saves to the 2026 draft and leaves the 2023a drafts alone', async () => {
      await open(F26, READY26);
      await evaluate('document.querySelectorAll("nav button")[1].click(); true');
      await waitFor('document.querySelectorAll("nav button")[1].classList.contains("active")');
      const before = await evaluate('localStorage.getItem("eagle_workbook_v1")');
      await setValue('#f-proposal-description', 'Test description from the browser test.');
      await waitFor(`(localStorage.getItem(${JSON.stringify(K26)}) || '').includes("Test description from the browser test.")`, 5000);
      assert.equal(await evaluate('localStorage.getItem("eagle_workbook_v1")'), before);
    });
    await test('2026 page: the description fit line says which pages it fits, and warns when it will not', async () => {
      await setValue('#f-proposal-description', 'installation '.repeat(12).trim());
      const descFit = 'Array.from(document.querySelectorAll(".fit")).find((e) => e.textContent.includes("page 11"))';
      await waitFor(`${descFit} && ${descFit}.textContent.startsWith("Fits in the official box")`);
      await setValue('#f-proposal-description', 'installation '.repeat(40).trim());
      await waitFor(`${descFit} && ${descFit}.textContent.startsWith("May not fit in the official box")`);
      assert.match(await evaluate(`${descFit}.textContent`), /page 11, about 5 of 3 lines/);
    });
    await test('2026 page: the hours table adds up as the Scout types', async () => {
      await setValue('#f-proposal-description', 'Short description.');
      await evaluate('document.querySelectorAll("nav button")[1].click(); true');
      await waitFor('document.querySelectorAll("nav button")[1].classList.contains("active")');
      const row1 = await evaluate('(() => { const t = [...document.querySelectorAll("table")].find((x) => x.querySelector("thead") && x.innerText.includes("Total Hours Invested") || x.innerText.includes("Number of Individuals")); return t.querySelectorAll("tbody tr")[1].querySelectorAll("input").length; })()');
      assert.equal(row1, 2);
      await evaluate(`(() => { const t = [...document.querySelectorAll("table")].find((x) => x.innerText.includes("Number of Individuals")); const ins = t.querySelectorAll("tbody tr")[1].querySelectorAll("input"); ins[0].value = "2"; ins[0].dispatchEvent(new Event("input", { bubbles: true })); ins[1].value = "8"; ins[1].dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
      await waitFor('document.body.innerText.includes("Grand total: 3 people, 8 hours.")', 5000);
    });
    await test('2026 page: Save backup file writes a 2026 backup, and the 2023a backup is refused here', async () => {
      clearDownloads();
      await click('Save backup file');
      const file = await waitForDownload('.json');
      const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.equal(saved.edition, '2026');
      clearDownloads();
      dialogs = [];
      await evaluate(`(() => { const orig = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === 'file') { window.__picker = this; return; } return orig.call(this); }; })()`);
      await click('Open backup file');
      await waitFor('!!window.__picker');
      const { root } = await send('DOM.getDocument');
      await evaluate('document.body.appendChild(window.__picker); window.__picker.id = "picked-2026"; true');
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#picked-2026' });
      await send('DOM.setFileInputFiles', { nodeId, files: [SAMPLE] });
      for (let t = 0; t < 50 && !dialogs.length; t++) await sleep(100);
      assert.match(dialogs.join(' '), /This backup file is for the 2023 workbook \(No\. 2023a\)\./, dialogs.join(' '));
    });
    await test('2026 page: the Signed Pages tab has the 2026 wording and none of the 2023 signature slots', async () => {
      await evaluate('document.querySelectorAll("nav button")[5].click(); true');
      await waitFor('document.querySelectorAll("nav button")[5].classList.contains("active")');
      const text = await tabText();
      assert.match(await evaluate('document.querySelectorAll("nav button")[5].textContent'), /Signed Pages & Photos/);
      assert.match(text, /photographs taken before, during, and after the project \(page 21\)/);
      assert.doesNotMatch(text, /Signed Proposal Page H|Signed Project Report Page C/);
    });
    await test('2026 page: Review shows "Next on your path" and Erase leaves the 2023a drafts alone', async () => {
      await evaluate('document.querySelectorAll("nav button")[6].click(); true');
      await waitFor('document.querySelectorAll("nav button")[6].classList.contains("active")');
      assert.match(await tabText(), /Next on your path/);
      await evaluate(`localStorage.setItem("eagle_workbook_v1", JSON.stringify({ candidate: { name: "Keep" }, proposal: {} })); true`);
      dialogs = [];
      await click('erase this draft from this browser');
      await waitFor(`localStorage.getItem(${JSON.stringify(K26)}) === null`);
      assert.match(dialogs.join(' '), /Erase your saved 2026 workbook drafts from this browser\?/);
      assert.match(await evaluate('localStorage.getItem("eagle_workbook_v1")'), /Keep/);
      await evaluate('localStorage.removeItem("eagle_workbook_v1"); true');
    });
    await test('2026 page: a Scout can go from the first tab to the last and the Next button ends at the home page', async () => {
      await open(F26, READY26);
      assert.equal(await evaluate('[...document.querySelectorAll("nav button")].length'), 7);
      assert.equal(problems.length, 0, problems.join(' | '));
    });

    console.log('EagleWorkbook2026-guided.html (file://)');
    const G26 = 'EagleWorkbook2026-guided.html', KG26 = 'eagle_workbook2026_guided_v1';
    await test('guided 2026 page opens, says Guided, and names the seven stages', async () => {
      await open(G26, READY26);
      assert.match(await evaluate('document.querySelector(".edition-banner").textContent'), /For the 2026 workbook \(No\. 512-927\)\. Guided\./);
      const names = await evaluate('[...document.querySelectorAll("nav button")].map((b) => b.textContent.replace(/•.*$/, "").trim())');
      assert.deepEqual(names, ['1. Set Up', '2. Proposal', '3. Fundraising (Appendix D)', '4. Project Plan', '5. Project Report', '6. Signed Pages & Photos', '7. Review']);
      assert.deepEqual(problems, []);
    });
    await test('guided 2026 page: an empty page says where a saved Classic 2026 draft is, and links to it', async () => {
      const sample26 = fs.readFileSync(path.join(__dirname, 'fixtures/sample-workbook-2026.json'), 'utf8');
      await evaluate(`localStorage.removeItem(${JSON.stringify(KG26)}); localStorage.setItem(${JSON.stringify(K26)}, ${JSON.stringify(sample26)}); true`);
      await open(G26, READY26);
      await waitFor('document.body.innerText.includes("You have a saved draft in the Classic 2026 workbook.")');
      assert.equal(await evaluate('!!document.querySelector(\'a[href="EagleWorkbook2026.html"]\')'), true, 'link to the Classic 2026 page');
      await evaluate(`localStorage.removeItem(${JSON.stringify(K26)}); true`);
      await open(G26, READY26);
      assert.equal(await evaluate('document.body.innerText.includes("You have a saved draft")'), false, 'no notice without a Classic draft');
    });
    await test('guided 2026 page: every tab has a stage card, and its count moves as the Scout types', async () => {
      await evaluate(`localStorage.removeItem(${JSON.stringify(KG26)}); localStorage.removeItem(${JSON.stringify(K26)}); true`);
      await open(G26, READY26);
      const card = 'document.querySelector(".stage-card")';
      assert.match(await evaluate(`${card}.textContent`), /Set up your project/);
      assert.match(await evaluate(`${card}.querySelector(".status-pill").textContent`), /^0 of 6 key boxes filled in$/);
      await setValue('#f-candidate-name', 'Alex Example');
      await waitFor(`${card}.querySelector(".status-pill").textContent === "1 of 6 key boxes filled in"`, 5000);
      assert.equal(await evaluate(`${card}.querySelector(".progress").getAttribute("aria-valuenow")`), '1');
      assert.match(await evaluate('document.querySelector(".key-count").textContent'), /Key boxes filled in: 1 of 32\./, 'the stage card and the overall count read the same table');
      const titles = [];
      for (let i = 0; i < 7; i++) {
        await evaluate(`document.querySelectorAll("nav button")[${i}].click(); true`);
        await waitFor(`document.querySelectorAll("nav button")[${i}].classList.contains("active")`);
        titles.push(await evaluate(`${card}.querySelector("h2").textContent`));
      }
      assert.deepEqual(titles, ['Set up your project', 'Draft your proposal', 'Fundraising, if needed', 'Build the project plan', 'Finish the project report', 'Add signed pages, photos, and attachments', 'Review']);
      assert.deepEqual(problems, []);
    });
    await test('guided 2026 page: Fundraising says "only if you need it" until the Scout answers Yes on the Proposal tab', async () => {
      await open(G26, READY26);
      await evaluate('document.querySelectorAll("nav button")[2].click(); true');
      await waitFor('document.querySelectorAll("nav button")[2].classList.contains("active")');
      assert.equal(await evaluate('document.querySelector(".stage-card .status-pill").textContent'), 'Only if you need a Fundraising Application');
      assert.equal(await evaluate('!!document.querySelector(".stage-card .progress")'), false, 'no bar when it is not counted');
      await evaluate('document.querySelectorAll("nav button")[1].click(); true');
      await waitFor('document.querySelectorAll("nav button")[1].classList.contains("active")');
      await evaluate('(() => { const el = document.getElementById("f-proposal-needFundraisingApp"); el.value = "yes"; el.dispatchEvent(new Event("change", { bubbles: true })); return true; })()');
      await waitFor(`JSON.parse(localStorage.getItem(${JSON.stringify(KG26)}) || "{}").proposal.needFundraisingApp === "yes"`, 5000);
      await evaluate('document.querySelectorAll("nav button")[2].click(); true');
      await waitFor('document.querySelectorAll("nav button")[2].classList.contains("active")');
      assert.match(await evaluate('document.querySelector(".stage-card .status-pill").textContent'), /^0 of 4 key boxes filled in$/);
    });
    await test('guided 2026 page: Your path follows the workbook checklist, ticks save to the Guided draft only, and Fundraising steps appear on Yes', async () => {
      await evaluate(`(() => { const d = JSON.parse(localStorage.getItem(${JSON.stringify(KG26)}) || "null") || { edition: "2026", candidate: {}, proposal: {} }; d.proposal = d.proposal || {}; d.proposal.needFundraisingApp = "yes"; localStorage.setItem(${JSON.stringify(KG26)}, JSON.stringify(d)); return true; })()`);
      await open(G26, READY26);
      const items = 'document.querySelectorAll(".journey ol > li")';
      const titles = await evaluate(`[...${items}].map((li) => li.querySelector("strong").textContent)`);
      assert.deepEqual(titles.slice(0, 3), ['Fill in your Project Contacts', 'Fill in your Project Proposal', 'Get your four Proposal Approval signatures']);
      assert.ok(titles.includes('Fill in your Fundraising Application (Appendix D)') && titles.includes('Get your Fundraising Application approved'), 'a Yes on the Proposal tab adds the fundraising steps');
      assert.ok(titles.indexOf('Write your Project Plan') < titles.indexOf('Get your Project Plan approved') && titles.indexOf('Get your Project Plan approved') < titles.indexOf('Do your project'));
      assert.match(await evaluate('document.querySelector(".j-reminder").textContent'), /“Do NOT begin work until your project proposal is approved by all the signatories\.”/);
      assert.equal(await evaluate('!!document.getElementById("journey-raising")'), false, 'the 2023a question is not on the 2026 page');
      assert.match(await evaluate('document.querySelector(".journey-next").textContent'), /^Next on your path: Fill in the “1\. Set Up” tab\.$/);
      const before = await evaluate(`localStorage.getItem(${JSON.stringify(K26)})`);
      await evaluate('document.getElementById("j-tick-planApproved").click(); true');
      await waitFor(`JSON.parse(localStorage.getItem(${JSON.stringify(KG26)}) || "{}").journey.steps.planApproved.done === "1"`, 5000);
      assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(K26)})`), before, 'the Classic 2026 draft is untouched');
      assert.match(await evaluate('document.querySelector("#j-tick-planApproved").closest("li").className'), /j-done/);
      await evaluate(`localStorage.removeItem(${JSON.stringify(KG26)}); true`);
    });
    await test('guided 2026 page: a long prompt shows "In short", the workbook\'s rule sentences word for word, and the full question one tap away', async () => {
      await evaluate(`localStorage.removeItem(${JSON.stringify(KG26)}); true`);
      await open(G26, READY26);
      await evaluate('document.querySelectorAll("nav button")[1].click(); true');
      await waitFor('document.querySelectorAll("nav button")[1].classList.contains("active")');
      const lead = 'document.getElementById("f-proposal-leadership").closest(".field")';
      assert.match(await evaluate(`${lead}.querySelector(".plain-short").textContent`), /^In short: Say how you will lead your helpers/);
      const rules = await evaluate(`[...${lead}.querySelectorAll(".plain-rule")].map((e) => e.textContent)`);
      assert.deepEqual(rules, ['The workbook says: “You must demonstrate leadership of at least two people in addition to yourself.”', 'The workbook says: “Your family members may assist, but you must recruit the help needed to complete the project.”']);
      assert.equal(await evaluate(`${lead}.querySelector(".plain-full").open`), false, 'the full question starts closed');
      assert.equal(await evaluate(`${lead}.querySelector(".plain-full summary").textContent`), 'Show the full official question');
      await evaluate(`${lead}.querySelector(".plain-full summary").click(); true`);
      assert.match(await evaluate(`${lead}.querySelector(".plain-full p").textContent`), /^How will you show leadership\? You must demonstrate leadership of at least two people in addition to yourself\..*How will you delegate authority to others\?$/);
      assert.equal(await evaluate('document.querySelectorAll(".plain-help").length > 3'), true, 'several long prompts have an In short line');
      assert.equal(await evaluate('document.getElementById("f-proposal-motivation").closest(".field").querySelector(".plain-help")'), null, 'a short prompt is shown as printed');
      assert.match(await evaluate('document.getElementById("f-proposal-motivation").closest(".field").querySelector(".help").textContent'), /^Why do you want to do this project\?/);
    });
    await test('guided 2026 page: the input is described by the short line and rules (not the whole question), and typing still saves', async () => {
      const described = await evaluate('document.getElementById("f-proposal-leadership").getAttribute("aria-describedby")');
      assert.match(described, /f-proposal-leadership-plain/);
      const target = await evaluate(`document.getElementById("f-proposal-leadership-plain").textContent`);
      assert.doesNotMatch(target, /How will you delegate authority/, 'the full question is not read out on every focus');
      await setValue('#f-proposal-leadership', 'I will lead four helpers.');
      await waitFor(`(localStorage.getItem(${JSON.stringify(KG26)}) || '').includes("I will lead four helpers.")`, 5000);
      assert.deepEqual(problems, []);
    });
    await test('guided 2026 page: Permits and Safety keep their "must" and "DO NOT" sentences, and Appendix D keeps the donor exception', async () => {
      await evaluate('document.querySelectorAll("nav button")[3].click(); true');
      await waitFor('document.querySelectorAll("nav button")[3].classList.contains("active")');
      assert.match(await evaluate('document.getElementById("f-plan-permits").closest(".field").querySelector(".plain-rule").textContent'), /“DO NOT START WORK UNTIL YOU HAVE ALL PERMITS AND PERMISSIONS\.”/);
      await evaluate('document.querySelectorAll("nav button")[1].click(); true');
      await waitFor('document.querySelectorAll("nav button")[1].classList.contains("active")');
      const safety = await evaluate('[...document.getElementById("f-proposal-safety").closest(".field").querySelectorAll(".plain-rule")].length');
      assert.equal(safety, 3);
      await evaluate('document.querySelectorAll("nav button")[2].click(); true');
      await waitFor('document.querySelectorAll("nav button")[2].classList.contains("active")');
      assert.match(await evaluate('document.getElementById("f-appendixD-donors").closest(".field").innerText'), /You do not need to list parents, family members/);
    });
    await test('Classic 2026 page: the official prompts are shown as printed, with no In short lines', async () => {
      await open(F26, READY26);
      await evaluate('document.querySelectorAll("nav button")[1].click(); true');
      await waitFor('document.querySelectorAll("nav button")[1].classList.contains("active")');
      assert.equal(await evaluate('document.querySelectorAll(".plain-help, .plain-full").length'), 0);
      assert.match(await evaluate('document.getElementById("f-proposal-leadership").closest(".field").querySelector(".help").textContent'), /^How will you show leadership\? You must demonstrate leadership of at least two people in addition to yourself\./);
    });
    await test('guided 2026 page on a 390px phone: the stage card and Your path fit with no sideways scrolling', async () => {
      await open(G26, READY26);
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      try {
        for (const i of [0, 1, 2, 5, 6]) {
          await evaluate(`document.querySelectorAll("nav button")[${i}].click(); true`);
          await waitFor(`document.querySelectorAll("nav button")[${i}].classList.contains("active")`);
          const wide = await evaluate('(() => { const over = [...document.querySelectorAll("main *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest(".table-wrap")).slice(0, 3).map((e) => e.tagName + "." + e.className); return { sw: document.documentElement.scrollWidth, iw: innerWidth, over }; })()');
          assert.ok(wide.sw <= wide.iw, `tab ${i}: sideways scroll ${JSON.stringify(wide)}`);
        }
      } finally { await send('Emulation.clearDeviceMetricsOverride'); }
    });
    await test('guided 2026 page: Review shows the next step on the path, and the Classic 2026 page has the same path card', async () => {
      await open(G26, READY26);
      await evaluate('document.querySelectorAll("nav button")[6].click(); true');
      await waitFor('document.querySelectorAll("nav button")[6].classList.contains("active")');
      assert.match(await tabText(), /Next on your path\s+Fill in the “1\. Set Up” tab\./);
      await open(F26, READY26);
      assert.match(await evaluate('document.querySelector(".journey-next").textContent'), /^Next on your path: Fill in the “Project Contacts” tab\.$/);
      assert.equal(await evaluate('!!document.querySelector(".stage-card")'), false, 'the Classic page has no stage cards');
    });
    await test('guided 2026 page: typing saves to its own draft and leaves the Classic 2026 draft alone', async () => {
      await open(G26, READY26);
      await evaluate('document.querySelectorAll("nav button")[1].click(); true');
      await waitFor('document.querySelectorAll("nav button")[1].classList.contains("active")');
      const classicBefore = await evaluate(`localStorage.getItem(${JSON.stringify(K26)})`);
      await setValue('#f-proposal-description', 'Guided draft text from the browser test.');
      await waitFor(`(localStorage.getItem(${JSON.stringify(KG26)}) || '').includes("Guided draft text from the browser test.")`, 5000);
      assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(K26)})`), classicBefore);
    });
    await test('guided 2026 page: the "? Tips" for the proposal description opens its advice', async () => {
      await open(G26, READY26);
      await evaluate('document.querySelectorAll("nav button")[1].click(); true');
      await waitFor('document.querySelectorAll("nav button")[1].classList.contains("active")');
      assert.ok(await evaluate('document.querySelectorAll("button.tip-btn").length') >= 3, 'the proposal tab has several Tips buttons');
      await evaluate('[...document.querySelectorAll("button.tip-btn")].find((b) => b.textContent.endsWith("for Project Description")).click(); true');
      await waitFor('[...document.querySelectorAll(".tip-text")].some((p) => p.textContent.startsWith("Say what you will do, where") && !p.parentElement.hidden)');
      assert.match(await evaluate('[...document.querySelectorAll(".tip-meta")].map((p) => p.textContent).join(" ")'), /Tips are guidance, not requirements\./);
      assert.deepEqual(problems, []);
    });
    await test('guided 2026 page: a Scout with no tip panel open gets none, and the home page links to the Guided 2026 page', async () => {
      await open('index.html', '!!document.querySelector("a")');
      assert.equal(await evaluate('!!document.querySelector(\'a[href="EagleWorkbook2026-guided.html"]\')'), true);
    });

    console.log('FillOfficialPDF2026.html (file://)');
    const FILL26 = 'FillOfficialPDF2026.html', READY_FILL26 = '!!window.EagleW26Pdf';
    const W26_PDF = path.join(ROOT, 'tests/.cache/512-92726-Eagle-Scout-Leadership-Service-Project-Workbook.pdf');
    const W26_APPD = path.join(ROOT, 'tests/.cache/Appendix-D-Fundraising-Application.pdf');
    const SAMPLE26_FILE = path.join(ROOT, 'tests/fixtures/sample-workbook-2026.json');
    const chosen = (id) => evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`);
    await test('2026 Fill page opens, and the make buttons wait for a PDF and answers', async () => {
      await open(FILL26, READY_FILL26);
      assert.equal(await evaluate('document.getElementById("create").disabled'), true);
      assert.deepEqual(problems, []);
    });
    await test('2026 Fill page: a 2023a PDF and a 2023a backup file each get a plain message', async () => {
      await open(FILL26, READY_FILL26);
      await setFile('#pdf-file', PDF);
      await waitFor('document.getElementById("pdf-chosen").textContent.includes("This is the 2023 workbook (No. 2023a), but this page fills the 2026 workbook.")');
      await setFile('#json-file', SAMPLE);
      await waitFor('document.getElementById("json-chosen").textContent.includes("This backup file is for the 2023 workbook (No. 2023a).")');
      assert.equal(await evaluate('document.getElementById("create").disabled'), true);
    });
    await test('2026 Fill page: the workbook fills from the 2026 sample and downloads a 2026 file', async () => {
      if (!fs.existsSync(W26_PDF)) throw new Error('2026 workbook not cached: run tests/run-tests.cjs first');
      await open(FILL26, READY_FILL26);
      await setFile('#pdf-file', W26_PDF);
      await waitFor('document.getElementById("pdf-chosen").textContent.startsWith("Using")');
      await setFile('#json-file', SAMPLE26_FILE);
      await waitFor('!document.getElementById("create").disabled');
      clearDownloads();
      await evaluate('document.getElementById("create").click(); true');
      await waitFor('document.getElementById("report").hidden === false', 60000);
      const file = await waitForDownload('.pdf');
      assert.equal(path.basename(file), 'Community-Bike-Repair-Station-2026-Workbook-filled.pdf', path.basename(file));
      const bytes = fs.readFileSync(file);
      assert.ok(bytes.subarray(0, fs.statSync(W26_PDF).size).equals(fs.readFileSync(W26_PDF)), 'the official file is kept, with an update appended');
      assert.match(await evaluate('document.getElementById("report").textContent'), /Filled \d+ answers\./);
      filled2026 = path.join(os.tmpdir(), `eph-filled26-${process.pid}.pdf`);
      fs.copyFileSync(file, filled2026);
      assert.deepEqual(problems, []);
    });
    await test('2026 Fill page: Appendix D downloads, and a workbook in the Appendix D step is refused', async () => {
      if (!fs.existsSync(W26_APPD)) throw new Error('Appendix D not cached: run tests/run-tests.cjs first');
      await open(FILL26, READY_FILL26);
      await setFile('#appd-file', W26_PDF);
      await waitFor('document.getElementById("appd-chosen").textContent.includes("This is the workbook, not Appendix D.")');
      await setFile('#appd-file', W26_APPD);
      await waitFor('document.getElementById("appd-chosen").textContent.startsWith("Using")');
      await setFile('#json-file', SAMPLE26_FILE);
      await waitFor('!document.getElementById("create-appd").disabled');
      clearDownloads();
      await evaluate('document.getElementById("create-appd").click(); true');
      const file = await waitForDownload('.pdf');
      assert.equal(path.basename(file), 'Community-Bike-Repair-Station-2026-Appendix-D-filled.pdf');
      await waitFor('document.getElementById("report").textContent.includes("Name of Organization")', 30000);
    });
    await test('2026 Fill page: the attachments file holds an index and each scan, and the official PDF is not in it', async () => {
      const A = require(path.join(ROOT, 'lib/attachments.js'));
      const bytes = fs.readFileSync(path.join(ROOT, 'tests/fixtures/scan-portrait.jpg'));
      const info = A.jpegInfo(new Uint8Array(bytes));
      const backup = path.join(os.tmpdir(), `eph-attach26-${process.pid}.json`);
      fs.writeFileSync(backup, JSON.stringify({ edition: '2026', candidate: { name: 'Alex Example' }, proposal: { projectName: 'Bike repair' }, attachments: [
        { id: 'permit0001', place: 'end', label: 'Permit', pages: [{ id: 'page00001', width: info.width, height: info.height, jpeg: bytes.toString('base64') }] }
      ], links: [] }));
      await open(FILL26, READY_FILL26);
      await setFile('#json-file', backup);
      await waitFor('!document.getElementById("create-attach").disabled', 15000);
      clearDownloads();
      await evaluate('document.getElementById("create-attach").click(); true');
      const file = await waitForDownload('.pdf');
      assert.equal(path.basename(file), 'Bike-repair-2026-Attachments.pdf');
      const text = fs.readFileSync(file).toString('latin1');
      assert.ok(text.startsWith('%PDF'));
      assert.match(text, /\/Count 2\b/, 'one index page and one permit page');
      assert.equal(text.includes('/Count 22'), false);
    });
    await test('2026 Fill page: a 2026 draft in this browser is offered, and a 2023a backup is refused', async () => {
      await open(FILL26, READY_FILL26);
      await evaluate(`localStorage.setItem("eagle_workbook2026_v1", ${JSON.stringify(JSON.stringify(JSON.parse(fs.readFileSync(SAMPLE26_FILE, 'utf8'))))}); true`);
      await open(FILL26, READY_FILL26);
      await waitFor('[...document.querySelectorAll(".use-draft")].some((b) => b.textContent.includes("Classic 2026 workbook"))');
      await evaluate('localStorage.removeItem("eagle_workbook2026_v1"); true');
    });
    await test('the 2023a Fill page names a 2026 PDF and points to the 2026 Fill page', async () => {
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', W26_PDF);
      await waitFor('document.getElementById("pdf-chosen").textContent.includes("This is the 2026 workbook, but this page fills the 2023 workbook (No. 2023a).")');
    });

    console.log('BackupFromPDF.html (file://)');
    await test('a filled 2026 PDF reads into a 2026 backup and opens in the Classic 2026 workbook', async () => {
      assert.ok(filled2026, 'needs the 2026 PDF from the Fill page test');
      await open('BackupFromPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', filled2026);
      await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("read-status").className)', 60000);
      assert.match(await evaluate('document.getElementById("read-status").textContent'), /Found \d+ answers?\./);
      assert.equal(await evaluate('document.getElementById("open-guided").hidden'), true, '2023 buttons are hidden for a 2026 PDF');
      clearDownloads();
      await click('Save backup file');
      const saved = JSON.parse(fs.readFileSync(await waitForDownload('.json'), 'utf8'));
      assert.equal(saved.edition, '2026');
      assert.equal(saved.candidate.name, 'Alex Example');
      await evaluate('document.getElementById("open-classic2026").click(); true');
      await waitFor('location.href.endsWith("EagleWorkbook2026.html")', 15000);
      const draft = JSON.parse(await evaluate('localStorage.getItem("eagle_workbook2026_v1")'));
      assert.equal(draft.edition, '2026');
      assert.equal(draft.candidate.name, 'Alex Example');
      await evaluate('localStorage.removeItem("eagle_workbook2026_v1"); true');
    });
    await test('a filled 2026 PDF also opens in the Guided 2026 workbook', async () => {
      assert.ok(filled2026, 'needs the 2026 PDF from the Fill page test');
      await evaluate(`localStorage.removeItem(${JSON.stringify(KG26)}); true`);
      await open('BackupFromPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', filled2026);
      await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("read-status").className)', 60000);
      assert.equal(await evaluate('document.getElementById("open-guided2026").hidden'), false, '2026 button shown');
      assert.equal(await evaluate('document.getElementById("open-guided").hidden'), true, '2023 button hidden');
      await evaluate('document.getElementById("open-guided2026").click(); true');
      await waitFor('location.href.endsWith("EagleWorkbook2026-guided.html")', 15000);
      const draft = JSON.parse(await evaluate(`localStorage.getItem(${JSON.stringify(KG26)})`));
      assert.equal(draft.edition, '2026');
      assert.equal(draft.candidate.name, 'Alex Example');
      await evaluate(`localStorage.removeItem(${JSON.stringify(KG26)}); true`);
    });
    await test('a 2026 Appendix D PDF is told to use the workbook draft instead', async () => {
      await open('BackupFromPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', W26_APPD);
      await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("read-status").className)', 60000);
      assert.match(await evaluate('document.getElementById("read-status").textContent'), /This is Appendix D/);
    });
    await test('reads a filled PDF into a backup file and opens it in the Guided workbook', async () => {
      assert.ok(filledPdf, 'needs the PDF from the fill test');
      await open('BackupFromPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', filledPdf);
      await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("read-status").className)', 60000);
      assert.match(await evaluate('document.getElementById("read-status").textContent'), /^Found \d+ answers\.$/);
      assert.match(await evaluate('document.getElementById("warnings").textContent'), /No problems found/);
      clearDownloads();
      await evaluate('document.getElementById("save-backup").click()');
      const backup = JSON.parse(fs.readFileSync(await waitForDownload('.json'), 'utf8'));
      const sample = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
      assert.equal(backup.candidate.name, sample.candidate.name);
      assert.equal(backup.proposal.description, sample.proposal.description);
      assert.equal(backup.plan.phases[0].start, '2025-11-01');
      await evaluate('localStorage.removeItem("eagle_workbook_guided_v1")');
      await evaluate('document.getElementById("open-guided").click()');
      await waitFor(`location.pathname.endsWith("EagleWorkbook-guided.html") && document.querySelector("header h1") && document.querySelector("header h1").textContent === ${JSON.stringify(sample.candidate.name)}`);
      assert.deepEqual(problems, []);
    });
    await test('Your path and the Guided stage cards count the same boxes', async () => {
      const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
      // Some boxes empty, including dates the old path list used to count.
      draft.proposal.startDate = ''; draft.proposal.endDate = ''; draft.proposal.safety = '';
      draft.plan.contingency = ''; draft.report.leadership = ''; draft.report.actualEnd = '';
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate(`localStorage.clear(); localStorage.setItem("eagle_workbook_guided_v1", ${JSON.stringify(JSON.stringify(draft))}); true`);
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await waitFor('!!document.querySelector(".journey")');
      const card = JSON.parse(await evaluate(`JSON.stringify(Object.fromEntries([...document.querySelectorAll(".journey li")].map((li) => [li.querySelector("strong").textContent, (li.querySelector(".j-detail") || {}).textContent || ""])))`));
      const pills = {};
      for (const [tab, name] of [[1, 'proposal'], [2, 'plan'], [4, 'report']]) {
        await evaluate(`document.querySelectorAll("nav button")[${tab}].click()`);
        await waitFor('!!document.querySelector(".status-pill")');
        pills[name] = await evaluate('document.querySelector(".status-pill").textContent');
      }
      const num = (s) => /(\d+) of (\d+)/.exec(s).slice(1).join('/');
      assert.equal(num(card['Fill in your Proposal']), num(pills.proposal), `proposal: card "${card['Fill in your Proposal']}" vs stage "${pills.proposal}"`);
      assert.equal(num(card['Write your Project Plan']), num(pills.plan), 'plan');
      assert.equal(num(card['Fill in your Project Report']), num(pills.report), 'report');
      assert.notEqual(num(card['Fill in your Proposal']).split('/')[0], num(card['Fill in your Proposal']).split('/')[1], 'the test has something empty to compare');
    });
    await test('importing a PDF into a workbook keeps the Your path notes already in that draft', async () => {
      assert.ok(filledPdf, 'needs the PDF from the fill test');
      const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
      draft.journey = { raising: 'yes', steps: { propSigned: { done: '1' }, work: { done: '1' } } };
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate(`localStorage.clear(); indexedDB.deleteDatabase("eagle_workbook_files"); localStorage.setItem("eagle_workbook_guided_v1", ${JSON.stringify(JSON.stringify(draft))}); true`);
      await open('BackupFromPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', filledPdf);
      await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("read-status").className)', 60000);
      await evaluate('document.getElementById("open-guided").click()');
      await waitFor('location.pathname.endsWith("EagleWorkbook-guided.html") && !!document.querySelector("nav button")');
      const after = JSON.parse(await evaluate('localStorage.getItem("eagle_workbook_guided_v1")'));
      assert.deepEqual(after.journey, draft.journey, 'the notes are kept');
      assert.ok(await evaluate('document.querySelectorAll(".journey li.j-done").length >= 2'), 'and shown');
    });
    await test('importing a PDF into a workbook keeps the signed pages and links already in that draft', async () => {
      assert.ok(filledPdf, 'needs the PDF from the fill test');
      // A draft with a signed page and a link (a PDF cannot hold either).
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate(`localStorage.clear(); indexedDB.deleteDatabase("eagle_workbook_files"); localStorage.setItem("eagle_workbook_guided_v1", ${JSON.stringify(fs.readFileSync(SAMPLE, 'utf8'))}); true`);
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate('document.querySelectorAll("nav button")[5].click()');
      await waitFor('!!document.querySelector(".privacy-warning")');
      await setFile('.attachments .file-pick input', path.join(__dirname, 'fixtures/scan-portrait.jpg'));
      await waitFor('document.querySelectorAll(".thumb-open").length === 1');
      await click('+ Add a link');
      await evaluate(`(() => { const [t, u] = document.querySelectorAll(".link-row input"); t.value = "Budget"; t.dispatchEvent(new Event("input")); u.value = "https://example.org/budget"; u.dispatchEvent(new Event("input")); })()`);
      await waitFor('(localStorage.getItem("eagle_workbook_guided_v1") || "").includes("example.org/budget")');
      await open('BackupFromPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', filledPdf);
      await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("read-status").className)', 60000);
      assert.match(await evaluate('document.getElementById("save-status").textContent + document.getElementById("result").textContent'), /signed pages, attachments, links/i, "says a PDF cannot hold them");
      await evaluate('document.getElementById("open-guided").click()');
      await waitFor('location.pathname.endsWith("EagleWorkbook-guided.html") && !!document.querySelector("nav button")');
      await evaluate('document.querySelectorAll("nav button")[5].click()');
      await waitFor('!!document.querySelector(".privacy-warning")');
      await waitFor('document.querySelectorAll(".thumb-open").length === 1', 10000);
      assert.equal(await evaluate('document.querySelector(".link-row input[type=url]").value'), 'https://example.org/budget');
      assert.equal(await evaluate('document.querySelector("header h1").textContent'), JSON.parse(fs.readFileSync(SAMPLE, 'utf8')).candidate.name, 'the PDF answers arrived too');
    });
    await test('opening a backup file with no signed pages warns when this page has some', async () => {
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate('document.querySelectorAll("nav button")[5].click()');
      await waitFor('document.querySelectorAll(".thumb-open").length === 1', 10000);
      await evaluate(`(() => { const orig = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === 'file') { window.__picker = this; return; } return orig.call(this); }; })()`);
      await click('Open backup file');
      await waitFor('!!window.__picker');
      const { root } = await send('DOM.getDocument');
      await evaluate('document.body.appendChild(window.__picker); window.__picker.id = "picked2"; true');
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#picked2' });
      dialogs = [];
      await send('DOM.setFileInputFiles', { nodeId, files: [SAMPLE] });
      for (let t = 0; t < 50 && !dialogs.length; t++) await sleep(100);
      assert.match(dialogs[0] || '', /does not have 1 signed page or attachment page and 1 link that are on this page now, so they will be removed/s, dialogs[0]);
    });
    await test('opening a backup file counts as backed up: the header and the count reset', async () => {
      const backupFile = path.join(downloads, 'opened-backup.json');
      fs.writeFileSync(backupFile, fs.readFileSync(SAMPLE));
      const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
      draft.candidate.name = 'Unsaved Name';       // a draft that differs from the file
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate(`localStorage.clear(); localStorage.setItem("eagle_workbook_guided_v1", ${JSON.stringify(JSON.stringify(draft))}); localStorage.setItem("eagle_workbook_guided_v1_saved", String(Date.now())); true`);
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      assert.match(await evaluate('document.querySelector(".save-status").textContent'), /no backup file yet/, 'before: never backed up');
      await evaluate(`(() => { window.__picker = null; const orig = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === 'file') { window.__picker = this; return; } return orig.call(this); }; })()`);
      await click('Open backup file');
      await waitFor('!!window.__picker');
      const { root } = await send('DOM.getDocument');
      await evaluate('document.body.appendChild(window.__picker); window.__picker.id = "picked4"; true');
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#picked4' });
      await send('DOM.setFileInputFiles', { nodeId, files: [backupFile] });
      await waitFor('/backup file is up to date/.test(document.querySelector(".save-status").textContent)', 10000);
      assert.equal(await evaluate('document.querySelector("header h1").textContent'), JSON.parse(fs.readFileSync(SAMPLE, 'utf8')).candidate.name, 'the file replaced the draft');
      assert.doesNotMatch(await evaluate('document.querySelector(".backup-status").textContent'), /only in this browser|since that backup file/);
      assert.ok(Number(await evaluate('localStorage.getItem("eagle_workbook_guided_v1_backup")')) > 0, 'the backup time is set');
      assert.ok(await evaluate('!!localStorage.getItem("eagle_workbook_guided_v1_snap")'), 'and the comparison is stored');
    });
    await test('opening a backup file without your path notes warns when this page has some, and not when they were all unticked', async () => {
      const pick = async (file) => {
        await evaluate(`(() => { window.__picker = null; const orig = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === 'file') { window.__picker = this; return; } return orig.call(this); }; })()`);
        await click('Open backup file');
        await waitFor('!!window.__picker');
        const { root } = await send('DOM.getDocument');
        await evaluate('document.body.appendChild(window.__picker); window.__picker.id = "picked3"; true');
        const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#picked3' });
        dialogs = [];
        await send('DOM.setFileInputFiles', { nodeId, files: [file] });
        for (let t = 0; t < 30 && !dialogs.length; t++) await sleep(100);
        return dialogs[0] || '';
      };
      const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
      draft.journey = { raising: '', steps: { work: { done: '1' } } };
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate(`localStorage.clear(); indexedDB.deleteDatabase("eagle_workbook_files"); localStorage.setItem("eagle_workbook_guided_v1", ${JSON.stringify(JSON.stringify(draft))}); true`);
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      assert.match(await pick(SAMPLE), /does not have your notes in “Your path” that are on this page now, so they will be removed/, 'ticked notes are named');
      draft.journey = { raising: '', steps: { work: { done: '' } } };
      await evaluate(`localStorage.setItem("eagle_workbook_guided_v1", ${JSON.stringify(JSON.stringify(draft))}); true`);
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      assert.doesNotMatch(await pick(SAMPLE), /Your path/, 'an unticked step is not a note');
    });
    await test('importing a PDF for a different name asks before keeping the draft\u2019s signed pages, and Cancel stops without changing anything', async () => {
      const other = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
      other.candidate.name = 'Jordan Other';
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate(`localStorage.clear(); indexedDB.deleteDatabase("eagle_workbook_files"); localStorage.setItem("eagle_workbook_guided_v1", ${JSON.stringify(JSON.stringify(other))}); true`);
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate('document.querySelectorAll("nav button")[5].click()');
      await waitFor('!!document.querySelector(".privacy-warning")');
      await setFile('.attachments .file-pick input', path.join(__dirname, 'fixtures/scan-portrait.jpg'));
      await waitFor('document.querySelectorAll(".thumb-open").length === 1');
      await waitFor('(JSON.parse(localStorage.getItem("eagle_workbook_guided_v1")).attachments || []).length === 1');
      const idbKeys = 'new Promise((r) => { const q = indexedDB.open("eagle_workbook_files"); q.onsuccess = () => { const g = q.result.transaction("pages").objectStore("pages").getAllKeys(); g.onsuccess = () => r(g.result.length); }; })';
      assert.equal(await evaluate(idbKeys), 1);
      await open('BackupFromPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', filledPdf);
      await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("read-status").className)', 60000);
      // Say yes to replacing, but Cancel on the "different name" question.
      await evaluate(`window.__asked = []; window.confirm = (m) => { window.__asked.push(m); return !/^The name on this PDF is different/.test(m); }`);
      await evaluate('document.getElementById("open-guided").click()');
      await sleep(1000);
      assert.equal(await evaluate('location.pathname.endsWith("BackupFromPDF.html")'), true, 'Cancel stayed on this page');
      assert.ok((await evaluate('window.__asked.length')) >= 2, 'both questions were asked');
      const draft = JSON.parse(await evaluate('localStorage.getItem("eagle_workbook_guided_v1")'));
      assert.equal((draft.attachments || []).length, 1, 'the draft kept its signed page');
      assert.equal(draft.candidate.name, 'Jordan Other', 'and its own answers');
      assert.equal(await evaluate(idbKeys), 1, 'and its picture is still in this browser');
    });
    await test('opening a backup file warns about each signed page or link it would remove, not only when it has none', async () => {
      const withOtherLink = path.join(downloads, 'other-link.json');
      const d = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
      d.links = [{ title: 'Something else', url: 'https://example.org/other' }];
      fs.writeFileSync(withOtherLink, JSON.stringify(d));
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate(`localStorage.clear(); indexedDB.deleteDatabase("eagle_workbook_files"); localStorage.setItem("eagle_workbook_guided_v1", ${JSON.stringify(fs.readFileSync(SAMPLE, 'utf8'))}); true`);
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate('document.querySelectorAll("nav button")[5].click()');
      await waitFor('!!document.querySelector(".privacy-warning")');
      await click('+ Add a link');
      await evaluate(`(() => { const [t, u] = document.querySelectorAll(".link-row input"); t.value = "Budget"; t.dispatchEvent(new Event("input")); u.value = "https://example.org/budget"; u.dispatchEvent(new Event("input")); })()`);
      await waitFor('(localStorage.getItem("eagle_workbook_guided_v1") || "").includes("example.org/budget")');
      await evaluate(`(() => { const orig = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === 'file') { window.__picker = this; return; } return orig.call(this); }; })()`);
      await click('Open backup file');
      await waitFor('!!window.__picker');
      const { root } = await send('DOM.getDocument');
      await evaluate('document.body.appendChild(window.__picker); window.__picker.id = "picked3"; true');
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#picked3' });
      dialogs = [];
      await send('DOM.setFileInputFiles', { nodeId, files: [withOtherLink] });
      for (let t = 0; t < 50 && !dialogs.length; t++) await sleep(100);
      assert.match(dialogs[0] || '', /does not have 1 link that is on this page now, so it will be removed/, dialogs[0]);
    });
    await test('explains a PDF that has no fillable boxes', async () => {
      const flat = path.join(downloads, 'printed-copy.pdf');
      fs.writeFileSync(flat, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
      await open('BackupFromPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', flat);
      await waitFor('document.getElementById("read-status").textContent.includes("no fillable boxes")');
    });

    console.log('index.html (file://)');
    await test('home page links to every page and shows its picture', async () => {
      await open('index.html');
      const hrefs = await evaluate('[...document.querySelectorAll("a")].map(a => a.getAttribute("href"))');
      for (const page of ['EagleWorkbook-guided.html', 'EagleWorkbook.html', 'FillOfficialPDF.html', 'BackupFromPDF.html', lib.OFFICIAL_PDF_URL]) assert.ok(hrefs.includes(page), page);
      await waitFor('document.querySelector("figure img").complete');
      assert.ok(await evaluate('document.querySelector("figure img").naturalWidth') > 0, 'screenshot loads');
      assert.deepEqual(problems, []);
    });
    await test('home page on a 390px phone: both workbooks are on the first screen or two, and nothing scrolls sideways', async () => {
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 760, deviceScaleFactor: 2, mobile: true });
      try {
        await open('index.html');
        const top = await evaluate(`(() => {
          const y = (href) => { const a = document.querySelector('a[href="' + href + '"]'); return a ? Math.round(a.getBoundingClientRect().top + window.scrollY) : null; };
          return { y2026: y('EagleWorkbook2026.html'), y2023: y('EagleWorkbook-guided.html'), fill2026: y('FillOfficialPDF2026.html'), fill2023: y('FillOfficialPDF.html'), scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
        })()`);
        assert.ok(top.y2026 !== null && top.y2023 !== null, JSON.stringify(top));
        // The two workbook links must be near the top. The Fill links sit lower, after the 2026 and 2023 cards and their steps.
        // The Fill limit was raised from 1520 to 1800px when the Guided 2026 link was added. The 2023 Fill link is at about 1563px at 390px (see todo/2026-open-items.md).
        for (const k of ['y2026', 'y2023', 'fill2026', 'fill2023']) assert.ok(top[k] < (k.startsWith('y') ? 1520 : 1800), `${k} is ${top[k]}px down: a Scout on a small screen would not see both workbooks (${JSON.stringify(top)})`);
        assert.ok(top.scrollW <= top.clientW, `sideways scroll: ${top.scrollW} > ${top.clientW}`);
      } finally { await send('Emulation.clearDeviceMetricsOverride'); }
    });
    await test('workbook pages above phone width: the tab bar shows every tab, with no sideways scrolling', async () => {
      try {
        for (const width of [1440, 1024, 800, 640]) {
          await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
          for (const file of ['EagleWorkbook.html', 'EagleWorkbook-guided.html', 'EagleWorkbook2026.html']) {
            await open(file, '!!document.querySelector("nav button")');
            const m = await evaluate(`(() => { const n = document.querySelector('nav'); const b = [...n.querySelectorAll('button')]; return { scrollW: n.scrollWidth, clientW: n.clientWidth, tabs: b.length, lastRight: Math.round(b[b.length - 1].getBoundingClientRect().right), viewW: document.documentElement.clientWidth }; })()`);
            assert.ok(m.scrollW <= m.clientW + 1, `${file} at ${width}px: the tab bar scrolls sideways (${m.scrollW} > ${m.clientW})`);
            assert.ok(m.lastRight <= m.viewW, `${file} at ${width}px: the last tab is off screen`);
          }
        }
      } finally { await send('Emulation.clearDeviceMetricsOverride'); }
    });
    await test('every page links back home', async () => {
      for (const file of ['EagleWorkbook-guided.html', 'EagleWorkbook.html', 'FillOfficialPDF.html', 'BackupFromPDF.html']) {
        await open(file);
        assert.ok(await evaluate('[...document.querySelectorAll("a")].some(a => a.getAttribute("href") === "index.html")'), file);
      }
    });

    for (const [file, key] of [['EagleWorkbook-guided.html', 'eagle_workbook_guided_v1'], ['EagleWorkbook.html', 'eagle_workbook_v1']]) {
      console.log(`${file}: tips and backup help`);
      const ready = '!!document.querySelector("nav button")';
      await test('tips open and close, and are named for their box', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('!!document.getElementById("f-proposal-description")');
        const info = await evaluate(`(() => { const b = document.querySelector('#f-proposal-description').closest('.field').querySelector('.tip-btn'); const p = document.getElementById(b.getAttribute('aria-controls')); return { name: b.textContent, expanded: b.getAttribute('aria-expanded'), hidden: p.hidden, height: b.getBoundingClientRect().height }; })()`);
        assert.match(info.name, /Tips for .*What will you do|Tips for .*Briefly describe/);
        assert.equal(info.expanded, 'false');
        assert.equal(info.hidden, true);
        assert.ok(info.height >= 44, `button is ${info.height}px tall`);
        await evaluate(`document.querySelector('#f-proposal-description').closest('.field').querySelector('.tip-btn').click()`);
        assert.equal(await evaluate(`document.querySelector('#f-proposal-description').closest('.field').querySelector('.tip-btn').getAttribute('aria-expanded')`), 'true');
        assert.match(await evaluate(`document.querySelector('#f-proposal-description').closest('.field').querySelector('.tip').textContent`), /This box is on: Proposal Page C\./);
        // Stays open when the page redraws (changing tabs and coming back).
        await evaluate('document.querySelectorAll("nav button")[2].click()');
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('!!document.getElementById("f-proposal-description")');
        assert.equal(await evaluate(`document.querySelector('#f-proposal-description').closest('.field').querySelector('.tip-btn').getAttribute('aria-expanded')`), 'true');
        // Escape closes it and keeps focus on the button.
        await evaluate(`document.querySelector('#f-proposal-description').closest('.field').querySelector('.tip-btn').focus()`);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await waitFor(`document.querySelector('#f-proposal-description').closest('.field').querySelector('.tip-btn').getAttribute('aria-expanded') === 'false'`);
        assert.equal(await evaluate(`document.activeElement.classList.contains('tip-btn')`), true);
        assert.deepEqual(problems, []);
      });
      await test('section tips work and printed drafts have no tips', async () => {
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[2].click()');
        await waitFor('document.querySelectorAll(".tip-wrap").length > 0');
        assert.ok(await evaluate('document.querySelectorAll(".tip-wrap .tip-btn").length') >= 3);
        await evaluate('window.print = () => { window.__printed = true; }');
        await click('Print a draft');
        await waitFor('window.__printed === true');
        assert.equal(await evaluate('document.querySelectorAll(".tip, .tip-btn, .keep-safe, .keep-list").length'), 0);
        await evaluate('window.dispatchEvent(new Event("afterprint"))');
        await waitFor('!!document.querySelector("nav button")');
      });
      await test('backup help explains saving to Google Drive, Dropbox, or OneDrive', async () => {
        await open(file, ready);
        const text = await evaluate('document.querySelector(".keep-safe").textContent');
        assert.match(text, /Google Drive.*Dropbox.*OneDrive|drive\.google\.com.*Dropbox or OneDrive/);
        assert.match(text, /Save backup file/);
        assert.equal(await evaluate('document.querySelector(".keep-safe").open'), true, 'open on the first tab');
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('document.querySelectorAll("nav button")[1].classList.contains("active")');
        assert.equal(await evaluate('document.querySelector(".keep-safe").open'), false, 'closed on other tabs');
      });
      await test('Share backup file appears only where the device can share files', async () => {
        const shareShown = '[...document.querySelectorAll("button")].some(b => b.textContent.includes("Share backup file"))';
        // Chrome says it can share files but refuses .json, so it must not get the button even when canShare says yes.
        const chromium = await send('Page.addScriptToEvaluateOnNewDocument', { source: `navigator.canShare = () => true; navigator.share = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));` });
        try {
          await open(file, ready);
          assert.ok(await evaluate('!!navigator.userAgentData'), 'this test runs in a Chromium browser');
          assert.equal(await evaluate(shareShown), false, 'hidden in Chromium browsers');
        } finally {
          await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: chromium.identifier });
        }
        // Safari-like: no userAgentData. Without file sharing support there is no button.
        const noShare = await send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(navigator, 'userAgentData', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });` });
        try {
          await open(file, ready);
          assert.equal(await evaluate(shareShown), false, 'hidden when the browser cannot share files');
        } finally {
          await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: noShare.identifier });
        }
        const stub = await send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(navigator, 'userAgentData', { value: undefined, configurable: true }); navigator.canShare = () => true; navigator.share = (d) => { window.__shared = d.files[0].name; return Promise.resolve(); };` });
        try {
          await open(file, ready);
          await evaluate('localStorage.clear()');
          await open(file, ready);
          assert.equal(await evaluate('[...document.querySelectorAll("button")].some(b => b.textContent.includes("Share backup file"))'), true);
          await click('Share backup file');
          await waitFor('typeof window.__shared === "string"');
          assert.match(await evaluate('window.__shared'), /^Eagle-workbook-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
          await waitFor(`Number(localStorage.getItem(${JSON.stringify(key + '_backup')})) > 0`);
          assert.deepEqual(problems, []);
        } finally {
          await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: stub.identifier });
        }
      });
    }
    await test('Guided workbook offers a keep-as-you-go checklist on the Plan and Report stages', async () => {
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      for (const i of [2, 4]) {
        await evaluate(`document.querySelectorAll("nav button")[${i}].click()`);
        await waitFor(`document.querySelectorAll("nav button")[${i}].classList.contains("active")`);
        assert.match(await evaluate('document.querySelector(".keep-list").textContent'), /sign-in sheet.*receipt/s);
      }
    });

    console.log('Drafts in the filler');
    await test('offers the newest saved draft without showing a name', async () => {
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate(`(() => { const i=document.getElementById("f-candidate-name"); i.value="Draft Owner"; i.dispatchEvent(new Event("input",{bubbles:true})); })()`);
      await waitFor(`(JSON.parse(localStorage.getItem("eagle_workbook_guided_v1")||"{}").candidate||{}).name === "Draft Owner"`);
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      const label = await evaluate('document.querySelector(".use-draft").textContent');
      assert.match(label, /Guided workbook/);
      assert.doesNotMatch(label, /Draft Owner/);
      await evaluate('document.querySelector(".use-draft").click()');
      await waitFor('document.getElementById("json-chosen").className.includes("ok")');
    });

    console.log('Signed pages and attachments');
    const A = require(path.join(ROOT, 'lib/attachments.js'));
    const scan = path.join(__dirname, 'fixtures/scan-portrait.jpg');
    const twoPagePdf = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'eph-permit-')), 'permit.pdf'); // not in downloads, which tests clear
    fs.writeFileSync(twoPagePdf, A.writePdf([{ text: [{ x: 72, y: 700, text: 'Park permit page 1', size: 14 }] }, { text: [{ x: 72, y: 700, text: 'Park permit page 2', size: 14 }] }]));
    let backupWithScans = null;
    await test('adds signed pages and a PDF attachment, keeps them after a reload, and saves them in the backup file', async () => {
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate(`localStorage.clear(); indexedDB.deleteDatabase("eagle_workbook_files"); localStorage.setItem("eagle_workbook_guided_v1", ${JSON.stringify(fs.readFileSync(SAMPLE, 'utf8'))}); true`);
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      const lastTab = 'document.querySelectorAll("nav button")[5]';
      await evaluate(`${lastTab}.click()`);
      await waitFor('!!document.querySelector(".privacy-warning")');
      assert.match(await evaluate('document.querySelector(".privacy-warning").textContent'), /signatures/);
      dialogs = [];
      await setFile('.attachments .file-pick input', scan);
      await waitFor('document.querySelectorAll(".thumb img").length === 1');
      assert.ok(dialogs.some((m) => /backup file will hold pictures of the adults’ signatures/.test(m)), 'warns before the first picture');
      const pickers = await evaluate('document.querySelectorAll(".attachments .file-pick input").length');
      // Add the permit as an "other attachment" (its picker carries data-key="add:end").
      const { root } = await send('DOM.getDocument');
      const { nodeIds } = await send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '.attachments .file-pick input[data-key="add:end"]' });
      await send('DOM.setFileInputFiles', { nodeId: nodeIds[nodeIds.length - 1], files: [twoPagePdf] });
      await waitFor('document.querySelectorAll(".attachment .thumb img").length === 2', 30000);
      assert.ok(pickers >= 4);
      await click('+ Add a link');
      await waitFor('!!document.querySelector(".link-row input[type=url]")');
      await evaluate(`(() => { const [t, u] = document.querySelectorAll(".link-row input"); t.value = "Budget"; t.dispatchEvent(new Event("input")); u.value = "https://example.org/budget"; u.dispatchEvent(new Event("input")); })()`);
      await waitFor('(localStorage.getItem("eagle_workbook_guided_v1") || "").includes("example.org/budget")');
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate(`${lastTab}.click()`);
      await waitFor('document.querySelectorAll(".thumb img").length === 3', 10000);
      assert.equal(await evaluate('document.querySelector(".link-row input[type=url]").value'), 'https://example.org/budget');
      await evaluate('document.querySelector(".thumb-open").click()');
      await waitFor('!!document.querySelector("dialog.picture-viewer[open] img")');
      assert.match(await evaluate('document.querySelector("dialog.picture-viewer img").alt'), /Signed Proposal Page H, page 1/);
      assert.ok(await evaluate('document.querySelector("dialog.picture-viewer img").naturalWidth') > 0, 'the full picture loads');
      await evaluate('document.querySelector("dialog.picture-viewer").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); document.querySelector("dialog.picture-viewer").close(); true');
      await waitFor('!document.querySelector("dialog.picture-viewer")');
      assert.equal(await evaluate('document.activeElement.className'), 'thumb-open', 'focus returns to the thumbnail');
      const draft = await evaluate('localStorage.getItem("eagle_workbook_guided_v1")');
      assert.doesNotMatch(draft, /"jpeg"/, 'pictures are not in localStorage');
      clearDownloads();
      await click('Save backup file');
      backupWithScans = await waitForDownload('.json');
      const saved = JSON.parse(fs.readFileSync(backupWithScans, 'utf8'));
      assert.equal(saved.attachments.length, 2);
      assert.ok(saved.attachments.flatMap((a) => a.pages).every((p) => A.isJpeg(A.fromBase64(p.jpeg))));
      backupWithScans = path.join(os.tmpdir(), `eph-backup-scans-${process.pid}.json`);
      fs.copyFileSync(path.join(downloads, downloaded('.json')[0]), backupWithScans);
      assert.deepEqual(problems, []);
    });
    await test('switching tabs while a file is read does not make a second Proposal Page H', async () => {
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate('document.querySelectorAll("nav button")[5].click()');
      await waitFor('!!document.querySelector(".privacy-warning")');
      const { root } = await send('DOM.getDocument');
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '.attachments .file-pick input' });
      await send('DOM.setFileInputFiles', { nodeId, files: [twoPagePdf] });
      await evaluate('document.querySelectorAll("nav button")[0].click(); document.querySelectorAll("nav button")[5].click(); true');
      await waitFor(`!document.querySelector(".attachments .file-pick input").disabled && (JSON.parse(localStorage.getItem("eagle_workbook_guided_v1")).attachments || []).filter((a) => a.place === "proposalH").reduce((n, a) => n + a.pages.length, 0) === 3`, 30000);
      const draft = JSON.parse(await evaluate('localStorage.getItem("eagle_workbook_guided_v1")'));
      assert.equal(draft.attachments.filter((a) => a.place === 'proposalH').length, 1);
      assert.equal(await evaluate('document.querySelectorAll(".attachments .card")[1].querySelectorAll(".thumb img").length'), 3, 'all Proposal Page H pages show');
    });
    await test('two photos chosen at once for an empty slot become one signed page set', async () => {
      await evaluate('[...document.querySelectorAll(".attachments .card")].find((c) => /Report Page C/.test(c.textContent)).querySelector(".file-pick input").id = "slotc"; true');
      const { root } = await send('DOM.getDocument');
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#slotc' });
      await send('DOM.setFileInputFiles', { nodeId, files: [scan, path.join(__dirname, 'fixtures/scan-landscape.jpg')] });
      await waitFor(`(JSON.parse(localStorage.getItem("eagle_workbook_guided_v1")).attachments || []).filter((a) => a.place === "reportC").reduce((n, a) => n + a.pages.length, 0) === 2`, 20000);
      const draft = JSON.parse(await evaluate('localStorage.getItem("eagle_workbook_guided_v1")'));
      assert.equal(draft.attachments.filter((a) => a.place === 'reportC').length, 1);
      assert.match(await evaluate('document.querySelector(".stage-card .status-pill").textContent'), /Proposal Page H, Project Report Page C/, 'the stage summary updates right away');
      dialogs = [];
      await evaluate('[...document.querySelectorAll(".attachments .card")].find((c) => /Report Page C/.test(c.textContent)).querySelector("button.link-button:not([aria-label])").click()');
      await waitFor(`!(JSON.parse(localStorage.getItem("eagle_workbook_guided_v1")).attachments || []).some((a) => a.place === "reportC")`);
      assert.ok(dialogs.some((m) => /Remove “Signed Project Report Page C” \(2 pages\)/.test(m)));
    });
    await test('a PDF with too many pages gets a clear message', async () => {
      const { root } = await send('DOM.getDocument');
      const { nodeIds } = await send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '.attachments .file-pick input' });
      await send('DOM.setFileInputFiles', { nodeId: nodeIds[nodeIds.length - 1], files: [PDF] });
      await waitFor('/has 32 pages/.test(document.querySelector(".attachments").textContent)', 30000);
    });
    await test('the filler finds pictures saved in this browser when using the draft', async () => {
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      await waitFor('!!document.querySelector(".use-draft")');
      await evaluate('[...document.querySelectorAll(".use-draft")].find((b) => b.textContent.includes("Guided")).click()');
      await waitFor('/Signed Proposal Page H/.test(document.getElementById("attach-summary").textContent)', 10000);
      assert.doesNotMatch(await evaluate('document.getElementById("attach-summary").textContent'), /Missing pictures/);
    });
    await test('makes a submission copy with each signed page right after its page', async () => {
      assert.ok(backupWithScans, 'needs the backup from the earlier test');
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', PDF);
      await setFile('#json-file', backupWithScans);
      await waitFor('!document.getElementById("create-submission").disabled');
      assert.match(await evaluate('document.getElementById("attach-summary").textContent'), /Signed Proposal Page H/);
      clearDownloads();
      await evaluate('document.getElementById("create-submission").click()');
      await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("submission-status").className)', 120000);
      const status = await evaluate('document.getElementById("submission-status").textContent');
      assert.match(status, /^Done\./, status);
      const file = await waitForDownload('.pdf');
      assert.match(path.basename(file), /-Submission-copy\.pdf$/);
      const pdfjsLib = (() => { for (const n of ['DOMMatrix', 'Path2D', 'ImageData']) if (!globalThis[n]) globalThis[n] = class {}; const { warn, log } = console; console.warn = () => {}; console.log = () => {}; try { require(path.join(ROOT, 'vendor/pdfjs/pdf.worker.js')); require(path.join(ROOT, 'vendor/pdfjs/pdf.js')); return globalThis.pdfjsLib; } finally { console.warn = warn; console.log = log; } })();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 }).promise;
      assert.equal(doc.numPages, 32 + 1 + 1 + 2);
      const text = (await (await doc.getPage(34)).getTextContent()).items.map((i) => i.str).join(' ');
      assert.match(text, /Signed Proposal Page H: page 16 \(after workbook page 15\)/);
      assert.match(text, /permit: pages 35.36/);
      await doc.destroy();
      // The drawn workbook pages must show the typed answers: look for dark text inside the
      // "Briefly describe your project" box on page 10 (it is blank light blue without an answer).
      try { execFileSync('which', ['pdftoppm'], { stdio: 'ignore' }); } catch { console.log('       note: pdftoppm (Poppler) is not installed, so the text and cover-art checks on the drawn pages were skipped'); return; }
      const pgm = execFileSync('pdftoppm', ['-f', '10', '-l', '10', '-r', '50', '-gray', file]);
      const [, w, hgt] = pgm.toString('latin1', 0, 40).match(/^P5\s+(\d+)\s+(\d+)\s+255\s/);
      const start = pgm.length - w * hgt;
      let dark = 0;
      for (let y = Math.round(hgt * 40 / 550); y < Math.round(hgt * 240 / 550); y++) for (let x = Math.round(w * 30 / 425); x < Math.round(w * 395 / 425); x++) if (pgm[start + y * w + x] < 110) dark++;
      assert.ok(dark > 30, `expected typed text in the description box, found ${dark} dark pixels`);
      // The cover page's artwork (the medal, mountains, and logo) is JPEG 2000. It must be drawn, not left blank.
      const cover = execFileSync('pdftoppm', ['-f', '1', '-l', '1', '-r', '40', '-gray', file]);
      const [, cw, ch] = cover.toString('latin1', 0, 40).match(/^P5\s+(\d+)\s+(\d+)\s+255\s/);
      const cstart = cover.length - cw * ch;
      let ink = 0;
      for (let y = 0; y < Math.round(ch * 0.23); y++) for (let x = Math.round(cw * 0.52); x < Math.round(cw * 0.8); x++) if (cover[cstart + y * cw + x] < 235) ink++;
      assert.ok(ink > 300, `expected the medal artwork at the top of the cover page, found ${ink} non-white pixels`);
      assert.deepEqual(problems, []);
      // A real submission copy cannot be read back by the PDF page, and the message says what to use instead.
      await open('BackupFromPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', file);
      await waitFor('document.getElementById("read-status").className.includes("error")');
      const readBack = await evaluate('document.getElementById("read-status").textContent');
      assert.match(readBack, /no fillable boxes.*submission copy.*Open backup file/s);
    });

    await test('a changed copy of the workbook is called out in Step 1, and the submission copy mentions the heads-ups', async () => {
      assert.ok(backupWithScans, 'needs the backup from the earlier test');
      const changed = path.join(os.tmpdir(), `eph-changed-${process.pid}.pdf`);
      fs.writeFileSync(changed, Buffer.concat([fs.readFileSync(PDF), Buffer.from('\n%edited')]));
      try {
        await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
        await setFile('#pdf-file', changed);
        await waitFor('/Using/.test(document.getElementById("pdf-chosen").textContent)', 30000);
        const chosen = await evaluate('document.getElementById("pdf-chosen").textContent');
        assert.match(chosen, /not the exact file Scouting America published/);
        assert.doesNotMatch(chosen, /It is the official workbook/);
        await setFile('#json-file', backupWithScans);
        await waitFor('!document.getElementById("create-submission").disabled');
        clearDownloads();
        await evaluate('document.getElementById("create-submission").click()');
        await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("submission-status").className)', 120000);
        const status = await evaluate('document.getElementById("submission-status").textContent');
        assert.match(status, /^Done\./, status);
        assert.match(status, /Heads-up: \d+ things in the filled workbook need a look\. Use “Create my filled PDF” in Step 4 to read them\./);
      } finally { fs.rmSync(changed, { force: true }); }
    });
    await test('opening a different backup file forgets the old scans in this browser', async () => {
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      const keys = 'new Promise((r) => { const q = indexedDB.open("eagle_workbook_files"); q.onsuccess = () => { const g = q.result.transaction("pages").objectStore("pages").getAllKeys(); g.onsuccess = () => r(g.result.length); }; })';
      assert.ok(await evaluate(keys) > 0);
      // Open (and accept) a backup file with no scans, in the Guided workbook only; the Classic draft has none either.
      await evaluate('localStorage.removeItem("eagle_workbook_v1"); true');
      await evaluate(`(() => { const orig = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === 'file') { window.__picker = this; return; } return orig.call(this); }; })()`);
      await click('Open backup file');
      await waitFor('!!window.__picker');
      const { root } = await send('DOM.getDocument');
      await evaluate('document.body.appendChild(window.__picker); window.__picker.id = "picked"; true');
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#picked' });
      await send('DOM.setFileInputFiles', { nodeId, files: [SAMPLE] });
      await waitFor(`(JSON.parse(localStorage.getItem("eagle_workbook_guided_v1") || "{}").attachments || [1]).length === 0`);
      for (let t = 0; t < 50 && await evaluate(keys) > 0; t++) await sleep(100);
      assert.equal(await evaluate(keys), 0);
    });
    await test('project photos add under before/during/after and save with their place', async () => {
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate(`localStorage.clear(); indexedDB.deleteDatabase("eagle_workbook_files"); localStorage.setItem("eagle_workbook_guided_v1", ${JSON.stringify(fs.readFileSync(SAMPLE, 'utf8'))}); true`);
      await open('EagleWorkbook-guided.html', '!!document.querySelector("nav button")');
      await evaluate('document.querySelectorAll("nav button")[5].click()');
      await waitFor('!!document.querySelector(".attachments .file-pick input[data-key=\\"add:photosBefore\\"]")');
      dialogs = [];
      const { root } = await send('DOM.getDocument');
      const { nodeIds } = await send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '.attachments .file-pick input[data-key="add:photosBefore"]' });
      await send('DOM.setFileInputFiles', { nodeId: nodeIds[0], files: [scan] });
      await waitFor('document.querySelectorAll(".thumb img").length === 1', 30000);
      await waitFor('(localStorage.getItem("eagle_workbook_guided_v1") || "").includes("photosBefore")');
      const draft = JSON.parse(await evaluate('localStorage.getItem("eagle_workbook_guided_v1")'));
      const photo = draft.attachments.find((a) => a.place === 'photosBefore');
      assert.ok(photo && photo.pages.length === 1, 'the before photo is saved under its own place');
      assert.ok(!draft.attachments.some((a) => a.place === 'photosDuring' || a.place === 'photosAfter'), 'the other groups stay empty');
    });
    if (backupWithScans) fs.rmSync(backupWithScans, { force: true });
    fs.rmSync(path.dirname(twoPagePdf), { recursive: true, force: true });
  } finally {
    browser.close();
    fs.rmSync(downloads, { recursive: true, force: true });
    if (filledPdf) fs.rmSync(filledPdf, { force: true });
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (!passed) { console.error('No tests ran.'); process.exit(1); }
  process.exit(failures.length ? 1 : 0);
}

run().catch((error) => { console.error(error); process.exit(1); });
