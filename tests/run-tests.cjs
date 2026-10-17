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
const PAGES = ['index.html', 'EagleWorkbook.html', 'EagleWorkbook-guided.html', 'FillOfficialPDF.html', 'BackupFromPDF.html'];

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

  console.log('Pages');
  for (const file of PAGES) {
    await test(`${file}: no inline scripts and a strict content security policy`, () => {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      assert.equal([...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)].length, 0, 'inline <script>');
      const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(source);
      assert.ok(csp, 'CSP meta tag');
      assert.match(csp[1], /default-src 'none'/);
      assert.doesNotMatch(csp[1], /script-src[^;]*unsafe/);
      const connect = (/connect-src ([^;]+);/.exec(csp[1]) || [null, "'none'"])[1]; // default-src 'none' covers a missing connect-src
      assert.ok(connect === "'none'" || connect === lib.OFFICIAL_PDF_URL, `connect-src ${connect}`);
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
      assert.deepEqual(await lib.checkWorkbookPdf(pdfjsLib, original.slice()), { ok: true });
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
      await assert.rejects(lib.readBackupFromPdf({ pdfjsLib, pdfBytes: new Uint8Array(flat), defaults: W.defaults }), /no fillable boxes/);
    });
    // Optional check against your own files, which must never be committed. Prints counts only.
    if (process.env.EAGLE_LOCAL_BACKUP) {
      await test('local backup file round-trips (EAGLE_LOCAL_BACKUP)', async () => {
        const local = W.mergeWithDefaults(W.defaults(), JSON.parse(fs.readFileSync(process.env.EAGLE_LOCAL_BACKUP, 'utf8')));
        const result = await lib.fillOfficialPdf({ pdfjsLib, pdfBytes: original.slice(), data: local });
        const back = await lib.readBackupFromPdf({ pdfjsLib, pdfBytes: result.bytes.slice(), defaults: W.defaults });
        const want = answers(local), got = answers(back.data);
        for (const k of Object.keys(want)) if (/^report\.hours\.[01]\.w$/.test(k)) delete want[k];
        const wrong = differences(want, got, local);
        console.log(`       ${Object.keys(want).length} answers, ${result.report.filled} boxes filled, ${wrong.length} differ, ${result.report.warnings.length} warnings`);
        assert.deepEqual(wrong.length, 0, wrong.join(', '));
      });
    }
    if (process.env.WRITE_SAMPLE) {
      fs.writeFileSync(process.env.WRITE_SAMPLE, filled.bytes);
      console.log(`  wrote ${process.env.WRITE_SAMPLE}`);
    }
  }

  console.log(`\n${passed} passed, ${failures.length} failed${skipped ? `, ${skipped} skipped` : ''}`);
  process.exit(failures.length ? 1 : 0);
})();
