/*
 * EaglePaperworkHelper: "? Tips" for the 2026 workbook pages (EagleWorkbook2026.html and the Guided 2026 page).
 * Tips are guidance, never requirements: every tip is marked advice, and nothing here adds to the official workbook.
 * Keys are the draft paths. `where` is the printed page of the box in the 2026 workbook (No. 512-927); a test checks it
 * against the official data. Examples are made up. Sets window.EagleTips (the same shape as lib/tips.js).
 */
(function () {
  'use strict';
  const tip = (text, good, avoid, where) => ({ text, good, avoid, where, advice: true });
  window.EagleTips = {
    'proposal.projectName': tip(
      'A short title that names the project and the place. Approvers see it on every page.',
      'Bike Repair Stand at Riverside Community Center',
      'A title that is only the beneficiary’s name.',
      'Page 1'),
    'proposal.beneficiaryImpact': tip(
      'Name your beneficiary and what it does. Then say who will use the project and roughly how many people it will reach.',
      'The beneficiary is the community center, which runs youth programs. About 40 families use it each week, and the stand will serve them.',
      'Saying the project helps everyone, with no details.',
      'Page 7'),
    'proposal.description': tip(
      'Say what you will do, where, the size or scope, and other details. Page 11 has room for only about three lines, so start with the sentences that matter most.',
      'We will build one bike repair stand with a tool rack and an air pump. It will go by the front door of the community center and fit on one concrete pad.',
      'Starting with a long list of materials.',
      'Page 7'),
    'proposal.motivation': tip(
      'Why this matters to you, and what you expect to learn.',
      'I ride to school, and I have seen bikes sit broken in the rack for weeks.',
      'A general statement that could describe any project.',
      'Page 7'),
    'proposal.work': tip(
      'The kinds of tasks, and how you will organize the work. Say which tasks you will hand to others.',
      'Build the frame with two helpers, install the tools myself, then test the stand together.',
      'Listing only the finished product.',
      'Page 8'),
    'proposal.leadership': tip(
      'The workbook asks you to lead at least two people besides yourself. Say how you will recruit, organize, and train them.',
      'I will lead three helpers, give each a task, and check the plan with them every Saturday.',
      'Saying your family will do the work.',
      'Page 8'),
    'proposal.resources': tip(
      'The materials, supplies, tools, and other needs. A list with basic descriptions is enough at this stage.',
      'Wood for the frame, bolts, a tool rack, and an air pump. Prices can be estimates.',
      'Leaving the list blank until you have exact quantities.',
      'Page 9'),
    'proposal.safety': tip(
      'The safety issues you can see now, and what you plan to do about them. Your Scoutmaster and coach can help you think of more.',
      'We will ask an adult to run the power saw. Helpers use hand tools and wear eye protection.',
      'Writing “none” before you have thought about tools and the work site.',
      'Page 10'),
    'plan.presentCondition': tip(
      'Describe the site as it is now. Photos and sketches go on separate pages, as the workbook asks.',
      'The bike rack is by the north door: a concrete pad, one shade tree, and a gap next to the path.',
      'Describing the plan instead of the site today.',
      'Page 13'),
    'plan.safetyAdults': tip(
      'Page 4 asks you to talk with your Scoutmaster before you start. Name the adults you talked with about safety, and what they said.',
      'I talked with our Scoutmaster on 3 March, and they will be at the first work day.',
      'Waiting until the work day to ask anyone.',
      'Page 16'),
    'plan.permits': tip(
      'Permissions you need, who will give them, and when. Check with the people who give permission before you start work.',
      'The community center manager gives permission to use the parking lot. The request is in for 15 March.',
      'Starting work before you have all the permits and permissions.',
      'Page 17'),
    'report.observations': tip(
      'Answer the two questions on page 19: what went well, and how you determined that it was successful.',
      'Every bike in the rack was fixed within two weeks, and the tool rack stayed full.',
      'Saying it went well with no evidence.',
      'Page 19'),
    'report.aiUse': tip(
      'Describe any AI or other internet tool you used: what you used, how you used it, and where you used it.',
      'I used a chatbot to list safety risks, then checked each one with my coach.',
      'Leaving this blank if you used any tool.',
      'Page 21')
  };
})();
