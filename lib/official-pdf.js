/*
 * EaglePaperworkHelper: fill the official Eagle Scout Service Project
 * Workbook (No. 2023a) from a workbook backup file (JSON).
 *
 * Works in a browser (attaches window.EagleOfficialPdf) and in Node
 * (module.exports), so the page and the tests run the same code.
 *
 * The caller supplies pdf.js (vendor/pdfjs). The official PDF is encrypted
 * with "fill forms: allowed". pdf.js writes the answers and how they look as
 * an update appended to the original file, so its pages, artwork,
 * encryption, and permissions stay exactly as published.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EagleOfficialPdf = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WORKBOOK_VERSION = '2023a';
  const OFFICIAL_PDF_URL = 'https://www.scouting.org/wp-content/uploads/2023/01/EagleProjectWorkbook2023a.pdf';
  const OFFICIAL_PAGE_URL = 'https://www.scouting.org/programs/scouts-bsa/advancement-and-awards/eagle-scout-workbook/';
  // SHA-256 of the file published at OFFICIAL_PDF_URL (checked October 2026).
  const OFFICIAL_SHA256 = ['94109cd6f6d50ff9f5c1dc3bed2f03fb74ffe856526b0b08c4ba7b888a23d04e'];
  const MAX_PDF_BYTES = 50 * 1024 * 1024;
  const NOT_WORKBOOK = `This PDF is not the official Eagle Scout Service Project Workbook No. ${WORKBOOK_VERSION}. Use “Get the official PDF for me,” or download the official PDF from scouting.org and choose that file.`;

  // Fields that identify the 2023a workbook. If any is missing, the user chose
  // a different PDF and we refuse rather than silently filling nothing.
  // (Despite the name, these are not signature boxes: they are fields that only exist in workbook 2023a.)
  const SIGNATURE_FIELDS = [
    'Workbook-EagleName', 'Workbook-ProjectName', 'Proposal-ProjectDescription',
    'Plan-MaterialItem1', 'FundApp-Description', 'Report-TotalHours'
  ];

  // Workbook contact keys -> official PDF field prefixes.
  const CONTACTS = [
    ['leader', 'Contact-Leader'], ['chair', 'Contact-CC'], ['advancement', 'Contact-Adv'],
    ['beneficiary', 'Contact-Bene'], ['beneficiaryRep', 'Contact-Rep'],
    ['serviceCenter', 'Contact-Service'], ['approvalRep', 'Contact-Appr'], ['coach', 'Contact-Coach']
  ];

  // Unit type -> radio export values. "Trooop" is spelled that way in the official PDF.
  const UNIT_RADIOS = {
    troop: { unit: 'Proposal-Trooop', leader: 'Proposal-Scoutmaster', fund: 'Fund-Troop' },
    crew: { unit: 'Proposal-Crew', leader: 'Proposal-CrewAdvisor', fund: 'Fund-Crew' },
    ship: { unit: 'Proposal-Ship', leader: 'Proposal-Skipper', fund: 'Fund-Ship' }
  };

  // Printed names beside approval signatures. Signatures and dates are never filled.
  const APPROVAL_NAME_FIELDS = ['Proposal-SMName', 'Proposal-CCName', 'Proposal-BeneName', 'Proposal-BSAName', 'Report-ApprovalBeneName', 'Report-ApprovalSMName'];

  // Characters the PDF's built-in fonts can print (WinAnsi). Anything else
  // (emoji, most non-Latin scripts) is saved but may not appear when printed.
  const PRINTABLE = /^[\n\x20-\x7e\xa0-\xff\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc]*$/;

  /* ------------------------------------------------------------------ */
  /* Values                                                              */
  /* ------------------------------------------------------------------ */

  /** Text of a primitive value; objects, arrays, and other types become "". */
  function str(value) {
    if (typeof value === 'string') return value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
  }

  function pick(data, path) {
    return path.split('.').reduce((obj, key) => (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined), data);
  }

  const MAX_ROWS = 100; // More rows than any official list holds; caps hostile or broken backups.
  function rows(data, path) {
    const value = pick(data, path);
    return Array.isArray(value) ? value.slice(0, MAX_ROWS).map((row) => (row && typeof row === 'object' && !Array.isArray(row) ? row : {})) : [];
  }

  const hasValue = (row) => Object.keys(row).some((key) => key !== 'num' && key !== 'cat' && str(row[key]));

  /** "2025-10-01" (browser date input) -> "10/1/2025"; other text is kept as typed. */
  function formatDate(value) {
    const text = str(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return text;
    const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    const real = d.getUTCFullYear() === Number(match[1]) && d.getUTCMonth() === Number(match[2]) - 1 && d.getUTCDate() === Number(match[3]);
    return real ? `${Number(match[2])}/${Number(match[3])}/${match[1]}` : text;   // an impossible date (2/30) is kept as typed
  }

  /** A number for "$1,250.50", ".50", or "20"; null for blank; NaN for anything else (including "12,50"). */
  function parseAmount(value) {
    const text = str(value).replace(/^(-?)\$\s*/, '$1').replace(/\s+/g, '');
    if (!text) return null;
    if (/^-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$|^-?\.\d+$/.test(text)) {
      const n = Number(text.replace(/,/g, ''));
      return Math.abs(n) < 1e15 ? n : NaN;   // beyond this a dollar amount is a typo and would print as 1e+23
    }
    return NaN;
  }

  function formatMoney(amount) {
    const cents = Math.round(amount * 100) / 100;
    const fixed = Math.abs(cents).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (cents < 0 ? '-$' : '$') + fixed;   // -0.001 is $0.00, not -$0.00
  }

  /** Like money(), but a unit price with fractions of a cent (0.125) is kept as typed, so Qty × Unit still adds up. */
  function unitMoney(value) {
    const amount = parseAmount(value);
    if (amount === null || Number.isNaN(amount)) return str(value);
    return Math.round(amount * 100) / 100 === amount ? formatMoney(amount) : `$${str(value).replace(/^\$\s*/, '')}`;
  }

  /** Format an entered amount as money, or keep the text if it is not a plain amount. */
  function money(value) {
    const amount = parseAmount(value);
    return amount === null || Number.isNaN(amount) ? str(value) : formatMoney(amount);
  }

  const round2 = (n) => Math.round(n * 100) / 100;

  /**
   * The cost of one list row.
   * amount: the typed Total $, else Qty x Unit $; null if no cost was entered;
   *         NaN if a cost was entered but cannot be added up.
   * computed: Qty x Unit $ when both are plain numbers (to compare with a typed total).
   * problem: why amount is NaN ("notNumber" or "noQty").
   */
  function rowCost(row) {
    const qty = parseAmount(row.qty);
    const unit = parseAmount(row.unitCost);
    const typed = parseAmount(row.totalCost);
    const computed = qty !== null && unit !== null && !Number.isNaN(qty) && !Number.isNaN(unit) ? round2(qty * unit) : null;
    if (typed !== null) return { amount: Number.isNaN(typed) ? typed : round2(typed), computed, problem: Number.isNaN(typed) ? 'notNumber' : null };
    if (unit === null) return { amount: null, computed: null, problem: null }; // No cost entered (for example, borrowed).
    if (Number.isNaN(unit) || Number.isNaN(qty)) return { amount: NaN, computed: null, problem: 'notNumber' };
    if (qty === null) return { amount: NaN, computed: null, problem: 'noQty' };
    return { amount: computed, computed, problem: null };
  }

  /** Back-compatible helper: the row's amount (number, null, or NaN). */
  function rowTotal(row) {
    return rowCost(row).amount;
  }

  /**
   * Add up numbers, where null means "not entered" and NaN means "cannot be added".
   * Returns { total, invalid }: total is null when nothing was entered or any entry is invalid.
   */
  function sum(numbers) {
    let total = 0;
    let any = false;
    for (const n of numbers) {
      if (n === null) continue;
      if (Number.isNaN(n)) return { total: null, invalid: true };
      total += n;
      any = true;
    }
    return { total: any ? round2(total) : null, invalid: false };
  }

  function parseCount(value) {
    const text = str(value).replace(/\s+/g, '');
    if (!text) return null;
    if (/^(\d{1,3}(,\d{3})+|\d+)(\.\d*)?$|^\.\d+$/.test(text)) return Number(text.replace(/,/g, ''));   // 5, 5., .5, 1,200, 2.5
    return NaN;
  }

  /** A whole number (a head count): 12 or 1,200; NaN for 2.5 or .5; null for blank. */
  function parseWhole(value) {
    const text = str(value).replace(/\s+/g, '');
    if (!text) return null;
    return /^(\d{1,3}(,\d{3})+|\d+)$/.test(text) ? Number(text.replace(/,/g, '')) : NaN;
  }

  /** The grand total of hours for the six rows the official PDF has. Used by the page and the filler, so they agree. */
  function hoursTotal(hours) {
    const rows = (Array.isArray(hours) ? hours : []).slice(0, 6);
    const any = rows.some((row) => row && str(row.h));
    const result = sum(rows.map((row) => parseCount(row && row.h)));
    return { total: result.total, invalid: result.invalid, any };
  }

  function unitKey(type) {
    const text = str(type).toLowerCase();
    if (text.startsWith('troop')) return 'troop';
    if (text.startsWith('crew')) return 'crew';
    if (text.startsWith('ship')) return 'ship';
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Mapping                                                             */
  /* ------------------------------------------------------------------ */

  const COST_TABLES = [
    { path: 'plan.materials', limit: 9, total: 'Plan-MatTotalCost', summary: 'Plan-Total1', label: 'Materials list',
      cols: { item: 'Plan-MaterialItem', description: 'Plan-MaterialDesc', qty: 'Plan-MatQuan', unitCost: 'Plan-MatUnit', totalCost: 'Plan-MatTotal', source: 'Plan-MatSource' } },
    { path: 'plan.supplies', limit: 8, total: 'Plan-SupplyTotalCost', summary: 'Plan-Total2', label: 'Supplies list',
      cols: { item: 'Plan-SupplyItem', description: 'Plan-SupplyDescription', qty: 'Plan-SupplyQuan', unitCost: 'Plan-SupplyUnit', totalCost: 'Plan-SupplyTotal', source: 'Plan-SupplySource' } },
    { path: 'plan.tools', limit: 5, total: 'Plan-ToolTotalCost', summary: 'Plan-Total3', label: 'Tools list',
      cols: { item: 'Plan-Tool', qty: 'Plan-ToolQuan', unitCost: 'Plan-ToolUnit', totalCost: 'Plan-ToolTotal', source: 'Plan-ToolSource', user: 'Plan-ToolUser' } },
    { path: 'plan.other', limit: 5, total: 'Plan-OtherTotalCost', summary: 'Plan-Total4', label: 'Other needs list',
      cols: { item: 'Plan-Other', description: 'Plan-OtherDesc', qty: 'Plan-OtherQuan', unitCost: 'Plan-OtherUnit', totalCost: 'Plan-OtherTotal', source: 'Plan-OtherSource' } }
  ];

  /**
   * Totals for one list, using the same rules as the official-PDF export.
   * Returns { total, invalid, notes } where notes explain rows that could not be added up.
   */
  function listTotal(list, label, limit) {
    const notes = [];
    const amounts = [];
    (Array.isArray(list) ? list : []).slice(0, limit || Infinity).forEach((raw, i) => {
      const row = raw && typeof raw === 'object' ? raw : {};
      const cost = rowCost(row);
      amounts.push(cost.amount);
      if (cost.problem === 'notNumber') notes.push(`${label}, row ${i + 1}: Qty, Unit $, or Total $ is not a plain number, so the list total was left blank. Use numbers only, like 12.50.`);
      else if (cost.problem === 'noQty') notes.push(`${label}, row ${i + 1}: has a Unit $ but no Qty, so the list total was left blank.`);
      else if (cost.computed !== null && cost.amount !== null && Math.abs(cost.amount - cost.computed) > 0.005) {
        notes.push(`${label}, row ${i + 1}: Total $ (${formatMoney(cost.amount)}) does not equal Qty × Unit $ (${formatMoney(cost.computed)}).`);
      }
    });
    const result = sum(amounts);
    return { total: result.total, invalid: result.invalid, notes };
  }

  /**
   * Map a workbook backup to official PDF field values.
   * Returns { text: {fieldName: string}, radio: {fieldName: exportValue}, notes: [string] }.
   * Blank answers are omitted so the PDF stays blank where the Scout wrote nothing.
   * options.projectName overrides proposal.projectName; options.skipApprovalNames leaves
   * the printed names beside approval signatures blank.
   */
  function buildFieldValues(data, options = {}) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The backup file is empty or is not a workbook backup.');
    const text = {};
    const radio = {};
    const notes = [];
    const put = (field, value) => { const v = str(value); if (v) text[field] = v; };
    const get = (path) => pick(data, path);

    // Cover and section title pages.
    const projectName = str(options.projectName !== undefined ? options.projectName : get('proposal.projectName'));
    put('Workbook-EagleName', get('candidate.name'));
    put('Workbook-EagleNameCopy', get('candidate.name'));
    put('Workbook-ProjectName', projectName);
    put('Workbook-ProjectNameCopy', projectName);

    // Contact information.
    put('Contact-EagleDOB', formatDate(get('candidate.dob')));
    put('Contact-EaglePID', get('candidate.pid'));
    put('Contact-EagleEmail', get('candidate.email'));
    put('Contact-EagleAddress', get('candidate.address'));
    put('Contact-EagleCity', get('candidate.city'));
    put('Contact-EagleState', get('candidate.state'));
    put('Contact-EagleZip', get('candidate.zip'));
    put('Contact-EaglePHone', get('candidate.phone'));
    put('Contact-EagleBOR', formatDate(get('candidate.borDate')));
    put('Contact-Unit', get('unit.number'));
    put('Contact-District', get('unit.district'));
    put('Contact-Council', get('unit.council'));
    const unit = unitKey(get('unit.type'));
    if (unit) {
      radio['Proposal-UnitType'] = UNIT_RADIOS[unit].unit;
      radio['Proposal-LeaderType'] = UNIT_RADIOS[unit].leader;
      radio['Fund-UnitType'] = UNIT_RADIOS[unit].fund;
    } else if (str(get('unit.type'))) {
      notes.push(`Unit type "${str(get('unit.type'))}" is not Troop, Crew, or Ship, so no unit or leader box was checked.`);
    }
    for (const [key, prefix] of CONTACTS) {
      const c = get(`contacts.${key}`) || {};
      put(`${prefix}Name`, c.name);
      put(`${prefix}Phone`, c.phone);
      put(`${prefix}Address`, c.address);
      put(`${prefix}City`, c.city);
      put(`${prefix}State`, c.state);
      put(`${prefix}Zip`, c.zip);
      put(`${prefix}Email`, c.email);
    }

    // Proposal.
    put('Proposal-ProjectDescription', get('proposal.description'));
    put('Proposal-WhyNeeded', get('proposal.whyNeeded'));
    put('Proposal-ProjectStart', formatDate(get('proposal.startDate')));
    put('Proposal-ProjectEnd', formatDate(get('proposal.endDate')));
    put('Proposal-HowMany', get('proposal.helperCount'));
    put('Proposal-WhereRecruit', get('proposal.helperSource'));
    put('Proposal-Leadership', get('proposal.leadershipChallenges'));
    put('Proposal-Materials', get('proposal.materials'));
    put('Proposal-Supplies', get('proposal.supplies'));
    put('Proposal-Tools', get('proposal.tools'));
    put('Proposal-OtherNeeds', get('proposal.otherNeeds'));
    put('Permits and Permissions', get('proposal.permits'));
    const costKeys = ['materials', 'supplies', 'tools', 'other'];
    const costFields = ['Proposal-MaterialsCost', 'Proposal-SuppliesCost', 'Proposal-ToolsCost', 'Proposal-OtherCost'];
    costKeys.forEach((key, i) => put(costFields[i], money(get(`proposal.costs.${key}`))));
    const proposalTotal = sum(costKeys.map((key) => parseAmount(get(`proposal.costs.${key}`))));
    if (proposalTotal.total !== null) put('Proposal-TotalCost', formatMoney(proposalTotal.total));
    if (proposalTotal.invalid) notes.push('Proposal cost estimate: one of the costs is not a plain dollar amount, so Total Costs was left blank.');
    put('FundRaisingExplanation', get('proposal.fundraisingPlan'));
    rows(data, 'proposal.phases').slice(0, 10).forEach((phase, i) => put(`Proposal-Phase${i + 1}new`, phase.description));
    if (rows(data, 'proposal.phases').slice(10).some(hasValue)) notes.push('The official proposal has room for 10 phases. Phases after 10 were not copied; attach a separate page.');
    put('Proposal-Logistics', get('proposal.logistics'));
    put('Proposal-SafetyIssues', get('proposal.safety'));
    put('Proposal-ProjectPlanning', get('proposal.planning'));

    // Printed names beside approval signatures (people, not organizations).
    if (!options.skipApprovalNames) {
      put('Proposal-SMName', get('contacts.leader.name'));
      put('Proposal-CCName', get('contacts.chair.name'));
      put('Proposal-BeneName', get('contacts.beneficiaryRep.name'));
      put('Proposal-BSAName', get('contacts.approvalRep.name'));
      put('Report-ApprovalBeneName', get('contacts.beneficiaryRep.name'));
      put('Report-ApprovalSMName', get('contacts.leader.name'));
      if (APPROVAL_NAME_FIELDS.some((f) => text[f])) {
        notes.push('Printed names next to the approval signature lines (proposal and report) came from your contacts. If someone else will sign, change that contact in the workbook page, or check “Leave the printed names … blank” in Step 3, then create the PDF again.');
      }
    }

    // Project plan.
    put('Plan-StartDate', formatDate(get('plan.startDate')));
    put('Plan-EndDate', formatDate(get('plan.endDate')));
    put('Plan-Comments', get('plan.reviewComments'));
    put('Plan-Changes', get('plan.changesFromProposal'));
    put('Plan-ChangeImpact', get('plan.changeImpact'));
    put('Plan-PresentConditon', get('plan.presentCondition')); // "Conditon" matches the official field name.
    rows(data, 'plan.phases').slice(0, 10).forEach((phase, i) => {
      const start = formatDate(phase.start);
      const end = formatDate(phase.end);
      const dates = start && end ? `${start} to ${end}` : start ? `starts ${start}` : end ? `ends ${end}` : '';
      const description = str(phase.description);
      put(`Plan-Phase${i + 1}`, description && dates ? `${description} (${dates})` : description || dates);
    });
    if (rows(data, 'plan.phases').slice(10).some(hasValue)) notes.push('The official plan has room for 10 phases. Phases after 10 were not copied; attach a separate page.');
    put('Plan-WorkProcesses', get('plan.workProcesses'));
    put('Plan-PermitsandPermissions', get('plan.permits'));

    const totals = [];
    for (const table of COST_TABLES) {
      const all = rows(data, table.path);
      if (all.slice(table.limit).some(hasValue)) {
        notes.push(`The official PDF has room for ${table.limit} rows in the ${table.label.toLowerCase()}. Rows after ${table.limit} were not copied; attach a separate page.`);
      }
      all.slice(0, table.limit).forEach((row, i) => {
        const n = i + 1;
        const cost = rowCost(row);
        for (const [key, field] of Object.entries(table.cols)) {
          if (key === 'unitCost') put(`${field}${n}`, unitMoney(row[key]));
          else if (key === 'totalCost') put(`${field}${n}`, cost.amount === null || Number.isNaN(cost.amount) ? str(row.totalCost) : formatMoney(cost.amount));
          else put(`${field}${n}`, row[key]);
        }
      });
      const result = listTotal(all, table.label, table.limit);
      notes.push(...result.notes);
      totals.push(result);
      if (result.total !== null) {
        put(table.total, formatMoney(result.total));
        put(table.summary, formatMoney(result.total));
      }
    }
    const planTotal = sum(totals.map((t) => (t.invalid ? NaN : t.total)));
    if (planTotal.total !== null) put('Plan-Total', formatMoney(planTotal.total));
    put('Plan-TotaltoBeRaised', money(get('plan.toBeRaised')));
    put('Plan-Contribution', money(get('plan.beneficiaryContribution')));
    put('Plan-FundraisingPlan', get('plan.fundraisingPlan'));

    const helpers = rows(data, 'plan.helpers');
    if (helpers.slice(10).some(hasValue)) notes.push('The official PDF has room for 10 helper jobs. Jobs after 10 were not copied; attach a separate page.');
    helpers.slice(0, 10).forEach((row, i) => {
      const n = i + 1;
      put(`Plan-Job${n}`, row.job);
      put(`Plan-Skill${n}`, row.skills);
      put(`Plan-AdultYouth${n}`, row.adultYouth);
      put(`Plan-Needed${n}`, row.needed);
      put(`Plan-SoFar${n}`, row.soFar);
    });
    put('Plan-HelperBriefing', get('plan.briefingPlan'));
    put('Plan-HelperCommunication', get('plan.communicationPlan'));
    put('Plan-HelperTransport', get('plan.workerTransport'));
    put('Plan-SuppliesTransport', get('plan.materialTransport'));
    put('Plan-ToolCondition', get('plan.toolCondition'));
    put('Plan-Hours', get('plan.workingHours'));
    put('Plan-Food', get('plan.food'));
    put('Plan-Restrooms', get('plan.restrooms'));
    put('Plan-FirstAid', get('plan.firstAid'));
    put('Plan-Hazardous', get('plan.hazardousMaterials'));
    rows(data, 'plan.hazards').slice(0, 5).forEach((row, i) => {
      put(`Plan-Hazard${i + 1}`, row.hazard);
      put(`Plan-HazardPrevention${i + 1}`, row.prevention);
    });
    if (rows(data, 'plan.hazards').slice(5).some(hasValue)) notes.push('The official PDF has room for 5 hazards. Hazards after 5 were not copied; attach a separate page.');
    put('Plan-SafetyPlan', get('plan.safetyComm'));
    put('Plan-PPE', get('plan.ppe'));
    put('Plan-SafetyTime', get('plan.safetyBriefing'));
    put('Plan-SafetyBriefer', get('plan.safetyBriefer'));
    put('Plan-FirstAidSpecialist', get('plan.firstAidSpecialist'));
    put('Plan-VehicleAccess', get('plan.emergencyAccess'));
    put('Plan-Contingency', get('plan.contingency'));
    put('Plan-CoachComments', get('plan.coachComments'));

    // Fundraising application. The form repeats the candidate and beneficiary details.
    put('FundApp-telephone', get('candidate.phone'));
    put('FundApp-EagleAddress', get('candidate.address'));
    put('FundApp-EagleCity', get('candidate.city'));
    put('FundApp-EagleState', get('candidate.state'));
    put('FundApp-EagleZip', get('candidate.zip'));
    put('FundApp-EagleEmail', get('candidate.email'));
    put('FundApp-EagleUnit', get('unit.number'));
    put('FundApp-EagleDistrict', get('unit.district'));
    put('FundApp-EagleCouncil', get('unit.council'));
    for (const [key, prefix] of [['beneficiary', 'FundApp-Bene'], ['beneficiaryRep', 'FundApp-BeneRep']]) {
      const c = get(`contacts.${key}`) || {};
      put(`${prefix}Name`, c.name);
      put(`${prefix}Phone`, c.phone);
      put(`${prefix}Address`, c.address);
      put(`${prefix}City`, c.city);
      put(`${prefix}State`, c.state);
      put(`${prefix}Zip`, c.zip);
      put(`${prefix}Email`, c.email);
    }
    put('FundApp-Description', get('fundraising.description'));
    put('FundApp-BeginDate', formatDate(get('fundraising.beginDate')));
    put('FundApp-Dates', get('fundraising.dates'));
    put('FundApp-HowMuch', money(get('fundraising.howMuch')));
    put('FundApp-How', get('fundraising.howCollected'));
    put('FundApp-Contracts', get('fundraising.contracts'));
    put('FundApp-ContractSigner', get('fundraising.contractSigner'));
    put('FundApp-ContractDetails', get('fundraising.contractDetails'));
    if (str(get('fundraising.howCollected'))) {
      notes.push('Fundraising application: if you will ask people or companies for donations, attach a list of prospective donors and what each will be asked to donate (not needed for an event like a car wash).');
    }

    // Project report.
    put('Report-StartDate', formatDate(get('report.startDate')));
    put('Report-EndDate', formatDate(get('report.endDate')));
    put('Report-ActualStartDate', formatDate(get('report.actualStart')));
    put('Report-ActualEndDate', formatDate(get('report.actualEnd')));
    put('Report-Description', get('report.description'));
    put('Report-Planning', get('report.planning'));
    put('Report-ObservationsGood', get('report.wentWell'));
    put('Report-ObservationsBad', get('report.challenging'));
    put('Report-Changes', get('report.changes'));
    put('Report-Leadership', get('report.leadership'));
    put('Report-LeaderDifficult', get('report.difficultLeading'));
    put('Report-LeaderRewarding', get('report.rewardingLeading'));
    put('Report-LeaderDeveloped', get('report.leadershipDeveloped'));
    put('Report-Materials', get('report.materialsUsed'));
    const hours = rows(data, 'report.hours');
    const hourFields = [
      [null, 'Report-EagleHoursPlan'], [null, 'Report-EagleHoursWork'],
      ['Report-NumYouth', 'Report-YouthHours'], ['Report-NumOtherYouth', 'Report-OtherYouthHours'],
      ['Report-NumAdults', 'Report-AdultHours'], ['Report-NumOtherAdults', 'Report-OtherAdultHours']
    ];
    hourFields.forEach(([workersField, hoursField], i) => {
      const row = hours[i] || {};
      if (workersField) put(workersField, row.w);
      put(hoursField, row.h);
    });
    if (hours.slice(0, 6).some((row) => str(row.h) || str(row.w))) {
      // Report-NumOneScout ships preset to "1" in the official PDF, so it is not written.
      const totalHours = hoursTotal(hours);
      if (totalHours.total !== null) put('Report-TotalHours', String(totalHours.total));
      if (totalHours.invalid) notes.push('Service hours: an hours entry is not a number, so the Grand Total of Hours was left blank.');
      // Both candidate rows describe the same person, so the Scout is counted once.
      const others = sum(hours.slice(2, 6).map((row) => parseWhole(row.w)));
      if (others.invalid) notes.push('Service hours: a number of workers is not a number, so the total number of workers was left blank.');
      else put('Report-TotalWorkers', String(1 + (others.total || 0)));
      if (!str((hours[0] || {}).h) && !str((hours[1] || {}).h)) notes.push('Service hours: your own planning and execution hours are blank. The workbook says to include yourself and your planning time.');
    }
    put('Report-Funding', get('report.fundingSummary'));
    put('Report-FundsCollected', money(get('report.collected')));
    put('Report-FundsSpent', money(get('report.spent')));
    put('Report-FundsExcess', get('report.excessFunds'));      // "If your expenses exceeded funds available..."
    put('Report-LeftOver', get('report.leftoverMaterials'));   // "If you had money left over..."
    put('Report-Thanks', get('report.thanks'));

    return { text, radio, notes };
  }

  /* ------------------------------------------------------------------ */
  /* Plain-language names for messages                                   */
  /* ------------------------------------------------------------------ */

  const CONTACT_WHO = { Eagle: 'your', Leader: 'unit leader', CC: 'unit committee chair', Adv: 'unit advancement coordinator', Bene: 'project beneficiary', Rep: "beneficiary's representative", Service: 'council service center', Appr: 'council or district approval representative', Coach: 'project coach' };
  const CONTACT_PART = { Name: 'name', Phone: 'phone', PHone: 'phone', Address: 'address', City: 'city', State: 'state', Zip: 'ZIP', Email: 'email', DOB: 'birth date', PID: 'BSA member ID', BOR: 'Life board of review date' };
  const TABLE_COLUMNS = [
    [/^Plan-(MaterialItem|MaterialDesc|MatQuan|MatUnit|MatTotal|MatSource)(\d+)$/, 'Materials list', { MaterialItem: 'Item', MaterialDesc: 'Description', MatQuan: 'Qty', MatUnit: 'Unit $', MatTotal: 'Total $', MatSource: 'Source' }],
    [/^Plan-(SupplyItem|SupplyDescription|SupplyQuan|SupplyUnit|SupplyTotal|SupplySource)(\d+)$/, 'Supplies list', { SupplyItem: 'Item', SupplyDescription: 'Description', SupplyQuan: 'Qty', SupplyUnit: 'Unit $', SupplyTotal: 'Total $', SupplySource: 'Source' }],
    [/^Plan-(Tool|ToolQuan|ToolUnit|ToolTotal|ToolSource|ToolUser)(\d+)$/, 'Tools list', { Tool: 'Tool', ToolQuan: 'Qty', ToolUnit: 'Unit $', ToolTotal: 'Total $', ToolSource: 'Source', ToolUser: 'Who uses it' }],
    [/^Plan-(Other|OtherDesc|OtherQuan|OtherUnit|OtherTotal|OtherSource)(\d+)$/, 'Other needs list', { Other: 'Item', OtherDesc: 'Description', OtherQuan: 'Qty', OtherUnit: 'Unit $', OtherTotal: 'Total $', OtherSource: 'Source' }],
    [/^Plan-(Job|Skill|AdultYouth|Needed|SoFar)(\d+)$/, 'Helpers needed', { Job: 'Job', Skill: 'Skills', AdultYouth: 'Adult/Youth', Needed: '# Needed', SoFar: '# So far' }],
    [/^Plan-(Hazard|HazardPrevention)(\d+)$/, 'Hazards', { Hazard: 'Potential hazard', HazardPrevention: 'Prevention' }]
  ];
  const LABELS = {
    'Workbook-EagleName': 'Your full legal name', 'Workbook-ProjectName': 'Project name', 'Workbook-EagleNameCopy': 'Your full legal name', 'Workbook-ProjectNameCopy': 'Project name',
    'Contact-Unit': 'Unit number', 'Contact-District': 'District', 'Contact-Council': 'Council', 'Contact-ServiceEmail': 'Council service center email',
    'Proposal-ProjectDescription': 'Proposal: What will you do?', 'Proposal-WhyNeeded': 'Proposal: Why does the beneficiary need it?',
    'Proposal-ProjectStart': 'Proposal: Estimated start date', 'Proposal-ProjectEnd': 'Proposal: Estimated completion date',
    'Proposal-HowMany': 'Proposal: How many helpers', 'Proposal-WhereRecruit': 'Proposal: Where will you find helpers?', 'Proposal-Leadership': 'Proposal: What could be hard about leading the group?',
    'Proposal-Materials': 'Proposal: Materials', 'Proposal-Supplies': 'Proposal: Supplies', 'Proposal-Tools': 'Proposal: Tools', 'Proposal-OtherNeeds': 'Proposal: Other needs',
    'Permits and Permissions': 'Proposal: Permits and permissions', 'FundRaisingExplanation': 'Proposal: How will you pay for it?',
    'Proposal-Logistics': 'Proposal: Logistics', 'Proposal-SafetyIssues': 'Proposal: Safety', 'Proposal-ProjectPlanning': 'Proposal: Planning steps',
    'Plan-Comments': 'Plan: Review comments', 'Plan-Changes': 'Plan: How will your project be different?', 'Plan-ChangeImpact': 'Plan: Effect of the changes',
    'Plan-PresentConditon': 'Plan: Present condition', 'Plan-WorkProcesses': 'Plan: Work processes', 'Plan-PermitsandPermissions': 'Plan: Permits',
    'Plan-TotaltoBeRaised': 'Plan: Total to be raised', 'Plan-Contribution': 'Plan: Contribution from the beneficiary', 'Plan-FundraisingPlan': 'Plan: How will you get the money?',
    'Plan-HelperBriefing': 'Plan: Briefing helpers', 'Plan-HelperCommunication': 'Plan: Communicating with workers', 'Plan-HelperTransport': 'Plan: Worker transportation',
    'Plan-SuppliesTransport': 'Plan: Material and tool transportation', 'Plan-ToolCondition': 'Plan: Tool condition and storage', 'Plan-Hours': 'Plan: Working hours',
    'Plan-Food': 'Plan: Food and water', 'Plan-Restrooms': 'Plan: Restrooms', 'Plan-FirstAid': 'Plan: First aid kit', 'Plan-Hazardous': 'Plan: Hazardous materials',
    'Plan-SafetyPlan': 'Plan: Communicating safety', 'Plan-PPE': 'Plan: Protective equipment', 'Plan-SafetyTime': 'Plan: When is the safety briefing?',
    'Plan-SafetyBriefer': 'Plan: Who conducts the safety briefing?', 'Plan-FirstAidSpecialist': 'Plan: First-aid specialist', 'Plan-VehicleAccess': 'Plan: Emergency vehicle access',
    'Plan-Contingency': 'Plan: Contingency plans', 'Plan-CoachComments': 'Plan: Coach comments', 'Plan-StartDate': 'Plan: Planned start date', 'Plan-EndDate': 'Plan: Planned completion date',
    'Proposal-TotalCost': 'Proposal: Total costs', 'Plan-MatTotalCost': 'Plan: Total cost of materials', 'Plan-SupplyTotalCost': 'Plan: Total cost of supplies',
    'Plan-ToolTotalCost': 'Plan: Total cost of tools', 'Plan-OtherTotalCost': 'Plan: Total cost of other needs', 'Plan-Total': 'Plan: Total cost',
    'Plan-Total1': 'Plan: Total materials', 'Plan-Total2': 'Plan: Total supplies', 'Plan-Total3': 'Plan: Total tools', 'Plan-Total4': 'Plan: Total other',
    'Report-TotalHours': 'Report: Grand total of hours', 'Report-TotalWorkers': 'Report: Total number of workers',
    'FundApp-Description': 'Fundraising: How funds will be raised', 'FundApp-BeginDate': 'Fundraising: Project begin date', 'FundApp-Dates': 'Fundraising: Fundraising dates',
    'FundApp-HowMuch': 'Fundraising: How much', 'FundApp-How': 'Fundraising: How donations will be requested, and by whom', 'FundApp-Contracts': 'Fundraising: Contracts',
    'FundApp-ContractSigner': 'Fundraising: Who signs contracts', 'FundApp-ContractDetails': 'Fundraising: Contract details',
    'Report-StartDate': 'Report: Project start date', 'Report-EndDate': 'Report: Project completion date', 'Report-Description': 'Report: Project description',
    'Report-Planning': 'Report: Completing the planning', 'Report-ObservationsGood': 'Report: What went well?', 'Report-ObservationsBad': 'Report: What was challenging?',
    'Report-Changes': 'Report: Changes', 'Report-Leadership': 'Report: How you led', 'Report-LeaderDifficult': 'Report: Most difficult part of leading',
    'Report-LeaderRewarding': 'Report: Most rewarding part of leading', 'Report-LeaderDeveloped': 'Report: What you learned about leadership',
    'Report-Materials': 'Report: Shortages or overages', 'Report-Funding': 'Report: How you got money and materials', 'Report-FundsExcess': 'Report: If expenses exceeded funds',
    'Report-LeftOver': 'Report: If money was left over', 'Report-Thanks': 'Report: How donors were thanked',
    'Proposal-MaterialsCost': 'Proposal: Cost of materials', 'Proposal-SuppliesCost': 'Proposal: Cost of supplies', 'Proposal-ToolsCost': 'Proposal: Cost of tools', 'Proposal-OtherCost': 'Proposal: Cost of other needs',
    'Proposal-SMName': 'Proposal: Printed name of the unit leader', 'Proposal-CCName': 'Proposal: Printed name of the unit committee chair',
    'Proposal-BeneName': 'Proposal: Printed name of the beneficiary representative', 'Proposal-BSAName': 'Proposal: Printed name of the council or district approver',
    'Report-ApprovalBeneName': 'Report: Printed name of the beneficiary representative', 'Report-ApprovalSMName': 'Report: Printed name of the unit leader',
    'FundApp-telephone': 'Fundraising: Your phone number', 'FundApp-EagleUnit': 'Fundraising: Your unit', 'FundApp-EagleDistrict': 'Fundraising: Your district', 'FundApp-EagleCouncil': 'Fundraising: Your council',
    'Report-ActualStartDate': 'Report: Actual start date', 'Report-ActualEndDate': 'Report: Actual completion date',
    'Report-EagleHoursPlan': 'Report: Your planning hours', 'Report-EagleHoursWork': 'Report: Your execution hours',
    'Report-NumYouth': 'Report: Number of registered youth members', 'Report-YouthHours': 'Report: Hours worked by registered youth members',
    'Report-NumOtherYouth': 'Report: Number of other youth', 'Report-OtherYouthHours': 'Report: Hours worked by other youth',
    'Report-NumAdults': 'Report: Number of registered adults', 'Report-AdultHours': 'Report: Hours worked by registered adults',
    'Report-NumOtherAdults': 'Report: Number of other adults', 'Report-OtherAdultHours': 'Report: Hours worked by other adults',
    'Report-FundsCollected': 'Report: Funds collected', 'Report-FundsSpent': 'Report: Funds spent',
    'Proposal-UnitType': 'Proposal: Unit type (Troop, Crew, or Ship)', 'Proposal-LeaderType': 'Proposal: Unit leader type', 'Fund-UnitType': 'Fundraising: Unit type (Troop, Crew, or Ship)'
  };

  /** "Plan: Present condition" style name for a PDF field, for messages a Scout can act on. */
  function describeField(name) {
    if (LABELS[name]) return LABELS[name];
    let m = /^(?:Contact|FundApp)-(Eagle|Leader|CC|Adv|Bene|Rep|Service|Appr|Coach|BeneRep)(Name|Phone|PHone|Address|City|State|Zip|Email|DOB|PID|BOR)$/.exec(name);
    if (m) return `${name.startsWith('FundApp') ? 'Fundraising' : 'Contacts'}: ${CONTACT_WHO[m[1] === 'BeneRep' ? 'Rep' : m[1]]} ${CONTACT_PART[m[2]]}`;
    m = /^Proposal-Phase(\d+)new$/.exec(name);
    if (m) return `Proposal: Phase ${m[1]}`;
    m = /^Plan-Phase(\d+)$/.exec(name);
    if (m) return `Plan: Phase ${m[1]}`;
    for (const [re, table, cols] of TABLE_COLUMNS) {
      m = re.exec(name);
      if (m) return `Plan: ${table}, row ${m[2]}, ${cols[m[1]]}`;
    }
    return name;
  }

  /* ------------------------------------------------------------------ */
  /* Will the text fit?                                                  */
  /* ------------------------------------------------------------------ */

  // Helvetica advance widths (1/1000 em) for ASCII 32-126, from the standard Adobe metrics.
  const HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  const LINE_FACTOR = 1.35; // pdf.js line spacing for generated appearances.

  function textWidth(text, size) {
    let units = 0;
    for (const ch of text) {
      const code = ch.codePointAt(0);
      units += code >= 32 && code <= 126 ? HELVETICA[code - 32] : 556;
    }
    return (units / 1000) * size;
  }

  /** Lines needed to show text in a box of the given width, wrapping at spaces like pdf.js does. */
  function wrappedLines(text, width, size) {
    let lines = 0;
    for (const paragraph of text.split('\n')) {
      let line = '';
      lines++;
      for (const word of paragraph.split(/(\s+)/)) {
        const next = line + word;
        if (textWidth(next.trimEnd(), size) > width) {
          if (line) lines++;
          line = word.trimStart();
          // A single word wider than the box breaks across lines.
          while (textWidth(line, size) > width && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && textWidth(line.slice(0, cut), size) > width) cut--;
            line = line.slice(cut);
            lines++;
          }
        } else line = next;
      }
    }
    return lines;
  }

  /** Whether text is likely to be cut off in a form box. Auto-sized boxes (font size 0) shrink to fit. */
  function mayOverflow(value, widget) {
    const size = widget.fontSize;
    if (!size || !widget.rect) return false;
    const width = Math.max(1, widget.rect[2] - widget.rect[0] - 4);
    const height = Math.max(1, widget.rect[3] - widget.rect[1] - 2);
    if (!widget.multiLine) return textWidth(value.replace(/\s*\n\s*/g, ' '), size) > width;
    return wrappedLines(value, width, size) > Math.max(1, Math.floor(height / (size * LINE_FACTOR)));
  }

  /* ------------------------------------------------------------------ */
  /* Filling                                                             */
  /* ------------------------------------------------------------------ */

  async function readWidgets(doc) {
    const byName = new Map();
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      for (const a of await page.getAnnotations()) {
        if (!a.fieldName) continue;
        if (!byName.has(a.fieldName)) byName.set(a.fieldName, []);
        byName.get(a.fieldName).push({
          id: a.id, page: pageNumber, rect: a.rect, multiLine: Boolean(a.multiLine),
          fontSize: a.defaultAppearanceData ? a.defaultAppearanceData.fontSize : 0,
          buttonValue: a.buttonValue, radio: Boolean(a.radioButton),
          existing: typeof a.fieldValue === 'string' ? a.fieldValue.trim() : ''
        });
      }
    }
    return byName;
  }

  async function openPdf(pdfjsLib, bytes) {
    const task = pdfjsLib.getDocument({ data: bytes, isEvalSupported: false, verbosity: 0, password: '' });
    try {
      return await task.promise;
    } catch (error) {
      await task.destroy().catch(() => {});
      if (error && error.name === 'PasswordException') throw new Error('This PDF needs a password, so it is not the official workbook. Download the official workbook again and choose that file.');
      throw new Error('This file could not be opened as a PDF. Download the official workbook again and choose that file.');
    }
  }

  /**
   * Quick check, when a PDF is chosen, that it is the 2023a workbook.
   * Returns { ok: true } or { ok: false, message }.
   */
  async function checkWorkbookPdf(pdfjsLib, pdfBytes) {
    // Hash first: pdf.js takes over the byte array when it opens the file.
    const hash = await sha256Hex(pdfBytes).catch(() => null);
    let doc;
    try { doc = await openPdf(pdfjsLib, pdfBytes); }
    catch (error) { return { ok: false, message: error.message }; }
    try {
      const widgets = await readWidgets(doc);
      if (!SIGNATURE_FIELDS.every((name) => widgets.has(name))) return { ok: false, message: NOT_WORKBOOK };
      // exact: true when this is the file Scouting America published; false when it is a changed, damaged, or newer copy; null if we can't tell.
      return { ok: true, exact: hash ? OFFICIAL_SHA256.includes(hash) : null };
    } finally { await doc.destroy(); }
  }

  async function sha256Hex(bytes) {
    const subtle = typeof crypto !== 'undefined' && crypto.subtle;
    if (!subtle) return null;
    const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
    return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Fill the official PDF.
   * @param {object} args
   * @param {object} args.pdfjsLib       pdf.js (pdfjs-dist 5.x) API object
   * @param {Uint8Array} args.pdfBytes   bytes of the official workbook PDF
   * @param {object} args.data           workbook backup
   * @param {string} [args.projectName]  project name for the cover (overrides data.proposal.projectName)
   * @param {boolean} [args.skipApprovalNames] leave the printed names beside approval signatures blank
   * @returns {Promise<{bytes: Uint8Array, report: {filled: number, totalFields: number, warnings: string[]}}>}
   */
  async function fillOfficialPdf({ pdfjsLib, pdfBytes, data, projectName, skipApprovalNames }) {
    if (!(pdfBytes instanceof Uint8Array)) throw new Error('No PDF was chosen.');
    if (pdfBytes.length > MAX_PDF_BYTES) throw new Error('This file is too large to be the official workbook. Download the official workbook again and choose that file.');
    const { text, radio, notes } = buildFieldValues(data, { projectName, skipApprovalNames });
    const warnings = [];
    const hash = await sha256Hex(pdfBytes).catch(() => null);
    if (!hash) warnings.push('This browser could not check that the PDF is the exact file published by Scouting America (this happens on websites without https). The form fields were checked.');
    else if (!OFFICIAL_SHA256.includes(hash)) warnings.push('This is not the exact file published by Scouting America. If you saved or edited it in another program, use “Get the official PDF for me” for a fresh copy and the cleanest result.');

    const doc = await openPdf(pdfjsLib, pdfBytes);
    try {
      const widgets = await readWidgets(doc);
      const missing = SIGNATURE_FIELDS.filter((name) => !widgets.has(name));
      if (missing.length) throw new Error(NOT_WORKBOOK);
      const alreadyFilled = [...widgets.entries()].some(([name, list]) => name !== 'Report-NumOneScout' && list.some((w) => w.existing && !w.radio));
      if (alreadyFilled) warnings.push('This PDF already had answers typed in. Answers from your backup replaced them, but other old answers are still there. For a clean result, start from a fresh download.');

      let filled = 0;
      const notFound = [];
      const warned = new Set();
      const warnOnce = (key, message) => { if (!warned.has(key)) { warned.add(key); warnings.push(message); } };
      for (const [name, rawValue] of Object.entries(text)) {
        const list = widgets.get(name);
        if (!list) { notFound.push(describeField(name)); continue; }
        const singleLine = list.every((w) => !w.multiLine);
        const value = singleLine ? rawValue.replace(/\s*\n\s*/g, '; ') : rawValue;
        for (const w of list) doc.annotationStorage.setValue(w.id, { value });
        filled++;
        const first = list[0];
        const label = describeField(name);
        if (list.some((w) => mayOverflow(value, w))) warnOnce(`fit:${label}`, `PDF page ${first.page}, ${label}: this answer may be too long to fit in its box. Shorten it in the workbook, or write "see attached page" and attach a page.`);
        if (!PRINTABLE.test(value)) {
          const odd = [...new Set([...value].filter((ch) => !PRINTABLE.test(ch)))].join(' ');
          warnOnce(`chars:${label}`, `PDF page ${first.page}, ${label}: the characters ${odd} are outside what the workbook's font can show. Some PDF viewers and printers will drop them or leave this box blank. Print a test page, or write those letters in by hand.`);
        }
      }
      for (const [name, exportValue] of Object.entries(radio)) {
        const list = widgets.get(name);
        if (!list || !list.some((w) => w.buttonValue === exportValue)) { notFound.push(describeField(name)); continue; }
        for (const w of list) doc.annotationStorage.setValue(w.id, { value: w.buttonValue === exportValue });
        filled++;
      }
      if (notFound.length) warnings.push(`Some answers could not be placed because this PDF is missing those boxes: ${notFound.join('; ')}. Check that you used workbook No. ${WORKBOOK_VERSION}.`);
      if (!text['Workbook-ProjectName']) warnings.push('The project name on the cover page is blank.');
      warnings.push(...notes);

      const bytes = await doc.saveDocument();
      return { bytes, report: { filled, totalFields: widgets.size, warnings } };
    } finally {
      await doc.destroy();
    }
  }


  /* ------------------------------------------------------------------ */
  /* Reading a filled workbook PDF back into a backup                    */
  /* ------------------------------------------------------------------ */

  // Boxes the filler computes from other answers. They are recomputed, not read back.
  const COMPUTED = /^(Proposal-TotalCost|Plan-(Mat|Supply|Tool|Other)TotalCost|Plan-Total\d?|Report-Total(Hours|Workers)|Report-NumOneScout)$/;
  // Copies of answers that live elsewhere (approval names, fundraising contact details). Used only if the original box is empty.
  const SECONDARY = /^(Proposal-(SM|CC|Bene|BSA)Name|Report-Approval(Bene|SM)Name|FundApp-|Workbook-(EagleName|ProjectName)Copy)/;
  const DATE_KEY = /^(dob|borDate|startDate|endDate|actualStart|actualEnd|beginDate|start|end)$/;
  const MONEY_KEY = /^(materials|supplies|tools|other|unitCost|totalCost|toBeRaised|beneficiaryContribution|howMuch|collected|spent)$/;
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  /** "10/1/2025" or "October 1, 2025" -> "2025-10-01" (for the date pickers); anything else is kept as typed. */
  const isoFromUs = (text) => {
    const two = (n) => String(n).padStart(2, '0');
    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    const real = (y, mo, d) => { const t = new Date(Date.UTC(y, mo - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d; };
    if (m && real(Number(m[3]), Number(m[1]), Number(m[2]))) return `${m[3]}-${two(m[1])}-${two(m[2])}`;
    m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(text);
    const month = m ? MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) : -1;
    if (m && month >= 0 && real(Number(m[3]), month + 1, Number(m[2]))) return `${m[3]}-${two(month + 1)}-${two(m[2])}`;
    return text;
  };
  /**
   * Work out, from the forward mapping itself, which backup path each PDF box comes from.
   * Every answer in a blank backup gets a unique marker; filling the markers shows where each one lands.
   * Returns Map(fieldName -> { path, kind: 'text' | 'date' | 'money' }), plus the phase boxes.
   */
  function reverseMap(defaults) {
    const probe = defaults();
    const marks = new Map();
    let n = 0;
    const walk = (obj, prefix, parentKey) => {
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object') { walk(value, path, key); continue; }
        if (key === 'num' || key === 'cat' || path === 'unit.type') continue;
        n++;
        let mark;
        const leaf = Array.isArray(obj) ? parentKey : key;
        if (DATE_KEY.test(leaf)) { const d = new Date(Date.UTC(2001, 0, 1) + n * 86400000); mark = d.toISOString().slice(0, 10); marks.set(formatDate(mark), { path, kind: 'date' }); }
        else if (MONEY_KEY.test(leaf) && !/^proposal\.(materials|supplies|tools)$/.test(path)) { mark = `${1000 + n}.25`; marks.set(formatMoney(Number(mark)), { path, kind: 'money' }); }
        else { mark = `Q${n}Z`; marks.set(mark, { path, kind: 'text' }); }
        obj[key] = mark;
      }
    };
    walk(probe, '');
    const map = new Map();
    const { text } = buildFieldValues(probe);
    for (const [field, value] of Object.entries(text)) {
      if (COMPUTED.test(field)) continue;
      const hit = marks.get(value);
      if (hit) map.set(field, hit);
    }
    return map;
  }

  /** Read the answers of a fillable PDF, by field name. Radio groups give their chosen export value. */
  async function readFieldValues(doc) {
    const values = new Map();
    const names = new Set();
    for (let p = 1; p <= doc.numPages; p++) {
      for (const a of await (await doc.getPage(p)).getAnnotations()) {
        if (!a.fieldName) continue;
        names.add(a.fieldName);
        if (a.radioButton) { if (a.fieldValue && a.fieldValue === a.buttonValue) values.set(a.fieldName, a.buttonValue); continue; }
        const v = typeof a.fieldValue === 'string' ? a.fieldValue.trim() : '';
        if (v && !values.has(a.fieldName)) values.set(a.fieldName, v);
      }
    }
    return { values, names };
  }

  const UNIT_FROM_RADIO = { 'Proposal-Trooop': 'Troop', 'Proposal-Crew': 'Crew', 'Proposal-Ship': 'Ship', 'Fund-Troop': 'Troop', 'Fund-Crew': 'Crew', 'Fund-Ship': 'Ship' };
  // The unit leader radio (Scoutmaster, Crew Advisor, Skipper) follows from the unit type, so it is not read separately.
  const DERIVED_RADIOS = new Set(['Proposal-LeaderType']);

  /**
   * Turn PDF box values into a workbook backup.
   * values: Map(fieldName -> text). Returns { data, read, notes }.
   */
  function backupFromValues(values, defaults) {
    const data = defaults();
    const map = reverseMap(defaults);
    const notes = [];
    let read = 0;
    const set = (path, value) => {
      const keys = path.split('.');
      let o = data;
      for (const k of keys.slice(0, -1)) o = o[k];
      o[keys[keys.length - 1]] = value;
    };
    const getv = (path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), data);
    const ordered = [...values.entries()].sort(([a], [b]) => Number(SECONDARY.test(a)) - Number(SECONDARY.test(b)));
    let unitSet = false;
    const computedOnly = [];
    for (const [field, raw] of ordered) {
      const value = str(raw);
      if (!value) continue;
      if (DERIVED_RADIOS.has(field)) continue;
      const unit = UNIT_FROM_RADIO[value];
      if (unit) {
        if (field === 'Proposal-UnitType' || !unitSet) { set('unit.type', unit); if (!unitSet) read++; unitSet = true; }
        continue;
      }
      let m = /^Plan-Phase(\d+)$/.exec(field);
      if (m) {
        const i = Number(m[1]) - 1;
        // Only text the filler wrote ("(10/1/2025 to 10/15/2025)", "starts 10/1/2025") is split off; other words stay in the description.
        const D = '(\\d{1,2}/\\d{1,2}/\\d{4})';
        const d = new RegExp(`^(.*?)\\s*\\((?:${D} to ${D}|starts ${D}|ends ${D})\\)$`).exec(value) || new RegExp(`^()(?:${D} to ${D}|starts ${D}|ends ${D})$`).exec(value);
        if (d) {
          set(`plan.phases.${i}.description`, d[1] || '');
          set(`plan.phases.${i}.start`, isoFromUs(d[2] || d[4] || ''));
          set(`plan.phases.${i}.end`, isoFromUs(d[3] || d[5] || ''));
        } else set(`plan.phases.${i}.description`, value);
        read++;
        continue;
      }
      const target = map.get(field);
      if (!target) {
        if (COMPUTED.test(field)) { if (field !== 'Report-NumOneScout') computedOnly.push(field); }
        else if (!UNIT_FROM_RADIO[value]) notes.push(field);
        continue;
      }
      if (SECONDARY.test(field) && str(getv(target.path))) continue; // The original box already filled this answer.
      set(target.path, target.kind === 'date' ? isoFromUs(value) : value);
      read++;
    }
    // A row total equal to Qty × Unit $ was computed by the filler; leave it blank so it keeps updating.
    for (const table of COST_TABLES) {
      for (const row of getv(table.path) || []) {
        const cost = rowCost({ ...row, totalCost: '' });
        if (cost.amount !== null && !Number.isNaN(cost.amount) && parseAmount(row.totalCost) === cost.amount) row.totalCost = '';
      }
    }
    // Totals are recomputed from their parts. Mention any total whose parts were not filled in.
    const totalsWithoutParts = computedOnly.filter((f) => {
      if (/^Proposal-TotalCost$/.test(f)) return !['materials', 'supplies', 'tools', 'other'].some((k) => str(getv(`proposal.costs.${k}`)));
      if (/^Report-Total/.test(f)) return !(getv('report.hours') || []).some((r) => str(r.h));
      const t = COST_TABLES.find((c) => c.total === f || c.summary === f);
      if (t) return !(getv(t.path) || []).some((r) => str(r.totalCost) || (str(r.qty) && str(r.unitCost)));
      return f === 'Plan-Total' && COST_TABLES.every((c) => !(getv(c.path) || []).some((r) => str(r.totalCost) || str(r.unitCost)));
    });
    return { data, read, unreadFields: notes, totalsWithoutParts };
  }

  /**
   * Make a workbook backup from a filled official workbook PDF (one that still has its fillable boxes).
   * Returns { data, report: { read, warnings } }.
   */
  async function readBackupFromPdf({ pdfjsLib, pdfBytes, defaults }) {
    if (!(pdfBytes instanceof Uint8Array)) throw new Error('No PDF was chosen.');
    if (pdfBytes.length > MAX_PDF_BYTES) throw new Error('This file is too large to be an Eagle workbook PDF.');
    const doc = await openPdf(pdfjsLib, pdfBytes);
    let fields;
    try {
      fields = await readFieldValues(doc);
    } finally {
      await doc.destroy();
    }
    if (!fields.names.size) throw new Error('This PDF has no fillable boxes, so its answers can’t be read. It is a printed or flattened copy, such as a submission copy or a PDF saved with Print → Save as PDF. To get your answers back, use your backup file (click “Open backup file” in a workbook page) or the filled PDF made by “Fill the official PDF.”');
    if (!SIGNATURE_FIELDS.every((f) => fields.names.has(f))) throw new Error(NOT_WORKBOOK_TO_READ);
    const answered = [...fields.values.keys()].filter((f) => !COMPUTED.test(f)); // "1" is preset in Report-NumOneScout.
    if (!answered.length) throw new Error('This workbook PDF has no answers typed in yet.');
    const { data, read, unreadFields, totalsWithoutParts } = backupFromValues(fields.values, defaults);
    const warnings = [];
    if (totalsWithoutParts.length) warnings.push(`These totals were typed in the PDF without the amounts they add up, so they were not copied: ${totalsWithoutParts.map(describeField).join('; ')}. Enter the amounts in the workbook and it adds them up.`);
    if (unreadFields.length) warnings.push(`Some boxes in the PDF are not part of the workbook pages and were not copied: ${unreadFields.map(describeField).join('; ')}.`);
    if (!str(data.proposal.projectName)) warnings.push('The project name was blank in the PDF. Add it on the Proposal page.');
    return { data, report: { read, warnings } };
  }

  const NOT_WORKBOOK_TO_READ = `This PDF is not the Eagle Scout Service Project Workbook No. ${WORKBOOK_VERSION}. If it is an older or newer workbook, type your answers into the Guided workbook instead.`;


  return {
    WORKBOOK_VERSION, OFFICIAL_PDF_URL, OFFICIAL_PAGE_URL, OFFICIAL_SHA256, SIGNATURE_FIELDS, COST_TABLES,
    buildFieldValues, fillOfficialPdf, checkWorkbookPdf, readBackupFromPdf, backupFromValues, reverseMap, describeField, listTotal,
    formatDate, formatMoney, parseAmount, parseCount, parseWhole, hoursTotal, rowTotal, rowCost, mayOverflow, wrappedLines, textWidth, str
  };
});
