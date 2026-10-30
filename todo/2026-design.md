# 2026 workbook: design

**Status:** design, ready to build after the maintainer signs off the decisions in section 3. Nothing here is built. Written October 2026 on the official files (hashes in [2026-groundwork.md](2026-groundwork.md)). Facts were checked with the helper's own vendored pdf.js, Apple PDFKit and Poppler, not taken from memory.

Companion files:
- [2026-field-map.md](2026-field-map.md): every one of the 382 workbook field names and 28 Appendix D field names, with its kind, draft path and format, plus a paste-ready JS block. Generated, not hand-typed.
- [2026-implementation-plan.md](2026-implementation-plan.md): the step-by-step tasks, tests first, written for a careful but less experienced agent.
- Background: [2026-design-facts.md](2026-design-facts.md), [2026-pdf-workflows.md](2026-pdf-workflows.md), [2026-workbook-and-feedback.md](2026-workbook-and-feedback.md). Where they disagree with this file, this file wins (some counts in the older files came from a modified copy of the PDF).

---

## 1. Goal and limits

**Goal.** A Scout using the 2026 Eagle Scout Leadership Service Project Workbook (No. 512-927) can do everything the helper already does for 2023a: type answers in a Guided or Classic page, save a backup file, fill the official 2026 PDF and Appendix D, add signed pages and photos, and read a filled 2026 PDF back. The 2023a helper keeps working exactly as it does today.

**Limits (unchanged from the rest of the project).** Static pages, works from `file://`, classic scripts, no server, no AI, no network except pinned official-PDF URLs and the click-to-load Scoutly frame. Nothing the Scout writes leaves the browser. The helper never adds or changes a Scouting requirement.

**Not in scope.** Acrobat-only behavior (the maintainer cannot test Acrobat, so the design does not depend on it; see 4.4). Summit or Quartermaster workbooks. Moving a 2023a draft into a 2026 draft automatically (an optional carry-over of contacts is listed as a later task).

---

## 2. Facts the design rests on

All checked on the official 2026 file (`5810e017…`), October 2026.

| # | Fact | How checked |
|---|---|---|
| F1 | 22 pages, AcroForm, **not encrypted**, 446 widgets, 382 field names: 432 text, 1 drop-down, 4 radio widgets (2 groups), 9 signature fields. No document-level JavaScript. No field is read-only or required. No `MaxLen` anywhere. | pdf.js `getAnnotations`, PyMuPDF |
| F2 | The helper's vendored pdf.js fills the 2026 file correctly: one value written to a shared name fills every widget (23 copies of the Scout's name), money and date text is kept as written, the drop-down takes `Crew`, the radio group takes `Yes`, all 9 signature fields survive empty and unsigned, and the file stays fillable (446 widgets after saving). | `a scratch folder outside the repository` |
| F3 | Apple PDFKit (Preview, Safari) reads the filled values, including the drop-down; the file is not locked. Poppler shows the typed text on the right pages. | `pdfkit-check`, a Swift probe for the drop-down, `pdftotext` per page |
| F4 | **"Character limits" are box sizes.** 81 text widgets have a fixed 12 pt Helvetica font. 37 of them are multi-line with the PDF "do not scroll" flag, so text past the bottom is cut off on screen and in print; the other 44 are single-line, scroll on screen and are cut off in print. The other 351 text widgets shrink to fit. FAQ Q9: “Survey respondents disliked boxes where the font shrank to fit more text, because the small text was hard to read. The new limits fit a typical project. If a Scout needs more room, the Scout can attach extra pages.” | field flags `0x801000`, FAQ text |
| F5 | **One field, three places.** `Project Description` is the same field on page 7 (the full description, 11 lines), page 11 ("Brief Project Description… two to three sentences", 3 lines) and page 22 ("Brief Project Description… what you did", 7 lines). Whatever is in one is in all three. | widget list |
| F6 | Other shared fields: the Scout's name and project title on every page; `Scoutmaster’s Name` on pages 5, 11 (printed name under the approval) and 22; `Name of Organization` on pages 5 and 22; the proposal and plan hours reappear in the report's hours table on page 20; `Eagle Scout Candidate` (the Scout's own head count, preset to `1`) on pages 9, 15 and 20. | widget list |
| F7 | 16 calculated fields, all plain sums (`AFSimple_Calculate("SUM", …)`) plus `Difference` = collected − spent. One sum (`Project Plan Total Individuals`) also adds the text field `Project Description`, which Acrobat's number parser reads as 0. `Project Plan Total Hours` has no script. `Total Proposal Development Hours` (pages 9 and 20) has a script that also sums `Total CostRow1`, the first materials cost on page 17: a dollar amount added into an hours total. That is the official form's own defect; the final review found it by reading the script with pdf.js. Preview and Chrome run no scripts. | script dump |
| F8 | Number formats: 39 fields 2 decimals no symbol, 11 with `$`, 9 whole numbers. Date formats differ by box: `m/d/yyyy` (birth date, board of review), `mm/dd/yyyy` (the four timeline dates), `m/d/yy` (signature dates and "Date Expected"). Several fields start with values (`0`, `1`, `Troop`). | format dump, `getFieldObjects` |
| F9 | Approval area on page 11: five signatures with dates (the Scout's Candidate's Promise, “Sign here before you seek other approvals.”, and four approvals), three printed-name boxes (`Unit Committee Approval Name`, `Beneficiary Approval Name`, `District or Council Approval Name`) plus the shared `Scoutmaster’s Name`, and the beneficiary's own Yes/No ("The candidate provided me a copy of… Appendix B"). Page 22: three signatures with dates, `Beneficiary Name` and the shared `Scoutmaster’s Name`. Page 18: the Scout's plan promise. | text and widget positions |
| F10 | The workbook says: don't flatten until all signatures are on; adults may sign electronically if the council accepts it; don't certify or lock the file (page 2). Pictures go on separate pages: “Attach images on a separate page if appropriate.” (page 7), “Include photos, drawings, and other information on separate pages or in separate files.” (page 10), “before” photos and sketches: “Attach these items on a separate page rather than inserting them into the workbook.” (page 13), photographs: “Attach (or submit separately)” (page 21). Permits: “Attach copies of any permits to your workbook.” (page 17). | page 2, 7, 10, 13, 17, 21 text |
| F11 | Appendix D: 3 pages, 28 fields (25 text, 3 signatures), not encrypted. It prints the beneficiary's "Name of Organization:" and "EIN:" **with no box** to type in. "Project Description (from page 6 …)" is a section heading whose box is the one under "For what will you use the funds?". Its page references are one page early for the 2026 workbook (the description is on page 7, the Fundraising box on page 10). The money box is named `undefined`. The approvals area has a text box `Authorized Council Approval`. | widget positions, page render |
| F12 | Both new official URLs answer with `Access-Control-Allow-Origin: *`, like the 2023a URL, so "Get the official PDF for me" can work for both. | `curl -H Origin` |
| F13 | Who may stay on 2023: "A Scout whose project proposal was fully approved before January 1, 2027, using the 2023 workbook, may continue using that workbook to complete the project." (FAQ Q2) | FAQ text |
| F14 | In the current code, nothing stops a 2026 backup file from opening in a 2023a page; Erase clears every picture in the browser; the picture sweep deletes pictures that no draft key in `DRAFT_KEYS` uses. Adding 2026 drafts without changing these would lose 2026 scans. | code reading (`openBackup`, `confirmErase`, `sweep`) |

---

## 3. Decisions

Each decision has a recommendation. **The maintainer confirms them before Phase 1 starts** (Phase 0 is safe either way). If the maintainer picks the alternative, the plan says which tasks change.

| # | Decision | Recommended | Why | Alternative |
|---|---|---|---|---|
| D1 | One system or two | **Separate 2026 pages and modules; share only generic code.** 2023a files change only where a guard is needed (section 5). | The 2023a helper is tested and in use; the 2026 form differs on almost every field. Separate files keep every 2023a test meaningful and keep the change small enough to review. | One page that switches by edition (more branching in every file, higher risk of breaking 2023a). |
| D2 | How a Scout picks the edition | **On the home page**, with the FAQ sentence (F13) quoted. Each page shows a one-line banner saying which workbook it is for. Backup files and PDFs of the other edition are refused with a plain message. | No question to answer inside a page, and no way to end up with a mixed draft. | A question on a new draft (more state to test). |
| D3 | The shared description (F5) | **One box in the helper, with a note** (S5) that the official PDF repeats the answer as the "Brief Project Description" on pages 11 and 22, where only the first 3 and 7 lines show. The Fill page warns when the answer is longer than page 11's box (S7). The Report tab shows the description read-only with S6, which quotes page 19 and says that changing it also changes pages 7 and 11. A tip in Phase 4 (marked as advice) may suggest starting with a short summary. | The helper can't give one field three values; doing it per widget would make viewers disagree. Page 11 asks for "two to three sentences that summarize your project and why it is important" and page 22 for "two or three sentences to describe what you did for the beneficiary", but the form gives them one box with page 7. The helper states the facts and leaves the choice to the Scout and the adults. | Leave it to the Scout to notice (the cut-off on page 11 is silent). |
| D4 | Long answers (F4) | **Warn, never block.** A fit line under each fixed-size box (S21), and Fill-page warnings for any answer that may not fit (S8a, S8b). Suggest attaching a page, which the workbook (pages 7, 14, 16, 17) and FAQ Q9 allow; writing "see attached page" in the box is the helper's own suggestion. | Matches the form's own rule; blocking would stop a Scout whose estimate is slightly off. The estimate uses the same text measurement as the 2023a overflow check. | Enforce a character count (no number is published; it would be invented). |
| D5 | Totals (F7) | **The helper writes every total with the form's own formula** (and treats the text field in F7 as 0, as Acrobat does). It also writes the two totals the form leaves blank. | Preview and Chrome show what was written; Acrobat recalculates to the same numbers for every total except `Total Proposal Development Hours`, which also adds the first materials cost (see F7). The Fill report says so (note S13) when that cost is not zero. Acrobat was not run. | Leave totals to Acrobat (blank in Preview and Chrome). |
| D6 | Number and date formats (F8) | **Numbers:** write plain values (`1234.50`, `12`), no `$`, no commas. **Dates:** write in each box's own format. If an answer is not a plain number or date, write it as typed and warn. | Plain values read well in every viewer and stay numbers for Acrobat's sums. Writing as typed keeps the Scout's words. | Write `$1,234.50` (looks nicer in Preview, but Acrobat's sums may read it as 0). |
| D7 | Signatures and approval names (F9) | **Never fill a signature field, the date beside a signature, the beneficiary's Yes/No, or Appendix D's `Authorized Council Approval` box.** Fill the four separate printed-name boxes from the contacts, with the same "Leave the printed names blank" opt-out as 2023a. The opt-out text (S13) says the Scoutmaster's name still appears on pages 11 and 22, and the beneficiary organization on page 22, because the official PDF repeats them from page 5. | Same rule 6 as 2023a. The repeats are built into the official form; the helper can't change them without blanking page 5. | Leave all printed names blank (the Scout writes them by hand or the approver types them). |
| D8 | Signed pages, photos and the submission copy (F10) | **The filled 2026 PDF stays untouched and signable.** Photos, permits, extra pages and links go into a separate "attachments PDF" (the drawn-page writer with no workbook pages). The existing drawn whole-workbook copy with scanned signed pages stays available as an option for Scouts whose adults signed on paper. Nothing is ever inserted into the official file. | The workbook puts pictures on separate pages or in separate files (pages 7, 10, 13, 21), says to attach permits to the workbook (page 17), and says not to flatten until signing is done. A separate attachments file does all of that without changing the official file. The drawn writer already exists. | Insert scans into the fillable file (the 2026 file allows it, but the workbook asks for separate pages, and the helper has no PDF writer for that). |
| D9 | Appendix D | **A tab in the 2026 workbooks** right after the Proposal (the workbook's own order), always shown, opening with "Only if you need a Fundraising Application" and the Scout's Yes/No from page 10. **A second output on the 2026 Fill page.** The donations box reuses the Proposal's Fundraising answer, because it is the same question (Appendix D says "from page 9"; in the 2026 workbook that box is on page 10, so the tab adds note S22). The Fill page says Appendix D has no boxes for the organization name and EIN (S14). | Follows the workbook's order and avoids typing the same answer twice. | A separate Appendix D page. |
| D10 | Reading a filled 2026 PDF back | **One "Make a backup file from a PDF" page that recognises either edition** from the PDF's fields and opens the result in the matching workbook. | The Scout doesn't need to know the edition. The page reads fields only (no network), so no CSP change. | A second page. |

---

## 4. Design

### 4.1 Pages and files

New pages (each with its own CSP, title, description and Open Graph tags, like the existing pages):

| Page | Script | What it is |
|---|---|---|
| `EagleWorkbook2026.html` | `lib/w26-classic.js` | Classic 2026 workbook: official wording and order. |
| `EagleWorkbook2026-guided.html` | `lib/w26-guided.js` | Guided 2026 workbook: plain language, examples, tips. |
| `FillOfficialPDF2026.html` | `lib/w26-fill-page.js` | Fill the official 2026 workbook PDF and Appendix D. |

New libraries (classic scripts; browser global and `module.exports`, like `lib/journey.js`):

| File | Global | What it holds |
|---|---|---|
| `lib/w26-model.js` | `EagleW26` | Pure data: `EDITION = '2026'`, `defaults()`, and from the field map `FIELDS`, `APPENDIX_D_FIELDS`, `FIXED_BOXES`, `LABELS`, `COMPUTED_LABELS`, `APPENDIX_D_LABELS`, `OFFICIAL` (the exact printed wording the pages show); `OFFICIAL_URL`, `APPENDIX_D_URL`, `ID_FIELDS`, `APPENDIX_D_ID_FIELDS`, `totals(data)`, `fit(name, value)`. No DOM, no storage, no PDF. |
| `lib/w26-pdf.js` | `EagleW26Pdf` | PDF input and output: `buildFieldValues`, `buildAppendixDValues`, `checkPdf`, `fillWorkbook`, `fillAppendixD`, `readBackup`, `formatDateAs`, `plainNumber`. Uses `EagleOfficialPdf` helpers and `EagleW26`. |
| `lib/w26-ui.js` | `EagleW26Ui` | 2026 form pieces on top of `W.createForm`, all wording from `EagleW26.OFFICIAL`: `box`, `sec`, `select`, `person`, `place`, `fitNote`, `hoursTable`, `reportHoursTable`, `costTable`, `readOnly`. |
| `lib/w26-tips.js` | `EagleTips` | 2026 tips (the 2026 pages load this instead of `lib/tips.js`). Phase 4. |

Shared and reused (with the small options listed in section 5): `lib/workbook-common.js` (store, backup files, `h()`, `createForm` `field`/`row`/`section`/`table`/`tipBox`, Review tab pieces, save bar, Scoutly), `lib/attachments.js` (pictures, IndexedDB, drawn-page writer), `lib/journey.js` (the edition-keyed tables), `lib/preflight.js` (date-order checks), `lib/official-pdf.js` (number parsing, `rowCost`, `mayOverflow`, `textWidth`, and the PDF open/read helpers once exported, see section 5).

Script order on the 2026 workbook pages: `lib/official-pdf.js`, `lib/preflight.js`, `lib/journey.js`, `lib/w26-model.js`, `lib/w26-tips.js` (Phase 4; before that, none), `lib/attachments.js`, `lib/workbook-common.js`, `lib/w26-ui.js`, then the page script. On `FillOfficialPDF2026.html`: the three pdf.js files, `lib/official-pdf.js`, `lib/preflight.js`, `lib/w26-model.js`, `lib/w26-pdf.js`, `lib/attachments.js`, `lib/w26-fill-page.js`. A test pins both, like the existing "each page loads its scripts in the order they need".

CSP: the 2026 workbook pages copy the 2023a workbook pages' CSP exactly (Scoutly frame included). `FillOfficialPDF2026.html` has `connect-src` with exactly the two 2026 URLs (workbook and Appendix D), separated by a space. `FillOfficialPDF.html` keeps its one 2023a URL.

Storage keys: `eagle_workbook2026_guided_v1` and `eagle_workbook2026_v1` (each with `_saved`, `_backup`, `_snap`, `_corrupt` like the others). The Guided 2026 page falls back to the Classic 2026 draft and the other way round, exactly as the 2023a pair does. Never across editions.

### 4.2 The 2026 draft (backup file shape)

`EagleW26.defaults()` returns this. Every key is new to the 2026 shape; names reuse 2023a key names where the meaning is the same, so shared helpers (`rowCost`, the contact blocks, Review) work on both. Rule 9 applies from the first release: never rename or remove a key.

```js
{
  edition: '2026',
  candidate: { name: '', dob: '', address: '', city: '', state: '', email: '', phone: '', pid: '', borDate: '' },
  parent: { name: '', address: '', city: '', state: '', email: '', phone: '' },
  unit: { type: 'Troop', number: '', district: '', council: '' },
  contacts: {
    leader: person(), committee: person(), beneficiary: place(), beneficiaryRep: person(),
    serviceCenter: place(), approvalRep: person(), coach: person()
  },
  proposal: {
    projectName: '', beneficiaryImpact: '', description: '', motivation: '',
    approvedDate: '', planDate: '', beginDate: '', completeDate: '',
    work: '', leadership: '',
    hours: hoursRows(),                      // 5 rows; row 0 is the Scout (w fixed to '1')
    resources: '', costs: { materials: '', supplies: '', tools: '', other: '' },
    fundraising: '', needFundraisingApp: '', // '' | 'yes' | 'no'
    safety: ''
  },
  appendixD: { useOfFunds: '', dates: '', howMuch: '', donors: '', contracts: '', safeguarding: '' },
  plan: {
    reviewComments: '', presentCondition: '',
    steps: rowsOf(10, () => ({ step: '', duration: '' })),
    helpers: rowsOf(12, () => ({ job: '', skills: '', adultYouth: '', needed: '', soFar: '' })),
    organizing: '', training: '', communication: '', workSessions: '',
    hours: hoursRows(),
    firstAidKit: '', firstAidSpecialist: '', safetyAdults: '',
    hazards: rowsOf(3, () => ({ hazard: '', prevention: '' })),
    ppe: '', toolSafety: '', adultTools: '', safetyBriefing: '', emergencyAccess: '',
    permits: '',
    items: rowsOf(12, costRow),
    funds: { beneficiary: '', exempt: '', others: '', future: '', futureDate: '', donated: '' },
    fundingSources: '', materialTransport: '', workerTransport: '', beneficiaryInput: '', leaderInput: ''
  },
  report: {
    observations: '', challenges: '', changes: '', leadershipStyle: '', rewarding: '', materialsUse: '',
    hours: hoursRows(),
    spending: rowsOf(9, costRow),
    collected: '', spent: '', differenceExplained: '', thanks: '', aiUse: ''
  },
  attachments: [], links: [], journey: { raising: '', steps: {} }
}
// person() = { name: '', email: '', phone: '' }
// place()  = { name: '', address: '', city: '', state: '', email: '', phone: '' }
// costRow() = { item: '', description: '', qty: '', unitCost: '', totalCost: '', source: '' }
// hoursRows() = 5 rows { w: '', h: '' }, row 0 { w: '1', h: '' }
```

Row counts match the PDF (10 steps, 12 helpers, 3 hazards, 12 plan items, 9 spending rows). Extra rows beyond the PDF are allowed in the draft (as in 2023a); the Fill page says how many rows did not fit.

`journey.raising` is not used by 2026: `proposal.needFundraisingApp` is the official Yes/No and is written to the PDF. The 2026 "Your path" reads it.

### 4.3 The shared description (D3)

- One box, `proposal.description`, on the Proposal tab, labeled "Project Description" with page 7's prompt as help. Under it, always (not only when long), note S5.
- Its fit line (S21) lists all three pages, for example "May not fit in the official box: page 7, about 5 of 11 lines; page 11, about 5 of 3 lines; page 22, about 5 of 7 lines. Shorten it, or attach a page." (The three boxes are almost the same width, so the line counts are almost the same; only the room differs.)
- The Proposal tab's "Proposal Approval" section shows page 11's own heading and prompt ("Brief Project Description" / "Write two to three sentences that summarize your project and why it is important. Refer back to the project description on page 7.") with a read-only copy of the description and note S5.
- The Report tab has no second box. Under "ACCEPTANCE OF THE WORK" it shows page 22's heading and prompt ("Brief Project Description" / "Write two or three sentences to describe what you did for the beneficiary."), a read-only copy of the description, a "Change it on the Project Proposal tab" link, and note S6.
- The Fill page warns (S7) when the description may not fit page 11's box.
- Telling Scouting America about the shared field is an open question for the maintainer (section 9).

### 4.4 Writing values into the 2026 PDF

`EagleW26Pdf.buildFieldValues(data, { skipApprovalNames })` returns `{ text, radio, choice, notes }`, each keyed by PDF field name, built from `EagleW26.FIELDS` (rows `[name, kind, path, format, firstPage, type]`):

| Kind | What is written |
|---|---|
| text | `str(value)`. Single-line widgets get line breaks replaced by `; ` at fill time (same as 2023a). |
| date | `formatDateAs(value, format)` turns `YYYY-MM-DD` or `M/D/YYYY` (also `MM/DD/YYYY`) into the box's format (`m/d/yyyy` → `1/2/2010`, `mm/dd/yyyy` → `01/02/2010`, `m/d/yy` → `1/2/10`). Anything else, including an impossible date (2/30), is written as typed with note S10. |
| money | `plainNumber(value, 2)`: a plain amount (`parseAmount` accepts `$1,250.50`) becomes `1250.50`. Blank stays blank. Not an amount: written as typed, note S9. |
| count | `plainNumber(value, 0)` with `parseWhole`; same rules. |
| hours | written as typed (trimmed); the totals read them with `parseCount`. |
| computed | from `EagleW26.totals(data)`; the row's `type` says how: `money` and `hours` with `toFixed(2)`, `count` with `toFixed(0)`. |
| fixed | `'1'` for `Eagle Scout Candidate`. |
| choice | `unit.type` if it is `Troop`, `Crew` or `Ship`; otherwise `Troop` plus note S12. |
| radio | `proposal.needFundraisingApp`: `yes` → `Yes`, `no` → `No`, blank → nothing. |
| approvalName | from the contact, unless `skipApprovalNames`. |
| never | nothing, ever. |

`EagleW26.totals(data)` returns `{ values, invalid }`. `values` maps every computed field name to a number or to `''` (blank). `invalid` lists the names left out because a part is not a plain number (note S11); those names are not in `values`. Formulas are in the field map, column "Format", and are the form's own (F7): plain sums; the Scout's head count is always 1; `Difference` = collected − spent; row costs use the 2023a `rowCost` rule (a typed total wins, otherwise quantity × unit cost). Blank rules, matching the blank form: **grand totals and `Difference` are 0** when nothing was entered (head counts are 1); **row totals** (`Total CostRow…`) are `''` when the row has no cost.

Filling (`fillWorkbook`) follows `fillOfficialPdf` in `lib/official-pdf.js` line for line, with these differences:
1. Identity check uses `EagleW26.ID_FIELDS` (six names only in the 2026 workbook) and the 2026 hash. A 2023a workbook gets message S2; Appendix D chosen as the workbook gets S3.
2. The "this PDF already had answers" check ignores computed fields, `Eagle Scout Candidate` and `Dropdown1`, which start with values in the blank form (F8).
3. Choice fields: `annotationStorage.setValue(id, { value: 'Crew' })` on each widget.
4. Overflow: for every widget of a text field, `EagleOfficialPdf.mayOverflow(value, widget)` with the real widget from `readWidgets` (auto-size widgets return false). One warning per field and page: S8a for a multi-line box, S8b for a single-line one; S7 instead of S8a for `Project Description` on page 11.
5. Signature fields: never touched. A test reads them back empty after filling.
6. The report's `filled` count counts field names written, as 2023a does.

`EagleW26.fit(name, value)` returns `{ page, lines, capacity, fits }` for each widget of a fixed box, from `FIXED_BOXES` (real sizes, 2 decimals), Helvetica 12 pt, and the same `wrappedLines` and line factor as `mayOverflow`. A test compares `fit` with `mayOverflow` on the **real widgets** of the cached PDF, so the page's fit line and the Fill page's warning can't disagree.

### 4.5 Signatures (D7)

- `never` fields: the 9 signature fields, the 9 dates beside them, `Provided Copy of Info for Beneficiaries`, and in Appendix D the 3 signatures, `Date`, `Date_2`, `Date_3` and `Authorized Council Approval`. Unit tests check that `buildFieldValues` and `buildAppendixDValues` never return any of them, whatever the draft holds.
- Printed names: `Unit Committee Approval Name` ← `contacts.committee.name`; `Beneficiary Approval Name` and `Beneficiary Name` ← `contacts.beneficiaryRep.name`; `District or Council Approval Name` ← `contacts.approvalRep.name`. Left blank with the opt-out. The opt-out's help text is S13.
- The Classic and Guided Proposal tabs show page 11's two promise lines as they are printed: the Scout signs the Candidate's Promise first ("Sign here before you seek other approvals."), then the four adults approve.
- The Signed Pages tab (Phase 5) says adults may sign the PDF electronically if the council accepts it, quoting the workbook's page 2 list, and tells adults not to certify or lock the file.

### 4.6 Appendix D (D9)

- Tab "Fundraising Application (Appendix D)" between Proposal and Project Plan in both 2026 workbooks. It shows the Yes/No from Proposal page 10 (editable here too, same path), then Appendix D's sections in its own order: "Project Description (from page 6 of the Eagle Scout Leadership Service Project Workbook)" as a heading over "For what will you use the funds?" (`appendixD.useOfFunds`); "Fundraising" with a read-only copy of the Proposal's Fundraising answer, labeled exactly "How will you seek donations? (from page 9 of the Eagle Scout Leadership Service Project Workbook)", note S22 and a link to change it on the Proposal tab; the dates, the amount, "Donors", "Contracts" and "Safeguarding Donations" with their printed prompts.
- `appendixD.dates` is a text input (the box asks for dates, plural). One date in `M/D/YYYY`, `MM/DD/YYYY` or `YYYY-MM-DD` is written as `MM/DD/YYYY` with no note; anything else is written as typed with note S10.
- Contact boxes in Appendix D fill from the same contacts as the workbook (the field map lists them).
- `fillAppendixD` checks the file with `APPENDIX_D_ID_FIELDS` and the Appendix D hash, fills, and adds note S14 (no boxes for the organization name and EIN).

### 4.7 Reading a filled PDF back (D10)

- `EagleW26Pdf.readBackup({ pdfjsLib, pdfBytes })` builds a 2026 draft from a filled 2026 workbook: one value per field name (shared fields are read once), dates parsed from all three formats back to `YYYY-MM-DD` (two-digit years become 20yy), radio and choice back to draft values (pdf.js gives a choice value as an array: use its first item), computed, `fixed` and `never` fields skipped. The "no answers typed in yet" check ignores computed fields, `Eagle Scout Candidate` and `Dropdown1`, which the blank form presets. It returns `{ data, report: { read, warnings } }` like the 2023a reader.
- Round trip test: `readBackup(fillWorkbook(sample2026))` gives back every non-computed answer of `sample2026` (same comparison helper as the 2023a round trip).
- `BackupFromPDF.html` (Phase 6) tries 2026 identity fields first, then 2023a; it loads `lib/w26-model.js` and `lib/w26-pdf.js` too, and its "Open in the workbook" buttons go to the matching edition's pages and storage keys. Appendix D files are refused with S15 (their answers live in the workbook draft already).

### 4.8 Signed pages, photos, attachments (D8)

- 2026 slots (`SLOTS_2026` in `lib/attachments.js`): `w26Proposal` after page 11 ("Signed Proposal Approval, page 11"), `w26Plan` after page 18 ("Signed Candidate's Promise, page 18"), `w26Report` after page 22 ("Signed Certification and Acceptance, page 22"), `w26AppendixD` ("Signed Appendix D, page 2", placed after page 22 in the drawn copy, since Appendix D is a separate file). Photo places stay as they are.
- `PLACES` gains the four new place names, so a 2026 backup file's scans survive `sanitize` on any page.
- The Fill 2026 page offers: (1) the filled workbook PDF (signable), (2) the filled Appendix D, (3) an attachments PDF (photos with captions, permits and other attachments, the links list; no workbook pages), (4) optionally the drawn whole-workbook copy with scanned signed pages inserted after their page (22 pages plus scans), for paper signatures. `WORKBOOK_PAGES` becomes a parameter of the drawn writer (32 for 2023a, 22 for 2026).

### 4.9 Edition guards (both editions)

| Where | Rule | Message |
|---|---|---|
| `openBackup` (all workbook pages) | If `editionOf(file) !== editionOf(defaults())`, refuse before asking to replace. Generic, no new parameter: 2023a `defaults()` has no `edition`, 2026 has `'2026'`. | S1a or S1b |
| 2023a Fill page | A 2026 backup file is refused (its drafts list never shows 2026 drafts). | S1a |
| 2026 Fill page | A 2023a backup file is refused. | S1b |
| Fill pages, PDF choice | A PDF of the other edition is refused. | S2 or S4 |
| Backup from PDF | Edition detected once Phase 6 lands. From Phase 3 until then, `readBackupFromPdf` in `lib/official-pdf.js` gives a 2026 PDF S16. | S16 |

### 4.10 Storage and pictures (F14)

- `DRAFT_KEYS` in `lib/attachments.js` (read by `idsInDrafts`, which every `sweep` uses, including the one in `lib/backup-from-pdf-page.js`) and the pinned-keys test list all four draft keys, so a sweep on either edition's page never deletes the other edition's pictures. `lib/fill-page.js` `DRAFTS` stays 2023a only (it lists drafts to fill on the 2023a Fill page); `lib/w26-fill-page.js` lists the two 2026 drafts.
- Erase on a page erases **that edition's two drafts only**, then runs `sweep` instead of `clearAll`, so the other edition's drafts and pictures stay. The confirm text becomes S17 (with the edition name). This changes the 2023a Erase text too; its test changes on purpose.

### 4.11 Key boxes, Review, Your path, tips, Scoutly

- On the 2026 workbook pages, the Scoutly box gets one more line, S20, quoting the workbook's page 4 rule on generative AI and pointing to the page 21 box.

- `KEY_BOXES['2026']` and `SHORT_ANSWER_BOXES['2026']` in `lib/journey.js` (lists in the implementation plan). `TAB_ORDER` becomes per edition: 2026 is `setup, proposal, fundraising, plan, report` (the workbook's order).
- The Review tab, the save bar, the empty-box dots and the key-box count work unchanged once the tables exist (they already read by edition).
- 2026 "Your path" steps follow the workbook's own checklist (page 3), quoting it, not paraphrasing it into stronger rules. Phase 5.
- 2026 tips (Phase 4): new file, `where` is the 2026 printed page number ("Page 7"), checked against the 2026 PDF by a test; sources in `docs/guidance-sources.md`; same length limits and `advice` rules.

---

## 5. Changes to existing code (all small, each with a test)

| File | Change | Phase |
|---|---|---|
| `lib/official-pdf.js` | Add `openPdf`, `readWidgets`, `readFieldValues`, `sha256Hex`, `MAX_PDF_BYTES`, `PRINTABLE`, `LINE_FACTOR` to the returned object. No behavior change. Phase 3: a 2026 PDF gets S4 on the 2023a Fill page and S16 in `readBackupFromPdf`. | 0, 3 |
| `lib/workbook-common.js` | `openBackup`: edition guard (4.9). `confirmErase`: erase the stores it is given, then `sweep`, not `clearAll`; new confirm text with the edition name passed in. Phase 2: `controls` and `footer` take `fillHref`, `officialUrl` and `backupHref` (2023a values by default); `askForHelp` takes `roles`; `createForm` returns `print`; `reviewSection` skips "Next on your path" for 2026 until Phase 5; the Scoutly box takes an extra line. | 0, 2 |
| `lib/attachments.js` | `DRAFT_KEYS` gains the two 2026 keys. Later: `SLOTS_2026`, `slotsFor(data)`, new places, writer takes the page count. | 0, 5 |
| `lib/backup-from-pdf-page.js` | Phase 6: edition detection. (Its `sweep()` call already uses `DRAFT_KEYS`.) | 6 |
| `lib/fill-page.js` | Refuse a 2026 backup file or draft (S1a). | 0 |
| `lib/journey.js` | `KEY_BOXES['2026']`, `SHORT_ANSWER_BOXES['2026']`, `TAB_ORDER` per edition (keep `TAB_ORDER` as the 2023a list for old callers, add `tabOrder(data)`). | 2 |
| `index.html`, `README.md` | Edition chooser with the FAQ sentence (S18). | 3 |
| `tests/run-tests.cjs`, `tests/browser-e2e.cjs` | New 2026 tests; storage-key test lists four keys; CSP test knows the 2026 Fill page's two URLs and lets the 2026 workbook pages frame Scoutly (`mayFrame`); page list includes the new pages. | each |
| `tests/pdfkit-check.swift` | Also report choice (drop-down) values. | 1 |
| `AGENTS.md` | Section 6 below. | 0 |

---

## 6. AGENTS.md changes (exact wording, Phase 0)

- "What this is": "Offline helpers for the BSA **Eagle Scout Service Project Workbook No. 2023a** and the **2026 Eagle Scout Leadership Service Project Workbook No. 512-927**. The two editions have separate pages; see `todo/2026-design.md`."
- Rule 4 (apply in Phase 3, when the page exists): replace "(a) the optional download of the blank official PDF, pinned to the exact URL in `connect-src` of `FillOfficialPDF.html`" with "(a) the optional download of the blank official PDFs, pinned to exact URLs in `connect-src`: the 2023a workbook in `FillOfficialPDF.html`, the 2026 workbook and its Appendix D in `FillOfficialPDF2026.html`".
- Rule 6: add "In the 2026 workbook the signatures are real signature fields: never write to them, to the dates beside them, to the beneficiary's Yes/No on page 11, or to Appendix D's council approval box. The official form repeats the Scoutmaster's name and the beneficiary organization from page 5 into the approval areas; that is the form's doing and the opt-out text says so."
- The paragraph "The official PDF forbids adding pages…": "The 2023a PDF forbids adding pages (document assembly), so its submission copy is a new PDF of drawn pages. The 2026 PDF allows it, but the helper never inserts pages into either official file: the 2026 workbook puts photos and drawings on separate pages or in separate files (pages 7, 10, 13 and 21), so the 2026 Fill page makes a separate attachments PDF."
- The "Browser storage keys" paragraph: "Browser storage keys: `eagle_workbook_guided_v1` and `eagle_workbook_v1` (2023a drafts) and `eagle_workbook2026_guided_v1` and `eagle_workbook2026_v1` (2026 drafts), each with `_saved` and `_backup` timestamps. `DRAFT_KEYS` in `lib/attachments.js` lists all four, so the picture sweep keeps every draft's scans. Each Fill page lists only its own edition's drafts. A test ("the draft storage keys are the same everywhere they are written out") checks that every file that writes a draft key uses one of the four, that `DRAFT_KEYS` lists all four, and that each Fill page and `lib/backup-from-pdf-page.js` knows its own edition's two." This replaces the sentences about "five files that must agree" and "the three that sweep and list drafts"; keep the rest of that paragraph (`_corrupt`, `state`, `_snap`).
- New gotcha: "**Edition guards.** A draft, backup file or PDF of one edition must never open, fill or merge in the other edition's pages. `openBackup` compares `editionOf` of the file and of the page's `defaults()`. The picture sweep must know every draft key of both editions, and Erase must sweep, not clear, or one edition's Erase deletes the other's scans."
- New gotcha: "**One 2026 field, three pages.** `Project Description` is pages 7, 11 and 22 at once (see `todo/2026-design.md` 4.3). Never try to give its widgets different values."
- Layout table: add the 2026 pages and libraries (section 4.1).

---

## 7. Phases

Each phase ends with both test scripts passing and a commit. Phases 1–3 make a usable 2026 helper (Classic page and Fill page); 4–6 make it complete. The review panel (AGENTS.md) runs at the end of each phase that users can see (1 is engine-only but changes PDF output, so it gets the Engineering and Official-text lenses).

| Phase | Delivers | Done when |
|---|---|---|
| 0 | Guards and groundwork, no 2026 pages yet: exports, edition guard in `openBackup` and the 2023a Fill page, four draft keys, Erase sweeps, 2026 test fixtures (field names, sample draft), 2026 PDF cache with hash check, AGENTS.md wording. | All existing tests pass; new guard tests pass; a 2026-shaped backup file is refused by the 2023a pages. |
| 1 | `lib/w26-model.js` and `lib/w26-pdf.js`, tested in Node against the real 2026 PDF and Appendix D. | Every-field-classified test, fill and read-back round trip, signatures untouched, totals, formats, fit, PDFKit reads the values. |
| 2 | `EagleWorkbook2026.html` (Classic), `lib/w26-ui.js`, 2026 key-box tables. | Browser tests: opens from `file://`, every tab, save and open backup, edition banner, fit lines, Review tab. |
| 3 | `FillOfficialPDF2026.html`; home page chooser. | Browser test fills the cached 2026 PDF from a draft and from a backup file, and Appendix D. |
| 4 | Guided 2026 page and 2026 tips. | Its own step-by-step plan first (written when Phase 3 lands), research check of every tip. |
| 5 | Signed Pages & Photos for 2026, attachments PDF, drawn whole copy, Your path 2026. | Submission outputs tested like 2023a's. |
| 6 | Backup from PDF for both editions; optional carry-over of contacts from a 2023a draft. | Round trip from a filled 2026 PDF to a 2026 draft in a browser test. |

Until Phase 3 ships, `index.html` keeps saying the helper fills the 2023 workbook. Phase 0 adds S19.

---

## 8. Test strategy

| Level | What | Where |
|---|---|---|
| Static | Every 2026 field name classified exactly once; `FIELDS` names equal the real PDF's names; fixed-box geometry equals the PDF's; `never` fields never in any output; storage keys pinned; CSPs pinned; script order pinned; no `innerHTML`; titles and descriptions. | `run-tests.cjs` |
| Unit | `defaults()` shape, `totals` (each formula with a hand-computed case, blanks, bad numbers), `formatDateAs` (three formats, impossible date, non-date), `plainNumber`, `fit` vs `mayOverflow` agreement, edition guards, Erase sweep. | `run-tests.cjs` |
| Real PDF | Fill the cached official 2026 PDF from `tests/fixtures/sample-workbook-2026.json`; read values back with pdf.js; round trip; signatures still empty; widget count unchanged; Appendix D the same; Poppler text check on pages 1, 5, 7, 11, 17, 20, 22; PDFKit on macOS. | `run-tests.cjs`, `browser-e2e.cjs` |
| Browser | Each new page from `file://`; tabs; typing saves; backup save/open; edition refusal; Fill page end to end with the cached PDF; Erase keeps the other edition's draft. | `browser-e2e.cjs` |

The 2026 PDFs are cached exactly like the 2023a one (`officialPdf()` in `tests/run-tests.cjs`): `tests/.cache/512-92726-Eagle-Scout-Leadership-Service-Project-Workbook.pdf` and `tests/.cache/Appendix-D-Fundraising-Application.pdf`, downloaded on the first run and hash-checked; `EAGLE_PDF_2026` and `EAGLE_PDF_2026_APPD` point at local copies when offline; `EAGLE_PDF_ALLOW_NEW=1` accepts a changed file. If a 2026 PDF can't be had, the run records one failure ("2026 PDF unavailable"), as it does for 2023a. No test is silently skipped.

`tests/fixtures/sample-workbook-2026.json` is fictional, like the 2023a sample (rule 8). It fills every non-computed path, with table rows 0–2 filled and the rest blank, and all five rows of each hours table (row 1 is the workbook's page 20 example), so the round trip covers every kind of field. `.gitignore` gains `!tests/fixtures/sample-workbook-2026.json` and `!tests/fixtures/official-2026-fields.json`.

---

## 9. Risks and open questions

| Risk | Effect | Handling |
|---|---|---|
| Acrobat behavior can't be tested. | A value could display differently in Acrobat than in Preview/Chrome. | D5 and D6 keep values plain and formulas identical to the form's, so a recalculation gives the same numbers, except for the one form defect in F7, which the Fill report warns about. Ask a parent or coach with Acrobat Reader to open a filled copy once; record the result in `todo/2026-design-facts.md`. Not a blocker. |
| The fit estimate is off by a line. | A warning appears when text fits, or not when it doesn't. | Same measurement as 2023a's overflow check, which has been accurate. Warnings say "may not fit" and suggest printing a test page. |
| Scouting America publishes a corrected 2026 file. | Field names or hashes change. | The hash check fails loudly in tests; the "every field classified" test lists what changed. Add the new hash to `OFFICIAL_SHA256_2026` after checking. |
| The description on page 11 is cut off (F5). | Approvers see a partial description on the approval page. | D3: note, fit line, Fill warning; a Phase 4 tip (advice). Tell Scouting America about the shared field (maintainer's call). |
| Scouts pick the wrong edition. | Wasted work. | D2 chooser quotes the FAQ; banners on every page; guards refuse mixing. |

Open, for the maintainer:
1. Sign off D1–D10 (or pick alternatives).
2. Whether to tell Scouting America about F5 (one description box for pages 7, 11 and 22, which ask different questions) and F11 (Appendix D has no boxes for the organization name and EIN, and its page references are one page early).
3. Whether Phase 6's carry-over of contacts from a 2023a draft is wanted.

---

## 10. User-visible strings (exact)

Use these exactly. `{…}` is filled in by the code. A test checks that S1a, S1b, S2, S4, S13, S14, S17 and S20 each appear in the code (S1a in two files: `lib/workbook-common.js` and `lib/fill-page.js`).

- **S1a** (2023a page, 2026 file): "This backup file is for the 2026 workbook. Open it in the 2026 workbook from the home page."
- **S1b** (2026 page, 2023a file): "This backup file is for the 2023 workbook (No. 2023a). Open it in the 2023 workbook from the home page. Answers don’t move to the 2026 workbook by themselves, because its questions are different."
- **S2** (2026 Fill page, 2023a PDF): "This is the 2023 workbook (No. 2023a), but this page fills the 2026 workbook. Use “Get the official PDF for me,” or download the 2026 workbook from scouting.org and choose that file."
- **S3** (Appendix D chosen as the workbook): "This is Appendix D (the Fundraising Application), not the workbook. Choose it in the Appendix D step below."
- **S4** (2023a Fill page, 2026 PDF): "This is the 2026 workbook, but this page fills the 2023 workbook (No. 2023a). Use the 2026 Fill page from the home page."
- **S5** (under the description box, and beside its read-only copy on the Proposal tab): "The official PDF uses this one answer three times: here on page 7, and as the “Brief Project Description” on pages 11 and 22. Page 11 has room for about 3 lines and page 22 for about 7, so the start of your answer is what readers see there."
- **S6** (Report tab, beside the read-only description): "Page 19 of the workbook says: “Update the project description on page 22 if there were significant changes to your project during the planning process.” In the official PDF, pages 7, 11 and 22 share one box, so changing it also changes your proposal on pages 7 and 11, which may already be signed. Ask your Scoutmaster or coach how to handle this."
- **S7** (Fill warning): "PDF page 11, Brief Project Description: only about the first 3 lines of your project description fit here, because the official PDF repeats the description from page 7. Readers see the start of it."
- **S8a** (Fill warning, multi-line box): "PDF page {page}, {label}: this answer may not fit in its box. The official box does not grow or scroll, so the end would be cut off. Shorten it, or attach a page and write “see attached page” in the box."
- **S8b** (Fill warning, single-line box): "PDF page {page}, {label}: this answer may be too long for its box and may be cut off when printed. Shorten it, or attach a page and write “see attached page” in the box."
- **S9**: "PDF page {page}, {label}: “{value}” is not a plain number, so it was put in the box as typed. Use numbers like 12 or 12.50 so the totals add up."
- **S10**: "PDF page {page}, {label}: this box is set up for one date. “{value}” was put in as typed; some PDF programs may show it differently."
- **S11**: "PDF page {page}, {label}: this total was left blank because some amounts it adds up are not plain numbers."
- **S12**: "The unit type in your draft is not Troop, Crew, or Ship, so the PDF shows Troop. Change it on the Project Contacts tab."
- **S13** (help for "Leave the printed names blank"): "The approvers can write their own names. The Scoutmaster’s name still appears on pages 11 and 22, and the beneficiary organization on page 22, because the official PDF repeats them from page 5."
- **S14**: "Appendix D prints “Name of Organization” and “EIN” for the beneficiary but has no boxes to type them in. Write them in by hand after printing, or ask your coach."
- **S15**: "This is Appendix D. Its answers are already in your workbook draft, so there is nothing to read back. Choose your filled 2026 workbook PDF instead."
- **S16** (2023a reader, 2026 PDF, until Phase 6): "This is the 2026 workbook. Making a backup file from a 2026 PDF comes in a later version of this helper. Keep using your backup file."
- **S17** (Erase): "Erase your saved {edition} drafts from this browser? This erases the drafts of both {edition} pages, including scanned pages only they use.\n\nThis cannot be undone. Save a backup file first if you want to keep your work. Backup files you already saved are not affected." where {edition} is "2023 workbook" or "2026 workbook".
- **S18** (home page chooser, Phase 3): heading "Which workbook?"; two links, "**2026 workbook** (No. 512-927)" and "**2023 workbook** (No. 2023a)"; then "Scouting America’s 2026 workbook FAQ says:" followed by three quotations, each in its own `<blockquote>`, exactly:
  - “Any Scout can start using the 2026 Eagle Scout leadership service project workbook now that Scouting America has published it. The 2026 workbook will be required for every Life Scout starting work for the first time on an Eagle Scout leadership service project.”
  - “A Scout whose project proposal was fully approved before January 1, 2027, using the 2023 workbook, may continue using that workbook to complete the project.”
  - “The 2027 Guide to Advancement, published in January 2027, will require Scouts to obtain the beneficiary’s and Scoutmaster’s approval of the project plan before starting work. That requirement will apply to all Scouts effective January 1, 2027, whether using the 2023 or the 2026 project workbook.”
  - then: "Not sure which one is yours? Ask your Scoutmaster or council."
- **S19** (home page, Phase 0 until Phase 3): "Support for the 2026 workbook is being built. For now this helper fills only the 2023 workbook (No. 2023a). The 2026 workbook is on scouting.org."
- **S20** (Scoutly box, 2026 pages): "The 2026 workbook says (page 4): “With your parent or guardian’s permission, you may use AI to help find a beneficiary, explore ideas, identify risks, or anticipate potential challenges. AI cannot write the project proposal, plan, or report for you. The work must be yours, not AI’s. If you use AI, you must fully disclose how and where you used it to all those reviewing any part of your project.” The Project Report has an Artificial Intelligence box for this."
- **S21** (fit line under a fixed-size box): "Fits in the official box: {parts}." when every widget fits, or "May not fit in the official box: {parts}. Shorten it, or attach a page." when one doesn't; `{parts}` is one "page {page}, about {lines} of {capacity} lines" per widget, joined with "; ". Hidden when the box is blank.
- **S22** (Appendix D tab, under the read-only Fundraising answer): "In the 2026 workbook this is the Fundraising box on page 10."
- **Banners:** 2023a pages: "For the 2023 workbook (No. 2023a)." 2026 pages: "For the 2026 workbook (No. 512-927)." Each followed by a link "Other workbook" to the home page.

## 11. How the facts and the field map were made (to redo after a new PDF)

Scratch only, outside the repository (a scratch folder):
1. `dump.cjs <pdf> <out.json>`: loads `vendor/pdfjs` the way `tests/run-tests.cjs` does and lists every widget (page, name, type, multi-line, font size, size).
2. A PyMuPDF script records, for every widget, the printed words on its line and just above it (`labels26.json`), plus format and calculate scripts and field flags.
3. `map26.py`: the hand-made mapping from field name to kind and draft path, which **fails if any field name is unmapped or mapped twice**, then writes `map26.json` and the fixed-box geometry.
4. `emit.py`: writes `todo/2026-field-map.md` from those files.
5. `probe.cjs`: fills a copy with pdf.js and reads it back; `pdfkit-check` and a Swift probe read it with PDFKit; `pdftotext` per page checks the text shows.

The implementation does not need these scripts: the test "every 2026 field is classified exactly once" in Phase 1 does the same check against the cached PDF.
