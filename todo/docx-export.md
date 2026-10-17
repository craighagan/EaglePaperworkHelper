# Word (.docx) export

**Status:** undecided. Export only; importing a .docx back is out of scope.

## Idea

Add a "Download as a Word document" button to the workbook pages. It saves the answers as a .docx laid out like the printed draft, marked as an unofficial draft.

## What it adds over the filled PDF

- **Comments and suggested edits.** A coach or parent can upload it to Google Drive and comment or suggest changes in Google Docs, or use Track Changes in Word. That is the main gain.
- **Long answers aren't cut off.** Official PDF boxes have fixed sizes; a document grows.
- Easy to paste into other documents.

## Why it may not be worth it

- The filled official PDF and **Print a draft** already cover sharing and review.
- Edits made in the document don't come back into the workbook. The backup file stays the main copy, so the document could drift from it.

## How (if done)

- Generate the .docx in the browser with no library. A .docx is a ZIP of a few XML files, so a small uncompressed ZIP writer with CRC-32 is enough (about 150 lines in `lib/`).
- Reuse the print-draft section structure from `lib/workbook-common.js` / the page scripts so headings and order match.
- Hard rules still apply: no network, no inline scripts, fictional data only in tests.
- Test that Word, Google Docs (after upload), and LibreOffice open it. A Node test can unzip it and check the XML.

**Effort:** about half a day.

## Decide

Is commenting in Google Docs or Word worth a second export format to maintain?
