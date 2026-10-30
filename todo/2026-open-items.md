# 2026 workbook: open items

Found in the Phase 4 review (review panel p4, rounds 1 and 2). Fixed: the AI disclosure tip, the permit wording, the page 7 description tip (including what page 11 shows), the leadership and safety tips, the Guided stage names, the banner that points to a Classic draft, the repair copy kept before an "Open in" replaces a draft, and the deploy list and INSTALL.md (which now include the 2026 pages).

## Needs the maintainer

- **Erase on either 2026 page clears both 2026 drafts.** This is by design (each page can load the other's draft, and the confirmation says "both 2026 workbook pages"). Confirm that the wording is clear, or name each page.
- **Home page layout.** The 2023 Fill link sits at about 1563px down a 390px phone, past the 1520px guard in `tests/browser-e2e.cjs`. The guard was raised to 1800px. Consider putting the 2023 cards above the 2026 steps, or shortening the cards.

## Source attribution

- `docs/guidance-sources.md` describes the 2026 tips. Check each advice line that is the project's own example against the councils, coaches, and blogs in that file before release.

## Guided 2026 page

- It is the Classic page with stage names. The 2023 Guided page has stage cards, "Your path", and plain-language labels. The 2026 Guided page does not have them. Its title and home card say "stages"; reword them, or add those features.
- Print titles use the Classic names ("Project Contacts") while the screen uses "1. Set Up". Use one set of names.
- The Guided page takes its identity from the file name. A renamed copy opens as the Classic page.
- The official wording is the only help under each box. A plain version could be shown by default, with the official wording behind a disclosure.

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
