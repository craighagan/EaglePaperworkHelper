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
  const SIGNED_FORM_NOTE = 'Printed names beside the approval signature lines are filled from the contacts unless you tick “Leave the printed names blank.”';

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
            if (!invalidNoted.has(name)) { notes.push(NOTE.S11(page, label)); invalidNoted.add(name); }
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

  return {
    MAX_PDF_BYTES, OFFICIAL_SHA256, APPENDIX_D_SHA256, CHOICES, SIGNED_FORM_NOTE,
    parseDate, dateOk, formatDateAs, plainNumber, buildFieldValues, buildAppendixDValues, NOTE
  };
});
