/*
 * EaglePaperworkHelper: code shared by EagleWorkbook-guided.html and EagleWorkbook.html.
 * Loaded as an ordinary <script> so the pages work when opened from disk (file://).
 * Exposes window.EagleWorkbook.
 */
(function () {
  'use strict';

  const OFFICIAL_PDF_URL = 'https://www.scouting.org/wp-content/uploads/2023/01/EagleProjectWorkbook2023a.pdf';
  const MAX_BACKUP_BYTES = 80 * 1024 * 1024; // room for scanned pages (lib/attachments.js caps them)
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
      },
      // Scanned signed pages and other attachments (see lib/attachments.js), and links to share with reviewers.
      attachments: [],
      links: [],
      // The Scout's own notes for "Your path" (see lib/journey.js). Never copied into the official PDF.
      // raising: '' | 'yes' | 'no'. steps: { <stepId>: { done: '1' } }.
      journey: { raising: '', steps: {} }
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
        // Lists with no default rows (attachments, links) are checked by lib/attachments.js.
        if (!target.length) return source.slice(0, MAX_ROWS).filter((x) => x && typeof x === 'object' && !Array.isArray(x)).map((x) => ({ ...x }));
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
    const result = merge(base, data);
    if (result && typeof result === 'object') result.journey = cleanJourney(result.journey);
    return result;
  }

  /* "Your path" notes: keep only what lib/journey.js reads (a test checks these ids match CHECK_IDS there). */
  const JOURNEY_IDS = ['propSigned', 'fund', 'work', 'repSigned', 'rest'];
  function cleanJourney(journey) {
    const j = journey && typeof journey === 'object' ? journey : {};
    const steps = {};
    for (const id of JOURNEY_IDS) {
      const s = j.steps && typeof j.steps === 'object' ? j.steps[id] : null;
      if (s && typeof s === 'object' && !Array.isArray(s) && (s.done === '1' || s.done === '')) steps[id] = { done: s.done };
    }
    return { raising: j.raising === 'yes' || j.raising === 'no' ? j.raising : '', steps };
  }

  function looksLikeWorkbook(data) {
    return Boolean(data && typeof data === 'object' && !Array.isArray(data) && data.candidate && typeof data.candidate === 'object' && data.proposal && typeof data.proposal === 'object');
  }

  /**
   * Browser storage for one workbook page.
   * Keys: `${key}` (the draft), `${key}_saved` (when it last changed), `${key}_backup` (last backup file).
   */
  /**
   * "Boxes changed since your last backup file": a short fingerprint of what is in each box, never the words.
   * boxHashes(data) maps each filled-in box to a 32-bit hash of its text; a scan counts once (its pages are one
   * fingerprint) and so does a link. Comparing two maps counts the boxes that differ, so a box changed back
   * is not counted, and a hundred keystrokes in one box are one box.
   */
  function boxHashes(data) {
    const hash = (text) => { let x = 0x811c9dc5; for (let i = 0; i < text.length; i++) { x ^= text.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(36); };
    const out = {};
    const walk = (value, path) => {
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) value.forEach((v, i) => walk(v, path ? `${path}.${i}` : String(i)));
        else for (const k of Object.keys(value)) { if (k !== 'num' && k !== 'cat') walk(value[k], path ? `${path}.${k}` : k); }
      } else { const text = String(value === undefined || value === null ? '' : value).trim(); if (text) out[path] = hash(text); }
    };
    const rest = data && typeof data === 'object' ? { ...data } : {};
    const attachments = Array.isArray(rest.attachments) ? rest.attachments : [];
    const links = Array.isArray(rest.links) ? rest.links : [];
    delete rest.attachments; delete rest.links;
    walk(rest, '');
    attachments.forEach((a) => { if (a && typeof a === 'object') out[`attachment:${a.id}`] = hash([a.place, a.label, ...(Array.isArray(a.pages) ? a.pages.map((p) => p && p.id) : [])].join('|')); });
    links.forEach((l, i) => { if (l && typeof l === 'object' && (l.url || l.title)) out[`link:${i}`] = hash(`${l.title}|${l.url}`); });
    return out;
  }

  function createStore(key) {
    const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
    const write = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
    let timer = null;
    let pending = null;     // the draft waiting for its timer; written at once if the Scout leaves the page
    const listeners = [];
    // A conflict only ends when the Scout erases the draft or opens a backup file (store.resume()), never because of another event.
    const notify = (state) => { if (store.state !== 'conflict' || state === 'conflict') store.state = state; listeners.forEach((fn) => fn(state)); };
    const writeDraft = (data) => {
      if (store.state === 'conflict') return false;   // another tab changed this draft; don't overwrite it
      const ok = write(key, JSON.stringify(data));
      if (ok) { lastWrite = Date.now(); write(`${key}_saved`, String(lastWrite)); }
      return ok;
    };
    const flushPending = () => {
      if (!timer) return;
      clearTimeout(timer); timer = null;
      const data = pending; pending = null;
      if (data) notify(writeDraft(data) ? 'saved' : 'failed');
    };
    let lastWrite = 0;      // when this page last wrote the draft (ms), to notice a restore from the back/forward cache
    const store = {
      key,
      latest: null,           // the draft this page is working on, for the "boxes changed" count
      state: 'idle',
      corrupt: false,
      corruptAt: 0,
      conflictAt: 0,
      load(defaults) {
        const text = read(key);
        if (!text) return null;
        try {
          const data = JSON.parse(text);
          if (looksLikeWorkbook(data)) { store.latest = mergeWithDefaults(defaults(), data); return store.latest; }
        } catch { /* fall through */ }
        // Unreadable: keep a copy before the first save can replace it.
        store.corrupt = true; store.corruptAt = Date.now();
        if (read(`${key}_corrupt`) === null) write(`${key}_corrupt`, text);
        return null;
      },
      save(data) {
        clearTimeout(timer);
        pending = data; store.latest = data;
        if (store.state === 'conflict') { notify('conflict'); return; }
        notify('saving');
        timer = setTimeout(() => {
          timer = null; pending = null;
          if (store.state === 'conflict') { notify('conflict'); return; }
          notify(writeDraft(data) ? 'saved' : 'failed');
        }, 400);
      },
      flush(data) {
        clearTimeout(timer); timer = null; pending = null; store.latest = data;
        if (store.state === 'conflict') { notify('conflict'); return; }
        notify(writeDraft(data) ? 'saved' : 'failed');
      },
      savedAt() { return Number(read(`${key}_saved`)) || 0; },
      backupAt() { return Number(read(`${key}_backup`)) || 0; },
      /** A backup file was just saved or opened: remember what every box looked like, as fingerprints only. */
      markBackedUp(data, hashes) {
        write(`${key}_backup`, String(Date.now()));
        // hashes: taken when the file was built (the share sheet is slow, and the Scout may keep typing meanwhile).
        const snap = hashes || (data ? boxHashes(data) : null);
        if (data) store.latest = data;
        // A snapshot that could not be written must not leave an older one behind: it would hide unsaved work.
        if (!snap || !write(`${key}_snap`, JSON.stringify(snap))) { try { localStorage.removeItem(`${key}_snap`); } catch { /* storage blocked */ } }
        notify('backup');
      },
      /** How many boxes differ from the last backup file; null when that can't be known (never backed up, or backed up before this count existed). */
      changeCount() {
        if (!store.latest || !store.backupAt()) return null;
        let snap;
        try { snap = JSON.parse(read(`${key}_snap`) || 'null'); } catch { snap = null; }
        if (!snap || typeof snap !== 'object') return null;
        const now = boxHashes(store.latest);
        let n = 0;
        for (const k of new Set([...Object.keys(snap), ...Object.keys(now)])) if (snap[k] !== now[k]) n++;
        return n;
      },
      /** The Scout chose to replace this draft (opened a backup file): saving may continue. */
      resume() { if (store.state === 'conflict') { store.state = 'idle'; } },
      erase() {
        clearTimeout(timer); timer = null; pending = null;
        store.resume();   // starting over ends a conflict
        for (const k of [key, `${key}_saved`, `${key}_backup`, `${key}_snap`, `${key}_corrupt`]) { try { localStorage.removeItem(k); } catch { /* storage blocked */ } }
      },
      onChange(fn) { listeners.push(fn); },
      /** Forget page elements from the previous render. */
      clearListeners() { listeners.length = 0; }
    };
    // Don't lose the last keystrokes when the tab closes, the phone switches apps, or a link is followed.
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('pagehide', flushPending);
      if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPending(); });
      // Another tab (or window) wrote or erased this draft: stop saving over it.
      window.addEventListener('storage', (e) => {
        if (e && (e.key === key || e.key === null) && (!e.storageArea || e.storageArea === localStorage)) {
          clearTimeout(timer); timer = null; pending = null;
          store.conflictAt = Date.now();
          notify('conflict');
        }
      });
      // A page restored from the back/forward cache gets no storage events for what happened while it was away.
      window.addEventListener('pageshow', (e) => {
        if (e && e.persisted && (Number(read(`${key}_saved`)) || 0) > lastWrite && store.state !== 'conflict') {
          clearTimeout(timer); timer = null; pending = null;
          store.conflictAt = Date.now();
          notify('conflict');
        }
      });
      lastWrite = Number(read(`${key}_saved`)) || 0;
    }
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

  const att = () => window.EagleAttachments || null;

  /** The backup file's text: the draft plus every scanned page. Warns about pictures this browser no longer has. */
  function backupText(data) {
    if (!att()) return JSON.stringify(data, null, 2);
    const { data: full, missing } = att().withPictures(data);
    if (missing.length) window.alert(`These attachments have no picture in this browser, so the backup file lists them without pictures: ${missing.join('; ')}. Add their scans again on the Signed Pages & Photos tab.`);
    return JSON.stringify(full, null, 2);
  }

  function saveBackup(data, store) {
    store.flush(data);
    downloadBlob(new Blob([backupText(data)], { type: 'application/json' }), `Eagle-workbook-backup-${stamp()}.json`);
    store.markBackedUp(data);
  }

  /**
   * Whether to offer the share button. It needs a secure context (https, or a file opened from disk) and a browser that
   * can share files. Chrome and Edge (and so Android) say they can but then refuse a .json file ("Permission denied"),
   * so they don't get the button. Only Chromium-based browsers have navigator.userAgentData; Safari on iPhone and iPad
   * (including Chrome and Edge there, which use Safari's engine) share it fine.
   */
  function canShareFiles() {
    try {
      if (navigator.userAgentData) return false;
      return typeof navigator.share === 'function' && typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [new File(['{}'], 'backup.json', { type: 'application/json' })] });
    } catch { return false; }
  }

  /** Open the device's share sheet (Google Drive, Dropbox, email, and so on). Falls back to a normal download. */
  async function shareBackup(data, store) {
    store.flush(data);
    const hashes = boxHashes(data);   // what the file holds, before the share sheet gives the Scout time to keep typing
    const file = new File([backupText(data)], `Eagle-workbook-backup-${stamp()}.json`, { type: 'application/json' });
    try {
      await navigator.share({ files: [file], title: 'Eagle workbook backup file' });
      store.markBackedUp(data, hashes);
    } catch (error) {
      if (error && error.name === 'AbortError') return; // The Scout closed the share sheet.
      downloadBlob(file, file.name);
      store.markBackedUp(data, hashes);
      if (typeof window.alert === 'function') window.alert('Sharing did not work on this device, so the file was saved to your Downloads folder instead. Copy it to Google Drive or email it yourself.');
    }
  }

  /** "How to keep your work safe": plain steps for backup files, including cloud storage. */
  function backupHelp({ open = false } = {}) {
    return h('details', { className: 'keep-safe', open },
      h('summary', null, 'How to keep your work safe'),
      h('div', { className: 'keep-safe-body' },
        h('p', { className: 'keep-safe-note' }, 'Privacy first: the backup file has your name, birth date, BSA ID, phone, email, address, and the adults\u2019 contact details. If you added signed pages or other scans, it also holds pictures of those pages, including the adults\u2019 signatures. Use a private account that only you and your parent can open. Ask a parent before you put it in cloud storage or send it by email.'),
        h('p', null, 'Your answers are saved in this browser, but a browser can lose them (cleared data, a different browser, a school computer that resets). A backup file is your real save.'),
        h('ol', null,
          h('li', null, 'Click ', h('strong', null, 'Save backup file'), '. A file ending in .json goes to your Downloads folder (on a phone or tablet, look in the Files app).'),
          h('li', null, 'Copy that file somewhere safe: go to drive.google.com (or Dropbox or OneDrive), sign in, and drag the file in. Or email it to yourself as an attachment.', canShareFiles() ? ' The Share backup file button opens your device\u2019s share menu. On an iPhone or iPad it lists Drive, Mail, Messages, and more. The steps above work everywhere.' : ' On a phone, open Files, tap the file, then Share.'),
          h('li', null, 'To keep working later, or on another computer, click ', h('strong', null, 'Open backup file'), ' and choose it.')),
        h('p', { className: 'keep-safe-note' }, 'Share the file only with people who need it, such as your parent or unit leader.')));
  }

  /**
   * Plain words about signed pages and links on this page that the incoming data does not have, or '' if nothing
   * would be lost. Pages are matched by id (a backup of this same draft keeps its ids) and links by address.
   */
  function lossText(here, incoming) {
    if (!here || !att()) return '';
    const A = att();
    const keptIds = new Set(A.pagesOf(incoming).map((p) => p.id));
    const lostPages = A.pagesOf(here).filter((p) => !keptIds.has(p.id)).length;
    const key = (l) => A.cleanUrl(l && l.url) || String((l && l.url) || '').trim();
    const keptLinks = new Set((incoming.links || []).map(key).filter(Boolean));
    const lostLinks = (here.links || []).filter((l) => key(l) && !keptLinks.has(key(l))).length;
    const hasNotes = (d) => Boolean(window.EagleJourney && d && window.EagleJourney.hasNotes(d.journey));
    const lostNotes = hasNotes(here) && !hasNotes(incoming) ? 1 : 0;
    if (!lostPages && !lostLinks && !lostNotes) return '';
    const parts = [];
    if (lostPages) parts.push(`${lostPages} signed page${lostPages === 1 ? '' : 's'} or attachment page${lostPages === 1 ? '' : 's'}`);
    if (lostLinks) parts.push(`${lostLinks} link${lostLinks === 1 ? '' : 's'}`);
    if (lostNotes) parts.push('your notes in “Your path”');
    const count = lostPages + lostLinks + lostNotes;
    const one = count === 1 && !lostNotes;
    const list = parts.length > 2 ? `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}` : parts.join(' and ');
    return `\n\nThis backup file does not have ${list} that ${one ? 'is' : 'are'} on this page now, so ${one ? 'it' : 'they'} will be removed. Cancel and save a backup file first if you want to keep ${one ? 'it' : 'them'}.`;
  }

  /** Ask for a backup file, check it, confirm, and pass the merged data to onLoaded. */
  function openBackup(defaults, onLoaded, current = null) {
    if (attachState.busy) { window.alert('Wait until the picture you are adding has finished, then open the backup file.'); return; }
    const input = h('input', { type: 'file', accept: 'application/json,.json' });
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        if (file.size > MAX_BACKUP_BYTES) throw new Error('This file is too large to be a workbook backup file.');
        let data;
        try { data = JSON.parse(await file.text()); } catch { throw new Error('This file could not be read. Choose a backup file saved with “Save backup file” (it ends in .json).'); }
        if (!looksLikeWorkbook(data)) throw new Error('This is not an Eagle workbook backup file.');
        const merged = mergeWithDefaults(defaults(), data);
        // A backup made from a PDF (or an older one) has no signed pages. Say so if this page has some.
        const loss = lossText(current && att() ? current() : null, merged);
        if (!window.confirm(`Replace everything on this page with the backup file “${file.name}”?\n\nSave a backup file first if you want to keep what is here now.${loss}`)) return;
        // Scanned pages move into this browser's picture storage, not the smaller draft storage.
        const stored = {};
        if (att()) await att().absorb(merged, stored);
        onLoaded(merged);
        if (stored.failed) window.alert(`This browser could not store ${stored.failed === 1 ? '1 of the scanned pages' : `${stored.failed} of the scanned pages`} from that backup file, so ${stored.failed === 1 ? 'it' : 'they'} will be missing after you reload. Save a backup file now, and check free space or try a normal (not private) window.`);
        // Pictures only the replaced draft used shouldn't stay hidden in this browser.
        if (att()) await att().sweep(merged);
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
    const setRole = (alert) => { if (announce) el.setAttribute('role', alert ? 'alert' : 'status'); };
    let failed = false;
    const update = () => {
      const backup = store.backupAt();
      const saved = store.savedAt();
      const changed = store.changeCount();   // null when unknown
      const stale = changed !== null ? changed > 0 : Boolean(saved && saved > backup);
      let text = `Last backup file: ${formatWhen(backup)}.`;
      const damaged = store.corrupt && store.backupAt() < store.corruptAt;
      if (store.state === 'conflict') text = store.backupAt() >= store.conflictAt
        ? 'Backup file saved. Now reload this page. It will show the other tab’s version.'
        : '⚠ This draft was changed in another tab or window, so this page has stopped saving. Click “Save backup file” to keep what you typed here, then reload the page. (Reloading drops anything you typed here that is not in a backup file.)';
      else if (damaged) text = '⚠ Your saved draft in this browser was damaged and could not be opened. If this page looks empty or different from what you expect, click “Open backup file” to get your work back, or ask a parent or your coach for help.';
      else if (failed) text = '⚠ This browser could not save your draft. Click “Save backup file” now so you don’t lose your work.';
      else if (stale) text += ' You have changes that are only in this browser. Click “Save backup file.”';
      // The number sits in a hidden-from-readers span, so a screen reader is not read the whole line again for every new box.
      const countText = stale && changed && store.state !== 'conflict' && !damaged && !failed ? ` (${changed} change${changed === 1 ? '' : 's'} since that backup file)` : '';
      if (el.dataset.base !== text) { el.dataset.base = text; el.textContent = text; } // Unchanged text is not re-announced.
      let count = el.querySelector('.count');
      if (countText) { if (!count) { count = h('span', { className: 'count', 'aria-hidden': 'true' }); el.appendChild(count); } if (count.textContent !== countText) count.textContent = countText; }
      else if (count) count.remove();
      setRole(store.state === 'conflict' || failed);
      el.classList.toggle('stale', stale || failed || damaged || store.state === 'conflict');
    };
    update();
    store.onChange((state) => {
      if (state === 'failed') failed = true;
      if (state === 'saved') failed = false;
      if (state === 'saved' || state === 'backup' || state === 'failed' || state === 'conflict') update();
    });
    return el;
  }

  /** The row of backup, print, and fill buttons. */
  function controls({ store, onSave, onShare, onOpen, onPrint, top, fillReady = true }) {
    return h('div', { className: 'workbook-controls' + (top ? ' top' : '') },
      h('div', { className: 'control-buttons' },
        h('button', { type: 'button', className: 'btn-control save', onClick: onSave }, '💾 Save backup file'),
        onShare && canShareFiles() ? h('button', { type: 'button', className: 'btn-control share', onClick: onShare, title: 'Open this device\u2019s share menu with the backup file. What it lists depends on your device. The file has personal details, so pick a private account.' }, '📤 Share backup file…') : null,
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
      h('p', null, 'Your draft, including any scans of signed pages, is saved only in this browser on this computer. On a shared computer, save a backup file and then ',
        h('button', { type: 'button', className: 'link-button', onClick: onErase }, 'erase this draft from this browser'), '.'));
  }

  /** Erase the drafts of both workbook pages (each can load the other's), after confirming. */
  function confirmErase(stores, onErased) {
    if (!window.confirm('Erase your saved drafts from this browser? This erases the drafts of both workbook pages, including any scanned pages saved in this browser.\n\nThis cannot be undone. Save a backup file first if you want to keep your work. Backup files you already saved are not affected.')) return;
    [].concat(stores).forEach((s) => s.erase());
    if (att()) att().clearAll();
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
      if (!tip) { if (typeof console !== 'undefined') console.error('tipBox: no tip for ' + key); return null; } // tests/run-tests.cjs checks every key statically
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
        // The official PDF has room for `limit` rows; the total above counts only those.
        const list = get(path);
        const extra = Array.isArray(list) && limit ? list.slice(limit).filter((r) => r && Object.keys(r).some((k) => k !== 'num' && String(r[k] || '').trim())).length : 0;
        if (extra) totalEl.textContent += `. (Counts only the first ${limit} rows, the number the official PDF has room for.) ${extra === 1 ? '1 more row is' : `${extra} more rows are`} not in the PDF. Ask your coach how to show ${extra === 1 ? 'it' : 'them'}.`;
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
        const lib = window.EagleOfficialPdf;
        const r = lib ? lib.hoursTotal(get(path) || []) : { any: false };   // the same six rows, and the same rules, as the PDF
        totalEl.textContent = !r.any ? '' : r.invalid ? 'Grand total of hours: use numbers only.' : `Grand total of hours: ${r.total}`;
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

  /* ---------- Signed pages, attachments, and links ---------- */

  // Kept across redraws (tab changes), so a slow file read still reports to whatever is on screen.
  const attachState = { busy: '', problem: '', where: '', draw: null, focusKey: null };

  /**
   * The "Signed Pages & Photos" tab: add scans or photos of signed pages (inserted after the official page in the
   * submission copy), other attachments such as permits, and links. data() returns the current draft
   * (already checked with EagleAttachments.sanitize when it was loaded); save() saves it (debounced);
   * flush() saves it now.
   */
  function attachmentsSection({ data, save, flush, print = false, onChange = null }) {
    const A = att();
    if (!A) return h('p', { className: 'help' }, 'This page is missing lib/attachments.js. Keep it in the same folder as the “lib” folder it came with.');
    const D = () => { const d = data(); if (!Array.isArray(d.attachments)) d.attachments = []; if (!Array.isArray(d.links)) d.links = []; return d; };
    const S = attachState;
    const content = h('div');
    const live = h('p', { className: 'visually-hidden', role: 'status', 'aria-live': 'polite' }); // one region, so messages are read aloud
    const wrap = h('div', { className: 'attachments' }, content, live);

    const size = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`);
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    const thumb = (page, label, i) => {
      const bytes = A.pictureFor(page);
      if (!bytes) return h('figure', { className: 'thumb' }, h('div', { className: 'thumb-missing' }, 'Picture missing. Add it again.'), h('figcaption', null, `Page ${i + 1}`));
      const src = 'data:image/jpeg;base64,' + A.toBase64(bytes);
      const title = `${label}, page ${i + 1}`;
      const open = h('button', { type: 'button', className: 'thumb-open', 'aria-label': `View ${title} larger`, title: 'Click to see it larger', 'data-key': `view:${page.id}` },
        h('img', { src, alt: '' }));
      open.addEventListener('click', () => showPicture(src, title, open));
      return h('figure', { className: 'thumb' }, open, h('figcaption', null, `Page ${i + 1}`));
    };
    const redraw = () => (S.draw || draw)();
    const say = (text) => { if (live.textContent !== text) live.textContent = text; };

    /** Add pictures from files to the attachment find() returns, or to a new one built by make(). */
    async function addFiles(files, find, make, where) {
      const list = [...files];
      if (!list.length || S.busy) return;
      const owner = D(); // if another backup file is opened while reading, don't add to it
      if (!A.pagesOf(D()).length && !window.confirm('Pictures you add here are saved in your backup file and in this browser.\n\nThat means your backup file will hold pictures of the adults\u2019 signatures as well as your personal details.\n\nKeep the backup file private. Share it only with your parent or guardian, your unit leader, and the people reviewing your project. Don\u2019t post it online.\n\nAdd the picture?')) return;
      S.problem = ''; S.where = where; S.focusKey = `add:${where}`;
      let added = 0, unstored = 0;
      try {
        for (const file of list) {
          S.busy = `Reading “${file.name}”…`; redraw();
          const pages = await A.pagesFromFile(file);
          const d = D();
          if (d !== owner) throw new Error('Your work on this page was replaced (another backup file was opened, or the draft was erased) while this file was being read, so it wasn\u2019t added. Add it again if it belongs here.');
          if (A.pagesOf(d).length + pages.length > A.MAX_PAGES) throw new Error(`You can add up to ${A.MAX_PAGES} pages in all. Remove some first, or send the rest separately.`);
          // Look the attachment up now: the page may have been redrawn while reading.
          let target = find(d);
          if (!target) { target = make(); d.attachments.push(target); }
          for (const p of pages) {
            const pageId = A.newId();
            if (!(await A.putPicture(pageId, p.bytes))) unstored++;
            target.pages.push({ id: pageId, width: p.width, height: p.height, bytes: p.bytes.length });
            added++;
          }
          flush();
        }
        S.problem = unstored ? `This browser could not store ${unstored === 1 ? '1 of those pages' : `${unstored} of those pages`} for later (it may be out of space, or private browsing is on). They work until you reload, so save a backup file now.` : '';
        S.done = `Added ${plural(added, 'page')}. Save a backup file to keep ${added === 1 ? 'it' : 'them'}.`;
      } catch (error) {
        S.problem = error && error.message ? error.message : 'That file could not be added.';
        S.done = '';
      } finally {
        S.busy = '';
        redraw();
      }
    }

    async function removeAttachment(list, where) {
      const all = [].concat(list);
      const pages = all.reduce((n, a) => n + a.pages.length, 0);
      if (S.busy || !window.confirm(`Remove “${A.labelOf(all[0])}” (${plural(pages, 'page')})?\n\nSave a backup file first if you might want it back.`)) return;
      const d = D();
      d.attachments = d.attachments.filter((x) => !all.includes(x));
      flush();
      S.where = where; S.problem = ''; S.done = `Removed “${A.labelOf(all[0])}”.`; S.focusKey = `add:${where}`;
      await A.forgetUnused(all.flatMap((a) => a.pages.map((p) => p.id)));
      redraw();
    }

    async function removePage(a, page, i, where) {
      if (S.busy || !window.confirm(`Remove page ${i + 1} of “${A.labelOf(a)}”?\n\nSave a backup file first if you might want it back.`)) return;
      a.pages = a.pages.filter((p) => p !== page);
      const d = D();
      if (!a.pages.length) d.attachments = d.attachments.filter((x) => x !== a);
      flush();
      S.where = where; S.problem = ''; S.done = `Removed page ${i + 1}.`; S.focusKey = `add:${where}`;
      await A.forgetUnused([page.id]);
      redraw();
    }

    function picker(text, onFiles, label, key) {
      const input = h('input', { type: 'file', accept: 'image/*,application/pdf,.pdf', multiple: true, 'aria-label': label, 'data-key': key, disabled: Boolean(S.busy) });
      input.addEventListener('change', () => { const files = [...input.files]; input.value = ''; onFiles(files); });
      return h('span', { className: 'btn-add file-pick' + (S.busy ? ' disabled' : '') }, text, input);
    }

    /** Progress or a problem, shown in the card the Scout just used. */
    const cardStatus = (where) => (S.where === where && (S.busy || S.problem || S.done)
      ? h('p', { className: 'card-status' + (S.problem ? ' error' : '') }, S.busy || S.problem || S.done) : null);

    function pagesView(a, where) {
      return h('div', { className: 'thumbs' }, ...a.pages.map((p, i) => h('div', { className: 'thumb-wrap' }, thumb(p, A.labelOf(a), i),
        h('button', { type: 'button', className: 'link-button', 'data-key': `rm:${p.id}`, disabled: Boolean(S.busy), onClick: () => removePage(a, p, i, where), 'aria-label': `Remove page ${i + 1} of ${A.labelOf(a)}` }, 'Remove page'))));
    }

    function slotCard(slot) {
      const d = D();
      const mine = d.attachments.filter((x) => x.place === slot.place);
      const a = mine[0] || null;
      const where = slot.place;
      const find = (d) => d.attachments.find((x) => x.place === slot.place);
      return h('section', { className: 'card' },
        h('h3', { className: 'sec-title' }, slot.label),
        h('p', { className: 'help' }, `Page ${slot.afterPage} of the official PDF. Signed by: ${slot.who}. ${slot.when}`),
        mine.length ? h('div', null, ...mine.map((x) => pagesView(x, where))) : h('p', { className: 'help' }, 'Not added yet.'),
        h('div', { className: 'row-actions' },
          picker(a ? '+ Add another page' : '+ Add a scan or photo', (files) => addFiles(files, find, () => ({ id: A.newId(), place: slot.place, label: slot.label, pages: [] }), where), `Add a scan or photo of the ${slot.label}`, `add:${where}`),
          a ? h('button', { type: 'button', className: 'link-button', disabled: Boolean(S.busy), onClick: () => removeAttachment(mine, where) }, 'Remove all') : null),
        cardStatus(where));
    }

    function othersCard() {
      const d = D();
      const others = d.attachments.filter((x) => !A.slotFor(x.place) && !A.photoPlace(x.place));
      return h('section', { className: 'card' },
        h('h3', { className: 'sec-title' }, 'Permits, permissions, and other attachments'),
        h('p', { className: 'help' }, 'For example: a permit or permission letter, a council or district form, quotes or receipts, or a site sketch. In the submission copy they go at the end, after a page that lists everything. Project photos have their own section below.'),
        ...others.map((a, n) => {
          const name = h('input', { type: 'text', maxlength: '120', 'aria-label': `Name of attachment ${n + 1}` });
          name.value = a.label;
          name.addEventListener('input', () => { a.label = name.value; save(); });
          const where = `end:${a.id}`;
          return h('div', { className: 'attachment' },
            h('label', { className: 'mini' }, 'What is it?', name),
            pagesView(a, where),
            h('div', { className: 'row-actions' },
              picker('+ Add another page', (files) => addFiles(files, (d) => d.attachments.find((x) => x === a), () => { throw new Error(`“${A.labelOf(a)}” was removed while the file was being read, so the file wasn\u2019t added.`); }, where), `Add a page to ${A.labelOf(a)}`, `add:${where}`),
              h('button', { type: 'button', className: 'link-button', disabled: Boolean(S.busy), onClick: () => removeAttachment(a, 'end') }, 'Remove')),
            cardStatus(where));
        }),
        h('div', { className: 'row-actions' }, picker('+ Add an attachment', (files) => {
          const first = files[0];
          const label = first ? first.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 120) : 'Attachment';
          const id = A.newId();
          return addFiles(files, (d) => d.attachments.find((x) => x.id === id), () => ({ id, place: 'end', label, pages: [] }), 'end');
        }, 'Add a permit, permission letter, form, or photo', 'add:end')),
        cardStatus('end'));
    }

    function photosCard() {
      const d = D();
      const group = (pp) => {
        const mine = d.attachments.filter((x) => x.place === pp.place);
        const a = mine[0] || null;
        const where = pp.place;
        const find = (dd) => dd.attachments.find((x) => x.place === pp.place);
        return h('div', { className: 'attachment' },
          h('h4', { className: 'mini-title' }, pp.label),
          a ? pagesView(a, where) : h('p', { className: 'help' }, 'None added yet.'),
          h('div', { className: 'row-actions' },
            picker(a ? '+ Add another photo' : '+ Add a photo', (files) => addFiles(files, find, () => ({ id: A.newId(), place: pp.place, label: pp.label, pages: [] }), where), `Add a ${pp.label.toLowerCase()} photo`, `add:${where}`),
            a ? h('button', { type: 'button', className: 'link-button', disabled: Boolean(S.busy), onClick: () => removeAttachment(mine, where) }, 'Remove all') : null),
          cardStatus(where));
      };
      return h('section', { className: 'card' },
        h('h3', { className: 'sec-title' }, 'Project photos: before, during, and after'),
        h('p', { className: 'help' }, 'Optional. If you have them, the project report invites you to send photos taken before, during, and after the project, on a separate document. Add them here and they go at the end of the submission copy, grouped and labelled. Each one is turned into a picture; a phone photo straight from your camera works. They do not go into the official PDF.'),
        ...A.PHOTO_PLACES.map(group));
    }

    function linksCard() {
      const d = D();
      const rows = d.links.map((l, i) => {
        const title = h('input', { type: 'text', maxlength: '120', placeholder: 'Budget spreadsheet', 'aria-label': `Link ${i + 1}: what it is` });
        const url = h('input', { type: 'url', maxlength: '2000', placeholder: 'https://docs.google.com/…', 'aria-label': `Link ${i + 1}: web address`, 'data-key': `link:${i}` });
        const warn = h('p', { className: 'help warn', 'aria-live': 'polite' });
        const check = () => { warn.textContent = l.url.trim() && !A.cleanUrl(l.url) ? 'This doesn’t look like a web address. Copy the whole address from your browser’s address bar (it starts with https://). A file name like budget.xlsx is not a link: put the file in Google Drive or similar, share it, and paste its link here. Until then it won’t be listed.' : ''; };
        title.value = l.title; url.value = l.url;
        title.addEventListener('input', () => { l.title = title.value; save(); });
        url.addEventListener('input', () => { l.url = url.value; save(); check(); });
        check();
        return h('div', { className: 'link-row' }, title, url,
          h('button', { type: 'button', className: 'link-button', onClick: () => { d.links.splice(i, 1); flush(); S.focusKey = 'add:link'; S.where = ''; redraw(); }, 'aria-label': `Remove link ${i + 1}` }, 'Remove'), warn);
      });
      return h('section', { className: 'card' },
        h('h3', { className: 'sec-title' }, 'Links'),
        h('p', { className: 'help' }, 'Links to things reviewers can open, such as a budget spreadsheet or a photo folder. They are printed in full on the list page. Check each link’s sharing setting: reviewers need to be able to open it, and it shouldn’t share more than you mean to.'),
        ...rows,
        d.links.length < A.MAX_LINKS ? h('button', { type: 'button', className: 'btn-add', 'data-key': 'add:link', onClick: () => { d.links.push({ title: '', url: '' }); flush(); S.focusKey = `link:${d.links.length - 1}`; S.where = ''; redraw(); } }, '+ Add a link') : null);
    }

    function printView() {
      const d = D();
      const items = d.attachments.map((a) => h('li', null, `${A.labelOf(a)}: ${plural(a.pages.length, 'page')}`));
      const links = d.links.filter((l) => A.cleanUrl(l.url)).map((l) => h('li', null, `${l.title || 'Link'}: ${A.cleanUrl(l.url)}`));
      return h('div', null,
        h('p', null, 'Scanned pages are not printed in this draft. They are in the submission copy made on the Fill the official PDF page.'),
        items.length ? h('ul', null, ...items) : h('p', null, 'No signed pages or attachments added.'),
        links.length ? h('div', null, h('h4', null, 'Links'), h('ul', null, ...links)) : null);
    }

    function draw() {
      if (print) { content.replaceChildren(printView()); return; }
      const d = D();
      const count = A.pagesOf(d).length;
      const lost = A.persistent() === false;
      const focusKey = S.focusKey || (document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-key'));
      content.replaceChildren(
        h('div', { className: 'privacy-warning', role: 'note' },
          h('strong', null, 'Keep your backup file private. '),
          'Scans and photos you add here are saved inside your backup file. After you add one, the file holds pictures of the adults\u2019 signatures as well as your personal details. Share it only with your parent or guardian, your unit leader, and the people reviewing your project, and don\u2019t post it online.'),
        h('section', { className: 'card' },
          h('h3', { className: 'sec-title' }, 'How this works'),
          h('p', { className: 'help' }, 'Pages get signed at different times, often months apart. Do steps 1 to 3 each time a page is signed.'),
          h('ol', { className: 'steps' },
            h('li', null, 'Print the page from your filled PDF and get it signed. This helper works with pages signed on paper.'),
            h('li', null, 'Scan it, or take a clear photo straight on, in good light. A PDF from a scanner app works too.'),
            h('li', null, 'Add it below. Then save a backup file.'),
            h('li', null, 'Optional, when someone asks for the whole workbook: on ', h('a', { href: 'FillOfficialPDF.html' }, 'Fill the official PDF'), ', make a submission copy. Each signed page is inserted after the official page it belongs to. Nothing is replaced.')),
          h('details', { className: 'more-help' }, h('summary', null, 'Turning things in, and digital signatures'),
            h('p', { className: 'help' }, 'Ask your unit leader or council how they want things turned in. If they want only the signed page, send the scan or photo you took. Keep your signed originals.'),
            h('p', { className: 'help' }, 'The workbook warns that adding a signature in a PDF reader can lock the file, and says to save a copy first. If someone signs your PDF digitally, keep that signed PDF and ask your council how to submit it. Adding it here turns it into a picture.'))),
        ...A.SLOTS.map(slotCard),
        othersCard(),
        photosCard(),
        linksCard(),
        h('p', { className: 'attach-status' },
          count ? `${plural(count, 'page')} added. They add about ${size(A.backupBytes(d))} to your backup file.` : 'No pages added yet.',
          lost && count ? ' This browser can’t keep pictures after you close it. Save a backup file now.' : ''));
      say(S.busy || S.problem || S.done || '');
      if (onChange) onChange();
      if (focusKey) {
        const target = content.querySelector(`[data-key="${CSS.escape(focusKey)}"]`);
        if (target && !target.disabled) target.focus();
        else if (target) S.focusKey = focusKey; // try again once the read finishes
      }
      if (!S.busy) S.focusKey = null;
    }

    S.draw = print ? S.draw : draw;
    S.done = S.busy ? S.done : '';
    draw();
    if (!print && A.persistent() === null) A.ready().then(redraw);
    return wrap;
  }

  /** Show one picture full size in a dialog. Esc, Close, or a click outside the picture closes it. */
  function showPicture(src, title, opener) {
    const dialog = h('dialog', { className: 'picture-viewer', 'aria-label': title });
    const close = () => dialog.close();
    dialog.append(
      h('div', { className: 'viewer-bar' }, h('span', null, title), h('button', { type: 'button', className: 'btn-control', onClick: close }, 'Close ✕')),
      h('img', { src, alt: title }));
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); }); // the dim area outside the picture
    dialog.addEventListener('close', () => { dialog.remove(); if (opener && opener.isConnected) opener.focus(); });
    document.body.appendChild(dialog);
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    dialog.querySelector('button').focus();
  }

  /** For the stage card: which signed pages were added (Fundraising Page A is needed only for a fundraising application). */
  function attachmentsSummary(data) {
    const A = att();
    if (!A || !Array.isArray(data.attachments)) return 'No signed pages added yet';
    const added = A.SLOTS.filter((s) => data.attachments.some((a) => a.place === s.place && Array.isArray(a.pages) && a.pages.length)).map((s) => s.label.replace(/^Signed /, ''));
    return added.length ? `Signed pages added: ${added.join(', ')}` : 'No signed pages added yet';
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
    // What is not in a backup file yet, next to "Saved": the browser copy is not the backup.
    const backupNote = () => {
      if (!store.backupAt()) return ' · no backup file yet';
      const n = store.changeCount();
      if (n === null) return ' · no backup file to compare';
      return n === 0 ? ' · backup file is up to date' : ` · ${n} change${n === 1 ? '' : 's'} not in a backup file`;
    };
    const show = (state) => {
      if (state === 'saving') el.textContent = 'Saving…';
      else if (state === 'saved' || (state === 'backup' && store.state !== 'conflict')) el.textContent = '✓ Saved in this browser' + backupNote();
      else if (state === 'failed') el.textContent = '⚠ Could not save in this browser. Save a backup file now.';
      else if (state === 'conflict') el.textContent = '⚠ This draft was changed in another tab. Nothing you type here is being saved. Save a backup file, then reload.';
    };
    if (store.state === 'conflict') show('conflict');
    else if (store.savedAt()) show('saved');   // a draft is already saved in this browser: say so (and what is not backed up) at once
    store.onChange(show);
    return el;
  }

  /* Optional Scoutly chat (Scouting America's chatbot). One floating window on <body>, outside the page that redraws,
     so the conversation survives tab changes. Nothing loads until the Scout clicks; frame-src in the page's CSP pins the address. */
  const SCOUTLY_URL = 'https://scoutly.scouting.org/';
  const scoutly = { win: null, pill: null, frame: null, state: 'closed', listeners: [] };
  function scoutlySet(state) {
    scoutly.state = state;
    if (state === 'closed') {
      if (scoutly.win) scoutly.win.remove();
      if (scoutly.pill) scoutly.pill.remove();
      scoutly.win = scoutly.pill = scoutly.frame = null;
    } else {
      if (!scoutly.win) {
        const frame = document.createElement('iframe');
        frame.className = 'scoutly-frame';
        frame.title = 'Scoutly chat, from Scouting America';
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
        frame.setAttribute('allow', '');
        frame.setAttribute('referrerpolicy', 'no-referrer');
        frame.src = SCOUTLY_URL;
        scoutly.frame = frame;
        scoutly.win = h('div', { className: 'scoutly-win', role: 'dialog', 'aria-label': 'Scoutly chat from Scouting America' },
          h('div', { className: 'scoutly-bar' }, h('span', null, h('strong', null, 'Scoutly'), ' from Scouting America, not this helper. Don’t type private details, sign in, or reset a password here.'),
            h('button', { type: 'button', className: 'scoutly-btn scoutly-min', 'aria-label': 'Minimize Scoutly chat', onClick: () => scoutlySet('min') }, '–'),
            h('button', { type: 'button', className: 'scoutly-btn', 'aria-label': 'Close Scoutly chat', onClick: () => scoutlySet('closed') }, '×')),
          frame,
          h('p', { className: 'scoutly-note' }, 'Chat not showing? ', h('a', { href: SCOUTLY_URL, target: '_blank', rel: 'noopener noreferrer' }, 'Open it in a new tab'), ' or use the chat icon on scouting.org.'));
        scoutly.pill = h('button', { type: 'button', className: 'scoutly-pill', onClick: () => scoutlySet('open') }, 'Scoutly chat');
        document.body.appendChild(scoutly.win);
        document.body.appendChild(scoutly.pill);
        scoutly.win.addEventListener('keydown', (e) => { if (e.key === 'Escape') scoutlySet('min'); });
      }
      scoutly.win.style.display = state === 'open' ? '' : 'none';
      scoutly.pill.style.display = state === 'min' ? '' : 'none';
      if (state === 'open') scoutly.win.querySelector('.scoutly-min').focus();   // the bar buttons are the keyboard way out
      else scoutly.pill.focus();
    }
    document.body.classList.toggle('scoutly-open', state === 'open');
    scoutly.listeners.forEach((fn) => fn());
    if (state === 'closed') { const card = document.querySelector('.ask-help'); const b = document.querySelector('.ask-scoutly button'); const t = card && card.open && b ? b : document.querySelector('.ask-help summary'); if (t) t.focus(); }
  }

  function scoutlyBox() {
    const box = h('div', { className: 'ask-scoutly' });
    const draw = () => {
      box.textContent = '';
      box.appendChild(h('p', null, 'For general Scouting questions you can also try Scoutly, Scouting America’s own chatbot. This helper is not made by Scouting America. Don’t type names, addresses, phone numbers, or other private details, yours or anyone else’s. Don’t sign in or reset a password there. Chats may be saved by Scouting America. It doesn’t replace your unit leader, coach, or council.'));
      const label = scoutly.state === 'closed' ? 'Chat with Scoutly' : scoutly.state === 'open' ? 'Scoutly chat is open' : 'Show Scoutly chat';
      box.appendChild(h('button', { type: 'button', className: 'btn btn-prev', disabled: scoutly.state === 'open' ? 'disabled' : null, onClick: () => scoutlySet('open') }, label));
      box.appendChild(document.createTextNode(' '));
      box.appendChild(h('a', { href: 'https://www.scouting.org', target: '_blank', rel: 'noopener noreferrer' }, 'or open scouting.org'));
    };
    const redraw = () => { if (box.isConnected) draw(); else scoutly.listeners = scoutly.listeners.filter((f) => f !== redraw); };
    scoutly.listeners.push(redraw);
    draw();
    return box;
  }

  /* "Your path": the steps from the proposal to signed pages, worked out from the draft (lib/journey.js).
     Ticks are the Scout's own notes, saved in the draft as journey.*. Nothing here is sent anywhere or put in the PDF. */
  function journeyCard({ data, set, tabs }) {
    const J = window.EagleJourney;
    if (!J) return null;
    const box = h('section', { className: 'journey', 'aria-labelledby': 'journey-title' });
    const draw = () => {
      const d = data();
      const r = J.journeySteps(d, att(), tabs);
      const focusId = box.contains(document.activeElement) ? document.activeElement.id : '';
      const words = { fill: { todo: 'Not started', doing: 'Started', done: 'Filled in' }, check: { todo: 'Not ticked', doing: 'Not ticked', done: 'Ticked' } };
      const marks = { todo: '○', doing: '◐', done: '✓' };
      const raising = d.journey && d.journey.raising;
      const select = h('select', { id: 'journey-raising' },
        h('option', { value: '' }, 'Not sure yet'), h('option', { value: 'yes' }, 'Yes'), h('option', { value: 'no' }, 'No'));
      select.value = raising === 'yes' || raising === 'no' ? raising : '';
      select.addEventListener('change', () => { set('journey.raising', select.value); draw(); });
      const items = r.steps.map((s) => {
        const tick = s.kind === 'check'
          ? h('label', { className: 'j-tick' }, h('input', { type: 'checkbox', id: `j-tick-${s.id}`, 'aria-label': `I have done this: ${s.title}`, checked: s.state === 'done' ? 'checked' : null, onChange: (e) => { set(`journey.steps.${s.id}.done`, e.target.checked ? '1' : ''); draw(); } }), 'I have done this')
          : null;
        if (tick && s.state === 'done') tick.querySelector('input').checked = true;
        return h('li', { className: `j-${s.state}` },
          h('span', { className: 'j-mark', 'aria-hidden': 'true' }, marks[s.state]),
          h('div', null, h('strong', null, s.title), ' ', h('span', { className: 'j-state' }, `(${words[s.kind][s.state]})`),
            s.detail ? h('p', { className: 'j-detail' }, s.detail) : null, tick));
      });
      box.textContent = '';
      box.append(
        h('h3', { id: 'journey-title', className: 'sec-title' }, 'Your path'),
        h('p', { className: 'journey-next' }, r.next ? `Next on your path: ${r.next.next}` : 'Every step on this list is ticked or filled in. Ask your unit leader what comes next.'),
        h('p', { className: 'j-reminder' }, J.REMINDER),
        h('div', { className: 'j-raise' }, h('label', { for: 'journey-raising' }, 'Will you ask anyone outside your family, unit, or beneficiary for money or donated materials? '), select),
        h('ol', null, ...items),
        h('p', { className: 'j-detail' }, 'The ticks are your own notes. This helper can’t tell whether anyone has signed, and your notes stay in this browser and your backup file. They are not put in the PDF.'));
      if (focusId) { const again = document.getElementById(focusId); if (again) again.focus(); }
    };
    draw();
    return box;
  }

  /* "Who to ask" help card: a collapsed disclosure listing the contacts the Scout already entered. */
  function askForHelp({ get, setupName }) {
    const ROLES = [['leader', 'Unit leader'], ['coach', 'Project coach'], ['approvalRep', 'Council or district approver'], ['serviceCenter', 'Council service center']];
    const rows = [];
    for (const [key, label] of ROLES) {
      const name = String(get(`contacts.${key}.name`) || '').trim();
      const phone = String(get(`contacts.${key}.phone`) || '').trim();
      const email = String(get(`contacts.${key}.email`) || '').trim();
      if (!name && !phone && !email) continue;
      const bits = [h('strong', null, `${label}: `), name];
      const digits = phone.replace(/[\s().-]/g, '');
      if (phone) bits.push(name ? ' · ' : '', /^\+?\d{7,15}$/.test(digits) ? h('a', { href: `tel:${digits}` }, phone) : phone);
      if (email) bits.push(name || phone ? ' · ' : '', /^[^\s"'<>@]+@[^\s"'<>@]+\.[^\s"'<>@]+$/.test(email) ? h('a', { href: `mailto:${email}` }, email) : email);
      rows.push(h('li', null, ...bits));
    }
    return h('details', { className: 'ask-help' },
      h('summary', null, 'Not sure what to do? Who to ask'),
      h('p', null, 'Ask your unit leader first, then your project coach or your council or district contact. They can answer your questions; this helper only offers guidance.'),
      rows.length ? h('ul', null, ...rows)
        : h('p', null, `You haven’t added any contacts yet. Add them on the ${setupName} tab and they will show up here.`),
      scoutlyBox());
  }

  window.EagleWorkbook = {
    OFFICIAL_PDF_URL, ISO_DATE, h, defaults, getPath, setPath, mergeWithDefaults, looksLikeWorkbook, createStore, saveBackup, openBackup,
    controls, footer, confirmErase, printDraft, createForm, stickBelow, saveIndicator, formatWhen,
    backupHelp, askForHelp, journeyCard, JOURNEY_IDS, boxHashes, canShareFiles, shareBackup, attachmentsSection, attachmentsSummary
  };
})();
