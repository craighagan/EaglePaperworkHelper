# Quick wins and a Review tab (plan for approval)

**Status:** waiting for the maintainer's OK. Nothing here is built.

Order agreed: **(2) quick wins**, then **(3) a Review tab**, then come back to the 2026 workbook design ([2026-workbook-and-feedback.md](2026-workbook-and-feedback.md)). Everything below runs in the Scout's browser only, and is built so a 2026 edition can plug in later without rewriting it.

## Which workbook is this? (answer for the later 2026 work)

Yes, it can be told from a backup file:

- Every backup file so far is **2023a**: it is the only workbook this helper has supported. They have no `edition` key.
- When 2026 lands, new drafts get `edition: '2026'` (an added key, per hard rule 9; nothing renamed).
- So the rule is one line: **`editionOf(data) = data.edition === '2026' ? '2026' : '2023a'`**. A safety net can also notice 2026-only answers (impact, motivation) and say "this looks like a 2026 draft".
- A filled PDF tells its edition by its field names (2023a: `Workbook-EagleName`; 2026: `Candidates Full Name`) and by its SHA-256.

For the work below, `editionOf()` exists from the start and always answers 2023a, and every list of boxes is looked up by edition. Adding 2026 later means adding a second table, not touching this code.

## Task 0. One table of "key boxes" per edition (groundwork, no visible change)

Today the boxes that count toward "N of M basics done" live in three places: `EagleJourney.PATHS` (proposal, plan, report), and two lists written into the Guided `STAGES` (set up, fundraising).

- Add `KEY_BOXES['2023a']` in `lib/journey.js`: for each tab, an ordered list of `{ path, label }` (the label is the Classic wording, short). Tabs: set up, proposal, plan, fundraising, report. Signed Pages has none.
- `editionOf(data)` and `keyBoxes(data)` live there too. `PATHS` becomes a view of this table, so the stage cards and Your path keep agreeing (an existing browser test checks this).
- Fundraising counts only when the Scout said yes on Your path ("Will you ask anyone outside…"), because the application isn't always needed.
- Tests: the counts for the sample and an empty draft are the same as today; every path exists in `defaults()`; both workbooks have an input for every key box.
- About 2 hours.

## Task A. "Not in a backup file" bar when changing tabs

- When the Scout moves to another tab and there are changes not in a backup file (the existing count, or "no backup file yet" once a draft exists), show a slim bar under the tabs:
  `3 changes not in a backup file. [Save backup file] [Not now]`
- **Not a pop-up**, and never blocks moving on.
- Shown at most once per tab change; "Not now" hides it for 10 minutes (kept in memory, not saved). Saving hides it.
- Not shown while the tab is blocked by another tab (that message already says what to do), and not printed.
- Screen readers: announced once when it appears (polite), not on every count change.
- Same in Guided and Classic.
- Tests: appears after a change and a tab switch; not with zero changes; "Not now" holds; Save clears it; not in print; keyboard reachable at 390px.
- About 2 hours.

## Task B. Which tabs still have empty key boxes, and which boxes

- **A small dot on a tab** whose key boxes aren't all filled in (Fundraising only when the Scout said yes). A screen reader hears the tab name plus "some boxes not filled in yet".
- **On each tab, a short list at the top:** "Not filled in yet: Project description · Why it's needed" with each name a link that jumps to and focuses that box. Collapsed once there are more than 5 ("and 4 more").
- Wording rules: "not filled in yet", never "required" or "missing", because many boxes are optional or "not applicable" is a fine answer.
- Tests: dots match the counts; links focus the right input; filling a box removes it live; no dots on Signed Pages; works at 390px.
- About 3 hours.

## Task C. One overall count

- Under the tabs: **"Key boxes filled in: 34 of 52."** A plain count, no percent, no grade, no "ready", no green check (earlier reviewers flagged a readiness score as misleading).
- Same table as Task 0, so it always equals the sum of the stage cards.
- About 1 hour.

## Task D. Spell check on

- Turn on the browser's own spell check (`spellcheck="true"`) on multi-line answer boxes. Leave it off on names, addresses, emails, and phone numbers (it would underline every name).
- Nothing leaves the browser; this is the browser's built-in checker.
- About 30 minutes.

## Task E. A Review tab (item 3)

A last tab in both workbooks, **"7. Review"** in Guided and **"Review"** in Classic, after Signed Pages & Photos. It gathers what already exists; it adds no new rules and no AI.

1. **Not filled in yet**, grouped by tab, with jump links (Task B's list, all tabs).
2. **Heads-ups:** the checks the Fill page already runs (`lib/preflight.js`: an end date before its start date, impossible dates, cost rows that don't add up), now also shown here. The workbook pages start loading `preflight.js`.
3. **Short answers in big boxes:** for the long answer boxes (description, why needed, leadership, plan details, report answers), an answer under about 8 words gets: "This answer is short for its box. Your coach may ask for more detail." Wording says "may", never "must". Thresholds are a guess and live in one table.
4. **Your backup file:** "3 changes not in a backup file. [Save backup file]".
5. **Next on your path** (from Your path).
6. **Buttons:** Print a draft · Fill the official PDF.

If nothing turns up: "Nothing here looked unusual. This is not an approval check; your Scoutmaster, beneficiary, and council decide."

Not on the Review tab: "this answer may not fit its box" warnings. Those need the official PDF's box sizes, so they stay on the Fill page, and the Review tab says so ("The Fill page also checks whether long answers fit their boxes").

- Edition-ready: every list comes from `keyBoxes(data)` and the short-answer table by edition.
- Tests: an empty draft lists every key box; the sample lists nothing but what it really lacks; jump links work; a heads-up shows for a date in the wrong order; short-answer hint appears and disappears; wording test (no must, required, ready, approved, score); works at 390px; not printed by Print a draft.
- About 1 day.

## Review and order

- Tasks 0, D: no review panel needed (no visible change / trivial).
- Tasks A, B, C together, then E: review panel (teen and accessibility, engineering, official-text fidelity for the labels) before each commit, per `AGENTS.md`.
- Total: about 2 days of work.
