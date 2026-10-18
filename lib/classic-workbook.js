/* EaglePaperworkHelper: the Classic workbook (EagleWorkbook.html), laid out in the official workbook's order. Needs lib/workbook-common.js. */
(function () {
  'use strict';
  const W = window.EagleWorkbook;
  const { h } = W;

  const store = W.createStore('eagle_workbook_v1');
  const otherStore = W.createStore('eagle_workbook_guided_v1');
  let D = store.load(W.defaults) || W.defaults();
  if (window.EagleAttachments) window.EagleAttachments.sanitize(D, { keepPictures: false });
  let tab = 0;
  let printing = false;

  const get = (path) => W.getPath(D, path);
  const set = (path, value) => { W.setPath(D, path, value); store.save(D); };
  const TABS = ['Contact Info', 'Proposal', 'Project Plan', 'Fundraising', 'Report', 'Signed Pages'];
  const cols = ['Item', 'Description', 'Qty', 'Unit $', 'Total $', 'Source'];
  const colKeys = ['item', 'description', 'qty', 'unitCost', 'totalCost', 'source'];
  const fmt = (v) => (window.EagleOfficialPdf ? window.EagleOfficialPdf.formatDate(v) : v);

  function renderContact(f) {
    const c = (key, title, opts) => f.contactBlock(key, title, opts);
    return h('div', null,
      h('p', { className: 'intro' }, 'Read the entire official workbook before you start, and read its “Message to Scouts and Parents or Guardians” with a parent or guardian. Give your beneficiary the “Navigating the Eagle Scout Service Project” pages from the end of the workbook. Don’t begin work, raise money, or obtain materials until your proposal is approved.'),
      f.section('Eagle Scout Candidate', null,
        f.row(f.field('Full legal name', 'candidate.name'), f.field('Birth date', 'candidate.dob', { type: 'date' })),
        f.row(f.field('BSA PID number', 'candidate.pid'), f.field('Life board of review date', 'candidate.borDate', { type: 'date' })),
        f.field('Address', 'candidate.address'),
        f.row(f.field('City', 'candidate.city'), f.field('State', 'candidate.state')),
        f.row(f.field('ZIP code', 'candidate.zip'), f.field('Email address', 'candidate.email', { type: 'email' })),
        f.field('Preferred telephone', 'candidate.phone', { type: 'tel' })),
      f.section('Current Unit Information', null,
        f.row(f.field('Unit type (Troop, Crew, or Ship)', 'unit.type'), f.field('Unit number', 'unit.number')),
        f.row(f.field('Name of district', 'unit.district'), f.field('Name of council', 'unit.council'))),
      c('leader', 'Unit Leader'),
      c('chair', 'Unit Committee Chair'),
      c('advancement', 'Unit Advancement Coordinator', { help: 'If your unit has one.' }),
      c('beneficiary', 'Project Beneficiary', { nameLabel: 'Organization name', help: 'Name of religious institution, school, or community.' }),
      c('beneficiaryRep', 'Project Beneficiary Representative', { nameLabel: 'Contact person', help: 'Name of the contact person for the project beneficiary.' }),
      c('serviceCenter', 'Your Council Service Center', { nameLabel: 'Contact name' }),
      c('approvalRep', 'Council or District Project Approval Representative', { help: 'Your unit leader, unit advancement coordinator, or council or district advancement chair may help you learn who this will be.' }),
      c('coach', 'Project Coach', { help: 'Optional but strongly encouraged. Your council or district approval representative may help you learn who this will be.' }));
  }

  function phases(f, path, withDates) {
    if (printing) return h('ol', { className: 'print-list' }, ...get(path).filter((p) => ['description', 'start', 'end'].some((k) => String(p[k] || '').trim())).map((p) => h('li', null, [p.description, withDates && (p.start || p.end) ? `(${fmt(p.start) || '?'} to ${fmt(p.end) || '?'})` : ''].filter(Boolean).join(' '))));
    return h('div', null, ...get(path).map((p, i) => {
      const input = (key, label, type) => {
        // Dates typed as text in an older version stay visible as text.
        const oldText = type === 'date' && p[key] && !W.ISO_DATE.test(p[key]);
        const el = h('input', { type: oldText ? 'text' : (type || 'text'), 'aria-label': `Phase ${i + 1} ${label}`, className: type === 'date' ? 'phase-date' : null, title: oldText ? 'Not in a form the date picker understands. Clear it to pick a date.' : null });
        el.value = p[key] || '';
        el.addEventListener('input', (e) => set(`${path}.${i}.${key}`, e.target.value));
        return el;
      };
      return h('div', { className: 'phase-row' }, h('span', { className: 'phase-num', 'aria-hidden': 'true' }, `${i + 1}.`),
        input('description', 'description'), withDates ? input('start', 'start date', 'date') : null, withDates ? input('end', 'end date', 'date') : null);
    }));
  }

  function renderProposal(f) {
    return h('div', null,
      f.section('Project Name', null, f.field('Please give a name to your project', 'proposal.projectName', { help: 'Appears on the cover page of the official workbook.' })),
      f.section('Project Description and Benefit', null,
        f.field('Briefly describe your project', 'proposal.description', { multi: true, rows: 5, help: 'Include images on an additional document.' }),
        f.field('Tell how your project will be helpful to the beneficiary. Why is it needed?', 'proposal.whyNeeded', { multi: true, rows: 4 }),
        f.row(f.field('When do you plan to begin carrying out your project?', 'proposal.startDate', { type: 'date' }), f.field('When do you think your project will be completed?', 'proposal.endDate', { type: 'date' }))),
      f.section('Giving Leadership', null,
        f.field('Approximately how many people will be needed to help on your project?', 'proposal.helperCount'),
        f.field('Where will you recruit them (unit members, friends, neighbors, family, others)?', 'proposal.helperSource', { multi: true, rows: 3 }),
        f.field('What do you think will be most difficult about leading them?', 'proposal.leadershipChallenges', { multi: true, rows: 3 })),
      f.section('Materials, Supplies, Tools, Other Needs', 'You do not need a detailed list or exact quantities, but show you have a reasonable idea of what is required.',
        f.field('Materials (things that become part of the finished project)', 'proposal.materials', { multi: true, rows: 3, help: 'For lumber, use basic dimensions such as 2x4 or 4x4.' }),
        f.field('Supplies (things used up in the project, such as food and refreshments, tape, tarps, and garbage bags)', 'proposal.supplies', { multi: true, rows: 3 }),
        f.field('Tools (and equipment to be borrowed, rented, or purchased)', 'proposal.tools', { multi: true, rows: 3 }),
        f.field('Other needs (items that don’t fit the above, such as parking, postage, or services like printing or pouring concrete)', 'proposal.otherNeeds', { multi: true, rows: 3 }),
        f.field('Permits and permissions: will any be required? Who will obtain them? How long will it take?', 'proposal.permits', { multi: true, rows: 3, help: 'Property owners should obtain and pay for permits.' })),
      f.section('Preliminary Cost Estimate', 'Include sales tax and the value of donated items. Tools loaned at no cost need not be included.',
        f.tipBox('proposal.costs', 'the cost estimate'),
        f.row(f.field('Materials $', 'proposal.costs.materials', { inputmode: 'decimal' }), f.field('Supplies $', 'proposal.costs.supplies', { inputmode: 'decimal' })),
        f.row(f.field('Tools $', 'proposal.costs.tools', { inputmode: 'decimal' }), f.field('Other $', 'proposal.costs.other', { inputmode: 'decimal' })),
        f.field('Fundraising: explain how you will raise the money to pay for the total costs', 'proposal.fundraisingPlan', { multi: true, rows: 3, help: 'If you intend to seek donations of actual materials, supplies, etc., then explain how you plan to do that too.' })),
      f.section('Project Phases', 'Brief one-line descriptions are enough. Attach a page if you have more than 10.', f.tipBox('proposal.phases', 'project phases'), phases(f, 'proposal.phases', false)),
      f.section('Logistics', null, f.field('How will you handle transportation of materials, supplies, tools, and helpers?', 'proposal.logistics', { multi: true, rows: 3 })),
      f.section('Safety Issues', 'Read the Guide to Safe Scouting and the Age Guidelines for Tool Usage at scouting.org.',
        f.field('Safety issues and hazards', 'proposal.safety', { multi: true, rows: 4 })),
      f.section('Project Planning', 'List the steps you will take to prepare your project plan.',
        f.field('Planning steps', 'proposal.planning', { multi: true, rows: 4 })));
  }

  function renderPlan(f) {
    return h('div', null,
      h('p', { className: 'intro' }, 'Prepare after your proposal is approved, before you begin work. No one approves it, but your project beneficiary has the authority to review it and require changes, so show it to them before carrying out the project. Sharing it with your project coach is optional but strongly encouraged.'),
      f.section('Plan Dates', null, f.row(f.field('Planned start date', 'plan.startDate', { type: 'date' }), f.field('Planned completion date', 'plan.endDate', { type: 'date' }))),
      f.section('Comments From Your Proposal Review', null, f.field('What suggestions were offered by the council or district representative who approved your project?', 'plan.reviewComments', { multi: true, rows: 3 })),
      f.section('Changes From the Proposal', null,
        f.field('How will your project be different from your approved proposal?', 'plan.changesFromProposal', { multi: true, rows: 3 }),
        f.field('Will the changes make the project more, or less, helpful to the beneficiary? Explain.', 'plan.changeImpact', { multi: true, rows: 3 })),
      f.section('Present Condition or Situation', 'Include before photographs as attachments.',
        f.field('Describe the present condition of the worksite. For an event or activity, describe your biggest obstacles.', 'plan.presentCondition', { multi: true, rows: 3 })),
      f.section('Project Phases', 'Include approximate starting and ending dates.', phases(f, 'plan.phases', true)),
      f.section('Work Processes', 'Site preparation, sizing, assembly, fastening, finishes, uses of supplies and tools, etc.', f.field('Work processes', 'plan.workProcesses', { multi: true, rows: 5 })),
      f.section('Permits and Permissions', null, f.field('What is being done to obtain them, and when will they be issued?', 'plan.permits', { multi: true, rows: 3 })),
      f.section('Materials', 'For donated items, show the value in the cost columns.', f.tipBox('plan.materials', 'the materials list'), f.costTable('Materials list', cols, 'plan.materials', colKeys, 9)),
      f.section('Supplies', null, f.costTable('Supplies list', cols, 'plan.supplies', colKeys, 8)),
      f.section('Tools', 'Tools that must be purchased or rented, and who will operate or use them.', f.costTable('Tools list', ['Tool', 'Qty', 'Unit $', 'Total $', 'Source', 'Who will operate or use it?'], 'plan.tools', ['item', 'qty', 'unitCost', 'totalCost', 'source', 'user'], 5)),
      f.section('Other Needs', null, f.costTable('Other needs list', cols, 'plan.other', colKeys, 5)),
      f.section('Revenue', 'The totals above are added up when you fill the official PDF.',
        f.row(f.field('Total to be raised $', 'plan.toBeRaised', { inputmode: 'decimal' }), f.field('Contribution from beneficiary $', 'plan.beneficiaryContribution', { inputmode: 'decimal' })),
        f.field('Describe how you will get the money for your project. Include what any helpers will do to assist with the effort and also any requests you will make for donations of supplies, materials, etc.', 'plan.fundraisingPlan', { multi: true, rows: 2, help: 'The official box has room for about one line.' })),
      f.section('Giving Leadership', null,
        f.tipBox('plan.helpers', 'helpers needed'),
        f.table('Helpers needed', ['Job to be done', 'Skills needed', 'Adult or youth', 'Helpers needed', 'Helpers so far'], 'plan.helpers', ['job', 'skills', 'adultYouth', 'needed', 'soFar']),
        f.field('What are your plans for briefing helpers?', 'plan.briefingPlan', { multi: true, rows: 2 }),
        f.field('What is your plan for communicating with your workers?', 'plan.communicationPlan', { multi: true, rows: 2 })),
      f.section('Logistics', null,
        f.field('How will the workers get to and from the site?', 'plan.workerTransport', { multi: true, rows: 2 }),
        f.field('How will you transport materials, supplies, and tools?', 'plan.materialTransport', { multi: true, rows: 2 }),
        f.field('How will you assure the tools used are in good condition, that clearance and barriers needed between users are considered, and that the tools are properly used and stored?', 'plan.toolCondition', { multi: true, rows: 2 }),
        f.row(f.field('How long will your helpers be working each day?', 'plan.workingHours', { help: 'Recommend no more than eight hours per day.' }), f.field('How will the workers be fed?', 'plan.food')),
        f.field('Where will restrooms be located?', 'plan.restrooms')),
      f.section('Safety', null,
        f.field('Will a first aid kit be needed? Where will it be kept?', 'plan.firstAid', { multi: true, rows: 2 }),
        f.field('Will any hazardous materials or chemicals be used? How will they be handled?', 'plan.hazardousMaterials', { multi: true, rows: 2 }),
        f.tipBox('plan.hazards', 'hazards'),
        f.table('Hazards', ['Potential hazard', 'What will you do to prevent problems?'], 'plan.hazards', ['hazard', 'prevention']),
        f.field('How do you plan to communicate these safety issues to your helpers?', 'plan.safetyComm', { multi: true, rows: 2 }),
        f.field('What personal protective equipment or supplies may be needed?', 'plan.ppe', { multi: true, rows: 2 }),
        f.row(f.field('When will you hold a safety briefing?', 'plan.safetyBriefing'), f.field('Who will conduct it?', 'plan.safetyBriefer')),
        f.field('Who will be your first-aid specialist?', 'plan.firstAidSpecialist'),
        f.field('How may emergency vehicles access the site?', 'plan.emergencyAccess')),
      f.section('Contingency Plans', null, f.field('What would cause postponement or cancellation of the project? What will you do should this happen?', 'plan.contingency', { multi: true, rows: 3 })),
      f.section('Project Coach Comments', null, f.field('Comments', 'plan.coachComments', { multi: true, rows: 4 })));
  }

  function renderFundraising(f) {
    return h('div', null,
      h('p', { className: 'intro' }, 'Not needed for contributions from the candidate, the candidate’s parents or relatives, the unit or its chartered organization, the unit’s parents or members, or the beneficiary. Councils may exempt some fundraisers or set dollar limits. Get approval from the beneficiary and your unit leader, then submit to your council service center at least two weeks before fundraising. Use this form, not the Unit Money-Earning Application.'),
      f.section('Fundraising Application', null,
        f.field('Describe how funds will be raised', 'fundraising.description', { multi: true, rows: 4 }),
        f.row(f.field('Proposed date the service project will begin', 'fundraising.beginDate', { type: 'date' }), f.field('Proposed dates for the fundraising efforts', 'fundraising.dates')),
        f.field('How much money do you expect to raise?', 'fundraising.howMuch', { inputmode: 'decimal' }),
        f.field('If people or companies are asked for donations of money, materials, supplies, or tools, how will this be done and who will do it?', 'fundraising.howCollected', { multi: true, rows: 4, help: 'You must attach a list of prospective donors and what they will be asked to donate (not required for an event like a car wash).' }),
        f.row(f.field('Are any contracts to be signed?', 'fundraising.contracts'), f.field('If so, by whom?', 'fundraising.contractSigner', { help: 'Contracts must be signed by a responsible adult, acting as an individual, without reference to the Boy Scouts of America. The person who signs is personally liable.' })),
        f.field('Contract details', 'fundraising.contractDetails', { multi: true, rows: 2 })));
  }

  function renderReport(f) {
    return h('div', null,
      h('p', { className: 'intro' }, 'Prepare after the project is concluded. Be prepared to discuss it at your board of review.'),
      f.section('Report Cover', null, f.row(f.field('Project start date', 'report.startDate', { type: 'date' }), f.field('Project completion date', 'report.endDate', { type: 'date' }))),
      f.section('Project Execution', null, f.row(f.field('Once planning was completed, when did the work begin?', 'report.actualStart', { type: 'date' }), f.field('When was it finished?', 'report.actualEnd', { type: 'date' }))),
      f.section('Project Description', null,
        f.field('Please provide a brief description of your project and the impact it will have', 'report.description', { multi: true, rows: 6 }),
        f.field('Describe what you did after your proposal was approved to complete the planning of your project', 'report.planning', { multi: true, rows: 4 })),
      f.section('Observations', null,
        f.field('What went well?', 'report.wentWell', { multi: true, rows: 4 }),
        f.field('What was challenging?', 'report.challenging', { multi: true, rows: 4 })),
      f.section('Changes', null, f.field('What significant changes did you make, and why? (Be brief.)', 'report.changes', { multi: true, rows: 4 })),
      f.section('Leadership', null,
        f.field('In what ways did you demonstrate leadership?', 'report.leadership', { multi: true, rows: 4 }),
        f.field('What was most difficult about being the leader?', 'report.difficultLeading', { multi: true, rows: 3 }),
        f.field('What was most rewarding about being the leader?', 'report.rewardingLeading', { multi: true, rows: 3 }),
        f.field('What did you learn about leadership, or how were your leadership skills further developed?', 'report.leadershipDeveloped', { multi: true, rows: 3 })),
      f.section('Materials, Supplies, Tools, Other', null, f.field('Were there significant shortages or overages? If so, what effect did this have?', 'report.materialsUsed', { multi: true, rows: 3 })),
      f.section('Service Project Data', 'Be sure to include yourself and the time spent on planning. There is no minimum number of hours.', f.tipBox('report.hours', 'service hours'), f.hoursTable('report.hours')),
      f.section('Funding Summary', null,
        f.field('Describe how you obtained money, materials, supplies, and other needs, including donations', 'report.fundingSummary', { multi: true, rows: 4 }),
        f.row(f.field('How much was collected?', 'report.collected', { inputmode: 'decimal' }), f.field('How much was spent?', 'report.spent', { inputmode: 'decimal' })),
        f.field('If your expenses exceeded funds available, explain why this happened, and how excess expenses were paid', 'report.excessFunds', { multi: true, rows: 2 }),
        f.field('If you had money left over at the end of your project, did you turn it over to the project beneficiary? If “No,” when will that be done, or if your beneficiary is not allowed to accept the left over funds, which charity will receive them?', 'report.leftoverMaterials', { multi: true, rows: 2 }),
        f.field('How were the donors thanked?', 'report.thanks', { multi: true, rows: 2 })));
  }

  function renderSigned() {
    return h('div', null,
      h('p', { className: 'intro' }, 'Add scans or photos of each signed page, plus permits, other attachments, and links. They go into a submission copy made on the Fill the official PDF page.'),
      W.attachmentsSection({ data: () => D, save: () => store.save(D), flush: () => store.flush(D), print: printing }));
  }

  const RENDERERS = [renderContact, renderProposal, renderPlan, renderFundraising, renderReport, renderSigned];
  const go = (i) => { tab = i; render(); window.scrollTo(0, 0); };
  const actions = {
    onSave: () => W.saveBackup(D, store),
    onShare: () => W.shareBackup(D, store),
    onOpen: () => W.openBackup(W.defaults, (data) => { D = data; store.flush(D); store.markBackedUp(); render(); }, () => D),
    onPrint: () => printDraft()
  };

  function render() {
    store.clearListeners();
    const app = document.getElementById('app');
    const f = W.createForm({ get, set });
    const refreshFill = () => {
      const ready = Boolean(String(get('proposal.projectName')).trim() || String(get('proposal.description')).trim());
      document.querySelectorAll('.btn-control.fill').forEach((a) => a.classList.toggle('quiet', !ready));
    };
    f.watch('proposal.projectName', refreshFill);
    f.watch('proposal.description', refreshFill);
    const header = h('header', null, W.saveIndicator(store),
      h('h1', null, String(get('candidate.name')).trim() || 'Eagle Project Workbook Helper'),
      h('p', { className: 'subtitle' }, (String(get('proposal.projectName')).trim() || 'Classic workbook for the Eagle Scout Service Project Workbook').slice(0, 80)));
    const nav = h('nav', { 'aria-label': 'Workbook sections' }, ...TABS.map((label, i) => h('button', { type: 'button', className: i === tab ? 'active' : null, 'aria-current': i === tab ? 'page' : null, onClick: () => go(i) }, label)));
    const last = tab === TABS.length - 1;
    const fillReady = Boolean(String(get('proposal.projectName')).trim() || String(get('proposal.description')).trim());
    const main = h('main', { id: 'main' },
      tab >= 1 && tab <= 4 ? W.askForHelp({ get, setupName: 'Contact Info' }) : null,
      RENDERERS[tab](f),
      h('div', { className: 'nav-btns' },
        h('button', { type: 'button', className: 'btn btn-prev', disabled: tab === 0, onClick: () => go(tab - 1) }, '← Previous'),
        last ? h('a', { className: 'btn btn-next', href: 'FillOfficialPDF.html' }, 'Next: fill the official PDF →')
          : h('button', { type: 'button', className: 'btn btn-next', onClick: () => go(tab + 1) }, `Next: ${TABS[tab + 1]} →`)),
      W.backupHelp({ open: tab === 0 }),
      W.controls({ store, ...actions, fillReady }),
      W.footer({ onErase: () => W.confirmErase([store, otherStore], () => { D = W.defaults(); tab = 0; render(); }) }));
    app.replaceChildren(header, W.controls({ store, ...actions, top: true, fillReady }), nav, main);
    W.stickBelow(header, nav);
    const activeTab = nav.querySelector('.active');
    if (activeTab && activeTab.scrollIntoView) activeTab.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }

  function printDraft() {
    store.flush(D);
    store.clearListeners();
    printing = true;
    const f = W.createForm({ get, set, print: true });
    W.printDraft({
      app: document.getElementById('app'),
      title: String(get('candidate.name')).trim() || 'Eagle project workbook draft',
      subtitle: String(get('proposal.projectName')).trim(),
      sections: [['Contact Information', () => renderContact(f)], ['Project Proposal', () => renderProposal(f)], ['Project Plan', () => renderPlan(f)], ['Fundraising Application', () => renderFundraising(f)], ['Project Report', () => renderReport(f)], ['Signed Pages and Attachments', () => renderSigned()]],
      restore: () => { printing = false; render(); }
    });
  }

  render();
  if (window.EagleAttachments) window.EagleAttachments.ready().then(() => { if (tab === TABS.length - 1 && !printing) render(); });
})();
