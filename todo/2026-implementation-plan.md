# 2026 workbook: step-by-step implementation plan

**Status:** not started. Design: [2026-design.md](2026-design.md). Field data: [2026-field-map.md](2026-field-map.md). Do not start Phase 1 until the maintainer has signed off decisions D1–D10 in the design (Phase 0 is safe either way).

This plan is written so a careful but less experienced agent can follow it exactly. Do the phases **in order**, and the tasks inside a phase in order. Each task says which files to touch, what to add (exact names and exact user-visible strings), which tests to write **first**, and how to know it is done. Do not improvise wording: every sentence a Scout sees is in the design's section 10 (S1a … S22), in `OFFICIAL` (field map), or in this file. If the code does not match what this plan says (a line moved, a name changed), stop and report it instead of guessing.

Phases 0–3 are fully detailed. Phases 4–6 list their tasks and acceptance tests; write their step-by-step expansion (in the same style, in this file) before starting each one.

---

## Read this first (rules for every task)

1. Read `AGENTS.md` fully. The hard rules apply: no build, classic scripts only, no `innerHTML` (build DOM with `h(tag, attrs, ...children)` from `lib/workbook-common.js`), no network except the pinned URLs, no new requirements in wording, no real Scout data.
2. **Tests first.** For each task: write the listed tests, run them, confirm they **fail**, then write the code, run again, confirm they **pass**.
3. Commands, from the repository root, one at a time, never in parallel:
   ```bash
   node tests/run-tests.cjs                              # unit + real-PDF tests, under a minute
   CHROME_NO_SANDBOX=1 node tests/browser-e2e.cjs         # browser tests, 3–5 minutes: timeout of at least 10 minutes
   node --check lib/<file>.js                             # after every edit to a script
   pkill -f "eph-chrome-" || true                         # before a browser run, if an earlier run was interrupted
   ```
   Drop `CHROME_NO_SANDBOX=1` on a normal machine.
4. **Both** test scripts must report `0 failed` before any commit.
5. Edit by replacing an exact, unique piece of text. After each edit, search for the new text to confirm it is there exactly once. Never run search-and-replace over a whole file.
6. Commit at the end of each task marked **Commit** (Conventional Commits). Don't push. Check `git show --stat HEAD` after committing.
7. Field names in the 2026 PDF use curly apostrophes (`’`, U+2019) in most places and a straight one (`'`) in `Candidate's Promise Signature`. **Copy field names from the JS block in `2026-field-map.md`; never retype them.**
8. Never open or copy a real Scout's backup file or PDF. Tests use the fictional fixtures.
9. Words to never use in new user-visible text: `required`, `must` (except inside a quotation of the official workbook), `missing`, `ready`, `approved` (except quoting), `score`, `complete` (as a verdict), `%`.
10. The official 2026 PDFs never go into the repository. `.gitignore` already blocks all PDFs.

### Facts about the code you will need

- Everything in "Facts about the code" in [quick-wins-and-review.md](quick-wins-and-review.md) still holds (field ids `f-<path>`, page-script structure, `store`, test helpers, how to seed a draft in a browser test).
- `tests/run-tests.cjs`: `test(name, fn)`, `assert`, `ROOT`, `path`, `fs`, `crypto`, `lib` (= `lib/official-pdf.js`), `loadPdfjs()`, `readValues(pdfjsLib, bytes)` (field name → value of a filled PDF), `answers(data)` and `sameAnswer(a, b)` (compare backups), `workbookCommon()`. Some blocks define `const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');` locally; define it again in a new block if you need it.
- `tests/browser-e2e.cjs`: `open(file, readyExpression)`, `evaluate(js)`, `waitFor(js, ms)`, `setFile(selector, path)`, `click(text)`, `dialogs` (messages of `alert`/`confirm`, which are accepted automatically), `downloaded(suffix)`, `waitForDownload(suffix)`, `clearDownloads()`, `problems` (console errors on the page; tests assert it is empty), `PDF` (the cached 2023a PDF), `SAMPLE` (the 2023a sample backup).
- To open a backup file from a page's "Open backup file" button in a browser test, copy the pattern in the test "opening a backup file with no signed pages warns when this page has some" (it patches `HTMLInputElement.prototype.click` to catch the file picker).
- `lib/official-pdf.js` helpers you will reuse (exported): `str`, `parseAmount`, `parseCount`, `parseWhole`, `rowCost`, `formatMoney`, `mayOverflow`, `wrappedLines`, `textWidth`. After Task 0.1 also `openPdf`, `readWidgets`, `readFieldValues`, `sha256Hex`, `MAX_PDF_BYTES`, `PRINTABLE`, `LINE_FACTOR`.
- **The wording normalizer.** Every test that compares helper text with the official PDF text uses exactly this function (pdf.js splits words, puts spaces before punctuation and inside numbers):
  ```js
  const normText = (s) => String(s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ').replace(/\s+([?).,:;])/g, '$1').replace(/\(\s+/g, '(').replace(/\/\s+/g, '/').replace(/(\d) (?=\d)/g, '$1').trim().toLowerCase();
  // page text: (await page.getTextContent()).items.map((i) => i.str + (i.hasEOL ? ' ' : '')).join(' '), then normText.
  ```
  With it, all 240 strings in `OFFICIAL` (field map) were found in the official PDFs when this plan was written.
- `readWidgets(doc)` returns a `Map` of field name → list of widgets `{ id, page, rect, multiLine, fontSize, buttonValue, radio, existing }`. Write a value with `doc.annotationStorage.setValue(widget.id, { value })`; for a radio widget the value is `true` or `false`; for the drop-down it is the export value string.

---

## Phase 0: guards and groundwork (no 2026 pages yet)

Goal: make the existing helper safe for a second edition, before any 2026 file exists. Every 2023a test keeps passing, except the two Erase assertions that change on purpose in Task 0.5.

### Task 0.1 Export the PDF helpers the 2026 engine will reuse

File: `lib/official-pdf.js`.

1. Test first (`tests/run-tests.cjs`, in the "Official PDF" area, before the tests that need the PDF):
   ```js
   await test('engine: helpers the 2026 engine reuses are exported', () => {
     for (const name of ['openPdf', 'readWidgets', 'readFieldValues', 'sha256Hex', 'MAX_PDF_BYTES', 'PRINTABLE', 'LINE_FACTOR', 'mayOverflow', 'wrappedLines', 'rowCost', 'parseAmount', 'parseCount', 'parseWhole', 'str']) {
       assert.ok(name in lib, name);
     }
   });
   ```
2. In the `return { … }` at the end of the file, add a new line: `openPdf, readWidgets, readFieldValues, sha256Hex, MAX_PDF_BYTES, PRINTABLE, LINE_FACTOR`. Change nothing else.
3. Run both test scripts. **Commit:** `refactor(pdf): Export the PDF helpers a second edition needs`.

### Task 0.2 Refuse a backup file of the other edition (workbook pages)

File: `lib/workbook-common.js`.

1. Tests first.
   - Unit (`tests/run-tests.cjs`, near the other `mergeWithDefaults` tests):
     ```js
     await test('editions: a backup file of the other edition is refused, in plain words', () => {
       const W = workbookCommon();
       const J = require(path.join(ROOT, 'lib/journey.js'));
       const d2026 = { edition: '2026', candidate: {}, proposal: {} };
       const d2023 = { candidate: {}, proposal: {} };
       const page2026 = () => ({ edition: '2026' });
       assert.equal(W.editionMismatch(d2023, W.defaults), null);
       assert.equal(W.editionMismatch(d2026, page2026), null);
       assert.equal(W.editionMismatch(d2026, W.defaults), 'This backup file is for the 2026 workbook. Open it in the 2026 workbook from the home page.');
       assert.equal(W.editionMismatch(d2023, page2026), 'This backup file is for the 2023 workbook (No. 2023a). Open it in the 2023 workbook from the home page. Answers don’t move to the 2026 workbook by themselves, because its questions are different.');
       for (const d of [{}, null, { edition: 'x' }, { edition: '2026' }, d2023]) assert.equal(W.editionOfData(d), J.editionOf(d), JSON.stringify(d));
     });
     ```
   - Browser (`tests/browser-e2e.cjs`): at the top of `run()`, before the first test group, write the file once: `const OTHER_EDITION = path.join(os.tmpdir(), \`eph-2026-backup-${process.pid}.json\`); fs.writeFileSync(OTHER_EDITION, JSON.stringify({ edition: '2026', candidate: { name: 'Test' }, proposal: {} }));` (not in `downloads`, which `clearDownloads()` empties). Then, inside the per-workbook loop, after the test "opens an older backup file": open `OTHER_EDITION` with "Open backup file" (same pattern as that test), and assert `dialogs.join(' ')` matches `/This backup file is for the 2026 workbook\./` and that `localStorage.getItem(key)` is the same before and after.
2. Code:
   - Add near `looksLikeWorkbook`:
     ```js
     /** Same rule as EagleJourney.editionOf (a test checks they agree): no `edition` key means 2023a. */
     const editionOfData = (data) => (data && typeof data === 'object' && data.edition === '2026' ? '2026' : '2023a');
     const EDITION_MESSAGES = {
       '2026': 'This backup file is for the 2026 workbook. Open it in the 2026 workbook from the home page.',
       '2023a': 'This backup file is for the 2023 workbook (No. 2023a). Open it in the 2023 workbook from the home page. Answers don’t move to the 2026 workbook by themselves, because its questions are different.'
     };
     /** null when the file belongs on this page; otherwise the message to show. defaults: the page's defaults function. */
     function editionMismatch(data, defaults) {
       const file = editionOfData(data), page = editionOfData(defaults());
       return file === page ? null : EDITION_MESSAGES[file];
     }
     ```
   - In `openBackup`, right after `if (!looksLikeWorkbook(data)) throw new Error(…);`, add: `const mismatch = editionMismatch(data, defaults); if (mismatch) throw new Error(mismatch);`.
   - Add `editionMismatch, editionOfData` to `window.EagleWorkbook`.
3. Run both test scripts.

### Task 0.3 The 2023a Fill page refuses a 2026 backup file or draft

File: `lib/fill-page.js`.

1. Test first (browser, in the `FillOfficialPDF.html` group): choose `OTHER_EDITION` (Task 0.2) in `#json-file`; assert the chosen-file message (the element `setChosen` writes to, as in the test "rejects a file that is not a workbook backup") contains "This backup file is for the 2026 workbook." and `#create` stays disabled.
2. Code: at the top of `useData(data, label)`, after the existing `looksLikeWorkbook` check, add:
   `if (data.edition === '2026') throw new Error('This backup file is for the 2026 workbook. Open it in the 2026 workbook from the home page.');`
   (The 2023a Fill page does not load `workbook-common.js`, so it can't call `editionMismatch`; the unit test in 0.2 pins the same sentence. Add an assertion to that unit test: `assert.ok(read('lib/fill-page.js').includes(W.editionMismatch(d2026, W.defaults)))`, defining `read` in that block.)
3. Run both test scripts. **Commit:** `feat(backup): Refuse a backup file made for the other workbook edition` (0.2 and 0.3 together). Review panel: Teen/parent and Official-text lenses only (two new sentences).

### Task 0.4 The picture sweep knows the 2026 draft keys

Files: `lib/attachments.js`, `tests/run-tests.cjs`. (Do not change `lib/backup-from-pdf-page.js`.)

1. Test first: change the test "copies: the draft storage keys are the same everywhere they are written out":
   - `const keys = ['eagle_workbook_guided_v1', 'eagle_workbook_v1', 'eagle_workbook2026_guided_v1', 'eagle_workbook2026_v1'];` (the first loop then accepts any of the four in any file).
   - The second loop (files that must know keys) becomes: `lib/attachments.js` must include all four keys; `lib/fill-page.js` and `lib/backup-from-pdf-page.js` must include the two 2023a keys (they list or open 2023a drafts only, until Phases 3 and 6).
   - Add a unit test: load `lib/attachments.js` in Node and assert `A.DRAFT_KEYS` deep-equals the four keys.
2. Code: in `lib/attachments.js` only, `const DRAFT_KEYS = ['eagle_workbook_guided_v1', 'eagle_workbook_v1', 'eagle_workbook2026_guided_v1', 'eagle_workbook2026_v1'];`. `idsInDrafts()` reads every key in `DRAFT_KEYS`, and `lib/backup-from-pdf-page.js` calls `EagleAttachments.sweep()`, which uses it, so no other file changes.
3. Run both test scripts. **Commit:** `fix(storage): Keep pictures that 2026 drafts use when sweeping`.

### Task 0.5 Erase erases this edition only, and sweeps

Files: `lib/workbook-common.js`, `lib/guided-workbook.js`, `lib/classic-workbook.js`, tests.

1. Tests first.
   - Browser, in the per-workbook loop, a new test after "erases the draft from this browser" (the IndexedDB assertion below is the one that fails before the change; the localStorage one already passes): seed `eagle_workbook2026_v1` with `JSON.stringify({ edition: '2026', candidate: { name: 'Other' }, proposal: {} })`, click "erase this draft from this browser", then assert `localStorage.getItem('eagle_workbook2026_v1')` is unchanged and `localStorage.getItem(key) === null`.
   - Change the existing assertion `assert.match(dialogs.join(' '), /Erase your saved drafts/)` to `/Erase your saved 2023 workbook drafts from this browser\?/`. Say in the commit message that this test changed on purpose.
2. Code:
   - `confirmErase(stores, onErased, edition = '2023 workbook')`: the confirm text becomes S17 with `{edition}` filled in:
     ``window.confirm(`Erase your saved ${edition} drafts from this browser? This erases the drafts of both ${edition} pages, including scanned pages only they use.\n\nThis cannot be undone. Save a backup file first if you want to keep your work. Backup files you already saved are not affected.`)``
   - Replace `if (att()) att().clearAll();` with `if (att()) att().sweep();` (no argument, the same call `lib/backup-from-pdf-page.js` already makes). `sweep` runs after `s.erase()`, so the erased drafts no longer hold their pictures and only pictures that another draft still uses are kept. Add a browser assertion to the new test: after Erase, a picture id referenced by the seeded 2026 draft is still in IndexedDB (seed the draft with an `attachments` entry whose page id was stored with `EagleAttachments.putPicture`).
   - The two 2023a page scripts keep calling `W.confirmErase([store, otherStore], …)` with no third argument.
3. Run both test scripts. **Commit:** `fix(storage): Erase only this edition's drafts and keep pictures others use`. Review panel: Engineering and Teen/parent lenses (data-loss behavior).

### Task 0.6 Wording in AGENTS.md and the home page

1. Apply the AGENTS.md changes in the design, section 6, word for word, **except** the rule 4 change (Phase 3) and the layout-table rows (each phase adds the files it creates).
2. Add S19 as its own paragraph: in `index.html`, right after the paragraph that starts `<p>Free, offline helpers for the Eagle Scout Service Project Workbook.`; in `README.md`, right after the line that starts `**Official workbook:**`. Test (unit, "Official-workbook wording" block): both files contain S19 exactly.
3. Run both test scripts. **Commit:** `docs: Prepare the rules and home page for a second edition`.

**Phase 0 done when:** both test scripts pass; a 2026-shaped backup file is refused by both 2023a workbook pages and the 2023a Fill page; Erase on a 2023a page leaves a 2026 draft alone.

---

## Phase 1: the 2026 engine (Node only, no pages)

Goal: `lib/w26-model.js` and `lib/w26-pdf.js`, proven against the real 2026 PDF and Appendix D. Nothing visible changes. Review panel at the end: Engineering and PDF, Official-text fidelity.

### Task 1.1 Cache the 2026 PDFs for tests

File: `tests/run-tests.cjs`.

1. Add, next to `officialPdf()`, a general helper and two callers:
   ```js
   const W26_URLS = {
     workbook: 'https://www.scouting.org/wp-content/uploads/2026/10/512-92726-Eagle-Scout-Leadership-Service-Project-Workbook.pdf',
     appendixD: 'https://filestore.scouting.org/filestore/scoutsbsa/Project-Workbook/Appendix-D-Fundraising-Application.pdf'
   };
   const W26_SHA = {
     workbook: '5810e017ed25e745a9b2c2c9f6ea891acf6147b8d7a019d925388fda152435bb',
     appendixD: '75364d254bcec53514994d6052ae57ea5072f8e0d42ea2ba1f1a685f556cd8a9'
   };
   async function cachedPdf(which, envName) {
     if (process.env[envName]) return new Uint8Array(fs.readFileSync(process.env[envName]));
     const cache = path.join(__dirname, '.cache', path.basename(W26_URLS[which]));
     const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
     if (!fs.existsSync(cache)) {
       console.log(`  downloading ${W26_URLS[which]}`);
       const response = await fetch(W26_URLS[which]);
       if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
       const bytes = Buffer.from(await response.arrayBuffer());
       if (sha(bytes) !== W26_SHA[which] && !process.env.EAGLE_PDF_ALLOW_NEW) throw new Error(`The downloaded 2026 ${which} has SHA-256 ${sha(bytes)}, not the known file. Check its field names (see todo/2026-design.md section 11), or set EAGLE_PDF_ALLOW_NEW=1.`);
       fs.mkdirSync(path.dirname(cache), { recursive: true });
       fs.writeFileSync(cache, bytes);
     }
     return new Uint8Array(fs.readFileSync(cache));
   }
   ```
   Later tasks also check these two hashes against `EagleW26Pdf` constants, so they can't drift.
2. Add a new top-level group after the "Official PDF" group, in the same function scope: `console.log('Official 2026 PDF');`. **Reuse the existing `pdfjsLib` constant; do not declare it again.** Load both with `cachedPdf('workbook', 'EAGLE_PDF_2026')` and `cachedPdf('appendixD', 'EAGLE_PDF_2026_APPD')` inside `try`, pushing `2026 PDF unavailable: …` to `failures` on error (copy the 2023a pattern).
3. First test in the group: `'2026: the cached files are the known official files'` (hash equals `W26_SHA`, unless `EAGLE_PDF_ALLOW_NEW`).

### Task 1.2 The field-name fixture

1. Generate `tests/fixtures/official-2026-fields.json` (a sorted JSON array of the 382 distinct workbook field names) **from the cached PDF**, with a one-off Node command that uses `loadPdfjs()`'s code (copy its body) and `getAnnotations()` on every page. Do the same for Appendix D into `tests/fixtures/official-2026-appendix-d-fields.json` (28 names). Write each file as `'[\n' + list.map((n) => JSON.stringify(n)).join(',\n') + '\n]\n'` (one name per line, like the 2023a fixture).
2. `.gitignore`: add `!tests/fixtures/official-2026-fields.json`, `!tests/fixtures/official-2026-appendix-d-fields.json` and `!tests/fixtures/sample-workbook-2026.json` next to the existing exceptions.
3. Test: `'2026: the field-name fixtures match the cached PDFs'` reads the names with pdf.js and compares.

### Task 1.3 `lib/w26-model.js`: the data model and the field table

1. Create the file with **the wrapper of `lib/attachments.js`** (it passes `root` into the factory; `lib/journey.js` does not, so copying that one breaks in the browser only):
   ```js
   (function (root, factory) {
     'use strict';
     const api = factory(root);
     if (typeof module === 'object' && module.exports) module.exports = api;
     else root.EagleW26 = api;
   })(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
     'use strict';
     const P = () => (typeof module === 'object' && module.exports ? require('./official-pdf.js') : root.EagleOfficialPdf);
     // ...
     return { /* names below */ };
   });
   ```
2. Contents:
   - `EDITION = '2026'`.
   - `defaults()`: exactly the object in the design, section 4.2.
   - `FIELDS`, `APPENDIX_D_FIELDS`, `FIXED_BOXES`, `LABELS`, `COMPUTED_LABELS`, `APPENDIX_D_LABELS`, `OFFICIAL`: paste the JS block from `2026-field-map.md` (it ends with `OFFICIAL`). `FIELDS` rows are `[name, kind, path, format, firstPage, type]`; `APPENDIX_D_FIELDS` rows are `[name, kind, path, format, page]`. Labels are keyed by draft path (computed totals by field name), never by field name, because Appendix D reuses workbook names for other people.
   - `OFFICIAL_URL` and `APPENDIX_D_URL` (the two 2026 URLs in Task 1.1); `lib/w26-pdf.js` re-exports them, and a test checks both equal `W26_URLS`.
   - `ID_FIELDS = ['Beneficiary and Impact', 'Motivation', 'Artificial Intelligence', 'Input from Scoutmaster', 'Certification of Completion Signature', 'Organizing Tasks']`.
   - `APPENDIX_D_ID_FIELDS = ['For what will you use the funds', 'units chartered organization', 'any unneeded donations to the beneficiary', 'Council Rep Signature']`.
   - Export all of these, plus `totals`, `fit` (Tasks 1.4, 1.6).
3. Tests first (new block `console.log('2026 model')`; load it with `require(path.join(ROOT, 'lib/w26-model.js'))`):
   - `defaults()` has `edition: '2026'`, 10 steps, 12 helpers, 3 hazards, 12 items, 9 spending rows, 5 hours rows in each of proposal, plan and report with row 0 `w === '1'`.
   - **Every 2026 field is classified exactly once:** the names in `FIELDS` equal the fixture, with no duplicates; same for `APPENDIX_D_FIELDS`.
   - Every `path` in `FIELDS` and `APPENDIX_D_FIELDS` exists in `defaults()` (walk the object; a missing key fails).
   - Every leaf path in `defaults()` is used by at least one field, except `edition`, the `w` of hours row 0 in proposal, plan and report, and anything under `attachments`, `links` and `journey`. Print the unused paths in the failure message.
   - `FIXED_BOXES` equals the cached PDF's 12 pt text widgets (`fieldType === 'Tx'` and `defaultAppearanceData.fontSize === 12`) in page order: name, page, `Math.round((rect[2] - rect[0]) * 100) / 100`, `Math.round((rect[3] - rect[1]) * 100) / 100`, `multiLine`. Compare exactly (the block was generated this way).
   - Every `never` field is in this explicit list (19 workbook, 7 Appendix D): the 9 signature fields, `Promise Signature Date`, `Scoutmaster Approval Date`, `Unit Committee Signature Date`, `Beneficiary Approval Signature Date`, `District or Council Signature Date`, `Candidate’s Promise Date`, `Certification Signature Date`, `Beneficiary Signature Date`, `Scoutmaster Final Signature Date`, `Provided Copy of Info for Beneficiaries`; Appendix D `Unit Rep Signature`, `Beneficiary Signature`, `Council Rep Signature`, `Date`, `Date_2`, `Date_3`, `Authorized Council Approval`. Copy the names from the field-map JS block.
   - `LABELS` has every path of the workbook fields that are not `computed`, `never` or `fixed`; `COMPUTED_LABELS` has every computed field name; `APPENDIX_D_LABELS` has every Appendix D path that is not `never`.
   - Every computed row has `type` `money`, `hours` or `count`, and exactly `Total People`, `Project Plan Total Individuals` and `Total Volunteers` are `count`.

### Task 1.4 Totals

In `lib/w26-model.js`, `totals(data)` returns `{ values, invalid }`. `values` maps each `computed` field name to a number, or to `''` when it is blank; `invalid` lists the names left out because a part is not a plain number (those names are **not** in `values`).

Rules (from the field map, column "Format"):
- Use `P().parseAmount` for money, `P().parseWhole` for counts, `P().parseCount` for hours. A blank part (`null`) counts as 0; a part that is `NaN` puts that total in `invalid`.
- Head counts add 1 for the Scout (`Total People`, `Project Plan Total Individuals`, `Total Volunteers`).
- Row costs: `P().rowCost(row)` for each of the 12 plan items (`Total CostRow1`…`Total CostRow12`) and 9 spending rows (`Total CostRow1_2`…`Total CostRow9_2`). `amount === null` (no cost entered) → the row total is `''`; `NaN` → `invalid`; a number → that number. The list totals add the rows, treating `''` as 0, and are invalid if any row is invalid.
- `Difference` = collected − spent; a blank side counts as 0.
- **Grand totals and `Difference` are 0 when nothing was entered** (head counts 1), as the blank form shows. Only row totals can be `''`.

Tests first (hand-computed numbers):
- Blank draft: every grand money total and `Difference` is 0; `Total People`, `Project Plan Total Individuals` and `Total Volunteers` are 1; every hours total is 0; every `Total CostRow…` is `''`; `invalid` is empty.
- Proposal costs `10`, `20.50`, blank, `5` → `Total Prelimary Cost Estimate` 35.5.
- Hours: `proposal.hours[1] = { w: '2', h: '8' }`, `plan.hours[1] = { w: '5', h: '10' }`, `report.hours[1] = { w: '10', h: '50' }` → `Youth Members Total Hours` 68 (the workbook's own example on page 20), `Total People` 3, `Project Plan Total Individuals` 6, `Total Volunteers` 11.
- `plan.items[0] = { qty: '3', unitCost: '20.00' }` → `Total CostRow1` 60 (the page 17 example), `Total CostTotal Cost` 60.
- `plan.funds = { beneficiary: '100', exempt: '50', others: '25', future: '40', futureDate: '', donated: '10' }` → `Funds Raised So Far` 175, `Total Funds` 225.
- `report.collected = '500'`, `report.spent = '480.25'` → `Difference` 19.75.
- `proposal.costs.tools = 'about 20'` → `Total Prelimary Cost Estimate` is not in `values` and is in `invalid`.

### Task 1.5 Formats

In `lib/w26-pdf.js` (create it now with the same wrapper; global `EagleW26Pdf`; it uses `P()` and `M()` for `EagleW26` the same way):

- `formatDateAs(value, format)`: `format` is `'m/d/yyyy'`, `'mm/dd/yyyy'` or `'m/d/yy'`. A real date written `YYYY-MM-DD`, `M/D/YYYY` or `MM/DD/YYYY` → the format (`2010-01-02` → `1/2/2010`, `01/02/2010`, `1/2/10`). Blank → `''`. Anything else (including `2026-02-30`) → `str(value)` unchanged, and the caller adds S10.
- `plainNumber(value, decimals)`: blank → `''`; `parseAmount` (decimals 2) or `parseWhole` (decimals 0) gives a number → `n.toFixed(decimals)` (no `$`, no commas, `-0.00` becomes `0.00`); otherwise `null` (the caller writes the text as typed and adds S9).

Tests first: every example above; `'3/1/2027'` and `'03/01/2027'` with `'mm/dd/yyyy'` → `'03/01/2027'`; `'3/1/2027 to 3/15/2027'` → unchanged; `'$1,250.5'` → `'1250.50'`; `'12'` with 0 decimals → `'12'`; `'2.5'` with 0 decimals → `null`; `'-0.001'` → `'0.00'`.

### Task 1.6 Fit

In `lib/w26-model.js`: `fit(name, value)` returns a list, one entry per fixed-size widget of that field: `{ page, lines, capacity, fits }`. For a multi-line box, `capacity = Math.max(1, Math.floor((height - 2) / (12 * P().LINE_FACTOR)))` and `lines = P().wrappedLines(value, Math.max(1, width - 4), 12)`. For a single-line box, `capacity = 1`, `lines = P().textWidth(value.replace(/\s*\n\s*/g, ' '), 12) > width - 4 ? 2 : 1`. `fits = lines <= capacity`. Not a fixed box → `[]`.

Tests first:
- `fit('Project Description', '')` has three entries, pages 7, 11, 22, capacities 11, 3, 7.
- **Agreement with the Fill page:** open the cached 2026 PDF, `P().readWidgets(doc)`, and for every fixed box and each of the strings `'installation '.repeat(n).trim()` for `n` in 1, 5, 10, 20, 40, 80, check that `fit(name, value)` for that widget's page says `fits === false` exactly when `P().mayOverflow(value, widget)` is true for the **real** widget. (Comparing with shapes rebuilt from `FIXED_BOXES` would compare the formula with itself.)
- `fit('Leadership', '')[0].capacity === 11` and `fit('Emergency Vehicle Access', '')[0].capacity === 2` (the rounding traps).
- `fit('Candidates Full Name', 'x')` is `[]` (auto-size).

### Task 1.7 Values for the workbook

In `lib/w26-pdf.js`: `buildFieldValues(data, { skipApprovalNames = false } = {})` returns `{ text, radio, choice, notes }` as described in the design 4.4. Walk `M().FIELDS` once; switch on the kind. Notes use the row's `firstPage` and the label `M().LABELS[path]` (computed: `M().COMPUTED_LABELS[name]`) in strings S9, S10, S11, S12.

Tests first (block `console.log('2026 values')`):
- Nothing from a `never` field ever appears in `text`, `radio` or `choice`, for `defaults()`, the sample (Task 1.10) and a draft where every leaf is `'X'`.
- `skipApprovalNames: true` leaves the four `approvalName` fields out; `false` fills them from the contacts.
- `Eagle Scout Candidate` is always `'1'`.
- Dates: `candidate.dob: '2010-01-02'` → `text['Birth Date'] === '1/2/2010'`; `proposal.beginDate: '2027-03-04'` → `'03/04/2027'`; `plan.funds.futureDate: '2027-03-04'` → `'3/4/27'`.
- Money: `proposal.costs.materials: '$1,250.5'` → `'1250.50'`; `'about 20'` → `'about 20'` and exactly one note equal to S9 with page 9, label "Preliminary cost: materials" and value "about 20".
- Computed: every computed field in `totals().values` is in `text`, formatted by its `type` (`toFixed(2)` for `money` and `hours`, `toFixed(0)` for `count`); a value of `''` is absent from `text`; an invalid total is absent from `text` and adds S11.
- Choice: `unit.type: 'Crew'` → `choice.Dropdown1 === 'Crew'`; `'Pack'` → `'Troop'` and S12.
- Radio: `needFundraisingApp: 'yes'` → `radio['Need Fundraising App?'] === 'Yes'`; blank → absent.

### Task 1.8 Check a chosen PDF

`checkPdf(pdfjsLib, bytes)` → `{ ok: true, kind: 'workbook' | 'appendixD', exact }` or `{ ok: false, message }`. Hash first (pdf.js takes over the bytes: see the AGENTS.md gotcha), then `P().openPdf`, `P().readWidgets`. Workbook if every `ID_FIELDS` name is there; Appendix D if every `APPENDIX_D_ID_FIELDS` name is; 2023a if every `P().SIGNATURE_FIELDS` name is (message S2); otherwise `"This PDF is not the official 2026 Eagle Scout Leadership Service Project Workbook or its Appendix D. Use “Get the official PDF for me,” or download them from scouting.org and choose those files."`. Constants: `OFFICIAL_URL` and `APPENDIX_D_URL` (from `M()`), `OFFICIAL_SHA256 = ['5810e017ed25e745a9b2c2c9f6ea891acf6147b8d7a019d925388fda152435bb']`, `APPENDIX_D_SHA256 = ['75364d254bcec53514994d6052ae57ea5072f8e0d42ea2ba1f1a685f556cd8a9']`. Test: these equal `W26_URLS` and `W26_SHA` in the test file.

Tests first: `lib/w26-pdf.js` contains S2 and S3 exactly; cached workbook → `{ ok: true, kind: 'workbook', exact: true }`; Appendix D → `kind: 'appendixD'`; the 2023a cached PDF → `ok: false` with S2; a changed copy (append the bytes `[10, 37, 120]` to the end, as the 2023a test does) → `ok: true, exact: false`.

### Task 1.9 Fill the workbook

`fillWorkbook({ pdfjsLib, pdfBytes, data, skipApprovalNames })` → `{ bytes, report: { filled, totalFields, warnings } }`. Copy `fillOfficialPdf` from `lib/official-pdf.js` and change exactly what the design 4.4 lists (identity check, the "already had answers" check ignoring computed fields, `Eagle Scout Candidate` and `Dropdown1`, choice writing, fit warnings S8a, S8b and S7, page numbers from the widget). Use `P().PRINTABLE` for the character warning and keep its wording, with "the workbook's font" unchanged.

For S7: when the field is `Project Description` and the page-11 widget doesn't fit, use S7 instead of S8a for page 11 (pages 7 and 22 still use S8a). Use S8a when the widget is multi-line and S8b when it is single-line.

Tests first (real PDF):
- Fill the sample (Task 1.10): `report.filled` equals the number of entries in `buildFieldValues(sample)` (`text` + `radio` + `choice`); `readValues` of the result gives, for every `text` field in `buildFieldValues`, the same value (after the single-line `; ` replacement); `readValues` has no value for any `never` field; the widget count is still 446; the first `pdfBytes.length` bytes of the output equal the input (pdf.js appends an update).
- A blank fresh file gives no "already had answers" warning; a file filled once and filled again does.
- `proposal.description = 'installation '.repeat(40).trim()` (519 characters: 5 lines, which fits pages 7 and 22 and not page 11) → exactly one S7 and no S8a for that field. `'installation '.repeat(12).trim()` (2 lines) → neither.

### Task 1.10 The fictional 2026 sample

1. Create `tests/fixtures/sample-workbook-2026.json` by hand: start from `defaults()`, and fill **every** path used by a field with fictional, generic text (a made-up bike-repair station at a made-up community center; no real names, places or organizations; "Alex Example", "Riverside Community Center", phone `555-0100`, email `alex@example.org`). Dates `YYYY-MM-DD`. Money as plain amounts, with one `'$1,200.00'` to test parsing. `unit.type: 'Crew'`, `needFundraisingApp: 'yes'`.
   - Table rows (`plan.steps`, `plan.helpers`, `plan.hazards`, `plan.items`, `report.spending`): fill the rows with index 0, 1 and 2; leave the rest blank.
   - Hours tables: fill all five rows. Row 1 must be the workbook's example: `proposal.hours[1] = { w: '2', h: '8' }`, `plan.hours[1] = { w: '5', h: '10' }`, `report.hours[1] = { w: '10', h: '50' }` (so page 20 shows 68.00 for that row). Other rows: any small whole numbers; row 0's `w` stays `'1'`.
2. Test: the sample merges with `defaults()` without losing keys; every field path that is not `computed`, `never` or `fixed` has a non-blank value in the sample, except table rows with index 3 and up.

### Task 1.11 Appendix D

`buildAppendixDValues(data)` and `fillAppendixD({ pdfjsLib, pdfBytes, data })`, the same way as 1.7 and 1.9 with `APPENDIX_D_FIELDS`, plus note S14 always.

Tests first: fill the cached Appendix D from the sample; `readValues` gives the Scout's name, the proposal's fundraising text in `How will you seek donations from page 9 of the Eagle Scout Leadership Service Project Workbook`, `appendixD.howMuch` in `undefined`, nothing in the 7 `never` fields; S14 is in the warnings.

### Task 1.12 Read a filled 2026 workbook back

`readBackup({ pdfjsLib, pdfBytes })` → `{ data, report: { read, warnings } }`, following `readBackupFromPdf` in `lib/official-pdf.js`. It walks `FIELDS`: `text`/`approvalName` → path (an `approvalName` is read only if its contact path is still blank); `date` → `YYYY-MM-DD` from any of the three formats (two-digit year → 20yy; anything else kept as text); `money`/`count`/`hours` → the text as found; `choice` → `unit.type` if `Troop`/`Crew`/`Ship` (`P().readFieldValues` keeps only string values, and pdf.js returns a choice value as an array such as `['Crew']`: read the drop-down yourself from `getAnnotations()` and take `fieldValue[0]`); `radio` → `yes`/`no`; `computed`, `fixed`, `never` → skipped. Same errors as 2023a for a flattened PDF and an empty form; when deciding whether the form is empty, ignore computed fields, `Eagle Scout Candidate` and `Dropdown1`, which the blank form presets; a 2023a PDF → "This is the 2023 workbook (No. 2023a). Open it with “Make a backup file from a PDF” for the 2023 workbook."; Appendix D → S15.

Tests first: reading the blank cached 2026 PDF gives the "no answers typed in yet" error; round trip `readBackup(fillWorkbook(sample))`: for every entry of `answers(sample)` whose path a non-computed field uses, `sameAnswer` holds (copy the 2023a round-trip test). Money read back as `1250.50` matches `'$1,250.50'` through `sameAnswer`.

### Task 1.13 Other viewers

1. `tests/pdfkit-check.swift`: also collect choice fields: `else if annotation.widgetFieldType == .choice { text[name, default: []].append(annotation.widgetStringValue ?? "") }`. The existing 2023a PDFKit test must still pass.
2. Browser test (macOS only, like the 2023a one): fill the sample with `EagleW26Pdf` inside the page context is not possible yet (no page), so run it in `tests/run-tests.cjs` instead: if `process.platform === 'darwin'` and `swiftc` exists, compile the checker to `os.tmpdir()`, run it on the filled sample, and assert the Scout's name has 23 copies, `Dropdown1` is `Crew`, and `Need Fundraising App?` is `Yes`. Otherwise print `skip` (this one is allowed to skip: it needs macOS).
3. Poppler (if `pdftotext` exists): the filled sample's text on page 1 contains the project title, page 5 the Scout's email, page 7 the first words of the description, page 17 the plan's total cost (as written by `buildFieldValues`), and page 20 contains `68.00` (row 1's total hours, from the sample's example values).

**Phase 1 commit:** `feat(2026): Fill and read back the 2026 workbook and Appendix D (engine)`. Run the review panel (Engineering and PDF; Official-text fidelity: mapping of every field against the PDF). Then update the AGENTS.md layout table with the two new libraries.

---

## Phase 2: the Classic 2026 page

Goal: `EagleWorkbook2026.html` works from `file://`: every 2026 box, official wording and order, save and open backup files, Review tab. No Fill page yet (its Next button goes to the home page with the text "Next: back to the home page →" until Phase 3).

### Task 2.1 Key boxes and tab order for 2026

File: `lib/journey.js`.

1. Tests first: `keyBoxes({ edition: '2026' })` returns the 2026 table; `tabOrder({ edition: '2026' })` is `['setup', 'proposal', 'fundraising', 'plan', 'report']`; `tabOrder({})` equals `TAB_ORDER`; 2026 fundraising boxes count only when `proposal.needFundraisingApp === 'yes'`; every 2026 path exists in `EagleW26.defaults()`; the 2023a counts are unchanged (existing tests).
2. Code: add `KEY_BOXES['2026']`:
   ```js
   '2026': {
     setup: [
       { path: 'candidate.name', label: 'Your name' }, { path: 'candidate.email', label: 'Your email' },
       { path: 'unit.number', label: 'Unit number' }, { path: 'contacts.leader.name', label: 'Scoutmaster' },
       { path: 'contacts.beneficiary.name', label: 'Beneficiary organization' }, { path: 'contacts.beneficiaryRep.name', label: 'Beneficiary representative' }
     ],
     proposal: [
       { path: 'proposal.projectName', label: 'Project title' }, { path: 'proposal.beneficiaryImpact', label: 'Beneficiary and impact' },
       { path: 'proposal.description', label: 'Project description' }, { path: 'proposal.motivation', label: 'Motivation' },
       { path: 'proposal.work', label: 'The work' }, { path: 'proposal.leadership', label: 'Leadership' },
       { path: 'proposal.resources', label: 'Resources needed' }, { path: 'proposal.safety', label: 'Safety' }
     ],
     fundraising: [
       { path: 'appendixD.useOfFunds', label: 'What the funds are for' }, { path: 'appendixD.howMuch', label: 'How much you expect to raise' },
       { path: 'appendixD.donors', label: 'Donors' }, { path: 'appendixD.safeguarding', label: 'Safeguarding donations' }
     ],
     plan: [
       { path: 'plan.presentCondition', label: 'Present condition' }, { path: 'plan.steps.0.step', label: 'Project steps' },
       { path: 'plan.helpers.0.job', label: 'Leading others' }, { path: 'plan.organizing', label: 'Organizing tasks' },
       { path: 'plan.firstAidKit', label: 'First aid kit' }, { path: 'plan.safetyAdults', label: 'Safety talks with adults' },
       { path: 'plan.hazards.0.hazard', label: 'Hazards' }, { path: 'plan.permits', label: 'Permissions or permits' },
       { path: 'plan.items.0.item', label: 'Materials list' }, { path: 'plan.beneficiaryInput', label: 'Input from beneficiary' },
       { path: 'plan.leaderInput', label: 'Input from Scoutmaster' }
     ],
     report: [
       { path: 'report.observations', label: 'Observations' }, { path: 'report.challenges', label: 'Challenges' },
       { path: 'report.changes', label: 'Changes' }, { path: 'report.leadershipStyle', label: 'Your leadership style' },
       { path: 'report.materialsUse', label: 'Use of materials' }, { path: 'report.thanks', label: 'Acknowledgment' },
       { path: 'report.aiUse', label: 'Artificial intelligence' }
     ]
   }
   ```
   `SHORT_ANSWER_BOXES['2026']`: proposal `beneficiaryImpact`, `description`, `motivation`, `work`, `leadership`, `safety`; plan `presentCondition`, `organizing`, `safetyAdults`; report `observations`, `challenges`, `leadershipStyle`, `rewarding` (labels as in the key-box table; `rewarding` is "Most rewarding").
   Add `TAB_ORDERS = { '2023a': TAB_ORDER, '2026': ['setup', 'proposal', 'fundraising', 'plan', 'report'] }` and `tabOrder(data)`; `emptyKeyBoxes` and `keyBoxCount` loop over `tabOrder(data)`. `countsFundraising(data)`: for 2026, `data.proposal && data.proposal.needFundraisingApp === 'yes'`; for 2023a unchanged. Export `tabOrder`.
3. In `reviewSection` (`lib/workbook-common.js`), skip part 5 ("Next on your path") when `J.editionOf(d) === '2026'`, with the comment `// 2026 Your path comes in Phase 5 (todo/2026-implementation-plan.md).` Test: the 2026 page's Review tab has no "Next on your path" heading.

### Task 2.2 Small options in the shared code

File: `lib/workbook-common.js` (and the CSP test). Every option defaults to today's 2023a behavior, so the 2023a pages pass nothing new and their tests don't change.

1. Tests first:
   - These functions build DOM, so test them in the browser. On the 2023a pages, the existing test "official PDF link, filler link, and disclaimer are present" must still pass unchanged. On the 2026 page (Task 2.5): no `a[href="FillOfficialPDF.html"]`, no `a[href="BackupFromPDF.html"]`, and no link to the 2023a PDF URL.
2. Code:
   - `controls({ …, fillHref = 'FillOfficialPDF.html' })`: the "Fill the official PDF →" link uses `fillHref`.
   - `footer({ onErase, fillHref = 'FillOfficialPDF.html', officialUrl = OFFICIAL_PDF_URL, backupHref = 'BackupFromPDF.html' })`: when `backupHref` is `null`, leave out " · " and the "Make a backup file from a PDF" link.
   - `askForHelp({ get, setupName, roles = ROLES })`: move today's `ROLES` list out of the function (unchanged) and use `roles`.
   - `createForm` returns `print` as well (`return { field, row, section, contactBlock, table, costTable, hoursTable, watch, tipBox, print }`).
   - `scoutlyBox(extra = null)`: when `extra` is a string, add `h('p', { className: 'small' }, extra)` after the first paragraph. Find where `scoutlyBox()` is called (in `askForHelp`) and pass through a new `askForHelp` option `scoutlyNote = null`.
   - `reviewSection`: skip part 5 when `J.editionOf(d) === '2026'` (Task 2.1 step 3).
   - `tests/run-tests.cjs`, the CSP test: `const mayFrame = ['EagleWorkbook-guided.html', 'EagleWorkbook.html', 'EagleWorkbook2026.html', 'EagleWorkbook2026-guided.html'].includes(file);`.
3. Run both test scripts.

### Task 2.3 `lib/w26-ui.js`

Global `EagleW26Ui`; same wrapper as `lib/w26-model.js` (Task 1.3). Every function takes the form `f` from `W.createForm` and builds with `f.field`, `f.row`, `f.section`, `f.table`, `f.watch`, `W.h`. **All official wording comes from `EagleW26.OFFICIAL`**; this file and the page script contain no hand-typed official text.

Let `O = EagleW26.OFFICIAL`.
- `box(f, path, opts = {})`: `const [, label, help] = O.boxes[path]; return f.field(label, path, { ...opts, help: help || null });`. Throws `Error('no official wording for ' + path)` if `O.boxes[path]` is missing.
- `sec(f, id, ...children)`: `const [, title, intro] = O.sections[id]; return f.section(title, intro || null, ...children);`.
- `select(f, get, set, path, options)`: label from `O.boxes[path][1]`, a `<select id="f-<path>">`, options `[[value, text], …]`; `change` calls `set(path, value)`. In print mode (`f.print`) show the chosen text the way `field` shows a value.
- `person(f, key, id, nameLabel = 'Name')`: `sec(f, id, …)` with `nameLabel` (`contacts.<key>.name`), "Email" (`type: 'email'`) and "Telephone" (`type: 'tel'`). `place(f, key, id, nameLabel)`: also "Street Address", "City", "State". Take every one of these labels from `O.tables['contacts.labels'][1]` (look each up by its text and throw if it is not there), so the wording test covers them. Use `place` for `parent.*` too (prefix `parent` instead of `contacts.<key>`).
- `fitNote(f, get, fieldName, path)`: `<p class="help fit" aria-live="polite">`, updated on `f.watch(path)`, with S21 built from `EagleW26.fit(fieldName, value)`; hidden when blank.
- `hoursTable(f, get, set, path)` for `proposal.hours` and `plan.hours`: row labels `O.tables[path + '.rows'][1]` (6 labels; the 6th is the grand total row), column headers `O.tables[path + '.cols'][1]`; row 0's count is the text `1` (not an input); the grand total row shows `EagleW26.totals` values (people, hours), live.
- `reportHoursTable(f, get, set)`: row labels `O.tables['report.hours.rows'][1]`; with `H = O.tables['report.hours.headers'][1]`, the five column headers are `` `${H[0]} ${H[1]}` `` ("Proposal Hours (from page 9)", read-only from `proposal.hours[i].h`), `` `${H[2]} ${H[3]}` `` (read-only from `plan.hours[i].h`), `` `${H[4]} ${H[5]}` `` (input `report.hours[i].w`), `` `${H[4]} ${H[6]}` `` (input `report.hours[i].h`), `` `${H[7]} ${H[8]}` `` (from `totals`); grand total row from `totals`.
- **Display format of every total on the page:** head counts `toFixed(0)`, hours and money `toFixed(2)` (the field's `type`), money with `EagleOfficialPdf.formatMoney`.
- `costTable(f, get, set, path, limit)` for `plan.items` (12) and `report.spending` (9): `f.table` with `O.tables[path][1]` as headers and fields `item, description, qty, unitCost, totalCost, source`; a live "Total Cost: $x" (with `EagleOfficialPdf.formatMoney`) from `totals` (`Total CostTotal Cost` or `Total CostTotal Cost_2`); if more than `limit` rows have something, the same extra-rows sentence as the 2023a `costTable`.
- `readOnly(f, label, path, linkText, onClick, note)`: shows `get(path)` (or "—"), a link-button `linkText`, and `note` as `<p class="help">`.

### Task 2.4 `EagleWorkbook2026.html` and `lib/w26-classic.js`

1. Copy `EagleWorkbook.html` to `EagleWorkbook2026.html`. Change: `<title>` "Classic 2026 Eagle Project Workbook: official order and wording"; `<meta name="description">` and `og:description` "Fill out the 2026 Eagle Scout Leadership Service Project Workbook in the official order with the official wording. Saves a backup file. Free."; `og:title` equal to the title. Scripts at the bottom, in this order: `lib/official-pdf.js`, `lib/preflight.js`, `lib/journey.js`, `lib/w26-model.js`, `lib/attachments.js`, `lib/workbook-common.js`, `lib/w26-ui.js`, `lib/w26-classic.js`. Keep the CSP exactly as `EagleWorkbook.html` has it.
2. Copy `lib/classic-workbook.js` to `lib/w26-classic.js` and change:
   - Header comment: "the Classic 2026 workbook (EagleWorkbook2026.html)".
   - `W.createStore('eagle_workbook2026_v1')`; `otherStore = W.createStore('eagle_workbook2026_guided_v1')`.
   - Every `W.defaults` → `window.EagleW26.defaults` (load, `openBackup`, Erase).
   - `TABS = ['Project Contacts', 'Project Proposal', 'Fundraising Application (Appendix D)', 'Project Plan', 'Project Report', 'Review']`; `TAB_KEYS = ['setup', 'proposal', 'fundraising', 'plan', 'report']`. Remove `SIGNED_TAB`, `renderSigned`, the attachments `ready()` call and the Signed section of `printDraft` (Phase 5 brings them back). `reviewSection`'s `tabs.signed` becomes `null`.
   - Banner: first child of `main`: `h('p', { className: 'edition-banner' }, 'For the 2026 workbook (No. 512-927). ', h('a', { href: 'index.html' }, 'Other workbook'))`. Add the same banner, with "For the 2023 workbook (No. 2023a). ", to the two 2023a page scripts.
   - Erase: `W.confirmErase([store, otherStore], () => { … }, '2026 workbook')`.
   - `W.controls({ …, fillHref: 'index.html' })` and `W.footer({ onErase, fillHref: 'index.html', officialUrl: window.EagleW26.OFFICIAL_URL, backupHref: null })`. (Phase 3 changes `fillHref` to `FillOfficialPDF2026.html`.)
   - Remove `journeyCard` (Phase 5). Keep `askForHelp` with `setupName: 'Project Contacts'`, `roles: [['leader', 'Scoutmaster'], ['coach', 'Project coach/advisor'], ['approvalRep', 'Council or district approval representative'], ['serviceCenter', 'Council service center']]` and `scoutlyNote:` S20.
   - Last tab's Next button: `h('a', { className: 'btn btn-next', href: 'index.html' }, 'Next: back to the home page →')`.
   - The renderers below.
3. Renderers. `U = window.EagleW26Ui`. Build each tab in this order; `box(path)` means `U.box(f, path, opts)`, `sec(id, …)` means `U.sec(f, id, …)`. Long boxes get `{ multi: true, rows: N }` with N = the box's line count in the field map (at least 3) and a `U.fitNote` with the PDF field name from the field map. Dates get `{ type: 'date' }`; amounts, counts and hours `{ inputmode: 'decimal' }`. `appendixD.dates` is a plain text box (the field asks for dates, plural).

   **Project Contacts:** `sec('contacts')` (no boxes, title only) then:
   - `sec('contacts.candidate', …)`: `box('candidate.name')`, `box('candidate.dob', date)`, `box('candidate.address')`, `box('candidate.city')`, `box('candidate.state')`, `box('candidate.email', email)`, `box('candidate.phone', tel)`, `box('candidate.pid')`, `box('candidate.borDate', date)`.
   - `sec('contacts.parent', …)`: the six `parent.*` boxes with labels Name, Street Address, City, State, Email, Telephone (use `U.place`-style fields on `parent.*`).
   - `sec('contacts.unit', …)`: `U.select(f, get, set, 'unit.type', [['Troop', 'Troop'], ['Crew', 'Crew'], ['Ship', 'Ship']])`, `box('unit.number')`, `box('unit.district')`, `box('unit.council')`.
   - `U.person(f, 'leader', 'contacts.leader')`, `U.person(f, 'committee', 'contacts.committee')`, `U.place(f, 'beneficiary', 'contacts.beneficiary', 'Name of Organization')`, `U.person(f, 'beneficiaryRep', 'contacts.beneficiaryRep', 'Name of Representative')`, `U.place(f, 'serviceCenter', 'contacts.serviceCenter', 'Contact Name')`, `U.person(f, 'approvalRep', 'contacts.approvalRep', 'Name of Representative')`, `U.person(f, 'coach', 'contacts.coach', 'Name of Project Coach/Advisor')`.

   **Project Proposal:** `box('proposal.projectName')`; then each long box in its own card titled with its label (`f.section(label, null, box(…), fitNote)`): `proposal.beneficiaryImpact`, `proposal.description` (add S5 under it as `<p class="help">`), `proposal.motivation`; `sec('proposal.timeline', box('proposal.approvedDate'), box('proposal.planDate'), box('proposal.beginDate'), box('proposal.completeDate'))`; cards for `proposal.work`, `proposal.leadership`; `sec('proposal.hours', U.hoursTable(f, get, set, 'proposal.hours'))`; a card for `proposal.resources`; `sec('proposal.costs', box('proposal.costs.materials'), box('proposal.costs.supplies'), box('proposal.costs.tools'), box('proposal.costs.other'), live "TOTAL: $x")`; a card for `proposal.fundraising` with `U.select(…, 'proposal.needFundraisingApp', [['', 'Not answered yet'], ['yes', 'YES'], ['no', 'NO']])` under it; a card for `proposal.safety`; then `sec('proposal.approval')`, `sec('proposal.brief', U.readOnly(f, 'Project Description', 'proposal.description', 'Change it above', () => goToBox('proposal', 'proposal.description'), S5))`, `sec('proposal.promise', h('p', { className: 'help' }, 'This helper never fills in signatures or the dates beside them.'))`.

   **Fundraising Application (Appendix D):** `sec('appendixD', h('p', { className: 'intro' }, 'Only if you need a Fundraising Application.'), U.select(…, 'proposal.needFundraisingApp', …same options))`; `sec('appendixD.description', U.box(f, 'appendixD.useOfFunds' …))`; `sec('appendixD.fundraising', U.readOnly(f, O.appendixD['proposal.fundraising@appendixD'][1], 'proposal.fundraising', 'Change it on the Project Proposal tab', () => goToBox('proposal', 'proposal.fundraising'), S22), box('appendixD.dates'), box('appendixD.howMuch', decimal))`; `sec('appendixD.donors', box('appendixD.donors', multi))`; `sec('appendixD.contracts', box('appendixD.contracts', multi))`; `sec('appendixD.safeguarding', box('appendixD.safeguarding', multi))`. The Appendix D boxes read their wording from `O.appendixD` (make `U.box` look in `O.appendixD` when the path starts with `appendixD.`).

   **Project Plan:** cards for `plan.reviewComments`, `plan.presentCondition`; `sec('plan.steps', table plan.steps)` with `O.tables['plan.steps']` headers and fields `step, duration`; `sec('plan.helpers', table)` with fields `job, skills, adultYouth, needed, soFar`; cards for `plan.organizing`, `plan.training`, `plan.communication`, `plan.workSessions`; `sec('plan.hours', U.hoursTable(f, get, set, 'plan.hours'))`; `sec('plan.safety', box('plan.firstAidKit'), box('plan.firstAidSpecialist'), box('plan.safetyAdults'), sec('plan.hazards', table plan.hazards fields hazard, prevention), box('plan.ppe'), box('plan.toolSafety'), box('plan.adultTools'), box('plan.safetyBriefing'), box('plan.emergencyAccess'))` (each long box with its fitNote); a card for `plan.permits`; `sec('plan.items', U.costTable(f, get, set, 'plan.items', 12), sec('plan.items.note'))`; `sec('plan.funds', box('plan.funds.beneficiary'), box('plan.funds.exempt'), box('plan.funds.others'), live "Total funds available or raised so far: $x", box('plan.funds.future'), box('plan.funds.futureDate', date), box('plan.funds.donated'), sec('plan.funds.total', live "Total Funds: $x"))`; a card for `plan.fundingSources`; `sec('plan.logistics', box('plan.materialTransport'), box('plan.workerTransport'))`; `sec('plan.reviews', box('plan.beneficiaryInput'), box('plan.leaderInput'))`; `sec('plan.promise', h('p', { className: 'help' }, 'This helper never fills in signatures or the dates beside them.'))`.

   **Project Report:** `sec('report.reflections', box('report.observations'), box('report.challenges'), box('report.changes'))`; `sec('report.leadership', box('report.leadershipStyle'), box('report.rewarding'))`; a card for `report.materialsUse`; `sec('report.hours', U.reportHoursTable(f, get, set))`; `sec('report.spending', U.costTable(f, get, set, 'report.spending', 9), box('report.collected'), box('report.spent'), live "Difference: $x", box('report.differenceExplained'))`; cards for `report.thanks`, `report.aiUse`; `sec('report.certification', h('p', { className: 'help' }, 'This helper never fills in signatures or the dates beside them.'))`; `sec('report.acceptance', sec('report.brief', U.readOnly(f, 'Project Description', 'proposal.description', 'Change it on the Project Proposal tab', () => goToBox('proposal', 'proposal.description'), S6)))`. (Photos and Documents comes with the Signed Pages tab in Phase 5.)

   The live total lines ("TOTAL: $x", "Total funds available or raised so far: $x", "Total Funds: $x", "Total Cost: $x", "Difference: $x") use the printed label of that line (page 9, 17, 21) followed by `EagleOfficialPdf.formatMoney(value)`, or "can't add up yet: use plain numbers like 12.50" when the total is in `invalid`.

   `printDraft` sections: `[['Project Contacts', …], ['Project Proposal', …], ['Fundraising Application (Appendix D)', …], ['Project Plan', …], ['Project Report', …]]`.

### Task 2.5 Tests for the Classic 2026 page

Unit (`tests/run-tests.cjs`):
- Add `EagleWorkbook2026.html` to `PAGES` (the page-policy tests then cover it: CSP, no inline scripts, titles). `mayFrame` was widened in Task 2.2.
- Script order: the order in Task 2.4 step 1.
- **Wording:** every string in `EagleW26.OFFICIAL` (boxes: label and help; appendixD; sections: title and intro; tables: every item) appears on its page of the cached 2026 PDF (Appendix D strings in the cached Appendix D) after `normText` (see "Facts about the code"). 240 strings.
- `lib/w26-classic.js` and `lib/w26-ui.js` contain no `innerHTML`, `insertAdjacentHTML` or `document.write` (check the existing scan covers `lib/*.js`).
- S1a, S1b, S2, S4, S13, S14, S17 and S20 each appear in `lib/*.js` (S4 from Task 3.1 on) (fill `{edition}` in S17 with "2026 workbook" before searching, and search the template text up to `{edition}` otherwise).

Browser (`tests/browser-e2e.cjs`), new group `EagleWorkbook2026.html (file://)`:
- Opens without errors; every tab renders; Next moves forward; the banner says "For the 2026 workbook (No. 512-927)."
- On each tab, every `O.boxes` label for that tab's paths appears in `document.body.innerText` (normalize whitespace).
- Every input and select has a label (copy the 2023a test).
- Typing in `#f-proposal-description` saves to `eagle_workbook2026_v1` within 600 ms; `eagle_workbook_v1` and `eagle_workbook_guided_v1` are unchanged.
- The description's fit line starts "Fits in the official box: page 7" for `'installation '.repeat(12).trim()` and starts "May not fit in the official box:" for `'installation '.repeat(40).trim()`.
- The hours tables: typing the Task 1.4 example (row 1 only) gives the proposal grand total `3` people and `8.00` hours, and the report's row 1 total `68.00`.
- "Save backup file" downloads a file whose JSON has `edition: '2026'`; opening that file back works; opening the 2023a `SAMPLE` shows S1b and changes nothing.
- The Review tab lists empty key boxes with jump links and has no "Next on your path" heading.
- Appendix D key boxes count only when the select is "YES".
- Erase empties both 2026 keys and leaves a seeded 2023a draft alone.
- The "who to ask" card says "Scoutmaster:" and not "Unit leader:"; the Scoutly box shows S20.
- No link to `FillOfficialPDF.html`, `BackupFromPDF.html` or the 2023a PDF URL anywhere on the page.
- 390 px wide: no sideways scrolling on the Proposal and Plan tabs (copy the 2023a phone-width test).

Then add `lib/w26-ui.js`, `lib/w26-classic.js` and `EagleWorkbook2026.html` to the AGENTS.md layout table.

**Phase 2 commit:** `feat(2026): Classic 2026 workbook page`. Review panel: all four lenses.

---

## Phase 3: the 2026 Fill page and the home page chooser

### Task 3.1 `FillOfficialPDF2026.html` and `lib/w26-fill-page.js`

1. Copy `FillOfficialPDF.html` to `FillOfficialPDF2026.html`, `lib/fill-page.js` to `lib/w26-fill-page.js`. In the HTML: `<title>` and `og:title` "Fill the Official 2026 Eagle Workbook PDF and Appendix D"; `<meta name="description">` and `og:description` "Put your answers into the official 2026 Eagle Scout Leadership Service Project Workbook PDF and its Appendix D. Free, runs in your browser."; `connect-src` exactly `connect-src https://www.scouting.org/wp-content/uploads/2026/10/512-92726-Eagle-Scout-Leadership-Service-Project-Workbook.pdf https://filestore.scouting.org/filestore/scoutsbsa/Project-Workbook/Appendix-D-Fundraising-Application.pdf;`; scripts as in the design 4.1; text that says "No. 2023a" becomes "the 2026 workbook (No. 512-927)"; add the banner.
2. Steps on the page: Step 1 the workbook PDF (choose or "Get the official PDF for me"); Step 2 the answers (a 2026 draft from `eagle_workbook2026_guided_v1`/`eagle_workbook2026_v1`, labels "Guided 2026 workbook" and "Classic 2026 workbook", or a 2026 backup file; a 2023a file gets S1b); Step 3 "Make the filled PDF" (with the "Leave the printed names blank" checkbox and S13 as its help); Step 4 "Appendix D (only if you need a Fundraising Application)": choose or get Appendix D, then "Make the filled Appendix D". File names: `<Project-Title>-2026-Workbook-filled.pdf` and `<Project-Title>-2026-Appendix-D-filled.pdf` (same slug rule as `fileName()` today).
3. The report lists `report.warnings` as the 2023a page does, and "Filled N answers."
4. In `lib/official-pdf.js`: in `checkWorkbookPdf` and `fillOfficialPdf`, when the 2023a identity fields are missing but `Beneficiary and Impact` and `Artificial Intelligence` are present, use S4 instead of the general message; in `readBackupFromPdf`, use S16 in the same case. Tests: Node (the cached 2026 PDF gives S4 and S16) and browser (the 2023a Fill page shows S4).
5. AGENTS.md: apply the rule 4 change from the design section 6, and add the page and script to the layout table.

### Task 3.2 Tests for the Fill page

- Unit: `lib/official-pdf.js` contains S4 and S16 exactly; page in `PAGES`; the CSP test: for `FillOfficialPDF2026.html` the `connect-src` value must equal the two URLs joined by one space (they also must equal `EagleW26Pdf.OFFICIAL_URL` and `APPENDIX_D_URL`); for every other page the rule stays as it is. Script order.
- Browser: fill from the 2026 sample backup file and the cached 2026 PDF (path `tests/.cache/512-92726-Eagle-Scout-Leadership-Service-Project-Workbook.pdf`; assert it exists with the message "run tests/run-tests.cjs first"); download name; download starts with the official bytes; the report says "Filled"; then Appendix D the same way, with S14 in its report. A 2023a backup gives S1b; the 2023a PDF gives S2; Appendix D in Step 1 gives S3. A seeded 2026 Classic draft is offered as "the draft saved in the Classic 2026 workbook".
- Browser, macOS: PDFKit reads the downloaded 2026 file (23 copies of the name, `Dropdown1`).
- `EAGLE_ONLINE=1`: "Get the official PDF for me" works for both files.

### Task 3.3 Classic 2026 Next button and the home page

1. `lib/w26-classic.js`: last tab's Next becomes `href: 'FillOfficialPDF2026.html'`, "Next: fill the official PDF →"; `controls` and `footer` get `fillHref: 'FillOfficialPDF2026.html'`.
2. `index.html` and `README.md`: replace S19 with the chooser S18; under "2026 workbook" link the Classic 2026 page and the 2026 Fill page; under "2023 workbook" the existing links. Keep the existing "Which file to use, and when" table unchanged. The home page test ("home page links to every page") must include the new pages.
3. Tests: S18's three quotations exactly in both files (compare with the FAQ PDF through `normText` too); links present.

**Phase 3 commit:** `feat(2026): Fill the official 2026 PDF and Appendix D; choose the edition on the home page`. Review panel: all four lenses, plus a check by the Official-text reviewer that S18 quotes the FAQ exactly.

---

## Phases 4–6 (expand each into step-by-step tasks before starting)

### Phase 4: Guided 2026 page and tips
- `EagleWorkbook2026-guided.html`, `lib/w26-guided.js`: seven stages like the 2023a Guided page, plain-language labels that keep the meaning (rule 7), each box's `official` hint showing the Classic label.
- `lib/w26-tips.js`: tips keyed by 2026 paths; `where` is "Page N" of the 2026 workbook; a test checks `where` against the 2026 PDF; lengths and `advice` rules as today; sources in `docs/guidance-sources.md`. Re-check every 2023a tip before reusing its idea; many cite 2023a pages or rules that changed (safety, plan approval, AI).
- Advice about starting the description with a summary (D3) is a tip with `advice: true`.
- Acceptance: the same browser tests as the Classic 2026 page, plus the tips tests; review panel with the research checker.

### Phase 5: Signed pages, photos, attachments PDF, Your path 2026
- `SLOTS_2026`, new places, `slotsFor(data)`, the drawn writer taking the page count (design 4.8).
- The Signed Pages & Photos tab on both 2026 pages (insert before Review), with the workbook's page 2 guidance on electronic signatures quoted, and the Report tab's "Photos and Documents" section (`OFFICIAL.sections['report.photos']`) pointing to it.
- Fill 2026 page: the attachments PDF and the optional drawn whole copy.
- `journeySteps` for 2026 from the page 3 checklist; restore "Next on your path" in Review for 2026.
- Preflight date pairs for 2026 (`proposal.beginDate` → `proposal.completeDate`).
- Acceptance: tests like the 2023a submission-copy tests (page counts, scans after the right page, cover art ink check with Poppler).

### Phase 6: Backup from PDF for both editions
- Edition detection in `lib/backup-from-pdf-page.js`; "Open in the … workbook" buttons for the matching edition; S15 for Appendix D.
- Optional: carry over candidate, unit and contacts from a 2023a draft into a new 2026 draft (only same-meaning keys; `chair` does not carry over).
- Acceptance: browser round trip from a filled 2026 PDF to a 2026 draft.

---

## Done for the whole project when

- A Scout can open the home page, pick the 2026 workbook, fill both 2026 pages' boxes, save and reopen a backup file, fill the official 2026 PDF and Appendix D, add signed pages and photos, and read a filled 2026 PDF back.
- Every 2023a test still passes, apart from the Erase wording changed on purpose in Task 0.5.
- AGENTS.md describes both editions, and `todo/` lists anything deferred.
