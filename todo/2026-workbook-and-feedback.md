# 2026 workbook support, and feedback from a parent who used the helper

**Status:** design only. Nothing here is built. Researched October 2026.

## 1. The 2026 workbook (do this first; everything else depends on it)

### What Scouting America published

- Page: [Eagle Scout Service Project Workbook](https://www.scouting.org/programs/scouts-bsa/advancement-and-awards/eagle-scout-workbook/). It now offers the **2026 Eagle Scout *Leadership* Service Project Workbook** (No. 512-927, file `512-92726-Eagle-Scout-Leadership-Service-Project-Workbook.pdf`, uploaded 2026/10, SHA-256 `5810e017ed25e745a9b2c2c9f6ea891acf6147b8d7a019d925388fda152435bb`), plus four appendices and an addendum as separate PDFs.
- [2026 workbook FAQs](https://filestore.scouting.org/filestore/scoutsbsa/Project-Workbook/2026-Eagle-Scout-leadership-service-project-workbook-update-FAQs.pdf), summarized:
  - Any Scout may use 2026 now. It is required for every Life Scout starting a project for the first time. A Scout whose proposal was **fully approved before January 1, 2027** on the 2023 workbook may finish on 2023.
  - From January 1, 2027, all Scouts (either workbook) must get the beneficiary's and Scoutmaster's approval of the **plan** before work starts. The plan has boxes to record their input; they do not sign it.
  - The Fundraising Application moved to **Appendix D**, a separate PDF, right after the proposal.
  - New: a one-page checklist, questions about impact and the Scout's motivation, more safety questions, hours tracked from the proposal through the report, "Scoutmaster" instead of "unit leader", "Committee Representative" instead of "Committee Chair", parent contact details, and an AI-use disclosure.
  - A project is complete on the date the Scout signs the report; adults may sign after the Scout's 18th birthday.
  - Scoutmasters should not send reports back for style, grammar, or punctuation.
  - Scouting America looked at a portal; none is scheduled, so the workbook stays a fillable PDF.
- The workbook's own "working with this document" page (paraphrased): use a full PDF program such as Adobe Acrobat Reader; **don't flatten** ("print to PDF") until all signatures are on; adults may sign **electronically if the council accepts it** (type a name, insert a signature image, or Acrobat Fill & Sign); **don't "certify" or lock** the file. The "only the official workbook, no added forms or requirements" rule is still there.


### What is different for this helper (checked against the PDF)

| | 2023a | 2026 |
|---|---|---|
| Pages | 32 | 22 (+ Appendix D, 2 pages, 28 fields) |
| Fields | 446 | 446 in the workbook, names all different (`Candidates Full Name`, `Beneficiary and Impact`, `Motivation`, `The Work`, `Artificial Intelligence`, …) |
| Signatures | printed-name text boxes | 9 real signature fields (`/Sig`) on pages 11, 18, 22, plus 3 in Appendix D |
| Restrictions | encrypted: no page assembly | **not encrypted**: pages can be inserted without flattening |
| Scripts | none | 14 Acrobat sum fields, 72 number formats, 16 date formats (m/d/yyyy). Preview and Chrome don't run them, so the helper must write totals itself |
| Shared fields | few | many: one name on several pages (`Project Description` on 7, 11, 22; proposal hours appear again in the report) |
| Text size | fixed | 292 boxes auto-size (font 0), 76 fixed at 12 pt |
| Unit type | radio buttons | a drop-down (Troop / Crew / Ship) |

One Acrobat sum in the official file adds `Project Description` into "Project Plan Total Individuals" (an error in their form). The helper should write that total itself and not rely on Acrobat.

### Design

- **One choice, made once, stored in the draft:** `edition: '2023a' | '2026'`. New drafts ask first: "Was your project proposal fully approved on the 2023 workbook before January 1, 2027?" Yes → 2023a. No or not sure → 2026. Old drafts and backup files with no `edition` are 2023a. Changing edition later is allowed only by starting a new draft (offer to carry over contacts, project name, and description; nothing else maps cleanly).
- **Separate per-edition modules, shared engine.** Keep `lib/official-pdf.js` as the engine (open, fill, appearances, read back, overflow, money and date rules). Move the 2023a map into `lib/editions/2023a.js` and add `lib/editions/2026.js`: field map, page labels, hash, field-list fixture, signature slots, totals to write, and the Appendix D map. The engine picks the edition from the draft and refuses a PDF of the other edition with a plain message ("This is the 2023 workbook, but your draft is for 2026").
- **New Guided and Classic page content for 2026.** The section renderers and `lib/tips.js` entries are edition-specific (`tips2026.js`), because the prompts changed (impact, motivation, the work, leadership, AI disclosure, plan input from beneficiary and Scoutmaster, safety discussions with adults, construction safety, permits attached). Tips must be re-checked against the 2026 text; most 2023a page references become wrong.
- **Fundraising = Appendix D.** The Fill page offers a second output: the filled Appendix D, from the same draft. Its "how will you seek donations" box points at the workbook's page 9.
- **Signatures stay signable.** The filler must leave the `/Sig` fields empty and working, never flatten the filled workbook, never lock or certify. A test opens the filled file and confirms the signature fields are still there and unsigned.
- **Submission copy changes for 2026.** Because the file isn't encrypted, insert scans and attachments into the real fillable PDF instead of a flattened printed copy. That keeps it signable and matches the workbook's "don't flatten" advice. Keep the current flattened path for 2023a. `AGENTS.md` currently says never to insert pages into the official file; that is true for 2023a (encrypted, no assembly) and must be reworded per edition when this lands.
- **Totals and dates written by the helper**, in m/d/yyyy, so non-Acrobat viewers show them.
- **Your path for 2026:** add "Show your plan to the beneficiary and Scoutmaster before work starts" (a workbook requirement from 2027 for both editions; quote it, don't paraphrase it into a stronger rule), and put fundraising after the proposal.

### Effort and order

Large: a few weeks of focused work. Suggested phases, each shippable:

1. Engine split and `edition` field, 2023a unchanged (tests prove it). ~2 days.
2. 2026 Fill page only: map the 2026 PDF from a 2026 draft shape, totals, dates, signature fields intact, read back. ~4–5 days.
3. 2026 Classic page (official wording, order). ~3 days.
4. 2026 Guided page and 2026 tips, with the review panel and a research check of every tip. ~5 days.
5. Appendix D, the non-flattened submission copy, Your path for 2026. ~3 days.

Until phase 2 ships, the home page should say plainly: "This helper fills the 2023 workbook. Scouts starting now should use the 2026 workbook; support is coming."

## 2. Ideas from a parent who used the helper

Ratings: **Easy** (hours), **Medium** (a few days), **Hard** (needs a server or breaks a hard rule).

| Idea | Rating | Decision |
|---|---|---|
| Prompt to save a backup when moving between tabs | Easy | **Do.** When leaving a tab with changes not in a backup file, show a small non-blocking bar: "3 changes not in a backup file. [Save backup file]". At most once per tab change and not more than once every few minutes; never a pop-up. Uses the existing change count. |
| Show which steps are incomplete and which boxes are left | Easy–Medium | **Do.** A dot on tabs with key boxes still empty, and on each tab a short "Still empty: Project description, Why it's needed (go)" list with jump links. Say "not filled in yet", never "required", unless the workbook requires it. |
| "Completeness" at the top | Easy | **Do, as a count, not a score:** "Filled in: 34 of 52 key boxes." No percentage grade, no "ready", no green check. Earlier reviewers flagged a readiness score as a trap. |
| Final "Review" step before making the PDF | Medium | **Do.** One Review tab that gathers what already exists: empty key boxes, the heads-up checks (dates, totals), overflow warnings, short answers in long boxes, changes not in a backup file, and the next step on Your path, then "Fill the official PDF". No AI (see below). |
| Proofread answers ("give more details", spelling) | Hard as AI; Easy as rules | **Rule-based hints only, no AI.** AI would need a network service and sends the Scout's words away; the 2026 workbook also says AI may not write the proposal, plan, or report and any AI use must be disclosed, so a built-in AI reviewer would put every Scout in a disclosure gray zone. Do instead: turn on the browser's own spell check on every box, and add plain hints such as "This answer is one line; the box has room for more. Your coach may ask for details." Note that the FAQ tells adults not to send reports back for grammar, so hints say "may", never "must". |
| Photos and documents in the proposal and report | Medium | **Extend what exists.** The Signed Pages tab already holds scans, permits, and links. Add places for "before" photos and sketches (plan), and before/during/after photos (report), which the 2026 workbook asks for. With 2026 these can go into the real PDF after their page. |
| Electronic signatures (DocuSign, Adobe) | Easy for 2026 | **No integration; give guidance.** The 2026 workbook says adults may sign electronically if the council accepts it, by typing a name, inserting an image, or Acrobat Fill & Sign, and must not certify or lock the file. So: keep the filled 2026 PDF signable, and tell Scouts to ask the council whether electronic signatures are accepted. DocuSign needs accounts, payment, and a server. |
| One authoritative copy online, shared by link (Google Docs style) | Hard | **Not in this helper.** It needs accounts, a server holding minors' personal data, access control, and safeguarding rules for adults' access. Smaller steps that help with "which version was approved": put a version number and date in backup file and PDF names ("Proposal v3, 2026-10-20"), and suggest keeping the filled PDF in the Scout's own cloud drive and sharing that one link. Note Scouting America is considering a portal. |
| Advisor or Scoutmaster dashboard of all their Scouts | Hard | **Not in this helper,** for the same reasons. Instead: a "status summary" the Scout can copy into a message (part of the Ask pack in `ideas-backlog.md`). |

### Set aside (decided October 2026)

The maintainer's rule: nothing that can't run in the Scout's own browser. So these are **set aside**, not planned: a hosted single copy shared by link, an advisor or Scoutmaster dashboard, a DocuSign or Adobe signing integration, and AI proofreading. Keep only the browser-only alternatives listed above (version numbers in file names, a status summary the Scout sends, signable 2026 PDFs with guidance about electronic signatures, rule-based hints and the browser's spell check). Revisit only if Scouting America ships its own portal.

### Suggested order

1. 2026 phases 1–2 (blocking: new Scouts must use 2026).
2. Save-backup bar on tab change; incomplete-tab dots and "still empty" lists; the key-box count. (A day together.)
3. Review tab (builds on 2).
4. 2026 phases 3–5, then photo places.
5. Version number in file names; status summary.
