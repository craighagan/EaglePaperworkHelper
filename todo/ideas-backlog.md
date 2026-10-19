# Ideas backlog

**Status:** not started. Ideas from a review by a Scout, a Scoutmaster/coach, a council reviewer, an engineer, a program manager, and a game/accessibility designer. Nothing here changes a Scouting requirement; every item is guidance only, offline, with no accounts and no data leaving the device. Scores are `[novelty, viability, fit]` out of 10.

**Build order if we proceed:** 1. Ask pack, 2. Check before you fill the PDF, 3. Your path (it adds a draft key, so write the round-trip tests first).

## 1. Ask pack (best first pick)

Copy-ready teen-voice messages per person (unit leader, beneficiary rep, committee chair, coach, council/district approver, service center), filled from the draft, editable, with a Copy button (clipboard API, then `execCommand`, then select-for-manual-copy). A one-page "what I need from you" sheet per person with only their pages. A batching view that groups pending asks per person. A coach check-in summary. A "how to help without doing it" card for parents.
- **New code:** `lib/ask-pack.js` (pure `buildPack(get)`), a collapsed card next to "Who to ask" and on the Signed Pages tab.
- **Risks:** wording that implies a requirement; minors' contact details leaking into printed or pasted text (leave phone and email off by default, with a checkbox).
- **First step:** pure function plus tests on the fictional sample: slots fill or fall back, no "must/required/need to" outside quoted workbook text, page numbers match `SLOTS` (15, 23, 29), no contacts unless asked. Then UI, then a browser test for the clipboard fallback from `file://`.
- **Branches:** visit sheet with a blank "what they said" box; follow-up nudges from sent dates; a handout for adults with no project details; a string-rule tone check; a calendar-file download for meeting requests.

## 2. Check before you fill the PDF

**First version built** (`lib/preflight.js`, shown with the other heads-ups in Step 3 of the Fill page): same-box start/end dates and cost rows the filler cannot add up. Flags never block creating the PDF. Not built yet: the "this is intentional" dismissal, click-to-jump, a coach page in Print draft, overflow check before filling, and the same panel inside the workbooks.

A pure `check(data, { today })` in `lib/preflight.js` returns neutral flags (what it saw, which tab, "Not sure? Ask your coach."). Never a score, never a gate, never "likely approved". With no flags: "Nothing here looked unusual. This is not an approval check."
- **Flags that are safe:** end date before its own start date (same box pair only); typed totals versus the rows when both sides are present and parse; hours rows versus the typed total; a date that cannot be read.
- **Not safe (do not build):** cross-section date order (the workbook requires none), empty-box rules that imply a requirement, anything on a blank value.
- **First step:** the sample fixture returns zero flags; change one field at a time and expect exactly one flag; add must-not-flag cases. Wording tests ban "must", "required", "wrong", "error", "invalid", "approve".
- **Branches:** "this is intentional" dismissal (additive backup key); click-to-jump to the box; a coach page in Print draft; move the PDF overflow warning before filling. Related: [polish.md](polish.md) item 15.

## 3. Your path (journey strip)

A pure `journeySteps(data, now)` in `lib/journey.js`: ordered steps (talk to unit leader, Proposal, the four signatures, fundraising application if raising money, Plan, do the project and log hours, Report, report signatures, rest of the Eagle packet outside this tool) with a state and one "next small step". State comes from filled fields and signed-page scans. A new `journey` draft key holds the Scout's own notes ("I have this signature", "handed to X on date"). A welcome-back recap after a long gap. A banner quoting the workbook about not starting work before the proposal is approved. A printable one-page version.
- **Risks:** the new key has no PDF field, so a PDF round trip could erase it (same class as lost scans); status wording must be "your notes show", never "approved".
- **First step:** tests first: old backups merge cleanly (`mergeWithDefaults`), `journey` produces no PDF fields, "Open in the workbook" from a PDF keeps the draft's `journey`.
- **Branches:** reuse on the Classic workbook and the Fill page; link each step to its tips; an hours log under "do the project"; "3 weeks since you handed this in" as advice.

## Smaller ideas worth keeping `[N V F]`

- Backup restore diff ("restoring changes 14 fields") before overwriting a newer draft `[6 8 7]`
- Chromebook/school-device check page for downloads and file pickers `[7 7 7]`
- "Two-minute move" button that shows one tiny task `[8 7 8]`
- Read-aloud with the browser's speech synthesis `[6 7 7]`
- Printable wall poster of the path `[5 9 6]`
- Council drop-off packing slip (files and signed pages to bring) `[5 7 7]`
- Parallel-lane planner: which steps can run at the same time `[7 5 6]`
- Plain-language "translate this box" toggle `[6 4 7]`
- Generate Guided and Classic from one field table (maintainer value, invisible to Scouts) `[4 6 4]`
- Visible "built for Workbook 2023a; check scouting.org for the current edition" banner `[3 9 6]`

## Traps (do not build)

- A readiness or "likely approved" score: the approver decides, and a green meter gives false confidence.
- Cloud autosave or any shared storage of a minor's data.
- Rejection-reason cards: they would claim to know council behavior, which varies.
- A fundraising keyword watcher: false alarms and false comfort.
- An embedded Scoutly or other third-party widget: breaks the strict CSP and no-network rules, and the Scout would type into someone else's page. A plain link is fine.

## Parked: needs research first

- **Backward scheduler from the 18th birthday and a target finish date.** Most useful framing, but needs the exact deadline and extension rules verified against the Guide to Advancement, and wait times for signatures are local and invented. Do not ship an "age-out countdown" until then.

## Done from this review

- "Who to ask" card on tabs 1-4 with a Scoutly button, plus a Scoutly question on the home page.
- Advice tips for Plan boxes.
