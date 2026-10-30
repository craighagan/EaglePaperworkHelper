/* EaglePaperworkHelper: the Classic 2026 workbook (EagleWorkbook2026.html), in the official order with the official
 * wording. Needs lib/official-pdf.js, lib/w26-model.js, lib/workbook-common.js and lib/w26-ui.js first. Every label is
 * taken from window.EagleW26.OFFICIAL through lib/w26-ui.js. Signed Pages and Your path come in a later phase. */
(function () {
  'use strict';
  const W = window.EagleWorkbook;
  const M = window.EagleW26;
  const U = window.EagleW26Ui;
  const { h } = W;

  // The Guided 2026 page is the same workbook with its own saved draft and stage names. Chosen by file name (no inline script).
  // The page says which one it is (<body data-page="guided">). The file name is only a fallback, so a renamed copy still works.
  const GUIDED = document.body.getAttribute('data-page') === 'guided' || (!document.body.hasAttribute('data-page') && /2026-guided\.html$/.test(window.location.pathname));
  const store = W.createStore(GUIDED ? 'eagle_workbook2026_guided_v1' : 'eagle_workbook2026_v1');
  const otherStore = W.createStore(GUIDED ? 'eagle_workbook2026_v1' : 'eagle_workbook2026_guided_v1');
  let D = store.load(M.defaults) || M.defaults();
  if (window.EagleAttachments) window.EagleAttachments.sanitize(D, { keepPictures: false });
  let tab = 0;
  let lastTab = null;
  let nudgeSnoozedUntil = 0;
  let printing = false;

  const get = (path) => W.getPath(D, path);
  const set = (path, value) => { W.setPath(D, path, value); store.save(D); };
  const dataOf = () => D;
  const TABS = GUIDED
    ? ['1. Set Up', '2. Proposal', '3. Fundraising (Appendix D)', '4. Project Plan', '5. Project Report', '6. Signed Pages & Photos', '7. Review']
    : ['Project Contacts', 'Project Proposal', 'Fundraising Application (Appendix D)', 'Project Plan', 'Project Report', 'Signed Pages & Photos', 'Review'];
  const SIGNED_TAB = 5;
  // The tab names "Your path" uses in its sentences ("Fill in the ... tab"), so they match the tabs on this page.
  const PATH_TABS = { setup: TABS[0], proposal: TABS[1], fundraising: TABS[2], plan: TABS[3], report: TABS[4], signed: TABS[5] };
  const G = GUIDED ? window.EagleW26Guided : null;
  if (GUIDED) U.usePlain(true);
  // Read the other 2026 page's draft without touching it (no store, no repair copy). True when it has a candidate name.
  function otherDraftHasAnswers() {
    try {
      const raw = JSON.parse(localStorage.getItem(GUIDED ? 'eagle_workbook2026_v1' : 'eagle_workbook2026_guided_v1') || 'null');
      return Boolean(raw && W.looksLikeWorkbook(raw) && raw.candidate && String(raw.candidate.name || '').trim());
    } catch { return false; }
  }
  const TAB_KEYS = ['setup', 'proposal', 'fundraising', 'plan', 'report'];
  const SHARED_DESCRIPTION_NOTE = 'The official PDF uses this one answer three times: here on page 7, and as the “Brief Project Description” on pages 11 and 22. Page 11 has room for about 3 lines and page 22 for about 7, so the start of your answer is what readers see there.';
  const REPORT_DESCRIPTION_NOTE = 'Page 19 of the workbook says: “Update the project description on page 22 if there were significant changes to your project during the planning process.” In the official PDF, pages 7, 11 and 22 share one box, so changing it also changes your proposal on pages 7 and 11, which may already be signed. Ask your Scoutmaster or coach how to handle this.';
  const AI_NOTE = 'The 2026 workbook says (page 4): “With your parent or guardian’s permission, you may use AI to help find a beneficiary, explore ideas, identify risks, or anticipate potential challenges. AI cannot write the project proposal, plan, or report for you. The work must be yours, not AI’s. If you use AI, you must fully disclose how and where you used it to all those reviewing any part of your project.” The Project Report has an Artificial Intelligence box for this.';
  const SIGNATURE_NOTE = 'This helper never fills in signatures or the dates beside them.';
  const YES_NO = [['', 'Not answered yet'], ['yes', 'YES'], ['no', 'NO']];

  /* ---------- Project Contacts ---------- */
  function renderContacts(f) {
    const L = U.labelOf;
    return h('div', null,
      U.sec(f, 'contacts',
        h('p', { className: 'intro' }, 'Read the entire workbook before you start, including the appendices.')),
      U.sec(f, 'contacts.candidate',
        f.row(U.box(f, 'candidate.name'), U.box(f, 'candidate.dob', { type: 'date' })),
        U.box(f, 'candidate.address'),
        f.row(U.box(f, 'candidate.city'), U.box(f, 'candidate.state')),
        f.row(U.box(f, 'candidate.email', { type: 'email' }), U.box(f, 'candidate.phone', { type: 'tel' })),
        f.row(U.box(f, 'candidate.pid'), U.box(f, 'candidate.borDate', { type: 'date' }))),
      U.sec(f, 'contacts.parent',
        f.field(L('Name'), 'parent.name', {}),
        f.field(L('Street Address'), 'parent.address', {}),
        f.row(f.field(L('City'), 'parent.city', {}), f.field(L('State'), 'parent.state', {})),
        f.row(f.field(L('Email'), 'parent.email', { type: 'email' }), f.field(L('Telephone'), 'parent.phone', { type: 'tel' }))),
      U.sec(f, 'contacts.unit',
        U.select(f, get, set, 'unit.type', [['Troop', 'Troop'], ['Crew', 'Crew'], ['Ship', 'Ship']]),
        f.row(U.box(f, 'unit.number'), U.box(f, 'unit.district')),
        U.box(f, 'unit.council')),
      U.person(f, 'leader', 'contacts.leader', L('Name')),
      U.person(f, 'committee', 'contacts.committee', L('Name')),
      U.place(f, 'beneficiary', 'contacts.beneficiary', L('Name of Organization')),
      U.person(f, 'beneficiaryRep', 'contacts.beneficiaryRep', L('Name of Representative')),
      U.place(f, 'serviceCenter', 'contacts.serviceCenter', L('Contact Name')),
      U.person(f, 'approvalRep', 'contacts.approvalRep', L('Name of Representative')),
      U.person(f, 'coach', 'contacts.coach', L('Name of Project Coach/Advisor')));
  }

  /* ---------- Project Proposal ---------- */
  function renderProposal(f) {
    const desc = h('p', { className: 'help' }, SHARED_DESCRIPTION_NOTE);
    return h('div', null,
      U.box(f, 'proposal.projectName'),
      U.card(f, 'proposal.beneficiaryImpact', { multi: true, rows: 6 }),
      h('section', { className: 'card' }, U.box(f, 'proposal.description', { multi: true, rows: 8 }), desc),
      U.card(f, 'proposal.motivation', { multi: true, rows: 4 }),
      U.sec(f, 'proposal.timeline',
        U.box(f, 'proposal.approvedDate', { type: 'date' }), U.box(f, 'proposal.planDate', { type: 'date' }),
        U.box(f, 'proposal.beginDate', { type: 'date' }), U.box(f, 'proposal.completeDate', { type: 'date' })),
      U.card(f, 'proposal.work', { multi: true, rows: 6 }),
      U.card(f, 'proposal.leadership', { multi: true, rows: 6 }),
      U.hoursTable(f, get, set, 'proposal.hours', 'proposal.hours'),
      U.card(f, 'proposal.resources', { multi: true, rows: 4 }),
      U.sec(f, 'proposal.costs',
        U.box(f, 'proposal.costs.materials', { inputmode: 'decimal' }), U.box(f, 'proposal.costs.supplies', { inputmode: 'decimal' }),
        U.box(f, 'proposal.costs.tools', { inputmode: 'decimal' }), U.box(f, 'proposal.costs.other', { inputmode: 'decimal' }),
        U.totalLine(f, dataOf, 'TOTAL', 'Total Prelimary Cost Estimate', ['proposal.costs.materials', 'proposal.costs.supplies', 'proposal.costs.tools', 'proposal.costs.other'])),
      U.card(f, 'proposal.fundraising', { multi: true, rows: 4 }),
      U.select(f, get, set, 'proposal.needFundraisingApp', YES_NO),
      U.card(f, 'proposal.safety', { multi: true, rows: 6 }),
      U.sec(f, 'proposal.approval', h('p', { className: 'help' }, SIGNATURE_NOTE)),
      U.sec(f, 'proposal.brief', U.readOnly(f, U.entry('proposal.description')[1], get('proposal.description'), 'Change it above', () => goToBox('proposal', 'proposal.description'), SHARED_DESCRIPTION_NOTE)),
      U.sec(f, 'proposal.promise', h('p', { className: 'help' }, SIGNATURE_NOTE)));
  }

  /* ---------- Fundraising Application (Appendix D) ---------- */
  function renderAppendix(f) {
    return h('div', null,
      U.sec(f, 'appendixD', U.select(f, get, set, 'proposal.needFundraisingApp', YES_NO, 'Based on Scouting America guidelines and your local council’s procedures, do you need to complete a Fundraising Application (Appendix D) and get it approved before seeking donations?'), h('p', { className: 'help' }, 'Only if you need a Fundraising Application.')),
      U.sec(f, 'appendixD.description', U.box(f, 'appendixD.useOfFunds', { multi: true, rows: 4 })),
      U.sec(f, 'appendixD.fundraising',
        U.readOnly(f, U.entry('proposal.fundraising@appendixD')[1], get('proposal.fundraising'), 'Change it on the Project Proposal tab', () => goToBox('proposal', 'proposal.fundraising'), 'In the 2026 workbook this is the Fundraising box on page 10.'),
        U.box(f, 'appendixD.dates'),
        U.box(f, 'appendixD.howMuch', { inputmode: 'decimal' })),
      U.sec(f, 'appendixD.donors', U.box(f, 'appendixD.donors', { multi: true, rows: 6 })),
      U.sec(f, 'appendixD.contracts', U.box(f, 'appendixD.contracts', { multi: true, rows: 4 })),
      U.sec(f, 'appendixD.safeguarding', U.box(f, 'appendixD.safeguarding', { multi: true, rows: 4 })));
  }

  /* ---------- Project Plan ---------- */
  function renderPlan(f) {
    const costs = (path, limit) => U.costTable(f, get, set, path, limit, path);
    return h('div', null,
      U.card(f, 'plan.reviewComments', { multi: true, rows: 4 }),
      U.card(f, 'plan.presentCondition', { multi: true, rows: 5 }),
      U.sec(f, 'plan.steps', f.table('Project steps', M.OFFICIAL.tables['plan.steps'][1], 'plan.steps', ['step', 'duration'])),
      U.sec(f, 'plan.helpers', f.table('Leading others', M.OFFICIAL.tables['plan.helpers'][1], 'plan.helpers', ['job', 'skills', 'adultYouth', 'needed', 'soFar'])),
      U.card(f, 'plan.organizing', { multi: true, rows: 4 }),
      U.card(f, 'plan.training', { multi: true, rows: 3 }),
      U.card(f, 'plan.communication', { multi: true, rows: 3 }),
      U.card(f, 'plan.workSessions', { multi: true, rows: 3 }),
      U.hoursTable(f, get, set, 'plan.hours', 'plan.hours'),
      U.sec(f, 'plan.safety',
        U.box(f, 'plan.firstAidKit', { multi: true, rows: 2 }), U.box(f, 'plan.firstAidSpecialist'),
        U.box(f, 'plan.safetyAdults', { multi: true, rows: 5 }),
        U.sec(f, 'plan.hazards', f.table('Hazards', M.OFFICIAL.tables['plan.hazards'][1], 'plan.hazards', ['hazard', 'prevention']))),
      U.card(f, 'plan.ppe', { multi: true, rows: 2 }),
      U.card(f, 'plan.toolSafety', { multi: true, rows: 3 }),
      U.card(f, 'plan.adultTools', { multi: true, rows: 2 }),
      U.card(f, 'plan.safetyBriefing', { multi: true, rows: 2 }),
      U.card(f, 'plan.emergencyAccess', { multi: true, rows: 2 }),
      U.card(f, 'plan.permits', { multi: true, rows: 4 }),
      U.sec(f, 'plan.items', costs('plan.items', 12),
        U.totalLine(f, dataOf, 'Total Cost:', 'Total CostTotal Cost', ['plan.items'])),
      U.sec(f, 'plan.funds',
        U.box(f, 'plan.funds.beneficiary', { inputmode: 'decimal' }), U.box(f, 'plan.funds.exempt', { inputmode: 'decimal' }),
        U.box(f, 'plan.funds.others', { inputmode: 'decimal' }),
        U.totalLine(f, dataOf, 'Total funds available or raised so far:', 'Funds Raised So Far', ['plan.funds.beneficiary', 'plan.funds.exempt', 'plan.funds.others']),
        U.box(f, 'plan.funds.future', { inputmode: 'decimal' }), U.box(f, 'plan.funds.futureDate', { type: 'date' }),
        U.box(f, 'plan.funds.donated', { inputmode: 'decimal' }),
        U.sec(f, 'plan.funds.total', U.totalLine(f, dataOf, 'Total Funds:', 'Total Funds', ['plan.funds.beneficiary', 'plan.funds.exempt', 'plan.funds.others', 'plan.funds.future', 'plan.funds.donated']))),
      U.card(f, 'plan.fundingSources', { multi: true, rows: 3 }),
      U.sec(f, 'plan.logistics', U.box(f, 'plan.materialTransport', { multi: true, rows: 2 }), U.box(f, 'plan.workerTransport', { multi: true, rows: 2 })),
      U.sec(f, 'plan.reviews', U.box(f, 'plan.beneficiaryInput', { multi: true, rows: 4 }), U.box(f, 'plan.leaderInput', { multi: true, rows: 4 })),
      U.sec(f, 'plan.promise', h('p', { className: 'help' }, SIGNATURE_NOTE)));
  }

  /* ---------- Project Report ---------- */
  function renderReport(f) {
    return h('div', null,
      U.sec(f, 'report.reflections', U.box(f, 'report.observations', { multi: true, rows: 4 }), U.box(f, 'report.challenges', { multi: true, rows: 4 }), U.box(f, 'report.changes', { multi: true, rows: 4 })),
      U.sec(f, 'report.leadership', U.box(f, 'report.leadershipStyle', { multi: true, rows: 4 }), U.box(f, 'report.rewarding', { multi: true, rows: 4 })),
      U.card(f, 'report.materialsUse', { multi: true, rows: 3 }),
      U.sec(f, 'report.hours', h('p', { className: 'help' }, 'The table’s rows are the people who worked on the project. Enter the grand total of hours on your Eagle Scout rank application too.')),
      U.sec(f, 'report.spending', U.costTable(f, get, set, 'report.spending', 9, 'report.spending'),
        U.totalLine(f, dataOf, 'Difference:', 'Difference', ['report.collected', 'report.spent']),
        U.box(f, 'report.collected', { inputmode: 'decimal' }), U.box(f, 'report.spent', { inputmode: 'decimal' }),
        U.box(f, 'report.differenceExplained', { multi: true, rows: 3 })),
      U.card(f, 'report.thanks', { multi: true, rows: 3 }),
      U.card(f, 'report.aiUse', { multi: true, rows: 4 }),
      U.sec(f, 'report.certification', h('p', { className: 'help' }, SIGNATURE_NOTE)),
      U.sec(f, 'report.acceptance',
        U.sec(f, 'report.brief', U.readOnly(f, U.entry('proposal.description')[1], get('proposal.description'), 'Change it on the Project Proposal tab', () => goToBox('proposal', 'proposal.description'), REPORT_DESCRIPTION_NOTE))));
  }

  /* ---------- Review (same tool as the 2023a pages) ---------- */
  function renderReview() {
    return W.reviewSection({
      data: () => D, store,
      tabs: PATH_TABS,
      tabLabels: Object.fromEntries(TAB_KEYS.map((k, i) => [k, TABS[i]])),
      goToBox,
      onSave: () => W.saveBackup(D, store),
      onPrint: () => printDraft()
    });
  }

  /* The Signed Pages & Photos tab: scans, photos, permits, and links. The 2026 signatures are in the PDF itself, so the
   * tab has no signature slots; everything goes in the attachments file the Fill page makes. */
  function renderSigned() {
    return h('div', null,
      h('p', { className: 'intro' }, 'The workbook asks for photographs taken before, during, and after the project (page 21), and for permits and other attachments on separate pages (pages 13 and 17). Add them here. They go in a separate attachments file made on the Fill page; nothing is added to the official workbook.'),
      W.attachmentsSection({ data: () => D, save: () => store.save(D), flush: () => store.flush(D), print: printing, slots: [], onChange: () => { if (G) G.refreshStage(document.querySelector('.stage-card'), D); } }));
  }

  const RENDERERS = [renderContacts, renderProposal, renderAppendix, renderPlan, renderReport, renderSigned, renderReview];
  // Focus moves to the tab the Scout chose, so the keyboard and screen readers stay where they were.
  let focusTab = false;
  const go = (i) => { tab = i; focusTab = true; render(); window.scrollTo(0, 0); };

  /** From the Review tab, or a link: switch to the tab that holds the box, then focus it. */
  function goToBox(name, path) {
    go(TAB_KEYS.indexOf(name) >= 0 ? TAB_KEYS.indexOf(name) : 1);
    const el = document.getElementById('f-' + path.replace(/[^a-zA-Z0-9_-]/g, '-'));
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); }
  }

  const actions = {
    onSave: () => W.saveBackup(D, store),
    onShare: () => W.shareBackup(D, store),
    onOpen: () => W.openBackup(M.defaults, (data) => { D = data; store.resume(); store.flush(D); store.markBackedUp(D); render(); }, () => D),
    onPrint: () => printDraft()
  };

  function render() {
    store.clearListeners();
    const app = document.getElementById('app');
    const f = W.createForm({ get, set });
    const header = h('header', null, W.saveIndicator(store),
      h('h1', null, String(get('candidate.name')).trim() || 'Eagle Project Workbook Helper'),
      h('p', { className: 'subtitle' }, (String(get('proposal.projectName')).trim() || (GUIDED ? 'Guided 2026 workbook (No. 512-927)' : 'Classic 2026 workbook (No. 512-927)')).slice(0, 80)));
    const nav = h('nav', { 'aria-label': 'Workbook sections' }, ...TABS.map((label, i) => h('button', { type: 'button', className: i === tab ? 'active' : null, 'aria-current': i === tab ? 'page' : null, onClick: () => go(i) }, label)));
    const last = tab === TABS.length - 1;
    const fillReady = Boolean(String(get('proposal.projectName')).trim() || String(get('proposal.description')).trim());
    const boxesList = TAB_KEYS[tab] ? W.emptyBoxesList({ data: () => D, tabName: TAB_KEYS[tab] }) : null;
    const banner = h('p', { className: 'edition-banner' }, `For the 2026 workbook (No. 512-927). ${GUIDED ? 'Guided. ' : ''}`, h('a', { href: 'index.html' }, 'Other workbook'));
    // This page's draft has no name yet but the other 2026 page's draft does: say so, with a link, so the work is not thought lost.
    const elsewhere = !String(get('candidate.name')).trim() && otherDraftHasAnswers()
      ? h('p', { className: 'edition-banner' }, `You have a saved draft in the ${GUIDED ? 'Classic' : 'Guided'} 2026 workbook. `, h('a', { href: GUIDED ? 'EagleWorkbook2026.html' : 'EagleWorkbook2026-guided.html' }, 'Open that draft'))
      : null;
    const pathCard = tab === 0 ? W.journeyCard({ data: () => D, set, tabs: PATH_TABS, collapse: true }) : null;
    const main = h('main', { id: 'main' },
      banner,
      elsewhere,
      G ? G.stageCard(tab, D) : null,
      pathCard,
      tab <= 4 ? W.keyCount(D) : null,
      boxesList,
      tab >= 1 && tab <= 4 ? W.askForHelp({ get, setupName: 'Project Contacts', roles: [['leader', 'Scoutmaster'], ['coach', 'Project coach/advisor'], ['approvalRep', 'Council or district approval representative'], ['serviceCenter', 'Council service center']], scoutlyNote: AI_NOTE }) : null,
      RENDERERS[tab](f),
      h('div', { className: 'nav-btns' },
        h('button', { type: 'button', className: 'btn btn-prev', disabled: tab === 0, onClick: () => go(tab - 1) }, '← Previous'),
        last ? h('a', { className: 'btn btn-next', href: 'FillOfficialPDF2026.html' }, 'Next: fill the official PDF →')
          : h('button', { type: 'button', className: 'btn btn-next', onClick: () => go(tab + 1) }, `Next: ${TABS[tab + 1]} →`)),
      W.backupHelp({ open: tab === 0 }),
      W.controls({ store, ...actions, fillReady, fillHref: 'FillOfficialPDF2026.html' }),
      W.footer({ onErase: () => W.confirmErase([store, otherStore], () => { D = M.defaults(); tab = 0; render(); }, '2026 workbook'), fillHref: 'FillOfficialPDF2026.html', officialUrl: M.OFFICIAL_URL, backupHref: null }));
    const tabChanged = lastTab !== null && lastTab !== tab;
    lastTab = tab;
    const nudge = tabChanged && Date.now() >= nudgeSnoozedUntil
      ? W.backupNudge({ store, onSave: () => W.saveBackup(D, store), onDismiss: () => { nudgeSnoozedUntil = Date.now() + 10 * 60 * 1000; } })
      : null;
    app.replaceChildren(header, W.controls({ store, ...actions, top: true, fillReady, fillHref: 'FillOfficialPDF2026.html' }), nav, ...[nudge].filter(Boolean), main);
    const refreshDots = () => nav.querySelectorAll('button').forEach((b, i) => {
      b.querySelectorAll('.tab-dot,.visually-hidden').forEach((x) => x.remove());
      const n = TAB_KEYS[i], J = window.EagleJourney;
      if (n && J && (J.emptyKeyBoxes(D)[n] || []).length) b.append(h('span', { className: 'tab-dot', 'aria-hidden': 'true' }, '•'), h('span', { className: 'visually-hidden' }, ' (some boxes not filled in yet)'));
    });
    refreshDots();
    const refreshLive = () => {
      if (boxesList) boxesList.refresh();
      refreshDots();
      const kc = main.querySelector('.key-count');
      if (kc && window.EagleJourney) { const c = window.EagleJourney.keyBoxCount(D); kc.textContent = `Key boxes filled in: ${c.filled} of ${c.total}.`; }
      if (G) G.refreshStage(main.querySelector('.stage-card'), D);
      if (pathCard) pathCard.refresh();
    };
    main.addEventListener('input', refreshLive);
    main.addEventListener('change', refreshLive);
    W.stickBelow(header, nav);
    const activeTab = nav.querySelector('.active');
    if (activeTab && activeTab.scrollIntoView) activeTab.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    if (focusTab && activeTab) { activeTab.focus({ preventScroll: true }); focusTab = false; }
  }

  function printDraft() {
    store.flush(D);
    store.clearListeners();
    printing = true;
    const f = W.createForm({ get, set, print: true });
    W.printDraft({
      app: document.getElementById('app'),
      title: String(get('candidate.name')).trim() || 'Eagle project workbook draft (2026)',
      subtitle: String(get('proposal.projectName')).trim(),
      sections: [['Project Contacts', () => renderContacts(f)], ['Project Proposal', () => renderProposal(f)], ['Fundraising Application (Appendix D)', () => renderAppendix(f)], ['Project Plan', () => renderPlan(f)], ['Project Report', () => renderReport(f)], ['Signed Pages, Photos, and Attachments', () => renderSigned()]],
      restore: () => { printing = false; render(); }
    });
  }

  render();
  if (window.EagleAttachments) window.EagleAttachments.ready().then(() => { if (tab === SIGNED_TAB && !printing) render(); });
})();
