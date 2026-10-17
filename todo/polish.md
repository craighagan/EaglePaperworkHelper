# Small polish

**Status:** ready to do. Minor items left over from the reviews. None blocks use.

1. **"Last backup file: never" after switching workbooks.** When the Guided workbook starts from the Classic workbook's draft (it does this when it has no draft of its own), its status line says "Last backup file: never", even if a backup file was saved from the Classic workbook. Fix: when loading from `classicStore` in `lib/guided-workbook.js`, carry over its `_backup` time. Add a browser test.
2. **Acrobat mention.** The fill report suggests opening the PDF in Adobe Acrobat Reader, which hasn't been verified yet. Resolve together with [browser-testing.md](browser-testing.md).
