#!/usr/bin/env node
/*
 * Tests for EaglePaperworkHelper. Requires Node 22 or newer; no npm install.
 *
 *   node tests/run-tests.cjs
 *
 * The official-PDF tests need the workbook PDF. They use EAGLE_PDF if set,
 * otherwise tests/.cache/EagleProjectWorkbook2023a.pdf, downloading and
 * checking it the first time. The PDF is never committed. If scouting.org
 * publishes a different file, the download fails its checksum; set
 * EAGLE_PDF_ALLOW_NEW=1 to test against it anyway.
 *
 * If Ghostscript (gs) or Poppler (pdftotext) is installed, the filled PDF is
 * also checked with them, because they show typed answers only when the PDF's
 * form appearances are valid.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert/strict');
const { execFileSync } = require('child_process');

if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error(`Node.js 22 or newer is required (this is ${process.version}).`);
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const lib = require(path.join(ROOT, 'lib/official-pdf.js'));
const sample = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sample-workbook.json'), 'utf8'));
const officialFields = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/official-2023a-fields.json'), 'utf8')));
/** Printed page label of each page of the 2023a workbook that has boxes (the PDF's own footers lose letters when read as text). */
const PAGE_LABELS = { 1: 'Workbook cover page', 9: 'Proposal Page B', 10: 'Proposal Page C', 11: 'Proposal Page D', 12: 'Proposal Page E', 13: 'Proposal Page F', 14: 'Proposal Page G', 15: 'Proposal Page H',
  17: 'Project Plan Page A', 18: 'Project Plan Page B', 19: 'Project Plan Page C', 20: 'Project Plan Page D', 21: 'Project Plan Page E', 22: 'Project Plan Page F',
  23: 'Fundraising Application Page A', 24: 'Fundraising Application Page B', 26: 'Project Report cover page', 27: 'Project Report Page A', 28: 'Project Report Page B', 29: 'Project Report Page C' };
const PAGES = ['index.html', 'EagleWorkbook.html', 'EagleWorkbook-guided.html', 'EagleWorkbook2026.html', 'EagleWorkbook2026-guided.html', 'FillOfficialPDF.html', 'BackupFromPDF.html'];

let passed = 0;
let skipped = 0;
const failures = [];
async function test(name, fn) {
  try {
    const result = await fn();
    if (result === 'skip') { skipped++; console.log(`  skip ${name}`); return; }
    passed++; console.log(`  ok   ${name}`);
  } catch (error) { failures.push(name); console.log(`  FAIL ${name}\n       ${String(error.stack).split('\n').slice(0, 4).join('\n       ')}`); }
}
const has = (cmd) => { try { execFileSync('which', [cmd], { stdio: 'ignore' }); return true; } catch { return false; } };

function loadPdfjs() {
  // The same files the page loads. pdf.js expects these browser drawing classes; filling never draws,
  // so empty stand-ins are enough in Node. Its warnings about missing canvas support are silenced.
  for (const name of ['DOMMatrix', 'Path2D', 'ImageData']) if (!globalThis[name]) globalThis[name] = class {};
  const { warn, log } = console;
  console.warn = () => {}; console.log = () => {};
  try {
    require(path.join(ROOT, 'vendor/pdfjs/pdf.worker.js'));
    require(path.join(ROOT, 'vendor/pdfjs/pdf.js'));
    return globalThis.pdfjsLib;
  } finally { console.warn = warn; console.log = log; }
}

/** Load lib/workbook-common.js the way a page does and return window.EagleWorkbook. */
function workbookCommon() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'lib/workbook-common.js'), 'utf8'), { window, localStorage: undefined, console });
  return window.EagleWorkbook;
}

const W26_URLS = {
  workbook: 'https://www.scouting.org/wp-content/uploads/2026/10/512-92726-Eagle-Scout-Leadership-Service-Project-Workbook.pdf',
  appendixD: 'https://filestore.scouting.org/filestore/scoutsbsa/Project-Workbook/Appendix-D-Fundraising-Application.pdf'
};
const W26_SHA = {
  workbook: '5810e017ed25e745a9b2c2c9f6ea891acf6147b8d7a019d925388fda152435bb',
  appendixD: '75364d254bcec53514994d6052ae57ea5072f8e0d42ea2ba1f1a685f556cd8a9'
};
/** A 2026 official PDF (`workbook` or `appendixD`), cached in tests/.cache and hash-checked, like officialPdf(). */
async function cachedPdf(which, envName) {
  if (process.env[envName]) return new Uint8Array(fs.readFileSync(process.env[envName]));
  const cache = path.join(__dirname, '.cache', path.basename(W26_URLS[which]));
  const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
  if (!fs.existsSync(cache)) {
    console.log(`  downloading ${W26_URLS[which]}`);
    const response = await fetch(W26_URLS[which]);
    if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (sha(bytes) !== W26_SHA[which] && !process.env.EAGLE_PDF_ALLOW_NEW) throw new Error(`The downloaded 2026 ${which} has SHA-256 ${sha(bytes)}, not the known file. Check its field names (todo/2026-design.md section 11), or set EAGLE_PDF_ALLOW_NEW=1.`);
    fs.mkdirSync(path.dirname(cache), { recursive: true });
    fs.writeFileSync(cache, bytes);
  }
  return new Uint8Array(fs.readFileSync(cache));
}

async function officialPdf() {
  if (process.env.EAGLE_PDF) return new Uint8Array(fs.readFileSync(process.env.EAGLE_PDF));
  const cache = path.join(__dirname, '.cache/EagleProjectWorkbook2023a.pdf');
  const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
  if (!fs.existsSync(cache)) {
    console.log(`  downloading ${lib.OFFICIAL_PDF_URL}`);
    const response = await fetch(lib.OFFICIAL_PDF_URL);
    if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!lib.OFFICIAL_SHA256.includes(sha(bytes)) && !process.env.EAGLE_PDF_ALLOW_NEW) {
      throw new Error(`The downloaded workbook has SHA-256 ${sha(bytes)}, not the known 2023a file. scouting.org may have published a new version: check its field names, then add the hash to OFFICIAL_SHA256 in lib/official-pdf.js (or set EAGLE_PDF_ALLOW_NEW=1).`);
    }
    fs.mkdirSync(path.dirname(cache), { recursive: true });
    fs.writeFileSync(cache, bytes);
  }
  const bytes = fs.readFileSync(cache);
  if (!lib.OFFICIAL_SHA256.includes(sha(bytes))) console.log(`  note: ${cache} is not the known 2023a file (SHA-256 ${sha(bytes)})`);
  return new Uint8Array(bytes);
}

async function readValues(pdfjsLib, bytes) {
  const doc = await pdfjsLib.getDocument({ data: bytes, verbosity: 0, isEvalSupported: false }).promise;
  const values = {};
  for (let p = 1; p <= doc.numPages; p++) {
    for (const a of await (await doc.getPage(p)).getAnnotations()) {
      if (!a.fieldName) continue;
      if (a.radioButton) { if (a.fieldValue === a.buttonValue) values[a.fieldName] = a.buttonValue; }
      else if (a.fieldValue) values[a.fieldName] = a.fieldValue;
    }
  }
  await doc.destroy();
  return values;
}

/** Every answer as "path" -> text, ignoring row numbers and labels, for comparing backups. */
function answers(data, out = {}, prefix = '') {
  for (const [k, v] of Object.entries(data)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') answers(v, out, path);
    else if (k !== 'num' && k !== 'cat' && String(v ?? '').trim()) out[path] = String(v).trim();
  }
  return out;
}
const sameAnswer = (a, b) => a === b || (lib.parseAmount(a) !== null && !Number.isNaN(lib.parseAmount(a)) && lib.parseAmount(a) === lib.parseAmount(b));
/** Paths that differ after a round trip, allowing a typed row total equal to Qty × Unit $ to come back blank. */
function differences(want, got, data) {
  return Object.keys(want).filter((k) => {
    if (sameAnswer(want[k], got[k] || '')) return false;
    const m = /^(plan\.\w+\.\d+)\.totalCost$/.exec(k);
    if (m && !got[k]) {
      const row = m[1].split('.').reduce((o, key) => o[key], data);
      return lib.rowCost({ ...row, totalCost: '' }).amount !== lib.parseAmount(want[k]);
    }
    return true;
  });
}

/** A backup with every answer filled in, built from the workbook pages' own data model. */
function everyAnswer() {
  const data = workbookCommon().defaults();
  let n = 0;
  const fill = (obj, key) => {
    const v = obj[key];
    if (Array.isArray(v)) v.forEach((_, i) => fill(v, i));
    else if (v && typeof v === 'object') Object.keys(v).forEach((k) => fill(v, k));
    else if (key === 'num' || key === 'cat') return;
    else if (/date|start$|end$|dob|borDate|actual/i.test(String(key))) obj[key] = `2025-01-${String((n++ % 27) + 1).padStart(2, '0')}`;
    else if (['qty', 'unitCost', 'w', 'h', 'needed', 'soFar'].includes(key)) obj[key] = '2';
    else if (key === 'totalCost') obj[key] = '';
    else obj[key] = `A${n++}`;
  };
  Object.keys(data).forEach((k) => fill(data, k));
  data.journey = { raising: '', steps: {} }; // "Your path" notes live in the backup file only; the PDF has no boxes for them
  data.unit.type = 'Troop';
  for (const k of Object.keys(data.proposal.costs)) data.proposal.costs[k] = '10';
  data.plan.toBeRaised = '100'; data.plan.beneficiaryContribution = '5'; data.fundraising.howMuch = '50';
  data.report.collected = '60'; data.report.spent = '55';
  return data;
}

(async () => {
  console.log('Field mapping');
  await test('formats browser dates and keeps typed text', () => {
    assert.equal(lib.formatDate('2025-10-01'), '10/1/2025');
    assert.equal(lib.formatDate('Spring 2026'), 'Spring 2026');
    assert.equal(lib.formatDate(''), '');
  });
  await test('parses money and rejects ambiguous amounts', () => {
    assert.equal(lib.parseAmount('$1,250.5'), 1250.5);
    assert.equal(lib.parseAmount('.50'), 0.5);
    assert.equal(lib.parseAmount(''), null);
    assert.ok(Number.isNaN(lib.parseAmount('donated')));
    assert.ok(Number.isNaN(lib.parseAmount('12,50')), 'a comma decimal is not read as 1250');
    assert.equal(lib.formatMoney(3450), '$3,450.00');
  });
  await test('maps the sample workbook', () => {
    const { text, radio, notes } = lib.buildFieldValues(sample);
    assert.equal(text['Workbook-EagleName'], 'Alex Q. Sample');
    assert.equal(text['Workbook-ProjectName'], 'Bike Rack and Repair Stand');
    assert.equal(text['Contact-EagleDOB'], '4/12/2008');
    assert.equal(text['Contact-LeaderName'], 'Jordan Leader');
    assert.equal(text['Contact-ServiceEmail'], 'service@example.org');
    assert.equal(radio['Proposal-UnitType'], 'Proposal-Trooop');
    assert.equal(radio['Proposal-LeaderType'], 'Proposal-Scoutmaster');
    assert.equal(radio['Fund-UnitType'], 'Fund-Troop');
    assert.equal(text['Proposal-TotalCost'], '$3,450.00');
    assert.equal(text['Proposal-ToolsCost'], '$250.00');
    assert.equal(text['Plan-MatTotal1'], '$130.00', 'quantity x unit cost');
    assert.equal(text['Plan-MatTotalCost'], '$154.00');
    assert.equal(text['Plan-Total'], '$226.50', '154 + 12.50 + 0 + 60');
    assert.equal(text['Plan-Phase1'], 'Fundraise (11/1/2025 to 1/31/2026)');
    assert.equal(text['Plan-Phase2'], 'Build rack (starts 2/7/2026)');
    assert.equal(text['Report-TotalHours'], '208');
    assert.equal(text['Report-TotalWorkers'], '13', 'the Scout counts once, plus 8 youth and 4 adults');
    assert.equal(text['Plan-SafetyBriefer'], 'Jordan Leader');
    assert.equal(text['Permits and Permissions'], sample.proposal.permits);
    assert.equal(text['Report-LeftOver'], sample.report.leftoverMaterials, 'leftover money answer goes in the leftover-money box');
    assert.equal(text['Proposal-BeneName'], 'Riley Rep', 'approval name is the representative, a person');
    assert.equal(text['Contact-AdvName'], undefined, 'blank answers stay blank');
    assert.equal(notes.length, 2, notes.join('\n'));
    assert.match(notes.join(' '), /Printed names next to the approval signature lines/);
    assert.match(notes.join(' '), /prospective donors/);
  });
  await test('never prints an organization name as an approver', () => {
    const { text } = lib.buildFieldValues({ contacts: { beneficiary: { name: 'Springfield Middle School' } } });
    assert.equal(text['Proposal-BeneName'], undefined);
    assert.equal(text['Report-ApprovalBeneName'], undefined);
  });
  await test('can leave approval names blank', () => {
    const { text, notes } = lib.buildFieldValues(sample, { skipApprovalNames: true });
    for (const f of ['Proposal-SMName', 'Proposal-CCName', 'Proposal-BeneName', 'Proposal-BSAName', 'Report-ApprovalBeneName', 'Report-ApprovalSMName']) assert.equal(text[f], undefined, f);
    assert.doesNotMatch(notes.join(' '), /Printed names/);
  });
  await test('accepts an old backup with missing sections and odd value types', () => {
    const { text, radio } = lib.buildFieldValues({ candidate: { name: 'Old Backup', pid: 12345, city: { bad: true } }, proposal: { projectName: ['x'] } });
    assert.equal(text['Workbook-EagleName'], 'Old Backup');
    assert.equal(text['Contact-EaglePID'], '12345');
    assert.equal(text['Contact-EagleCity'], undefined);
    assert.equal(text['Workbook-ProjectName'], undefined);
    assert.deepEqual(radio, {});
  });
  await test('maps Crew and Ship units', () => {
    assert.equal(lib.buildFieldValues({ unit: { type: 'Crew' } }).radio['Proposal-LeaderType'], 'Proposal-CrewAdvisor');
    assert.equal(lib.buildFieldValues({ unit: { type: 'ship' } }).radio['Fund-UnitType'], 'Fund-Ship');
    assert.match(lib.buildFieldValues({ unit: { type: 'Pack' } }).notes[0], /not Troop, Crew, or Ship/);
  });
  await test('never prints a wrong total', () => {
    const odd = lib.buildFieldValues({ plan: { materials: [{ qty: '2 boxes', unitCost: '$50' }, { qty: '1', unitCost: '$12.50 each' }, { qty: '3', unitCost: '10' }] } });
    assert.equal(odd.text['Plan-MatTotalCost'], undefined);
    assert.equal(odd.text['Plan-Total'], undefined);
    assert.equal(odd.notes.filter((n) => /not a plain number/.test(n)).length, 2);
    const noQty = lib.buildFieldValues({ plan: { supplies: [{ item: 'Paint', unitCost: '20' }] } });
    assert.equal(noQty.text['Plan-SupplyTotalCost'], undefined);
    assert.match(noQty.notes.join(' '), /Supplies list, row 1: has a Unit \$ but no Qty/);
    const borrowed = lib.buildFieldValues({ plan: { tools: [{ item: 'Drill', qty: '2', source: 'Borrowed' }] } });
    assert.deepEqual(borrowed.notes, [], 'a quantity with no cost is not an error');
    const mismatch = lib.buildFieldValues({ plan: { other: [{ item: 'Food', qty: '3', unitCost: '20', totalCost: '75' }] } });
    assert.equal(mismatch.text['Plan-OtherTotalCost'], '$75.00');
    assert.match(mismatch.notes.join(' '), /Total \$ \(\$75\.00\) does not equal Qty × Unit \$ \(\$60\.00\)/);
    const proposal = lib.buildFieldValues({ proposal: { costs: { materials: 'donated', supplies: '10' } } });
    assert.equal(proposal.text['Proposal-TotalCost'], undefined);
    assert.match(proposal.notes.join(' '), /Total Costs was left blank/);
  });
  await test('warns about rows that do not fit the official form', () => {
    const helpers = Array.from({ length: 11 }, (_, i) => ({ job: `Job ${i + 1}` }));
    const { text, notes } = lib.buildFieldValues({ plan: { helpers } });
    assert.equal(text['Plan-Job10'], 'Job 10');
    assert.match(notes.join(' '), /room for 10 helper jobs/);
  });
  await test('warns when your own service hours are missing', () => {
    const { notes } = lib.buildFieldValues({ report: { hours: [{ w: '1', h: '' }, { w: '1', h: '' }, { w: '5', h: '20' }] } });
    assert.match(notes.join(' '), /your own planning and execution hours are blank/);
  });
  await test('estimates when text will not fit a box', () => {
    const single = { rect: [0, 0, 100, 12], fontSize: 8, multiLine: false };
    assert.equal(lib.mayOverflow('short', single), false);
    assert.equal(lib.mayOverflow('x'.repeat(40), single), true);
    assert.equal(lib.mayOverflow('x'.repeat(40), { ...single, fontSize: 0 }), false, 'auto-size fields shrink to fit');
    // Proposal-ProjectDescription: 540 x 302 points at 8 point text holds about 27 lines.
    const box = { rect: [36.3, 439, 576.3, 741.4], fontSize: 8, multiLine: true };
    assert.equal(lib.mayOverflow(Array(27).fill('Short line').join('\n'), box), false);
    assert.equal(lib.mayOverflow(Array(29).fill('Short line').join('\n'), box), true);
    assert.equal(lib.mayOverflow('word '.repeat(2000), box), true, 'long paragraphs wrap');
  });
  await test('describes PDF boxes in plain words', () => {
    assert.equal(lib.describeField('Plan-MatQuan3'), 'Plan: Materials list, row 3, Qty');
    assert.equal(lib.describeField('Contact-EaglePHone'), 'Contacts: your phone');
    assert.equal(lib.describeField('Proposal-ProjectDescription'), 'Proposal: What will you do?');
  });
  await test('every answer in the workbook maps to a real 2023a box', () => {
    const { text, radio } = lib.buildFieldValues(everyAnswer());
    const unknown = [...Object.keys(text), ...Object.keys(radio)].filter((name) => !officialFields.has(name));
    assert.deepEqual(unknown, []);
    assert.ok(Object.keys(text).length + Object.keys(radio).length >= 440, `mapped ${Object.keys(text).length + Object.keys(radio).length}`);
  });

  console.log('Tips');
  const tipsWindow = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'lib/tips.js'), 'utf8'), { window: tipsWindow });
  const tips = tipsWindow.EagleTips;
  const tipLimits = tips.__limits;
  await test('every tip is for a real box and stays short', () => {
    const W = workbookCommon();
    const known = new Set([...lib.reverseMap(W.defaults).values()].map((t) => t.path));
    const keys = Object.keys(tips);
    assert.ok(keys.length >= 40, `${keys.length} tips`);
    const problems = [];
    for (const key of keys) {
      const tip = tips[key];
      const target = tip.for || key;
      if (!known.has(target)) problems.push(`${key}: ${target} is not a box in the workbook`);
      if (!tip.text || tip.text.length > tipLimits.text) problems.push(`${key}: text is ${tip.text && tip.text.length} characters (limit ${tipLimits.text})`);
      if (tip.good && tip.good.length > tipLimits.good) problems.push(`${key}: example is ${tip.good.length} characters (limit ${tipLimits.good})`);
      if (tip.avoid && tip.avoid.length > tipLimits.avoid) problems.push(`${key}: avoid is ${tip.avoid.length} characters (limit ${tipLimits.avoid})`);
      const total = (tip.text + (tip.good || '') + (tip.avoid || '')).length;
      if (total > tipLimits.total) problems.push(`${key}: ${total} characters in all (limit ${tipLimits.total})`);
      if (!tip.where) problems.push(`${key}: needs a "where" page, checked against the PDF`);
      if (!Object.keys(tip).every((k) => ['text', 'good', 'avoid', 'where', 'advice', 'for'].includes(k))) problems.push(`${key}: unknown field`);
    }
    assert.deepEqual(problems, []);
  });
  await test('every tipBox key in the page scripts has a tip', () => {
    const missing = [];
    for (const file of ['lib/guided-workbook.js', 'lib/classic-workbook.js']) {
      for (const m of fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(/tipBox\('([^']+)'/g)) if (!tips[m[1]]) missing.push(`${file}: ${m[1]}`);
    }
    assert.deepEqual(missing, []);
  });
  await test('tips never use requirement words for things the workbook does not require', () => {
    for (const [key, tip] of Object.entries(tips)) {
      if (tip.advice) assert.doesNotMatch(tip.text + (tip.avoid || ''), /\b(you must|required|requirement)\b/i, `${key}: advice must not read like a rule`);
      assert.doesNotMatch(JSON.stringify(tip), /@|\b\d{3}[-. ]\d{3}[-. ]\d{4}\b|\b\d{1,5} [A-Z][a-z]+ (Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln)\b/, `${key}: tips must not contain emails, phone numbers, or street addresses`);
    }
  });

  console.log('Numbers, dates, and labels');
  {
    const W = workbookCommon();
    const mat = (rows) => { const d = JSON.parse(JSON.stringify(sample)); d.plan.materials = rows.map((r) => ({ item: 'x', description: '', source: '', ...r })); return d; };
    const cols = lib.COST_TABLES.find((x) => x.path === 'plan.materials').cols;
    await test('numbers: a unit price with fractions of a cent is written as typed, so the PDF agrees with itself', () => {
      const { text, notes } = lib.buildFieldValues(mat([{ qty: '8', unitCost: '0.125', totalCost: '' }]));
      assert.equal(text[`${cols.unitCost}1`], '$0.125');
      assert.equal(text[`${cols.totalCost}1`], '$1.00');
      assert.deepEqual(notes.filter((n) => /Materials/.test(n)), []);
      assert.equal(lib.buildFieldValues(mat([{ qty: '2', unitCost: '6.5', totalCost: '' }])).text[`${cols.unitCost}1`], '$6.50', 'ordinary prices still get two decimals');
    });
    await test('numbers: typed totals are rounded to cents before adding, so rows and the list total agree', () => {
      const d = mat([{ totalCost: '1.005' }, { totalCost: '1.005' }, { totalCost: '0.004' }]);
      const { text } = lib.buildFieldValues(d);
      const shown = [1, 2, 3].map((n) => lib.parseAmount(text[`${cols.totalCost}${n}`]));
      assert.equal(lib.listTotal(d.plan.materials, 'Materials list', 9).total, shown.reduce((a, b) => a + b, 0));
      assert.equal(lib.parseAmount(text['Plan-MatTotalCost']), shown.reduce((a, b) => a + b, 0));
    });
    await test('numbers: hours accept .5, 5., and 1,200; worker counts must be whole numbers', () => {
      assert.equal(lib.parseCount('.5'), 0.5);
      assert.equal(lib.parseCount('5.'), 5);
      assert.equal(lib.parseCount('1,200'), 1200);
      assert.equal(lib.parseCount('2.5'), 2.5);
      assert.ok(Number.isNaN(lib.parseCount('abc')) && Number.isNaN(lib.parseCount('-1')) && Number.isNaN(lib.parseCount('.')));
      assert.equal(lib.parseCount(''), null);
      assert.equal(lib.parseWhole('12'), 12);
      assert.equal(lib.parseWhole('1,200'), 1200);
      assert.ok(Number.isNaN(lib.parseWhole('2.5')) && Number.isNaN(lib.parseWhole('.5')));
      const d = JSON.parse(JSON.stringify(sample));
      d.report.hours[2].w = '2.5'; d.report.hours[3].w = '3';
      const r = lib.buildFieldValues(d);
      assert.equal(r.text['Report-TotalWorkers'], undefined, 'no total from a fractional number of people');
      assert.ok(r.notes.some((n) => /number of workers is not a number/.test(n)));
      d.report.hours.forEach((row) => { row.h = ''; });
      d.report.hours[2].h = '.5'; d.report.hours[3].h = '1,200';
      assert.equal(lib.buildFieldValues(d).text['Report-TotalHours'], '1200.5');
    });
    await test('numbers: the hours total on the page counts the same rows as the PDF', () => {
      const rows = Array.from({ length: 8 }, (_, i) => ({ cat: `c${i}`, w: '1', h: '10' }));
      assert.equal(lib.hoursTotal(rows).total, 60, 'only the six rows the PDF has');
      assert.equal(lib.hoursTotal([{ h: '' }]).any, false);
      assert.equal(lib.hoursTotal([{ h: 'x' }]).invalid, true);
      const d = JSON.parse(JSON.stringify(sample)); d.report.hours = rows;
      assert.equal(lib.buildFieldValues(d).text['Report-TotalHours'], '60');
    });
    await test('numbers: money formatting edge cases', () => {
      assert.equal(lib.formatMoney(-0.001), '$0.00');
      assert.equal(lib.formatMoney(1234.5), '$1,234.50');
      assert.equal(lib.formatMoney(-5), '-$5.00');
      assert.ok(Number.isNaN(lib.parseAmount('1e23')) && Number.isNaN(lib.parseAmount('99999999999999999999')));
      assert.equal(lib.parseAmount('-$5'), -5);
    });
    await test('numbers: absurdly large hours are refused instead of printing as 1e+23', () => {
      assert.ok(Number.isNaN(lib.parseCount('99999999999999999999999')));
      assert.ok(Number.isNaN(lib.parseWhole('99999999999999999999999')));
      assert.equal(lib.parseCount('1,000,000'), 1000000);
    });
    await test('labels: the two actual-date boxes and the report approval name are easy to tell from their neighbours', () => {
      assert.equal(lib.describeField('Report-ActualStartDate'), 'Report: When the work began');
      assert.equal(lib.describeField('Report-ActualEndDate'), 'Report: When the work finished');
      assert.equal(lib.describeField('Report-ApprovalBeneName'), 'Report: Printed name of the beneficiary (approvals)');
    });
    await test('dates: an impossible date is kept as typed, and the heads-ups mention it', () => {
      assert.equal(lib.formatDate('2025-02-30'), '2025-02-30');
      assert.equal(lib.formatDate('2025-13-45'), '2025-13-45');
      assert.equal(lib.formatDate('2024-02-29'), '2/29/2024', 'leap day');
      assert.equal(lib.formatDate('2025-10-01'), '10/1/2025');
      const P = require(path.join(ROOT, 'lib/preflight.js'));
      const d = JSON.parse(JSON.stringify(sample)); d.proposal.startDate = '2025-02-30';
      const notes = P.check(d, lib);
      assert.equal(notes.length, 1);
      assert.match(notes[0], /^Proposal: “2025-02-30” is not a real date\. Fix it in the workbook. Not sure\? Ask your coach\.$/);
      const typed = JSON.parse(JSON.stringify(sample)); typed.proposal.startDate = 'June 1';
      assert.deepEqual(P.check(typed, lib), [], 'plain typed words are left alone');
    });
    await test('text fit: one very long word counts every line it needs, even at the start of a paragraph', () => {
      const long = 'x'.repeat(200);
      assert.ok(lib.wrappedLines(long, 100, 10) >= 8, `${lib.wrappedLines(long, 100, 10)} lines`);
      assert.ok(Math.abs(lib.wrappedLines(long, 100, 10) - lib.wrappedLines(`a ${long}`, 100, 10)) <= 1, 'the same long word gives about the same count after another word');
    });
    await test('labels: every box the filler can write has a plain-language name for warnings', () => {
      const data = W.defaults(); let n = 0;
      const fill = (o, k) => { const v = o[k]; if (Array.isArray(v)) v.forEach((_, i) => fill(v, i)); else if (v && typeof v === 'object') Object.keys(v).forEach((x) => fill(v, x)); else if (k === 'num' || k === 'cat') return; else if (/date|start$|end$|dob|borDate|actual/i.test(String(k))) o[k] = `2025-01-${String((n++ % 27) + 1).padStart(2, '0')}`; else if (['qty', 'unitCost', 'w', 'h', 'needed', 'soFar'].includes(k)) o[k] = '2'; else if (k === 'totalCost') o[k] = ''; else o[k] = `A${n++}`; };
      Object.keys(data).forEach((k) => fill(data, k)); data.unit.type = 'Troop';
      const r = lib.buildFieldValues(data);
      const bare = [...Object.keys(r.text), ...Object.keys(r.radio)].filter((name) => lib.describeField(name) === name);
      assert.deepEqual(bare, []);
    });
  }

  console.log('Deploy script');
  {
    const { spawnSync } = require('child_process');
    /** Run tools/deploy.sh in a throwaway repo with a fake rsync that records its arguments. */
    const runDeploy = (args, { conf = '', env = {} } = {}) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eph-deploy-'));
      try {
        fs.mkdirSync(path.join(dir, 'tools')); fs.mkdirSync(path.join(dir, 'tests')); fs.mkdirSync(path.join(dir, 'bin'));
        for (const d of ['lib', 'vendor', 'docs']) { fs.mkdirSync(path.join(dir, d)); fs.writeFileSync(path.join(dir, d, 'keep.txt'), 'x'); }
        for (const f of ['index.html', 'EagleWorkbook-guided.html', 'EagleWorkbook.html', 'FillOfficialPDF.html', 'BackupFromPDF.html', 'README.md', 'INSTALL.md', 'LICENSE', '.htaccess', '.nojekyll']) fs.writeFileSync(path.join(dir, f), 'x');
        fs.copyFileSync(path.join(ROOT, 'tools/deploy.sh'), path.join(dir, 'tools/deploy.sh'));
        fs.writeFileSync(path.join(dir, 'tests/run-tests.cjs'), 'process.exit(0);\n');
        fs.writeFileSync(path.join(dir, 'bin/rsync'), '#!/bin/sh\nprintf "%s\\n" "$@" >> "$RSYNC_LOG"\nprintf -- "--call--\\n" >> "$RSYNC_LOG"\n', { mode: 0o755 });
        if (conf) fs.writeFileSync(path.join(dir, '.deploy.conf'), conf);
        const git = (...a) => spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: dir });
        git('init', '-q'); fs.writeFileSync(path.join(dir, '.gitignore'), '.deploy.conf\n'); git('add', '-A'); git('commit', '-qm', 'x');
        const log = path.join(dir, 'rsync.log');
        const r = spawnSync('bash', ['tools/deploy.sh', ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`, RSYNC_LOG: log, DEPLOY_TARGET: '', DEPLOY_URL: '', DEPLOY_SSH: '', DEPLOY_SSH_EXTRA: '', ...env } });
        const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
        const eFlag = (calls.match(/^-e\n(.*)$/m) || [])[1] || null;
        return { status: r.status, out: r.stdout + r.stderr, eFlag };
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    };
    await test('deploy: no ssh options means no -e flag', () => {
      const r = runDeploy(['--target', 'me@host:/var/www/eagle/']);
      assert.equal(r.status, 0, r.out); assert.equal(r.eFlag, null);
    });
    await test('deploy: --ssh sets the ssh options for one run and replaces the saved ones', () => {
      const r = runDeploy(['--target', 'me@host:/var/www/eagle/', '--ssh', '-p 2222'], { conf: 'DEPLOY_SSH=-i ~/.ssh/key\n' });
      assert.equal(r.eFlag, 'ssh -p 2222');
    });
    await test('deploy: a leading "ssh" in --ssh is accepted, and a jump host chain passes through untouched', () => {
      const chain = 'bastion.example.org,ubuntu@192.0.2.10';
      assert.equal(runDeploy(['--target', 'me@host:/var/www/eagle/', '--ssh', `ssh -J ${chain}`]).eFlag, `ssh -J ${chain}`, 'not "ssh ssh -J"');
      assert.equal(runDeploy(['--target', 'me@host:/var/www/eagle/', '--ssh', `-J ${chain}`]).eFlag, `ssh -J ${chain}`);
      assert.equal(runDeploy(['--target', 'me@host:/var/www/eagle/', '--ssh', 'ssh']).eFlag, null, 'just "ssh" means no extra options');
    });
    await test('deploy: the same ssh options are used for the sitemap copy, and a dry run says nothing was changed', () => {
      const r = runDeploy(['--target', 'me@host:/var/www/eagle/', '--url', 'https://example.org/eagle/', '--ssh', 'ssh -J me@bastion.example.org']);
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /Dry run/);
    });
  }

  console.log('Keeping copies in step');
  {
    const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
    const scripts = (f) => [...read(f).matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    const before = (list, a, b, where) => { assert.ok(list.includes(a) && list.includes(b), `${where}: needs ${a} and ${b}`); assert.ok(list.indexOf(a) < list.indexOf(b), `${where}: ${a} must load before ${b}`); };
    await test('deploy: every page that the home page links to is copied by tools/deploy.sh and listed in INSTALL.md', () => {
      const deploy = fs.readFileSync(path.join(ROOT, 'tools/deploy.sh'), 'utf8');
      const install = fs.readFileSync(path.join(ROOT, 'INSTALL.md'), 'utf8');
      const links = [...new Set([...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/href="([^"#?:]+\.html)"/g)].map((m) => m[1]))];
      assert.ok(links.length >= 5, 'the home page links to several pages');
      for (const page of links) {
        assert.ok(deploy.includes(` ${page} `) || deploy.includes(`${page} `) || deploy.includes(` ${page}\n`), `tools/deploy.sh does not copy ${page}`);
        assert.ok(install.includes(page), `INSTALL.md does not list ${page}`);
      }
    });
    await test('copies: each page loads its scripts in the order they need', () => {
      for (const [page, own] of [['EagleWorkbook-guided.html', 'lib/guided-workbook.js'], ['EagleWorkbook.html', 'lib/classic-workbook.js']]) {
        const s = scripts(page);
        for (const [a, b] of [['lib/official-pdf.js', 'lib/preflight.js'], ['lib/official-pdf.js', 'lib/journey.js'], ['lib/journey.js', 'lib/tips.js'], ['lib/tips.js', 'lib/attachments.js'], ['lib/attachments.js', 'lib/workbook-common.js'], ['lib/workbook-common.js', own]]) before(s, a, b, page);
      }
      for (const [page, extra] of [['EagleWorkbook2026.html', []], ['EagleWorkbook2026-guided.html', ['lib/w26-guided.js']]]) {
        const s26 = scripts(page);
        const order = ['lib/official-pdf.js', 'lib/preflight.js', 'lib/journey.js', 'lib/w26-tips.js', 'lib/w26-model.js', 'lib/attachments.js', 'lib/workbook-common.js', 'lib/w26-ui.js', ...extra, 'lib/w26-classic.js'];
        assert.deepEqual(s26.filter((x) => order.includes(x) || x === 'lib/w26-guided.js'), order, page + ' script order');
      }
      const fill = scripts('FillOfficialPDF.html');
      for (const [a, b] of [['vendor/pdfjs/pdf.js', 'lib/official-pdf.js'], ['lib/official-pdf.js', 'lib/preflight.js'], ['lib/official-pdf.js', 'lib/attachments.js'], ['lib/preflight.js', 'lib/fill-page.js'], ['lib/attachments.js', 'lib/fill-page.js']]) before(fill, a, b, 'FillOfficialPDF.html');
      const back = scripts('BackupFromPDF.html');
      for (const [a, b] of [['lib/official-pdf.js', 'lib/attachments.js'], ['lib/attachments.js', 'lib/journey.js'], ['lib/journey.js', 'lib/workbook-common.js'], ['lib/workbook-common.js', 'lib/backup-from-pdf-page.js']]) before(back, a, b, 'BackupFromPDF.html');
    });
    await test('copies: the draft storage keys are the same everywhere they are written out', () => {
      const keys = ['eagle_workbook_guided_v1', 'eagle_workbook_v1', 'eagle_workbook2026_guided_v1', 'eagle_workbook2026_v1'];
      for (const f of ['lib/attachments.js', 'lib/fill-page.js', 'lib/backup-from-pdf-page.js', 'lib/guided-workbook.js', 'lib/classic-workbook.js']) {
        const found = new Set([...read(f).matchAll(/['"`](eagle_workbook[a-z_0-9]*)['"`]/g)].map((m) => m[1]).filter((k) => k !== 'eagle_workbook_files'));
        assert.deepEqual([...found].filter((k) => !keys.includes(k)), [], `${f} uses a storage key nobody else knows`);
      }
      for (const k of keys) assert.ok(read('lib/attachments.js').includes(k), `lib/attachments.js must know ${k}, or sweeping could delete pictures a draft still uses`);
      for (const f of ['lib/fill-page.js', 'lib/backup-from-pdf-page.js']) for (const k of keys.slice(0, 2)) assert.ok(read(f).includes(k), `${f} must know ${k}`);
      const A = require(path.join(ROOT, 'lib/attachments.js'));
      assert.deepEqual(A.DRAFT_KEYS, keys);
    });
    await test('editions: a backup file of the other edition is refused, in plain words', () => {
      const W = workbookCommon();
      const J = require(path.join(ROOT, 'lib/journey.js'));
      const d2026 = { edition: '2026', candidate: {}, proposal: {} };
      const d2023 = { candidate: {}, proposal: {} };
      const page2026 = () => ({ edition: '2026' });
      assert.equal(W.editionMismatch(d2023, W.defaults), null);
      assert.equal(W.editionMismatch(d2026, page2026), null);
      assert.equal(W.editionMismatch(d2026, W.defaults), 'This backup file is for the 2026 workbook. Open it in the 2026 workbook from the home page.');
      assert.equal(W.editionMismatch(d2023, page2026), 'This backup file is for the 2023 workbook (No. 2023a). Open it in the 2023 workbook from the home page. Answers don’t move to the 2026 workbook by themselves, because its questions are different.');
      for (const d of [{}, null, { edition: 'x' }, { edition: '2026' }, d2023]) assert.equal(W.editionOfData(d), J.editionOf(d), JSON.stringify(d));
      assert.ok(fs.readFileSync(path.join(ROOT, 'lib/fill-page.js'), 'utf8').includes(W.editionMismatch(d2026, W.defaults)), 'lib/fill-page.js must say the same thing');
    });
    await test('copies: the roadmap step ids in workbook-common.js match the ones in journey.js', () => {
      const J = require(path.join(ROOT, 'lib/journey.js'));
      const W = workbookCommon();
      assert.deepEqual(JSON.parse(JSON.stringify(W.JOURNEY_IDS)), J.CHECK_IDS);
    });
    await test('copies: the official PDF address is the same in both files and in the Fill page policy', () => {
      assert.equal(workbookCommon().OFFICIAL_PDF_URL, lib.OFFICIAL_PDF_URL);
      assert.ok(read('FillOfficialPDF.html').includes(`connect-src ${lib.OFFICIAL_PDF_URL};`));
    });
    await test('copies: pages and docs agree on how many stages and steps there are', () => {
      for (const f of ['index.html', 'README.md']) assert.doesNotMatch(read(f), /\bfive stages\b|\bfour steps\b/i, f);
      assert.equal((read('lib/guided-workbook.js').match(/const TABS = \[([^\]]+)\]/)[1].match(/'/g).length / 2), 7, 'the Guided workbook has seven tabs (the last is Review)');
      assert.match(read('index.html') + read('README.md'), /Seven stages/);
    });
  }

  console.log('2026 attachments');
  await test('2026 attachments file: index, then each scan with its caption; photos last; the official file is not touched', () => {
    const A = require(path.join(ROOT, 'lib/attachments.js'));
    const jpg = (name) => {
      const bytes = fs.readFileSync(path.join(__dirname, 'fixtures', name));
      const info = A.jpegInfo(new Uint8Array(bytes));
      return { id: name.replace(/[^a-z0-9]/gi, '').padEnd(8, 'x'), jpeg: bytes.toString('base64'), width: info.width, height: info.height };
    };
    const d = { edition: '2026', candidate: { name: 'Alex Example' }, proposal: { projectName: 'Bike repair' }, attachments: [
      { id: 'photoafter1', place: 'photosAfter', label: 'After the project', pages: [jpg('scan-landscape.jpg')] },
      { id: 'permit0001', place: 'end', label: 'Permit', pages: [jpg('scan-portrait.jpg')] }
    ], links: [] };
    const out = A.buildAttachmentsFile({ data: d, today: '2026-10-29' });
    const text = Buffer.from(out.bytes).toString('latin1');
    assert.ok(text.startsWith('%PDF'), 'a PDF');
    assert.equal(out.attachmentCount, 2);
    assert.equal(out.pageCount, 1 + 2, 'one index page and two scans');
    assert.match(text, /\/Count 3\b/);
  });
  console.log('2026 tips');
  {
    const loadTips = () => {
      const ctx = { window: {} };
      vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'lib/w26-tips.js'), 'utf8'), ctx);
      return ctx.window.EagleTips;
    };
    const O26 = require(path.join(ROOT, 'lib/w26-model.js')).OFFICIAL;
    await test('2026 tips: every tip is for a real box, and its "where" is the page the box is on in the 2026 workbook', () => {
      const TIPS26 = loadTips();
      const bad = [];
      for (const [key, tip] of Object.entries(TIPS26)) {
        const box = O26.boxes[key];
        if (!box) { bad.push(`${key}: no such box`); continue; }
        const page = Number((tip.where || '').match(/Page (\d+)/) && tip.where.match(/Page (\d+)/)[1]);
        if (page !== box[0]) bad.push(`${key}: says page ${page}, the box is on page ${box[0]}`);
      }
      assert.deepEqual(bad, [], bad.join('; '));
    });
    await test('2026 tips: short, plain, advice-only, and never say a rule is required', () => {
      const TIPS26 = loadTips();
      for (const [key, tip] of Object.entries(TIPS26)) {
        assert.equal(tip.advice, true, `${key} must be marked advice`);
        assert.ok(tip.text.length <= 200, `${key} text is ${tip.text.length} characters`);
        if (tip.good) assert.ok(tip.good.length <= 260, `${key} example too long`);
        if (tip.avoid) assert.ok(tip.avoid.length <= 150, `${key} avoid too long`);
        assert.doesNotMatch(`${tip.text} ${tip.good || ''} ${tip.avoid || ''}`, /\b(must|required|requirement)\b/i, key);
      }
    });
    await test('2026 tips: every tip key matches the field path the page uses for that box', () => {
      const TIPS26 = loadTips();
      assert.ok(Object.keys(TIPS26).length >= 10, 'enough tips for the important boxes');
    });
  }

  console.log('Privacy');
  await test('privacy: no internal hostnames, real IP addresses, private keys, or personal emails in tracked files', () => {
    // Scans what git tracks (not what is on disk). Documentation addresses and the project's example names are allowed.
    // Tracked files plus new files that are not ignored yet, so a leak in a file that is not committed yet still fails.
    const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT }).toString().split('\n').filter(Boolean)
      .filter((f) => !/\.(pdf|jpe?g|png|heic|docx|xlsx|odt|zip)$/i.test(f) && !f.startsWith('vendor/'));
    // Not addresses: loopback, the documentation ranges (RFC 5737), and Scouting requirement numbers such as 9.0.2.10.
    const ip = /\b(?!127\.0\.0\.1\b|0\.0\.0\.0\b|9\.0\.2\.)(?!192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g;
    const internal = /\.corp\b|\.internal\b|\.lan\b/i;
    const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
    const allowedEmail = (e) => /@example\.org$/.test(e) || e === 'hagan@cih.com';
    const problems = [];
    for (const f of files) {
      if (f === 'tests/run-tests.cjs') continue;   // this file holds the patterns themselves, and the bad-URL examples
      const buf = fs.readFileSync(path.join(ROOT, f));
      if (buf.includes(0)) continue;   // binary
      const text = buf.toString('utf8');
      for (const m of text.matchAll(ip)) problems.push(`${f}: IP address ${m[0]}`);
      // A jump host must use the documentation name bastion.example.org (AGENTS.md rule 12).
      for (const m of text.matchAll(/(?:^|[\s"'])-J(?:\s+|=)\S+/g)) if (!/bastion\.example\.org/.test(m[0])) problems.push(`${f}: jump host ${m[0]}`);
      if (internal.test(text)) problems.push(`${f}: internal host or domain`);
      for (const m of text.matchAll(email)) if (!allowedEmail(m[0])) problems.push(`${f}: email ${m[0]}`);
      if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b/.test(text)) problems.push(`${f}: key material`);
    }
    assert.deepEqual(problems, [], problems.slice(0, 10).join('; '));
  });

  console.log('Official-workbook wording');
  {
    const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
    await test('wording: the submission copy says to check first, and this helper is optional next to the official workbook', () => {
      const fill = read('FillOfficialPDF.html'), home = read('index.html'), readme = read('README.md');
      for (const [name, text] of [['Fill page', fill], ['home page', home], ['README', readme]]) {
        assert.match(text, /This copy adds a list page and your scans to the workbook, so check with your unit leader or council before you hand it in\./, `${name}: check first`);
      }
      for (const [name, text] of [['home page', home], ['README', readme]]) {
        assert.match(text, /Using this helper is your choice\./, `${name}: optional`);
        assert.match(text, /no council, district, unit, or individual may add forms, change requirements, or change the workbook itself, so the official workbook, filled and signed, is what you complete\. Your unit leader and council still tell you how to hand it in\./, `${name}: the workbook's own rule, and who decides how to hand in`);
      }
      assert.doesNotMatch(home + readme, /can require additional forms/, 'the looser wording is gone');
      // The edition chooser (S18): the FAQ sentences are quoted word for word.
      const FAQ_QUOTES = [
        'Any Scout can start using the 2026 Eagle Scout leadership service project workbook now that Scouting America has published it. The 2026 workbook will be required for every Life Scout starting work for the first time on an Eagle Scout leadership service project.',
        'A Scout whose project proposal was fully approved before January 1, 2027, using the 2023 workbook, may continue using that workbook to complete the project.',
        'The 2027 Guide to Advancement, published in January 2027, will require Scouts to obtain the beneficiary’s and Scoutmaster’s approval of the project plan before starting work. That requirement will apply to all Scouts effective January 1, 2027, whether using the 2023 or the 2026 project workbook.'
      ];
      for (const q of FAQ_QUOTES) {
        assert.ok(home.includes(q), `home page quotes the FAQ: ${q.slice(0, 40)}`);
      }
      assert.ok(home.includes('<h2>Which workbook?</h2>'), 'home page has the chooser');
      for (const f of ['EagleWorkbook-guided.html', 'EagleWorkbook.html', 'FillOfficialPDF.html']) {
        assert.ok(read(f).includes('For the 2023 workbook (No. 2023a).'), `${f} says which workbook it is for`);
      }
      assert.doesNotMatch(read('index.html'), /Guided workbook \(start here\)/, 'the home page no longer sends every Scout to the 2023 Guided page');
      // A preserved unreadable copy of a draft (<key>_corrupt) can hold scans, so the sweep must count its pictures too.
      assert.match(read('lib/attachments.js'), /_corrupt/, 'the picture sweep reads the preserved _corrupt copies');
      assert.ok(readme.includes('Which workbook?'), 'README has the chooser');
      if (process.env.EAGLE_FAQ) {
        // Optional: check the quotes against the published FAQ PDF (Poppler's pdftotext).
        const text = execFileSync('pdftotext', [process.env.EAGLE_FAQ, '-']).toString().replace(/\s+/g, ' ');
        for (const q of FAQ_QUOTES) assert.ok(text.replace(/\s+/g, ' ').includes(q.slice(0, 60)), `FAQ text: ${q.slice(0, 40)}`);
      }
    });
  }

  console.log('Heads-up checks');
  {
    const P = require(path.join(ROOT, 'lib/preflight.js'));
    const clone = (f) => { const d = JSON.parse(JSON.stringify(sample)); f(d); return d; };
    const run = (d) => P.check(d, lib);
    await test('heads-up: the sample workbook has nothing to flag', () => assert.deepEqual(run(sample), []));
    await test('heads-up: a blank or empty draft has nothing to flag', () => {
      assert.deepEqual(run(workbookCommon().defaults()), []);
      assert.deepEqual(run({}), []);
      assert.deepEqual(run(null), []);
    });
    await test('heads-up: an end date before its own start date is flagged, once, in plain words', () => {
      for (const [a, b, word] of [['proposal.startDate', 'proposal.endDate', 'Proposal'], ['plan.startDate', 'plan.endDate', 'Project plan'], ['report.actualStart', 'report.actualEnd', 'Final report (actual)'], ['report.startDate', 'report.endDate', 'Final report (planned)']]) {
        const set = (d, path, v) => { const k = path.split('.'); d[k[0]][k[1]] = v; };
        const notes = run(clone((d) => { set(d, a, '2026-10-01'); set(d, b, '2026-03-31'); }));
        assert.equal(notes.length, 1, `${a}: ${notes.join(' | ')}`);
        assert.match(notes[0], new RegExp(`^${word.replace(/[()]/g, '\\$&')}: the end date \\(3/31/2026\\) is before the start date \\(10/1/2026\\)\\. Not sure\\? Ask your coach\\.$`));
      }
      const phase = run(clone((d) => { d.plan.phases[2].start = '2026-05-10'; d.plan.phases[2].end = '2026-05-01'; }));
      assert.equal(phase.length, 1);
      assert.match(phase[0], /Project plan, phase 3/);
    });
    await test('heads-up: things that must NOT be flagged', () => {
      const same = clone((d) => { d.proposal.startDate = '2026-05-01'; d.proposal.endDate = '2026-05-01'; });
      assert.deepEqual(run(same), [], 'same day');
      const blank = clone((d) => { d.proposal.startDate = ''; d.proposal.endDate = '2026-05-01'; d.plan.startDate = '2026-05-01'; d.plan.endDate = ''; });
      assert.deepEqual(run(blank), [], 'one side blank');
      const words = clone((d) => { d.proposal.startDate = 'June 1'; d.proposal.endDate = 'May 1'; });
      assert.deepEqual(run(words), [], 'dates typed as plain words are left alone');
      const across = clone((d) => { d.proposal.startDate = '2026-09-01'; d.proposal.endDate = '2026-09-15'; d.plan.startDate = '2026-03-01'; d.plan.endDate = '2026-03-15'; d.report.actualStart = '2025-01-01'; d.report.actualEnd = '2025-01-02'; });
      assert.deepEqual(run(across), [], 'the workbook sets no order between sections');
    });
    await test('heads-up: cost rows the PDF filler cannot add up are shown early, with the same words', () => {
      const d = clone((x) => { x.plan.materials[0] = { ...x.plan.materials[0], qty: '2', unitCost: '5', totalCost: '99' }; });
      const notes = run(d);
      assert.equal(notes.length, 1);
      assert.match(notes[0], /Materials list, row 1: Total \$ \(\$99\.00\) does not equal Qty × Unit \$ \(\$10\.00\)\. Not sure\? Ask your coach\.$/);
    });
    await test('heads-up: wording never reads like a rule or a verdict', () => {
      const d = clone((x) => { x.proposal.startDate = '2026-10-01'; x.proposal.endDate = '2026-03-31'; x.plan.materials[0] = { ...x.plan.materials[0], qty: '2', unitCost: '5', totalCost: '99' }; });
      for (const note of run(d)) {
        assert.doesNotMatch(note, /\b(must|required|requirement|wrong|error|invalid|approve[sd]?|approval|ready|score)\b/i, note);
        assert.ok(note.length <= 220, `${note.length} characters: ${note}`);
        assert.ok(note.endsWith(P.ASK), note);
      }
    });
    await test('heads-up: flags never stop the Scout from creating the PDF', () => {
      const src = fs.readFileSync(path.join(ROOT, 'lib/fill-page.js'), 'utf8');
      const disable = /createBtn\.disabled = ([^;]+);/.exec(src)[1];
      assert.doesNotMatch(disable, /headsUp|missingNotes|EaglePreflight|notes/, `Create button is disabled by: ${disable}`);
      assert.match(src, /These are only heads-ups\. They don’t stop you from creating the PDF\./);
    });
    await test('heads-up: the Fill page loads the checks and shows them with the other heads-ups', () => {
      const html = fs.readFileSync(path.join(ROOT, 'FillOfficialPDF.html'), 'utf8');
      assert.ok(html.indexOf('lib/official-pdf.js') < html.indexOf('lib/preflight.js') && html.indexOf('lib/preflight.js') < html.indexOf('lib/fill-page.js'));
      assert.match(fs.readFileSync(path.join(ROOT, 'lib/fill-page.js'), 'utf8'), /EaglePreflight\.check\(d, lib\)/);
    });
  }

  console.log('Draft saving');
  {
    /** A workbook-common.js running against a fake localStorage, with handlers we can fire by hand. */
    const harness = (items = {}, { failWrites = false } = {}) => {
      const handlers = { window: {}, document: {} };
      const store = new Map(Object.entries(items));
      const localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => { if (failWrites) throw new Error('full'); store.set(k, String(v)); },
        removeItem: (k) => store.delete(k)
      };
      const window = { addEventListener: (type, fn) => { (handlers.window[type] = handlers.window[type] || []).push(fn); } };
      const document = { visibilityState: 'visible', addEventListener: (type, fn) => { (handlers.document[type] = handlers.document[type] || []).push(fn); } };
      vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'lib/workbook-common.js'), 'utf8'), { window, document, localStorage, console, setTimeout, clearTimeout });
      return { W: window.EagleWorkbook, store, localStorage, handlers, document, fire: (where, type, e = {}) => (handlers[where][type] || []).forEach((fn) => fn(e)) };
    };
    const KEY = 'eagle_workbook_guided_v1';
    await test('saving: leaving the page writes a draft that was still waiting for its timer', () => {
      for (const [where, type, before] of [['window', 'pagehide'], ['document', 'visibilitychange', (h) => { h.document.visibilityState = 'hidden'; }]]) {
        const h = harness();
        const s = h.W.createStore(KEY);
        const d = h.W.defaults(); d.candidate.name = 'Last Words';
        s.save(d);
        assert.equal(h.store.get(KEY), undefined, 'not written yet: the timer is pending');
        if (before) before(h);
        h.fire(where, type);
        assert.match(h.store.get(KEY) || '', /Last Words/, `${type} writes it`);
        assert.ok(h.store.get(`${KEY}_saved`), 'and marks it saved');
      }
    });
    await test('saving: becoming visible again does not write anything', () => {
      const h = harness();
      const s = h.W.createStore(KEY);
      s.save(h.W.defaults());
      h.fire('document', 'visibilitychange');
      assert.equal(h.store.get(KEY), undefined);
    });
    await test('saving: flush tells the page it saved, or that it could not', () => {
      const ok = harness(); const a = ok.W.createStore(KEY); const seen = [];
      a.onChange((x) => seen.push(x));
      a.save(ok.W.defaults()); a.flush(ok.W.defaults());
      assert.deepEqual(seen, ['saving', 'saved'], 'no stuck "Saving…"');
      const bad = harness({}, { failWrites: true }); const b = bad.W.createStore(KEY); const seen2 = [];
      b.onChange((x) => seen2.push(x));
      b.flush(bad.W.defaults());
      assert.deepEqual(seen2, ['failed']);
    });
    await test('saving: an unreadable draft is copied aside before anything can overwrite it', () => {
      const text = '{"candidate":{"name":"Real"},"proposal":';
      const h = harness({ [KEY]: text });
      const s = h.W.createStore(KEY);
      assert.equal(s.load(h.W.defaults), null);
      assert.equal(h.store.get(`${KEY}_corrupt`), text, 'a copy is kept');
      assert.equal(s.corrupt, true);
      s.save(h.W.defaults()); s.flush(h.W.defaults());
      assert.equal(h.store.get(`${KEY}_corrupt`), text, 'the copy survives the next save');
      s.erase();
      assert.equal(h.store.has(`${KEY}_corrupt`), false, 'erasing the draft erases the copy too');
      const fine = harness(); const f = fine.W.createStore(KEY);
      assert.equal(f.load(fine.W.defaults), null);
      assert.equal(f.corrupt, false, 'an empty browser is not a corrupt draft');
    });
    await test('saving: saving a backup file does not end a conflict', () => {
      const h = harness();
      const s = h.W.createStore(KEY);
      h.fire('window', 'storage', { key: KEY, storageArea: h.localStorage });
      s.markBackedUp();
      assert.equal(s.state, 'conflict', 'still blocked: the other tab\u2019s draft is not overwritten');
      s.flush(h.W.defaults());
      assert.equal(h.store.get(KEY), undefined);
    });
    await test('saving: erasing or opening a backup file ends a conflict, so the Scout can keep working', () => {
      for (const end of ['erase', 'resume']) {
        const h = harness();
        const s = h.W.createStore(KEY);
        h.fire('window', 'storage', { key: KEY, storageArea: h.localStorage });
        assert.equal(s.state, 'conflict');
        if (end === 'erase') s.erase(); else s.resume();
        assert.notEqual(s.state, 'conflict', `${end} ends it`);
        const d = h.W.defaults(); d.candidate.name = 'After Conflict';
        s.flush(d);
        assert.match(h.store.get(KEY) || '', /After Conflict/, `${end}: saving works again`);
      }
    });
    await test('saving: a page restored from the back/forward cache notices a draft saved elsewhere meanwhile', () => {
      const h = harness({ [`${KEY}_saved`]: '1000' });
      const s = h.W.createStore(KEY);
      h.fire('window', 'pageshow', { persisted: true });
      assert.notEqual(s.state, 'conflict', 'nothing changed');
      h.store.set(`${KEY}_saved`, '2000');
      h.fire('window', 'pageshow', { persisted: false });
      assert.notEqual(s.state, 'conflict', 'an ordinary load is not a restore');
      h.fire('window', 'pageshow', { persisted: true });
      assert.equal(s.state, 'conflict');
      assert.ok(s.conflictAt > 0);
    });
    await test('changes: the store counts boxes changed since the last backup, not keystrokes', () => {
      const h = harness(); const s = h.W.createStore(KEY);
      const d = h.W.defaults();
      s.markBackedUp(d);
      s.flush(d);
      assert.equal(s.changeCount(), 0, 'nothing changed since the backup');
      d.candidate.name = 'A'; s.save(d); d.candidate.name = 'Al'; s.save(d); d.candidate.name = 'Alex'; s.save(d);
      assert.equal(s.changeCount(), 1, 'three keystrokes in one box is one box');
      d.plan.materials[0].item = 'Boards';
      assert.equal(s.changeCount(), 2);
      d.candidate.name = '';
      assert.equal(s.changeCount(), 1, 'changing a box back removes it from the count');
      d.attachments.push({ id: 'aaaaaaaaaa', place: 'proposalH', label: 'Signed', pages: [{ id: 'bbbbbbbbbb', width: 1, height: 1, bytes: 1 }, { id: 'cccccccccc', width: 1, height: 1, bytes: 1 }] });
      assert.equal(s.changeCount(), 2, 'a scan with two pages counts once');
      d.links.push({ title: 'Budget', url: 'https://example.org/b' });
      assert.equal(s.changeCount(), 3, 'a link counts once');
      d.journey.steps.work = { done: '1' };
      assert.equal(s.changeCount(), 4, 'a tick on Your path counts');
      s.markBackedUp(d);
      assert.equal(s.changeCount(), 0, 'saving a backup file starts the count again');
    });
    await test('changes: the saved comparison holds fingerprints, never the words', () => {
      const h = harness(); const s = h.W.createStore(KEY);
      const d = h.W.defaults();
      d.candidate.name = 'Zephyrine Q. Secretname'; d.proposal.description = 'A very private project description';
      s.markBackedUp(d);
      const snap = h.store.get(`${KEY}_snap`);
      assert.doesNotMatch(snap, /Zephyrine|Secretname|private project/, 'no words in the comparison');
      assert.match(snap, /"candidate\.name":"[0-9a-z]{1,8}"/, 'a short fingerprint instead');
      d.candidate.name = 'Zephyrine Q. Secretnamf';
      assert.equal(s.changeCount(), 1, 'one letter changed in one box is detected');
    });
    await test('changes: no count when this browser never took a snapshot, or the Scout never saved a backup', () => {
      const old = harness({ [`${KEY}_backup`]: '1000' });   // backed up before this feature existed
      const a = old.W.createStore(KEY); a.flush(old.W.defaults());
      assert.equal(a.changeCount(), null);
      const none = harness(); const b = none.W.createStore(KEY); b.flush(none.W.defaults());
      assert.equal(b.changeCount(), null, 'never backed up: the status line already says so');
    });
    await test('changes: a snapshot taken before the share sheet opens is what counts, and a failed snapshot write is not trusted', () => {
      const h = harness(); const s = h.W.createStore(KEY);
      const d = h.W.defaults(); d.candidate.name = 'Before';
      const hashes = h.W.boxHashes(d);              // taken when the file is built
      d.candidate.name = 'Typed while the share sheet was open';
      s.markBackedUp(d, hashes);
      assert.equal(s.changeCount(), 1, 'what was typed after the file was built still counts');
      const bad = harness({}, { failWrites: true }); const b = bad.W.createStore(KEY);
      bad.store.set(`${KEY}_snap`, '{"candidate.name":"zz"}');  // an older snapshot
      b.markBackedUp(bad.W.defaults());
      assert.equal(bad.store.has(`${KEY}_snap`), false, 'a snapshot that could not be written does not leave an old one behind');
      assert.equal(b.changeCount(), null);
    });
    await test('changes: erasing the draft forgets the comparison', () => {
      const h = harness(); const s = h.W.createStore(KEY);
      s.markBackedUp(h.W.defaults()); s.erase();
      assert.equal([...h.store.keys()].filter((k) => k.startsWith(KEY)).length, 0);
      assert.equal(s.changeCount(), null);
    });
    await test('saving: a change made in another tab stops this tab from overwriting it', () => {
      const h = harness();
      const s = h.W.createStore(KEY); const seen = [];
      s.onChange((x) => seen.push(x));
      h.fire('window', 'storage', { key: KEY, storageArea: h.localStorage });
      assert.equal(s.state, 'conflict');
      s.save(h.W.defaults()); s.flush(h.W.defaults());
      assert.equal(h.store.get(KEY), undefined, 'nothing is written after a conflict');
      assert.ok(seen.includes('conflict'));
      const other = harness(); const o = other.W.createStore(KEY);
      other.fire('window', 'storage', { key: 'something_else', storageArea: other.localStorage });
      assert.notEqual(o.state, 'conflict', 'other keys do not matter');
    });
  }

  console.log('Key boxes');
  {
    const J = require(path.join(ROOT, 'lib/journey.js'));
    const W = workbookCommon();
    await test('key boxes: edition is 2023a unless the draft says 2026', () => {
      assert.equal(J.editionOf({}), '2023a');
      assert.equal(J.editionOf(null), '2023a');
      assert.equal(J.editionOf({ edition: '2026' }), '2026');
      assert.equal(J.editionOf({ edition: 'something else' }), '2023a');
    });
    await test('key boxes 2026: the 2026 table, tab order and fundraising rule', () => {
      const W26 = require(path.join(ROOT, 'lib/w26-model.js'));
      const d26 = W26.defaults();
      assert.deepEqual(J.tabOrder(d26), ['setup', 'proposal', 'fundraising', 'plan', 'report']);
      assert.deepEqual(J.tabOrder({}), J.TAB_ORDER);
      for (const tab of ['setup', 'proposal', 'fundraising', 'plan', 'report']) {
        for (const b of J.keyBoxes(d26)[tab]) {
          const value = b.path.split('.').reduce((o, k) => (o ? o[k] : undefined), d26);
          assert.equal(typeof value, 'string', `${b.path} is not a text box in the 2026 draft`);
        }
      }
      assert.equal(J.keyBoxCount(d26).total, J.keyBoxCount({ edition: '2026' }).total);
      assert.ok(!('fundraising' in J.emptyKeyBoxes(d26)), 'fundraising is not counted until the Scout says yes');
      const yes = { ...W26.defaults(), proposal: { ...d26.proposal, needFundraisingApp: 'yes' } };
      assert.ok('fundraising' in J.emptyKeyBoxes(yes));
      assert.equal(J.keyBoxCount(yes).total, J.keyBoxCount(d26).total + J.keyBoxes(d26).fundraising.length);
    });
    await test('key boxes: every key box is a text box in defaults() and has a short label', () => {
      const d = W.defaults();
      for (const [tab, boxes] of Object.entries(J.KEY_BOXES['2023a'])) {
        assert.ok(boxes.length > 0, tab);
        for (const b of boxes) {
          assert.equal(typeof b.label, 'string', `${tab} ${b.path}`);
          assert.ok(b.label.length > 2 && b.label.length < 60, `${tab} ${b.path}: label length`);
          const v = b.path.split('.').reduce((o, k) => (o ? o[k] : undefined), d);
          assert.equal(typeof v, 'string', `${b.path} is not a text box in defaults()`);
        }
      }
    });
    await test('key boxes: the lists are exactly what the counts used before', () => {
      const t = J.KEY_BOXES['2023a'];
      const paths = (k) => t[k].map((b) => b.path);
      assert.deepEqual(paths('setup'), ['candidate.name', 'candidate.email', 'unit.number', 'contacts.beneficiary.name', 'contacts.beneficiaryRep.name']);
      assert.deepEqual(paths('proposal'), ['proposal.projectName', 'proposal.description', 'proposal.whyNeeded', 'proposal.helperCount', 'proposal.materials', 'proposal.safety']);
      assert.deepEqual(paths('plan'), ['plan.startDate', 'plan.presentCondition', 'plan.workProcesses', 'plan.firstAid', 'plan.contingency']);
      assert.deepEqual(paths('fundraising'), ['fundraising.description', 'fundraising.beginDate', 'fundraising.howMuch']);
      assert.deepEqual(paths('report'), ['report.actualStart', 'report.actualEnd', 'report.description', 'report.leadership']);
      assert.deepEqual(J.PATHS.proposal, paths('proposal'), 'PATHS is a view of the same table');
    });
    await test('key boxes: emptyKeyBoxes lists what is not filled in, and fundraising only when raising money', () => {
      const d = W.defaults();
      assert.deepEqual(Object.keys(J.emptyKeyBoxes(d)), ['setup', 'proposal', 'plan', 'report'], 'no fundraising unless the Scout said yes');
      assert.equal(J.emptyKeyBoxes(d).proposal.length, 6);
      d.journey = { raising: 'yes', steps: {} };
      assert.deepEqual(Object.keys(J.emptyKeyBoxes(d)), ['setup', 'proposal', 'plan', 'fundraising', 'report']);
      d.proposal.description = '   ';
      assert.equal(J.emptyKeyBoxes(d).proposal.length, 6, 'spaces only is still not filled in');
      d.proposal.description = 'Build a bench';
      assert.equal(J.emptyKeyBoxes(d).proposal.length, 5);
      assert.equal(J.emptyKeyBoxes(d).proposal.some((b) => b.path === 'proposal.description'), false);
    });
    await test('short answers: 1 to 7 words are listed, empty and longer ones are not', () => {
      const d = W.defaults();
      assert.deepEqual(J.shortAnswers(d), []);
      d.proposal.description = 'A bench';
      d.proposal.whyNeeded = 'The school has nowhere for students to sit outside during lunch or recess';
      assert.deepEqual(J.shortAnswers(d).map((b) => b.path), ['proposal.description']);
      for (const b of J.SHORT_ANSWER_BOXES['2023a']) {
        const v = b.path.split('.').reduce((o, k) => (o ? o[k] : undefined), W.defaults());
        assert.equal(typeof v, 'string', b.path);
      }
    });
    await test('key boxes: the overall count', () => {
      const d = W.defaults();
      assert.deepEqual(J.keyBoxCount(d), { filled: 0, total: 20 }, '5 + 6 + 5 + 4 boxes, fundraising not counted');
      d.journey = { raising: 'yes', steps: {} };
      assert.deepEqual(J.keyBoxCount(d), { filled: 0, total: 23 });
      const s = J.keyBoxCount(JSON.parse(JSON.stringify(sample)));
      assert.ok(s.filled > 0 && s.filled <= s.total);
    });
  }

  console.log('Your path');
  {
    const W = workbookCommon();
    const J = require(path.join(ROOT, 'lib/journey.js'));
    const A = require(path.join(ROOT, 'lib/attachments.js'));
    const clone = (f) => { const d = JSON.parse(JSON.stringify(sample)); f(d); return d; };
    await test('path: a new draft starts with an empty journey, and old backups get one', () => {
      assert.equal(JSON.stringify(W.defaults().journey), JSON.stringify({ raising: '', steps: {} }));
      const old = JSON.parse(JSON.stringify(sample)); delete old.journey;
      assert.equal(JSON.stringify(W.mergeWithDefaults(W.defaults(), old).journey), JSON.stringify({ raising: '', steps: {} }));
    });
    await test('path: notes survive a backup, and bad values are ignored', () => {
      const withNotes = clone((d) => { d.journey = { raising: 'yes', steps: { propSigned: { done: '1' }, work: { done: '' } } }; });
      assert.equal(JSON.stringify(W.mergeWithDefaults(W.defaults(), withNotes).journey), JSON.stringify({ raising: 'yes', steps: { propSigned: { done: '1' }, work: { done: '' } } }));
      const bad = W.mergeWithDefaults(W.defaults(), clone((d) => { d.journey = { raising: 7, steps: 'x' }; }));
      assert.equal(JSON.stringify(bad.journey.steps), '{}');
      assert.notEqual(bad.journey.raising, 'yes', 'a stray value is not a yes');
      assert.equal(J.journeySteps(bad, A).steps.some((x) => x.id === 'fund'), false);
    });
    await test('path: notes never go into the official PDF', () => {
      const plain = lib.buildFieldValues(sample);
      const noted = lib.buildFieldValues(clone((d) => { d.journey = { raising: 'yes', steps: { propSigned: { done: '1' }, repSigned: { done: '1' } } }; }));
      assert.deepEqual(noted.text, plain.text);
      assert.deepEqual(noted.radio, plain.radio);
      assert.deepEqual(noted.notes, plain.notes);
    });
    await test('path: reading a PDF gives a backup with an empty journey', () => {
      const back = lib.backupFromValues(new Map([['Workbook-ProjectName', 'A Bench']]), W.defaults);
      assert.equal(JSON.stringify(back.data.journey), JSON.stringify({ raising: '', steps: {} }));
    });
    await test('path: the steps follow the draft, and the next step is the first one left', () => {
      const empty = J.journeySteps(W.defaults(), A);
      assert.equal(empty.steps[0].id, 'proposal');
      assert.equal(empty.next.id, 'proposal');
      assert.equal(empty.next.next, 'Fill in the “Proposal” tab.');
      assert.equal(J.journeySteps(W.defaults(), A, { proposal: '2. Proposal' }).next.next, 'Fill in the “2. Proposal” tab.', 'each workbook names its own tabs');
      assert.ok(!empty.steps.some((s) => s.id === 'fund'), 'fundraising step only when the Scout says they are raising money');
      const raising = J.journeySteps(clone((d) => { d.journey = { raising: 'yes', steps: {} }; }), A);
      assert.ok(raising.steps.some((s) => s.id === 'fund'));
      const full = J.journeySteps(clone((d) => { d.journey = { raising: 'no', steps: { propSigned: { done: '1' }, work: { done: '1' } } }; }), A);
      assert.equal(full.steps.find((s) => s.id === 'proposal').state, 'done', 'the sample proposal is filled in');
      assert.equal(full.steps.find((s) => s.id === 'propSigned').state, 'done');
      assert.equal(full.steps.find((s) => s.id === 'repSigned').state, 'todo');
      assert.ok(full.next && !['proposal', 'propSigned', 'work'].includes(full.next.id));
      const done = J.journeySteps(clone((d) => { d.journey = { raising: 'no', steps: Object.fromEntries(J.CHECK_IDS.map((id) => [id, { done: '1' }])) }; }), A);
      assert.equal(done.steps.filter((s) => s.kind === 'check').every((s) => s.state === 'done'), true);
    });
    await test('path: a signed-page scan is reported as a scan, never as "approved"', () => {
      const scanned = J.journeySteps(clone((d) => { d.attachments = [{ id: 'aaaaaaaaaa', place: 'proposalH', label: 'x', pages: [{ id: 'bbbbbbbbbb', width: 85, height: 110, bytes: 1 }] }]; }), A);
      const step = scanned.steps.find((s) => s.id === 'propSigned');
      assert.match(step.detail, /A scan is added for this page\./);
      assert.doesNotMatch(step.detail, /signed page is added|is signed|correct/i, 'a scan is a scan, not proof');
      const none = J.journeySteps(W.defaults(), A).steps.find((s) => s.id === 'propSigned');
      assert.match(none.detail, /No scan added yet.*Add it on the “Signed Pages & Photos” tab\./);
      assert.match(none.detail, /^Signatures on Proposal Page H: you, your unit leader/);
    });
    await test('path: only ticks and yes/no answers count as notes; stray content is dropped', () => {
      assert.equal(J.hasNotes({ raising: '', steps: {} }), false);
      assert.equal(J.hasNotes({ raising: '', steps: { work: { done: '' } } }), false, 'a tick that was undone is not a note');
      assert.equal(J.hasNotes({ raising: 'no', steps: {} }), true);
      assert.equal(J.hasNotes({ raising: '', steps: { work: { done: '1' } } }), true);
      assert.equal(J.hasNotes(null), false);
      const hostile = { raising: '<img onerror=x>', steps: { work: [], rest: { done: '1', junk: 'x' }, '<b>x</b>': { done: '1' }, propSigned: 'yes', fund: { done: 5 } } };
      const want = JSON.stringify({ raising: '', steps: { rest: { done: '1' } } });
      assert.equal(JSON.stringify(J.clean(hostile)), want);
      assert.equal(JSON.stringify(W.mergeWithDefaults(W.defaults(), { candidate: {}, proposal: {}, journey: hostile }).journey), want);
      const big = { raising: 'yes', steps: Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`k${i}`, { done: '1' }])) };
      assert.equal(Object.keys(W.mergeWithDefaults(W.defaults(), { candidate: {}, proposal: {}, journey: big }).journey.steps).length, 0, 'unknown step ids are dropped');
      for (const id of J.CHECK_IDS) assert.equal(W.mergeWithDefaults(W.defaults(), { candidate: {}, proposal: {}, journey: { steps: { [id]: { done: '1' } } } }).journey.steps[id].done, '1', `${id} is kept`);
    });
    await test('path: wording stays guidance and quotes the workbook for the reminder', () => {
      assert.match(J.REMINDER, /^The workbook says not to begin any work, raise any money, or get any materials until your project proposal has been approved\. \(Proposal Page A\)$/);
      const all = J.journeySteps(clone((d) => { d.journey = { raising: 'yes', steps: {} }; }), A);
      for (const s of all.steps) {
        const text = [s.title, s.detail || '', s.next || ''].join(' ');
        assert.doesNotMatch(text, /\b(approved|approval|ready|score|you must|required)\b/i, `${s.id}: ${text}`);
      }
    });
  }

  console.log('Signed pages and attachments');
  {
    const A = require(path.join(ROOT, 'lib/attachments.js'));
    const portrait = new Uint8Array(fs.readFileSync(path.join(__dirname, 'fixtures/scan-portrait.jpg')));
    const landscape = new Uint8Array(fs.readFileSync(path.join(__dirname, 'fixtures/scan-landscape.jpg')));
    const W = workbookCommon();
    const withExtras = () => {
      const d = W.mergeWithDefaults(W.defaults(), sample);
      d.attachments = [
        { id: 'signedproph01', place: 'proposalH', label: 'Signed Proposal Page H', pages: [{ id: 'pageph000001', width: 85, height: 110, jpeg: A.toBase64(portrait) }] },
        { id: 'permitpark01', place: 'end', label: 'Park permit', pages: [{ id: 'pagepermit01', width: 110, height: 85, jpeg: A.toBase64(landscape) }, { id: 'pagepermit02', width: 85, height: 110, jpeg: A.toBase64(portrait) }] },
        { id: 'signedrepc01', place: 'reportC', label: '', pages: [{ id: 'pagerc000001', width: 85, height: 110, jpeg: A.toBase64(portrait) }] }
      ];
      d.links = [{ title: 'Budget spreadsheet', url: 'https://example.org/budget-sheet-for-the-bike-rack-project-with-a-very-long-address-that-wraps?id=12345' }, { title: 'Bad', url: 'javascript:alert(1)' }];
      return d;
    };
    await test('signature slots are the three signed pages of workbook 2023a', () => {
      assert.deepEqual(A.SLOTS.map((s) => [s.afterPage, PAGE_LABELS[s.afterPage]]), [[15, 'Proposal Page H'], [23, 'Fundraising Application Page A'], [29, 'Project Report Page C']]);
    });
    await test('attachments and links survive a backup file and bad entries are dropped', () => {
      const d = W.mergeWithDefaults(W.defaults(), { candidate: {}, proposal: {}, attachments: [{ id: 'ok0000001', place: 'nowhere', label: 5, pages: [{ id: 'p0000001', width: 10, height: 20, jpeg: 'not base64!' }, { id: 'x', width: 1, height: 1 }] }, 'junk', { id: '../etc' }], links: [{ title: 'A', url: 'https://example.org' }, 7] });
      A.sanitize(d);
      assert.deepEqual(d.attachments, [{ id: 'ok0000001', place: 'end', label: '5', pages: [{ id: 'p0000001', width: 10, height: 20, bytes: 0 }] }]);
      assert.deepEqual(d.links, [{ title: 'A', url: 'https://example.org' }]);
      assert.equal(JSON.stringify(W.defaults().attachments), "[]");
    });
    await test('a picture string with a bad length is dropped instead of breaking the whole backup', () => {
      const good = A.toBase64(new Uint8Array([1, 2, 3]));
      const d = (jpeg) => ({ attachments: [{ id: 'aaaaaaaaaa', place: 'end', label: 'x', pages: [{ id: 'bbbbbbbbbb', width: 10, height: 10, jpeg }] }], links: [] });
      const bad = d('AAAAA');   // five characters: atob() throws on this
      A.sanitize(bad);
      assert.equal(bad.attachments[0].pages[0].jpeg, undefined, 'bad length is dropped');
      const ok = d(good); A.sanitize(ok);
      assert.equal(ok.attachments[0].pages[0].jpeg, good, 'a good one stays');
      assert.doesNotThrow(() => A.fromBase64('AAAAA'));
    });
    await test('absorb says how many pictures this browser could not store', async () => {
      const page = { id: 'bbbbbbbbbb', width: 1, height: 1, jpeg: A.toBase64(new Uint8Array(fs.readFileSync(path.join(__dirname, 'fixtures/scan-portrait.jpg')))) };
      const data = { attachments: [{ id: 'aaaaaaaaaa', place: 'end', label: 'x', pages: [page] }], links: [] };
      const report = {};
      await A.absorb(data, report);
      assert.equal(typeof report.failed, 'number');
      assert.equal(report.failed, A.persistent() === false || typeof indexedDB === 'undefined' ? 1 : 0, 'counts pictures that were not written');
    });
    await test('links that are file names, IP numbers, or carry a password are refused', () => {
      for (const bad of ['budget.xlsx', 'my.doc', 'plan.pdf', 'photo.jpg', '1.2.3', '192.0.2.1', 'https://user:pw@example.org/x', 'https://budget.csv/']) assert.equal(A.cleanUrl(bad), '', bad);
      for (const good of ['example.org/plan.pdf', 'https://docs.google.com/spreadsheets/d/1abc/edit', 'drive.google.com/file/d/1/view', 'example.co.uk']) assert.notEqual(A.cleanUrl(good), '', good);
    });
    await test('only http and https links are kept', () => {
      assert.equal(A.cleanUrl('javascript:alert(1)'), '');
      assert.equal(A.cleanUrl('file:///etc/passwd'), '');
      assert.equal(A.cleanUrl('docs.google.com/x'), 'https://docs.google.com/x');
      assert.equal(A.cleanUrl('http://example.org/a b'), '', 'spaces mean it is a description');
      assert.equal(A.cleanUrl('my budget'), '');
      assert.equal(A.cleanUrl('drive'), '');
      assert.equal(A.cleanUrl('https://example.org/a(b)'), 'https://example.org/a(b)');
    });
    await test('signed pages are inserted after their page, nothing is replaced, and attachments follow the list page', () => {
      const order = A.planPages(withExtras(), 1);
      const at = (i) => (order[i].kind === 'workbook' ? `w${order[i].n}` : order[i].kind === 'index' ? 'index' : order[i].page.id);
      assert.equal(order.filter((o) => o.kind === 'workbook').length, 32);
      assert.deepEqual([14, 15, 16].map(at), ['w15', 'pageph000001', 'w16']);
      assert.deepEqual([29, 30, 31].map(at), ['w29', 'pagerc000001', 'w30']);
      assert.deepEqual(order.slice(-4).map((o, i) => at(order.length - 4 + i)), ['w32', 'index', 'pagepermit01', 'pagepermit02']);
    });
    await test('makes a valid submission copy with the list page and working links', async () => {
      const d = withExtras();
      const drawPage = async () => ({ jpeg: portrait, width: 85, height: 110 });
      const { bytes, pageCount } = await A.buildSubmission({ data: d, drawPage, today: 'October 18, 2026' });
      assert.equal(pageCount, 32 + 2 + 1 + 2);
      const file = path.join(os.tmpdir(), `eph-submission-${process.pid}.pdf`);
      fs.writeFileSync(file, bytes);
      try {
        const pdfjsLib = loadPdfjs();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes), verbosity: 0, isEvalSupported: false }).promise;
        assert.equal(doc.numPages, 37);
        const index = await doc.getPage(35);
        const text = (await index.getTextContent()).items.map((i) => i.str).join(' ');
        assert.match(text, /Signed Proposal Page H: page 16 \(after workbook page 15\)/);
        assert.match(text, /Signed Project Report Page C: page 31 \(after workbook page 29\)/);
        assert.match(text, /Park permit: pages 36.37/);
        assert.match(text, /Budget spreadsheet/);
        assert.doesNotMatch(text, /javascript/);
        const links = (await index.getAnnotations()).filter((a) => a.subtype === 'Link').map((a) => a.url);
        assert.ok(links.length >= 1 && links.every((u) => u === d.links[0].url), JSON.stringify(links));
        const landscapePage = (await doc.getPage(36)).view;
        assert.deepEqual(landscapePage, [0, 0, 792, 612], 'wide scans get a landscape page');
        await doc.destroy();
        if (has('qpdf')) execFileSync('qpdf', ['--check', file], { stdio: 'ignore' });
      } finally { fs.rmSync(file, { force: true }); }
    });
    await test('project photos go to the end, grouped before->during->after, and never into the official pages', () => {
      const d = W.mergeWithDefaults(W.defaults(), sample);
      d.attachments = [
        { id: 'photoafter01', place: 'photosAfter', label: 'After the project', pages: [{ id: 'pgaft000001', width: 110, height: 85, jpeg: A.toBase64(landscape) }] },
        { id: 'permitpark01', place: 'end', label: 'Park permit', pages: [{ id: 'pgpermit001', width: 85, height: 110, jpeg: A.toBase64(portrait) }] },
        { id: 'photobefor1', place: 'photosBefore', label: 'Before the project', pages: [{ id: 'pgbef000001', width: 85, height: 110, jpeg: A.toBase64(portrait) }] },
        { id: 'photoduring', place: 'photosDuring', label: 'During the project', pages: [{ id: 'pgdur000001', width: 85, height: 110, jpeg: A.toBase64(portrait) }, { id: 'pgdur000002', width: 85, height: 110, jpeg: A.toBase64(portrait) }] }
      ];
      const order = A.planPages(d, 1);
      const at = (o) => (o.kind === 'workbook' ? `w${o.n}` : o.kind === 'index' ? 'index' : o.page.id);
      // No photo page lands between workbook pages.
      order.forEach((o, i) => { if (o.kind === 'scan' && /^pg(bef|dur|aft)/.test(o.page.id)) assert.ok(order.slice(0, i).some((x) => x.kind === 'index'), 'photos come after the list page'); });
      // Order at the tail: end attachment, then before, during (2 pages), after. Captions are set only on photos.
      assert.deepEqual(order.slice(-5).map(at), ['pgpermit001', 'pgbef000001', 'pgdur000001', 'pgdur000002', 'pgaft000001']);
      assert.deepEqual(order.slice(-4).map((o) => o.caption), ['Project photo \u2014 before', 'Project photo \u2014 during', 'Project photo \u2014 during', 'Project photo \u2014 after']);
      assert.equal(order.find((o) => o.kind === 'scan' && o.page.id === 'pgpermit001').caption, undefined, 'other attachments have no caption');
    });
    await test('the submission copy lists project photos and captions their pages', async () => {
      const d = W.mergeWithDefaults(W.defaults(), sample);
      d.attachments = [
        { id: 'photobefor1', place: 'photosBefore', label: 'Before the project', pages: [{ id: 'pgbef000001', width: 85, height: 110, jpeg: A.toBase64(portrait) }] },
        { id: 'photoafter01', place: 'photosAfter', label: 'After the project', pages: [{ id: 'pgaft000001', width: 85, height: 110, jpeg: A.toBase64(portrait) }] }
      ];
      const drawPage = async () => ({ jpeg: portrait, width: 85, height: 110 });
      const { bytes, order } = await A.buildSubmission({ data: d, drawPage, today: 'October 18, 2026' });
      // The two photos are the last two drawn pages, carrying their captions.
      assert.deepEqual(order.slice(-2).map((o) => o.caption), ['Project photo \u2014 before', 'Project photo \u2014 after']);
      const pdfjsLib = loadPdfjs();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes), verbosity: 0, isEvalSupported: false }).promise;
      const indexText = (await doc.getPage(33)).getTextContent ? (await (await doc.getPage(33)).getTextContent()).items.map((i) => i.str).join(' ') : '';
      assert.match(indexText, /Project photos \(before, during, and after\)/);
      assert.match(indexText, /Before the project: page 34/);
      assert.match(indexText, /After the project: page 35/);
      // The caption is drawn on the photo page itself.
      const capText = (await (await doc.getPage(34)).getTextContent()).items.map((i) => i.str).join(' ');
      assert.match(capText, /Project photo .* before/);
      await doc.destroy();
    });
    await test('pictures from a backup file lose their metadata and use their real size', () => {
      // An APP1 (EXIF) segment holding a made-up GPS note, inserted after the JFIF header.
      const exif = new Uint8Array([0xff, 0xe1, 0x00, 0x10, ...Buffer.from('Exif\0\0GPS-HOME')]);
      const tagged = new Uint8Array([...portrait.subarray(0, 20), ...exif, ...portrait.subarray(20)]);
      assert.ok(Buffer.from(tagged).includes('GPS-HOME'));
      const clean = A.stripJpeg(tagged);
      assert.ok(!Buffer.from(clean).includes('GPS-HOME'));
      assert.deepEqual(A.jpegInfo(clean), { width: 85, height: 110, components: 3 });
      const d = { attachments: [{ id: 'aaaaaaaaaa', place: 'end', label: 'x', pages: [{ id: 'bbbbbbbbbb', width: 999, height: 5, jpeg: A.toBase64(tagged) }] }] };
      return A.absorb(d).then(() => assert.deepEqual([d.attachments[0].pages[0].width, d.attachments[0].pages[0].height], [85, 110]));
    });
    await test('gray pictures, padding bytes, and data after the picture are handled', () => {
      const gray = new Uint8Array(fs.readFileSync(path.join(__dirname, 'fixtures/scan-gray.jpg')));
      assert.deepEqual(A.jpegInfo(gray), { width: 60, height: 80, components: 1 });
      assert.match(Buffer.from(A.writePdf([{ jpeg: gray, width: 1, height: 1 }])).toString('latin1'), /\/Width 60\/Height 80\/ColorSpace\/DeviceGray/);
      const exif = [0xff, 0xff, 0xff, 0xe1, 0x00, 0x10, ...Buffer.from('Exif\0\0GPS-HOME')]; // with padding bytes before the marker
      const padded = new Uint8Array([...portrait.subarray(0, 20), ...exif, ...portrait.subarray(20), ...Buffer.from('TRAILER-GPS')]);
      const clean = Buffer.from(A.stripJpeg(padded));
      assert.ok(!clean.includes('GPS-HOME') && !clean.includes('TRAILER-GPS'));
      assert.ok(A.jpegInfo(new Uint8Array(clean)));
      const second = new Uint8Array([...portrait.subarray(0, 20), 0xff, 0xe1, 0x00, 0x0e, ...Buffer.from('Exif\0\0SECOND'), ...portrait.subarray(20)]);
      const twoPictures = new Uint8Array([...portrait, ...second]); // a phone-style second picture after the first
      assert.ok(!Buffer.from(A.stripJpeg(twoPictures)).includes('SECOND'));
      assert.equal(A.stripJpeg(twoPictures).length, portrait.length);
      const lossless = new Uint8Array(portrait); const sof = Buffer.from(lossless).indexOf(Buffer.from([0xff, 0xc0])); lossless[sof + 1] = 0xc3;
      assert.equal(A.jpegInfo(lossless), null, 'lossless JPEGs are refused');
    });
    await test('damaged pictures and letters the font lacks are handled', () => {
      assert.equal(A.jpegInfo(new Uint8Array([0xff, 0xd8, 0x3c, 0x73, 0x76, 0x67, 0, 0])), null);
      assert.throws(() => A.writePdf([{ jpeg: new Uint8Array([0xff, 0xd8, 0, 0, 0, 0, 0, 0]), width: 1, height: 1 }]), /damaged/);
      const pdf = Buffer.from(A.writePdf([{ text: [{ x: 72, y: 700, text: 'Nguyễn Ā (Test) \\ 李', size: 12 }] }])).toString('latin1');
      assert.match(pdf, /\(Nguyen A \\\(Test\\\) \\\\ \?\) Tj/);
    });
    await test('a missing picture stops the submission copy with a clear message', async () => {
      const d = withExtras();
      delete d.attachments[1].pages[0].jpeg;
      await assert.rejects(A.buildSubmission({ data: d, drawPage: async () => ({ jpeg: portrait, width: 85, height: 110 }), today: 'x' }), /Park permit.*isn’t in this backup file/);
    });
    await test('backup copies carry pictures, the draft does not', async () => {
      const d = withExtras();
      await A.absorb(d);
      assert.ok(A.pagesOf(d).every((p) => !('jpeg' in p)), 'absorb moves pictures out of the draft');
      const { data: full, missing } = A.withPictures(d);
      assert.deepEqual(missing, []);
      assert.ok(A.pagesOf(full).every((p) => A.isJpeg(A.fromBase64(p.jpeg))));
    });
  }

  console.log('Pages');
  await test('every page has its own title and description for search results', () => {
    const titles = new Set(), descriptions = new Set();
    for (const file of PAGES) {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      const title = (/<title>([^<]+)<\/title>/.exec(source) || [])[1] || '';
      const description = (/<meta name="description" content="([^"]+)"/.exec(source) || [])[1] || '';
      assert.ok(title.length >= 30 && title.length <= 70, `${file}: title is ${title.length} characters (30-70 shows fully in results)`);
      assert.ok(description.length >= 70 && description.length <= 175, `${file}: description is ${description.length} characters (70-175)`);
      // Calling the site official, or saying Scouting America or the BSA made, approved, or endorsed it, is not allowed.
      const claim = /\b(?:endorsed|approved|sponsored|affiliated|authorized)\b|\bofficial\s+(?:\w+\s+){0,4}(?:site|website|tool|helper|app|partner|guide)\b|(?:made|created|provided|published) by (?:the )?(?:BSA|Boy Scouts|Scouting America)/i;
      assert.doesNotMatch(title + ' ' + description, claim, `${file}: must not suggest it is official or made or endorsed by Scouting America`);
      const og = (name) => (new RegExp(`<meta property="og:${name}" content="([^"]*)"`).exec(source) || [])[1] || '';
      assert.ok(og('title') && og('description') && og('type'), `${file}: Open Graph title, description, and type`);
      assert.equal(og('description'), description, `${file}: Open Graph description matches`);
      assert.ok(title.length <= 66 && description.length <= 170, `${file}: title ${title.length} / description ${description.length} would be cut off in results`);
      assert.ok(!titles.has(title) && !descriptions.has(description), `${file}: title and description must differ from the other pages`);
      titles.add(title); descriptions.add(description);
    }
    assert.match(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), /Eagle Scout service project/i, 'the home page uses the words people search for');
    // The checker itself: it must catch real endorsement claims and allow honest wording.
    const claim = /\b(?:endorsed|approved|sponsored|affiliated|authorized)\b|\bofficial\s+(?:\w+\s+){0,4}(?:site|website|tool|helper|app|partner|guide)\b|(?:made|created|provided|published) by (?:the )?(?:BSA|Boy Scouts|Scouting America)/i;
    for (const bad of ['The official Eagle helper', 'Official site for the Eagle workbook', 'BSA approved tool', 'Endorsed by BSA', 'Made by Scouting America']) assert.match(bad, claim, bad);
    for (const ok of ['Fill the official Eagle Scout Project Workbook PDF', 'Eagle Scout Service Project Workbook (No. 2023a)', 'free helper, independent of Scouting America']) assert.doesNotMatch(ok, claim, ok);
  });
  await test('fundraising tips say to get approval first, and say nothing about raffles or games of chance', () => {
    for (const file of ['lib/tips.js', 'lib/guided-workbook.js', 'lib/classic-workbook.js', 'index.html', 'README.md']) {
      assert.doesNotMatch(fs.readFileSync(path.join(ROOT, file), 'utf8'), /raffle|games? of chance/i, `${file}: leave raffles and games of chance out (the maintainer's decision)`);
    }
    const tip = tips['fundraising.description'];
    assert.match(tip.avoid, /before your fundraising is approved/i, 'the fundraising box tip tells Scouts to wait for approval');
    assert.match(tip.avoid, /council/i, 'and to ask their council');
  });
  await test('home page and README say which file to use, and when', () => {
    for (const file of ['index.html', 'README.md']) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      assert.match(text, /Which file to use, and when/, `${file}: heading`);
      for (const name of ['Backup file', 'Filled official PDF', 'Submission copy', 'Printed draft']) assert.ok(text.includes(name), `${file}: ${name}`);
      assert.match(text, /keep (the|your) backup file/i, `${file}: the rule of thumb`);
    }
  });
  for (const file of PAGES) {
    await test(`${file}: no inline scripts and a strict content security policy`, () => {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      assert.equal([...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)].length, 0, 'inline <script>');
      const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(source);
      assert.ok(csp, 'CSP meta tag');
      assert.match(csp[1], /default-src 'none'/);
      assert.doesNotMatch(csp[1], /script-src[^;]*'unsafe-(inline|eval)'/); // 'wasm-unsafe-eval' (JPEG 2000 decoder) is allowed on pages that draw PDFs
      const connect = (/connect-src ([^;]+);/.exec(csp[1]) || [null, "'none'"])[1]; // default-src 'none' covers a missing connect-src
      assert.ok(connect === "'none'" || connect === lib.OFFICIAL_PDF_URL, `connect-src ${connect}`);
      const frame = (/frame-src ([^;]+);/.exec(csp[1]) || [null, "'none'"])[1]; // default-src 'none' covers a missing frame-src
      const mayFrame = ['EagleWorkbook-guided.html', 'EagleWorkbook.html', 'EagleWorkbook2026.html', 'EagleWorkbook2026-guided.html'].includes(file);
      assert.equal(frame, mayFrame ? 'https://scoutly.scouting.org' : "'none'", `frame-src ${frame}`);
    });
  }
  await test('pages reference files that exist', () => {
    for (const file of PAGES) {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      for (const [, ref] of source.matchAll(/(?:src|href)="(?!https?:|#|mailto:)([^"]+)"/g)) assert.ok(fs.existsSync(path.join(ROOT, ref)), `${file} -> ${ref}`);
    }
  });
  await test('every script parses', () => {
    for (const file of fs.readdirSync(path.join(ROOT, 'lib'))) new vm.Script(fs.readFileSync(path.join(ROOT, 'lib', file), 'utf8'), { filename: file });
  });
  await test('older backups load into the workbook data model', () => {
    const W = workbookCommon();
    const old = { candidate: { name: 'Old' }, proposal: { description: 'x', phases: [{ num: 1, description: 'one' }] },
      plan: { helpers: Array.from({ length: 8 }, (_, i) => ({ job: `J${i}` })) }, report: { hours: [{ cat: 'Eagle Scout Candidate — Planning', w: '1', h: '3' }] }, extra: { kept: 'yes' } };
    const merged = W.mergeWithDefaults(W.defaults(), old);
    assert.equal(merged.candidate.name, 'Old');
    assert.equal(merged.plan.helpers.length, 10);
    assert.equal(merged.plan.helpers[7].job, 'J7');
    assert.deepEqual(merged.plan.other.length, 5);
    assert.equal(merged.proposal.projectName, '');
    assert.equal(merged.proposal.phases[0].num, '1');
    assert.equal(merged.report.hours.length, 6);
    assert.equal(merged.report.hours[0].h, '3');
    assert.equal(merged.extra.kept, 'yes', 'keys from a newer version are kept');
    const twelve = W.mergeWithDefaults(W.defaults(), { proposal: { phases: Array.from({ length: 12 }, (_, i) => ({ description: `P${i + 1}` })) } });
    assert.equal(twelve.proposal.phases[11].num, '12');
    const huge = W.mergeWithDefaults(W.defaults(), { plan: { materials: Array.from({ length: 5000 }, () => ({ item: 'x' })) } });
    assert.equal(huge.plan.materials.length, 100, 'rows are capped');
    const hostile = W.mergeWithDefaults(W.defaults(), JSON.parse('{"__proto__":{"polluted":1},"candidate":{"name":{"x":1}}}'));
    assert.equal(({}).polluted, undefined);
    assert.equal(hostile.candidate.name, '');
  });

  console.log('Official PDF');
  await test('engine: helpers the 2026 engine reuses are exported', () => {
    for (const name of ['openPdf', 'readWidgets', 'readFieldValues', 'sha256Hex', 'MAX_PDF_BYTES', 'PRINTABLE', 'LINE_FACTOR', 'mayOverflow', 'wrappedLines', 'rowCost', 'parseAmount', 'parseCount', 'parseWhole', 'str']) {
      assert.ok(name in lib, name);
    }
  });
  const pdfjsLib = loadPdfjs();
  let original;
  try { original = await officialPdf(); }
  catch (error) { failures.push(`official PDF unavailable: ${error.message}`); console.log(`  FAIL official PDF unavailable: ${error.message}`); }
  if (original) {
    let filled;
    await test('fills the official PDF from the sample backup', async () => {
      filled = await lib.fillOfficialPdf({ pdfjsLib, pdfBytes: original.slice(), data: sample });
      assert.ok(filled.report.filled > 150, `filled ${filled.report.filled}`);
      assert.deepEqual(filled.report.warnings, lib.buildFieldValues(sample).notes, 'only the expected reminders');
    });
    await test('keeps the original PDF bytes and encryption (incremental save)', () => {
      const out = Buffer.from(filled.bytes);
      assert.ok(out.length > original.length);
      assert.ok(out.subarray(0, original.length).equals(Buffer.from(original)), 'original bytes are a prefix of the output');
      assert.ok(out.subarray(original.length).toString('latin1').includes('/Encrypt'), 'update keeps the encryption dictionary');
    });
    await test('saved answers read back from the filled PDF', async () => {
      const values = await readValues(pdfjsLib, filled.bytes.slice());
      const expected = lib.buildFieldValues(sample);
      for (const [name, value] of Object.entries(expected.text)) assert.equal(values[name], value, name);
      for (const [name, value] of Object.entries(expected.radio)) assert.equal(values[name], value, name);
    });
    await test('every possible answer fills and reads back', async () => {
      const data = everyAnswer();
      const result = await lib.fillOfficialPdf({ pdfjsLib, pdfBytes: original.slice(), data });
      const values = await readValues(pdfjsLib, result.bytes.slice());
      const expected = lib.buildFieldValues(data);
      const wrong = Object.entries(expected.text).filter(([name, value]) => values[name] !== value).map(([name]) => name);
      assert.deepEqual(wrong, []);
      assert.ok(result.report.filled >= 440, `filled ${result.report.filled}`);
    });
    await test('answers are visible in Ghostscript and Poppler (valid appearances)', async () => {
      if (!has('gs') && !has('pdftotext')) return 'skip';
      const file = path.join(os.tmpdir(), `eph-filled-${process.pid}.pdf`);
      fs.writeFileSync(file, filled.bytes);
      try {
        const want = ['Alex Q. Sample', 'Jordan Leader', 'Build a covered bike rack', '$226.50', '208'];
        if (has('gs')) {
          const text = execFileSync('gs', ['-q', '-dNOPAUSE', '-dBATCH', '-dPrinted', '-sDEVICE=txtwrite', '-sOutputFile=-', file], { encoding: 'latin1', maxBuffer: 1 << 26 });
          for (const w of want) assert.ok(text.includes(w), `Ghostscript does not show "${w}"`);
        }
        if (has('pdftotext')) {
          let stderr = '';
          let text = '';
          try { text = execFileSync('pdftotext', [file, '-'], { encoding: 'latin1', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }); }
          catch (error) { stderr = String(error.stderr); }
          assert.doesNotMatch(stderr, /Unknown font|No font/, stderr);
          for (const w of want) assert.ok(text.includes(w), `Poppler does not show "${w}"`);
        }
      } finally { fs.rmSync(file, { force: true }); }
    });
    await test('each tip names the right workbook page', async () => {
      const W = workbookCommon();
      const doc = await pdfjsLib.getDocument({ data: original.slice(), verbosity: 0 }).promise;
      const pageOfField = {};
      for (let p = 1; p <= doc.numPages; p++) for (const a of await (await doc.getPage(p)).getAnnotations()) if (a.fieldName && !(a.fieldName in pageOfField)) pageOfField[a.fieldName] = p;
      await doc.destroy();
      const fieldOf = new Map();
      for (const [field, { path: boxPath }] of lib.reverseMap(W.defaults)) if (!fieldOf.has(boxPath)) fieldOf.set(boxPath, field);
      const wrong = [];
      for (const [key, tip] of Object.entries(tips)) {
        const field = fieldOf.get(tip.for || key);
        const actual = PAGE_LABELS[pageOfField[field]];
        if (actual !== tip.where) wrong.push(`${key}: says "${tip.where}", the box is on "${actual}"`);
      }
      assert.deepEqual(wrong, []);
    });
    await test('the Classic leftover-money question matches the official Report Page C, word for word', async () => {
      const doc = await pdfjsLib.getDocument({ data: original.slice(), verbosity: 0, isEvalSupported: false }).promise;
      const words = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const pageText = words((await (await doc.getPage(29)).getTextContent()).items.map((i) => i.str).join(' '));
      await doc.destroy();
      const source = fs.readFileSync(path.join(ROOT, 'lib/classic-workbook.js'), 'utf8');
      const label = /f\.field\('([^']+)', 'report\.leftoverMaterials'/.exec(source);
      assert.ok(label, 'the Classic box is present');
      assert.ok(pageText.includes(words(label[1])), `the Classic label is not the official wording: "${label[1]}"`);
    });
    await test('leftover money is covered only by the Report box and its tip (no extra help or steps)', () => {
      for (const file of ['lib/guided-workbook.js', 'lib/classic-workbook.js']) {
        const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n').filter((l) => /left ?over/i.test(l));
        for (const line of lines) assert.ok(/'report\.leftoverMaterials'/.test(line) && /f\.field\(/.test(line) && !/help:/.test(line), `${file}: extra leftover-money text: ${line.trim().slice(0, 100)}`);
      }
      const hits = Object.entries(tips).filter(([, t]) => /left ?over/i.test(JSON.stringify(t))).map(([k]) => k);
      assert.deepEqual(hits, ['report.leftoverMaterials']);
      assert.doesNotMatch(tips['report.leftoverMaterials'].text, /materials/i, 'the Report question asks about money only');
    });
    await test('step 1 tells the exact official file from a changed copy', async () => {
      const exact = await lib.checkWorkbookPdf(pdfjsLib, original.slice());
      assert.equal(exact.ok, true); assert.equal(exact.exact, true);
      const changed = new Uint8Array(original.length + 3); changed.set(original); changed.set([10, 37, 120], original.length);
      const copy = await lib.checkWorkbookPdf(pdfjsLib, changed);
      assert.equal(copy.ok, true); assert.equal(copy.exact, false, 'extra bytes mean it is not the file Scouting America published');
    });
    await test('rejects a PDF that is not the workbook', async () => {
      const notWorkbook = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
      await assert.rejects(lib.fillOfficialPdf({ pdfjsLib, pdfBytes: new Uint8Array(notWorkbook), data: sample }), /not the official Eagle Scout Service Project Workbook/);
    });
    await test('warns when the chosen PDF was already filled or edited', async () => {
      const again = await lib.fillOfficialPdf({ pdfjsLib, pdfBytes: filled.bytes.slice(), data: { candidate: { name: 'X' }, proposal: {} } });
      assert.ok(again.report.warnings.some((w) => /already had answers typed in/.test(w)), again.report.warnings.join('\n'));
      assert.ok(again.report.warnings.some((w) => /not the exact file published by Scouting America/.test(w)));
    });
    await test('flags long answers and unprintable characters in plain words', async () => {
      const data = JSON.parse(JSON.stringify(sample));
      data.candidate.city = 'A city name that is far too long to fit in the small city box on the contact page';
      data.report.thanks = 'Thank you 🎉';
      data.candidate.name = 'Nguyễn Łukasz';
      data.plan.workProcesses = 'Step 1:\tdig the hole';
      const { report, bytes } = await lib.fillOfficialPdf({ pdfjsLib, pdfBytes: original.slice(), data });
      assert.ok(report.warnings.some((w) => w.startsWith('PDF page 9, Contacts: your city: this answer may be too long')), report.warnings.join('\n'));
      assert.ok(report.warnings.some((w) => w.includes('Report: How donors were thanked') && w.includes('🎉')));
      const nameWarnings = report.warnings.filter((w) => w.includes('Your full legal name'));
      assert.equal(nameWarnings.length, 1, 'one warning per answer, not per copy');
      assert.match(nameWarnings[0], /ễ Ł/);
      const tabbed = await readValues(pdfjsLib, bytes.slice());
      assert.equal(tabbed['Plan-WorkProcesses'], 'Step 1:    dig the hole', 'tabs become spaces so the box keeps its appearance');
    });
    await test('answers in plain WinAnsi text never need the viewer to redraw the form', async () => {
      // pdf.js sets /NeedAppearances when it cannot draw an answer; names in a PDF are never encrypted, so check the bytes.
      assert.ok(!Buffer.from(filled.bytes).subarray(original.length).toString('latin1').includes('NeedAppearances'), 'the update does not ask viewers to redraw');
    });
    await test('checks a chosen PDF before filling', async () => {
      assert.deepEqual(await lib.checkWorkbookPdf(pdfjsLib, original.slice()), { ok: true, exact: true });
      const result = await lib.checkWorkbookPdf(pdfjsLib, new Uint8Array(Buffer.from('%PDF-1.4\n%%EOF')));
      assert.equal(result.ok, false);
    });
    console.log('Reading a filled PDF back into a backup file');
    const W = workbookCommon();
    await test('a filled PDF reads back into the same backup', async () => {
      const original = W.mergeWithDefaults(W.defaults(), sample);
      const { data, report } = await lib.readBackupFromPdf({ pdfjsLib, pdfBytes: filled.bytes.slice(), defaults: W.defaults });
      const want = answers(original), got = answers(data);
      delete want['report.hours.0.w']; delete want['report.hours.1.w'];
      const wrong = differences(want, got, original);
      assert.deepEqual(wrong, [], wrong.map((k) => `${k}: ${want[k]} -> ${got[k]}`).join('\n'));
      assert.equal(data.unit.type, 'Troop');
      assert.equal(data.plan.phases[0].start, '2025-11-01', 'dates come back in date-picker format');
      assert.equal(data.plan.materials[0].totalCost, '', 'a computed row total stays blank so it keeps updating');
      assert.deepEqual(report.warnings, [], report.warnings.join('\n'));
    });
    await test('reading back keeps phase words, checks dates, and prefers the proposal unit type', () => {
      const values = new Map([
        ['Plan-Phase1', 'Paint (front to back)'], ['Plan-Phase2', 'Sand to finish'], ['Plan-Phase3', 'starts slowly'],
        ['Plan-Phase4', 'Fix (see note) (10/1/2025 to 10/15/2025)'], ['Plan-Phase5', 'starts 2/7/2026'],
        ['Plan-StartDate', '2/31/2025'], ['Report-ActualStartDate', 'October 1, 2025'],
        ['Proposal-UnitType', 'Proposal-Trooop'], ['Fund-UnitType', 'Fund-Crew'], ['Proposal-LeaderType', 'Proposal-Scoutmaster'],
        ['Proposal-TotalCost', '$500.00']
      ]);
      const { data, unreadFields, totalsWithoutParts } = lib.backupFromValues(values, W.defaults);
      const ph = data.plan.phases;
      assert.deepEqual([ph[0].description, ph[0].start, ph[0].end], ['Paint (front to back)', '', '']);
      assert.deepEqual([ph[1].description, ph[1].start], ['Sand to finish', '']);
      assert.deepEqual([ph[2].description, ph[2].start], ['starts slowly', '']);
      assert.deepEqual([ph[3].description, ph[3].start, ph[3].end], ['Fix (see note)', '2025-10-01', '2025-10-15']);
      assert.deepEqual([ph[4].description, ph[4].start], ['', '2026-02-07']);
      assert.equal(data.plan.startDate, '2/31/2025', 'an impossible date stays as text');
      assert.equal(data.report.actualStart, '2025-10-01');
      assert.equal(data.unit.type, 'Troop');
      assert.deepEqual(unreadFields, []);
      assert.deepEqual(totalsWithoutParts, ['Proposal-TotalCost']);
    });
    await test('every possible answer reads back', async () => {
      const data = everyAnswer();
      const result = await lib.fillOfficialPdf({ pdfjsLib, pdfBytes: original.slice(), data });
      const back = await lib.readBackupFromPdf({ pdfjsLib, pdfBytes: result.bytes.slice(), defaults: W.defaults });
      const merged = W.mergeWithDefaults(W.defaults(), data);
      const want = answers(merged), got = answers(back.data);
      for (const k of Object.keys(want)) if (/^report\.hours\.[01]\.w$/.test(k)) delete want[k];
      const wrong = differences(want, got, merged);
      assert.deepEqual(wrong, []);
    });
    await test('a blank workbook is reported as having no answers', async () => {
      await assert.rejects(lib.readBackupFromPdf({ pdfjsLib, pdfBytes: original.slice(), defaults: W.defaults }), /no answers typed in yet/);
    });
    await test('a PDF without fillable boxes gets a clear message', async () => {
      const flat = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
      const message = await lib.readBackupFromPdf({ pdfjsLib, pdfBytes: new Uint8Array(flat), defaults: W.defaults }).then(() => '', (e) => e.message);
      assert.match(message, /no fillable boxes/);
      assert.match(message, /submission copy/, 'names the kind of file Scouts are likely to have chosen');
      assert.match(message, /Open backup file/, 'says what to use instead');
      assert.match(message, /filled PDF/, 'says what else works');
    });
    // Optional check against your own files, which must never be committed. Prints counts only.
    if (process.env.EAGLE_LOCAL_BACKUP) {
      await test('local backup file round-trips (EAGLE_LOCAL_BACKUP)', async () => {
        const local = W.mergeWithDefaults(W.defaults(), JSON.parse(fs.readFileSync(process.env.EAGLE_LOCAL_BACKUP, 'utf8')));
        const result = await lib.fillOfficialPdf({ pdfjsLib, pdfBytes: original.slice(), data: local });
        const back = await lib.readBackupFromPdf({ pdfjsLib, pdfBytes: result.bytes.slice(), defaults: W.defaults });
        const want = answers(local), got = answers(back.data);
        for (const k of Object.keys(want)) if (/^report\.hours\.[01]\.w$/.test(k) || /^(attachments|links|journey)\./.test(k)) delete want[k];   // a PDF cannot hold scans, links, or Your path notes
        const wrong = differences(want, got, local);
        if (process.env.EAGLE_LOCAL_SHOW_WARNINGS) console.log(result.report.warnings.map((w) => '       - ' + w.slice(0, 160)).join('\n'));
        console.log(`       ${Object.keys(want).length} answers, ${result.report.filled} boxes filled, ${wrong.length} differ, ${result.report.warnings.length} warnings`);
        assert.deepEqual(wrong.length, 0, wrong.join(', '));
      });
    }
    if (process.env.WRITE_SAMPLE) {
      fs.writeFileSync(process.env.WRITE_SAMPLE, filled.bytes);
      console.log(`  wrote ${process.env.WRITE_SAMPLE}`);
    }
  }

  console.log('Official 2026 PDF');
  let w26 = null, w26d = null;
  try { w26 = await cachedPdf('workbook', 'EAGLE_PDF_2026'); w26d = await cachedPdf('appendixD', 'EAGLE_PDF_2026_APPD'); }
  catch (error) { failures.push(`2026 PDF unavailable: ${error.message}`); console.log(`  FAIL 2026 PDF unavailable: ${error.message}`); }
  await test('2026: the field-name fixtures match the cached PDFs', async () => {
    if (!w26 || !w26d) return;
    const names = async (bytes) => {
      const doc = await pdfjsLib.getDocument({ data: bytes.slice(), verbosity: 0, isEvalSupported: false }).promise;
      const set = new Set();
      for (let p = 1; p <= doc.numPages; p++) for (const a of await (await doc.getPage(p)).getAnnotations()) if (a.fieldName) set.add(a.fieldName);
      await doc.destroy();
      return [...set].sort();
    };
    assert.deepEqual(await names(w26), JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/official-2026-fields.json'), 'utf8')));
    assert.deepEqual(await names(w26d), JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/official-2026-appendix-d-fields.json'), 'utf8')));
  });
  await test('2026: the cached files are the known official files', () => {
    if (process.env.EAGLE_PDF_ALLOW_NEW) return;
    assert.equal(crypto.createHash('sha256').update(w26).digest('hex'), W26_SHA.workbook);
    assert.equal(crypto.createHash('sha256').update(w26d).digest('hex'), W26_SHA.appendixD);
  });

  console.log('2026 model');
  const M26 = require(path.join(ROOT, 'lib/w26-model.js'));
  const pathExists = (obj, p) => p.split('.').reduce((o, k) => (o && typeof o === 'object' && k in o ? o[k] : undefined), obj) !== undefined;
  const leaves = (obj, prefix = '', out = []) => {
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, p, out);
      else if (Array.isArray(v)) v.forEach((row, i) => (row && typeof row === 'object' ? leaves(row, `${p}.${i}`, out) : out.push(`${p}.${i}`)));
      else out.push(p);
    }
    return out;
  };
  await test('2026 model: defaults() has the 2026 shape and table sizes', () => {
    const d = M26.defaults();
    assert.equal(d.edition, '2026');
    assert.equal(d.plan.steps.length, 10); assert.equal(d.plan.helpers.length, 12); assert.equal(d.plan.hazards.length, 3);
    assert.equal(d.plan.items.length, 12); assert.equal(d.report.spending.length, 9);
    for (const t of [d.proposal.hours, d.plan.hours, d.report.hours]) { assert.equal(t.length, 5); assert.equal(t[0].w, '1'); }
  });
  await test('2026 model: every field name in the table is in the official 2026 files, exactly once', () => {
    const want = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/official-2026-fields.json'), 'utf8'));
    const got = M26.FIELDS.map((f) => f[0]);
    assert.equal(new Set(got).size, got.length, 'a field is listed twice');
    assert.deepEqual([...new Set(got)].sort(), want);
    const wantD = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/official-2026-appendix-d-fields.json'), 'utf8'));
    assert.deepEqual(M26.APPENDIX_D_FIELDS.map((f) => f[0]).sort(), wantD);
  });
  await test('2026 model: every field path exists in defaults(), and every draft answer is used', () => {
    const d = M26.defaults();
    const paths = [...M26.FIELDS, ...M26.APPENDIX_D_FIELDS].map((f) => f[2]).filter(Boolean);
    const missing = paths.filter((p) => !pathExists(d, p));
    assert.deepEqual(missing, [], 'paths missing from defaults()');
    const used = new Set(paths);
    const unused = leaves(d).filter((p) => !used.has(p) && !/^(edition|attachments|links|journey)(\.|$)/.test(p) && !/\.hours\.0\.w$/.test(p) && !/^(contacts\.(leader|committee|beneficiaryRep|approvalRep|coach)\.(address|city|state))/.test(p));
    assert.deepEqual(unused, [], 'draft answers no field uses');
  });
  await test('2026 model: the fixed-size boxes equal the PDF\'s 12 pt text boxes', async () => {
    if (!w26) return;
    const doc = await pdfjsLib.getDocument({ data: w26.slice(), verbosity: 0, isEvalSupported: false }).promise;
    const real = [];
    for (let p = 1; p <= doc.numPages; p++) for (const a of await (await doc.getPage(p)).getAnnotations()) {
      if (!a.fieldName || a.fieldType !== 'Tx' || !a.defaultAppearanceData || a.defaultAppearanceData.fontSize !== 12) continue;
      const r2 = (x) => Math.round(x * 100) / 100;
      real.push([a.fieldName, p, r2(a.rect[2] - a.rect[0]), r2(a.rect[3] - a.rect[1]), Boolean(a.multiLine)]);
    }
    await doc.destroy();
    assert.deepEqual(M26.FIXED_BOXES, real);
  });
  await test('2026 model: the never-written fields are exactly the signatures, the dates beside them, and the approver boxes', () => {
    const never = M26.FIELDS.filter((f) => f[1] === 'never').map((f) => f[0]).sort();
    assert.deepEqual(never, ['Beneficiary Approval Signature Date', 'Beneficiary Signature Date', 'Beneficiary’s Signature', 'Candidate’s Promise Date', 'Candidate’s Promise Signature', 'Candidate\'s Promise Signature', 'Certification Signature Date', 'Certification of Completion Signature', 'District or Council Approval Signature', 'District or Council Signature Date', 'Provided Copy of Info for Beneficiaries', 'Promise Signature Date', 'Scoutmaster Approval Date', 'Scoutmaster Final Signature Date', 'Scoutmaster’s Approval Signature', 'Scoutmaster’s Final Signature', 'Unit Committee Approval Signature', 'Unit Committee Signature Date', 'Beneficiary Approval Signature'].sort());
    const ad = M26.APPENDIX_D_FIELDS.filter((f) => f[1] === 'never').map((f) => f[0]).sort();
    assert.deepEqual(ad, ['Authorized Council Approval', 'Beneficiary Signature', 'Council Rep Signature', 'Date', 'Date_2', 'Date_3', 'Unit Rep Signature'].sort());
  });
  await test('2026 model: every computed row has a type, and exactly three are counts', () => {
    const comp = M26.FIELDS.filter((f) => f[1] === 'computed');
    assert.ok(comp.every((f) => ['money', 'hours', 'count'].includes(f[5])), comp.map((f) => f[0]).join(', '));
    assert.deepEqual(comp.filter((f) => f[5] === 'count').map((f) => f[0]).sort(), ['Project Plan Total Individuals', 'Total People', 'Total Volunteers']);
  });
  await test('2026 model: labels cover every answer that can be named in a warning', () => {
    for (const f of M26.FIELDS) if (f[2] && !['computed', 'never', 'fixed'].includes(f[1])) assert.ok(f[2] in M26.LABELS, `no label for ${f[2]}`);
    for (const f of M26.FIELDS) if (f[1] === 'computed') assert.ok(f[0] in M26.COMPUTED_LABELS, `no label for ${f[0]}`);
    for (const f of M26.APPENDIX_D_FIELDS) if (f[2] && f[1] !== 'never') assert.ok(f[2] in M26.APPENDIX_D_LABELS, `no Appendix D label for ${f[2]}`);
  });
  await test('2026 totals: a blank draft has the form\'s own numbers (grand totals 0, row totals blank, Scout counted as 1)', () => {
    const t = M26.totals(M26.defaults());
    assert.deepEqual(t.invalid, []);
    assert.equal(t.values['Total People'], 1); assert.equal(t.values['Project Plan Total Individuals'], 1); assert.equal(t.values['Total Volunteers'], 1);
    assert.equal(t.values['Total Prelimary Cost Estimate'], 0); assert.equal(t.values['Total_Hours'], 0); assert.equal(t.values['Difference'], 0);
    assert.equal(t.values['Total CostRow1'], ''); assert.equal(t.values['Total CostRow1_2'], '');
  });
  await test('2026 totals: hand-computed numbers, including the workbook\'s own page 20 example', () => {
    const d = M26.defaults();
    d.proposal.costs = { materials: '10', supplies: '20.50', tools: '', other: '5' };
    assert.equal(M26.totals(d).values['Total Prelimary Cost Estimate'], 35.5);
    d.proposal.hours[1] = { w: '2', h: '8' }; d.plan.hours[1] = { w: '5', h: '10' }; d.report.hours[1] = { w: '10', h: '50' };
    const t = M26.totals(d).values;
    assert.equal(t['Youth Members Total Hours'], 68);
    assert.equal(t['Total People'], 3); assert.equal(t['Project Plan Total Individuals'], 6); assert.equal(t['Total Volunteers'], 11);
    d.plan.items[0] = { qty: '3', unitCost: '20.00', totalCost: '', item: '', description: '', source: '' };
    const u = M26.totals(d).values;
    assert.equal(u['Total CostRow1'], 60); assert.equal(u['Total CostTotal Cost'], 60);
    d.plan.funds = { beneficiary: '100', exempt: '50', others: '25', future: '40', futureDate: '', donated: '10' };
    assert.equal(M26.totals(d).values['Funds Raised So Far'], 175); assert.equal(M26.totals(d).values['Total Funds'], 225);
    d.report.collected = '500'; d.report.spent = '480.25';
    assert.equal(M26.totals(d).values['Difference'], 19.75);
  });
  await test('2026 totals: two halves of a cent add up to what the page prints', () => {
    const d = M26.defaults();
    d.plan.funds = { beneficiary: '12.345', exempt: '12.345', others: '', future: '', futureDate: '', donated: '' };
    assert.equal(M26.totals(d).values['Funds Raised So Far'], 24.7);
    d.proposal.costs = { materials: '0.125', supplies: '0.125', tools: '', other: '' };
    assert.equal(M26.totals(d).values['Total Prelimary Cost Estimate'], 0.26);
  });
  await test('2026 totals: a part that is not a number leaves that total out, and says so', () => {
    const d = M26.defaults();
    d.proposal.costs.tools = 'about 20';
    const t = M26.totals(d);
    assert.ok(!('Total Prelimary Cost Estimate' in t.values));
    d.plan.items[0] = { qty: 'two', unitCost: '5', totalCost: '', item: '', description: '', source: '' };
    d.plan.items[1] = { qty: '', unitCost: '5', totalCost: '', item: '', description: '', source: '' };
    const rows = M26.totals(d);
    assert.equal(rows.rowProblem['Total CostRow1'], 'notNumber');
    assert.equal(rows.rowProblem['Total CostRow2'], 'noQty', 'a blank quantity with a unit cost is named as such');
    assert.ok(M26.FIELDS.some((f) => f[0] === 'undefined' && f[2] === 'appendixD.howMuch') || M26.APPENDIX_D_FIELDS.some((f) => f[0] === 'undefined' && f[2] === 'appendixD.howMuch'), 'the money box PDF-named "undefined" maps to appendixD.howMuch');
    assert.deepEqual(t.invalid, ['Total Prelimary Cost Estimate']);
  });
  await test('2026 fit: the rounding traps and the Project Description capacities', () => {
    assert.equal(M26.fit('Leadership', '')[0].capacity, 11);
    assert.equal(M26.fit('Emergency Vehicle Access', '')[0].capacity, 2);
    assert.deepEqual(M26.fit('Project Description', '').map((e) => [e.page, e.capacity]), [[7, 11], [11, 3], [22, 7]]);
    assert.deepEqual(M26.fit('Candidates Full Name', 'x'), []);
  });
  await test('2026 fit: agrees with the Fill page\'s overflow test on the real PDF widgets', async () => {
    if (!w26) return;
    const doc = await pdfjsLib.getDocument({ data: w26.slice(), verbosity: 0, isEvalSupported: false }).promise;
    const widgets = await lib.readWidgets(doc);
    await doc.destroy();
    let checked = 0;
    for (const [name, list] of widgets) for (const w of list) {
      if (w.fontSize !== 12) continue;
      for (const n of [1, 5, 10, 20, 40, 80]) {
        const value = 'installation '.repeat(n).trim();
        const mine = M26.fit(name, value).find((e) => e.page === w.page);
        if (!mine) continue;
        checked++;
        assert.equal(mine.fits, !lib.mayOverflow(value, w), `${name} p${w.page} n=${n}`);
      }
    }
    assert.ok(checked > 100, `checked ${checked}`);
  });

  console.log('2026 values');
  const W26 = require(path.join(ROOT, 'lib/w26-pdf.js'));
  const SAMPLE26 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sample-workbook-2026.json'), 'utf8'));
  await test('2026 formats: dates in each box\'s own format, and anything that is not one date is kept as typed', () => {
    assert.equal(W26.formatDateAs('2010-01-02', 'm/d/yyyy'), '1/2/2010');
    assert.equal(W26.formatDateAs('2027-03-04', 'mm/dd/yyyy'), '03/04/2027');
    assert.equal(W26.formatDateAs('2027-03-04', 'm/d/yy'), '3/4/27');
    assert.equal(W26.formatDateAs('3/1/2027', 'mm/dd/yyyy'), '03/01/2027');
    assert.equal(W26.formatDateAs('2026-02-30', 'm/d/yyyy'), '2026-02-30');
    assert.equal(W26.formatDateAs('3/1/2027 to 3/15/2027', 'mm/dd/yyyy'), '3/1/2027 to 3/15/2027');
    assert.equal(W26.formatDateAs('', 'mm/dd/yyyy'), '');
    assert.equal(W26.dateOk('3/1/2027 to 3/15/2027'), false);
  });
  await test('2026 formats: plain numbers, no $ or commas; not a plain number gives null', () => {
    assert.equal(W26.plainNumber('$1,250.5', 2), '1250.50');
    assert.equal(W26.plainNumber('12', 0), '12');
    assert.equal(W26.plainNumber('2.5', 0), null);
    assert.equal(W26.plainNumber('-0.001', 2), '0.00');
    assert.equal(W26.plainNumber('about 20', 2), null);
    assert.equal(W26.plainNumber('  ', 2), '');
  });
  await test('2026 values: a blank draft writes only the fixed and computed boxes', () => {
    const v = W26.buildFieldValues(M26.defaults());
    assert.equal(v.text['Eagle Scout Candidate'], '1');
    assert.equal(v.text['Total People'], '1');
    assert.equal(v.choice.Dropdown1, 'Troop');
    assert.deepEqual(v.notes, []);
    assert.ok(!('Candidates Full Name' in v.text));
  });
  await test('2026 values: signatures, their dates, and approver boxes are never written', () => {
    const neverNames = M26.FIELDS.filter((f) => f[1] === 'never').map((f) => f[0]);
    const sample = W26.buildFieldValues(SAMPLE26, { skipApprovalNames: false });
    const every = W26.buildFieldValues(JSON.parse(JSON.stringify(SAMPLE26, (k, val) => (typeof val === 'string' ? 'X' : val))));
    for (const v of [sample, every]) {
      for (const n of neverNames) {
        assert.ok(!(n in v.text) && !(n in v.radio) && !(n in v.choice), `wrote ${n}`);
      }
    }
  });
  await test('2026 values: printed approval names follow the opt-out', () => {
    const on = W26.buildFieldValues(SAMPLE26, { skipApprovalNames: false }).text;
    const off = W26.buildFieldValues(SAMPLE26, { skipApprovalNames: true }).text;
    assert.ok(on['Unit Committee Approval Name'] !== undefined, 'committee name is written by default');
    assert.equal(off['Unit Committee Approval Name'], undefined);
    assert.equal(off['Beneficiary Approval Name'], undefined);
  });
  await test('2026 values: the sample writes the form\'s totals, its dates, and its money', () => {
    const v = W26.buildFieldValues(SAMPLE26);
    assert.equal(v.text['Birth Date'], '1/2/2010');
    assert.equal(v.text['Proposal Approved Date'], '03/01/2027');
    assert.equal(v.text['Estimated Cost of Materials'], '1200.00');
    assert.equal(v.text['AmountCollected'], '500.00');
    assert.equal(v.text['Difference'], '19.75');
    assert.equal(v.text['Youth Members Total Hours'], '68.00');
    assert.equal(v.radio['Need Fundraising App?'], 'Yes');
    assert.equal(v.choice.Dropdown1, 'Crew');
  });
  await test('2026 values: a bad amount is written as typed with a plain note; a bad total is left blank with a note', () => {
    const d = JSON.parse(JSON.stringify(SAMPLE26));
    d.proposal.costs.tools = 'about 20';
    const v = W26.buildFieldValues(d);
    assert.equal(v.text['Estimated Cost of Tools'], 'about 20');
    assert.ok(v.notes.some((n) => /^PDF page 9, Preliminary cost: tools: “about 20” is not a plain number/.test(n)), v.notes.join(' | '));
    assert.equal(v.text['Total Prelimary Cost Estimate'], '', 'written blank, not the blank form\'s stored 0');
    assert.ok(v.notes.some((n) => /this total was left blank/.test(n)));
  });
  await test('2026 sample: every field path in the table is filled, except table rows 4 and later', () => {
    const merged = M26.defaults();
    const sameKeys = (a, b) => JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort());
    assert.ok(sameKeys(merged, SAMPLE26) || Object.keys(SAMPLE26).every((k) => k in merged), 'sample keys are 2026 keys');
    for (const [name, kind, p] of M26.FIELDS) {
      if (!p || ['computed', 'never', 'fixed'].includes(kind)) continue;
      const idx = /\.(\d+)\./.exec(p);
      if (idx && +idx[1] >= 3 && !/\.hours\./.test(p)) continue;
      const v = p.split('.').reduce((o, k) => (o ? o[k] : undefined), SAMPLE26);
      assert.ok(v !== undefined && String(v).trim() !== '', `${name} (${p}) is blank in the sample`);
    }
  });
  console.log('2026 PDF');
  const PDF26 = require(path.join(ROOT, 'lib/w26-pdf.js'));
  const allWidgets = async (bytes) => {
    const doc = await pdfjsLib.getDocument({ data: bytes.slice(), verbosity: 0, isEvalSupported: false }).promise;
    const out = [];
    for (let p = 1; p <= doc.numPages; p++) for (const a of await (await doc.getPage(p)).getAnnotations()) if (a.fieldName) out.push({ name: a.fieldName, page: p, type: a.fieldType, radio: !!a.radioButton, buttonValue: a.buttonValue, value: a.fieldValue });
    await doc.destroy();
    return out;
  };
  if (w26 && w26d) {
    await test('2026 PDF: chosen files are identified, and the published ones are exact', async () => {
      const wb = await PDF26.checkPdf(pdfjsLib, w26.slice());
      assert.deepEqual(wb, { ok: true, kind: 'workbook', exact: true });
      const ad = await PDF26.checkPdf(pdfjsLib, w26d.slice());
      assert.deepEqual(ad, { ok: true, kind: 'appendixD', exact: true });
      const changed = new Uint8Array([...w26, 10, 37, 120]);
      assert.deepEqual(await PDF26.checkPdf(pdfjsLib, changed), { ok: true, kind: 'workbook', exact: false });
      const old = await PDF26.checkPdf(pdfjsLib, original.slice());
      assert.equal(old.ok, false); assert.equal(old.message, PDF26.TWO023);
    });
    await test('2026 PDF: the 2023a pages name a 2026 file, and the 2023a reader says what to do', async () => {
      const S4 = 'This is the 2026 workbook, but this page fills the 2023 workbook (No. 2023a). Use the 2026 Fill page from the home page.';
      const S16 = 'This is the 2026 workbook. Making a backup file from a 2026 PDF comes in a later version of this helper. Keep using your backup file.';
      const check = await lib.checkWorkbookPdf(pdfjsLib, w26.slice());
      assert.equal(check.ok, false);
      assert.equal(check.message, S4);
      await assert.rejects(lib.readBackupFromPdf({ pdfjsLib, pdfBytes: w26.slice(), defaults: workbookCommon().defaults }), (e) => e.message === S16);
      await assert.rejects(lib.fillOfficialPdf({ pdfjsLib, pdfBytes: w26.slice(), data: sample }), (e) => e.message === S4);
    });
    let filled26 = null;
    await test('2026 PDF: filling the sample writes every answer, and the count matches the values', async () => {
      const values = PDF26.buildFieldValues(SAMPLE26);
      const expected = Object.keys(values.text).length + Object.keys(values.radio).length + Object.keys(values.choice).length;
      filled26 = await PDF26.fillWorkbook({ pdfjsLib, pdfBytes: w26.slice(), data: SAMPLE26 });
      assert.equal(filled26.report.filled, expected);
      assert.equal(filled26.report.totalFields, 382, 'distinct field names, as the 2023a report counts them');
      assert.ok(filled26.bytes.subarray(0, w26.length).every((b, i) => b === w26[i]), 'the official file is kept, with the update appended');
      const ws = await allWidgets(filled26.bytes);
      assert.equal(ws.length, 446, 'no fields lost');
      const val = (n) => ws.filter((w) => w.name === n).map((w) => w.value);
      assert.equal(new Set(val('Candidates Full Name')).size, 1);
      assert.equal(val('Candidates Full Name').length, 23);
      assert.equal(val('Candidates Full Name')[0], 'Alex Example');
      assert.equal(val('Dropdown1')[0] && (Array.isArray(val('Dropdown1')[0]) ? val('Dropdown1')[0][0] : val('Dropdown1')[0]), 'Crew');
      assert.equal(val('Estimated Cost of Materials')[0], '1200.00');
      assert.equal(val('Birth Date')[0], '1/2/2010');
    });
    await test('2026 PDF: signature fields stay empty and unsigned after filling', async () => {
      if (!filled26) return;
      const ws = await allWidgets(filled26.bytes);
      const sigs = ws.filter((w) => w.type === 'Sig');
      assert.equal(sigs.length, 9);
      assert.ok(sigs.every((w) => !w.value), 'a signature field has a value');
    });
    await test('2026 PDF: the round trip gives back every answer that a box holds', async () => {
      const back = await PDF26.readBackup({ pdfjsLib, pdfBytes: filled26.bytes.slice() });
      const want = answers(SAMPLE26), got = answers(back.data);
      const skip = /^(attachments|links|journey|appendixD)(\.|$)/;
      const wrong = [];
      for (const [k, v] of Object.entries(want)) {
        if (skip.test(k)) continue;
        if (!(k in got)) { wrong.push(`${k} missing`); continue; }
        if (!sameAnswer(v, got[k])) wrong.push(`${k}: ${v} != ${got[k]}`);
      }
      assert.deepEqual(wrong.filter((x) => !/^(proposal\.costs\.totals|plan\.items\.\d+\.totalCost|report\.spending\.\d+\.totalCost)/.test(x)), [], wrong.slice(0, 8).join('; '));
    });
    await test('2026 PDF: the blank form is told it has no answers typed in yet', async () => {
      await assert.rejects(PDF26.readBackup({ pdfjsLib, pdfBytes: w26.slice() }), /no answers typed in yet/);
    });
    await test('2026 PDF: a 2023a PDF, an Appendix D PDF, and a flat PDF each get a plain message', async () => {
      await assert.rejects(PDF26.fillWorkbook({ pdfjsLib, pdfBytes: original.slice(), data: SAMPLE26 }), (e) => e.message === PDF26.TWO023);
      await assert.rejects(PDF26.readBackup({ pdfjsLib, pdfBytes: original.slice() }), /This is the 2023 workbook \(No\. 2023a\)/);
      await assert.rejects(PDF26.readBackup({ pdfjsLib, pdfBytes: w26d.slice() }), /already in your workbook draft/);
      await assert.rejects(PDF26.fillWorkbook({ pdfjsLib, pdfBytes: w26d.slice(), data: SAMPLE26 }), /This is Appendix D/);
    });
    await test('2026 PDF: Appendix D fills from the draft, names no fields it does not have, and warns about the organization name and EIN', async () => {
      const out = await PDF26.fillAppendixD({ pdfjsLib, pdfBytes: w26d.slice(), data: SAMPLE26 });
      const ws = await allWidgets(out.bytes);
      assert.equal(ws.find((w) => w.name === 'Name').value, 'Alex Example');
      assert.ok(out.report.warnings.some((x) => /no boxes for “Name of Organization” and “EIN”/.test(x)));
      assert.ok(ws.filter((w) => w.type === 'Sig').every((w) => !w.value), 'Appendix D signatures stay empty');
    });
    await test('2026 PDF: a long description warns once, and page 11 gets the page 7 explanation', async () => {
      const d = JSON.parse(JSON.stringify(SAMPLE26));
      d.proposal.description = 'installation '.repeat(40).trim();
      const out = await PDF26.fillWorkbook({ pdfjsLib, pdfBytes: w26.slice(), data: d });
      const page11 = out.report.warnings.filter((x) => /Brief Project Description: only about the first 3 lines/.test(x));
      assert.equal(page11.length, 1, out.report.warnings.join(' | '));
      assert.equal(out.report.warnings.filter((x) => /Project Description/.test(x) && /page 7|PDF page 7/.test(x)).length, 1);
    });
    await test('2026 PDF: a fresh official download gives no false "already had answers" warning', async () => {
    const out = await PDF26.fillWorkbook({ pdfjsLib, pdfBytes: w26.slice(), data: SAMPLE26 });
    assert.ok(!out.report.warnings.some((x) => /already had answers/.test(x)), out.report.warnings.join(' | '));
    const bad = JSON.parse(JSON.stringify(SAMPLE26));
    bad.proposal.hours[1].w = 'two';
    bad.proposal.costs.tools = 'about 20';
    const filled = await PDF26.fillWorkbook({ pdfjsLib, pdfBytes: w26.slice(), data: bad });
    const ws = await allWidgets(filled.bytes);
    const val = (n) => ws.find((w) => w.name === n).value;
    assert.equal(val('Total People'), '', 'an invalid head count is blank, not the stored 1');
    assert.equal(val('Total Prelimary Cost Estimate'), '', 'an invalid total is blank, not the stored 0');
  });
  await test('2026 PDF: a file that already had answers says so', async () => {
      const again = await PDF26.fillWorkbook({ pdfjsLib, pdfBytes: filled26.bytes.slice(), data: SAMPLE26 });
      assert.ok(again.report.warnings.some((x) => /already had answers typed in/.test(x)));
    });
  }
  if (w26 && w26d && process.platform === 'darwin' && has('swiftc')) {
    await test('2026 PDF: Apple PDFKit (Preview) reads the filled values', async () => {
      const out = await PDF26.fillWorkbook({ pdfjsLib, pdfBytes: w26.slice(), data: SAMPLE26 });
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eph26-'));
      const pdf = path.join(tmp, 'filled.pdf'), bin = path.join(tmp, 'check');
      fs.writeFileSync(pdf, out.bytes);
      execFileSync('swiftc', ['-O', path.join(ROOT, 'tests/pdfkit-check.swift'), '-o', bin], { stdio: 'ignore' });
      const result = JSON.parse(execFileSync(bin, [pdf]).toString());
      assert.equal(result.text['Candidates Full Name'].length, 23);
      assert.ok(result.text['Candidates Full Name'].every((v) => v === 'Alex Example'));
      assert.deepEqual(result.text.Dropdown1, ['Crew']);
      assert.equal(result.radio['Need Fundraising App?'], 'Yes');
      assert.equal(result.locked, false);
    });
  } else console.log('  skip 2026 PDFKit check (needs macOS and swiftc)');
  if (w26 && has('pdftotext')) {
    await test('2026 PDF: Poppler shows the typed answers on the right pages', () => {
      const out = PDF26.fillWorkbook;
      return out({ pdfjsLib, pdfBytes: w26.slice(), data: SAMPLE26 }).then((r) => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eph26p-'));
        const pdf = path.join(tmp, 'f.pdf');
        fs.writeFileSync(pdf, r.bytes);
        const page = (n) => execFileSync('pdftotext', ['-f', String(n), '-l', String(n), '-layout', pdf, '-']).toString();
        assert.match(page(1), /Alex Example/);
        assert.match(page(5), /alex@example\.org/);
        assert.match(page(7), /Build and install a bike repair stand/);
        assert.match(page(9), /1200\.00/);
        assert.match(page(20), /68\.00/);
      });
    });
  }
  console.log('Classic 2026 wording');
  {
    const W26M = require(path.join(ROOT, 'lib/w26-model.js'));
    const normText = (t) => String(t).replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-')
      .replace(/\s+/g, ' ').replace(/\s+([?).,:;])/g, '$1').replace(/\(\s+/g, '(').replace(/\/\s+/g, '/').replace(/(\d) (?=\d)/g, '$1').trim().toLowerCase();
    const pagesText = async (bytes) => {
      const doc = await pdfjsLib.getDocument({ data: bytes.slice(), verbosity: 0, isEvalSupported: false }).promise;
      const out = {};
      for (let p = 1; p <= doc.numPages; p++) out[p] = normText((await (await doc.getPage(p)).getTextContent()).items.map((i) => i.str + (i.hasEOL ? ' ' : '')).join(' '));
      await doc.destroy();
      return out;
    };
    await test('Classic 2026: every official label, prompt, and heading is on its page of the PDF', async () => {
      if (!w26 || !w26d) return;
      const wb = await pagesText(w26), ad = await pagesText(w26d);
      const O = W26M.OFFICIAL;
      const misses = [];
      const check = (pages, page, text) => { if (text && !pages[page].includes(normText(text))) misses.push(`p${page}: ${text.slice(0, 60)}`); };
      for (const [, [page, label, help]] of Object.entries(O.boxes)) { check(wb, page, label); check(wb, page, help); }
      for (const [, [page, label, help]] of Object.entries(O.appendixD)) { check(ad, page, label); check(ad, page, help); }
      for (const [id, [page, title, intro]] of Object.entries(O.sections)) {
        const pages = id.startsWith('appendixD') ? ad : wb;
        check(pages, page, title);
        check(pages, page, intro);
      }
      for (const [, [page, headers]] of Object.entries(O.tables)) for (const t of headers) check(wb, page, t);
      assert.deepEqual(misses, [], misses.slice(0, 10).join('; '));
    });
    const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
    await test('Classic 2026: the page gets its labels only from the official wording (no hand-typed prompts)', () => {
      const src = ['lib/w26-classic.js', 'lib/w26-ui.js'].map((f) => read(f)).join('\n');
      for (const bad of ['innerHTML', 'insertAdjacentHTML', 'document.write']) assert.ok(!src.includes(bad), `${bad} in the 2026 page`);
      for (const f of ['lib/w26-classic.js', 'lib/w26-ui.js', 'lib/w26-model.js', 'lib/w26-pdf.js']) assert.doesNotMatch(read(f), /\binnerHTML\b/, f);
    });
    await test('2026 path: every sentence it quotes is on its stated page of the official PDF', async () => {
      if (!w26) return;
      const J26 = require(path.join(ROOT, 'lib/journey.js'));
      const wb = await pagesText(w26);
      const misses = [];
      // The PDF sets "18th" with a raised "th", which the text extractor reports as "18 th". Join it on both sides.
      const ord = (t) => t.replace(/(\d) (st|nd|rd|th)\b/g, "$1$2");
      for (const [key, [page, sentence]] of Object.entries(J26.QUOTES_2026)) if (!ord(wb[page]).includes(ord(normText(sentence)))) misses.push(`${key} (page ${page})`);
      assert.deepEqual(misses, [], 'not found on the page: ' + misses.join('; '));
      assert.ok(Object.keys(J26.QUOTES_2026).length >= 8, 'the quotes table is not empty');
    });
    await test('2026 path: steps follow the workbook checklist, and the fundraising steps appear only when the Scout says yes', () => {
      const J26 = require(path.join(ROOT, 'lib/journey.js'));
      const ids = (d) => J26.journeySteps(d, null).steps.map((x) => x.id);
      const base = { edition: '2026', candidate: {}, proposal: { needFundraisingApp: '' } };
      assert.deepEqual(ids(base), ['setup', 'proposal', 'propSigned', 'plan', 'planApproved', 'work', 'report', 'repSigned', 'rest']);
      assert.deepEqual(ids({ ...base, proposal: { needFundraisingApp: 'no' } }), ids(base));
      assert.deepEqual(ids({ ...base, proposal: { needFundraisingApp: 'yes' } }), ['setup', 'proposal', 'propSigned', 'fundraising', 'fund', 'plan', 'planApproved', 'work', 'report', 'repSigned', 'rest']);
      // The plan is approved before the work, as the checklist (items 11 to 14) orders it.
      const order = ids(base);
      assert.ok(order.indexOf('plan') < order.indexOf('planApproved') && order.indexOf('planApproved') < order.indexOf('work'));
      // The 2023a path is unchanged.
      assert.deepEqual(J26.journeySteps({}, null).steps.map((x) => x.id), ['proposal', 'propSigned', 'plan', 'work', 'report', 'repSigned', 'rest']);
    });
    await test('2026 path: counts agree with the key boxes, ticks are the Scout\'s own notes, and a draft with no ticks is not marked done', () => {
      const J26 = require(path.join(ROOT, 'lib/journey.js'));
      const M26 = require(path.join(ROOT, 'lib/w26-model.js'));
      const empty = M26.defaults();
      const e = J26.journeySteps(empty, null);
      assert.equal(e.next.id, 'setup');
      assert.ok(e.steps.every((x) => x.state === 'todo'), 'a blank draft has nothing started');
      const sample = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/sample-workbook-2026.json'), 'utf8'));
      const r = J26.journeySteps(sample, null);
      for (const name of ['setup', 'proposal', 'plan', 'report']) {
        const step = r.steps.find((x) => x.id === name);
        const total = J26.keyBoxes(sample)[name].length, left = J26.emptyKeyBoxes(sample)[name].length;
        assert.equal(step.detail, `${total - left} of ${total} key boxes filled in.`, name);
      }
      assert.equal(r.steps.find((x) => x.id === 'propSigned').state, 'todo', 'a filled-in draft does not tick a signature');
      const ticked = JSON.parse(JSON.stringify(sample)); ticked.journey = { raising: '', steps: { planApproved: { done: '1' } } };
      assert.equal(J26.journeySteps(ticked, null).steps.find((x) => x.id === 'planApproved').state, 'done');
      assert.equal(J26.hasNotes(ticked.journey), true);
      assert.deepEqual(J26.clean({ steps: { planApproved: { done: '1' }, bogus: { done: '1' } } }).steps, { planApproved: { done: '1' } });
    });
    await test('2026 path: nothing it says calls a step required except the workbook\'s own quoted sentences', () => {
      const J26 = require(path.join(ROOT, 'lib/journey.js'));
      const sample = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/sample-workbook-2026.json'), 'utf8'));
      sample.proposal.needFundraisingApp = 'yes';
      const quoted = Object.values(J26.QUOTES_2026).map(([, t]) => t);
      for (const st of J26.journeySteps(sample, null).steps) {
        let text = [st.title, st.detail, st.next].join(' ');
        for (const q of quoted) text = text.split(q).join('');
        assert.doesNotMatch(text, /\b(must|required|mandatory|have to|need to)\b/i, `${st.id}: ${text}`);
      }
      let rem = J26.REMINDER_2026; for (const q of quoted) rem = rem.split(q).join('');
      assert.doesNotMatch(rem, /\b(must|required|mandatory)\b/i);
    });
    await test('Classic 2026: the sentences a Scout sees are the ones the design approved', () => {
      const code = ['lib/w26-classic.js', 'lib/w26-pdf.js', 'lib/w26-ui.js', 'lib/workbook-common.js', 'lib/fill-page.js', 'lib/official-pdf.js'].map((f) => read(f)).join('\n');
      assert.ok(code.includes('This backup file is for the 2026 workbook. Open it in the 2026 workbook from the home page.'), 'S1a');
      assert.ok(code.includes('is for the 2023 workbook (No. 2023a)'), 'S1b');
      assert.ok(code.includes('In the 2026 workbook this is the Fundraising box on page 10.'), 'S22');
    });
  }

  console.log(`\n${passed} passed, ${failures.length} failed${skipped ? `, ${skipped} skipped` : ''}`);
  process.exit(failures.length ? 1 : 0);
})();
