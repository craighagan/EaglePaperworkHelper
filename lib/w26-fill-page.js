/* EaglePaperworkHelper: the page logic for FillOfficialPDF2026.html. Needs pdf.js (vendor/pdfjs), lib/official-pdf.js,
 * lib/w26-model.js and lib/w26-pdf.js. Nothing here is sent anywhere; the only network request is the optional
 * download of the official PDFs, pinned by the page's connect-src. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const statusEl = $('status');
  const reportEl = $('report');
  const state = { pdf: null, pdfKind: null, appd: null, data: null, busy: false };
  const MAX_JSON_BYTES = 80 * 1024 * 1024;

  const DRAFTS = [['eagle_workbook2026_guided_v1', 'Guided 2026 workbook'], ['eagle_workbook2026_v1', 'Classic 2026 workbook']];
  const S1B = 'This backup file is for the 2023 workbook (No. 2023a). Open it in the 2023 workbook from the home page. Answers don’t move to the 2026 workbook by themselves, because its questions are different.';
  const DOWNLOAD_FAILED = 'The official PDF could not be downloaded from scouting.org. Check your internet connection, or download it yourself and choose the file in this step.';
  const WRONG_FOR_APPD = 'This is the workbook, not Appendix D. Choose the Appendix D file in this step.';
  const APPD_NOT_WORKBOOK = 'This is Appendix D (the Fundraising Application), not the workbook. Choose it in the Appendix D step below.';
  const DRAFT_NOTE = 'Your answers are kept in this browser until you erase them.';

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) node.append(c);
    return node;
  }
  function setStatus(message, kind) {
    statusEl.textContent = message || '';
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
  }
  /** ok: green. Otherwise plain text, or red when the message starts with “!”. */
  function setChosen(node, message, ok) {
    const warn = !ok && /^!/.test(message);
    node.textContent = warn ? message.slice(1) : message;
    node.className = 'chosen' + (ok ? ' ok' : warn ? ' err' : '');
    if (ok || warn) node.scrollIntoView({ block: 'nearest' });
  }
  function refresh() {
    $('create').disabled = state.busy || !(state.pdf && state.data);
    $('create-appd').disabled = state.busy || !(state.appd && state.data);
    $('create-hint').textContent = $('create').disabled && !state.busy ? 'To turn this on, finish Step 1 (the official PDF) and Step 2 (your answers).' : '';
    $('create-appd-hint').textContent = $('create-appd').disabled && !state.busy ? 'To turn this on, finish Step 2 (your answers) and choose Appendix D in this step.' : '';
    for (const id of ['pdf-file', 'appd-file', 'fetch-pdf', 'fetch-appd', 'open-backup', 'skip-names']) { const n = $(id); if (n) n.disabled = state.busy; }
    document.querySelectorAll('.use-draft').forEach((b) => { b.disabled = state.busy; });
  }
  const slug = (name) => (String(name || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'Eagle-project');

  function download(bytes, name) {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = el('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function showReport(lines, title) {
    reportEl.hidden = false;
    reportEl.replaceChildren(el('h2', null, title), ...lines.map((x) => el('p', null, x)));
  }

  /* ----- Step 1 and Step 4: the PDFs ----- */

  async function readPdf(file) {
    if (!file) return null;
    if (file.size > window.EagleW26Pdf.MAX_PDF_BYTES) throw new Error('This file is too large to be the official workbook. Download the official workbook again and choose that file.');
    return new Uint8Array(await file.arrayBuffer());
  }

  async function useWorkbookBytes(bytes, label) {
    const check = await window.EagleW26Pdf.checkPdf(window.pdfjsLib, bytes.slice());
    if (!check.ok || check.kind === 'appendixD') {
      state.pdf = null; state.pdfKind = null;   // a rejected file must not leave an earlier one selected
      setChosen($('pdf-chosen'), '!' + (check.ok ? APPD_NOT_WORKBOOK : check.message), false);
      refresh();
      return;
    }
    state.pdf = bytes;
    state.pdfKind = check.kind;
    setChosen($('pdf-chosen'), `Using ${label}.`, true);
    refresh();
  }

  async function useAppdBytes(bytes, label) {
    const check = await window.EagleW26Pdf.checkPdf(window.pdfjsLib, bytes.slice());
    if (!check.ok || check.kind !== 'appendixD') {
      state.appd = null;
      setChosen($('appd-chosen'), '!' + (check.ok ? WRONG_FOR_APPD : check.message), false);
      refresh();
      return;
    }
    state.appd = bytes;
    setChosen($('appd-chosen'), `Using ${label}.`, true);
    refresh();
  }

  async function fetchPdf(url, onBytes, chosenNode) {
    setStatus('Downloading the official PDF from scouting.org…');
    try {
      const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const declared = Number(response.headers.get('content-length'));
      if (declared > window.EagleW26Pdf.MAX_PDF_BYTES) throw new Error('too large');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > window.EagleW26Pdf.MAX_PDF_BYTES) throw new Error('too large');
      await onBytes(bytes, 'the official PDF from scouting.org');
      setStatus('');
    } catch (error) {
      setChosen(chosenNode, '!' + DOWNLOAD_FAILED, false);
      setStatus('');
    }
  }

  /* ----- Step 2: the answers ----- */

  function useData(data, label) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || !data.candidate || !data.proposal) throw new Error('This file is not an Eagle workbook backup file. In a workbook page, click “Save backup file,” then choose the file it saves (it ends in .json).');
    if (data.edition !== '2026') throw new Error(S1B);
    state.data = data;
    setChosen($('json-chosen'), `Using ${label}.`, true);
    refresh();
  }

  function showDrafts() {
    const box = $('drafts');
    box.replaceChildren();
    for (const [key, label] of DRAFTS) {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(key) || 'null'); } catch { data = null; }
      if (!data || data.edition !== '2026') continue;
      box.append(el('p', null, el('button', { type: 'button', class: 'btn btn-next use-draft', 'data-key': key, 'data-label': label }, `Use the draft saved in the ${label}`)));
    }
    if (!box.children.length) box.append(el('p', { class: 'help' }, 'No draft from the 2026 workbook is saved in this browser. Choose a backup file below, or fill in the Classic 2026 workbook first.'));
    box.append(el('p', { class: 'help' }, DRAFT_NOTE));
  }

  /* ----- Making the files ----- */

  async function makeWorkbook() {
    state.busy = true; refresh(); setStatus('Filling the workbook…');
    try {
      const out = await window.EagleW26Pdf.fillWorkbook({ pdfjsLib: window.pdfjsLib, pdfBytes: state.pdf.slice(), data: state.data, skipApprovalNames: $('skip-names').checked });
      const name = `${slug(state.data.proposal.projectName)}-2026-Workbook-filled.pdf`;
      download(out.bytes, name);
      showReport([`Filled ${out.report.filled} answers. The file is ${name}.`, 'Next: find the file in your Downloads folder (or where your browser saves files). Open it in a PDF program that shows the boxes you typed in. Print the pages that need signatures. The workbook says adults may sign on paper, or electronically if your council accepts it. Ask your Scoutmaster or coach how the adults will sign.', ...out.report.warnings], 'Your filled workbook');
      setStatus('Done. Check the messages below.', 'ok');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally { state.busy = false; refresh(); }
  }

  async function makeAppd() {
    state.busy = true; refresh(); setStatus('Filling Appendix D…');
    try {
      const out = await window.EagleW26Pdf.fillAppendixD({ pdfjsLib: window.pdfjsLib, pdfBytes: state.appd.slice(), data: state.data });
      const name = `${slug(state.data.proposal.projectName)}-2026-Appendix-D-filled.pdf`;
      download(out.bytes, name);
      showReport([`Filled ${out.report.filled} answers. The file is ${name}.`, ...out.report.warnings], 'Your filled Appendix D');
      setStatus('Done. Check the messages below.', 'ok');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally { state.busy = false; refresh(); }
  }

  /* ----- wiring ----- */

  if (!window.EagleW26Pdf || !window.EagleW26 || !window.pdfjsLib || !window.pdfjsWorker) {
    setStatus('This page is missing its helper files. Keep FillOfficialPDF2026.html in the same folder as the “lib” and “vendor” folders it came with. If you downloaded a ZIP file, unzip (extract) it first.', 'error');
    document.querySelectorAll('input,button').forEach((n) => { n.disabled = true; });
    return;
  }

  $('fetch-pdf').addEventListener('click', () => fetchPdf(window.EagleW26.OFFICIAL_URL, (bytes, label) => useWorkbookBytes(bytes, label), $('pdf-chosen')));
  $('fetch-appd').addEventListener('click', () => fetchPdf(window.EagleW26.APPENDIX_D_URL, (bytes, label) => useAppdBytes(bytes, label), $('appd-chosen')));
  $('pdf-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { await useWorkbookBytes(await readPdf(file), file.name); } catch (error) { setChosen($('pdf-chosen'), '!' + error.message, false); }
  });
  $('appd-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { await useAppdBytes(await readPdf(file), file.name); } catch (error) { setChosen($('appd-chosen'), '!' + error.message, false); }
  });
  $('open-backup').addEventListener('click', () => $('json-file').click());
  $('json-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > MAX_JSON_BYTES) throw new Error('This file is too large to be a workbook backup file.');
      let data;
      try { data = JSON.parse(await file.text()); } catch { throw new Error('This file could not be read. Choose a backup file saved with “Save backup file” (it ends in .json).'); }
      useData(data, `the backup file “${file.name}”`);
    } catch (error) { setChosen($('json-chosen'), '!' + error.message, false); }
  });
  $('drafts').addEventListener('click', (e) => {
    const b = e.target.closest('.use-draft');
    if (!b) return;
    try { useData(JSON.parse(localStorage.getItem(b.dataset.key) || 'null'), `the draft saved in the ${b.dataset.label}`); }
    catch (error) { setChosen($('json-chosen'), '!' + error.message, false); }
  });
  $('create').addEventListener('click', makeWorkbook);
  $('create-appd').addEventListener('click', makeAppd);

  showDrafts();
  refresh();
})();
