/*
 * EaglePaperworkHelper: plain-language "In short" lines for the long official prompts of the 2026 workbook.
 * Used only by the Guided 2026 page. Pure: runs in a browser (window.EagleW26Plain) and in Node tests.
 *
 * What this is, and is not:
 *  - The official question is never replaced. The page shows an "In short" line, then every sentence of the official
 *    prompt that is not a question and is not listed in HIDDEN, copied word for word (read from the official text at
 *    run time, so nothing is retyped), then the full official question behind "Show the full official question".
 *  - Showing is the default. A statement is hidden only if HIDDEN says so, with a reason: 'carried' (the In short line
 *    already says it), 'example' (an illustration), or 'rationale' (why, not what). Forgetting a sentence shows it.
 *    A sentence with a rule word (RULE_WORDS) is never hidden. Tests check every HIDDEN entry matches one real sentence.
 *  - An "In short" line says what to write. It adds no rule and no subject the official prompt does not raise.
 *    Review each line against the PDF by eye; the tests are a smoke alarm only.
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
    'proposal.beneficiaryImpact': 'Name your beneficiary, say how it is part of the community, and explain its mission and what it does. Then say how your project furthers its mission or helps the people it serves. Add details about how its programs and services are used, or approximately how many people your efforts will affect.',
    'proposal.description': 'Say what you will do, where, and the size or scope of the project, plus other details that help the beneficiary and Scouting America reviewers understand it. Attach images on a separate page if appropriate.',
    'proposal.leadership': 'Say how you will show leadership: how many people you expect to need, who you will recruit and how you will get the right number (neither too few nor too many), what types of people you will lead, and how you will organize, train, and delegate to them.',
    'proposal.resources': 'List the materials, supplies, tools, and other needs. For now, a basic description or dimensions is enough. You will develop a detailed list and exact quantities during the planning stage of your project.',
    'proposal.fundraising': 'Say how you will raise the money to pay for the project. If you intend to seek “in-kind” donations of materials, services, supplies, tools, or other items, say how. Consult the Fundraising Application (Appendix D). Ask your Scoutmaster for local council fundraising procedures.',
    'proposal.safety': 'Say how you will recruit the registered adults responsible for safety and give them advance warning, what risks you foresee and how you will mitigate them, and who you will work with on contingency plans. Then say what permissions you will need, and what permits, who will get them, and when they will be requested.',
    'plan.reviewComments': 'Write the comments and advice you got from your beneficiary, Scoutmaster, troop committee, and council or district Eagle representative when they reviewed your proposal, how their comments affected your thinking about the project, and any significant changes you made.',
    'plan.presentCondition': 'Describe the project site as it is now. If your project is an event or activity rather than a construction project, describe factors at the site that may present challenges. Provide “before” photos, sketches, and a description as applicable, on a separate page and not inside the workbook.',
    'plan.organizing': 'Say how you will organize the tasks so your helpers work efficiently, what groups, patrols, or teams you need, how that changes as the work goes on, and who you will delegate your authority to.',
    'plan.safetyAdults': 'Say what unit adults told you about how the registered adults will be identified for your project, and what you talked about with them for handling an emergency.',
    'plan.permits': 'If your project needs permissions or permits, say who obtained them and when they were issued. If you are waiting for one, say who is getting it and when it will be received. Attach copies of any permits to your workbook.',
    'appendixD.donors': 'Say who you will ask for money, supplies, or tools, and how you will ask them.'
  };

  /* A sentence with one of these words is never hidden: a rule, an exception, or an instruction to be careful. */
  const RULE_WORDS = /\bmust\b|\bDO NOT\b|\bdo not need\b|\bmay not\b|\bbe sure\b|\bresponsible for\b|\brequire\b|\brefer to\b|\bis not a\b/i;

  /* Statements the page does not repeat under "The workbook says:", by box. `starts` is how the sentence begins in the
     official prompt; `why` is 'carried' (the In short line says it), 'example', or 'rationale'. */
  const HIDDEN = {
    'proposal.beneficiaryImpact': [
      { starts: 'Explain the mission and function', why: 'carried' },
      { starts: 'Tell how your project will further', why: 'carried' },
      { starts: 'Share details about how your beneficiary', why: 'carried' }
    ],
    'proposal.description': [
      { starts: 'Describe your project', why: 'carried' },
      { starts: 'Attach images on a separate page', why: 'carried' }
    ],
    'proposal.resources': [
      { starts: 'This task is similar to crafting a shopping list', why: 'example' },
      { starts: 'You probably won’t have the exact number', why: 'rationale' },
      { starts: 'That’s okay.', why: 'rationale' },
      { starts: 'You will develop a detailed list and exact quantities', why: 'carried' },
      { starts: 'For now, a list of materials', why: 'carried' }
    ],
    'proposal.fundraising': [
      { starts: 'If you intend to seek', why: 'carried' },
      { starts: 'Consult the Fundraising Application', why: 'carried' },
      { starts: 'Ask your Scoutmaster for local council fundraising procedures.', why: 'carried' }
    ],
    'proposal.safety': [
      { starts: 'This helps prevent injuries', why: 'rationale' }
    ],
    'plan.presentCondition': [
      { starts: 'Describe the present state of the project site.', why: 'carried' },
      { starts: 'If your project is an event or activity', why: 'carried' },
      { starts: 'Provide “before” photos', why: 'carried' }
    ],
    'plan.permits': [
      { starts: 'If your project needs permissions or permits', why: 'carried' },
      { starts: 'This might include permission to access', why: 'example' },
      { starts: 'If you are waiting for a permit or permission', why: 'carried' },
      { starts: 'Attach copies of any permits', why: 'carried' }
    ]
  };

  /** The sentences of an official prompt, in order. */
  const sentences = (text) => String(text || '').split(/(?<=[.?!])\s+/).filter(Boolean);
  /** Is this sentence a question? Questions are not shown as "the workbook says": the In short line carries them. */
  const isQuestion = (s) => /\?$/.test(s.trim());

  /** The statements (not questions) of an official prompt that the page shows word for word under the In short line. */
  function shownStatements(path, text) {
    const hidden = HIDDEN[path] || [];
    return sentences(text).filter((s) => !isQuestion(s) && (RULE_WORDS.test(s) || !hidden.some((h) => s.startsWith(h.starts))));
  }

  /** Does this official prompt need an "In short" line? */
  const needsPlain = (text) => String(text || '').length >= MIN_LENGTH;

  /**
   * What the Guided page shows for a box, or null when the box is shown as printed.
   * official: the printed prompt. Returns { short, rules, full }.
   */
  function plainFor(path, official) {
    if (!Object.prototype.hasOwnProperty.call(PLAIN, path) || !official) return null;
    return { short: PLAIN[path], rules: shownStatements(path, official), full: official };
  }

  return { PLAIN, HIDDEN, MIN_LENGTH, RULE_WORDS, sentences, isQuestion, shownStatements, needsPlain, plainFor };
});
