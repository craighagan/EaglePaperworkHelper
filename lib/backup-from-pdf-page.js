/* EaglePaperworkHelper: the page logic for BackupFromPDF.html (filled workbook PDF -> backup file). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const MAX_PDF_BYTES = 50 * 1024 * 1024;
  const state = { pdfBytes: null, data: null };

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) node.append(c);
    return node;
  }
  function setStatus(id, message, kind) { const n = $(id); n.textContent = message; n.className = 'status' + (kind ? ' ' + kind : ''); }
  function busy(on) {
    document.querySelectorAll('button, input').forEach((n) => { n.disabled = on; });
  }

  if (!window.EagleOfficialPdf || !window.EagleWorkbook || !window.pdfjsLib || !window.pdfjsWorker) {
    setStatus('read-status', 'This page is missing its helper files. Keep BackupFromPDF.html in the same folder as the “lib” and “vendor” folders it came with. If you downloaded a ZIP file, unzip (extract) it first.', 'error');
    document.querySelectorAll('input,button').forEach((n) => { n.disabled = true; });
    return;
  }
  const lib = window.EagleOfficialPdf;
  const W = window.EagleWorkbook;

  async function readBytes(file) {
    if (file.size > MAX_PDF_BYTES) throw new Error(`“${file.name}” is too large to be an Eagle workbook PDF.`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const head = String.fromCharCode(...bytes.subarray(0, Math.min(1024, bytes.length)));
    if (!head.includes('%PDF-')) throw new Error(`“${file.name}” is not a PDF file.`);
    return bytes;
  }

  async function read() {
    busy(true);
    $('result').hidden = true;
    setStatus('read-status', 'Reading your answers… this takes a few seconds.');
    try {
      const { data, report } = await lib.readBackupFromPdf({ pdfjsLib: window.pdfjsLib, pdfBytes: state.pdfBytes.slice(), defaults: W.defaults });
      state.data = data;
      setStatus('read-status', `Found ${report.read} ${report.read === 1 ? 'answer' : 'answers'}.`, 'ok');
      showResult(report);
    } catch (error) {
      console.error(error);
      setStatus('read-status', error && error.message ? error.message : 'Something went wrong while reading the PDF.', 'error');
    } finally {
      busy(false);
    }
  }

  function showResult(report) {
    const list = report.warnings.map((w) => el('li', null, w));
    $('warnings').replaceChildren(...(list.length ? [el('p', null, 'Check these:'), el('ul', null, list)] : [el('p', null, 'No problems found. Still read through every page of the workbook.')]));
    $('result').hidden = false;
  }

  $('pdf-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    state.pdfBytes = null;
    state.data = null;
    $('result').hidden = true;
    if (!file) return;
    try {
      state.pdfBytes = await readBytes(file);
      $('pdf-chosen').textContent = `Chosen: “${file.name}”`;
      await read();
    } catch (error) {
      setStatus('read-status', error.message, 'error');
    }
  });

  $('save-backup').addEventListener('click', () => {
    const d = new Date();
    const two = (n) => String(n).padStart(2, '0');
    const name = `Eagle-workbook-backup-${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' }));
    const a = el('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setStatus('save-status', `Saved “${name}”, usually in your Downloads folder. In a workbook page, click “Open backup file” and choose it.`, 'ok');
  });

  // Put the answers straight into a workbook page's saved draft (same browser), after confirming.
  // A PDF can't hold signed pages or links, so the draft's own are kept, unless the PDF is for a different name.
  const sameName = (a, b) => !lib.str(a) || !lib.str(b) || lib.str(a).toLowerCase().replace(/\s+/g, ' ') === lib.str(b).toLowerCase().replace(/\s+/g, ' ');
  for (const [id, key, page] of [['open-guided', 'eagle_workbook_guided_v1', 'EagleWorkbook-guided.html'], ['open-classic', 'eagle_workbook_v1', 'EagleWorkbook.html']]) {
    $(id).addEventListener('click', async () => {
      let existing = null;
      try { existing = JSON.parse(localStorage.getItem(key) || 'null'); } catch { existing = null; }
      const here = W.looksLikeWorkbook(existing);
      const extras = here ? (Array.isArray(existing.attachments) ? existing.attachments.length : 0) + (Array.isArray(existing.links) ? existing.links.filter((l) => l && String(l.url || '').trim()).length : 0) : 0;
      if (here && !window.confirm('That workbook page already has a draft saved in this browser. Replace it with the answers from this PDF?\n\nSave a backup file of the old draft first if you want to keep it.' + (extras ? '\n\nIts signed pages and links will stay, because a PDF can’t hold them.' : ''))) return;
      let keep = Boolean(extras);
      if (extras && !sameName(existing.candidate && existing.candidate.name, state.data.candidate && state.data.candidate.name)
        && !window.confirm('The name on this PDF is different from the name in that workbook page’s draft, so its signed pages and links may belong to someone else.\n\nOK keeps them. Cancel removes them from the draft.')) keep = false;
      try {
        const merged = { ...state.data };
        if (keep) {
          if (Array.isArray(existing.attachments) && existing.attachments.length) merged.attachments = existing.attachments;
          if (Array.isArray(existing.links) && existing.links.length) merged.links = existing.links;
        }
        localStorage.setItem(key, JSON.stringify(merged));
        localStorage.setItem(`${key}_saved`, String(Date.now()));
      } catch {
        setStatus('save-status', 'This browser would not save the draft. Click “Save backup file” instead, then open it in the workbook page.', 'error');
        return;
      }
      // Scanned pictures no draft uses any more (when they were dropped) shouldn't stay hidden in this browser.
      if (window.EagleAttachments) { try { await window.EagleAttachments.sweep(); } catch { /* storage blocked */ } }
      window.location.href = page;
    });
  }
})();
