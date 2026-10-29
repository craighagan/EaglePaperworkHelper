# 2026 workbook: groundwork results

**Next:** steps 3, 5 and 6 are done in [2026-design-facts.md](2026-design-facts.md) and [2026-design.md](2026-design.md).

**Status:** steps 1, 2 and 4 of the scoping plan are done. Steps 3 (prompt comparison), 5 (reuse audit) and 6 (decision list) are not started. No product code changed.

The official files are kept outside the repository (in a private scratch folder), and the repository holds no official text. Hashes below let anyone confirm they have the same files.

## 1. Frozen sources (SHA-256)

| File | SHA-256 |
|---|---|
| 512-92726 Eagle Scout Leadership Service Project Workbook (22 pages) | `5810e017ed25e745a9b2c2c9f6ea891acf6147b8d7a019d925388fda152435bb` |
| Appendix D, Fundraising Application (3 pages) | `75364d254bcec53514994d6052ae57ea5072f8e0d42ea2ba1f1a685f556cd8a9` |
| Appendix A, Project Roles (2 pages) | `d24f114d1c1619cde47ddc43e6ce3ace65ec5531e46286b4f69d7c2e41fe062f` |
| Appendix B, Information for Project Beneficiaries (2 pages) | `02f66fdc226a1ab87f33f923fc394568d837bf1d04a33fcf76ddc34cf3b716a6` |
| Appendix C, Guide for Adults (9 pages) | `3e018701462456a6d25df619ca151f837ee2a2c0e3b965f954e89559acf5ada1` |
| Addendum, Messengers of Peace (2 pages) | `b8d188a345e9d70eb4a9a134c2f7352436d7a4026167192832fdd3c71bc1aa3c` |
| 2026 FAQs (8 pages) | `2f2ea9f83ae5f5088c6ab972c278210c406af4a8f7778eb2c2bece593dd0a015` |

Source pages: the workbook page at scouting.org (see the 2026 design doc) links to each file.

## 2. Field inventory (the workbook)

| | 2026 workbook | Appendix D |
|---|---|---|
| Form fields (widgets) | 446 | 28 |
| Distinct field names | 382 | 28 |
| Names on more than one widget | 20 (e.g. `Candidates Full Name` on 23 widgets) | 0 |
| Text fields | 432 | 25 |
| Signature fields | 9 | 3 |
| Radio buttons | 4 | 0 |
| Drop-down | 1 (Troop / Crew / Ship) | 0 |
| Fields with a format/calculate script | 75 | 5 |
| Multi-line text boxes | 37 | 5 |
| Length limits (`MaxLen`) | none set | none set |

Compared with 2023a (446 fields, 32 pages, 9 printed-name text boxes for approvals, encrypted so pages cannot be added): the same field count by coincidence, but almost every name is different, the approvals are real signature fields, and the file is not encrypted.

Note: the workbook's text boxes have no `MaxLen`. The 2026 FAQ says the workbook sets character limits for its boxes, so these may be enforced in the layout or by the form's scripts. This needs checking before the layout work.

## 3. Technical spike (PyMuPDF, scratch only)

Checked on a copy of the 2026 workbook, not through the helper's own engine:

- One value written to a shared name fills every widget with that name (23 widgets).
- A scripted money field keeps the value written to it.
- All 9 signature fields are still present and empty.
- The file remains fillable (446 widgets after saving).
- Filled text shows in a rendered page (checked with poppler `pdftotext`).

Not checked yet:
- Acrobat, Preview or Chrome rendering of the scripted fields (the format scripts may reformat values).
- Whether the helper's own engine (`lib/official-pdf.js`) can fill the 2026 file. It is 2023a-specific by design, so this is a question for the design, not a bug.
- Whether the 2026 totals formula matches the form's built-in sum (the form's Acrobat sum adds the project description into a head count; see the design doc).

## Next

- Step 3: read the full 2026 text and compare it with 2023a section by section.
- Step 5: reuse audit of the existing modules.
- Step 6: write the decision list with options.
