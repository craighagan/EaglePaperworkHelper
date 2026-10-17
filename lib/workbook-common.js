/*
 * EaglePaperworkHelper: code shared by EagleWorkbook-guided.html and EagleWorkbook.html.
 * Loaded as an ordinary <script> so the pages work when opened from disk (file://).
 * Exposes window.EagleWorkbook.
 */
(function () {
  'use strict';

  const OFFICIAL_PDF_URL = 'https://www.scouting.org/wp-content/uploads/2023/01/EagleProjectWorkbook2023a.pdf';
  const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
  const MAX_ROWS = 100; // More rows than any official list holds; caps broken or hostile backup files.
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const HOURS_LABELS = [
    'Eagle Scout candidate: planning hours', 'Eagle Scout candidate: execution hours', 'Registered BSA youth members',
    'Other youth (not BSA members)', 'Registered BSA adult volunteers and leaders', 'Other adults (not BSA members)'
  ];

  /* ---------- DOM ---------- */

  /** Create an element. Attribute values of null/undefined/false are skipped; true sets an empty attribute. */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'className') el.className = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  /* ---------- Tips ("?" buttons) ---------- */

  const tipsData = () => window.EagleTips || {};
  // Which tip panels are open. Kept here so they stay open when the page redraws (tab changes, added rows).
  const openTips = new Set();

  /** The button and panel for one tip. label names the box for screen readers. */
  function makeTip(id, label, tip) {
    const panelId = `${id}-panel`;
    const open = openTips.has(panelId);
    const panel = h('div', { className: 'tip', id: panelId, hidden: !open },
      h('p', { className: 'tip-text' }, tip.text),
      tip.good ? h('p', { className: 'tip-good' }, h('strong', null, 'Example (made up, not required): '), tip.good) : null,
      tip.avoid ? h('p', { className: 'tip-avoid' }, h('strong', null, 'Avoid: '), tip.avoid) : null,
      h('p', { className: 'tip-meta' },
        tip.where ? `This box is on: ${tip.where}. ` : '',
        tip.advice ? 'Common advice, not a rule. ' : '', 'Tips are guidance, not requirements.'));
    const button = h('button', { type: 'button', className: 'tip-btn', 'aria-expanded': String(open), 'aria-controls': panelId },
      h('span', { className: 'tip-q', 'aria-hidden': 'true' }, '?'), h('span', null, 'Tips'), h('span', { className: 'visually-hidden' }, ` for ${label}`));
    const toggle = (show) => {
      panel.hidden = !show;
      button.setAttribute('aria-expanded', String(show));
      if (show) openTips.add(panelId); else openTips.delete(panelId);
    };
    button.addEventListener('click', () => toggle(panel.hidden));
    const closeOnEscape = (e) => { if (e.key === 'Escape' && !panel.hidden) { toggle(false); button.focus(); } };
    button.addEventListener('keydown', closeOnEscape);
    panel.addEventListener('keydown', closeOnEscape);
    return { button, panel };
  }

  /* ---------- Data ---------- */

  const contact = () => ({ name: '', phone: '', address: '', city: '', state: '', zip: '', email: '' });
  const rowsOf = (n, make) => Array.from({ length: n }, make);
  const costRow = () => ({ item: '', description: '', qty: '', unitCost: '', totalCost: '', source: '' });

  /**
   * The workbook data model, shared by both workbook pages, the backup file, and the PDF filler.
   * Keep keys stable: older backup files rely on them.
   */
  function defaults() {
    return {
      candidate: { name: '', dob: '', pid: '', address: '', city: '', state: '', zip: '', email: '', phone: '', borDate: '' },
      unit: { type: 'Troop', number: '', district: '', council: '' },
      contacts: { leader: contact(), chair: contact(), advancement: contact(), beneficiary: contact(), beneficiaryRep: contact(), serviceCenter: contact(), approvalRep: contact(), coach: contact() },
      proposal: {
        projectName: '', description: '', whyNeeded: '', startDate: '', endDate: '', helperCount: '', helperSource: '', leadershipChallenges: '',
        materials: '', supplies: '', tools: '', otherNeeds: '', permits: '',
        costs: { materials: '', supplies: '', tools: '', other: '' }, fundraisingPlan: '',
        phases: rowsOf(10, (_, i) => ({ num: String(i + 1), description: '' })), logistics: '', safety: '', planning: ''
      },
      plan: {
        startDate: '', endDate: '', reviewComments: '', changesFromProposal: '', changeImpact: '', presentCondition: '',
        phases: rowsOf(10, (_, i) => ({ num: String(i + 1), description: '', start: '', end: '' })),
        workProcesses: '', permits: '',
        materials: rowsOf(9, costRow), supplies: rowsOf(8, costRow),
        tools: rowsOf(5, () => ({ item: '', qty: '', unitCost: '', totalCost: '', source: '', user: '' })),
        other: rowsOf(5, costRow),
        toBeRaised: '', beneficiaryContribution: '', fundraisingPlan: '',
        helpers: rowsOf(10, () => ({ job: '', skills: '', adultYouth: '', needed: '', soFar: '' })),
        briefingPlan: '', communicationPlan: '', workerTransport: '', materialTransport: '', toolCondition: '',
        workingHours: '', food: '', restrooms: '', firstAid: '', hazardousMaterials: '',
        hazards: rowsOf(5, () => ({ hazard: '', prevention: '' })),
        safetyComm: '', ppe: '', safetyBriefing: '', safetyBriefer: '', firstAidSpecialist: '', emergencyAccess: '', contingency: '', coachComments: ''
      },
      fundraising: { description: '', beginDate: '', dates: '', howMuch: '', howCollected: '', contracts: '', contractSigner: '', contractDetails: '' },
      report: {
        startDate: '', endDate: '', actualStart: '', actualEnd: '', description: '', planning: '', wentWell: '', challenging: '',
        changes: '', leadership: '', difficultLeading: '', rewardingLeading: '', leadershipDeveloped: '', materialsUsed: '',
        hours: HOURS_LABELS.map((cat, i) => ({ cat, w: i < 2 ? '1' : '', h: '' })),
        // excessFunds answers "If your expenses exceeded funds available, explain why and how they were paid."
        // leftoverMaterials answers "If you had money left over, did you turn it over to the beneficiary?"
        fundingSummary: '', collected: '', spent: '', excessFunds: '', leftoverMaterials: '', thanks: ''
      }
    };
  }

  /** Read a value by dotted path ("plan.materials.0.qty"); '' when missing. */
  function getPath(data, path) {
    const value = path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), data);
    return value === undefined || value === null ? '' : value;
  }

  /** Write a value by dotted path, creating missing objects or rows. */
  function setPath(data, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    let o = data;
    for (const k of keys) {
      if (o[k] === undefined || o[k] === null || typeof o[k] !== 'object') o[k] = {};
      o = o[k];
    }
    o[last] = value;
  }

  /**
   * Fill in anything missing from an older or partial backup so every page renders.
   * Keeps every row from the backup (even beyond the default count), keeps keys this
   * version does not know about, and ignores values of the wrong type.
   */
  function mergeWithDefaults(base, data) {
    function merge(target, source) {
      if (Array.isArray(target)) {
        if (!Array.isArray(source)) return target;
        const length = Math.max(target.length, Math.min(source.length, MAX_ROWS));
        return Array.from({ length }, (_, i) => {
          const template = target[i] !== undefined ? target[i] : target[target.length - 1];
          const merged = merge(template, source[i]);
          if (merged && typeof merged === 'object' && !Array.isArray(merged) && 'num' in merged && target[i] === undefined) merged.num = String(i + 1);
          return merged;
        });
      }
      if (target && typeof target === 'object') {
        const out = { ...target };
        if (source && typeof source === 'object' && !Array.isArray(source)) {
          for (const key of Object.keys(source)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            out[key] = key in target ? merge(target[key], source[key]) : source[key];
          }
        }
        return out;
      }
      if (typeof source === 'string') return source;
      if (typeof source === 'number' && Number.isFinite(source)) return String(source);
      return target;
    }
    return merge(base, data);
  }

  function looksLikeWorkbook(data) {
    return Boolean(data && typeof data === 'object' && !Array.isArray(data) && data.candidate && typeof data.candidate === 'object' && data.proposal && typeof data.proposal === 'object');
  }

  /**
   * Browser storage for one workbook page.
   * Keys: `${key}` (the draft), `${key}_saved` (when it last changed), `${key}_backup` (last backup file).
   */
  function createStore(key) {
    const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
    const write = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
    let timer = null;
    const listeners = [];
    const store = {
      key,
      load(defaults) {
        try {
          const text = read(key);
          const data = text ? JSON.parse(text) : null;
          return looksLikeWorkbook(data) ? mergeWithDefaults(defaults(), data) : null;
        } catch { return null; }
      },
      save(data) {
        clearTimeout(timer);
        listeners.forEach((fn) => fn('saving'));
        timer = setTimeout(() => {
          const ok = write(key, JSON.stringify(data));
          if (ok) write(`${key}_saved`, String(Date.now()));
          listeners.forEach((fn) => fn(ok ? 'saved' : 'failed'));
        }, 400);
      },
      flush(data) {
        clearTimeout(timer);
        if (write(key, JSON.stringify(data))) write(`${key}_saved`, String(Date.now()));
      },
      savedAt() { return Number(read(`${key}_saved`)) || 0; },
      backupAt() { return Number(read(`${key}_backup`)) || 0; },
      markBackedUp() { write(`${key}_backup`, String(Date.now())); listeners.forEach((fn) => fn('backup')); },
      erase() {
        clearTimeout(timer);
        for (const k of [key, `${key}_saved`, `${key}_backup`]) { try { localStorage.removeItem(k); } catch { /* storage blocked */ } }
      },
      onChange(fn) { listeners.push(fn); },
      /** Forget page elements from the previous render. */
      clearListeners() { listeners.length = 0; }
    };
    return store;
  }

  /* ---------- Backup files ---------- */

  function stamp() {
    const d = new Date();
    const two = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`;
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function saveBackup(data, store) {
    store.flush(data);
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `Eagle-workbook-backup-${stamp()}.json`);
    store.markBackedUp();
  }

  /** Whether this device can hand a file to its share sheet (phones, tablets, Chromebooks, and some desktop browsers). */
  function canShareFiles() {
    try {
      return typeof navigator.share === 'function' && typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [new File(['{}'], 'backup.json', { type: 'application/json' })] });
    } catch { return false; }
  }

  /** Open the device's share sheet (Google Drive, Dropbox, email, and so on). Falls back to a normal download. */
  async function shareBackup(data, store) {
    store.flush(data);
    const file = new File([JSON.stringify(data, null, 2)], `Eagle-workbook-backup-${stamp()}.json`, { type: 'application/json' });
    try {
      await navigator.share({ files: [file], title: 'Eagle workbook backup file' });
      store.markBackedUp();
    } catch (error) {
      if (error && error.name === 'AbortError') return; // The Scout closed the share sheet.
      downloadBlob(file, file.name);
      store.markBackedUp();
    }
  }

  /** "How to keep your work safe": plain steps for backup files, including cloud storage. */
  function backupHelp({ open = false } = {}) {
    return h('details', { className: 'keep-safe', open },
      h('summary', null, 'How to keep your work safe'),
      h('div', { className: 'keep-safe-body' },
        h('p', { className: 'keep-safe-note' }, 'Privacy first: the backup file has your name, birth date, BSA ID, phone, email, address, and the adults\u2019 contact details. Use a private account that only you and your parent can open. Ask a parent before you put it in cloud storage or send it by email.'),
        h('p', null, 'Your answers are saved in this browser, but a browser can lose them (cleared data, a different browser, a school computer that resets). A backup file is your real save.'),
        h('ol', null,
          h('li', null, 'Click ', h('strong', null, 'Save backup file'), '. A file ending in .json goes to your Downloads folder (on a phone or tablet, look in the Files app).'),
          h('li', null, 'Copy that file somewhere safe: go to drive.google.com (or Dropbox or OneDrive), sign in, and drag the file in. Or email it to yourself as an attachment.', canShareFiles() ? ' On this device you can also click Send backup to Drive or email.' : ' On a phone, open Files, tap the file, then Share.'),
          h('li', null, 'To keep working later, or on another computer, click ', h('strong', null, 'Open backup file'), ' and choose it.')),
        h('p', { className: 'keep-safe-note' }, 'Share the file only with people who need it, such as your parent or unit leader.')));
  }

  /** Ask for a backup file, check it, confirm, and pass the merged data to onLoaded. */
  function openBackup(defaults, onLoaded) {
    const input = h('input', { type: 'file', accept: 'application/json,.json' });
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        if (file.size > MAX_BACKUP_BYTES) throw new Error('This file is too large to be a workbook backup file.');
        let data;
        try { data = JSON.parse(await file.text()); } catch { throw new Error('This file could not be read. Choose a backup file saved with “Save backup file” (it ends in .json).'); }
        if (!looksLikeWorkbook(data)) throw new Error('This is not an Eagle workbook backup file.');
        if (!window.confirm(`Replace everything on this page with the backup file “${file.name}”?\n\nSave a backup file first if you want to keep what is here now.`)) return;
        onLoaded(mergeWithDefaults(defaults(), data));
      } catch (error) {
        window.alert(error.message);
      }
    });
    input.click();
  }

  function formatWhen(ms) {
    if (!ms) return 'never';
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  /** "Last backup file: …" with a reminder when the draft changed since then. */
  function backupStatus(store, announce) {
    const el = h('p', { className: 'backup-status', role: announce ? 'status' : null });
    let failed = false;
    const update = () => {
      const backup = store.backupAt();
      const saved = store.savedAt();
      const stale = Boolean(saved && saved > backup);
      let text = `Last backup file: ${formatWhen(backup)}.`;
      if (failed) text = '⚠ This browser could not save your draft. Click “Save backup file” now so you don’t lose your work.';
      else if (stale) text += ' You have changes that are only in this browser. Click “Save backup file.”';
      if (el.textContent !== text) el.textContent = text; // Unchanged text is not re-announced.
      el.classList.toggle('stale', stale || failed);
    };
    update();
    store.onChange((state) => {
      if (state === 'failed') failed = true;
      if (state === 'saved') failed = false;
      if (state === 'saved' || state === 'backup' || state === 'failed') update();
    });
    return el;
  }

  /** The row of backup, print, and fill buttons. */
  function controls({ store, onSave, onShare, onOpen, onPrint, top, fillReady = true }) {
    return h('div', { className: 'workbook-controls' + (top ? ' top' : '') },
      h('div', { className: 'control-buttons' },
        h('button', { type: 'button', className: 'btn-control save', onClick: onSave }, '💾 Save backup file'),
        onShare && canShareFiles() ? h('button', { type: 'button', className: 'btn-control share', onClick: onShare, title: 'Send the backup file to Google Drive, Dropbox, email, or another app on this device.' }, '📤 Send backup to Drive or email') : null,
        h('button', { type: 'button', className: 'btn-control open', onClick: onOpen }, '📂 Open backup file'),
        h('button', { type: 'button', className: 'btn-control print', onClick: onPrint, title: 'Prints your answers as a simple draft for review. It is not the official form.' }, '🖨 Print a draft'),
        h('a', { className: 'btn-control fill' + (fillReady ? '' : ' quiet'), href: 'FillOfficialPDF.html' }, 'Fill the official PDF →')),
      backupStatus(store, top));
  }

  /** Disclaimer, official PDF link, and erase button. */
  function footer({ onErase }) {
    return h('footer', { className: 'page-footer' },
      h('p', null, 'Independent helper. Not made or endorsed by Scouting America. The official workbook, your council, and the required signatures are what count. ',
        h('a', { href: OFFICIAL_PDF_URL, target: '_blank', rel: 'noopener noreferrer' }, 'Official workbook PDF ↗')),
      h('p', null, h('a', { href: 'index.html' }, 'Home and help'), ' · ', h('a', { href: 'FillOfficialPDF.html' }, 'Fill the official PDF'), ' · ', h('a', { href: 'BackupFromPDF.html' }, 'Make a backup file from a PDF')),
      h('p', null, 'Your draft is saved only in this browser on this computer. On a shared computer, save a backup file and then ',
        h('button', { type: 'button', className: 'link-button', onClick: onErase }, 'erase this draft from this browser'), '.'));
  }

  /** Erase the drafts of both workbook pages (each can load the other's), after confirming. */
  function confirmErase(stores, onErased) {
    if (!window.confirm('Erase your saved drafts from this browser? This erases the drafts of both workbook pages.\n\nThis cannot be undone. Save a backup file first if you want to keep your work. Backup files you already saved are not affected.')) return;
    [].concat(stores).forEach((s) => s.erase());
    onErased();
  }

  /* ---------- Print a draft ---------- */

  /**
   * Show every section in one page marked DRAFT, open the print dialog, and come back afterward.
   * sections: [[title, () => element]]
   */
  function printDraft({ app, title, subtitle, sections, restore }) {
    let restored = false;
    const back = () => {
      if (restored) return;
      restored = true;
      window.removeEventListener('afterprint', back);
      if (media) media.removeEventListener('change', onMedia);
      restore();
      window.scrollTo(0, 0);
    };
    const media = window.matchMedia ? window.matchMedia('print') : null;
    const onMedia = (e) => { if (!e.matches) setTimeout(back, 0); };
    app.replaceChildren(
      h('div', { className: 'print-only-bar' },
        h('span', null, 'This is the printable draft.'),
        h('button', { type: 'button', className: 'btn-control', onClick: back }, '← Back to editing')),
      h('div', { className: 'print-header' },
        h('p', { className: 'draft-mark' }, 'DRAFT: not the official Eagle Scout Service Project Workbook'),
        h('h1', null, title),
        subtitle ? h('p', null, subtitle) : null),
      h('main', null, ...sections.map(([name, render], i) => h('section', { className: 'print-section', style: i ? 'page-break-before:always' : null },
        h('h2', { className: 'print-section-title' }, name), render()))),
      h('div', { className: 'print-footer' }, 'DRAFT: not the official workbook. Unofficial draft from EaglePaperworkHelper. Submit the official workbook, filled and signed.'));
    window.addEventListener('afterprint', back);
    if (media) media.addEventListener('change', onMedia);
    setTimeout(() => window.print(), 200);
  }

  /* ---------- Form building blocks ---------- */

  /**
   * Helpers bound to one page's data. get(path) returns '' for missing values; set(path, value) saves.
   * With print: true, answers are shown as text (so long answers are not cut off on paper).
   */
  function createForm({ get, set, print = false }) {
    const lib = () => window.EagleOfficialPdf;
    const asDate = (v) => (lib() && ISO_DATE.test(String(v)) ? lib().formatDate(v) : v);
    const shown = (value) => h('div', { className: 'print-value' }, String(value || '').trim() || '—');
    let counter = 0;
    const watchers = [];
    /** Call fn whenever a value at or under path changes. */
    const watch = (path, fn) => watchers.push([path, fn]);
    const changed = (path) => watchers.forEach(([p, fn]) => { if (path === p || path.startsWith(p + '.')) fn(); });

    function field(label, path, opts = {}) {
      const { type = 'text', multi = false, rows = 3, help = null, official = null, placeholder = null, min = null, step = null } = opts;
      const id = 'f-' + path.replace(/[^a-zA-Z0-9_-]/g, '-');
      const describedBy = [];
      const tip = print || opts.tip === false ? null : tipsData()[opts.tip || path] || null;
      // A tip with its own example replaces the always-visible example line, so the page stays uncluttered.
      const example = tip && tip.good ? null : opts.example || null;
      const labelEl = h('label', { for: id }, label, official ? h('span', { className: 'official-label' }, 'Matches the official box: ' + official) : null);
      const parts = [];
      if (tip) {
        const { button, panel } = makeTip(id, label, tip);
        parts.push(h('div', { className: 'label-row' }, labelEl, button), panel);
      } else parts.push(labelEl);
      if (help) { const hid = `${id}-help`; describedBy.push(hid); parts.push(h('p', { className: 'help', id: hid }, help)); }
      if (example) { const eid = `${id}-ex`; describedBy.push(eid); parts.push(h('p', { className: 'example', id: eid }, 'Example: ' + example)); }
      if (print) { parts.push(shown(type === 'date' ? asDate(get(path)) : get(path))); return h('div', { className: 'field' }, ...parts); }
      const attrs = { id, placeholder: placeholder || (tip && (multi || type === 'text') ? 'Not sure? Tap “? Tips” above.' : null), 'aria-describedby': describedBy.join(' ') || null };
      let input;
      const current = String(get(path) || '');
      // A date typed as text in an older version ("June 1") would be invisible in a date picker but still print. Show it as text.
      const oldTextDate = type === 'date' && current && !ISO_DATE.test(current);
      const oldHint = oldTextDate ? h('p', { className: 'help' }, `“${current}” isn’t in a form the date picker understands. Keep it, or clear it to pick a date.`) : null;
      if (oldHint) parts.push(oldHint);
      if (multi) input = h('textarea', { ...attrs, rows: String(rows) });
      else input = h('input', { ...attrs, type: oldTextDate ? 'text' : type, min: min !== null ? String(min) : null, step: step !== null ? String(step) : null, inputmode: opts.inputmode || null });
      if (oldTextDate) input.addEventListener('blur', () => { if (!input.value.trim()) { input.type = 'date'; oldHint.remove(); } });
      input.value = get(path);
      input.addEventListener('input', (e) => { set(path, e.target.value); changed(path); });
      parts.push(input);
      return h('div', { className: 'field' }, ...parts);
    }

    const row = (...children) => h('div', { className: 'row' }, ...children);

    /** A "Tips" button for a whole section or table (not for print). */
    function tipBox(key, label) {
      if (print) return null;
      const tip = tipsData()[key];
      if (!tip) { if (typeof console !== 'undefined') console.error('tipBox: unknown tip key ' + key); throw new Error('Unknown tip key: ' + key); }
      const { button, panel } = makeTip('t-' + key.replace(/[^a-zA-Z0-9_-]/g, '-'), label, tip);
      return h('div', { className: 'tip-wrap' }, h('div', { className: 'tip-line' }, button), panel);
    }

    function section(title, help, ...children) {
      return h('section', { className: 'card' }, h('h3', { className: 'sec-title' }, title), help ? h('p', { className: 'help' }, help) : null, ...children);
    }

    /** A contact. opts.nameLabel replaces "Name" (for example, the beneficiary organization). */
    function contactBlock(prefix, title, opts = {}) {
      if (print && !['name', 'phone', 'address', 'city', 'state', 'zip', 'email'].some((k) => String(get(`contacts.${prefix}.${k}`) || '').trim())) return null;
      return section(title, opts.help || null,
        row(field(opts.nameLabel || 'Name', `contacts.${prefix}.name`), field('Phone', `contacts.${prefix}.phone`, { type: 'tel' })),
        field('Address', `contacts.${prefix}.address`),
        row(field('City', `contacts.${prefix}.city`), field('State', `contacts.${prefix}.state`)),
        row(field('ZIP code', `contacts.${prefix}.zip`), field('Email', `contacts.${prefix}.email`, { type: 'email' })));
    }

    /** An editable table. Each cell is labeled "List name, row N, Column" for screen readers. */
    function table(caption, headers, path, fields, opts = {}) {
      const items = get(path) || [];
      const tableId = `t-${++counter}`;
      const body = items.filter((item) => !print || Object.values(item || {}).some((v) => String(v || '').trim())).map((item, i) => h('tr', null, ...fields.map((f, c) => {
        if (print) {
          if (f === 'totalCost' && !String((item && item[f]) || '').trim() && lib()) {
            const cost = lib().rowCost(item || {});
            return h('td', null, cost.amount !== null && !Number.isNaN(cost.amount) ? lib().formatMoney(cost.amount) : '');
          }
          return h('td', null, String((item && item[f]) || ''));
        }
        const input = h('input', { 'aria-label': `${caption}, row ${i + 1}, ${headers[c]}`, inputmode: opts.numeric && opts.numeric.includes(f) ? 'decimal' : null });
        input.value = (item && typeof item[f] === 'string') ? item[f] : (item && item[f] != null ? String(item[f]) : '');
        input.addEventListener('input', (e) => { set(`${path}.${i}.${f}`, e.target.value); changed(`${path}.${i}.${f}`); });
        return h('td', null, input);
      })));
      return h('div', { className: 'table-wrap' }, h('table', { id: tableId }, h('caption', { className: 'visually-hidden' }, caption),
        h('thead', null, h('tr', null, ...headers.map((hd) => h('th', { scope: 'col' }, hd)))), h('tbody', null, ...body)));
    }

    /** A cost list with a running total, using the same rules as the official-PDF filler. */
    function costTable(caption, headers, path, fields, limit) {
      const totalEl = h('p', { className: 'list-total', 'aria-live': 'polite' });
      const update = () => {
        const lib = window.EagleOfficialPdf;
        if (!lib) { totalEl.hidden = true; return; }
        const result = lib.listTotal(get(path), caption, limit);
        if (result.total !== null) totalEl.textContent = `${caption} total: ${lib.formatMoney(result.total)}`;
        else if (result.invalid) totalEl.textContent = `${caption} total: can’t add up yet. Use plain numbers in Qty, Unit $, and Total $ (like 12.50).`;
        else totalEl.textContent = `${caption} total: $0.00`;
        const mismatch = result.notes.find((n) => n.includes('does not equal'));
        if (mismatch && result.total !== null) totalEl.textContent += ` Check: ${mismatch.replace(`${caption}, `, '')}`;
      };
      const wrap = h('div', null, table(caption, headers, path, fields, { numeric: ['qty', 'unitCost', 'totalCost'] }), totalEl);
      watch(path, update);
      update();
      return wrap;
    }

    /** Service-hours table with labeled inputs and a live grand total. */
    function hoursTable(path) {
      const hours = get(path) || [];
      const totalEl = h('p', { className: 'list-total', 'aria-live': 'polite' });
      const update = () => {
        const list = get(path) || [];
        let total = 0, ok = true, any = false;
        for (const r of list) { const v = String(r.h || '').trim(); if (!v) continue; any = true; if (/^\d+(\.\d+)?$/.test(v)) total += Number(v); else ok = false; }
        totalEl.textContent = !any ? '' : ok ? `Grand total of hours: ${Math.round(total * 100) / 100}` : 'Grand total of hours: use numbers only.';
      };
      const body = hours.map((r, i) => {
        const cells = ['w', 'h'].map((key) => {
          if (print) return h('td', null, String(r[key] || ''));
          const input = h('input', { inputmode: 'decimal', 'aria-label': `${HOURS_LABELS[i] || r.cat}: ${key === 'w' ? 'number of workers' : 'total hours'}` });
          input.value = r[key] || '';
          input.addEventListener('input', (e) => { set(`${path}.${i}.${key}`, e.target.value); update(); });
          return h('td', null, input);
        });
        return h('tr', null, h('th', { scope: 'row' }, HOURS_LABELS[i] || r.cat), ...cells);
      });
      update();
      return h('div', null, h('div', { className: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Category'), h('th', { scope: 'col' }, 'Number of workers'), h('th', { scope: 'col' }, 'Total hours worked'))),
        h('tbody', null, ...body))), totalEl, h('p', { className: 'help' }, 'Enter the grand total of hours on your Eagle Scout Rank Application too.'));
    }

    return { field, row, section, contactBlock, table, costTable, hoursTable, watch, tipBox };
  }

  /** Keep the sticky tab bar just below the sticky header, whatever the header's height. */
  function stickBelow(header, nav) {
    const place = () => { nav.style.top = header.offsetHeight + 'px'; };
    place();
    if (window.ResizeObserver) new ResizeObserver(place).observe(header);
  }

  /** Status text in the header for autosave. */
  function saveIndicator(store) {
    const el = h('span', { className: 'save-status', 'aria-hidden': 'true' }); // Visual only; problems are announced in the backup status.
    store.onChange((state) => {
      if (state === 'saving') el.textContent = 'Saving…';
      else if (state === 'saved') el.textContent = '✓ Saved in this browser';
      else if (state === 'failed') el.textContent = '⚠ Could not save in this browser. Save a backup file now.';
    });
    return el;
  }

  window.EagleWorkbook = {
    OFFICIAL_PDF_URL, ISO_DATE, h, defaults, getPath, setPath, mergeWithDefaults, looksLikeWorkbook, createStore, saveBackup, openBackup,
    controls, footer, confirmErase, printDraft, createForm, stickBelow, saveIndicator, formatWhen,
    backupHelp, canShareFiles, shareBackup
  };
})();
