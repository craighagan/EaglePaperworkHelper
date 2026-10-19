/*
 * EaglePaperworkHelper: signed pages, attachments, and links.
 *
 * Scans and photos are kept as JPEG pictures:
 *   - in the browser, in IndexedDB (it can hold far more than the draft's localStorage),
 *   - in the backup file, as base64 text, so the backup file is still the real save.
 * The draft in localStorage only lists them (ids, labels, sizes).
 *
 * The "submission copy" is a new PDF: every page of the filled workbook drawn as a picture,
 * with each signed page inserted after the official page it belongs to, then an index page,
 * then the other attachments. The official PDF does not allow adding pages to it, so the
 * submission copy is printed (drawn), the way "Print to PDF" makes a copy.
 *
 * Works in a browser (window.EagleAttachments) and in Node (module.exports) for the tests.
 */
(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EagleAttachments = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  /** Pages that need signatures in workbook No. 2023a (PDF page numbers, 1-based). */
  const SLOTS = [
    { place: 'proposalH', afterPage: 15, label: 'Signed Proposal Page H', who: 'You, your unit leader, your unit committee, the beneficiary, and the council or district', when: 'Sign your promise first, then ask the others. Don\u2019t begin any work, raise any money, or obtain any materials until the proposal is approved.' },
    { place: 'fundraisingA', afterPage: 23, label: 'Signed Fundraising Application Page A', who: 'The beneficiary, your unit leader, and the council', when: 'Only if you need a fundraising application. The beneficiary and unit leader sign first, in any order. Then submit it to your council service center at least two weeks before you start fundraising, and don\u2019t fundraise until it\u2019s approved. Add the copy they signed; if the council sends back a signed copy, add that too.' },
    { place: 'reportC', afterPage: 29, label: 'Signed Project Report Page C', who: 'You, the beneficiary, and your unit leader', when: 'After the project is finished. Sign your promise first, then ask the others.' }
  ];
  const PLACES = new Set(['end', ...SLOTS.map((s) => s.place)]);
  const WORKBOOK_PAGES = 32;
  const MAX_PAGES = 40; // all attachments together
  const MAX_PAGES_PER_FILE = 15;
  const MAX_JPEG_BYTES = 3 * 1024 * 1024;
  const MAX_LINKS = 20;
  const SCAN_LONG_SIDE = 1800; // pixels; about 165 dots per inch on letter paper
  const PAGE_DPI = 150; // workbook pages in the submission copy
  const JPEG_QUALITY = 0.82;
  const DRAFT_KEYS = ['eagle_workbook_guided_v1', 'eagle_workbook_v1'];
  const DB_NAME = 'eagle_workbook_files';
  const DB_STORE = 'pages';

  /* ---------- Data ---------- */

  const str = (v) => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
  const isObj = (v) => Boolean(v && typeof v === 'object' && !Array.isArray(v));
  const ID = /^[a-z0-9]{6,40}$/i;
  const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

  function newId() {
    const bytes = new Uint8Array(12);
    (root.crypto && root.crypto.getRandomValues ? root.crypto.getRandomValues(bytes) : bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 256); }));
    return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
  }

  /** Only http and https links, so a link can't run code or open a local file. */
  function cleanUrl(value) {
    const text = str(value).trim();
    // Spaces mean it's a description, not an address (some browsers would still accept it).
    if (!text || /\s/.test(text)) return '';
    try {
      const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
      if (!url.hostname.includes('.') || /\.$/.test(url.hostname)) return ''; // "drive" or "budget" alone isn't a web address
      if (url.username || url.password) return '';                              // never keep (or print) a password
      if (/^[\d.]+$/.test(url.hostname)) return '';                              // an IP number is not something to hand a reviewer
      if (/\.(xlsx?|docx?|pptx?|pdf|csv|txt|jpe?g|png|gif|odt|ods|heic|json|rtf)$/i.test(url.hostname)) return ''; // "budget.xlsx" is a file name, not a web address
      return url.href;
    } catch { return ''; }
  }

  /**
   * Check attachments and links from a backup file or draft. Drops anything malformed and caps sizes.
   * Keeps base64 pictures (page.jpeg) only when keepPictures is true.
   */
  function sanitize(data, { keepPictures = true } = {}) {
    const out = isObj(data) ? data : {};
    let pageCount = 0;
    const attachments = [];
    for (const a of Array.isArray(out.attachments) ? out.attachments : []) {
      if (!isObj(a) || !ID.test(str(a.id))) continue;
      const pages = [];
      for (const p of Array.isArray(a.pages) ? a.pages : []) {
        if (!isObj(p) || !ID.test(str(p.id)) || pageCount >= MAX_PAGES) continue;
        const width = Number(p.width), height = Number(p.height);
        if (!(width > 0 && height > 0 && width <= 10000 && height <= 10000)) continue;
        const page = { id: p.id, width: Math.round(width), height: Math.round(height), bytes: Math.max(0, Math.round(Number(p.bytes) || 0)) };
        const jpeg = str(p.jpeg);
        if (keepPictures && jpeg && B64.test(jpeg) && jpeg.length % 4 === 0 && jpeg.length <= MAX_JPEG_BYTES * 1.4) page.jpeg = jpeg;
        pages.push(page);
        pageCount++;
      }
      attachments.push({ id: a.id, place: PLACES.has(a.place) ? a.place : 'end', label: str(a.label).slice(0, 120), pages });
    }
    const links = [];
    for (const l of Array.isArray(out.links) ? out.links : []) {
      if (!isObj(l) || links.length >= MAX_LINKS) continue;
      links.push({ title: str(l.title).slice(0, 120), url: str(l.url).slice(0, 2000) });
    }
    out.attachments = attachments;
    out.links = links;
    return out;
  }

  const pagesOf = (data) => (data && Array.isArray(data.attachments) ? data.attachments.flatMap((a) => a.pages || []) : []);
  const slotFor = (place) => SLOTS.find((s) => s.place === place) || null;
  const labelOf = (a) => str(a.label).trim() || (slotFor(a.place) ? slotFor(a.place).label : 'Attachment');

  /* ---------- Bytes and base64 ---------- */

  function toBase64(bytes) {
    if (typeof Buffer !== 'undefined' && !root.document) return Buffer.from(bytes).toString('base64');
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return root.btoa(s);
  }
  function fromBase64(text) {
    if (typeof Buffer !== 'undefined' && !root.document) return new Uint8Array(Buffer.from(text, 'base64'));
    let s;
    try { s = root.atob(text); } catch { return new Uint8Array(0); }   // a damaged picture string must not block the whole backup
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
  }
  const isJpeg = (b) => Boolean(jpegInfo(b));

  /**
   * Check a JPEG and read its real size and color channels from the frame header.
   * Returns { width, height, components } or null if it isn't a usable baseline/progressive JPEG.
   */
  function jpegInfo(b) {
    if (!b || b.length < 8 || b[0] !== 0xff || b[1] !== 0xd8) return null;
    let i = 2;
    while (i + 4 <= b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
      const len = (b[i + 2] << 8) | b[i + 3];
      if (len < 2 || i + 2 + len > b.length) return null;
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        // Only baseline, extended, and progressive 8-bit frames: every PDF viewer can draw these.
        if (m > 0xc2 || b[i + 4] !== 8) return null;
        const height = (b[i + 5] << 8) | b[i + 6], width = (b[i + 7] << 8) | b[i + 8], components = b[i + 9];
        return width && height && [1, 3, 4].includes(components) ? { width, height, components } : null;
      }
      if (m === 0xda) return null; // image data before a frame header
      i += 2 + len;
    }
    return null;
  }

  /** A copy of a JPEG without metadata (EXIF, GPS, comments). Keeps JFIF, color profile, and Adobe color markers. */
  function stripJpeg(b) {
    if (!jpegInfo(b)) return null;
    const keep = [b.subarray(0, 2)];
    let i = 2;
    while (i + 4 <= b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; } // fill byte
      if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
      if (m === 0xda) {
        // Image data to the first end-of-image marker (image data can't contain FF D9); anything after it,
        // such as a second picture with its own metadata, is dropped.
        let end = b.length;
        for (let j = i + 2; j + 1 < b.length; j++) if (b[j] === 0xff && b[j + 1] === 0xd9) { end = j + 2; break; }
        keep.push(b.subarray(i, end));
        break;
      }
      const len = (b[i + 2] << 8) | b[i + 3];
      const drop = (m >= 0xe1 && m <= 0xef && m !== 0xe2 && m !== 0xee) || m === 0xfe;
      if (!drop) keep.push(b.subarray(i, i + 2 + len));
      i += 2 + len;
    }
    const out = new Uint8Array(keep.reduce((n, k) => n + k.length, 0));
    let at = 0;
    for (const k of keep) { out.set(k, at); at += k.length; }
    return out;
  }

  /* ---------- Browser storage (IndexedDB) ---------- */

  // Pictures in memory for this page, by page id. Filled from IndexedDB at start and as pictures are added.
  const cache = new Map();
  const db = { promise: null, ok: null };

  function openDb() {
    if (db.promise) return db.promise;
    db.promise = new Promise((resolve, reject) => {
      try {
        if (!root.indexedDB) throw new Error('no IndexedDB');
        const req = root.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('IndexedDB failed'));
        req.onblocked = () => reject(new Error('IndexedDB blocked'));
      } catch (error) { reject(error); }
    }).then((d) => { db.ok = true; return d; }, (error) => { db.ok = false; throw error; });
    return db.promise;
  }
  function tx(mode, fn) {
    return openDb().then((d) => new Promise((resolve, reject) => {
      const t = d.transaction(DB_STORE, mode);
      const result = fn(t.objectStore(DB_STORE));
      t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('aborted'));
    }));
  }

  /** Load every saved picture into memory. Resolves to true if this browser can keep pictures. */
  async function ready() {
    try {
      const d = await openDb();
      await new Promise((resolve, reject) => {
        const req = d.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).openCursor();
        req.onsuccess = () => {
          const c = req.result;
          if (!c) return resolve();
          if (!cache.has(c.key) && c.value instanceof Uint8Array) cache.set(c.key, c.value);
          c.continue();
        };
        req.onerror = () => reject(req.error);
      });
      return true;
    } catch { return false; }
  }
  /** Whether pictures survive a reload in this browser: true, false, or null (not known yet). */
  const persistent = () => db.ok;

  async function putPicture(id, bytes) {
    cache.set(id, bytes);
    try { await tx('readwrite', (s) => s.put(bytes, id)); return true; } catch { return false; }
  }

  /** Ids of pictures used by either workbook's draft in this browser, or null if the drafts can't be read. */
  function idsInDrafts() {
    const ids = new Set();
    try {
      for (const key of DRAFT_KEYS) pagesOf(JSON.parse(root.localStorage.getItem(key) || 'null')).forEach((p) => ids.add(p.id));
    } catch { return null; }
    return ids;
  }
  /** Forget pictures no draft uses any more (call after the draft was saved). */
  async function forgetUnused(ids) {
    const used = idsInDrafts();
    if (!used) return;
    const gone = [].concat(ids).filter((id) => !used.has(id));
    gone.forEach((id) => cache.delete(id));
    try { await tx('readwrite', (s) => gone.forEach((id) => s.delete(id))); } catch { /* storage blocked */ }
  }
  /** Forget every saved picture that no draft uses (for example, after opening a different backup file). */
  async function sweep(current) {
    const used = idsInDrafts();
    if (!used) return;
    pagesOf(current).forEach((p) => used.add(p.id)); // the draft just opened, even if saving it failed
    let keys = [];
    try { keys = await tx('readonly', (s) => s.getAllKeys()); } catch { return; }
    const gone = (keys || []).filter((id) => !used.has(id));
    [...cache.keys()].filter((id) => !used.has(id)).forEach((id) => cache.delete(id));
    if (gone.length) { try { await tx('readwrite', (s) => gone.forEach((id) => s.delete(id))); } catch { /* storage blocked */ } }
  }

  async function clearAll() {
    cache.clear();
    try { await tx('readwrite', (s) => s.clear()); } catch { /* storage blocked */ }
  }

  /**
   * After opening a backup file: move its pictures into this browser's storage and out of the
   * draft data, which is saved in the smaller localStorage.
   */
  async function absorb(data, report = {}) {
    sanitize(data);
    report.failed = 0;
    const writes = [];
    for (const p of pagesOf(data)) {
      if (p.jpeg) {
        // Pictures from a backup file may have been made elsewhere: drop their metadata and use their real size.
        const bytes = stripJpeg(fromBase64(p.jpeg));
        const info = jpegInfo(bytes);
        if (info) { p.width = info.width; p.height = info.height; p.bytes = bytes.length; writes.push(putPicture(p.id, bytes).then((ok) => { if (!ok) report.failed++; })); }
        delete p.jpeg;
      }
    }
    await Promise.all(writes);
    return data;
  }

  /** The picture for a page: from the data itself (a backup file), or from this browser. */
  function pictureFor(page) {
    if (page.jpeg) return stripJpeg(fromBase64(page.jpeg));
    return cache.get(page.id) || null;
  }

  /** A copy of the data for a backup file, with every picture included. Lists pages whose picture is missing. */
  function withPictures(data) {
    const copy = JSON.parse(JSON.stringify(data));
    const missing = [];
    for (const a of copy.attachments || []) {
      for (const p of a.pages || []) {
        const bytes = pictureFor(p);
        if (bytes) p.jpeg = toBase64(bytes);
        else missing.push(labelOf(a));
      }
    }
    return { data: copy, missing: [...new Set(missing)] };
  }

  /** Approximate size the pictures add to a backup file. */
  function backupBytes(data) {
    return pagesOf(data).reduce((n, p) => n + Math.ceil(((pictureFor(p) || { length: p.bytes || 0 }).length * 4) / 3), 0);
  }

  /* ---------- Pictures from files ---------- */

  function canvasToJpeg(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('This browser could not make the picture.'));
      blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)), reject);
    }, 'image/jpeg', JPEG_QUALITY));
  }

  function drawScaled(source, width, height, longSide) {
    const scale = Math.min(1, longSide / Math.max(width, height));
    const canvas = root.document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // PNGs with see-through parts print on white
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  /** Load pdf.js on demand (the workbook pages don't need it otherwise). */
  function loadPdfjs() {
    if (root.pdfjsLib && root.pdfjsWorker) return Promise.resolve(root.pdfjsLib);
    const add = (src) => new Promise((resolve, reject) => {
      const s = root.document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('This page could not load its PDF reader. Keep it in the same folder as the “vendor” folder it came with.'));
      root.document.head.appendChild(s);
    });
    return add('vendor/pdfjs/openjpeg-wasm.js').then(() => add('vendor/pdfjs/pdf.worker.js')).then(() => add('vendor/pdfjs/pdf.js')).then(() => root.pdfjsLib);
  }

  async function renderPdfPage(pdfjsLib, doc, n, scale) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale });
    const canvas = root.document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // ENABLE draws the filled-in form boxes into the picture (the default leaves them out).
    await page.render({ canvasContext: ctx, canvas, viewport, annotationMode: pdfjsLib.AnnotationMode.ENABLE }).promise;
    page.cleanup();
    return canvas;
  }

  /**
   * Turn a chosen file (photo, scan picture, or PDF) into JPEG pages.
   * Resolves to [{ width, height, bytes }].
   */
  async function pagesFromFile(file) {
    if (file.size > 60 * 1024 * 1024) throw new Error(`“${file.name}” is too large. Choose a file under 60 MB.`);
    const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
    if (isPdf) {
      const pdfjsLib = await loadPdfjs();
      let doc;
      try { doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), verbosity: 0, isEvalSupported: false }).promise; }
      catch (error) { throw new Error(error && error.name === 'PasswordException' ? `“${file.name}” needs a password. Save a copy without one, or scan the pages as pictures.` : `“${file.name}” could not be read as a PDF.`); }
      try {
        if (doc.numPages > MAX_PAGES_PER_FILE) throw new Error(`“${file.name}” has ${doc.numPages} pages. Add at most ${MAX_PAGES_PER_FILE} pages from one file.`);
        const out = [];
        for (let n = 1; n <= doc.numPages; n++) {
          const first = await doc.getPage(n);
          const vp = first.getViewport({ scale: 1 });
          const canvas = await renderPdfPage(pdfjsLib, doc, n, SCAN_LONG_SIDE / Math.max(vp.width, vp.height));
          out.push({ width: canvas.width, height: canvas.height, bytes: await canvasToJpeg(canvas) });
        }
        return out;
      } finally { await doc.destroy(); }
    }
    let bitmap;
    try { bitmap = await root.createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { throw new Error(`“${file.name}” could not be read as a picture. Use a JPEG or PNG photo or scan, or a PDF. (iPhone HEIC photos work in Safari; elsewhere, export them as JPEG first.)`); }
    const canvas = drawScaled(bitmap, bitmap.width, bitmap.height, SCAN_LONG_SIDE);
    if (bitmap.close) bitmap.close();
    return [{ width: canvas.width, height: canvas.height, bytes: await canvasToJpeg(canvas) }];
  }

  /* ---------- Making the submission copy ---------- */

  // WinAnsi codes for the few non-Latin-1 characters people type often.
  const WIN_ANSI = { 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2013: 0x96, 0x2014: 0x97, 0x2026: 0x85, 0x2022: 0x95, 0x20ac: 0x80 };
  function pdfString(text) {
    let out = '';
    // Letters with accents the font can't show become the plain letter (\u0115 -> e), not "?".
    const plain = String(text).replace(/[^\u0000-\u00ff\u2018\u2019\u201c\u201d\u2013\u2014\u2026\u2022\u20ac]/g, (ch) => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '') || ch);
    for (const ch of plain) {
      let c = ch.codePointAt(0);
      if (WIN_ANSI[c]) c = WIN_ANSI[c];
      else if (c < 32 || (c > 126 && c < 160) || c > 255) c = 63; // "?"
      const s = String.fromCharCode(c);
      out += s === '(' || s === ')' || s === '\\' ? '\\' + s : s;
    }
    return '(' + out + ')';
  }

  // Helvetica widths (1/1000 em) for ASCII 32-126.
  const HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  function width(text, size, bold) {
    let u = 0;
    for (const ch of String(text)) { const c = ch.codePointAt(0); u += c >= 32 && c <= 126 ? HELVETICA[c - 32] : 600; }
    return (u / 1000) * size * (bold ? 1.08 : 1);
  }
  /** Wrap text to a width. Long words (like web addresses) break anywhere. */
  function wrap(text, max, size, bold) {
    const lines = [];
    let line = '';
    for (const word of String(text).split(/(\s+)/)) {
      if (!word) continue;
      const next = line + word;
      if (width(next.trimEnd(), size, bold) <= max) { line = next; continue; }
      if (line.trim()) lines.push(line.trimEnd());
      line = word.trimStart();
      while (width(line, size, bold) > max && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && width(line.slice(0, cut), size, bold) > max) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line.trim()) lines.push(line.trimEnd());
    return lines.length ? lines : [''];
  }

  /**
   * Order of pages in the submission copy.
   * Returns [{ kind: 'workbook', n } | { kind: 'scan', attachment, page } | { kind: 'index', n }].
   */
  function planPages(data, indexPages) {
    const attachments = (data.attachments || []).filter((a) => (a.pages || []).length);
    const order = [];
    for (let n = 1; n <= WORKBOOK_PAGES; n++) {
      order.push({ kind: 'workbook', n });
      for (const a of attachments) if (slotFor(a.place) && slotFor(a.place).afterPage === n) a.pages.forEach((page) => order.push({ kind: 'scan', attachment: a, page }));
    }
    for (let i = 0; i < indexPages; i++) order.push({ kind: 'index', n: i });
    for (const a of attachments) if (!slotFor(a.place)) a.pages.forEach((page) => order.push({ kind: 'scan', attachment: a, page }));
    return order;
  }

  /** Lines of the index page(s): what was added, where it is in this file, and the links. */
  function indexLines(data, order, today) {
    const L = [];
    const where = (a) => {
      const nums = order.map((o, i) => (o.kind === 'scan' && o.attachment === a ? i + 1 : 0)).filter(Boolean);
      return nums.length > 1 ? `pages ${nums[0]}\u2013${nums[nums.length - 1]}` : `page ${nums[0]}`;
    };
    const attachments = (data.attachments || []).filter((a) => (a.pages || []).length);
    L.push({ text: 'Signed pages, attachments, and links', size: 17, bold: true, gap: 6 });
    L.push({ text: `Project: ${str(data.proposal && data.proposal.projectName).trim() || '(no name yet)'}. Candidate: ${str(data.candidate && data.candidate.name).trim() || '(no name yet)'}.`, size: 10.5 });
    L.push({ text: `Made ${today} with EaglePaperworkHelper, an independent helper. Pages 1\u2013${WORKBOOK_PAGES} are a printed copy of the filled official workbook No. 2023a. Scanned pages are inserted after the page they belong to; nothing was removed.`, size: 10.5, gap: 10 });
    const inserted = attachments.filter((a) => slotFor(a.place));
    L.push({ text: 'Signed pages inserted into the workbook', size: 12.5, bold: true, gap: 3 });
    if (!inserted.length) L.push({ text: 'None added.', size: 10.5, indent: 12 });
    for (const a of inserted) L.push({ text: `\u2022 ${labelOf(a)}: ${where(a)} (after workbook page ${slotFor(a.place).afterPage}).`, size: 10.5, indent: 12 });
    const others = attachments.filter((a) => !slotFor(a.place));
    L.push({ text: 'Other attachments', size: 12.5, bold: true, gap: 3, before: 8 });
    if (!others.length) L.push({ text: 'None added.', size: 10.5, indent: 12 });
    for (const a of others) L.push({ text: `\u2022 ${labelOf(a)}: ${where(a)}.`, size: 10.5, indent: 12 });
    const links = (data.links || []).map((l) => ({ title: str(l.title).trim(), url: cleanUrl(l.url) })).filter((l) => l.url);
    L.push({ text: 'Links', size: 12.5, bold: true, gap: 3, before: 8 });
    if (!links.length) L.push({ text: 'None added.', size: 10.5, indent: 12 });
    for (const l of links) {
      L.push({ text: `\u2022 ${l.title || 'Link'}:`, size: 10.5, indent: 12 });
      L.push({ text: l.url, size: 10, indent: 24, url: l.url, color: [0, 0.27, 0.62] });
    }
    L.push({ text: 'Each signed page is a picture of the signed page, placed right after its official page. This helper never adds or changes a signature.', size: 9.5, before: 12, color: [0.3, 0.3, 0.3] });
    return L;
  }

  /** Lay index lines out on letter pages. Returns [[{ x, y, text, size, bold, url, color }]]. */
  function layoutIndex(lines) {
    const pages = [[]];
    const left = 54, right = 558, top = 738, bottom = 54;
    let y = top;
    for (const line of lines) {
      if (line.before) y -= line.before;
      const x = left + (line.indent || 0);
      for (const part of wrap(line.text, right - x, line.size, line.bold)) {
        const lead = line.size * 1.3;
        if (y - lead < bottom) { pages.push([]); y = top; }
        y -= lead;
        pages[pages.length - 1].push({ x, y, text: part, size: line.size, bold: line.bold, url: line.url, color: line.color });
      }
      if (line.gap) y -= line.gap;
    }
    return pages;
  }

  /**
   * Write a PDF whose pages are JPEG pictures or simple text.
   * pages: [{ jpeg, width, height } | { text: [{ x, y, text, size, bold, url, color }] }]
   * Picture pages are letter size, turned to match the picture, with the picture as large as fits.
   */
  function writePdf(pages, { title = 'Eagle Scout service project submission copy' } = {}) {
    const enc = new TextEncoder();
    const chunks = [];
    let length = 0;
    const offsets = [];
    const push = (part) => { const b = typeof part === 'string' ? latin1(part) : part; chunks.push(b); length += b.length; };
    const latin1 = (s) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff; return b; };
    let next = 1;
    const alloc = () => next++;
    const obj = (id, body, stream) => {
      offsets[id] = length;
      push(`${id} 0 obj\n`);
      if (stream) { push(`${body.replace(/>>$/, '')}/Length ${stream.length}>>\nstream\n`); push(stream); push('\nendstream'); }
      else push(body);
      push('\nendobj\n');
    };
    void enc;
    const catalog = alloc(), pagesId = alloc(), font = alloc(), bold = alloc(), info = alloc();
    push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    const kids = [];
    for (let page of pages) {
      const pageId = alloc(), contentId = alloc();
      kids.push(pageId);
      if (page.jpeg) {
        const imgId = alloc();
        const info = jpegInfo(page.jpeg);
        if (!info) throw new Error('A picture in this file is damaged. Remove it and add it again.');
        page = { ...page, width: info.width, height: info.height };
        const landscape = page.width > page.height;
        const W = page.pageWidth || (landscape ? 792 : 612), H = page.pageHeight || (landscape ? 612 : 792);
        const s = Math.min(W / page.width, H / page.height);
        const w = page.width * s, h = page.height * s;
        const x = (W - w) / 2, y = (H - h) / 2;
        const color = info.components === 1 ? '/ColorSpace/DeviceGray' : info.components === 4 ? '/ColorSpace/DeviceCMYK/Decode[1 0 1 0 1 0 1 0]' : '/ColorSpace/DeviceRGB';
        obj(imgId, `<</Type/XObject/Subtype/Image/Width ${page.width}/Height ${page.height}${color}/BitsPerComponent 8/Filter/DCTDecode>>`, page.jpeg);
        const content = latin1(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`);
        obj(contentId, '<<>>', content);
        obj(pageId, `<</Type/Page/Parent ${pagesId} 0 R/MediaBox[0 0 ${W} ${H}]/Resources<</XObject<</Im0 ${imgId} 0 R>>>>/Contents ${contentId} 0 R>>`);
      } else {
        let ops = '';
        const annots = [];
        for (const t of page.text || []) {
          const c = t.color || [0, 0, 0];
          ops += `BT ${c.map((v) => v.toFixed(3)).join(' ')} rg /${t.bold ? 'F2' : 'F1'} ${t.size} Tf ${t.x.toFixed(2)} ${t.y.toFixed(2)} Td ${pdfString(t.text)} Tj ET\n`;
          if (t.url) {
            const annot = alloc();
            const w = width(t.text, t.size, t.bold);
            annots.push(annot);
            obj(annot, `<</Type/Annot/Subtype/Link/Rect[${t.x.toFixed(2)} ${(t.y - 2).toFixed(2)} ${(t.x + w).toFixed(2)} ${(t.y + t.size).toFixed(2)}]/Border[0 0 0]/A<</S/URI/URI${pdfString(t.url)}>>>>`);
          }
        }
        obj(contentId, '<<>>', latin1(ops));
        obj(pageId, `<</Type/Page/Parent ${pagesId} 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 ${font} 0 R/F2 ${bold} 0 R>>>>/Contents ${contentId} 0 R${annots.length ? `/Annots[${annots.map((a) => `${a} 0 R`).join(' ')}]` : ''}>>`);
      }
    }
    obj(font, '<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>');
    obj(bold, '<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>');
    obj(info, `<</Title${pdfString(title)}/Producer(EaglePaperworkHelper)>>`);
    obj(pagesId, `<</Type/Pages/Kids[${kids.map((k) => `${k} 0 R`).join(' ')}]/Count ${kids.length}>>`);
    obj(catalog, `<</Type/Catalog/Pages ${pagesId} 0 R>>`);
    const xref = length;
    let table = `xref\n0 ${next}\n0000000000 65535 f \n`;
    for (let i = 1; i < next; i++) table += `${String(offsets[i] || 0).padStart(10, '0')} 00000 n \n`;
    push(table);
    push(`trailer\n<</Size ${next}/Root ${catalog} 0 R/Info ${info} 0 R>>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(length);
    let at = 0;
    for (const c of chunks) { out.set(c, at); at += c.length; }
    return out;
  }

  /** Which attachment pages have no picture available, by label. */
  function missingPictures(data) {
    const missing = [];
    for (const a of data.attachments || []) for (const p of a.pages || []) if (!pictureFor(p)) missing.push(labelOf(a));
    return [...new Set(missing)];
  }

  /**
   * Make the submission copy.
   * filledBytes: the filled official workbook. drawPage(n) resolves to { jpeg, width, height } for workbook page n
   * (the browser draws it with pdf.js; tests pass stand-ins). onProgress(message) reports progress.
   */
  async function buildSubmission({ data, drawPage, today, onProgress = () => {} }) {
    sanitize(data);
    let indexCount = 1;
    let order, laid;
    for (let tries = 0; tries < 3; tries++) {
      order = planPages(data, indexCount);
      laid = layoutIndex(indexLines(data, order, today));
      if (laid.length === indexCount) break;
      indexCount = laid.length;
    }
    const pages = [];
    let drawn = 0;
    for (const o of order) {
      if (o.kind === 'workbook') {
        onProgress(`Drawing workbook page ${++drawn} of ${WORKBOOK_PAGES}…`);
        const p = await drawPage(o.n);
        pages.push({ jpeg: p.jpeg, width: p.width, height: p.height, pageWidth: 612, pageHeight: 792 });
      } else if (o.kind === 'index') {
        pages.push({ text: laid[o.n] || [] });
      } else {
        const bytes = pictureFor(o.page);
        if (!bytes) throw new Error(`The picture for “${labelOf(o.attachment)}” isn’t in this backup file or this browser. Add it again in the workbook page.`);
        pages.push({ jpeg: bytes, width: o.page.width, height: o.page.height });
      }
    }
    onProgress('Putting the file together…');
    return { bytes: writePdf(pages), pageCount: pages.length, order };
  }

  /** Draw each page of the filled workbook as a JPEG, for buildSubmission. Browser only. */
  async function workbookDrawer(pdfjsLib, filledBytes) {
    const doc = await pdfjsLib.getDocument({ data: filledBytes, verbosity: 0, isEvalSupported: false }).promise;
    if (doc.numPages !== WORKBOOK_PAGES) { await doc.destroy(); throw new Error(`The filled workbook has ${doc.numPages} pages, not ${WORKBOOK_PAGES}.`); }
    return {
      drawPage: async (n) => {
        const canvas = await renderPdfPage(pdfjsLib, doc, n, PAGE_DPI / 72);
        return { jpeg: await canvasToJpeg(canvas), width: canvas.width, height: canvas.height };
      },
      close: () => doc.destroy()
    };
  }

  return {
    SLOTS, WORKBOOK_PAGES, MAX_PAGES, MAX_LINKS, DRAFT_KEYS,
    newId, cleanUrl, sanitize, pagesOf, slotFor, labelOf, toBase64, fromBase64, isJpeg,
    jpegInfo, stripJpeg, ready, persistent, putPicture, forgetUnused, sweep, clearAll, absorb, pictureFor, withPictures, backupBytes, missingPictures,
    pagesFromFile, loadPdfjs, planPages, indexLines, layoutIndex, wrap, writePdf, buildSubmission, workbookDrawer
  };
});
