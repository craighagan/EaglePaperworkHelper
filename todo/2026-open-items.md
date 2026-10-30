# 2026 workbook: open items

Found in the Phase 4 review (review panel p4, rounds 1 and 2) and the Guided 2026 review (panel g, rounds 1 and 2). Fixed in panel g: the rule-sentence filter (now show-by-default with a recorded HIDDEN table); ten "In short" lines that turned an "or" or an "if" into a requirement, dropped a question, or used synonyms for the workbook's words; the Fundraising next-step line (now names the three exempt sources on page 12); the Plan hint that was the project's own advice; Your path going stale while typing; a stray "null" in the path card; the Signed card counting 2023a slots; the Guided page keying off the file name; a blocked-storage regression in "Open in"; the first tab's layout (the first box was 3.2 screens down, now 1.6); disclosure markers and 44px targets; and a deploy test that could not see one missing list.

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

- Privacy scan: a file with a NUL byte is skipped as binary (`buf.includes(0)`), so a planted address in such a file is not reported. The scan also does not cover IPv6 addresses or bare `user@host` strings. The uppercase-domain and `-J` checks were added.
- Tip test: "every tip key matches the field path" checks only that there are at least ten keys. Check each key against the paths the page renders.
- The browser test "a Scout with no tip panel open gets none" checks only the home-page link. Add the checks its name promises.
- The Fill page, its help, and the README name only the Classic 2026 page.
- "Open in" buttons and an unreadable draft: the repair copy is kept, but no confirmation asks first for a draft that is unreadable.

## Not built

- Option B for 2026 attachments: a whole-workbook drawn copy with scans after pages 11, 18, and 22.
- "Your path" for 2026 (`journeySteps` for the 2026 edition).
- Carrying names and contacts from a 2023 draft into a 2026 draft.

## From the Guided 2026 review, not yet done

- **Check every "In short" line against its prompt by eye before release.** The word-overlap test is a smoke alarm only; the review caught five lines that the test passed. Mutation check: a line that softens the permits requirement still passes the tests.
- **Stage hints and the Review hint are the project's own advice** (for example "Look over what is left, then fill the official PDF"). Mark them as advice or source them.
- **The Safety box shows six statements under its In short line** (the four policy sentences, the 811 sentence, and the "not a teacher" sentence). That is the cost of showing every statement; trim only by moving a sentence into HIDDEN with a reason a test accepts.
- **`pillText(99)` throws** on an index that no caller can pass.
- **The privacy scan's jump-host rule** misses the attached form (`-Jme@host`) and `ProxyJump=`.
- **An unticked-but-hidden Fundraising tick still counts in `hasNotes`**, so "Open backup file" can warn about notes the Scout cannot see. Same as 2023a.
- **Intermittent failures in the 2023 Fill page browser tests** ("download is the official PDF plus an update", then "needs the PDF from the previous test") appeared once in one browser run and did not recur in five later runs. Cause not found. If it returns, run that group on its own.
- **Round 2 minor items not done:** the Name field is still a little over one screen below the stage card at 390px (852px); other old summaries ("Who to ask") are 23px tall; the stage hints for Signed pages and Review are marked "Tip:" but not sourced; one tick on "Get your Project Plan approved" covers the approval, and the Candidate's Promise is only mentioned.
