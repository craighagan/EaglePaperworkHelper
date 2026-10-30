/*
 * EaglePaperworkHelper: the parts that only the Guided 2026 page (EagleWorkbook2026-guided.html) uses.
 * The Classic 2026 page does not load this file. lib/w26-classic.js uses window.EagleW26Guided when it is there.
 *
 * Stage cards: a short "Next:" line and a plain count of key boxes filled in. The counts come from
 * EagleJourney.keyBoxes (the one table the tab dots, the key count, the Review tab and "Your path" also read),
 * so two places that show the same count can never disagree.
 */
(function () {
  'use strict';
  const W = window.EagleWorkbook, J = window.EagleJourney;
  if (!W || !J) return;
  const { h } = W;

  /* One entry per tab of the Guided 2026 page, in tab order. `key` is the EagleJourney tab name (null for tabs
     that have no counted boxes). `next` is a plain-language hint, not a rule. */
  const STAGES = [
    { key: 'setup', title: 'Set up your project', next: 'Read the whole official workbook, then add your information, your unit, and your beneficiary.' },
    { key: 'proposal', title: 'Draft your proposal', next: 'Write enough for your Scoutmaster and beneficiary to understand the project and its benefit.' },
    { key: 'fundraising', title: 'Fundraising, if needed', next: 'Find out your council’s fundraising rules first. Fill this in only if you need a Fundraising Application.', optional: true },
    { key: 'plan', title: 'Build the project plan', next: 'Start after your proposal has all its approvals.' },
    { key: 'report', title: 'Finish the project report', next: 'Complete this after the project work is done.' },
    { key: null, title: 'Add signed pages, photos, and attachments', next: 'As each page is signed, scan or photograph it and add it here. Add project photos, permits, and links too.', summary: 'attachments' },
    { key: null, title: 'Review', next: 'Look over what is left, then fill the official PDF.', summary: 'none' }
  ];

  /** { done, total } for a stage, or null when the stage is not counted for this draft. */
  function counts(i, data) {
    const s = STAGES[i];
    if (!s || !s.key) return null;
    const empty = J.emptyKeyBoxes(data)[s.key];
    if (!empty) return null;   // fundraising when no Fundraising Application is needed
    const total = J.keyBoxes(data)[s.key].length;
    return { done: total - empty.length, total };
  }

  function pillText(i, data) {
    const s = STAGES[i];
    if (s.summary === 'attachments') return W.attachmentsSummary(data);
    if (s.summary === 'none') return '';
    const c = counts(i, data);
    if (c) return `${c.done} of ${c.total} key boxes filled in`;
    return s.optional ? 'Only if you need a Fundraising Application' : '';
  }

  /** The card at the top of a Guided tab. */
  function stageCard(i, data) {
    const s = STAGES[i];
    const text = pillText(i, data);
    const c = counts(i, data);
    const bar = c ? h('div', { className: 'progress', role: 'progressbar', 'aria-label': 'Key boxes filled in', 'aria-valuemin': '0', 'aria-valuemax': String(c.total), 'aria-valuenow': String(c.done) }, h('span', null)) : null;
    if (bar) bar.firstChild.style.width = `${Math.round((c.done / c.total) * 100)}%`;
    return h('section', { className: 'stage-card', 'data-stage': String(i), 'aria-labelledby': 'stage-title' },
      h('h2', { id: 'stage-title' }, s.title),
      h('p', { className: 'next-step' }, `Next: ${s.next}`),
      text || bar ? h('div', { className: 'stage-meta' }, text ? h('span', { className: 'status-pill' }, text) : null, bar) : null);
  }

  /** Update a stage card's count and bar in place (no redraw, so focus and typing are not disturbed). */
  function refreshStage(card, data) {
    if (!card) return;
    const i = Number(card.getAttribute('data-stage'));
    const pill = card.querySelector('.status-pill');
    if (pill) pill.textContent = pillText(i, data);
    const c = counts(i, data);
    const bar = card.querySelector('.progress');
    if (bar && c) {
      bar.setAttribute('aria-valuenow', String(c.done));
      bar.setAttribute('aria-valuemax', String(c.total));
      bar.firstChild.style.width = `${Math.round((c.done / c.total) * 100)}%`;
    }
  }

  window.EagleW26Guided = { STAGES, stageCard, refreshStage, counts, pillText };
})();
