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
  const close = () => { try { ws.close(); } catch {} proc.kill(); setTimeout(() => fs.rmSync(profile, { recursive: true, force: true }), 500); };
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
      assert.equal(await evaluate('document.getElementById("project-name").value'), 'Boathouse Rack and Launch Improvements');
      clearDownloads();
      await evaluate('document.getElementById("create").click()');
      await waitFor('/\\b(ok|error)\\b/.test(document.getElementById("status").className)', 60000);
      const status = await evaluate('document.getElementById("status").textContent');
      assert.match(status, /^Done\./, status);
      const file = await waitForDownload('.pdf');
      assert.equal(path.basename(file), 'Boathouse-Rack-and-Launch-Improvements-Workbook-filled.pdf');
      const bytes = fs.readFileSync(file);
      assert.ok(bytes.subarray(0, fs.statSync(PDF).size).equals(fs.readFileSync(PDF)), 'download is the official PDF plus an update');
      const report = await evaluate('document.getElementById("report").textContent');
      assert.match(report, /Filled \d+ answers\./);
      assert.match(report, /Printed names next to the approval signature lines/);
      assert.deepEqual(problems, []);
      filledPdf = path.join(os.tmpdir(), `eph-filled-${process.pid}.pdf`);
      fs.copyFileSync(file, filledPdf);
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
    await test('says right away when the chosen PDF is not the workbook', async () => {
      const other = path.join(downloads, 'some-other.pdf');
      fs.writeFileSync(other, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
      await open('FillOfficialPDF.html', '!!window.EagleOfficialPdf');
      await setFile('#pdf-file', other);
      await waitFor('document.getElementById("pdf-chosen").textContent.includes("not the official Eagle Scout Service Project Workbook")');
      await setFile('#pdf-file', PDF);
      await waitFor('document.getElementById("pdf-chosen").textContent.includes("It is the official workbook No. 2023a")');
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
      await test('erases the draft from this browser', async () => {
        await open(file, ready);
        dialogs = [];
        await click('erase this draft from this browser');
        await waitFor(`localStorage.getItem(${JSON.stringify(key)}) === null`);
        assert.match(dialogs.join(' '), /Erase your saved drafts/);
        assert.equal(await evaluate('document.querySelector("header h1").textContent'), 'Eagle Project Workbook Helper');
      });
    }

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
  } finally {
    browser.close();
    fs.rmSync(downloads, { recursive: true, force: true });
    if (filledPdf) fs.rmSync(filledPdf, { force: true });
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
}

run().catch((error) => { console.error(error); process.exit(1); });
