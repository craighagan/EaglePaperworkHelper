#!/usr/bin/env node
/*
 * Rebuild vendor/pdfjs/ from the published pdfjs-dist package.
 *
 *   node tools/vendor-pdfjs.cjs
 *
 * Why this exists: pdf.js 4+ ships only as ES modules (.mjs). Browsers refuse
 * to load ES modules from file:// pages, and FillOfficialPDF.html must work
 * when a Scout double-clicks it. This script downloads the pinned release,
 * checks its SHA-256, and makes three mechanical edits so each file runs as an
 * ordinary <script>:
 *
 *   1. Wrap the module body in a strict-mode function so its top-level names
 *      stay private (the two files share many names).
 *   2. Replace `import.meta.url` with a constant. It is only used on code paths
 *      the page never takes (Node canvas loading and JPEG 2000 image decoding).
 *   3. Replace the final `export {...}` with an assignment to a global:
 *      `globalThis.pdfjsLib` for the API. The worker already sets
 *      `globalThis.pdfjsWorker`, which pdf.js uses to run on the main thread.
 *
 * And one behavior fix in the worker (FONT_FALLBACK below): when pdf.js writes
 * a field's appearance and the field's font (its /DA, for example /ArialMT) is
 * not in the form's font list, pdf.js writes an empty /Resources while the
 * drawing still says "use /ArialMT". That is invalid PDF; Ghostscript and
 * Poppler then print the answer blank. The official workbook's fields ask for
 * ArialMT and Helvetica, which its form does not define. The fix adds a
 * standard Helvetica font under the requested name to that appearance's own
 * resources. pdf.js already measures and encodes such text as regular
 * Helvetica (WinAnsi), so layout is unchanged. Fields whose font is defined
 * are not affected.
 *
 * pdf.js 5 is required: it saves a field's value on the parent field when the
 * field has several widgets (the candidate name appears on 20 pages). pdf.js 3
 * wrote it only on each widget, which Apple Preview shows as blank.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '5.4.296';
const BASE = `https://unpkg.com/pdfjs-dist@${VERSION}`;
const SOURCES = {
  'legacy/build/pdf.min.mjs': 'a7a8724af7516e99f2616938246713d8043697fb5340df884496e762b45d0418',
  'legacy/build/pdf.worker.min.mjs': '90b49a1bf7b6c4d689d7d7bc0a52869bb3b1bc5935a0fa0ea6413b49f85ac8de'
};
const LICENSE_SHA256 = '0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594';
const OUT = path.resolve(__dirname, '../vendor/pdfjs');
const IMPORT_META_URL = '"file:///vendor/pdfjs/"';

// Exact pdf.js 5.4.296 code at the end of WidgetAnnotation._getSaveFieldResources.
const FONT_FALLBACK = {
  find: 'if(a instanceof Dict){const r=a.get("Font");if(r instanceof Dict&&r.has(n)){const a=new Dict(e);a.set(n,r.getRaw(n));const i=new Dict(e);i.set("Font",a);return Dict.merge({xref:e,dictArray:[i,t],mergeSubDicts:!0})}}return t||Dict.empty}',
  replace: 'if(a instanceof Dict){const r=a.get("Font");if(r instanceof Dict&&r.has(n)){const a=new Dict(e);a.set(n,r.getRaw(n));const i=new Dict(e);i.set("Font",a);return Dict.merge({xref:e,dictArray:[i,t],mergeSubDicts:!0})}}' +
    /* EaglePaperworkHelper: the field's font is not defined anywhere, so define it here as a standard font. */
    // Always regular Helvetica: that is the font pdf.js measured and encoded the text with.
    '/* EaglePaperworkHelper font fallback (tools/vendor-pdfjs.cjs) */{const f=new Dict(e);f.set("Type",Name.get("Font"));f.set("Subtype",Name.get("Type1"));' +
    'f.set("BaseFont",Name.get("Helvetica"));f.set("Encoding",Name.get("WinAnsiEncoding"));' +
    'const d=new Dict(e);d.set(n,f);const i=new Dict(e);i.set("Font",d);return Dict.merge({xref:e,dictArray:[i,t],mergeSubDicts:!0})}}'
};

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

async function download(file) {
  const response = await fetch(`${BASE}/${file}`);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function toClassicScript(source, globalName) {
  const count = (re) => (source.match(re) || []).length;
  // Static imports would come first, after the license comment.
  if (/^\s*(?:\/\*[\s\S]*?\*\/\s*)*import[\s{*]/.test(source)) throw new Error('static import found; update this script');
  const exportMatch = /export\s*\{([^}]*)\};?\s*$/.exec(source);
  if (!exportMatch || count(/\bexport\s*\{/g) !== 1) throw new Error('expected exactly one export {...} at the end');
  let body = source.slice(0, exportMatch.index).replace(/import\.meta\.url/g, IMPORT_META_URL);
  if (/import\.meta/.test(body)) throw new Error('unexpected import.meta use; update this script');
  let assign = '';
  if (globalName) {
    const entries = exportMatch[1].split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
      const m = /^([\w$]+)(?:\s+as\s+([\w$]+))?$/.exec(part);
      if (!m) throw new Error(`cannot parse export "${part}"`);
      return `${JSON.stringify(m[2] || m[1])}:${m[1]}`;
    });
    assign = `\nglobalThis.${globalName}={${entries.join(',')}};`;
  }
  const header = globalName
    ? `/* pdfjs-dist ${VERSION} (Apache-2.0), converted from an ES module to a classic script by tools/vendor-pdfjs.cjs. Includes core-js (MIT). */\n`
    : `/* pdfjs-dist ${VERSION} (Apache-2.0), converted from an ES module to a classic script and patched (font fallback in WidgetAnnotation._getSaveFieldResources) by tools/vendor-pdfjs.cjs. Includes core-js (MIT). */\n`;
  return `${header}(function(){"use strict";\n${body}${assign}\n}).call(undefined);\n`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const outputs = {};
  for (const [file, expected] of Object.entries(SOURCES)) {
    const data = await download(file);
    const actual = sha256(data);
    if (actual !== expected) throw new Error(`${file}: SHA-256 ${actual} does not match the pinned ${expected}`);
    const isWorker = file.includes('worker');
    const name = isWorker ? 'pdf.worker.js' : 'pdf.js';
    let source = data.toString('utf8');
    if (isWorker) {
      const count = source.split(FONT_FALLBACK.find).length - 1;
      if (count !== 1) throw new Error(`font fallback patch: expected the target code once, found ${count}; update FONT_FALLBACK for this pdf.js version`);
      source = source.replace(FONT_FALLBACK.find, () => FONT_FALLBACK.replace);
    }
    const converted = toClassicScript(source, isWorker ? null : 'pdfjsLib');
    fs.writeFileSync(path.join(OUT, name), converted);
    outputs[name] = { from: file, sourceSha256: actual, sha256: sha256(converted) };
  }
  const license = await download('LICENSE');
  if (sha256(license) !== LICENSE_SHA256) throw new Error(`LICENSE: SHA-256 ${sha256(license)} does not match the pinned ${LICENSE_SHA256}`);
  fs.writeFileSync(path.join(OUT, 'LICENSE'), license);
  for (const old of ['pdf.min.js', 'pdf.worker.min.js']) fs.rmSync(path.join(OUT, old), { force: true });
  const rows = Object.entries(outputs).map(([name, o]) => `| \`${name}\` | \`${o.from}\` | \`${o.sourceSha256}\` | \`${o.sha256}\` |`);
  fs.writeFileSync(path.join(OUT, 'README.md'), `# pdf.js ${VERSION}

From the [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) package, legacy (wider browser support) build.
Apache License 2.0 (see \`LICENSE\`). Copyright Mozilla Foundation.

These files are generated by [\`tools/vendor-pdfjs.cjs\`](../../tools/vendor-pdfjs.cjs). Do not edit them by hand.
That script explains the changes it makes:

- Mechanical: wrap each module in a function and expose it as a global, so it loads as an ordinary \`<script>\` from \`file://\`.
- One fix in \`pdf.worker.js\` (marked "EaglePaperworkHelper font fallback"): when a form field asks for a font the PDF
  does not define, the saved appearance now includes a standard Helvetica font under that name. Without it, some viewers
  and printers show the answer blank.

The legacy build bundles [core-js](https://github.com/zloirock/core-js) (MIT License); its notice is kept in the files.

Before upgrading, check GitHub security advisories for pdfjs-dist, then update the pinned hashes and run both test scripts.

| File | Source in pdfjs-dist | Source SHA-256 | Output SHA-256 |
| --- | --- | --- | --- |
${rows.join('\n')}
`);
  console.log(JSON.stringify(outputs, null, 2));
})().catch((error) => { console.error(error.message); process.exit(1); });
