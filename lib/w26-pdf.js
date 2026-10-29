/*
 * EaglePaperworkHelper: fill the official 2026 Eagle Scout Leadership Service Project Workbook (No. 512-927)
 * and its Appendix D from a 2026 draft, and read a filled 2026 PDF back into a draft.
 *
 * Works in a browser (window.EagleW26Pdf) and in Node (module.exports) for the tests.
 * Needs lib/official-pdf.js (PDF helpers and number parsing) and lib/w26-model.js (the field table).
 * The caller supplies pdf.js (vendor/pdfjs), as with lib/official-pdf.js.
 */
(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EagleW26Pdf = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const P = () => (typeof module === 'object' && module.exports ? require('./official-pdf.js') : root.EagleOfficialPdf);
  const M = () => (typeof module === 'object' && module.exports ? require('./w26-model.js') : root.EagleW26);

  const MAX_PDF_BYTES = 50 * 1024 * 1024;
  const OFFICIAL_SHA256 = ['5810e017ed25e745a9b2c2c9f6ea891acf6147b8d7a019d925388fda152435bb'];
  const APPENDIX_D_SHA256 = ['75364d254bcec53514994d6052ae57ea5072f8e0d42ea2ba1f1a685f556cd8a9'];
  const CHOICES = ['Troop', 'Crew', 'Ship'];

  const str = (v) => P().str(v);
  const get = (data, path) => path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), data);
  const isBlank = (v) => str(v) === '';

  /* ------------------------------------------------------------------ */
  /* Formats (Task 1.5)                                                  */
  /* ------------------------------------------------------------------ */

  /** The calendar date of a draft date or typed date, as {y, m, d}; null when it is not one real date. */
  function parseDate(value) {
    const text = str(value);
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text) || null;
    let y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else {
      m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
      if (!m) return null;
      mo = +m[1]; d = +m[2]; y = +m[3];
    }
    const t = new Date(Date.UTC(y, mo - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? { y, m: mo, d } : null;
  }

  /** True when the value is one real date (a draft date or a typed M/D/YYYY). */
  function dateOk(value) {
    return isBlank(value) || parseDate(value) !== null;
  }

  /** A date in one of the three formats the form's boxes use. Anything that is not one real date is returned as typed. */
  function formatDateAs(value, format) {
    if (isBlank(value)) return '';
    const dt = parseDate(value);
    if (!dt) return str(value);
    const pad = (n) => String(n).padStart(2, '0');
    if (format === 'mm/dd/yyyy') return `${pad(dt.m)}/${pad(dt.d)}/${dt.y}`;
    if (format === 'm/d/yy') return `${dt.m}/${dt.d}/${String(dt.y).slice(-2)}`;
    return `${dt.m}/${dt.d}/${dt.y}`;
  }

  /** A plain number in the form's style: `1234.50` (2 decimals) or `12` (0 decimals). '' when blank, null when not a plain number. */
  function plainNumber(value, decimals) {
    if (isBlank(value)) return '';
    const n = decimals === 0 ? P().parseWhole(value) : P().parseAmount(value);
    if (n === null || Number.isNaN(n)) return null;
    const scale = 10 ** decimals;
    const r = Math.round(n * scale) / scale;
    return (r === 0 ? 0 : r).toFixed(decimals);
  }

  /* ------------------------------------------------------------------ */
  /* What each box gets (Task 1.7)                                       */
  /* ------------------------------------------------------------------ */

  const NOTE = {
    S9: (page, label, value) => `PDF page ${page}, ${label}: “${value}” is not a plain number, so it was put in the box as typed. Use numbers like 12 or 12.50 so the totals add up.`,
    S10: (page, label, value) => `PDF page ${page}, ${label}: this box is set up for one date. “${value}” was put in as typed; some PDF programs may show it differently.`,
    S11: (page, label) => `PDF page ${page}, ${label}: this total was left blank because some amounts it adds up are not plain numbers.`,
    S11row: (page, label, why) => `PDF page ${page}, ${label}: this row’s total was left blank because ${why}. Fix that box, and the total will add up.`,
    S12: () => 'The unit type in your draft is not Troop, Crew, or Ship, so the PDF shows Troop. Change it on the Project Contacts tab.'
  };

  /**
   * The values to write, by PDF field name: { text, radio, choice, notes }.
   * text: field name -> text. radio: group -> export value ('Yes'/'No'). choice: drop-down -> export value.
   * Signature fields, the dates beside them, and approver boxes are never written.
   */
  function buildFieldValues(data, { skipApprovalNames = false } = {}) {
    const W = M();
    const text = {}, radio = {}, choice = {}, notes = [];
    const totals = W.totals(data);
    const invalidNoted = new Set();
    for (const [name, kind, path, format, page, type] of W.FIELDS) {
      const label = kind === 'computed' ? W.COMPUTED_LABELS[name] : W.LABELS[path];
      const value = path ? get(data, path) : undefined;
      switch (kind) {
        case 'text': case 'hours':
          if (!isBlank(value)) text[name] = str(value);
          break;
        case 'date': {
          if (isBlank(value)) break;
          if (!dateOk(value)) notes.push(NOTE.S10(page, label, str(value)));
          text[name] = formatDateAs(value, format);
          break;
        }
        case 'money': case 'count': {
          if (isBlank(value)) break;
          const out = plainNumber(value, kind === 'count' ? 0 : 2);
          if (out === null) { notes.push(NOTE.S9(page, label, str(value))); text[name] = str(value); }
          else text[name] = out;
          break;
        }
        case 'computed': {
          if (totals.invalid.includes(name)) {
            // Written blank: the blank form stores 0 or 1 here, which would print as a total.
            text[name] = '';
            if (!invalidNoted.has(name)) {
              // Say which cell is the problem: a missing quantity, or a quantity or unit cost that is not a plain number.
              const why = totals.rowProblem[name] === 'noQty' ? 'the quantity is blank' : totals.rowProblem[name] ? 'the quantity or unit cost is not a plain number' : null;
              notes.push(why ? NOTE.S11row(page, label, why) : NOTE.S11(page, label));
              invalidNoted.add(name);
            }
            break;
          }
          const v = totals.values[name];
          if (v === '' || v === undefined) break;
          text[name] = type === 'count' ? Number(v).toFixed(0) : Number(v).toFixed(2);
          break;
        }
        case 'fixed':
          text[name] = format;
          break;
        case 'choice': {
          const unit = str(value);
          if (CHOICES.includes(unit)) choice[name] = unit;
          else { choice[name] = 'Troop'; notes.push(NOTE.S12()); }
          break;
        }
        case 'radio': {
          const v = str(value).toLowerCase();
          if (v === 'yes') radio[name] = 'Yes';
          else if (v === 'no') radio[name] = 'No';
          break;
        }
        case 'approvalName':
          if (!skipApprovalNames && !isBlank(value)) text[name] = str(value);
          break;
        default: // never
          break;
      }
    }
    return { text, radio, choice, notes };
  }

  /** The Appendix D values, by PDF field name (same shape as buildFieldValues). */
  function buildAppendixDValues(data) {
    const W = M();
    const text = {}, notes = [];
    for (const [name, kind, path, format, page] of W.APPENDIX_D_FIELDS) {
      if (kind === 'never' || !path) continue;
      const value = get(data, path);
      const label = W.APPENDIX_D_LABELS[path] || name;
      if (isBlank(value)) continue;
      if (kind === 'date') {
        if (!dateOk(value)) notes.push(NOTE.S10(page, label, str(value)));
        text[name] = formatDateAs(value, format);
      } else if (kind === 'money') {
        const out = plainNumber(value, 2);
        if (out === null) { notes.push(NOTE.S9(page, label, str(value))); text[name] = str(value); } else text[name] = out;
      } else text[name] = str(value);
    }
    return { text, radio: {}, choice: {}, notes };
  }

  /* ------------------------------------------------------------------ */
  /* Checking a chosen PDF (Task 1.8)                                    */
  /* ------------------------------------------------------------------ */

  const NOT_2026 = 'This PDF is not the official 2026 Eagle Scout Leadership Service Project Workbook or its Appendix D. Use “Get the official PDF for me,” or download them from scouting.org and choose those files.';
  const TWO023 = 'This is the 2023 workbook (No. 2023a), but this page fills the 2026 workbook. Use “Get the official PDF for me,” or download the 2026 workbook from scouting.org and choose that file.';
  const APPD_NOT_WORKBOOK = 'This is Appendix D (the Fundraising Application), not the workbook. Choose it in the Appendix D step below.';

  /**
   * Which 2026 file this is: { ok: true, kind: 'workbook' | 'appendixD', exact } or { ok: false, message }.
   * exact is true for the published file, false for a changed copy, null when hashing is not available.
   */
  async function checkPdf(pdfjsLib, pdfBytes) {
    const hash = await P().sha256Hex(pdfBytes).catch(() => null);
    let doc;
    try { doc = await P().openPdf(pdfjsLib, pdfBytes); }
    catch (error) { return { ok: false, message: error.message }; }
    try {
      const widgets = await P().readWidgets(doc);
      const has = (names) => names.every((n) => widgets.has(n));
      if (has(M().ID_FIELDS)) return { ok: true, kind: 'workbook', exact: hash ? OFFICIAL_SHA256.includes(hash) : null };
      if (has(M().APPENDIX_D_ID_FIELDS)) return { ok: true, kind: 'appendixD', exact: hash ? APPENDIX_D_SHA256.includes(hash) : null };
      if (has(P().SIGNATURE_FIELDS)) return { ok: false, message: TWO023 };
      return { ok: false, message: NOT_2026 };
    } finally { await doc.destroy(); }
  }

  /* ------------------------------------------------------------------ */
  /* Filling (Task 1.9 and 1.11)                                         */
  /* ------------------------------------------------------------------ */

  const EXACT_WARNING = 'This is not the exact file published by Scouting America. If you saved or edited it in another program, use “Get the official PDF for me” for a fresh copy and the cleanest result.';
  const NO_HASH_WARNING = 'This browser could not check that the PDF is the exact file published by Scouting America (this happens on websites without https). The form fields were checked.';
  const PRINTABLE_WARNING = (page, label, odd) => `PDF page ${page}, ${label}: the characters ${odd} are outside what the workbook’s font can show. Some PDF viewers and printers will drop them or leave this box blank. Print a test page, or write those letters in by hand.`;
  const FIT_MULTI = (page, label) => `PDF page ${page}, ${label}: this answer may not fit in its box. The official box does not grow or scroll, so the end would be cut off. Shorten it, or attach a page and write “see attached page” in the box.`;
  const FIT_SINGLE = (page, label) => `PDF page ${page}, ${label}: this answer may be too long for its box and may be cut off when printed. Shorten it, or attach a page and write “see attached page” in the box.`;
  const FIT_DESCRIPTION_11 = 'PDF page 11, Brief Project Description: only about the first 3 lines of your project description fit here, because the official PDF repeats the description from page 7. Readers see the start of it.';
  const ALREADY = 'This PDF already had answers typed in. Answers from your backup replaced them, but other old answers are still there. For a clean result, start from a fresh download.';
  const COMPUTED_OR_PRESET = /^(Eagle Scout Candidate|Dropdown1)$/;
  /**
   * True when the PDF has answers typed in by someone, not the blank form's own stored values. The blank official
   * file stores 0 and 1 in its totals and the unit type; those are not answers.
   */
  function typedAlready(widgets) {
    const kind = new Map(M().FIELDS.map((f) => [f[0], f[1]]));
    return [...widgets.entries()].some(([name, list]) => {
      if (COMPUTED_OR_PRESET.test(name) || ['computed', 'fixed', 'choice'].includes(kind.get(name))) return false;
      return list.some((w) => w.existing && !w.radio);
    });
  }

  /** Write the values into the widgets of a loaded document, with the fit and character warnings. */
  function writeValues(doc, widgets, values, labelOf) {
    const warnings = [], warned = new Set();
    const warnOnce = (key, message) => { if (!warned.has(key)) { warned.add(key); warnings.push(message); } };
    const notFound = [];
    let filled = 0;
    for (const [name, rawValue] of Object.entries(values.text)) {
      const list = widgets.get(name);
      if (!list) { notFound.push(name); continue; }
      const singleLine = list.every((w) => !w.multiLine);
      const value = singleLine ? rawValue.replace(/\s*\n\s*/g, '; ') : rawValue;
      for (const w of list) doc.annotationStorage.setValue(w.id, { value });
      filled++;
      const label = labelOf(name);
      for (const w of list) {
        if (P().mayOverflow(value, w)) {
          if (name === 'Project Description' && w.page === 11) warnOnce(`fit:${name}:11`, FIT_DESCRIPTION_11);
          else warnOnce(`fit:${name}:${w.page}`, w.multiLine ? FIT_MULTI(w.page, label) : FIT_SINGLE(w.page, label));
        }
      }
      if (!P().PRINTABLE.test(value)) {
        const odd = [...new Set([...value].filter((ch) => !P().PRINTABLE.test(ch)))].join(' ');
        warnOnce(`chars:${name}`, PRINTABLE_WARNING(list[0].page, label, odd));
      }
    }
    for (const [name, exportValue] of Object.entries(values.radio)) {
      const list = widgets.get(name);
      if (!list || !list.some((w) => w.buttonValue === exportValue)) { notFound.push(name); continue; }
      for (const w of list) doc.annotationStorage.setValue(w.id, { value: w.buttonValue === exportValue });
      filled++;
    }
    for (const [name, value] of Object.entries(values.choice)) {
      const list = widgets.get(name);
      if (!list) { notFound.push(name); continue; }
      for (const w of list) doc.annotationStorage.setValue(w.id, { value });
      filled++;
    }
    return { filled, notFound, warnings };
  }

  /** A filled 2026 workbook PDF. Returns { bytes, report: { filled, totalFields, warnings } }. */
  async function fillWorkbook({ pdfjsLib, pdfBytes, data, skipApprovalNames = false, project = null }) {
    if (!(pdfBytes instanceof Uint8Array)) throw new Error('No PDF was chosen.');
    if (pdfBytes.length > MAX_PDF_BYTES) throw new Error('This file is too large to be the official workbook. Download the official workbook again and choose that file.');
    const values = buildFieldValues(data, { skipApprovalNames });
    const hash = await P().sha256Hex(pdfBytes).catch(() => null);
    const pre = [];
    if (!hash) pre.push(NO_HASH_WARNING);
    else if (!OFFICIAL_SHA256.includes(hash)) pre.push(EXACT_WARNING);
    const doc = await P().openPdf(pdfjsLib, pdfBytes);
    try {
      const widgets = await P().readWidgets(doc);
      if (!M().ID_FIELDS.every((n) => widgets.has(n))) {
        if (has2023(widgets)) throw new Error(TWO023);
        if (M().APPENDIX_D_ID_FIELDS.every((n) => widgets.has(n))) throw new Error(APPD_NOT_WORKBOOK);
        throw new Error(NOT_2026);
      }
      if (typedAlready(widgets)) pre.push(ALREADY);
      const labelOf = (name) => {
        const row = M().FIELDS.find((f) => f[0] === name);
        return row && row[2] ? (M().LABELS[row[2]] || name) : (M().COMPUTED_LABELS[name] || name);
      };
      const res = writeValues(doc, widgets, values, labelOf);
      if (res.notFound.length) pre.push(`Some answers could not be placed because this PDF is missing those boxes: ${res.notFound.join('; ')}. Check that you used the 2026 workbook (No. 512-927).`);
      if (!str(get(data, 'proposal.projectName'))) pre.push('The project name on the cover page is blank.');
      const warnings = [...pre, ...values.notes, ...res.warnings];
      const bytes = await doc.saveDocument();
      return { bytes, report: { filled: res.filled, totalFields: widgets.size, warnings } };
    } finally { await doc.destroy(); }
  }

  /** Appendix D. Same shape as fillWorkbook, with its own identity check and the note that it has no box for the organization name or EIN. */
  async function fillAppendixD({ pdfjsLib, pdfBytes, data }) {
    if (!(pdfBytes instanceof Uint8Array)) throw new Error('No PDF was chosen.');
    if (pdfBytes.length > MAX_PDF_BYTES) throw new Error('This file is too large to be Appendix D. Download it again and choose that file.');
    const values = buildAppendixDValues(data);
    const hash = await P().sha256Hex(pdfBytes).catch(() => null);
    const pre = [];
    if (!hash) pre.push(NO_HASH_WARNING);
    else if (!APPENDIX_D_SHA256.includes(hash)) pre.push(EXACT_WARNING);
    const doc = await P().openPdf(pdfjsLib, pdfBytes);
    try {
      const widgets = await P().readWidgets(doc);
      if (!M().APPENDIX_D_ID_FIELDS.every((n) => widgets.has(n))) throw new Error(M().ID_FIELDS.every((n) => widgets.has(n)) ? APPD_NOT_WORKBOOK : NOT_2026);
      if (typedAlready(widgets)) pre.push(ALREADY);
      const res = writeValues(doc, widgets, values, (name) => {
        const row = M().APPENDIX_D_FIELDS.find((f) => f[0] === name);
        return row && row[2] ? (M().APPENDIX_D_LABELS[row[2]] || name) : name;
      });
      const warnings = [...pre, ...values.notes, ...res.warnings, 'Appendix D has no boxes for “Name of Organization” and “EIN” (the beneficiary). Write them in by hand after printing, or ask your coach.'];
      const bytes = await doc.saveDocument();
      return { bytes, report: { filled: res.filled, totalFields: widgets.size, warnings } };
    } finally { await doc.destroy(); }
  }

  /* 2023a's identity fields, for a message that names the other edition. */
  const has2023 = (widgets) => P().SIGNATURE_FIELDS.every((n) => widgets.has(n));

  /* ------------------------------------------------------------------ */
  /* Reading a filled PDF back (Task 1.12)                               */
  /* ------------------------------------------------------------------ */

  /** Values of a filled 2026 PDF: { values: Map name -> text, radio: Map group -> 'Yes'|'No', names: Set }. */
  async function readValues(doc) {
    const values = new Map(), radio = new Map(), names = new Set();
    for (let p = 1; p <= doc.numPages; p++) {
      for (const a of await (await doc.getPage(p)).getAnnotations()) {
        if (!a.fieldName) continue;
        names.add(a.fieldName);
        if (a.radioButton) { if (a.fieldValue && a.fieldValue === a.buttonValue) radio.set(a.fieldName, a.buttonValue); continue; }
        // pdf.js gives a choice (drop-down) value as an array.
        const raw = Array.isArray(a.fieldValue) ? a.fieldValue[0] : a.fieldValue;
        const v = typeof raw === 'string' ? raw.trim() : '';
        if (v && !values.has(a.fieldName)) values.set(a.fieldName, v);
      }
    }
    return { values, radio, names };
  }

  /** Date text in any of the three box formats back to YYYY-MM-DD; anything else is kept as typed. */
  function dateBack(text) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(text);
    if (!m) return text;
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const iso = `${y}-${String(+m[1]).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}`;
    return parseDate(iso) ? iso : text;
  }

  /** A 2026 draft from a filled 2026 workbook PDF. Returns { data, report: { read, warnings } }. */
  async function readBackup({ pdfjsLib, pdfBytes }) {
    if (!(pdfBytes instanceof Uint8Array)) throw new Error('No PDF was chosen.');
    if (pdfBytes.length > MAX_PDF_BYTES) throw new Error('This file is too large to be an Eagle workbook PDF.');
    const doc = await P().openPdf(pdfjsLib, pdfBytes);
    let read;
    try { read = await readValues(doc); } finally { await doc.destroy(); }
    const { values, radio, names } = read;
    if (!names.size) throw new Error('This PDF has no fillable boxes, so its answers can’t be read. It is a printed or flattened copy, such as a submission copy or a PDF saved with Print → Save as PDF. To get your answers back, use your backup file (click “Open backup file” in a workbook page) or the filled PDF made by “Fill the official PDF.”');
    if (!M().ID_FIELDS.every((n) => names.has(n))) {
      if (M().APPENDIX_D_ID_FIELDS.every((n) => names.has(n))) throw new Error(APPD_NOT_WORKBOOK.replace('Choose it in the Appendix D step below.', 'Its answers are already in your workbook draft, so there is nothing to read back. Choose your filled 2026 workbook PDF instead.'));
      if (has2023(new Map([...names].map((n) => [n, true])))) throw new Error('This is the 2023 workbook (No. 2023a). Open it with “Make a backup file from a PDF” for the 2023 workbook.');
      throw new Error(NOT_2026);
    }
    const isEmpty = [...values.keys()].every((n) => COMPUTED_OR_PRESET.test(n) || M().FIELDS.some((f) => f[0] === n && f[1] === 'computed'));
    if (isEmpty && !radio.size) throw new Error('This workbook PDF has no answers typed in yet.');

    const data = M().defaults();
    const warnings = [];
    let count = 0;
    const setPath = (path, value) => {
      const keys = path.split('.');
      let o = data;
      for (const k of keys.slice(0, -1)) o = o[k];
      o[keys[keys.length - 1]] = value;
    };
    for (const [name, kind, path] of M().FIELDS) {
      if (!path || ['computed', 'never', 'fixed'].includes(kind)) continue;
      if (kind === 'radio') { const r = radio.get(name); if (r) { setPath(path, r === 'Yes' ? 'yes' : 'no'); count++; } continue; }
      if (kind === 'choice') { const c = values.get(name); if (CHOICES.includes(c)) { setPath(path, c); count++; } continue; }
      const raw = values.get(name);
      if (raw === undefined) continue;
      if (kind === 'approvalName') {
        // The printed name is a copy of a contact: use it only when that contact is blank.
        if (isBlank(get(data, path))) { setPath(path, raw); count++; }
        continue;
      }
      setPath(path, kind === 'date' ? dateBack(raw) : raw);
      count++;
    }
    if (!str(get(data, 'proposal.projectName'))) warnings.push('The project name was blank in the PDF. Add it on the Project Proposal tab.');
    return { data, report: { read: count, warnings } };
  }

  return {
    MAX_PDF_BYTES, OFFICIAL_SHA256, APPENDIX_D_SHA256, CHOICES, NOT_2026, TWO023,
    parseDate, dateOk, formatDateAs, plainNumber, dateBack, buildFieldValues, buildAppendixDValues, NOTE,
    checkPdf, fillWorkbook, fillAppendixD, readBackup
  };
});
