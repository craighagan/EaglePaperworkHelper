/*
 * EaglePaperworkHelper: form pieces for the 2026 workbook pages (EagleWorkbook2026.html, and later the Guided
 * 2026 page). Builds on window.EagleWorkbook (lib/workbook-common.js). Every label and prompt comes from
 * window.EagleW26.OFFICIAL (checked against the official PDF), so this file has no official wording of its own.
 *
 * Browser only (window.EagleW26Ui). Needs lib/w26-model.js, lib/official-pdf.js and lib/workbook-common.js first.
 */
(function () {
  'use strict';
  const W = () => window.EagleWorkbook;
  const M = () => window.EagleW26;
  const O = () => M().OFFICIAL;
  const h = (...a) => W().h(...a);
  const idOf = (path) => 'f-' + path.replace(/[^a-zA-Z0-9_-]/g, '-');

  /** The official label and prompt for a box. Workbook paths come from OFFICIAL.boxes, Appendix D paths from OFFICIAL.appendixD. */
  function entry(path) {
    const e = O().boxes[path] || O().appendixD[path];
    if (!e) throw new Error(`no official wording for ${path}`);
    return e;
  }

  /** The PDF field name of a workbook path (from the generated table). */
  function fieldNameOf(path) {
    const row = M().FIELDS.find((r) => r[2] === path);
    return row ? row[0] : null;
  }
  /** Multi-line boxes whose size does not change (the official form shows them at 12 pt, and they can be cut off). */
  function isFixedMulti(name) {
    return Boolean(name) && M().FIXED_BOXES.some((b) => b[0] === name && b[4]);
  }

  let plainOn = false;
  /** Turn the Guided page's "In short" lines on (the Classic 2026 page never does). */
  function usePlain(on) { plainOn = Boolean(on); }

  /** Put the "In short" block before the input. aria-describedby covers the short line and the rule sentences, not the full question. */
  function addPlain(el, id, plain) {
    const input = el.querySelector('input, textarea, select');
    if (!input) return;
    const wrap = h('div', { className: 'plain-help', id: `${id}-plain` },
      h('p', { className: 'plain-short' }, h('strong', null, 'In short: '), plain.short),
      ...plain.musts.map((s) => h('p', { className: 'plain-rule' }, h('strong', null, 'The workbook says: '), `“${s}”`)));
    const full = h('details', { className: 'plain-full' }, h('summary', null, 'Show the full official question'), h('p', null, plain.full));
    input.parentNode.insertBefore(wrap, input);
    input.parentNode.insertBefore(full, input);
    const ids = String(input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    input.setAttribute('aria-describedby', [...ids, wrap.id].join(' '));
  }

  /** A text box with its official label and prompt. opts go to f.field (type, multi, rows, inputmode).
   * A fixed-size multi-line box also gets its fit line (S21) under it. */
  function box(f, path, opts = {}) {
    const [, label, help] = entry(path);
    const plain = !f.print && plainOn && window.EagleW26Plain ? window.EagleW26Plain.plainFor(path, help) : null;
    // Guided page: a long official prompt is shown as "In short", then its rule sentences word for word, then the full question.
    const el = f.field(label, path, { ...opts, help: plain ? null : (help || null) });
    if (plain) addPlain(el, idOf(path), plain);
    const name = fieldNameOf(path);
    if (f.print || !isFixedMulti(name)) return el;
    return h('div', null, el, fitNote(f, f.get, name, path));
  }

  /** A section with its official title and intro. */
  function sec(f, id, ...children) {
    const [, title, intro] = O().sections[id];
    return f.section(title, intro || null, ...children);
  }

  /** A card holding one box (the box shows its own official label and prompt). */
  function card(f, path, opts = {}) {
    return h('section', { className: 'card' }, box(f, path, opts));
  }

  /** A drop-down or Yes/No choice. options: [[value, text], ...]. Keeps the id scheme of createForm. */
  function select(f, get, set, path, options, label = null) {
    const text = label || entry(path)[1];
    const id = idOf(path);
    const current = String(get(path) || '');
    if (f.print) return h('div', { className: 'field' }, h('label', { for: id }, text), h('div', { className: 'print-value' }, (options.find(([v]) => v === current) || ['', '—'])[1] || '—'));
    const el = h('select', { id, 'aria-describedby': null }, ...options.map(([v, t]) => h('option', { value: v, selected: v === current ? 'selected' : null }, t)));
    el.value = current;
    el.addEventListener('change', (e) => set(path, e.target.value));
    return h('div', { className: 'field' }, h('label', { for: id }, text), el);
  }

  /** The three contact lines (name, email, telephone) for one person, labelled as the official page prints them. */
  /** Name one field's input for a screen reader: "Section: Label", so "Email" is not heard without its owner. */
  function named(el, sectionId, label) {
    const inp = el.querySelector('input, textarea, select');
    if (inp) inp.setAttribute('aria-label', `${O().sections[sectionId][1]}: ${label}`);
    return el;
  }

  function person(f, key, sectionId, nameLabel = 'Name', prefix = 'contacts') {
    const name = f.field(nameLabel, `${prefix}.${key}.name`, {});
    const phoneLabel = labelOf('Telephone');
    const phone = f.field(phoneLabel, `${prefix}.${key}.phone`, { type: 'tel' });
    const emailLabel = labelOf('Email');
    const email = f.field(emailLabel, `${prefix}.${key}.email`, { type: 'email' });
    named(name, sectionId, nameLabel); named(phone, sectionId, phoneLabel); named(email, sectionId, emailLabel);
    return sec(f, sectionId, f.row(name, phone), email);
  }

  /** A contact with a street address (name, telephone, street, city, state, email), each input named for a screen reader. */
  function place(f, key, sectionId, nameLabel, prefix = 'contacts') {
    const fields = {
      name: f.field(nameLabel, `${prefix}.${key}.name`, {}),
      phone: f.field(labelOf('Telephone'), `${prefix}.${key}.phone`, { type: 'tel' }),
      street: f.field(labelOf('Street Address'), `${prefix}.${key}.address`, {}),
      city: f.field(labelOf('City'), `${prefix}.${key}.city`, {}),
      state: f.field(labelOf('State'), `${prefix}.${key}.state`, {}),
      email: f.field(labelOf('Email'), `${prefix}.${key}.email`, { type: 'email' })
    };
    named(fields.name, sectionId, nameLabel); named(fields.phone, sectionId, labelOf('Telephone'));
    named(fields.street, sectionId, labelOf('Street Address')); named(fields.city, sectionId, labelOf('City'));
    named(fields.state, sectionId, labelOf('State')); named(fields.email, sectionId, labelOf('Email'));
    return sec(f, sectionId, f.row(fields.name, fields.phone), fields.street, f.row(fields.city, fields.state), fields.email);
  }

  /** Short labels printed on the contacts page, looked up by their text so the wording test covers them. */
  function labelOf(text) {
    const [, list] = O().tables['contacts.labels'];
    if (!list.includes(text)) throw new Error(`not an official label: ${text}`);
    return text;
  }

  /** Lines that show how many lines of the official box a value takes (S21). Updates when the box changes. */
  function fitNote(f, get, name, path) {
    const el = h('p', { className: 'help fit' });
    const update = () => {
      const value = String(get(path) || '');
      const parts = M().fit(name, value);
      el.hidden = !value.trim() || parts.length === 0;
      if (el.hidden) { el.textContent = ''; return; }
      const list = parts.map((p) => `page ${p.page}, about ${p.lines} of ${p.capacity} lines`).join('; ');
      const fits = parts.every((p) => p.fits);
      el.textContent = fits ? `Fits in the official box: ${list}.` : `May not fit in the official box: ${list}. Shorten it, or attach a page.`;
    };
    f.watch(path, update);
    update();
    return el;
  }

  /** A read-only copy of an answer kept elsewhere, with a link to change it (for example the shared description). */
  function readOnly(f, label, value, linkText, onClick, note) {
    value = String(value || '');
    return h('div', { className: 'field' },
      h('p', { className: 'help' }, label),
      h('div', { className: 'print-value' }, value.trim() || '—'),
      f.print ? null : h('button', { type: 'button', className: 'link-button', onClick }, linkText),
      note ? h('p', { className: 'help' }, note) : null);
  }

  /** Amounts that the form adds up, shown as they are added (counts and money in the official format). */
  function totalLine(f, dataOf, label, name, watchPaths, format = 'money') {
    const el = h('p', { className: 'list-total' });
    const update = () => {
      const t = M().totals(dataOf());
      if (t.invalid.includes(name)) { el.textContent = `${label} can’t add up yet. Use plain numbers like 12.50.`; return; }
      const v = t.values[name];
      const text = v === '' || v === undefined ? '' : format === 'count' ? Number(v).toFixed(0) : format === 'hours' ? Number(v).toFixed(2) : window.EagleOfficialPdf.formatMoney(Number(v));
      el.textContent = `${label} ${text}`.trim();
    };
    if (!f.print) for (const p of watchPaths) f.watch(p, update);
    update();
    return el;
  }

  /** The hours table on the Proposal and Plan tabs: rows as printed, a count and total hours per row. */
  function hoursTable(f, get, set, path, sectionId) {
    const [, rowLabels] = O().tables[`${path}.rows`];
    const [, headers] = O().tables[`${path.split('.')[0]}.hours.cols`];
    const rows = (get(path) || []);
    let refresh = () => {};
    const body = rows.map((r, i) => {
      const cells = ['w', 'h'].map((key) => {
        if (f.print) return h('td', null, String(r[key] || ''));
        if (i === 0 && key === 'w') return h('td', null, '1');
        const input = h('input', { inputmode: 'decimal', 'aria-label': `${rowLabels[i]}: ${key === 'w' ? headers[0] : headers[1]}` });
        input.value = r[key] || '';
        input.addEventListener('input', (e) => { set(`${path}.${i}.${key}`, e.target.value); refresh(); });
        return h('td', null, input);
      });
      return h('tr', null, h('th', { scope: 'row' }, rowLabels[i] || ''), ...cells);
    });
    // Live grand total: the form's own rules (Scout counted as 1; hours added up; blanks count as 0).
    const total = h('p', { className: 'list-total' });
    const update = () => {
      const list = get(path) || [];
      const P = window.EagleOfficialPdf;
      let people = 1, hrs = 0, badPeople = false, badHours = false;
      list.forEach((r, i) => {
        if (i > 0) { const w = P.parseWhole(r && r.w); if (Number.isNaN(w)) badPeople = true; else if (w) people += w; }
        const x = P.parseCount(r && r.h); if (Number.isNaN(x)) badHours = true; else if (x) hrs += x;
      });
      total.textContent = badPeople || badHours ? 'Grand total: use plain numbers, like 12.' : `Grand total: ${people} people, ${Math.round(hrs * 100) / 100} hours.`;
    };
    refresh = update;
    if (!f.print) f.watch(path, update);
    update();
    return sec(f, sectionId,
      h('div', { className: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, ''), ...headers.map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, ...body))),
      total);
  }

  /** The cost tables (plan items, spending): official headers, live row totals, the form's own rules. */
  function costTable(f, get, set, path, limit, caption) {
    const [, headers] = O().tables[`${path}`] || [0, ['Item', 'Description', 'Quantity', 'Unit Cost', 'Total Cost', 'Source']];
    const fields = ['item', 'description', 'qty', 'unitCost', 'totalCost', 'source'];
    const list = get(path) || [];
    if (f.print) {
      return h('div', { className: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ...headers.map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, ...list.map((r) => h('tr', null, ...fields.map((k) => h('td', null, String((r && r[k]) || '')))))))); 
    }
    const table = f.table(caption, headers, path, fields, { numeric: ['qty', 'unitCost', 'totalCost'] });
    const extra = list.slice(limit).filter((r) => r && Object.values(r).some((v) => String(v || '').trim())).length;
    return h('div', null, table, extra ? h('p', { className: 'help' }, `The official table has room for ${limit} rows. ${extra === 1 ? '1 more row is' : `${extra} more rows are`} not in the PDF; ask your coach how to show ${extra === 1 ? 'it' : 'them'}.`) : null);
  }

  window.EagleW26Ui = { usePlain, box, sec, card, select, person, place, labelOf, fitNote, readOnly, totalLine, hoursTable, costTable, entry, idOf };
})();
