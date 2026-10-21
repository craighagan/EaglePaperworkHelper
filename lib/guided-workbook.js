/* EaglePaperworkHelper: the Guided workbook (EagleWorkbook-guided.html). Needs lib/workbook-common.js. */
(function () {
  'use strict';
  const W = window.EagleWorkbook;
  const { h } = W;
  const OFFICIAL = W.OFFICIAL_PDF_URL;

  const store = W.createStore('eagle_workbook_guided_v1');
  const classicStore = W.createStore('eagle_workbook_v1');
  let D = store.load(W.defaults) || classicStore.load(W.defaults) || W.defaults();
  if (window.EagleAttachments) window.EagleAttachments.sanitize(D, { keepPictures: false });
  let tab = 0;
  let visibleProposalPhases = 3;
  let visiblePlanPhases = 3;
  let printing = false;
  let focusAfterRender = null;

  const get = (path) => W.getPath(D, path);
  const set = (path, value) => { W.setPath(D, path, value); store.save(D); };

  const TABS = ['1. Set Up', '2. Proposal', '3. Detailed Plan', '4. Fundraising', '5. Final Report', '6. Signed Pages & Photos'];

  function officialLink(text) {
    return h('a', { href: OFFICIAL, target: '_blank', rel: 'noopener noreferrer' }, text || 'official workbook (PDF) ↗');
  }
  const note = (...children) => h('div', { className: 'guided-note' }, ...children);
  const fmt = (v) => (window.EagleOfficialPdf ? window.EagleOfficialPdf.formatDate(v) : v);

  function moreFields(summary, ...children) {
    return h('details', { className: 'more-fields', open: printing }, h('summary', null, summary), h('div', { className: 'detail-content' }, ...children));
  }

  function renderContact(f) {
    return h('div', null,
      h('div', { className: 'card checklist' },
        h('h3', { className: 'sec-title' }, 'Before you start'),
        h('ul', null,
          h('li', null, 'Read the entire ', officialLink(), '. You will sign that you did. Read its “Message to Scouts and Parents or Guardians” with a parent or guardian.'),
          h('li', null, 'Give your project beneficiary the “Navigating the Eagle Scout Service Project” pages at the end of the official workbook.'),
          h('li', null, 'Don’t start work, raise money, or get materials until your project proposal is approved.'))),
      f.section('About You', null,
        f.row(f.field('Your full legal name', 'candidate.name', { help: 'Your full legal name, not a nickname. Use the same name on your Eagle Scout Rank Application.' }), f.field('Birth date', 'candidate.dob', { type: 'date' })),
        f.row(f.field('BSA member ID', 'candidate.pid', { official: 'BSA PID number', inputmode: 'numeric' }), f.field('Life board of review date', 'candidate.borDate', { type: 'date' })),
        f.field('Home address', 'candidate.address'),
        f.row(f.field('City', 'candidate.city'), f.field('State', 'candidate.state')),
        f.row(f.field('ZIP code', 'candidate.zip', { inputmode: 'numeric' }), f.field('Email', 'candidate.email', { type: 'email' })),
        f.field('Phone', 'candidate.phone', { type: 'tel' })),
      f.section('Your Unit', null,
        f.row(f.field('Unit type (Troop, Crew, or Ship)', 'unit.type'), f.field('Unit number', 'unit.number')),
        f.row(f.field('District', 'unit.district'), f.field('Council', 'unit.council'))),
      f.contactBlock('beneficiary', 'Project Beneficiary', { nameLabel: 'Organization name', help: 'The church, school, or community group your project helps.' }),
      f.contactBlock('beneficiaryRep', 'Beneficiary’s Representative', { nameLabel: 'Contact person', help: 'The person at that organization who will approve your project.' }),
      moreFields('Add your unit leaders, coach, and council contacts when you know them',
        f.contactBlock('leader', 'Unit Leader'),
        f.contactBlock('chair', 'Unit Committee Chair'),
        f.contactBlock('advancement', 'Unit Advancement Coordinator', { help: 'If your unit has one.' }),
        f.contactBlock('coach', 'Project Coach', { help: 'A coach is optional but strongly encouraged. Ask the person who approves your proposal how coaches are designated in your council.' }),
        f.contactBlock('serviceCenter', 'Council Service Center'),
        f.contactBlock('approvalRep', 'Council or District Project Approval Representative', { help: 'Your unit leader or advancement coordinator can tell you who this will be.' })));
  }

  function phaseList(path) {
    const phases = get(path);
    const visible = printing ? phases.length : Math.min(phases.length, Math.max(visibleProposalPhases, lastFilled(phases) + 1));
    if (printing) return h('ol', { className: 'print-list' }, ...phases.filter((p) => String(p.description || '').trim()).map((p) => h('li', null, p.description)));
    const rows = phases.slice(0, visible).map((p, i) => {
      const input = h('input', { type: 'text', 'aria-label': `Phase ${i + 1}`, placeholder: 'What happens in this phase?' });
      input.value = p.description || '';
      input.addEventListener('input', (e) => set(`${path}.${i}.description`, e.target.value));
      return h('div', { className: 'phase-row' }, h('span', { className: 'phase-num', 'aria-hidden': 'true' }, `${i + 1}.`), input);
    });
    if (!printing && visible < phases.length) rows.push(h('div', { className: 'phase-actions' }, h('button', { type: 'button', className: 'btn-add', onClick: () => { visibleProposalPhases = visible + 1; focusAfterRender = `Phase ${visible + 1}`; render(); } }, '+ Add another phase')));
    return h('div', null, ...rows);
  }

  function lastFilled(list) {
    let last = -1;
    list.forEach((row, i) => { if (Object.keys(row).some((k) => k !== 'num' && String(row[k] || '').trim())) last = i; });
    return last;
  }

  function renderProposal(f) {
    const totalEl = h('p', { className: 'list-total', 'aria-live': 'polite' });
    const updateTotal = () => {
      const lib = window.EagleOfficialPdf;
      const amounts = ['materials', 'supplies', 'tools', 'other'].map((k) => (lib ? lib.parseAmount(get(`proposal.costs.${k}`)) : Number(get(`proposal.costs.${k}`)) || null));
      const bad = amounts.some((n) => Number.isNaN(n));
      const total = amounts.reduce((sum, n) => sum + (n || 0), 0);
      totalEl.textContent = bad ? 'Estimated total: use plain numbers (like 250).' : `Estimated total: $${total.toFixed(2)}`;
    };
    f.watch('proposal.costs', updateTotal);
    updateTotal();
    return h('div', null,
      note('Write a solid first draft, not a perfect essay. Your unit leader, beneficiary, unit committee, and council or district must approve the proposal before you start work. Council or district approval comes last.'),
      f.section('Name Your Project', null,
        f.field('Project name', 'proposal.projectName', { official: 'Please give a name to your project', help: 'This appears on the cover page of the official workbook.', example: 'Raised Garden Beds at Lakeside Park' })),
      f.section('Explain the Project', 'A reader should understand what you will build or improve, who it helps, and why it matters.',
        f.field('What will you do?', 'proposal.description', { multi: true, rows: 5, official: 'Briefly describe your project', help: 'Put photos in a separate document.', example: 'Plant six raised garden beds and build a path for the school’s science classes.' }),
        f.field('Why does the beneficiary need it?', 'proposal.whyNeeded', { multi: true, rows: 4, official: 'Tell how your project will be helpful to the beneficiary. Why is it needed?', example: 'The garden gives four classes a place to grow plants and take notes outdoors.' })),
      f.section('When and Who', null,
        f.row(f.field('When do you plan to begin?', 'proposal.startDate', { type: 'date' }), f.field('When do you think it will be done?', 'proposal.endDate', { type: 'date' })),
        f.field('About how many people will you need to help?', 'proposal.helperCount', { official: 'Approximately how many people will be needed to help on your project?', placeholder: 'A number, like 8', inputmode: 'numeric' }),
        f.field('Where will you find helpers?', 'proposal.helperSource', { multi: true, rows: 3, example: 'Troop members, family, friends, and volunteers from the beneficiary.' }),
        f.field('What could be hard about leading them?', 'proposal.leadershipChallenges', { multi: true, rows: 3, official: 'What do you think will be most difficult about leading them?', example: 'Keeping teams busy while they share tools and work in a small area.' })),
      f.section('What You Will Need', 'A rough list is fine here. The detailed plan comes after approval.',
        f.field('Materials (things that become part of the project)', 'proposal.materials', { multi: true, rows: 3, example: 'Pressure-treated lumber, screws, paint, and brack hardware.' }),
        f.field('Supplies (things that get used up)', 'proposal.supplies', { multi: true, rows: 3, example: 'Sandpaper, brushes, gloves, trash bags, food and refreshments for helpers.' }),
        f.field('Tools and equipment you will borrow, rent, or buy', 'proposal.tools', { multi: true, rows: 3 }),
        f.field('Other needs', 'proposal.otherNeeds', { multi: true, rows: 3, help: 'Anything that isn’t a material, supply, or tool, such as parking, postage, or services like printing or pouring concrete.' }),
        f.field('Permits and permissions', 'proposal.permits', { multi: true, rows: 3, help: 'Will you need permission or permits (such as building permits)? Who will get them, and how long will it take? Property owners should obtain and pay for permits; permitting is the beneficiary’s job, not yours.' })),
      f.section('Rough Budget', 'Estimates are fine. Include the value of donated items and sales tax. You don’t need to count tools loaned to you at no cost.',
        f.tipBox('proposal.costs', 'the rough budget'),
        f.row(f.field('Materials ($)', 'proposal.costs.materials', { inputmode: 'decimal' }), f.field('Supplies ($)', 'proposal.costs.supplies', { inputmode: 'decimal' })),
        f.row(f.field('Tools ($)', 'proposal.costs.tools', { inputmode: 'decimal' }), f.field('Other ($)', 'proposal.costs.other', { inputmode: 'decimal' })),
        totalEl,
        f.field('How will you pay for it?', 'proposal.fundraisingPlan', { multi: true, rows: 3, official: 'Fundraising: explain how you will raise the money to pay for the total costs', help: 'If you will ask for donated materials or supplies, explain how. You may need a fundraising application (stage 4), but you don’t submit it with the proposal.' })),
      f.section('Project Phases', 'Start with the big steps. Add rows only when you need them.',
        f.tipBox('proposal.phases', 'project phases'),
        phaseList('proposal.phases')),
      f.section('Logistics', null, f.field('How will people, materials, supplies, and tools get to the site?', 'proposal.logistics', { multi: true, rows: 3 })),
      f.section('Safety', 'Name the real risks and how you will avoid them. Read the Guide to Safe Scouting and the Age Guidelines for Tool Usage on scouting.org.',
        f.field('What safety issues and hazards should you plan for?', 'proposal.safety', { multi: true, rows: 4, example: 'Splinters, heavy lifting, tool use, traffic near the site, and heat.' })),
      f.section('Your Planning Steps', 'What will you do to prepare your detailed project plan?',
        f.field('Planning steps', 'proposal.planning', { multi: true, rows: 4, example: 'Meet with the beneficiary, measure the site, make a materials list, and review the plan with my coach.' })));
  }

  function planPhases(f) {
    const phases = get('plan.phases');
    const visible = printing ? phases.length : Math.min(phases.length, Math.max(visiblePlanPhases, lastFilled(phases) + 1));
    if (printing) return h('ol', { className: 'print-list' }, ...phases.filter((p) => ['description', 'start', 'end'].some((k) => String(p[k] || '').trim())).map((p) => h('li', null, [p.description, p.start || p.end ? `(${fmt(p.start) || '?'} to ${fmt(p.end) || '?'})` : ''].filter(Boolean).join(' '))));
    const rows = phases.slice(0, visible).map((p, i) => {
      const make = (key, label, attrs) => {
        // Dates typed as text in an older version stay visible as text.
        if (attrs.type === 'date' && p[key] && !W.ISO_DATE.test(p[key])) attrs = { ...attrs, type: 'text', title: 'Not in a form the date picker understands. Clear it to pick a date.' };
        const input = h('input', { 'aria-label': `Phase ${i + 1} ${label}`, ...attrs });
        input.value = p[key] || '';
        input.addEventListener('input', (e) => set(`plan.phases.${i}.${key}`, e.target.value));
        return input;
      };
      return h('div', { className: 'phase-row' }, h('span', { className: 'phase-num', 'aria-hidden': 'true' }, `${i + 1}.`),
        make('description', 'description', { type: 'text', placeholder: 'What happens in this phase?' }),
        make('start', 'start date', { type: 'date', className: 'phase-date' }),
        make('end', 'end date', { type: 'date', className: 'phase-date' }));
    });
    if (!printing && visible < phases.length) rows.push(h('div', { className: 'phase-actions' }, h('button', { type: 'button', className: 'btn-add', onClick: () => { visiblePlanPhases = visible + 1; focusAfterRender = `Phase ${visible + 1} description`; render(); } }, '+ Add another phase')));
    return h('div', null, h('div', { className: 'phase-head', 'aria-hidden': 'true' }, h('span', null, 'Phase'), h('span', null, 'Start'), h('span', null, 'End')), ...rows);
  }

  /** A short checklist of things worth recording while the work happens. Not shown in printed drafts. */
  function keepAsYouGo() {
    if (printing) return null;
    return h('details', { className: 'keep-list' },
      h('summary', null, 'Keep these as you go (makes your report easy)'),
      h('ul', null,
        h('li', null, h('strong', null, 'Hours: '), 'start a notebook or sheet on day one. Log your own planning time. On work days, use a sign-in sheet with name, time in and out, and Scout, other youth, or adult.'),
        h('li', null, h('strong', null, 'Money: '), 'take a photo of every receipt the same day. Keep one sheet for money in and money out. Write down donated items and who gave them.'),
        h('li', null, h('strong', null, 'Photos and papers: '), 'take before, during, and after photos from the same spot. Keep letters and notes from the beneficiary.'),
        h('li', null, h('strong', null, 'Thank-yous: '), 'keep your donor list as you ask, and write down when you thanked each person.')),
      h('p', { className: 'keep-note' }, 'Common advice from coaches and councils, not a rule.'));
  }

  function renderPlan(f) {
    const cost = (caption, path, limit, tool) => tool
      ? f.costTable(caption, ['Tool', 'Qty', 'Unit $', 'Total $', 'Source', 'Who will use it?'], path, ['item', 'qty', 'unitCost', 'totalCost', 'source', 'user'], limit)
      : f.costTable(caption, ['Item', 'Description', 'Qty', 'Unit $', 'Total $', 'Source'], path, ['item', 'description', 'qty', 'unitCost', 'totalCost', 'source'], limit);
    return h('div', null,
      keepAsYouGo(),
      note('Do this after your proposal is approved and before project work begins. No one approves the plan, but your beneficiary may review it and require changes, so show it to them before work begins. Sharing it with your project coach is optional but strongly encouraged.'),
      f.section('Plan Overview', null,
        f.row(f.field('Planned start date', 'plan.startDate', { type: 'date' }), f.field('Planned completion date', 'plan.endDate', { type: 'date' }))),
      f.section('Comments From Your Proposal Review', null,
        f.field('What suggestions did the council or district representative who approved your project offer?', 'plan.reviewComments', { multi: true, rows: 3 })),
      f.section('Changes From the Proposal', 'If changes are major, confirm they are acceptable to the beneficiary and discuss them with the person who approved your proposal.',
        f.field('How will your project be different from your approved proposal?', 'plan.changesFromProposal', { multi: true, rows: 3 }),
        f.field('Will the changes make the project more, or less, helpful to the beneficiary? Explain.', 'plan.changeImpact', { multi: true, rows: 3 })),
      f.section('Present Condition', 'Put “before” photos in a separate document.',
        f.field('Describe the worksite now. For an event, describe your biggest obstacles.', 'plan.presentCondition', { multi: true, rows: 3 })),
      f.section('Project Phases', 'Look at the phases from your proposal, make changes, and add approximate start and end dates.', planPhases(f)),
      f.section('Work Processes', 'A step-by-step list: site preparation, sizing, assembly, fastening, finishes (paint, varnish), and how supplies and tools are used.',
        f.field('Work processes', 'plan.workProcesses', { multi: true, rows: 5 })),
      f.section('Permits and Permissions', 'Building, electrical, sign, or event permits; permission to use property; and so on.',
        f.field('What is being done to get them, and when will they be issued?', 'plan.permits', { multi: true, rows: 3 })),
      f.section('Materials', 'Things that become part of the project. For donated items, show the value in the cost columns. Leave Total $ blank to use Qty × Unit $.', f.tipBox('plan.materials', 'the materials list'), cost('Materials list', 'plan.materials', 9)),
      f.section('Supplies', 'Things that get used up, including food and refreshments. For donated items, show the value in the cost columns.', cost('Supplies list', 'plan.supplies', 8)),
      f.section('Tools', 'Tools and equipment that must be bought or rented (rentals go here), and who will use them.', cost('Tools list', 'plan.tools', 5, true)),
      f.section('Other Needs', 'Anything that isn’t a material, supply, or tool, such as parking, postage, or services like printing or pouring concrete.', cost('Other needs list', 'plan.other', 5)),
      f.section('Paying for the Project', 'This page and the official-PDF filler add up each list. If you later change a cost directly in the PDF, update its totals too.',
        f.row(f.field('Total to be raised ($)', 'plan.toBeRaised', { inputmode: 'decimal' }), f.field('Contribution from the beneficiary ($)', 'plan.beneficiaryContribution', { inputmode: 'decimal' })),
        f.field('How will you get the money?', 'plan.fundraisingPlan', { multi: true, rows: 2, help: 'Keep this to a sentence or two; the official box has room for one line. Include what helpers will do and any donations you will ask for.' })),
      f.section('Giving Leadership', 'Jobs to be done, skills needed, adult or youth, how many helpers you need, and how many you have so far.',
        f.tipBox('plan.helpers', 'helpers needed'),
        f.table('Helpers needed', ['Job', 'Skills needed', 'Adult or youth', 'Helpers needed', 'Helpers so far'], 'plan.helpers', ['job', 'skills', 'adultYouth', 'needed', 'soFar']),
        f.field('How will you brief helpers so they know what to do?', 'plan.briefingPlan', { multi: true, rows: 2 }),
        f.field('How will you make sure workers know where to go and park, arrive on time, and bring what they need?', 'plan.communicationPlan', { multi: true, rows: 2 })),
      f.section('Logistics', null,
        f.field('How will workers get to and from the site?', 'plan.workerTransport', { multi: true, rows: 2 }),
        f.field('How will you move materials, supplies, and tools to and from the site?', 'plan.materialTransport', { multi: true, rows: 2 }),
        f.field('How will you make sure tools are in good condition, used safely, and stored properly?', 'plan.toolCondition', { multi: true, rows: 2 }),
        f.row(f.field('How long will helpers work each day?', 'plan.workingHours', { help: 'The workbook recommends no more than eight hours per day.' }), f.field('How will workers be fed?', 'plan.food')),
        f.field('Where will restrooms be?', 'plan.restrooms')),
      f.section('Safety', null,
        f.field('Will you need a first aid kit? Where will it be kept?', 'plan.firstAid', { multi: true, rows: 2 }),
        f.field('Will you use hazardous materials or chemicals? How will they be handled?', 'plan.hazardousMaterials', { multi: true, rows: 2 }),
        f.tipBox('plan.hazards', 'hazards'),
        f.table('Hazards', ['Potential hazard', 'What you will do to prevent problems'], 'plan.hazards', ['hazard', 'prevention']),
        f.field('How will you tell your helpers about these safety issues?', 'plan.safetyComm', { multi: true, rows: 2 }),
        f.field('What protective equipment may be needed?', 'plan.ppe', { multi: true, rows: 2, example: 'Gloves, goggles, hard hats.' }),
        f.row(f.field('When will you hold a safety briefing?', 'plan.safetyBriefing'), f.field('Who will conduct it?', 'plan.safetyBriefer')),
        f.field('Who will be your first-aid specialist?', 'plan.firstAidSpecialist'),
        f.field('How can emergency vehicles reach the site?', 'plan.emergencyAccess')),
      f.section('Contingency Plans', 'What would cause postponement or cancellation of the project? What will you do should this happen?',
        f.field('Contingency plans', 'plan.contingency', { multi: true, rows: 3 })),
      f.section('Project Coach Comments', 'Write down the comments your coach gave you about your plan, if you have a coach.', f.field('Coach comments', 'plan.coachComments', { multi: true, rows: 4 })));
  }

  function renderFundraising(f) {
    return h('div', null,
      note(h('strong', null, 'You may not need this. '),
        'The application is not needed for contributions from you, your parents or relatives, your unit or its chartered organization, your unit’s parents or members, or the beneficiary. Your council may also exempt some fundraisers (such as car washes) or small amounts. Ask your council.'),
      f.section('How This Works', null,
        h('ol', { className: 'steps' },
          h('li', null, 'Read “Procedures and Limitations on Eagle Scout Service Project Fundraising” in the ', officialLink(), '.'),
          h('li', null, 'Get approval from the beneficiary and your unit leader.'),
          h('li', null, 'Submit the application to your council service center at least two weeks before you start fundraising. Use this form, not the Unit Money-Earning Application.'))),
      f.section('Fundraising Details', null,
        f.field('Describe how funds will be raised', 'fundraising.description', { multi: true, rows: 4 }),
        f.row(f.field('Proposed date the service project will begin', 'fundraising.beginDate', { type: 'date' }), f.field('Proposed dates for the fundraising', 'fundraising.dates', { help: 'Keep it short, like 11/1/25 to 11/15/25.' })),
        f.field('How much money do you expect to raise? ($)', 'fundraising.howMuch', { inputmode: 'decimal' }),
        f.field('If you will ask people or companies for donations of money, materials, supplies, or tools, how will it be done, and who will do it?', 'fundraising.howCollected', { multi: true, rows: 4, help: 'Attach a list of prospective donors and what they will be asked to donate. Not needed for an event like a car wash.' }),
        f.row(f.field('Are any contracts to be signed?', 'fundraising.contracts'), f.field('If so, by whom?', 'fundraising.contractSigner', { help: 'A responsible adult, acting as an individual, without reference to Scouting. That person is personally liable.' })),
        f.field('Contract details', 'fundraising.contractDetails', { multi: true, rows: 2 })));
  }

  function renderReport(f) {
    return h('div', null,
      note('Complete this after the work is finished. Short answers are fine. Be ready to discuss it at your board of review.'),
      keepAsYouGo(),
      f.section('Project Dates', null,
        f.row(f.field('Project start date', 'report.startDate', { type: 'date', help: 'For the report cover page.' }), f.field('Project completion date', 'report.endDate', { type: 'date' })),
        f.row(f.field('Once planning was done, when did the work begin?', 'report.actualStart', { type: 'date' }), f.field('When was it finished?', 'report.actualEnd', { type: 'date' }))),
      f.section('Project Description', null,
        f.field('Briefly describe your project and the impact it will have', 'report.description', { multi: true, rows: 6 }),
        f.field('What did you do after your proposal was approved to complete the planning?', 'report.planning', { multi: true, rows: 4 })),
      f.section('Observations', null,
        f.field('What went well?', 'report.wentWell', { multi: true, rows: 4 }),
        f.field('What was challenging?', 'report.challenging', { multi: true, rows: 4 })),
      f.section('Changes', null, f.field('What significant changes did you make from the original proposal, and why? Be brief.', 'report.changes', { multi: true, rows: 4 })),
      f.section('Leadership', null,
        f.field('In what ways did you demonstrate leadership?', 'report.leadership', { multi: true, rows: 4 }),
        f.field('What was most difficult about being the leader?', 'report.difficultLeading', { multi: true, rows: 3 }),
        f.field('What was most rewarding about being the leader?', 'report.rewardingLeading', { multi: true, rows: 3 }),
        f.field('What did you learn about leadership, or how did your leadership skills develop?', 'report.leadershipDeveloped', { multi: true, rows: 3 })),
      f.section('Materials, Supplies, Tools, Other', null,
        f.field('Were there significant shortages or overages? If so, what effect did this have?', 'report.materialsUsed', { multi: true, rows: 3 })),
      f.section('Service Hours', 'Be sure to include yourself and the time you spent planning. There is no minimum number of hours.', f.tipBox('report.hours', 'service hours'), f.hoursTable('report.hours')),
      f.section('Funding Summary', null,
        f.field('How did you get the money, materials, supplies, and other needs (including donations)?', 'report.fundingSummary', { multi: true, rows: 4 }),
        f.row(f.field('How much was collected? ($)', 'report.collected', { inputmode: 'decimal' }), f.field('How much was spent? ($)', 'report.spent', { inputmode: 'decimal' })),
        f.field('If you spent more than you collected, why did that happen, and how were the extra expenses paid?', 'report.excessFunds', { multi: true, rows: 2 }),
        f.field('If money was left over, did you give it to the beneficiary? If not, when will you, or which charity will receive it?', 'report.leftoverMaterials', { multi: true, rows: 2 }),
        f.field('How were the donors thanked?', 'report.thanks', { multi: true, rows: 2 })));
  }

  const filled = (...paths) => paths.filter((p) => String(get(p)).trim()).length;
  // The same lists "Your path" uses (lib/journey.js), so the two counts agree.
  const KEY = (window.EagleJourney && window.EagleJourney.PATHS) || { proposal: [], plan: [], report: [] };
  const STAGES = [
    { title: 'Set up your project', next: 'Read the official workbook, then add your information and your beneficiary.', paths: ['candidate.name', 'candidate.email', 'unit.number', 'contacts.beneficiary.name', 'contacts.beneficiaryRep.name'] },
    { title: 'Draft your proposal', next: 'Write enough for your unit leader and beneficiary to understand the project and its benefit.', paths: KEY.proposal },
    { title: 'Build the detailed plan', next: 'Start after your proposal is approved.', paths: KEY.plan },
    { title: 'Fundraising, if needed', next: 'Check with your council whether you need this before you ask anyone for donations.', paths: ['fundraising.description', 'fundraising.beginDate', 'fundraising.howMuch'] },
    { title: 'Finish the report', next: 'Complete after the project work is done.', paths: KEY.report },
    { title: 'Add signed pages, photos, and attachments', next: 'As each page is signed, scan or photograph it and add it here. Add project photos, permits, and links too.', paths: [], summary: () => W.attachmentsSummary(D) }
  ];

  function stageCard(i) {
    const s = STAGES[i], done = filled(...s.paths), total = s.paths.length;
    if (s.summary) {
      return h('section', { className: 'stage-card', 'aria-labelledby': 'stage-title' },
        h('h2', { id: 'stage-title' }, s.title), h('p', { className: 'next-step' }, 'Next: ' + s.next),
        h('div', { className: 'stage-meta' }, h('span', { className: 'status-pill' }, s.summary())));
    }
    return h('section', { className: 'stage-card', 'aria-labelledby': 'stage-title' },
      h('h2', { id: 'stage-title' }, s.title), h('p', { className: 'next-step' }, 'Next: ' + s.next),
      h('div', { className: 'stage-meta' }, h('span', { className: 'status-pill' }, `${done} of ${total} basics done`),
        h('div', { className: 'progress', role: 'progressbar', 'aria-label': 'Basics done', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done) }, h('span', { style: `width:${Math.round((done / total) * 100)}%` }))));
  }

  function renderSigned() {
    const refreshSummary = () => {
      const text = W.attachmentsSummary(D);
      document.querySelectorAll('.stage-card .status-pill').forEach((el) => { el.textContent = text; });
      const tabButton = document.querySelectorAll('nav button')[TABS.length - 1];
      if (tabButton) tabButton.title = text;
    };
    return W.attachmentsSection({ data: () => D, save: () => store.save(D), flush: () => store.flush(D), print: printing, onChange: refreshSummary });
  }

  const RENDERERS = [renderContact, renderProposal, renderPlan, renderFundraising, renderReport, renderSigned];
  const go = (i) => { tab = i; render(); window.scrollTo(0, 0); };

  const actions = {
    onSave: () => W.saveBackup(D, store),
    onShare: () => W.shareBackup(D, store),
    onOpen: () => W.openBackup(W.defaults, (data) => { D = data; store.resume(); store.flush(D); store.markBackedUp(D); render(); }, () => D),
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
    const header = h('header', null,
      W.saveIndicator(store),
      h('h1', null, String(get('candidate.name')).trim() || 'Eagle Project Workbook Helper'),
      h('p', { className: 'subtitle' }, (String(get('proposal.projectName')).trim() || 'Guided workbook for the Eagle Scout Service Project Workbook').slice(0, 80)));
    const nav = h('nav', { 'aria-label': 'Workbook stages' }, ...TABS.map((label, i) => h('button', {
      type: 'button', className: i === tab ? 'active' : null, 'aria-current': i === tab ? 'step' : null,
      title: STAGES[i].summary ? STAGES[i].summary() : `${filled(...STAGES[i].paths)} of ${STAGES[i].paths.length} basics done`, onClick: () => go(i)
    }, label)));
    const last = tab === TABS.length - 1;
    const fillReady = Boolean(String(get('proposal.projectName')).trim() || String(get('proposal.description')).trim());
    const main = h('main', { id: 'main' },
      stageCard(tab),
      tab === 0 ? W.journeyCard({ data: () => D, set, tabs: { proposal: TABS[1], plan: TABS[2], report: TABS[4], signed: TABS[5] } }) : null,
      tab >= 1 && tab <= 4 ? W.askForHelp({ get, setupName: 'Set Up' }) : null,
      RENDERERS[tab](f),
      h('div', { className: 'nav-btns' },
        h('button', { type: 'button', className: 'btn btn-prev', disabled: tab === 0, onClick: () => go(tab - 1) }, '← Previous'),
        last ? h('a', { className: 'btn btn-next', href: 'FillOfficialPDF.html' }, 'Next: fill the official PDF →')
          : h('button', { type: 'button', className: 'btn btn-next', onClick: () => go(tab + 1) }, `Next: ${TABS[tab + 1]} →`)),
      W.backupHelp({ open: tab === 0 }),
      W.controls({ store, ...actions, fillReady }),
      W.footer({ onErase: () => W.confirmErase([store, classicStore], () => { D = W.defaults(); tab = 0; render(); }) }));
    app.replaceChildren(header, W.controls({ store, ...actions, top: true, fillReady }), nav, main);
    W.stickBelow(header, nav);
    const activeTab = nav.querySelector('.active');
    if (activeTab && activeTab.scrollIntoView) activeTab.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    if (focusAfterRender) { const target = document.querySelector(`[aria-label="${focusAfterRender}"]`); focusAfterRender = null; if (target) target.focus(); }
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
      sections: [['Contact Information', () => renderContact(f)], ['Project Proposal', () => renderProposal(f)], ['Project Plan', () => renderPlan(f)], ['Fundraising Application', () => renderFundraising(f)], ['Project Report', () => renderReport(f)], ['Signed Pages, Photos, and Attachments', () => renderSigned()]],
      restore: () => { printing = false; render(); }
    });
  }

  render();
  // Load saved pictures, then redraw if the Signed Pages & Photos tab is showing.
  if (window.EagleAttachments) window.EagleAttachments.ready().then(() => { if (tab === TABS.length - 1 && !printing) render(); });
})();
