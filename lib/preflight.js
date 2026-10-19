/*
 * EaglePaperworkHelper: "heads-up" checks that run before the official PDF is made.
 * Pure functions: no page, no storage, no clock. Works in a browser (window.EaglePreflight) and in Node (module.exports).
 *
 * Rules (see AGENTS.md and todo/ideas-backlog.md):
 *  - Only plain arithmetic the workbook itself relies on: a box's own end date before its own start date, and the
 *    cost-list rows the PDF filler already cannot add up. Never compare dates across sections: the workbook sets no order.
 *  - Never flag a blank. Never judge what is required. Never score, rank, or say "approved" or "ready".
 *  - Every note ends by sending the Scout to their coach. A test enforces the wording.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EaglePreflight = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ASK = 'Not sure? Ask your coach.';
  const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

  /* Each pair is one start box and one end box that belong together. */
  const DATE_PAIRS = [
    { label: 'Proposal', start: 'proposal.startDate', end: 'proposal.endDate' },
    { label: 'Project plan', start: 'plan.startDate', end: 'plan.endDate' },
    { label: 'Final report (planned)', start: 'report.startDate', end: 'report.endDate' },
    { label: 'Final report (actual)', start: 'report.actualStart', end: 'report.actualEnd' }
  ];

  const getPath = (data, path) => path.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), data);

  /** True only for a real calendar date written as YYYY-MM-DD (what the date pickers save). */
  function isRealDate(value) {
    const m = ISO.exec(String(value || '').trim());
    if (!m) return false;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
  }

  function endBeforeStart(start, end) {
    return isRealDate(start) && isRealDate(end) && String(end).trim() < String(start).trim();
  }

  /**
   * data: a workbook backup. lib: window.EagleOfficialPdf (for date and money formatting and the cost tables).
   * Returns an array of strings. An empty array means nothing looked unusual, which is not an approval.
   */
  function check(data, lib) {
    const notes = [];
    if (!data || typeof data !== 'object') return notes;
    const show = (v) => (lib && lib.formatDate ? lib.formatDate(String(v).trim()) : String(v).trim());

    const shaped = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '').trim());
    for (const pair of DATE_PAIRS) {
      const start = getPath(data, pair.start), end = getPath(data, pair.end);
      for (const v of [start, end]) if (shaped(v) && !isRealDate(v)) notes.push(`${pair.label}: “${String(v).trim()}” is not a real date. ${ASK}`);
      if (endBeforeStart(start, end)) notes.push(`${pair.label}: the end date (${show(end)}) is before the start date (${show(start)}). ${ASK}`);
    }
    for (const listPath of ['proposal.phases', 'plan.phases']) {
      const rows = getPath(data, listPath);
      (Array.isArray(rows) ? rows : []).forEach((row, i) => {
        if (row && endBeforeStart(row.start, row.end)) notes.push(`${listPath === 'plan.phases' ? 'Project plan' : 'Proposal'}, phase ${i + 1}: the end date (${show(row.end)}) is before the start date (${show(row.start)}). ${ASK}`);
      });
    }
    if (lib && lib.COST_TABLES && lib.listTotal) {
      for (const table of lib.COST_TABLES) {
        for (const note of lib.listTotal(getPath(data, table.path), table.label, table.limit).notes) notes.push(`${note} ${ASK}`);
      }
    }
    return notes;
  }

  return { check, isRealDate, endBeforeStart, ASK };
});
