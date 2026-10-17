# Test other browsers and Adobe Acrobat

**Status:** ready to do.

The automated tests cover Chrome on macOS (from `file://`), and check filled PDFs in pdf.js, Apple PDFKit (Preview), Ghostscript, Poppler, and MuPDF. Not yet checked:

## Browsers

Check each of these from `file://` (double-clicked) and from a website (the example site or `python3 -m http.server 8080 --bind 127.0.0.1`):

- Safari (macOS, and iPad if Scouts use one)
- Firefox (macOS or Windows)
- Edge (Windows), including opening the pages from an extracted ZIP

For each:

1. Type in the Guided workbook, reload, and see the answer.
2. Save a backup file, then open it again.
3. Print a draft, and come back from the print dialog.
4. Fill the official PDF from the backup file, and with "Get the official PDF for me."
5. Make a backup file from the filled PDF.

Note anything that differs. Saved drafts are expected to work differently on `file://`: Safari and Firefox keep a separate draft per page file, so "Use the draft saved in…" may not appear. The README already says so.

## Adobe Acrobat Reader

Open a filled PDF and check:

- Every page shows the typed answers, including the cover, contacts, cost tables, and report hours.
- Clicking into a box and back out doesn't change or clear it.
- Printing shows the answers.

Then update the README's browser and viewer notes and `lib/fill-page.js`'s "Open the PDF (in Preview, Adobe Acrobat Reader, or your web browser)" line to match what was verified.

**Effort:** 1–2 hours with access to the browsers.

**Signed Pages tab:** check that scans persist in IndexedDB when the pages are opened from `file://` in Firefox (it may give each file its own origin) and Safari, and that the "This browser can’t keep pictures" warning shows where they don't. Also check HEIC photos in Safari, and the share and download of an 8 MB submission copy on a phone.
