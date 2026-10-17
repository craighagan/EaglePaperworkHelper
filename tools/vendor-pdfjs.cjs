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
 * JPEG 2000 images (the official workbook's cover art, logo, and page backgrounds
 * use them) are decoded by a small WebAssembly program, openjpeg.wasm. pdf.js
 * normally fetches it at run time, which does not work from file:// and is blocked
 * by these pages' content security policy. So this script also writes the wasm file
 * as base64 text into vendor/pdfjs/openjpeg-wasm.js (a classic script that sets
 * globalThis.EAGLE_OPENJPEG_WASM) and patches the worker to read it from there
 * (WASM_PATCH below). Without it, those images are silently left out of any
 * picture of a page (the submission copy).
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
const WASM_FILE = 'wasm/openjpeg.wasm';
const WASM_SHA256 = '67b8e2b162da472e98cb48d3d32e3e38fff481b9b32ff4818e78bb248af88ab2';
const WASM_LICENSE_FILE = 'wasm/LICENSE_OPENJPEG';
const WRAPPER_LICENSE_FILE = 'wasm/LICENSE_PDFJS_OPENJPEG';
const WRAPPER_LICENSE_SHA256 = '717fc62da03292dbb4dd0c8280bd4ce7bb8550dcf31d772bc93455fb50313425';
const WASM_LICENSE_SHA256 = 'a6af136f3e15038a666b61f376612a07d9a4e48cb7c01adbf3e33b3f14ab49b6';

// Exact pdf.js 5.4.296 code in JpxImage.#instantiateWasm: fetch the wasm file (or ask the main thread to).
const WASM_PATCH = {
  find: 'this.#N||(this.#L?this.#N=await fetchBinaryData(`${this.#F}${a}`):this.#N=await this.#P.sendWithPromise("FetchBinaryData",{type:"wasmFactory",filename:a}))',
  replace: 'this.#N||(this.#N=(()=>{/* EaglePaperworkHelper: read the bundled openjpeg.wasm (vendor/pdfjs/openjpeg-wasm.js) instead of fetching it */' +
    'const t=globalThis.EAGLE_OPENJPEG_WASM;if(!t)throw new Error("openjpeg-wasm.js is not loaded");const s=atob(t),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b})())'
};
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
      const wasmCount = source.split(WASM_PATCH.find).length - 1;
      if (wasmCount !== 1) throw new Error(`wasm patch: expected the target code once, found ${wasmCount}; update WASM_PATCH for this pdf.js version`);
      source = source.replace(WASM_PATCH.find, () => WASM_PATCH.replace);
    }
    const converted = toClassicScript(source, isWorker ? null : 'pdfjsLib');
    fs.writeFileSync(path.join(OUT, name), converted);
    outputs[name] = { from: file, sourceSha256: actual, sha256: sha256(converted) };
  }
  const license = await download('LICENSE');
  if (sha256(license) !== LICENSE_SHA256) throw new Error(`LICENSE: SHA-256 ${sha256(license)} does not match the pinned ${LICENSE_SHA256}`);
  fs.writeFileSync(path.join(OUT, 'LICENSE'), license);
  const wasm = await download(WASM_FILE);
  if (sha256(wasm) !== WASM_SHA256) throw new Error(`${WASM_FILE}: SHA-256 ${sha256(wasm)} does not match the pinned ${WASM_SHA256}`);
  const wasmLicense = await download(WASM_LICENSE_FILE);
  if (sha256(wasmLicense) !== WASM_LICENSE_SHA256) throw new Error(`${WASM_LICENSE_FILE}: SHA-256 ${sha256(wasmLicense)} does not match the pinned ${WASM_LICENSE_SHA256}`);
  fs.writeFileSync(path.join(OUT, 'LICENSE_OPENJPEG'), wasmLicense);
  const wrapperLicense = await download(WRAPPER_LICENSE_FILE);
  if (sha256(wrapperLicense) !== WRAPPER_LICENSE_SHA256) throw new Error(`${WRAPPER_LICENSE_FILE}: SHA-256 ${sha256(wrapperLicense)} does not match the pinned ${WRAPPER_LICENSE_SHA256}`);
  fs.writeFileSync(path.join(OUT, 'LICENSE_PDFJS_OPENJPEG'), wrapperLicense);
  const wasmScript = `/* openjpeg.wasm from pdfjs-dist ${VERSION} (OpenJPEG, BSD-2-Clause: see LICENSE_OPENJPEG and LICENSE_PDFJS_OPENJPEG) as base64, so JPEG 2000 images decode from file://. Generated by tools/vendor-pdfjs.cjs. */\nglobalThis.EAGLE_OPENJPEG_WASM="${wasm.toString('base64')}";\n`;
  fs.writeFileSync(path.join(OUT, 'openjpeg-wasm.js'), wasmScript);
  outputs['openjpeg-wasm.js'] = { from: WASM_FILE, sourceSha256: sha256(wasm), sha256: sha256(Buffer.from(wasmScript)) };
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
- One change in \`pdf.worker.js\` (marked "EaglePaperworkHelper"): JPEG 2000 images (the workbook's cover art and logo)
  are decoded by \`openjpeg-wasm.js\`, the WebAssembly decoder from the same package written out as base64 text, instead
  of being fetched at run time, which cannot work from \`file://\`. OpenJPEG is BSD-2-Clause (see \`LICENSE_OPENJPEG\` and \`LICENSE_PDFJS_OPENJPEG\`, the notice for Mozilla's wrapper around it). OpenJPEG parses the JPEG 2000 images inside any PDF you add, so check its security advisories when upgrading.

The legacy build bundles [core-js](https://github.com/zloirock/core-js) (MIT License); its notice is kept in the files.

Before upgrading, check GitHub security advisories for pdfjs-dist, then update the pinned hashes and run both test scripts.

| File | Source in pdfjs-dist | Source SHA-256 | Output SHA-256 |
| --- | --- | --- | --- |
${rows.join('\n')}
`);
  console.log(JSON.stringify(outputs, null, 2));
})().catch((error) => { console.error(error.message); process.exit(1); });
