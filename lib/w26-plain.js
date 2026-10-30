/*
 * EaglePaperworkHelper: plain-language "In short" lines for the long official prompts of the 2026 workbook.
 * Used only by the Guided 2026 page. Pure: runs in a browser (window.EagleW26Plain) and in Node tests.
 *
 * What this is, and is not:
 *  - The official question is never replaced. The page shows an "In short" line, then every sentence of the
 *    official prompt that says "must" or "DO NOT", copied word for word (mustSentences reads them from the official
 *    text at run time, so nothing is retyped), then the full official question behind "Show the full official question".
 *  - An "In short" line says what to write. It adds no rule and no subject the official prompt does not raise.
 *    Tests check that (lib/w26-plain.js against lib/w26-model.js OFFICIAL, which tests check against the PDF).
 *  - Prompts of 250 characters or more need an entry; shorter ones are already short and are shown as printed.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EagleW26Plain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** Prompts at least this long get an "In short" line. */
  const MIN_LENGTH = 250;

  const PLAIN = {
    'proposal.beneficiaryImpact': 'Name your beneficiary and what it does. Then say how your project helps it, and about how many people it will reach.',
    'proposal.description': 'Say what you will do, where, and how big the project is, plus any other details that help the reviewers understand it.',
    'proposal.leadership': 'Say how you will lead your helpers: how many you expect to need, who you will recruit, and how you will organize, train, and delegate to them.',
    'proposal.resources': 'List the materials, supplies, tools, and other needs. A basic description or size is enough for now. Exact amounts come in your plan.',
    'proposal.fundraising': 'Say how you will raise the money for the project, and how you will ask for donated materials or services. See the Fundraising Application (Appendix D) and ask your Scoutmaster about your council’s procedures.',
    'proposal.safety': 'Plan for safety: how you will recruit the registered adults who are responsible for safety, what risks you see and how you will reduce them, who will help with contingency plans, and what permissions and permits you need.',
    'plan.reviewComments': 'Write the comments and advice you got when people reviewed your proposal, how they changed your thinking, and any significant changes you made.',
    'plan.presentCondition': 'Describe the project site as it is now. For an event, describe anything at the site that could be a challenge. Attach before photos or sketches on a separate page.',
    'plan.organizing': 'Say how you will organize the tasks so your helpers work efficiently, what groups or teams you need, how that changes as the work goes on, and who you will delegate your authority to.',
    'plan.safetyAdults': 'Say which adults in your unit you talked with about safety, what they told you about how the registered adults will be identified, and what you talked about for handling an emergency.',
    'plan.permits': 'List the permissions and permits your project needs, who obtained them, and when. If one is still pending, say who is getting it and when it will be received. Attach copies of any permits.',
    'appendixD.donors': 'List who you expect to ask for donations, and what each will be asked to contribute.'
  };

  /* A sentence of an official prompt that states a rule or an exception: "must", "DO NOT", "do not need", "may not". */
  const RULE_WORDS = /\bmust\b|\bDO NOT\b|\bdo not need\b|\bmay not\b/i;

  /** The rule and exception sentences of an official prompt, exactly as printed. */
  function mustSentences(text) {
    return String(text || '').split(/(?<=[.?!])\s+/).filter((s) => RULE_WORDS.test(s));
  }

  /** Does this official prompt need an "In short" line? */
  const needsPlain = (text) => String(text || '').length >= MIN_LENGTH;

  /**
   * What the Guided page shows for a box, or null when the box is shown as printed.
   * official: the printed prompt. Returns { short, musts, full }.
   */
  function plainFor(path, official) {
    if (!Object.prototype.hasOwnProperty.call(PLAIN, path) || !official) return null;
    return { short: PLAIN[path], musts: mustSentences(official), full: official };
  }

  return { PLAIN, MIN_LENGTH, RULE_WORDS, mustSentences, needsPlain, plainFor };
});
