# 2026 PDF: every workflow the helper needs

**Superseded:** the decisions here are settled in [2026-design.md](2026-design.md) section 3.

**Status:** analysis for the separate 2026 system. Nothing built. Built on [2026-groundwork.md](2026-groundwork.md) (inventory and spike). Each row says what the 2023a helper does today, what 2026 changes, and the decision it needs.

Facts from the inventory (2026 workbook unless stated):
- 446 widgets, 382 distinct names. 20 names appear on more than one page.
- Signature fields: page 11 (five approvals, plus the Scout's promise), page 18 (the Scout's promise again), page 22 (certification, beneficiary and Scoutmaster final). Appendix D: page 2 (three signatures).
- Drop-down for unit type on page 5 (`Dropdown1`: Troop, Crew, Ship).
- Radio buttons (4 widgets, 2 groups) for "Need Fundraising App?" (page 10) and "Provided Copy of Info for Beneficiaries" (page 11).
- Auto-size text on about 365 boxes; fixed 12 pt on about 81. No length limits are set on any box, though the FAQ says the boxes have limits.
- Scripts: 75 widgets have format or calculate scripts (money, dates in m/d/yyyy, summing totals).

## Workflows

| # | Workflow | 2023a today | 2026 needs | Decision |
|---|---|---|---|---|
| 1 | **Get the official PDF** (button) | One pinned URL in `connect-src` of `FillOfficialPDF.html`. | A second URL, pinned the same way. The CSP allows one URL today. | Separate page per edition, or allow both URLs in `connect-src`. Recommend separate pages, so each stays one pinned URL. |
| 2 | **Choose and check the PDF** | Checks six field names and the SHA-256 of the 2023a file. | Check the 2026 names and 2026 hash. Appendix D is a second file with its own check. | Edition chosen by the file's fields, not the file name. Refuse a file of the other edition, with a plain message. |
| 3 | **Choose the edition for a draft** | Always 2023a. | A new draft asks which edition. The answer is stored as `edition`. Backups with no key are 2023a. | Ask once, on a new draft, with the rule from the design doc (fully approved on 2023 before 1 January 2027). Let the Scout change it only by starting over. |
| 4 | **Fill the PDF** (write answers) | `buildFieldValues` maps about 446 draft paths to 2023a names, plus rules for totals, dates and money. | A second map to the 2026 names. Shared names are written once and fill every copy. Totals, dates and money formats are written by the helper. | Two maps, one engine. Tests check every key in the draft reaches a 2026 field or is marked as not on the form. |
| 5 | **Radio buttons and drop-down** | Unit type radio buttons. | A drop-down (Troop, Crew, Ship) and two radio groups. | Write the drop-down value exactly as listed. Radio values come from the groups' own export values. |
| 6 | **Signature fields** | Printed names beside approval lines, opt-out checkbox. | Real signature fields. Hard rule 6 says never fill signatures or dates. | Leave all 9 signature fields and the Appendix D fields empty. Printed names are not written into signature fields. Update rule 6 for 2026. |
| 7 | **Heads-up checks** | Date order and cost sums on the Fill page (`preflight.js`). | Same checks, with 2026 names. The 2026 form totals may differ. | Share the checks; only the field names change. |
| 8 | **Overflow warnings** | `mayOverflow` estimates text fit for fixed boxes. Auto-size boxes shrink. | Most boxes auto-size. The FAQ says limits exist, but none is set in the file. | Check the text fit only for the fixed-size boxes at first. Ask whether the 2026 limits are meant to be enforced by the helper (it can warn, not block). |
| 9 | **Read a filled PDF back** (BackupFromPDF) | `reverseMap` derives 2023a paths from `buildFieldValues`. | Needs a 2026 reverse map. Edition detected from the file's fields. | Same as 4: a second map, shared reader. A 2026 file opened on the 2023a page is refused, and the reverse is also refused. |
| 10 | **Signed pages and attachments** (Signed Pages tab) | Three signature slots after pages 15, 23 and 29. | Signature pages are 11, 18 and 22, and Appendix D page 2. | Slot table per edition. Recheck where the scans go. |
| 11 | **Submission copy** (drawn copy) | A new PDF of drawn pages, with signed pages inserted. The official file cannot take added pages. | The 2026 file is not encrypted and can take pages. The FAQ says not to flatten until editing is finished. | Decide between: (a) keep a drawn copy for 2026 too (simple, but not fillable, and the FAQ prefers the fillable file), or (b) insert scans into the real fillable file (needs a PDF writer that adds pages to a non-encrypted file; the helper does not have one yet). Recommend (a) first, because (b) needs a writer we don't have. |
| 12 | **Appendix D (Fundraising)** | Not made by the helper. The 2023a fundraising answers are in the workbook. | A separate PDF with 28 fields and its own signatures. | Add an "Appendix D" output to the Fill page: fill from the same draft's fundraising answers, one more check, one more download. |
| 13 | **Totals written by the helper** | The helper writes totals; the 2023a form has no sum scripts. | The 2026 form sums with scripts. Acrobat may recalculate those fields on open, and its formula has an error (the project description is added into a head count). | Test in Acrobat (free Reader is enough): if it recalculates on open, decide whether to match its formula or to tell Scouts to check totals. Open decision; cannot be settled without that test. |
| 14 | **Print a draft** | Prints the 2023a sections. | Prints the 2026 sections. | Separate section lists per edition. |
| 15 | **Backup file format** | Keys fixed; older files keep opening. | New `edition` key. Old files with no key are 2023a. Opening a 2026 backup on a 2023a page must be refused. | Add the key (rule 9). Refuse mismatches in both directions. |
| 16 | **Your path / Review tab / key-box table** | One table per edition is already the design (Task 0). | A 2026 table: the 2026 required prompts. | Build the 2026 table from the prompt comparison (step 3, not yet done). |
| 17 | **Tips** | Tips keyed by 2023a backup paths, checked against the 2023a page numbers. | Tips for 2026 prompts, checked against 2026 page numbers, with their own sources. | Separate tips file per edition. The tip checks must read the 2026 PDF. |
| 18 | **Errors and messages** | Some say "2023a" (for example the Step 1 message). | Wording per edition. | Parameterise the edition name in every message. |
| 19 | **Tests** | Field-list fixture, hash, the real PDF in `tests/.cache`. | A 2026 fixture (names only), the 2026 hash, the 2026 PDF in the cache, and the same round-trip tests. | Add a 2026 round-trip test. Keep the 2023a tests unchanged. |
| 20 | **Hosting and deploy** | One `connect-src` URL; `deploy.sh` copies the same files. | Two URLs, and possibly new pages. | Update `connect-src` and the deploy check. |
| 21 | **Rules in AGENTS.md** | Rule 4 (one URL), rule 6 (printed names), "never insert pages into the official file", the 2023a layout table. | Reword each for two editions. | Update with the design, before any 2026 code. |

## Decisions needed before design

1. **Separate page or one page for both editions?** Recommend separate pages for the Fill step, so each keeps one pinned URL and its own file check.
2. **Submission copy for 2026:** drawn copy (a) or fillable insert (b)? Recommend (a) first.
3. **Totals:** does Acrobat recalculate the 2026 totals on open? Test it, then choose the formula.
4. **Signature fields:** leave empty (recommended, matches rule 6 and the workbook's own guidance) or fill printed names beside them as 2023a does?
5. **Appendix D:** its own page on the Fill step, or part of the Fundraising step?
6. **Character limits:** warn only, or leave to the form's own behaviour?

## Test the unknowns with the least effort

- Open a filled 2026 PDF in Acrobat Reader (free) and check the totals and money formats (decision 3). The user does not have Acrobat; a parent or coach, or a free install, would do.
- Fill a 2026 copy through the scratch spike with the scripts on, and check whether Preview and Chrome show the same totals (they don't run scripts).
