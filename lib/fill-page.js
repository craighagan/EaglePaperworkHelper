/* EaglePaperworkHelper: the page logic for FillOfficialPDF.html. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const statusEl = $('status');
  const reportEl = $('report');
  const createBtn = $('create');
  const state = { pdfBytes: null, data: null, titleFromBackup: '', busy: false, lastUrl: null };
  const DRAFTS = [['eagle_workbook_guided_v1', 'Guided workbook'], ['eagle_workbook_v1', 'Classic workbook']];
  const MAX_JSON_BYTES = 5 * 1024 * 1024;
  const MAX_PDF_BYTES = 50 * 1024 * 1024;

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) node.append(c);
    return node;
  }
  function setStatus(message, kind, link) {
    statusEl.replaceChildren(message);
    if (link) statusEl.append(' ', el('a', { href: link, target: '_blank', rel: 'noopener noreferrer' }, 'Download the official PDF ↗'));
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
  }
  function setChosen(node, message, ok) { node.textContent = message; node.className = 'chosen' + (ok ? ' ok' : ''); }
  function refresh() {
    createBtn.disabled = state.busy || !(state.pdfBytes && state.data);
    for (const id of ['pdf-file', 'json-file', 'fetch-pdf', 'skip-names', 'project-name']) { const n = $(id); if (n) n.disabled = state.busy; }
    document.querySelectorAll('.use-draft').forEach((b) => { b.disabled = state.busy; });
  }
  function clearResult() { reportEl.hidden = true; setStatus(''); }

  // The page was moved away from its folders, or a script was blocked.
  if (!window.EagleOfficialPdf || !window.pdfjsLib || !window.pdfjsWorker) {
    setStatus('This page is missing its helper files. Keep FillOfficialPDF.html in the same folder as the “lib” and “vendor” folders it came with. If you downloaded a ZIP file, unzip (extract) it first, then open this page from the unzipped folder.', 'error');
    document.querySelectorAll('input,button').forEach((n) => { n.disabled = true; });
    return;
  }
  const lib = window.EagleOfficialPdf;
  $('official-link').href = lib.OFFICIAL_PDF_URL;
  document.querySelectorAll('.official-href').forEach((a) => { a.href = lib.OFFICIAL_PDF_URL; });

  const looksLikeWorkbook = (d) => Boolean(d && typeof d === 'object' && !Array.isArray(d) && d.candidate && typeof d.candidate === 'object' && d.proposal && typeof d.proposal === 'object');

  function useData(data, label) {
    if (!looksLikeWorkbook(data)) throw new Error('This file is not an Eagle workbook backup file. In a workbook page, click “Save backup file,” then choose the file it saves (it ends in .json).');
    state.data = data;
    setChosen($('json-chosen'), `Using ${label}.`, true);
    const title = lib.str(data.proposal.projectName);
    const box = $('project-name');
    // Replace the title unless the Scout typed a different one here.
    if (!box.value.trim() || box.value.trim() === state.titleFromBackup) box.value = title;
    state.titleFromBackup = title;
    clearResult();
    refresh();
  }

  /** Check the chosen PDF right away, so a wrong file is reported in Step 1, not at the end. */
  async function usePdf(bytes, label) {
    const head = String.fromCharCode(...bytes.subarray(0, Math.min(1024, bytes.length)));
    if (!head.includes('%PDF-')) throw new Error(`${label} is not a PDF file. Choose the workbook PDF from Step 1.`);
    setChosen($('pdf-chosen'), `Checking ${label}…`, false);
    const check = await lib.checkWorkbookPdf(window.pdfjsLib, bytes.slice());
    if (!check.ok) throw new Error(check.message);
    state.pdfBytes = bytes;
    setChosen($('pdf-chosen'), `Using ${label}. It is the official workbook No. ${lib.WORKBOOK_VERSION}.`, true);
    clearResult();
    refresh();
  }

  $('pdf-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    state.pdfBytes = null;
    refresh();
    if (!file) return;
    try {
      if (file.size > MAX_PDF_BYTES) throw new Error(`“${file.name}” is too large to be the workbook PDF.`);
      await usePdf(new Uint8Array(await file.arrayBuffer()), `“${file.name}”`);
    } catch (error) {
      setChosen($('pdf-chosen'), error.message, false);
    }
  });

  $('fetch-pdf').addEventListener('click', async () => {
    state.busy = true;
    refresh();
    setChosen($('pdf-chosen'), 'Getting the official PDF from scouting.org…', false);
    try {
      const response = await fetch(lib.OFFICIAL_PDF_URL, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
      if (!response.ok) throw new Error(`scouting.org answered ${response.status}`);
      if (Number(response.headers.get('content-length')) > MAX_PDF_BYTES) throw new Error('the download was too large');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > MAX_PDF_BYTES) throw new Error('the download was too large');
      await usePdf(bytes, 'the official PDF from scouting.org');
    } catch (error) {
      setChosen($('pdf-chosen'), 'Couldn’t get the PDF automatically. Use the “Download the official PDF” link below, then click “I already have it: choose the PDF file.”', false);
    } finally {
      state.busy = false;
      refresh();
    }
  });

  $('json-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    state.data = null;
    refresh();
    if (!file) return;
    try {
      if (file.size > MAX_JSON_BYTES) throw new Error(`“${file.name}” is too large to be a workbook backup file.`);
      let parsed;
      try { parsed = JSON.parse(await file.text()); } catch { throw new Error(`“${file.name}” could not be read. Choose the backup file saved with “Save backup file” (it ends in .json).`); }
      useData(parsed, `the backup file “${file.name}”`);
    } catch (error) {
      setChosen($('json-chosen'), error.message, false);
    }
  });

  // Drafts saved in this browser. Chrome and Edge share them between pages opened from the same computer;
  // pages from the same website always share them. The newest is listed first. Names are not shown,
  // because someone else may have used this computer.
  const drafts = [];
  for (const [key, label] of DRAFTS) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || 'null');
      if (looksLikeWorkbook(data)) drafts.push({ key, label, data, saved: Number(localStorage.getItem(`${key}_saved`)) || 0 });
    } catch { /* unreadable or blocked storage: skip */ }
  }
  drafts.sort((a, b) => b.saved - a.saved);
  const draftBox = $('drafts');
  for (const d of drafts) {
    const when = d.saved ? new Date(d.saved).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'date unknown';
    const button = el('button', { type: 'button', class: 'btn secondary use-draft' }, `Use the draft saved in the ${d.label} (last changed ${when})`);
    button.addEventListener('click', () => {
      try { useData(JSON.parse(localStorage.getItem(d.key) || 'null'), `the draft saved in the ${d.label}`); }
      catch (error) { setChosen($('json-chosen'), error.message, false); }
    });
    draftBox.append(button);
  }
  draftBox.hidden = drafts.length === 0;

  $('project-name').addEventListener('input', clearResult);
  $('skip-names').addEventListener('change', clearResult);

  function fileName() {
    const base = lib.str($('project-name').value).normalize('NFKD').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return `${base || 'Eagle-Project'}-Workbook-filled.pdf`;
  }

  function download(bytes, name) {
    if (state.lastUrl) URL.revokeObjectURL(state.lastUrl);
    state.lastUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = el('a', { href: state.lastUrl, download: name });
    document.body.append(link);
    link.click();
    link.remove();
  }

  createBtn.addEventListener('click', async () => {
    state.busy = true;
    refresh();
    reportEl.hidden = true;
    setStatus('Filling in the workbook… this takes a few seconds.');
    try {
      const { bytes, report } = await lib.fillOfficialPdf({
        pdfjsLib: window.pdfjsLib, pdfBytes: state.pdfBytes.slice(), data: state.data,
        projectName: $('project-name').value, skipApprovalNames: $('skip-names').checked
      });
      const name = fileName();
      download(bytes, name);
      setStatus(`Done. Your browser saved “${name}”, usually in your Downloads folder.`, 'ok');
      showReport(report, name);
    } catch (error) {
      console.error(error);
      const message = error && error.message ? error.message : 'Something went wrong while filling the PDF.';
      setStatus(message, 'error', /not the official/i.test(message) ? lib.OFFICIAL_PDF_URL : null);
    } finally {
      state.busy = false;
      refresh();
    }
  });

  function showReport(report, name) {
    const items = report.warnings.map((w) => el('li', null, w));
    reportEl.replaceChildren(
      el('h3', null, `Filled ${report.filled} answers.`),
      items.length ? el('p', null, 'Check these before you share the PDF:') : el('p', null, 'No problems found.'),
      items.length ? el('ul', null, items) : null,
      el('p', null, 'Next steps:'),
      el('ol', { class: 'next' },
        el('li', null, 'Open the PDF (in Preview, Adobe Acrobat Reader, or your web browser) and read every page.'),
        el('li', null, 'To fix something, change it in the workbook page, save a new backup file, and fill the PDF again. That keeps your workbook as the main copy. Changes typed only into the PDF are lost the next time you fill it.'),
        el('li', null, 'Add photos and any extra pages as separate attachments.'),
        el('li', null, 'Get the required signatures and dates. This tool never fills them in.')),
      el('a', { href: state.lastUrl, download: name }, `Download “${name}” again`));
    reportEl.hidden = false;
  }

  refresh();
})();
