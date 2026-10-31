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
 *  - The only requirements quoted are the workbook's own sentences: REMINDER (2023a) and QUOTES_2026 (2026). A test
 *    checks every QUOTES_2026 sentence against its page of the official PDF. Nothing else here is a rule.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EagleJourney = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** The workbook's own sentence (Proposal Page A, "Meeting the Five Tests" page), kept the same in meaning. */
  const REMINDER = 'The workbook says not to begin any work, raise any money, or get any materials until your project proposal has been approved. (Proposal Page A)';

  /* The 2026 workbook's own sentences that "Your path" quotes, each with the printed page it is on. A test checks them. */
  const QUOTES_2026 = {
    noWork: [6, 'Do NOT begin work until your project proposal is approved by all the signatories.'],
    promiseFirst: [11, 'Sign here before you seek other approvals.'],
    councilLast: [11, 'You only have to make sure that the district or council approval is last.'],
    fundraising: [12, 'If your council requires a fundraising application, it MUST be approved before you seek donations from sources other than the exempt ones listed above.'],
    planApproval: [3, 'Show the Project Plan to your beneficiary and Scoutmaster. Get their approval before starting work.'],
    birthday: [19, 'You must complete your project, including this report, before your 18th birthday.'],
    rankDate: [19, 'The date you sign your project report is the date you enter on page 2 of your Eagle Scout rank application.'],
    afterBirthday: [19, 'Your beneficiary and Scoutmaster may sign the report after your 18th birthday.'],
    rest: [3, 'Complete all other Eagle rank requirements, if necessary, and participate in an Eagle board of review.'],
    appendixB: [6, 'You must provide the Information for Project Beneficiaries (Appendix B) document to the representative of the organization you chose to be the project beneficiary.'],
    noCertify: [2, 'DO NOT attempt to “certify” or “digitally sign and lock” the document. Doing so will prevent the Scout or other approvers from adding information or signatures.'],
    noFlatten: [2, 'Unless you are completely done editing the document, including any signatures to be added electronically, DO NOT “flatten” the document by using “print to PDF” or “export as PDF” functions. These actions disable all interactive form fields in a PDF document.'],
    instead: [2, 'Instead, use File > Save.'],
    saveAfter: [2, 'Save the document after signing.'],
    photosAttach: [21, 'Attach (or submit separately) photographs taken before, during, and after the project completion.'],
    permitsAttach: [17, 'Attach copies of any permits to your workbook.'],
    separateFiles: [10, 'Include photos, drawings, and other information on separate pages or in separate files.'],
    separatePage: [13, 'Attach these items on a separate page rather than inserting them into the workbook.']
  };
  const quote = (k) => `Page ${QUOTES_2026[k][0]}: “${QUOTES_2026[k][1]}”`;
  /** Said once under "Your path" on the 2026 pages: where the Fundraising step comes from, and that the list is short. */
  const pathNote2026 = (proposalTab) => `This list is a short version of the checklist on page 3 of the workbook, and it leaves out some steps. For example, checklist item 6 is to give your beneficiary the Information for Project Beneficiaries. ${quote('appendixB')} A step for the Fundraising Application appears if you answer Yes to the Fundraising Application question on the “${proposalTab || 'Project Proposal'}” tab.`;
  /** The one sentence shown above "Your path", by edition. */
  const REMINDER_2026 = `The workbook says: “${QUOTES_2026.noWork[1]}” (page ${QUOTES_2026.noWork[0]}). It also says to get your Project Plan approved before you start work (page 3, item 12).`;

  const getPath = (data, path) => path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), data);
  const filled = (data, path) => String(getPath(data, path) === undefined || getPath(data, path) === null ? '' : getPath(data, path)).trim() !== '';

  /* The "key boxes" for each tab, per workbook edition. Every count of boxes "filled in" (the Guided stage cards,
     Your path, the tab dots, the overall count, the Review tab) reads this one table, so they always agree.
     Labels are short plain names for a box; they appear in "Not filled in yet" lists. Change them here only.
     The 2026 table is the second entry below. */
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
    },
    // The 2026 workbook's tabs, in its own order (Appendix D sits after the proposal).
    '2026': {
      setup: [
        { path: 'candidate.name', label: 'Your name' },
        { path: 'candidate.email', label: 'Your email' },
        { path: 'unit.number', label: 'Unit number' },
        { path: 'contacts.leader.name', label: 'Scoutmaster' },
        { path: 'contacts.beneficiary.name', label: 'Beneficiary organization' },
        { path: 'contacts.beneficiaryRep.name', label: 'Beneficiary representative' }
      ],
      proposal: [
        { path: 'proposal.projectName', label: 'Project title' },
        { path: 'proposal.beneficiaryImpact', label: 'Beneficiary and impact' },
        { path: 'proposal.description', label: 'Project description' },
        { path: 'proposal.motivation', label: 'Motivation' },
        { path: 'proposal.work', label: 'The work' },
        { path: 'proposal.leadership', label: 'Leadership' },
        { path: 'proposal.resources', label: 'Resources needed' },
        { path: 'proposal.safety', label: 'Safety' }
      ],
      fundraising: [
        { path: 'appendixD.useOfFunds', label: 'What the funds are for' },
        { path: 'appendixD.howMuch', label: 'How much you expect to raise' },
        { path: 'appendixD.donors', label: 'Donors' },
        { path: 'appendixD.safeguarding', label: 'Safeguarding donations' }
      ],
      plan: [
        { path: 'plan.presentCondition', label: 'Present condition' },
        { path: 'plan.steps.0.step', label: 'Project steps' },
        { path: 'plan.helpers.0.job', label: 'Leading others' },
        { path: 'plan.organizing', label: 'Organizing tasks' },
        { path: 'plan.firstAidKit', label: 'First aid kit' },
        { path: 'plan.safetyAdults', label: 'Safety talks with adults' },
        { path: 'plan.hazards.0.hazard', label: 'Hazards' },
        { path: 'plan.permits', label: 'Permissions or permits' },
        { path: 'plan.items.0.item', label: 'Materials list' },
        { path: 'plan.beneficiaryInput', label: 'Input from beneficiary' },
        { path: 'plan.leaderInput', label: 'Input from Scoutmaster' }
      ],
      report: [
        { path: 'report.observations', label: 'Observations' },
        { path: 'report.challenges', label: 'Challenges' },
        { path: 'report.changes', label: 'Changes' },
        { path: 'report.leadershipStyle', label: 'Your leadership style' },
        { path: 'report.materialsUse', label: 'Use of materials' },
        { path: 'report.thanks', label: 'Acknowledgment' },
        { path: 'report.aiUse', label: 'Artificial intelligence' }
      ]
    }
  };
  const TAB_ORDER = ['setup', 'proposal', 'plan', 'fundraising', 'report'];
  const TAB_ORDERS = { '2023a': TAB_ORDER, '2026': ['setup', 'proposal', 'fundraising', 'plan', 'report'] };
  /** The tabs whose key boxes are counted, in this draft's edition's order. */
  function tabOrder(data) {
    return TAB_ORDERS[editionOf(data)] || TAB_ORDER;
  }

  /** Which official workbook a draft is for. Every backup file made before 2026 support has no `edition`, so it is 2023a. */
  function editionOf(data) {
    if (!data || typeof data !== 'object') return '2023a';
    const e = typeof data.edition === 'number' ? String(data.edition) : (typeof data.edition === 'string' ? data.edition.trim() : '');
    if (e === '2026') return '2026';
    // A 2026 draft that lost its edition key still has the Appendix D section, which no 2023a draft has.
    if (e === '' && data.appendixD && typeof data.appendixD === 'object' && !Array.isArray(data.appendixD)) return '2026';
    return '2023a';
  }

  /** The key boxes for this draft's edition (each edition has its own table). */
  function keyBoxes(data) {
    return KEY_BOXES[editionOf(data)] || KEY_BOXES['2023a'];
  }

  /** Fundraising boxes count only when the Scout said, on Your path, that they will ask outsiders for money or materials. */
  const countsFundraising = (data) => (editionOf(data) === '2026'
    ? Boolean(data && data.proposal && data.proposal.needFundraisingApp === 'yes')
    : Boolean(data && data.journey && data.journey.raising === 'yes'));

  /** Tab name → key boxes not filled in yet (in table order). Tabs with nothing empty are still listed, with []. */
  function emptyKeyBoxes(data) {
    const t = keyBoxes(data);
    const out = {};
    for (const name of tabOrder(data)) {
      if (name === 'fundraising' && !countsFundraising(data)) continue;
      out[name] = t[name].filter((b) => !filled(data, b.path));
    }
    return out;
  }

  /** { filled, total } over every counted key box. A plain count: never shown as a percent or a grade. */
  function keyBoxCount(data) {
    const t = keyBoxes(data);
    let total = 0, n = 0;
    for (const name of tabOrder(data)) {
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

  /* Long answer boxes that the Review tab checks for length. A short answer is not wrong: the hint says only
     that a coach may ask for more detail. Edition-keyed like KEY_BOXES. */
  const SHORT_ANSWER_BOXES = {
    '2023a': [
      { tab: 'proposal', path: 'proposal.description', label: 'Project description' },
      { tab: 'proposal', path: 'proposal.whyNeeded', label: 'Why the beneficiary needs it' },
      { tab: 'proposal', path: 'proposal.leadershipChallenges', label: 'What could be hard about leading' },
      { tab: 'plan', path: 'plan.presentCondition', label: 'Present condition' },
      { tab: 'plan', path: 'plan.workProcesses', label: 'Work processes' },
      { tab: 'report', path: 'report.description', label: 'Project description and impact' },
      { tab: 'report', path: 'report.planning', label: 'Completing the planning' },
      { tab: 'report', path: 'report.wentWell', label: 'What went well' },
      { tab: 'report', path: 'report.challenging', label: 'What was challenging' },
      { tab: 'report', path: 'report.leadership', label: 'How you led' }
    ]
  };
  SHORT_ANSWER_BOXES['2026'] = [
    { tab: 'proposal', path: 'proposal.beneficiaryImpact', label: 'Beneficiary and impact' },
    { tab: 'proposal', path: 'proposal.description', label: 'Project description' },
    { tab: 'proposal', path: 'proposal.motivation', label: 'Motivation' },
    { tab: 'proposal', path: 'proposal.work', label: 'The work' },
    { tab: 'proposal', path: 'proposal.leadership', label: 'Leadership' },
    { tab: 'proposal', path: 'proposal.safety', label: 'Safety' },
    { tab: 'plan', path: 'plan.presentCondition', label: 'Present condition' },
    { tab: 'plan', path: 'plan.organizing', label: 'Organizing tasks' },
    { tab: 'report', path: 'report.observations', label: 'Observations' },
    { tab: 'report', path: 'report.challenges', label: 'Challenges' }
  ];
  const SHORT_WORDS = 8;

  /** Long-answer boxes with 1 to SHORT_WORDS-1 words. Empty boxes are not listed here: they are in "Not filled in yet". */
  function shortAnswers(data) {
    const list = SHORT_ANSWER_BOXES[editionOf(data)] || SHORT_ANSWER_BOXES['2023a'];
    return list.filter((b) => {
      const words = String(getPath(data, b.path) || '').trim().split(/\s+/).filter(Boolean).length;
      return words > 0 && words < SHORT_WORDS;
    });
  }

  /* Steps only the Scout can know. The Scout ticks them; they are saved as journey.steps.<id>.done = '1'. */
  const CHECK_IDS = ['propSigned', 'fund', 'planApproved', 'work', 'repSigned', 'rest'];

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
    if (editionOf(data) === '2026') return journeySteps2026(data, tabs);
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

  /** "Your path" for the 2026 workbook, from its own checklist (page 3). Same shape as journeySteps. */
  function journeySteps2026(data, tabs) {
    const tab = Object.assign({ setup: 'Project Contacts', proposal: 'Project Proposal', fundraising: 'Fundraising Application (Appendix D)', plan: 'Project Plan', report: 'Project Report', signed: 'Signed Pages & Photos' }, tabs || {});
    const d = data && typeof data === 'object' ? data : {};
    const journey = d.journey && typeof d.journey === 'object' ? d.journey : {};
    const noted = (id) => Boolean(journey.steps && journey.steps[id] && journey.steps[id].done === '1');
    const boxes = KEY_BOXES['2026'];
    const paths = (name) => boxes[name].map((b) => b.path);
    const steps = [];
    const fill = (id, title, name, next) => {
      const f = fillState(d, paths(name));
      steps.push({ id, title, kind: 'fill', state: f.state, detail: `${f.n} of ${f.total} key boxes filled in.`, next });
    };
    const check = (id, title, detail, next) => steps.push({ id, title, kind: 'check', state: noted(id) ? 'done' : 'todo', detail, next });
    const needsFundraising = countsFundraising(d);

    fill('setup', 'Fill in your Project Contacts', 'setup', `Fill in the “${tab.setup}” tab.`);
    fill('proposal', 'Fill in your Project Proposal', 'proposal', `Fill in the “${tab.proposal}” tab.`);
    check('propSigned', 'Get your four Proposal Approval signatures', `Sign your Candidate’s Promise first, then ask for the four approvals. The council or district approval comes last. ${quote('promiseFirst')} ${quote('councilLast')}`, 'Sign your promise first, then ask for the four approvals on page 11. The council or district signs last.');
    if (needsFundraising) {
      fill('fundraising', 'Fill in your Fundraising Application (Appendix D)', 'fundraising', `Fill in the “${tab.fundraising}” tab.`);
      check('fund', 'Get your Fundraising Application approved', quote('fundraising'), 'If your council requires a Fundraising Application, get it approved before you ask for donations. Page 12 lists contributions that need no application: from you or your parents, guardians, or relatives; from the beneficiary; and from your unit, its members, unit parents, or the chartered organization.');
    }
    fill('plan', 'Write your Project Plan', 'plan', `Fill in the “${tab.plan}” tab.`);
    check('planApproved', 'Get your Project Plan approved', quote('planApproval'), 'Show your Project Plan to your beneficiary and Scoutmaster and get their approval. The plan ends with a Candidate’s Promise that says you did this (page 18). Tick this when you have their approval.');
    check('work', 'Do your project', 'Page 6 says to keep track of the hours you and others invest.', 'Run your project, then tick this.');
    fill('report', 'Fill in your Project Report', 'report', `Fill in the “${tab.report}” tab.`);
    check('repSigned', 'Get your Project Report signed', `${quote('birthday')} ${quote('rankDate')} ${quote('afterBirthday')}`, 'Sign and date your promise, then ask the beneficiary to accept the work and the Scoutmaster to sign (page 22).');
    check('rest', 'Ask your unit leader what comes after the workbook', `${quote('rest')} This part is outside this helper.`, 'Ask your unit leader what comes after the workbook.');
    return { steps, next: steps.find((s) => s.state !== 'done') || null };
  }

  /** The reminder shown above "Your path" for this draft's edition. */
  const reminderFor = (data) => (editionOf(data) === '2026' ? REMINDER_2026 : REMINDER);

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

  return { journeySteps, hasNotes, clean, REMINDER, REMINDER_2026, pathNote2026, reminderFor, QUOTES_2026, CHECK_IDS, PATHS, KEY_BOXES, TAB_ORDER, tabOrder, editionOf, keyBoxes, emptyKeyBoxes, keyBoxCount, SHORT_ANSWER_BOXES, SHORT_WORDS, shortAnswers };
});
