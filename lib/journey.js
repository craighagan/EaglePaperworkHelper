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

  const getPath = (data, path) => path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), data);
  const filled = (data, path) => String(getPath(data, path) === undefined || getPath(data, path) === null ? '' : getPath(data, path)).trim() !== '';

  /* The "key boxes" for each tab, per workbook edition. Every count of boxes "filled in" (the Guided stage cards,
     Your path, the tab dots, the overall count, the Review tab) reads this one table, so they always agree.
     Labels are short plain names for a box; they appear in "Not filled in yet" lists. Change them here only.
     A 2026 table will be added beside this one; nothing else should need to change for it. */
  const KEY_BOXES = {
    '2023a': {
      setup: [
        { path: 'candidate.name', label: 'Your full legal name' },
        { path: 'candidate.email', label: 'Your email' },
        { path: 'unit.number', label: 'Unit number' },
        { path: 'contacts.beneficiary.name', label: 'Beneficiary organization' },
        { path: 'contacts.beneficiaryRep.name', label: 'Beneficiary contact person' }
      ],
      proposal: [
        { path: 'proposal.projectName', label: 'Project name' },
        { path: 'proposal.description', label: 'Project description' },
        { path: 'proposal.whyNeeded', label: 'Why the beneficiary needs it' },
        { path: 'proposal.helperCount', label: 'How many helpers' },
        { path: 'proposal.materials', label: 'Materials' },
        { path: 'proposal.safety', label: 'Safety issues and hazards' }
      ],
      plan: [
        { path: 'plan.startDate', label: 'Planned start date' },
        { path: 'plan.presentCondition', label: 'Present condition' },
        { path: 'plan.workProcesses', label: 'Work processes' },
        { path: 'plan.firstAid', label: 'First aid kit' },
        { path: 'plan.contingency', label: 'Contingency plans' }
      ],
      fundraising: [
        { path: 'fundraising.description', label: 'How funds will be raised' },
        { path: 'fundraising.beginDate', label: 'Project begin date' },
        { path: 'fundraising.howMuch', label: 'How much you expect to raise' }
      ],
      report: [
        { path: 'report.actualStart', label: 'When the work began' },
        { path: 'report.actualEnd', label: 'When the work finished' },
        { path: 'report.description', label: 'Project description and impact' },
        { path: 'report.leadership', label: 'How you led' }
      ]
    }
  };
  const TAB_ORDER = ['setup', 'proposal', 'plan', 'fundraising', 'report'];

  /** Which official workbook a draft is for. Every backup file made before 2026 support has no `edition`, so it is 2023a. */
  function editionOf(data) {
    return data && typeof data === 'object' && data.edition === '2026' ? '2026' : '2023a';
  }

  /** The key boxes for this draft's edition (falls back to 2023a while 2026 has no table). */
  function keyBoxes(data) {
    return KEY_BOXES[editionOf(data)] || KEY_BOXES['2023a'];
  }

  /** Fundraising boxes count only when the Scout said, on Your path, that they will ask outsiders for money or materials. */
  const countsFundraising = (data) => Boolean(data && data.journey && data.journey.raising === 'yes');

  /** Tab name → key boxes not filled in yet (in table order). Tabs with nothing empty are still listed, with []. */
  function emptyKeyBoxes(data) {
    const t = keyBoxes(data);
    const out = {};
    for (const name of TAB_ORDER) {
      if (name === 'fundraising' && !countsFundraising(data)) continue;
      out[name] = t[name].filter((b) => !filled(data, b.path));
    }
    return out;
  }

  /** { filled, total } over every counted key box. A plain count: never shown as a percent or a grade. */
  function keyBoxCount(data) {
    const t = keyBoxes(data);
    let total = 0, n = 0;
    for (const name of TAB_ORDER) {
      if (name === 'fundraising' && !countsFundraising(data)) continue;
      total += t[name].length;
      n += t[name].filter((b) => filled(data, b.path)).length;
    }
    return { filled: n, total };
  }

  /* Kept for the existing code: the paths of the 2023a key boxes, by tab. */
  const PATHS = {
    proposal: KEY_BOXES['2023a'].proposal.map((b) => b.path),
    plan: KEY_BOXES['2023a'].plan.map((b) => b.path),
    report: KEY_BOXES['2023a'].report.map((b) => b.path)
  };

  /* Steps only the Scout can know. The Scout ticks them; they are saved as journey.steps.<id>.done = '1'. */
  const CHECK_IDS = ['propSigned', 'fund', 'work', 'repSigned', 'rest'];

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
    const tab = Object.assign({ proposal: 'Proposal', plan: 'Project Plan', report: 'Project Report', signed: 'Signed Pages & Photos' }, tabs || {});
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

  return { journeySteps, hasNotes, clean, REMINDER, CHECK_IDS, PATHS, KEY_BOXES, TAB_ORDER, editionOf, keyBoxes, emptyKeyBoxes, keyBoxCount };
});
