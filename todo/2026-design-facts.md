# 2026 design: facts we need, and what we know

**Source check:** the official 2026 files in a scratch folder outside the repository were downloaded in an earlier session and match their recorded hashes (rechecked). `wb.pdf` is NOT the official file: it is a modified copy used for the PyMuPDF spike (hash `179d4a4e…`). The official workbook is `512-92726-Eagle-Scout-Leadership-Service-Project-Workbook.pdf` (`5810e017…`). The text in `w26.txt` was extracted from the official file. Field counts in section 2 came from `wb.pdf`/`inventory.json`; re-check them against the official file before relying on them.

**Status:** fact gathering only. Read-only. No product code changed. Sources are the official files in the private scratch folder (see `2026-groundwork.md` for hashes).

## 1. What the design has to answer

| # | Question | Why it matters | Status |
|---|---|---|---|
| Q1 | How big is the text change from 2023a? | Sizes the Guided and Classic page work and the tips work | Partly known (section 3) |
| Q2 | Which 2023a code is tied to the 2023a file? | Sets how much can be reused for 2026 | Known (section 4) |
| Q3 | Can the helper's current engine fill the 2026 file? | Decides shared engine vs separate one | Not tested (spike used PyMuPDF only) |
| Q4 | Do 2026 text boxes have enforced length limits? | Decides whether the helper warns or blocks | Open (section 5) |
| Q5 | Are the 2026 totals scripts consistent with what we would compute? | Decides whether the helper computes or leaves totals to the form | Open (Acrobat test needed) |
| Q6 | Does 2026 allow extra pages? | 2023a rule "never insert pages" may not hold for 2026 | Partly known (section 5) |
| Q7 | How do signatures and approvals work in 2026? | Decides the signed-pages flow | Known from field inventory, rules not read yet |
| Q8 | Where are the tips and guidance sources that depend on page numbers? | Tips cite printed page labels; 2026 pages differ | Known (section 4) |

## 2. Field and file facts (2026)

From `2026-groundwork.md`, checked with PyMuPDF on the official file:

- Workbook: 22 pages, AcroForm, 446 widgets, 382 distinct names, 20 names shared across more than one widget.
- Signature fields: 9 in the workbook, 3 in Appendix D.
- Radio buttons: 4 widgets in 2 groups. Drop-down: 1 (Troop / Crew / Ship).
- Text fields have no `MaxLen` set. 75 widgets have format or calculate scripts.
- The file is not encrypted (2023a is). Pages can be added in principle.
- Spike: a shared name fills every widget with that name; a scripted money field keeps its value; signature fields survive; file stays fillable.

## 3. Text comparison (Q1)

- 2023a text: `tests/.cache/EagleProjectWorkbook2023a.pdf`, 1,237 lines of `pdftotext -layout`.
- 2026 text: the extracted workbook text (in the scratch folder), 1,432 lines. Appendix D text: 131 lines. FAQ: 304 lines.
- The 2026 workbook has 22 pages; 2023a has 32 pages.
- The 2026 text has a "Working with this document" page and an "Adults approving a proposal or completed project report" page, plus an "Eagle Scout Leadership Service Project Checklist" page. 2023a has a "Page 2" and a long "Message to Scouts and Parents" section.
- Section headings: the automatic heading search returned nothing useful because of the layout spacing. A section-by-section comparison (same / reworded / new / removed) is still needed. It is step 3 of the scoping plan.

Next step to finish Q1: read both texts page by page and tag each section. Estimated effort: one focused pass over about 2,700 lines.

## 4. 2023a coupling in the code (Q2, Q8)

Edition is already keyed in one place:

- `lib/journey.js`: `KEY_BOXES` (per edition, only `2023a` filled in), `editionOf` (absent or not `2026` means 2023a), `SHORT_ANSWER_BOXES` (per edition).
- Tests: `tests/run-tests.cjs:730` checks `editionOf`.

Hard-wired to 2023a (would need an edition key or a second copy):

| Where | What is 2023a-specific |
|---|---|
| `lib/official-pdf.js` | `WORKBOOK_VERSION`, `OFFICIAL_PDF_URL` (2023 upload path), `OFFICIAL_SHA256` (one hash), `SIGNATURE_FIELDS` (fields that identify 2023a), `COST_TABLES`, the field map and reverse map |
| `lib/attachments.js` | `SLOTS` (signature pages at PDF pages 15, 23, 29), `WORKBOOK_PAGES`, the printed copy text that says "No. 2023a" |
| `lib/workbook-common.js` | `OFFICIAL_PDF_URL` (2023 path) |
| `lib/guided-workbook.js`, `lib/classic-workbook.js` | Tab lists, `SIGNED_TAB = 5`. Same shape for both editions only if 2026 keeps the same tabs |
| `lib/tips.js` | `where` labels are printed page labels in 2023a; a test checks them against the 2023a PDF |
| `FillOfficialPDF.html` | Pinned `connect-src` to the 2023a URL; text says "No. 2023a" |
| `BackupFromPDF.html`, `index.html`, `EagleWorkbook*.html` | Text naming 2023a; the `index.html` links to the 2023 PDF |
| `tests/fixtures/official-2023a-fields.json`, `tests/.cache/EagleProjectWorkbook2023a.pdf` | Test fixtures tied to 2023a |

## 5. Length limits and extra pages (Q4, Q6)

- FAQ Q9 (2026): "Why do text boxes have character limits?" It says the limits fit a typical project and that a Scout who needs more room can attach extra pages.
- The workbook file sets no `MaxLen` on any text field. So the limit, if any, is not in the field definitions. It may be enforced by the layout (auto-size vs fixed 12 pt: about 365 auto-size, 81 fixed 12 pt) or not enforced at all.
- Still to check: the actual limit values. The FAQ and the workbook text do not give a number in the grep results. Read the 2026 instruction text for each box.
- The 2026 FAQ says extra pages can be attached. This conflicts with the 2023a rule "never insert pages" only if the 2026 file is treated the same way. The rule itself is in `AGENTS.md`; the 2026 wording needs a decision before the rule changes (scoping step 6).

## 6. Signatures (Q7)

- 2026 workbook: 9 signature fields (approvals on page 11 ×5, Candidate's Promise on p11 and p18, p22 ×3).
- Appendix D: 3 signature fields on page 2.
- Open: the 2026 text for who signs each one, and whether any approval needs a printed name next to it. Not read yet.

## 7. Still unknown (needs a person or a tool)

| Unknown | How to find out |
|---|---|
| Whether the helper's engine can fill 2026 | Run the engine on the 2026 file (needs an edition-aware code path; do not write code yet) |
| Whether Acrobat, Preview, or Chrome recalculate 2026 totals on open | Open a filled copy in Acrobat Reader (maintainer or a parent with a free Reader) |
| Whether the 2026 character limits are enforced | Read the 2026 instruction text per box; then test in Acrobat (a too-long entry may be clipped or shrunk) |
| The 2026 Appendix D placement and who signs it | Read `appd.txt` and the 2026 text section that refers to it |

## 8. Behavior probe (official file, `fresh-2026-workbook.pdf`, PyMuPDF, read-only)

- **Text fields:** 432 text widgets. 351 auto-size (font size 0, shrinks as text grows), 81 fixed at 12 pt (includes Project Description, Motivation, The Work, Beneficiary and Impact, and the four approval dates). A fixed-size box clips long text instead of shrinking it. No `MaxLen` anywhere, so the stated limits are not enforced by the file.
- **Format scripts:** 75 widgets. 59 money (`AFNumber_Format`), 16 dates (`AFDate_FormatEx`, `m/d/yyyy` or `mm/dd/yyyy`). Keystroke scripts on the dates too.
- **Calculate scripts:** 16 totals, all `AFSimple_Calculate("SUM", …)` over named fields, plus one `Difference` (AmountCollected − AmountSpent, page 21). Pages 9, 15, 17, 20, 21.
- **Possible overcount:** page 15 "Project Plan Total Individuals" sums a field named `Project Description`. The same name is a text box on page 7. If a description starts with a number, Acrobat's `AFMakeNumber` may add it to the head count. Not yet tested in Acrobat.
- **Shared names:** `Candidates Full Name` (23 widgets), `Project Title` (22), `Scoutmaster’s Name` (3). One value fills all of them.
- **Radio:** 4 widgets (two groups); **drop-down:** 1 (Troop / Crew / Ship); **signatures:** 9, all empty.
- **Not probed:** field flags (multiline, comb) are set but not decoded here; no document-level JavaScript was found by the API used.

## 9. Next steps

1. Q1: section-by-section comparison (same / reworded / new / removed), recorded in a table.
2. Q4: list each 2026 text box with its printed limit, if any.
3. Q2: reuse audit (step 5). Classify each module as generic or 2023a-specific.
4. Q3 and Q5: Acrobat test on a filled copy, then engine test on the 2026 file.
5. Step 6: decision list for the maintainer, with options, built from the facts above.

No 2026 code until the decision list is answered.

## 10. Later checks (October 2026, design work)

Done after the sections above, on the official file downloaded fresh from scouting.org (hash matches):
- The helper's own vendored pdf.js fills the 2026 file correctly, including the drop-down and a radio group, and leaves all 9 signature fields empty. Apple PDFKit reads the values. See [2026-design.md](2026-design.md) F2 and F3.
- The FAQ's "character limits" are the 37 fixed 12 pt multi-line boxes with the "do not scroll" flag (F4).
- `Project Description` is one field on pages 7, 11 and 22 (F5).
- Appendix D has no box for the beneficiary's name and EIN (F11).
- Acrobat was not tested and won't be: the design writes plain values and the form's own formulas so it does not depend on Acrobat (D5, D6).
