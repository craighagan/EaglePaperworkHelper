/*
 * EaglePaperworkHelper: start a 2026 draft from a 2023 backup file. Only names, contacts, and unit details are copied. Each copied
 * value is flagged "Check this" until the Scout presses Checked (see lib/w26-model.js, cleanChecks and markChecked).
 *
 * Pure: plan() reads a 2023 backup file, build() makes the new 2026 draft. Nothing is written here; the page
 * (lib/w26-classic.js) saves the draft under its own 2026 key only. The 2023 file is never changed.
 *
 * Works in a browser (window.EagleW26Convert, after lib/w26-model.js) and in Node (module.exports) for the tests.
 */
(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EagleW26Convert = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const M = () => (typeof module === 'object' && module.exports ? require('./w26-model.js') : root.EagleW26);

  // Exact wording. The not-approved note, the edition messages and the flag note are checked by tests.
  // The workbook sentence is quoted word for word (QUOTES_2026.edition in lib/journey.js, checked against page 4 by a test).
  // The FAQ sentence is not in the workbook PDF: it is paraphrased and attributed to the FAQ, not quoted as official text.
  const NOT_APPROVED = 'This new draft is for the 2026 workbook (No. 512-927). The official 2026 workbook says: “You must use the current edition of this official Eagle Scout Leadership Service Project Workbook, No. 512-927, to propose, plan, execute, and summarize your project.” (Page 4.) Scouting America’s FAQ for the 2026 workbook says a Scout whose project proposal was fully approved before January 1, 2027, using the 2023 workbook, may continue using that workbook to complete the project. This new draft is not an approved project. It has only the names, contacts, and unit details you ticked. Ask your council which workbook applies to your project.';
  // The unit type when the 2023 text names no Troop, Crew, or Ship (or is blank): the 2026 box keeps its default, Troop.
  const UNIT_ROW_NOTE = 'Your 2023 file does not name one clear unit type (Troop, Crew, or Ship). The Unit Type box is set to Troop by default. Choose the unit type on this page.';
  const UNIT_NOTE = 'Check this: your 2023 backup file does not name one clear unit type (Troop, Crew, or Ship), so this box shows Troop. Choose the unit type, then press Checked.';
  // The unit type the 2023 file named (Troop, Crew, or Ship) when that row is not copied. The note does not repeat the box's
  // value: the Scout may change the box, and a repeated value would then be out of date.
  const untickedUnitNote = (named) => `Check this: your 2023 backup file names a ${named}, but you did not tick Unit Type there. Check the Unit Type box, then press Checked.`;
  // A copied unit type (its 2023 row was ticked, so the 2023 file named that unit). unit is the value the box shows now; it is
  // used only for an older flag that has no stored word.
  const copiedUnitNote = (unit) => `Check this: your 2023 backup file names a ${unit || 'Troop'}, and this value was copied. Read it, then press Checked.`;
  // The note for the flagged unit.type entry in checkThis, given the value the box shows. A copied entry (no prompt marker)
  // names the word the 2023 file held, entry.copied, so changing the box does not change the note. An older copied entry
  // without that word falls back to the box value. A prompt entry keeps its own notes: the named unit, or the blank or ambiguous prompt.
  const unitFlagNote = (entry, unit) => {
    if (entry && entry.prompt !== true) return copiedUnitNote(entry.copied || unit);
    return entry && entry.named ? untickedUnitNote(entry.named) : UNIT_NOTE;
  };
  const NOT_2023 = 'This backup file is not from the 2023 workbook (No. 2023a). Choose a backup file saved from the 2023 workbook.';
  const NOT_WORKBOOK = 'This is not an Eagle workbook backup file.';
  const CHECK_NOTE = 'Check this: copied from your 2023 backup file. Read it, fix it if it is wrong, then press Checked.';
  const ALL_CHECKED = 'All copied values are checked.';
  const MAX_BYTES = 80 * 1024 * 1024;   // the same limit as a backup file on the workbook pages

  /* One row per box that is copied: the 2023 path, the 2026 path, the label printed on 2026 page 5, the 2026 section id
     (lib/w26-model.js OFFICIAL.sections), and the section name the 2023 workbook printed. A test checks every path and label. */
  const row = (from, to, label, section, fromSection) => ({ from, to, label, section, fromSection });
  const CARRY = [
    row('candidate.name', 'candidate.name', 'Name', 'contacts.candidate', 'Eagle Scout Candidate'),
    row('candidate.address', 'candidate.address', 'Street Address', 'contacts.candidate', 'Eagle Scout Candidate'),
    row('candidate.city', 'candidate.city', 'City', 'contacts.candidate', 'Eagle Scout Candidate'),
    row('candidate.state', 'candidate.state', 'State', 'contacts.candidate', 'Eagle Scout Candidate'),
    row('candidate.email', 'candidate.email', 'Email', 'contacts.candidate', 'Eagle Scout Candidate'),
    row('candidate.phone', 'candidate.phone', 'Telephone', 'contacts.candidate', 'Eagle Scout Candidate'),
    row('unit.type', 'unit.type', 'Unit Type', 'contacts.unit', 'Current Unit Information'),
    row('unit.number', 'unit.number', 'Unit Number', 'contacts.unit', 'Current Unit Information'),
    row('unit.district', 'unit.district', 'Name of District', 'contacts.unit', 'Current Unit Information'),
    row('unit.council', 'unit.council', 'Name of Council', 'contacts.unit', 'Current Unit Information'),
    row('contacts.leader.name', 'contacts.leader.name', 'Name', 'contacts.leader', 'Unit Leader'),
    row('contacts.leader.phone', 'contacts.leader.phone', 'Telephone', 'contacts.leader', 'Unit Leader'),
    row('contacts.leader.email', 'contacts.leader.email', 'Email', 'contacts.leader', 'Unit Leader'),
    // The 2023 "Unit Committee Chair" is the 2026 "Unit Committee Representative" (confirmed by the maintainer).
    row('contacts.chair.name', 'contacts.committee.name', 'Name', 'contacts.committee', 'Unit Committee Chair'),
    row('contacts.chair.phone', 'contacts.committee.phone', 'Telephone', 'contacts.committee', 'Unit Committee Chair'),
    row('contacts.chair.email', 'contacts.committee.email', 'Email', 'contacts.committee', 'Unit Committee Chair'),
    row('contacts.beneficiary.name', 'contacts.beneficiary.name', 'Name of Organization', 'contacts.beneficiary', 'Project Beneficiary'),
    row('contacts.beneficiary.address', 'contacts.beneficiary.address', 'Street Address', 'contacts.beneficiary', 'Project Beneficiary'),
    row('contacts.beneficiary.city', 'contacts.beneficiary.city', 'City', 'contacts.beneficiary', 'Project Beneficiary'),
    row('contacts.beneficiary.state', 'contacts.beneficiary.state', 'State', 'contacts.beneficiary', 'Project Beneficiary'),
    row('contacts.beneficiary.email', 'contacts.beneficiary.email', 'Email', 'contacts.beneficiary', 'Project Beneficiary'),
    row('contacts.beneficiary.phone', 'contacts.beneficiary.phone', 'Telephone', 'contacts.beneficiary', 'Project Beneficiary'),
    row('contacts.beneficiaryRep.name', 'contacts.beneficiaryRep.name', 'Name of Representative', 'contacts.beneficiaryRep', 'Project Beneficiary Representative'),
    row('contacts.beneficiaryRep.phone', 'contacts.beneficiaryRep.phone', 'Telephone', 'contacts.beneficiaryRep', 'Project Beneficiary Representative'),
    row('contacts.beneficiaryRep.email', 'contacts.beneficiaryRep.email', 'Email', 'contacts.beneficiaryRep', 'Project Beneficiary Representative'),
    row('contacts.serviceCenter.name', 'contacts.serviceCenter.name', 'Contact Name', 'contacts.serviceCenter', 'Your Council Service Center'),
    row('contacts.serviceCenter.address', 'contacts.serviceCenter.address', 'Street Address', 'contacts.serviceCenter', 'Your Council Service Center'),
    row('contacts.serviceCenter.city', 'contacts.serviceCenter.city', 'City', 'contacts.serviceCenter', 'Your Council Service Center'),
    row('contacts.serviceCenter.state', 'contacts.serviceCenter.state', 'State', 'contacts.serviceCenter', 'Your Council Service Center'),
    row('contacts.serviceCenter.email', 'contacts.serviceCenter.email', 'Email', 'contacts.serviceCenter', 'Your Council Service Center'),
    row('contacts.serviceCenter.phone', 'contacts.serviceCenter.phone', 'Telephone', 'contacts.serviceCenter', 'Your Council Service Center'),
    row('contacts.approvalRep.name', 'contacts.approvalRep.name', 'Name of Representative', 'contacts.approvalRep', 'Council or District Project Approval Representative'),
    row('contacts.approvalRep.phone', 'contacts.approvalRep.phone', 'Telephone', 'contacts.approvalRep', 'Council or District Project Approval Representative'),
    row('contacts.approvalRep.email', 'contacts.approvalRep.email', 'Email', 'contacts.approvalRep', 'Council or District Project Approval Representative'),
    row('contacts.coach.name', 'contacts.coach.name', 'Name of Project Coach/Advisor', 'contacts.coach', 'Project Coach'),
    row('contacts.coach.phone', 'contacts.coach.phone', 'Telephone', 'contacts.coach', 'Project Coach'),
    row('contacts.coach.email', 'contacts.coach.email', 'Email', 'contacts.coach', 'Project Coach')
  ];

  /* 2023 name and contact boxes that are not copied, each with the reason. Together with CARRY these cover every
     name and contact box in the 2023 file (a test checks it). */
  const NO_ZIP = 'The 2026 workbook has no ZIP code box.';
  const NO_ADDRESS = 'The 2026 workbook has no street address box for this person.';
  const NO_CITY_STATE = 'The 2026 workbook has no city or state box for this person.';
  const LATER = 'Dates and BSA IDs are not copied. Type them into the boxes on this tab.';
  const NO_BOX = 'The 2026 workbook has no box for this.';
  // The categories named in NOT_COPIED (a test checks that each one appears there).
  const ZIP = 'ZIP codes', DATES = 'dates and BSA IDs', ADULT_ADDRESS = 'street addresses for the adults', ADULT_CITY_STATE = 'cities and states for the adults', ADVANCEMENT = 'the advancement coordinator';
  const DEFERRED = [
    { path: 'candidate.zip', why: NO_ZIP, group: ZIP },
    { path: 'candidate.dob', why: LATER, group: DATES },
    { path: 'candidate.pid', why: LATER, group: DATES },
    { path: 'candidate.borDate', why: LATER, group: DATES },
    ...['leader', 'chair', 'beneficiaryRep', 'approvalRep', 'coach'].flatMap((c) => [
      { path: `contacts.${c}.address`, why: NO_ADDRESS, group: ADULT_ADDRESS },
      { path: `contacts.${c}.city`, why: NO_CITY_STATE, group: ADULT_CITY_STATE },
      { path: `contacts.${c}.state`, why: NO_CITY_STATE, group: ADULT_CITY_STATE },
      { path: `contacts.${c}.zip`, why: NO_ZIP, group: ZIP }
    ]),
    { path: 'contacts.beneficiary.zip', why: NO_ZIP, group: ZIP },
    { path: 'contacts.serviceCenter.zip', why: NO_ZIP, group: ZIP },
    ...['name', 'phone', 'address', 'city', 'state', 'zip', 'email'].map((f) => ({ path: `contacts.advancement.${f}`, why: NO_BOX, group: ADVANCEMENT }))
  ];
  // The plain line under the rows in the disclosure. It names the same categories as DEFERRED.
  const NOT_COPIED = 'Not copied: ZIP codes, dates and BSA IDs, street addresses for the adults, cities and states for the adults, and the advancement coordinator. The 2026 workbook has no ZIP code box and no advancement coordinator box. It has no street address, city, or state box for the Scoutmaster, Unit Committee Representative, Project Beneficiary Representative, Council or District Proposal Approval Representative, or Project Coach/Advisor. Type dates and BSA IDs into the boxes on this tab.';

  /* Same rule as editionOfData in lib/workbook-common.js (a test checks they agree on the cases that matter):
     "2026" or a numeric 2026 is the 2026 workbook; no edition key with an Appendix D section is 2026; anything else is 2023a. */
  function editionOf(data) {
    if (!data || typeof data !== 'object') return '2023a';
    const e = typeof data.edition === 'number' ? String(data.edition) : (typeof data.edition === 'string' ? data.edition.trim() : '');
    if (e === '2026') return '2026';
    if (e === '' && data.appendixD && typeof data.appendixD === 'object' && !Array.isArray(data.appendixD)) return '2026';
    return '2023a';
  }
  /* Same rule as looksLikeWorkbook in lib/workbook-common.js. */
  function looksLikeWorkbook(data) {
    return Boolean(data && typeof data === 'object' && !Array.isArray(data) && data.candidate && typeof data.candidate === 'object' && data.proposal && typeof data.proposal === 'object');
  }

  /** The text at a dotted path, trimmed. Numbers become text. Anything else is ''. */
  function valueOf(data, path) {
    const v = path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), data);
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    return typeof v === 'string' ? v.trim() : '';
  }

  /** The unit type as the 2026 drop-down spells it: Troop, Crew, or Ship, when the text names exactly one of them ("Boy Scout
   Troop 42" is Troop; "Troop 3 Troop 4" is Troop too). Two different words ("Crew 9 Troop 4") give '', so the row is not copied.
   The words are the ones unitKey in lib/official-pdf.js reads. Returns '' when no unit word is named. */
  function canonicalUnit(text) {
    const words = new Set((String(text || '').match(/\b(troop|crew|ship)\b/gi) || []).map((w) => w.toLowerCase()));
    if (words.size !== 1) return '';
    const [word] = words;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  /** What the 2026 box would get, or '' when the row cannot be copied. */
  function copyValue(data, r) {
    const raw = valueOf(data, r.from);
    return r.to === 'unit.type' ? canonicalUnit(raw) : raw;
  }

  /**
   * The rows for the preview: one per CARRY box, with its value and whether it can be copied.
   * A refusal comes back as { error } with the message to show. Nothing is changed.
   */
  function plan(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: NOT_WORKBOOK };
    if (editionOf(data) !== '2023a') return { error: NOT_2023 };
    if (!looksLikeWorkbook(data)) return { error: NOT_WORKBOOK };
    const rows = CARRY.map((r) => {
      const value = copyValue(data, r);
      const raw = valueOf(data, r.from);
      let note = '';
      if (!value) note = r.to === 'unit.type' && raw ? UNIT_ROW_NOTE : 'Empty in your 2023 file.';
      return { ...r, value, available: Boolean(value), note };
    });
    return { rows };
  }

  /** The paths a row starts ticked for: every row that has a value to copy. */
  function defaultPicks(rows) {
    return (Array.isArray(rows) ? rows : []).filter((r) => r.available).map((r) => r.to);
  }

  function setAt(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    let o = obj;
    for (const k of keys) o = o[k];
    o[last] = value;
  }

  /**
   * The new 2026 draft: the empty 2026 draft plus each ticked row that has a value. Every copied value is flagged.
   * A copied unit type also stores the word the 2023 file gave (copied: 'Troop', 'Crew', or 'Ship'), so its note does not
   * change when the Scout changes the box. Attachments, links, "Your path" notes, dates, IDs and ZIP codes are never copied.
   * Reads data; does not change it.
   */
  function build(data, picks) {
    if (editionOf(data) !== '2023a') throw new Error(NOT_2023);
    if (!looksLikeWorkbook(data)) throw new Error(NOT_WORKBOOK);
    const draft = M().defaults();
    const wanted = new Set(Array.isArray(picks) ? picks : []);
    for (const r of CARRY) {
      if (!wanted.has(r.to)) continue;
      const value = copyValue(data, r);
      if (!value) continue;
      setAt(draft, r.to, value);
      draft.checkThis.push(r.to === 'unit.type' ? { path: r.to, copied: value } : { path: r.to });
    }
    // When the Unit Type row is not copied, the box keeps its 2026 default (Troop). A named Crew or Ship differs from that box, so the
    // prompt marker is set, and "named" holds the unit word the 2023 file gave. A named Troop already matches the box, so nothing is
    // flagged. A blank or ambiguous unit type gets the prompt with no name. The prompt is not a copied value: the counts leave it out,
    // and the Fill heads-up gives it its own sentence.
    if (!draft.checkThis.some((e) => e.path === 'unit.type')) {
      const named = canonicalUnit(valueOf(data, 'unit.type'));
      if (named !== 'Troop') draft.checkThis.push(named ? { path: 'unit.type', prompt: true, named } : { path: 'unit.type', prompt: true });
    }
    return draft;
  }

  /** The count line on the converter: how many values the draft will copy. */
  function convertCountText(n) {
    if (!n) return 'No values are ticked, so nothing will be copied.';
    return n === 1 ? '1 value will be copied and needs checking.' : `${n} values will be copied and need checking.`;
  }

  /** The count line on the Project Contacts tab: copied values still flagged, or that all are checked (after a copy). */
  function copyCountText(n) {
    return n === 1 ? '1 copied value still to check.' : `${n} copied values still to check.`;
  }

  return {
    NOT_APPROVED, NOT_2023, NOT_WORKBOOK, CHECK_NOTE, UNIT_NOTE, UNIT_ROW_NOTE, untickedUnitNote, copiedUnitNote, unitFlagNote, NOT_COPIED, ALL_CHECKED, MAX_BYTES,
    CARRY, DEFERRED, editionOf, looksLikeWorkbook, valueOf, canonicalUnit, copyValue,
    plan, defaultPicks, build, convertCountText, copyCountText
  };
});
