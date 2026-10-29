# Quick wins and a Review tab: step-by-step implementation plan

**Status:** waiting for the maintainer's OK. Nothing here is built.

This plan is written so that a careful but less experienced agent can follow it exactly. Do the tasks **in order**. Each task says which files to touch, what to add (with exact names and exact user-visible strings), which tests to write **first**, and how to know it is done. Do not improvise wording: every sentence a Scout sees is given below. If something in the code does not match what this plan says (a line moved, a name changed), stop and report it instead of guessing.

Agreed order: Task 0, A, B, C, D (quick wins), then E (Review tab). The 2026 workbook comes after, from [2026-workbook-and-feedback.md](2026-workbook-and-feedback.md).

---

## Read this first (rules for every task)

1. Read `AGENTS.md` fully. The hard rules apply. In particular: no build, classic scripts only, no `innerHTML` (build DOM with `h(tag, attrs, ...children)` from `lib/workbook-common.js`), no network, no new requirements in wording.
2. **Tests first.** For each task: write the tests listed, run them, confirm they **fail**, then write the code, run them again, confirm they **pass**.
3. Commands (run from the repository root, one at a time, never in parallel):
   ```bash
   node tests/run-tests.cjs                              # unit tests, about 30 s
   CHROME_NO_SANDBOX=1 node tests/browser-e2e.cjs         # browser tests, 2–3 minutes: use a timeout of at least 10 minutes
   node --check lib/<file>.js                             # after every edit to a script
   ```
   Drop `CHROME_NO_SANDBOX=1` on a normal machine.
4. **Both** `tests/run-tests.cjs` and `tests/browser-e2e.cjs` must report `0 failed` before any commit.
5. Edit by replacing an exact, unique piece of text. After each edit, search for the new text to confirm it is there exactly once. Never use blanket search-and-replace over a whole file.
6. Change **both** workbooks (`lib/guided-workbook.js` and `lib/classic-workbook.js`) whenever a task says "both".
7. Commit after each task (Conventional Commits, for example `feat(workbook): Show which tabs have empty key boxes`). Don't push. Check `git show --stat HEAD` after committing.
8. Never open or copy a real Scout's backup file. Tests use `tests/fixtures/sample-workbook.json` (fictional) or `W.defaults()`.
9. Words to **never** use in new user-visible text: `required`, `must`, `missing`, `ready`, `approved`, `score`, `complete` (as a verdict), `%`. A test in Task E enforces this for the Review tab.

### Facts about the code you will need

- Field inputs have the id `'f-' + path.replace(/[^a-zA-Z0-9_-]/g, '-')`. Example: `proposal.description` → `f-proposal-description`; `contacts.beneficiaryRep.name` → `f-contacts-beneficiaryRep-name`. (`lib/workbook-common.js`, inside `createForm` → `field`.)
- Each workbook page script has `TABS` (array of labels), `RENDERERS` (one function per tab), `go(i)` (switch tab and re-render), `render()` (rebuilds everything in `#app`), `get(path)`, `set(path, value)`, `store` (the draft store), and `D` (the draft).
  - Guided: `TABS = ['1. Set Up', '2. Proposal', '3. Detailed Plan', '4. Fundraising', '5. Final Report', '6. Signed Pages']` (check the exact current labels in the file).
  - Classic: `TABS = ['Contact Info', 'Proposal', 'Project Plan', 'Fundraising', 'Report', 'Signed Pages & Photos']` (check the file).
- `store.changeCount()` returns a number of changes since the last backup file, or `null` when it can't know. `store.backupAt()` is 0 when no backup file was ever saved; `store.savedAt()` is 0 when the draft was never saved; `store.state` is `'conflict'` when another tab changed the draft.
- `W.saveBackup(D, store)` saves a backup file.
- `lib/journey.js` exports (in Node through `module.exports`, in the browser as `window.EagleJourney`) `PATHS`, `journeySteps`, `CHECK_IDS`, `hasNotes`, `clean`, `REMINDER`. `D.journey.raising` is `'yes'`, `'no'`, or `''`.
- `lib/preflight.js` exports `check(data, lib)` → array of note strings (`lib` is `window.EagleOfficialPdf`).
- Unit tests (`tests/run-tests.cjs`): `await test('name', () => { ... })` with Node's `assert`. `workbookCommon()` returns `window.EagleWorkbook` loaded in a fresh context; `sample` is the parsed fixture; `ROOT` is the repository path; `path`, `fs` are loaded.
- Browser tests (`tests/browser-e2e.cjs`): inside the loop `for (const [file, key] of [['EagleWorkbook-guided.html', 'eagle_workbook_guided_v1'], ['EagleWorkbook.html', 'eagle_workbook_v1']])` (the first one, near line 269) you have `file`, `key`, `ready` (a JS expression that is true when the page has loaded), and helpers `open(file, ready)`, `evaluate(jsString)`, `waitFor(jsString, ms)`, `sleep(ms)`, `click(text)`, `send(...)`, `assert`. Put new per-workbook tests inside that loop, right after the test named `'opens without errors and Next moves forward'`.
- Seeding a draft in a browser test:
  ```js
  await open(file, ready);
  await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(draft))}); localStorage.setItem(${JSON.stringify(key + '_saved')}, String(Date.now())); true`);
  await open(file, ready);
  ```
- Typing into a box in a browser test:
  ```js
  await evaluate(`(() => { const i = document.getElementById("f-proposal-description"); i.value = "Some text"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  ```
  Saves happen 400 ms after typing; wait with `waitFor(...)` or `sleep(600)` before reading `localStorage`.

---

## Task 0. One table of key boxes, looked up by edition (no visible change)

**Why:** today the "N of M basics done" boxes live in three places (`PATHS` in `lib/journey.js`, and two lists typed into `STAGES` in `lib/guided-workbook.js` for Set Up and Fundraising). Later tasks need labels too, and a 2026 table must slot in beside the 2023a one.

### 0.1 Tests first (`tests/run-tests.cjs`)

Add a block **just before** the line `  console.log('Your path');`:

```js
  console.log('Key boxes');
  {
    const J = require(path.join(ROOT, 'lib/journey.js'));
    const W = workbookCommon();
    await test('key boxes: edition is 2023a unless the draft says 2026', () => {
      assert.equal(J.editionOf({}), '2023a');
      assert.equal(J.editionOf(null), '2023a');
      assert.equal(J.editionOf({ edition: '2026' }), '2026');
      assert.equal(J.editionOf({ edition: 'something else' }), '2023a');
    });
    await test('key boxes: every key box exists in the draft and has a label', () => {
      const d = W.defaults();
      for (const [tab, boxes] of Object.entries(J.KEY_BOXES['2023a'])) {
        assert.ok(boxes.length > 0, tab);
        for (const b of boxes) {
          assert.equal(typeof b.label, 'string', `${tab} ${b.path}`);
          assert.ok(b.label.length > 2 && b.label.length < 60, `${tab} ${b.path}: label length`);
          const v = b.path.split('.').reduce((o, k) => (o ? o[k] : undefined), d);
          assert.equal(typeof v, 'string', `${b.path} is not a text box in defaults()`);
        }
      }
    });
    await test('key boxes: the lists are exactly what the counts used before', () => {
      const t = J.KEY_BOXES['2023a'];
      const paths = (k) => t[k].map((b) => b.path);
      assert.deepEqual(paths('setup'), ['candidate.name', 'candidate.email', 'unit.number', 'contacts.beneficiary.name', 'contacts.beneficiaryRep.name']);
      assert.deepEqual(paths('proposal'), ['proposal.projectName', 'proposal.description', 'proposal.whyNeeded', 'proposal.helperCount', 'proposal.materials', 'proposal.safety']);
      assert.deepEqual(paths('plan'), ['plan.startDate', 'plan.presentCondition', 'plan.workProcesses', 'plan.firstAid', 'plan.contingency']);
      assert.deepEqual(paths('fundraising'), ['fundraising.description', 'fundraising.beginDate', 'fundraising.howMuch']);
      assert.deepEqual(paths('report'), ['report.actualStart', 'report.actualEnd', 'report.description', 'report.leadership']);
      assert.deepEqual(J.PATHS.proposal, paths('proposal'), 'PATHS is a view of the same table');
    });
    await test('key boxes: emptyKeyBoxes lists what is not filled in, and fundraising only when raising money', () => {
      const d = W.defaults();
      const empty = J.emptyKeyBoxes(d);
      assert.deepEqual(Object.keys(empty), ['setup', 'proposal', 'plan', 'report'], 'no fundraising unless the Scout said yes');
      assert.equal(empty.proposal.length, 6);
      d.journey = { raising: 'yes', steps: {} };
      assert.deepEqual(Object.keys(J.emptyKeyBoxes(d)), ['setup', 'proposal', 'plan', 'fundraising', 'report']);
      d.proposal.description = '   ';
      assert.equal(J.emptyKeyBoxes(d).proposal.length, 6, 'spaces only is still not filled in');
      d.proposal.description = 'Build a bench';
      assert.equal(J.emptyKeyBoxes(d).proposal.length, 5);
      assert.equal(J.emptyKeyBoxes(d).proposal.some((b) => b.path === 'proposal.description'), false);
    });
    await test('key boxes: the overall count', () => {
      const d = W.defaults();
      assert.deepEqual(J.keyBoxCount(d), { filled: 0, total: 20 }, '5 + 6 + 5 + 4 boxes, fundraising not counted');
      d.journey = { raising: 'yes', steps: {} };
      assert.deepEqual(J.keyBoxCount(d), { filled: 0, total: 23 });
      const s = J.keyBoxCount(JSON.parse(JSON.stringify(sample)));
      assert.ok(s.filled > 0 && s.filled <= s.total);
    });
  }
```

Run `node tests/run-tests.cjs`. The five new tests must **fail** (the functions don't exist yet).

### 0.2 Code (`lib/journey.js`)

1. Replace the whole `const PATHS = { ... };` block (and its comment above it) with:

```js
  /* The "key boxes" for each tab, per workbook edition. Every count of boxes "filled in" (the Guided stage cards,
     Your path, the tab dots, the overall count, the Review tab) reads this one table, so they always agree.
     Labels are short plain names for a box; they appear in "Not filled in yet" lists. Change them here only.
     A 2026 table will be added beside this one; nothing else should need to change for it. */
  const KEY_BOXES = {
    '2023a': {
      setup: [
        { path: 'candidate.name', label: 'Your full legal name' },
        { path: 'candidate.email', label: 'Your email' },
        { path: 'unit.number', label: 'Unit number' },
        { path: 'contacts.beneficiary.name', label: 'Beneficiary organization' },
        { path: 'contacts.beneficiaryRep.name', label: 'Beneficiary contact person' }
      ],
      proposal: [
        { path: 'proposal.projectName', label: 'Project name' },
        { path: 'proposal.description', label: 'Project description' },
        { path: 'proposal.whyNeeded', label: 'Why the beneficiary needs it' },
        { path: 'proposal.helperCount', label: 'How many helpers' },
        { path: 'proposal.materials', label: 'Materials' },
        { path: 'proposal.safety', label: 'Safety issues and hazards' }
      ],
      plan: [
        { path: 'plan.startDate', label: 'Planned start date' },
        { path: 'plan.presentCondition', label: 'Present condition' },
        { path: 'plan.workProcesses', label: 'Work processes' },
        { path: 'plan.firstAid', label: 'First aid kit' },
        { path: 'plan.contingency', label: 'Contingency plans' }
      ],
      fundraising: [
        { path: 'fundraising.description', label: 'How funds will be raised' },
        { path: 'fundraising.beginDate', label: 'Project begin date' },
        { path: 'fundraising.howMuch', label: 'How much you expect to raise' }
      ],
      report: [
        { path: 'report.actualStart', label: 'When the work began' },
        { path: 'report.actualEnd', label: 'When the work finished' },
        { path: 'report.description', label: 'Project description and impact' },
        { path: 'report.leadership', label: 'How you led' }
      ]
    }
  };
  const TAB_ORDER = ['setup', 'proposal', 'plan', 'fundraising', 'report'];

  /** Which official workbook a draft is for. Every backup file made before 2026 support has no `edition`, so it is 2023a. */
  function editionOf(data) {
    return data && typeof data === 'object' && data.edition === '2026' ? '2026' : '2023a';
  }

  /** The key boxes for this draft's edition (falls back to 2023a while 2026 has no table). */
  function keyBoxes(data) {
    return KEY_BOXES[editionOf(data)] || KEY_BOXES['2023a'];
  }

  /** Fundraising boxes count only when the Scout said, on Your path, that they will ask outsiders for money or materials. */
  const countsFundraising = (data) => Boolean(data && data.journey && data.journey.raising === 'yes');

  /** Tab name → key boxes not filled in yet (in table order). Tabs with nothing empty are still listed, with []. */
  function emptyKeyBoxes(data) {
    const t = keyBoxes(data);
    const out = {};
    for (const name of TAB_ORDER) {
      if (name === 'fundraising' && !countsFundraising(data)) continue;
      out[name] = t[name].filter((b) => !filled(data, b.path));
    }
    return out;
  }

  /** { filled, total } over every counted key box. A plain count: never shown as a percent or a grade. */
  function keyBoxCount(data) {
    const t = keyBoxes(data);
    let total = 0, n = 0;
    for (const name of TAB_ORDER) {
      if (name === 'fundraising' && !countsFundraising(data)) continue;
      total += t[name].length;
      n += t[name].filter((b) => filled(data, b.path)).length;
    }
    return { filled: n, total };
  }

  /* Kept for the existing code: the paths of the 2023a key boxes, by tab. */
  const PATHS = {
    proposal: KEY_BOXES['2023a'].proposal.map((b) => b.path),
    plan: KEY_BOXES['2023a'].plan.map((b) => b.path),
    report: KEY_BOXES['2023a'].report.map((b) => b.path)
  };
```

2. `filled` is defined **below** this block today. Move the two lines `const getPath = ...` and `const filled = ...` so they sit **above** `const KEY_BOXES`. (Functions above only call `filled` when they run, but keep it tidy and safe.)
3. Change the last line `return { journeySteps, hasNotes, clean, REMINDER, CHECK_IDS, PATHS };` to:
   `return { journeySteps, hasNotes, clean, REMINDER, CHECK_IDS, PATHS, KEY_BOXES, TAB_ORDER, editionOf, keyBoxes, emptyKeyBoxes, keyBoxCount };`

### 0.3 Code (`lib/guided-workbook.js`)

In `STAGES`, replace the two typed lists with the table:
- `paths: ['candidate.name', 'candidate.email', 'unit.number', 'contacts.beneficiary.name', 'contacts.beneficiaryRep.name']` → `paths: KEY_PATHS.setup`
- `paths: ['fundraising.description', 'fundraising.beginDate', 'fundraising.howMuch']` → `paths: KEY_PATHS.fundraising`

and replace the line `const KEY = (window.EagleJourney && window.EagleJourney.PATHS) || { proposal: [], plan: [], report: [] };` with:

```js
  // The same key boxes everything else counts (lib/journey.js), by tab.
  const KEY_TABLE = (window.EagleJourney && window.EagleJourney.keyBoxes(D)) || {};
  const KEY_PATHS = Object.fromEntries(['setup', 'proposal', 'plan', 'fundraising', 'report'].map((k) => [k, (KEY_TABLE[k] || []).map((b) => b.path)]));
  const KEY = KEY_PATHS;
```

(`KEY.proposal`, `KEY.plan`, `KEY.report` keep working.) This reads `D` once when the page loads, which is fine while only 2023a exists. Leave it; the 2026 work will recompute these per render.

### 0.4 Done when

- `node --check lib/journey.js` and `node --check lib/guided-workbook.js` print nothing.
- Both test scripts: 0 failed. The existing browser test "Your path and the Guided stage cards count the same boxes" still passes.
- Commit: `refactor(path): One table of key boxes, looked up by edition`. No review panel needed (no visible change).

---

## Task A. A "not in a backup file" bar when changing tabs

### What the Scout sees

When the Scout clicks another tab (or Previous/Next) and something isn't in a backup file, a slim bar appears **between the tab bar and the page content**:

- With a known count: `3 changes not in a backup file.` (singular: `1 change not in a backup file.`)
- Never backed up, draft saved: `Your work isn’t in a backup file yet.`
- Count unknown (`changeCount()` is `null` and `savedAt() > backupAt()`): `You have changes that aren’t in a backup file.`
- Followed by two buttons: `Save backup file` and `Not now`.

Rules:
- Show only on a tab change, never on the first page load and never while typing.
- Don't show when `store.state === 'conflict'`, when `store.savedAt() === 0` (nothing typed yet), or when the count is 0.
- `Not now` hides it for 10 minutes (a variable in memory, not saved anywhere). Changing tabs again in those 10 minutes shows nothing.
- `Save backup file` calls the same save as the top button, then hides the bar.
- Not printed (add `.backup-nudge` to the print hide list).
- `role="status"` on the bar so it is announced once when it appears.

### A.1 Tests first (`tests/browser-e2e.cjs`, inside the per-workbook loop)

```js
      await test('changing tabs offers to save a backup file when there are changes', async () => {
        const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
        await open(file, ready);
        await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(draft))}); localStorage.setItem(${JSON.stringify(key + '_saved')}, String(Date.now())); true`);
        await open(file, ready);
        assert.equal(await evaluate('!!document.querySelector(".backup-nudge")'), false, 'not on first load');
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('!!document.querySelector(".backup-nudge")', 5000);
        assert.equal(await evaluate('document.querySelector(".backup-nudge").textContent'), 'Your work isn’t in a backup file yet.Save backup fileNot now');
        assert.equal(await evaluate('document.querySelector(".backup-nudge").getAttribute("role")'), 'status');
        // Not now: hidden, and stays hidden on the next tab change.
        await evaluate('[...document.querySelectorAll(".backup-nudge button")].find((b) => b.textContent === "Not now").click()');
        await waitFor('!document.querySelector(".backup-nudge")', 5000);
        await evaluate('document.querySelectorAll("nav button")[2].click()');
        await sleep(300);
        assert.equal(await evaluate('!!document.querySelector(".backup-nudge")'), false, 'Not now holds');
      });
      await test('the save bar shows the change count, and saving removes it', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        await evaluate(`(() => { const i = document.getElementById("f-candidate-name"); i.value = "Alex"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await evaluate('document.querySelector(".btn-control.save").click()');
        await waitFor('/backup file is up to date/.test(document.querySelector(".save-status").textContent)', 5000);
        await evaluate(`(() => { const i = document.getElementById("f-candidate-name"); i.value = "Alexander"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await sleep(600);
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('!!document.querySelector(".backup-nudge")', 5000);
        assert.match(await evaluate('document.querySelector(".backup-nudge").textContent'), /^1 change not in a backup file\./);
        await evaluate('[...document.querySelectorAll(".backup-nudge button")].find((b) => b.textContent === "Save backup file").click()');
        await waitFor('!document.querySelector(".backup-nudge")', 5000);
        await evaluate('document.querySelectorAll("nav button")[2].click()');
        await sleep(300);
        assert.equal(await evaluate('!!document.querySelector(".backup-nudge")'), false, 'nothing to save: no bar');
      });
```

Notes for the implementer: `f-candidate-name` exists on tab 0 in both workbooks. Saving in a headless browser downloads a file; that is fine.

### A.2 Code

1. **`lib/workbook-common.js`**, add near `saveIndicator`:

```js
  /** The slim "not in a backup file" bar shown after a tab change. Returns null when there is nothing to say. */
  function backupNudge({ store, onSave, onDismiss }) {
    if (store.state === 'conflict' || !store.savedAt()) return null;
    const n = store.changeCount();
    let text;
    if (!store.backupAt()) text = 'Your work isn’t in a backup file yet.';
    else if (n === null) { if (store.savedAt() <= store.backupAt()) return null; text = 'You have changes that aren’t in a backup file.'; }
    else if (n === 0) return null;
    else text = `${n} change${n === 1 ? '' : 's'} not in a backup file.`;
    const bar = h('div', { className: 'backup-nudge', role: 'status' }, text,
      h('button', { type: 'button', className: 'btn-control', onClick: () => { onSave(); bar.remove(); } }, 'Save backup file'),
      h('button', { type: 'button', className: 'btn-control quiet', onClick: () => { onDismiss(); bar.remove(); } }, 'Not now'));
    return bar;
  }
```

   The apostrophes in these strings are the curly `’` (U+2019), the same as in the test. Copy them exactly. Then export it: add `backupNudge,` to the `window.EagleWorkbook = { ... }` object.

2. **Both page scripts**:
   - Add near the other `let` variables at the top: `let lastTab = null; let nudgeSnoozedUntil = 0;`
   - In `render()`, right before `app.replaceChildren(...)`, add:
     ```js
     const tabChanged = lastTab !== null && lastTab !== tab;
     lastTab = tab;
     const nudge = tabChanged && Date.now() >= nudgeSnoozedUntil
       ? W.backupNudge({ store, onSave: () => W.saveBackup(D, store), onDismiss: () => { nudgeSnoozedUntil = Date.now() + 10 * 60 * 1000; } })
       : null;
     ```
   - Change `app.replaceChildren(header, W.controls({ ... top: true, fillReady }), nav, main);` so `nudge` comes right after `nav`: `..., nav, nudge, main);`. `replaceChildren` does not accept `null`, so use `...[nudge].filter(Boolean)` in that position.
   - `render()` is also called after opening a backup file and after erasing; those don't change `tab` unless erase sets `tab = 0`. After erase, `store.savedAt()` is 0, so the bar won't show. That is intended.

3. **CSS**, both HTML files, insert before the line that starts `@media print{input::placeholder`:
   ```css
   .backup-nudge{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0;padding:8px 12px;border-left:4px solid #e0a500;background:#fff8df;border-radius:6px;font-size:.95em}
   ```
   and add `.backup-nudge` to the existing print hide list (the rule that already contains `.ask-help,.journey,.scoutly-win,.scoutly-pill{display:none!important}`).

### A.3 Done when

Both test scripts pass. Add a 390px check to the first Task A test, right after the bar appears, copied from the existing test 'the Scoutly window fits a phone screen and its buttons are easy to tap':
```js
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 760, deviceScaleFactor: 2, mobile: true });
        try { assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'no sideways scrolling at 390px'); }
        finally { await send('Emulation.clearDeviceMetricsOverride'); }
``` Commit after the review panel for A+B+C (see bottom).

---

## Task B. Dots on tabs with empty key boxes, and a "Not filled in yet" list

### What the Scout sees

- On tabs Set Up, Proposal, Plan, Fundraising (only when raising money), and Report: if any key box on that tab is empty, the tab label gets a small dot after it: `<span class="tab-dot" aria-hidden="true">•</span>`, plus a hidden text for screen readers: `<span class="sr-only"> (some boxes not filled in yet)</span>`. No dot on Signed Pages or Review.
- At the top of those tabs' content (after the stage card in Guided, at the top in Classic), when something is empty:
  `Not filled in yet: Project description · Why the beneficiary needs it` where each name is a link-styled button. Clicking it focuses the input with id `f-<path>` and scrolls it into view.
  - More than 5 empty: show the first 5, then ` · and 3 more` (plain text).
  - Nothing empty: show nothing (no "all done" message).
- The list updates when the Scout types (re-check on `input` events within `main`), without re-rendering the page.

### B.1 Tests first

Unit (`tests/run-tests.cjs`), add to the "Key boxes" block: nothing new; Task 0 covers the data. Browser (`tests/browser-e2e.cjs`, per-workbook loop):

```js
      await test('tabs with empty key boxes have a dot, and the list jumps to the box', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        const dots = () => evaluate('[...document.querySelectorAll("nav button")].map((b) => !!b.querySelector(".tab-dot"))');
        assert.deepEqual(await dots(), [true, true, true, false, true, false], 'fundraising and signed pages have no dot');
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('!!document.querySelector(".empty-boxes")', 5000);
        assert.match(await evaluate('document.querySelector(".empty-boxes").textContent'), /^Not filled in yet: Project name · Project description · Why the beneficiary needs it · How many helpers · Materials · and 1 more$/);
        await evaluate('[...document.querySelectorAll(".empty-boxes button")].find((b) => b.textContent === "Project description").click()');
        assert.equal(await evaluate('document.activeElement.id'), 'f-proposal-description');
        await evaluate(`(() => { const i = document.getElementById("f-proposal-description"); i.value = "A bench"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await waitFor('!/Project description/.test(document.querySelector(".empty-boxes").textContent)', 5000);
        assert.match(await evaluate('document.querySelectorAll("nav button")[1].textContent'), /some boxes not filled in yet/, 'screen readers hear it');
        // Fill in every Proposal key box: its dot and the list go away without a page redraw.
        for (const [id, v] of [['f-proposal-projectName', 'Bench'], ['f-proposal-whyNeeded', 'No seats'], ['f-proposal-helperCount', '8'], ['f-proposal-materials', 'Lumber'], ['f-proposal-safety', 'Gloves']]) {
          await evaluate(`(() => { const i = document.getElementById(${JSON.stringify(id)}); i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        }
        await waitFor('!document.querySelectorAll("nav button")[1].querySelector(".tab-dot")', 5000);
        assert.equal(await evaluate('!!document.querySelector(".empty-boxes")'), false);
      });
      await test('a tab with every key box filled in has no dot and no list', async () => {
        const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
        await open(file, ready);
        await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(draft))}); true`);
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await sleep(300);
        assert.equal(await evaluate('!!document.querySelector("nav button.active .tab-dot")'), false);
        assert.equal(await evaluate('!!document.querySelector(".empty-boxes")'), false);
      });
```

The sample fixture fills in every key box (checked when this plan was written), so the second test can use the Proposal tab.

### B.2 Code

1. **`lib/workbook-common.js`**: add

```js
  /** "Not filled in yet: A · B · and 3 more". tabName is a key of EagleJourney.KEY_BOXES (setup, proposal, ...).
      Returns an element that keeps itself up to date as the Scout types; it is empty when nothing is missing. */
  function emptyBoxesList({ data, tabName }) {
    const J = window.EagleJourney;
    const box = h('p', { className: 'empty-boxes' });
    const draw = () => {
      const empty = J ? (J.emptyKeyBoxes(data())[tabName] || []) : [];
      box.textContent = '';
      box.hidden = empty.length === 0;
      if (!empty.length) return;
      box.append('Not filled in yet: ');
      empty.slice(0, 5).forEach((b, i) => {
        if (i) box.append(' · ');
        box.append(h('button', { type: 'button', className: 'link-button', onClick: () => {
          const el = document.getElementById('f-' + b.path.replace(/[^a-zA-Z0-9_-]/g, '-'));
          if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); }
        } }, b.label));
      });
      if (empty.length > 5) box.append(` · and ${empty.length - 5} more`);
    };
    draw();
    box.refresh = draw;
    return box;
  }
```

   Export `emptyBoxesList` in `window.EagleWorkbook`. The `.link-button` class already exists in both pages.
   **Correction to the code above, apply it:** a hidden element is still found by `document.querySelector(".empty-boxes")`, which would break the tests. So in `draw()`, replace the two lines `box.hidden = empty.length === 0;` and `if (!empty.length) return;` with the single line `if (!empty.length) { box.remove(); return; }`. The page code (step 2) only creates the list when something is empty, so it is never created empty.

2. **Both page scripts**, in `render()`:
   - A map from tab index to table name, declared **once at the top of the file, right after `const TABS = [...]`** (not inside `render()`; Task E needs it outside): `const TAB_KEYS = ['setup', 'proposal', 'plan', 'fundraising', 'report'];` Indexes 5 and up (Signed Pages, Review) have no entry.
   - Tab dots: leave the nav-building code as it is. Right **after** the line that builds `nav` (`const nav = h('nav', ...);`), add this function and call it once:
     ```js
     const refreshDots = () => nav.querySelectorAll('button').forEach((b, i) => {
       b.querySelectorAll('.tab-dot,.visually-hidden').forEach((s) => s.remove());
       const n = TAB_KEYS[i], J = window.EagleJourney;
       if (n && J && (J.emptyKeyBoxes(D)[n] || []).length) b.append(h('span', { className: 'tab-dot', 'aria-hidden': 'true' }, '•'), h('span', { className: 'visually-hidden' }, ' (some boxes not filled in yet)'));
     });
     refreshDots();
     ```
     (Fundraising is absent from `emptyKeyBoxes` unless the Scout is raising money, so it gets no dot automatically. Signed Pages and Review have no `TAB_KEYS` entry, so no dot.)
   - The list: compute `const list = TAB_KEYS[tab] && window.EagleJourney && (window.EagleJourney.emptyKeyBoxes(D)[TAB_KEYS[tab]] || []).length ? W.emptyBoxesList({ data: () => D, tabName: TAB_KEYS[tab] }) : null;` and insert it in `main` (`h()` skips `null`). Final order of the first children of `main` after Tasks B and C: **Guided** `keyCount, stageCard(tab), list, journeyCard…`; **Classic** `keyCount, list, journeyCard…`.
   - Live update: after `main` is built, add one handler for **both** `input` and `change` (the "Will you raise money" select on Your path saves on `change`, after its `input` event):
     ```js
     const refreshLive = () => { if (list && list.isConnected) list.refresh(); refreshDots(); };
     main.addEventListener('input', refreshLive);
     main.addEventListener('change', refreshLive);
     ```
     Task C adds one more line to `refreshLive`. These listeners are on `main`, which is replaced on every render, so they never pile up.
   - Accepted limitation: once the list has removed itself (every box filled in), it does not come back if the Scout clears a box, until the page redraws (the next tab change). Don't add code for this.
3. **CSS**, both HTML files: `.tab-dot{margin-left:4px;color:#e0a500;font-weight:700}` and `.empty-boxes{margin:0 0 12px;font-size:.95em}`. Both pages **already** have `.visually-hidden` and `.link-button`: use them, don't add new ones (don't add `.sr-only`). Add `.empty-boxes,.tab-dot` to the print hide list.

### B.3 Done when

Both test scripts pass. The tab bar still fits at 390px (it scrolls sideways inside the nav as it does today; the page itself must not scroll sideways).

---

## Task C. One overall count

### What the Scout sees

Directly under the tab bar, on every tab except Signed Pages and Review: `Key boxes filled in: 12 of 20.` A plain sentence. No percent, no bar, no colour change, no "done" state.

### C.1 Tests first

Browser, per-workbook loop:

```js
      await test('the overall key-box count matches the table and updates as the Scout types', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        assert.equal(await evaluate('document.querySelector(".key-count").textContent'), 'Key boxes filled in: 0 of 20.');
        await evaluate(`(() => { const i = document.getElementById("f-candidate-name"); i.value = "Alex"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
        await waitFor('document.querySelector(".key-count").textContent === "Key boxes filled in: 1 of 20."', 5000);
        assert.doesNotMatch(await evaluate('document.querySelector(".key-count").textContent'), /%|ready|complete|score/i);
      });
```

### C.2 Code

- **`lib/workbook-common.js`**: `function keyCount(data) { const J = window.EagleJourney; if (!J) return null; const c = J.keyBoxCount(data); return h('p', { className: 'key-count' }, `Key boxes filled in: ${c.filled} of ${c.total}.`); }`. Export it.
- **Both page scripts**: in `main`, as the very first child (order given in Task B step 2), add `tab <= 4 ? W.keyCount(D) : null`. In `refreshLive` from Task B, also update it: `const kc = main.querySelector('.key-count'); if (kc && window.EagleJourney) { const c = window.EagleJourney.keyBoxCount(D); kc.textContent = `Key boxes filled in: ${c.filled} of ${c.total}.`; }`.
- **CSS**: `.key-count{margin:4px 0 10px;font-size:.9em;color:#46566a}`; add `.key-count` to the print hide list.

### C.3 Done when

Both test scripts pass.

### Review panel for A + B + C, then commit

Run the review panel from `AGENTS.md` with three lenses: **Teen, parent, and accessibility** (wording, 390px, keyboard, screen reader), **Engineering** (render loop, listeners, no duplicate handlers after re-render), **Official-text fidelity** (the 20 key-box labels against the workbook's own box names). Fix BLOCKING and IMPORTANT findings, re-run tests, then commit: `feat(workbook): Save bar on tab change, empty-box dots and list, key-box count`.

---

## Task D. Spell check on long answers only

### D.1 Tests first (browser, per-workbook loop)

```js
      await test('spell check is on for long answers and off for names and contact details', async () => {
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[1].click()');
        await waitFor('!!document.getElementById("f-proposal-description")', 5000);
        assert.equal(await evaluate('document.getElementById("f-proposal-description").getAttribute("spellcheck")'), 'true');
        await evaluate('document.querySelectorAll("nav button")[0].click()');
        await waitFor('!!document.getElementById("f-candidate-name")', 5000);
        for (const id of ['f-candidate-name', 'f-candidate-email', 'f-contacts-beneficiaryRep-name']) {
          assert.equal(await evaluate(`document.getElementById(${JSON.stringify(id)}).getAttribute("spellcheck")`), 'false', id);
        }
      });
```

### D.2 Code

In `lib/workbook-common.js`, inside `createForm` → `field`, where the input is built:
- For `textarea` (`multi: true`): add attribute `spellcheck: 'true'`.
- For single-line inputs: add `spellcheck: 'false'`.

That is the whole change. Commit: `feat(workbook): Spell check long answers only`. No review panel needed.

---

## Task E. A Review tab

### What the Scout sees

A new **last** tab: `7. Review` in Guided, `Review` in Classic. It contains, in this order, each as a section with the heading shown:

1. **Heading `Not filled in yet`**: for each tab in `TAB_ORDER` that has empty key boxes, a line `<Tab label>: A · B · C`, each name a button that switches to that tab and focuses the box. If nothing anywhere: `Every key box has something in it.`
2. **Heading `Heads-ups`**: each note from `window.EaglePreflight.check(D, window.EagleOfficialPdf)` as a list item. If none: `Nothing here looked unusual.`
3. **Heading `Short answers in big boxes`**: for each entry in `SHORT_ANSWER_BOXES` (below) whose answer has at least 1 and fewer than 8 words: `<label>: this answer is short for its box. Your coach may ask for more detail.` with the label as a jump button. If none: section not shown.
4. **Heading `Your backup file`**: the same text as the header note (`no backup file yet`, `3 changes not in a backup file`, `backup file is up to date`, `no backup file to compare`), as a sentence, plus a `Save backup file` button.
5. **Heading `Next on your path`**: `EagleJourney.journeySteps(D, window.EagleAttachments, tabs).next.next`, or `Every step on your path is ticked or filled in.`
6. Buttons: `Print a draft` and a link `Fill the official PDF →`.
7. A closing line: `This is not an approval check. Your Scoutmaster, beneficiary, and council decide. The Fill page also checks whether long answers fit their boxes.`

`SHORT_ANSWER_BOXES` for 2023a, in `lib/journey.js`, exported, keyed by edition like `KEY_BOXES`:

```js
  const SHORT_ANSWER_BOXES = {
    '2023a': [
      { tab: 'proposal', path: 'proposal.description', label: 'Project description' },
      { tab: 'proposal', path: 'proposal.whyNeeded', label: 'Why the beneficiary needs it' },
      { tab: 'proposal', path: 'proposal.leadershipChallenges', label: 'What could be hard about leading' },
      { tab: 'plan', path: 'plan.presentCondition', label: 'Present condition' },
      { tab: 'plan', path: 'plan.workProcesses', label: 'Work processes' },
      { tab: 'report', path: 'report.description', label: 'Project description and impact' },
      { tab: 'report', path: 'report.planning', label: 'Completing the planning' },
      { tab: 'report', path: 'report.wentWell', label: 'What went well' },
      { tab: 'report', path: 'report.challenging', label: 'What was challenging' },
      { tab: 'report', path: 'report.leadership', label: 'How you led' }
    ]
  };
  const SHORT_WORDS = 8;
  /** Boxes with an answer of 1..SHORT_WORDS-1 words. Empty boxes are not listed here (they are in "Not filled in yet"). */
  function shortAnswers(data) {
    const list = SHORT_ANSWER_BOXES[editionOf(data)] || SHORT_ANSWER_BOXES['2023a'];
    return list.filter((b) => { const words = String(getPath(data, b.path) || '').trim().split(/\s+/).filter(Boolean).length; return words > 0 && words < SHORT_WORDS; });
  }
```

### E.1 Tests first

Unit (`tests/run-tests.cjs`, "Key boxes" block):

```js
    await test('short answers: 1 to 7 words are listed, empty and longer ones are not', () => {
      const d = W.defaults();
      assert.deepEqual(J.shortAnswers(d), []);
      d.proposal.description = 'A bench';
      d.proposal.whyNeeded = 'The school has nowhere for students to sit outside during lunch or recess';
      assert.deepEqual(J.shortAnswers(d).map((b) => b.path), ['proposal.description']);
      for (const b of J.SHORT_ANSWER_BOXES['2023a']) {
        const v = b.path.split('.').reduce((o, k) => (o ? o[k] : undefined), W.defaults());
        assert.equal(typeof v, 'string', b.path);
      }
    });
```

Browser (per-workbook loop):

```js
      await test('the Review tab gathers what is left, with jump links and plain words', async () => {
        await open(file, ready);
        await evaluate('localStorage.clear()');
        await open(file, ready);
        const last = 'document.querySelectorAll("nav button")[document.querySelectorAll("nav button").length - 1]';
        assert.match(await evaluate(`${last}.textContent`), /Review/);
        await evaluate(`${last}.click()`);
        await waitFor('!!document.querySelector(".review")', 5000);
        const text = await evaluate('document.querySelector(".review").textContent');
        assert.match(text, /Not filled in yet/);
        assert.match(text, /Project description/);
        assert.match(text, /Nothing here looked unusual\./);
        assert.match(text, /Your backup file: no backup file yet\./);
        assert.match(text, /This is not an approval check\./);
        assert.doesNotMatch(text, /\b(required|must|missing|ready|approved|score)\b|%/i);
        await evaluate('[...document.querySelectorAll(".review button")].find((b) => b.textContent === "Project description").click()');
        await waitFor('document.activeElement && document.activeElement.id === "f-proposal-description"', 5000);
      });
      await test('the Review tab shows heads-ups and short answers', async () => {
        const draft = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
        draft.proposal.startDate = '2026-10-01'; draft.proposal.endDate = '2026-03-31';
        draft.proposal.description = 'A bench';
        await open(file, ready);
        await evaluate(`localStorage.clear(); localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(draft))}); true`);
        await open(file, ready);
        await evaluate('document.querySelectorAll("nav button")[document.querySelectorAll("nav button").length - 1].click()');
        await waitFor('!!document.querySelector(".review")', 5000);
        const text = await evaluate('document.querySelector(".review").textContent');
        assert.match(text, /the end date \(3\/31\/2026\) is before the start date \(10\/1\/2026\)/);
        assert.match(text, /Project description: this answer is short for its box\. Your coach may ask for more detail\./);
      });
```

Also update the **existing** tests that encode "six tabs" on purpose (say why in the commit):
- `tests/run-tests.cjs`, test `copies: pages and docs agree on how many stages and steps there are`: change `6` to `7`, the message to `'the Guided workbook has seven tabs'`, and `/Six stages/` to `/Seven stages/`.
- `index.html` and `README.md`: `Six stages with plain-language` → `Seven stages with plain-language`. `AGENTS.md` layout table: `six stages (the last is Signed Pages & Photos)` → `seven stages (Signed Pages & Photos, then Review)`.
- Browser tests: none uses "the last tab" to mean Signed Pages (they use index 5, which stays Signed Pages). The `length - 1` matches in `tests/browser-e2e.cjs` are unrelated. So no existing browser test needs editing, **except** the Task B dot test: change its expected array to `[true, true, true, false, true, false, false]` (seven tabs, Review has no dot).

### E.2 Code

1. **`lib/journey.js`**: add `SHORT_ANSWER_BOXES`, `SHORT_WORDS`, `shortAnswers` (above), export `SHORT_ANSWER_BOXES, shortAnswers`.
2. **Load `preflight.js` on the workbook pages**: in both HTML files, add `<script src="lib/preflight.js"></script>` right **after** `<script src="lib/official-pdf.js"></script>`. Update the script-order test in `tests/run-tests.cjs` (`copies: each page loads its scripts in the order they need`): add the pair `['lib/official-pdf.js', 'lib/preflight.js']` for both workbook pages. Update the load-order paragraph in `AGENTS.md`.
3. **`lib/workbook-common.js`**:
   - First, move the four backup cases out of `saveIndicator` into a shared function and use it in both places:
     ```js
     /** 'no backup file yet', '3 changes not in a backup file', 'backup file is up to date', or 'no backup file to compare'. */
     function backupNoteText(store) {
       if (!store.backupAt()) return 'no backup file yet';
       const n = store.changeCount();
       if (n === null) return 'no backup file to compare';
       return n === 0 ? 'backup file is up to date' : `${n} change${n === 1 ? '' : 's'} not in a backup file`;
     }
     ```
     In `saveIndicator`, replace the body of `backupNote` with `return ' · ' + backupNoteText(store);`. The header text must not change (existing tests check it).
   - Then add `function reviewSection({ data, store, tabs, tabLabels, goToBox, onSave, onPrint })`, where the page passes **exactly**: `tabs: { proposal: TABS[1], plan: TABS[2], report: TABS[4], signed: TABS[5] }` (used for `journeySteps`), `tabLabels: Object.fromEntries(TAB_KEYS.map((k, i) => [k, TABS[i]]))`, `goToBox` (step 4), `onSave: () => W.saveBackup(D, store)`, `onPrint: () => printDraft()`.
   - Build the seven parts above with `h()`. Wrap everything in `h('section', { className: 'review' }, ...)`. Headings: `h('h3', { className: 'sec-title' }, 'Not filled in yet')` and so on.
   - Part 2: `const notes = window.EaglePreflight ? window.EaglePreflight.check(data(), window.EagleOfficialPdf) : [];`
   - Part 4 sentence: `` `Your backup file: ${backupNoteText(store)}.` `` then the `Save backup file` button.
   - Part 5: `const r = window.EagleJourney ? window.EagleJourney.journeySteps(data(), window.EagleAttachments, tabs) : null;` then the text `r && r.next ? r.next.next : 'Every step on your path is ticked or filled in.'`.
   - Export `reviewSection` and `backupNoteText`.
4. **Both page scripts**:
   - Add the tab: Guided `TABS` gets `'7. Review'` at the end; Classic gets `'Review'`.
   - Add a renderer and put it last in `RENDERERS`: `function renderReview() { return W.reviewSection({ data: () => D, store, tabs: { proposal: TABS[1], plan: TABS[2], report: TABS[4], signed: TABS[5] }, tabLabels: Object.fromEntries(TAB_KEYS.map((k, i) => [k, TABS[i]])), goToBox, onSave: () => W.saveBackup(D, store), onPrint: () => printDraft() }); }`
   - Add `const SIGNED_TAB = 5;` next to `TABS`, and replace `TABS.length - 1` with `SIGNED_TAB` in exactly these places (they mean Signed Pages):
     - Guided, in `refreshSummary`: `const tabButton = document.querySelectorAll('nav button')[TABS.length - 1];`
     - Guided, near the end of the file: the line starting `if (window.EagleAttachments) window.EagleAttachments.ready().then(() => { if (tab === TABS.length - 1`
     - Classic, near the end of the file: the same `ready().then(... tab === TABS.length - 1` line.
     The `last` variable inside `render()` (`const last = tab === TABS.length - 1;`, for the "Next: fill the official PDF →" button) stays as it is: it now means Review, which is right.
   - Guided `STAGES` gets a 7th entry for the stage card: `{ title: 'Review', next: 'Look over what is left, then fill the official PDF.', paths: [], summary: () => '' }`. In `stageCard`, in the `if (s.summary)` branch, leave out the `h('div', { className: 'stage-meta' }, ...)` part when `s.summary()` returns `''` (build it conditionally; `h()` skips `null`). The nav button `title` already uses `STAGES[i].summary ? STAGES[i].summary() : ...`, which gives `''` for Review: fine.
   - `goToBox` (at module level, after `go` is defined). `go()` already calls `render()` and then `window.scrollTo(0, 0)`, so scroll and focus **after** `go()` returns:
     ```js
     const goToBox = (name, path) => {
       go(TAB_KEYS.indexOf(name));
       const el = document.getElementById('f-' + path.replace(/[^a-zA-Z0-9_-]/g, '-'));
       if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); }
     };
     ```
     Don't add a `focusAfterId` variable.
   - Print draft: the `sections` list in `printDraft()` is unchanged (Review is not printed).
5. **CSS**, both HTML files: `.review section{margin:0 0 16px}` and add `.review` to the print hide list.

### E.3 Done when

Both test scripts pass. Add the same 390px check as in Task A to the first Review test, after the Review tab is shown.

### Review panel for E, then commit

Lenses: **Teen and accessibility**, **Engineering**, **Official-text fidelity** (labels, and that nothing reads as a rule). Commit: `feat(workbook): Add a Review tab`. Then update `todo/README.md` to mark this file done.

---

## Common mistakes to avoid (from this project's history)

- Writing the code before the test, or a test that can't fail. Run each new test once **before** the code and see it fail.
- Changing only one of the two workbooks.
- Re-adding an event listener on every `render()` to `document` or `window` (it piles up). Put listeners on elements inside `main`, which is replaced each render.
- Using `TABS.length - 1` to mean Signed Pages after adding the Review tab.
- Different apostrophes in code and test (`'` vs `’`).
- Forgetting to add new classes to the print hide list.
- Running two shell commands that depend on each other at the same time.
- Words that sound like rules or verdicts (list at the top).
