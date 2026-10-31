# 2026 workbook: open items

Found in the Phase 4 review (review panel p4, rounds 1 and 2) and the Guided 2026 review (panel g, rounds 1 and 2). Fixed in panel g: the rule-sentence filter (now show-by-default with a recorded HIDDEN table); ten "In short" lines that turned an "or" or an "if" into a requirement, dropped a question, or used synonyms for the workbook's words; the Fundraising next-step line (now names the three exempt sources on page 12); the Plan hint that was the project's own advice; Your path going stale while typing; a stray "null" in the path card; the Signed card counting 2023a slots; the Guided page keying off the file name; a blocked-storage regression in "Open in"; the first tab's layout (the first box was 3.2 screens down, now 1.6); disclosure markers and 44px targets; and a deploy test that could not see one missing list.

A final four-lens review (fidelity, teen and accessibility, security and history, engineering) followed. It found no blocking product defect and no cross-edition leak. Fixed from it: shared 2023 wording on the 2026 Signed Pages tab (submission copy, "Optional" photos, the signature-lock warning, permits "on separate pages"); two tips that softened or changed the workbook's question (they now show the workbook sentence as a quote); the home page highlighting the 2023 card; no sign of success after "Make the filled PDF"; an unreadable banner link; edition-labelled links on the backup-from-PDF page; the four approvals and the Candidate's Promise explained; the workbook's example rows shown; wide tables (a scroll cue, keyboard access, 44px inputs); the attachments index now uses viewer page numbers; a Fill-report note about the official form's own total (see below); strict edition detection; a 2026 short-answer list; backup keys named like object methods and very deep nesting; mailto parameters; ten test gaps found by mutation; and a privacy scan that now covers its own file and is proven against planted leaks.

## Needs the maintainer

- **Erase on either 2026 page clears both 2026 drafts.** This is by design (each page can load the other's draft, and the confirmation says "both 2026 workbook pages"). Confirm that the wording is clear, or name each page.
- **Home page layout.** The 2023 Fill link sits at about 1563px down a 390px phone, past the 1520px guard in `tests/browser-e2e.cjs`. The guard was raised to 1800px. Consider putting the 2023 cards above the 2026 steps, or shortening the cards.

## Source attribution

- `docs/guidance-sources.md` describes the 2026 tips. Check each advice line that is the project's own example against the councils, coaches, and blogs in that file before release.

## Guided 2026 page

- Done: stage cards, "Your path" from the workbook's page 3 checklist, and "In short" lines for the 12 long prompts. A short line sits above the rule sentences, which are copied from the official text.
- Not done: examples under short boxes, and plain error messages like the 2023 Guided page has.
- Print titles use the Classic names ("Project Contacts") while the screen uses "1. Set Up". Use one set of names.
- The page title and home card say "stages"; that is now true (stage cards). Re-read both after the review.

## Smaller gaps

- Privacy scan: a file with a NUL byte is skipped as binary (`buf.includes(0)`), so a planted address in such a file is not reported. A bare `user@host` string without a TLD is not reported either.
- Tip test: "every tip key matches the field path" checks only that there are at least ten keys. Check each key against the paths the page renders.
- The browser test "a Scout with no tip panel open gets none" checks only the home-page link. Add the checks its name promises.
- "Open in" buttons and an unreadable draft: the repair copy is kept, but no confirmation asks first for a draft that is unreadable.

## Not built

- Option B for 2026 attachments: a whole-workbook drawn copy with scans after pages 11, 18, and 22.
- Carrying names and contacts from a 2023 draft into a 2026 draft.

## From the Guided 2026 review, not yet done

- **Check every "In short" line against its prompt by eye before release.** The word-overlap test is a smoke alarm only; the review caught five lines that the test passed. Mutation check: a line that softens the permits requirement still passes the tests.
- **Stage hints and the Review hint are the project's own advice** (for example "Look over what is left, then fill the official PDF"). Mark them as advice or source them.
- **The Safety box shows six statements under its In short line** (the four policy sentences, the 811 sentence, and the "not a teacher" sentence). That is the cost of showing every statement; trim only by moving a sentence into HIDDEN with a reason a test accepts.
- **`pillText(99)` throws** on an index that no caller can pass.
- **The privacy scan's jump-host rule** is now broader (it checks the attached form, ssh URLs, and the SSH proxy option); keep extending it as new kinds of leak turn up.
- **An unticked-but-hidden Fundraising tick still counts in `hasNotes`**, so "Open backup file" can warn about notes the Scout cannot see. Same as 2023a.
- **Intermittent failures in the 2023 Fill page browser tests** ("download is the official PDF plus an update", then "needs the PDF from the previous test") appeared once in one browser run and did not recur in five later runs. Cause not found. If it returns, run that group on its own.
- **Round 2 minor items not done:** the Name field is still a little over one screen below the stage card at 390px (852px); other old summaries ("Who to ask") are 23px tall; the stage hints for Signed pages and Review are marked "Tip:" but not sourced; one tick on "Get your Project Plan approved" covers the approval, and the Candidate's Promise is only mentioned.

## From the final review, not done

- **Acrobat was never run.** The Fill report warns (note S13) that the official form adds the first materials cost into "Total Proposal Development Hours" when it recalculates. That comes from reading the form's own script, not from running Acrobat. Ask a parent with Acrobat to open one filled copy and record what the total shows.
- **Single-line boxes that shrink never warn** (351 of 432 text boxes are auto-size). An 80-character name on the cover prints very small with no warning.
- **A draft already in storage is not checked for its edition** when a page loads it. The app never writes a mismatched one.
- **A flattened 2026 PDF on the Fill page** gets a generic "not the official workbook" message; the backup-from-PDF page explains it better.
- **A garbage JPEG in a backup file** says the picture "isn't in this backup file", which misleads.
- **Text inputs are 39px tall and several inline links are 14 to 22px.** Tabs, buttons, Tips, disclosures, and the Your path boxes are 44px or more.
- **Nav tab focus ring** was moved inside the tab (-4px offset); look at it once on a real device.
- **The Safety box shows six statements** under its In short line; the first tab still has 18 tab stops before the first field and no skip link.
- **Unexplained words:** "contingency", "mitigate", "in-kind" appear in the plain lines; "beneficiary" is glossed once, on the Set Up stage card.
- **Messages:** the erase dialog does not warn when no backup file was ever saved; Fill warnings name the PDF page but not the tab; "Filled 214 answers" and "Found 185" are not explained.
- **core-js (MIT)** is vendored with a copyright string and a URL, not the licence text. The fix is in `tools/vendor-pdfjs.cjs`, which generates `vendor/pdfjs/` (do not hand-edit the folder).
- **The `_corrupt` repair copy is write-once**: a second unreadable draft is replaced without a copy. Erase clears it.
- **`cleanUrl` drops `host:port` links** (it fails closed).

## From the signing-links review (2026 Fill page), not done

- The signing notes and the "Filled N answers" report are not checked on a 390px phone in a real browser, and not with a screen reader. The live region on `#report` may double-announce.
- The "DO NOT" quotes sit in plain paragraphs. A lead-in label would help. Wording is the maintainer's call.
- The browser test checks the links' hrefs, target, and rel, but not their labels or the order of the warnings relative to the notes. A mutation that moves the notes ahead of the warnings still passes.
- The Apple link goes to the Preview User Guide start page, not the topic "How to fill out and sign PDF forms". Find a direct link if one is stable.
