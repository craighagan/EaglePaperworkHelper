/*
 * EaglePaperworkHelper: "Your path". The steps from "I picked a project" to "my workbook pages are signed",
 * worked out from the draft. Pure functions: no page, no storage, no clock.
 * Works in a browser (window.EagleJourney) and in Node (module.exports).
 *
 * Rules (see AGENTS.md and todo/ideas-backlog.md):
 *  - Boxes you fill in are reported as "filled in". Steps only you can know ("signatures collected") are the Scout's
 *    own notes, saved in the draft under `journey`. A scan of a signed page is a scan: this never says a page is
 *    correct, signed properly, or approved.
 *  - `journey` is never copied into the official PDF. It lives in the draft and the backup file only.
 *  - The only requirement quoted is the workbook's own sentence in REMINDER. Nothing else here is a rule.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EagleJourney = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** The workbook's own sentence (Proposal Page A, "Meeting the Five Tests" page), kept the same in meaning. */
  const REMINDER = 'The workbook says not to begin any work, raise any money, or get any materials until your project proposal has been approved. (Proposal Page A)';

  /* The "key boxes" for each part. The Guided workbook's stage cards ("N of M basics done") read these same lists,
     so the two counts always agree. Change them here only. */
  const PATHS = {
    proposal: ['proposal.projectName', 'proposal.description', 'proposal.whyNeeded', 'proposal.helperCount', 'proposal.materials', 'proposal.safety'],
    plan: ['plan.startDate', 'plan.presentCondition', 'plan.workProcesses', 'plan.firstAid', 'plan.contingency'],
    report: ['report.actualStart', 'report.actualEnd', 'report.description', 'report.leadership']
  };

  /* Steps only the Scout can know. The Scout ticks them; they are saved as journey.steps.<id>.done = '1'. */
  const CHECK_IDS = ['propSigned', 'fund', 'work', 'repSigned', 'rest'];

  const getPath = (data, path) => path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), data);
  const filled = (data, path) => String(getPath(data, path) === undefined || getPath(data, path) === null ? '' : getPath(data, path)).trim() !== '';

  function fillState(data, paths) {
    const n = paths.filter((p) => filled(data, p)).length;
    return { n, total: paths.length, state: n === 0 ? 'todo' : n === paths.length ? 'done' : 'doing' };
  }

  /**
   * data: a workbook draft. A: window.EagleAttachments (for SLOTS and pagesOf), optional.
   * Returns { steps, next }. Each step: { id, title, kind: 'fill' | 'check', state: 'todo' | 'doing' | 'done', detail, next }.
   * next is the first step that is not done, or null.
   */
  function journeySteps(data, A, tabs) {
    const tab = Object.assign({ proposal: 'Proposal', plan: 'Project Plan', report: 'Project Report', signed: 'Signed Pages' }, tabs || {});
    const d = data && typeof data === 'object' ? data : {};
    const journey = d.journey && typeof d.journey === 'object' ? d.journey : {};
    const noted = (id) => Boolean(journey.steps && journey.steps[id] && journey.steps[id].done === '1');
    const slot = (place) => (A && A.SLOTS ? A.SLOTS.find((s) => s.place === place) : null);
    const scanned = (place) => Array.isArray(d.attachments) && d.attachments.some((a) => a && a.place === place && Array.isArray(a.pages) && a.pages.length > 0);
    const scanText = (place) => (scanned(place) ? 'A scan is added for this page.' : `No scan added yet. You only need a photo or scan if you make a package to hand in. Add it on the “${tab.signed}” tab.`);
    const whoText = (place) => { const s = slot(place); return s ? `Signatures on ${s.label.replace(/^Signed /, '')}: ${s.who.charAt(0).toLowerCase()}${s.who.slice(1)}.` : ''; };

    const steps = [];
    const fill = (id, title, paths, next) => {
      const f = fillState(d, paths);
      steps.push({ id, title, kind: 'fill', state: f.state, detail: `${f.n} of ${f.total} key boxes filled in.`, next });
    };
    const check = (id, title, detail, next) => steps.push({ id, title, kind: 'check', state: noted(id) ? 'done' : 'todo', detail, next });

    fill('proposal', 'Fill in your Proposal', PATHS.proposal, `Fill in the “${tab.proposal}” tab.`);
    check('propSigned', 'Get your Proposal signed', `${whoText('proposalH')} ${scanText('proposalH')}`.trim(), 'Sign your promise first, then ask the others to sign Proposal Page H.');
    if (journey.raising === 'yes') check('fund', 'Get the Fundraising Application signed, if you need one', `Not needed for contributions only from you, your family, your unit, or the beneficiary. Ask your council. ${whoText('fundraisingA')} ${scanText('fundraisingA')}`.trim(), 'Ask your council if you need the Fundraising Application. If you do, ask the people who sign it.');
    fill('plan', 'Write your Project Plan', PATHS.plan, `Fill in the “${tab.plan}” tab.`);
    check('work', 'Do your project', 'Keep a list of who helps and their hours. The Project Report has a place for them.', 'Run your project, then tick this.');
    fill('report', 'Fill in your Project Report', PATHS.report, `Fill in the “${tab.report}” tab.`);
    check('repSigned', 'Get your Project Report signed', `${whoText('reportC')} ${scanText('reportC')}`.trim(), 'Sign your promise first, then ask the others to sign Project Report Page C.');
    check('rest', 'Ask your unit leader what comes after the workbook', 'This part is outside this helper.', 'Ask your unit leader what comes after the workbook.');

    return { steps, next: steps.find((s) => s.state !== 'done') || null };
  }

  /** True when the Scout has recorded anything: a yes/no answer or at least one tick. Empty or unticked entries do not count. */
  function hasNotes(journey) {
    if (!journey || typeof journey !== 'object') return false;
    if (journey.raising === 'yes' || journey.raising === 'no') return true;
    const steps = journey.steps && typeof journey.steps === 'object' ? journey.steps : {};
    return CHECK_IDS.some((id) => steps[id] && typeof steps[id] === 'object' && steps[id].done === '1');
  }

  /** Keep only what this version reads: raising yes/no, and { done: '1' | '' } for the known step ids. */
  function clean(journey) {
    const j = journey && typeof journey === 'object' ? journey : {};
    const steps = {};
    for (const id of CHECK_IDS) {
      const s = j.steps && typeof j.steps === 'object' ? j.steps[id] : null;
      if (s && typeof s === 'object' && !Array.isArray(s) && (s.done === '1' || s.done === '')) steps[id] = { done: s.done };
    }
    return { raising: j.raising === 'yes' || j.raising === 'no' ? j.raising : '', steps };
  }

  return { journeySteps, hasNotes, clean, REMINDER, CHECK_IDS, PATHS };
});
