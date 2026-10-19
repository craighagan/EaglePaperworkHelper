/*
 * EaglePaperworkHelper: tips shown behind the "?" button next to a box (and next to a few tables).
 * Loaded as an ordinary <script>; exposes window.EagleTips, keyed by the backup-file path of the box.
 *
 * Rules for editing this file (see AGENTS.md):
 *  - Tips are GUIDANCE. They never add or change a Scouting requirement. If something is a coach or council
 *    habit and not in the official workbook, set advice: true so the panel says "Common advice, not a rule."
 *  - Examples are made up and generic. Never use a real Scout's project.
 *  - Paraphrase sources. Sources are listed in docs/guidance-sources.md.
 *  - `where` is the printed page label in the official workbook No. 2023a. A test checks it against the real PDF.
 *  - Keep it short. A test enforces the limits below.
 *
 * Fields: text (what goes here), good (made-up example), avoid (one common mistake), where, advice (boolean),
 *         for (the path to look up `where` for, when the key is a table or section rather than one box).
 */
(function () {
  'use strict';
  const LIMITS = { text: 200, good: 260, avoid: 150, total: 560 };

  const tips = {
    'candidate.pid': {
      text: 'This is your BSA member ID. If you can’t find it, ask your unit leader or advancement coordinator.',
      where: 'Proposal Page B'
    },
    'candidate.borDate': {
      text: 'The date of your Life board of review. Your unit’s advancement records have it, and your unit leader can help.',
      where: 'Proposal Page B'
    },

    'proposal.projectName': {
      text: 'Name the project so a stranger knows what it is and who it helps.',
      good: 'Outdoor Reading Nook at Maple Elementary',
      avoid: 'Just “Eagle Project”, which doesn’t say what you’ll do.',
      where: 'Workbook cover page', advice: true
    },
    'proposal.description': {
      text: 'Say what you will build or improve, where, when, and who it helps. A few plain sentences is enough.',
      good: 'I will lead a team to build four raised garden beds in the Maple Elementary courtyard over two fall Saturdays. Science classes will use them. I will make the plans, order materials, and direct the crews.',
      avoid: 'A title or a goal (“help the school”) with no work described. Photos go in a separate document.',
      where: 'Proposal Page C'
    },
    'proposal.whyNeeded': {
      text: 'Say what the beneficiary has now, what’s missing, and how your project helps. Ask them to tell you in their own words.',
      good: 'The school has no outdoor place for hands-on science, so teachers keep classes inside. The garden gives four classes a place to grow and record plants.',
      avoid: 'Only “it will look nice,” or what you will learn. Focus on how it helps them.',
      where: 'Proposal Page C', advice: true
    },
    'proposal.startDate': {
      text: 'Leave time for approval and planning. Proposal Page A says not to begin work, raise money, or obtain materials until your proposal is approved.',
      avoid: 'Submitting your proposal too close to your 18th birthday. It may not be approved in time to finish planning and the project.',
      where: 'Proposal Page C'
    },
    'proposal.endDate': {
      text: 'All project work must be finished before your 18th birthday, so leave some cushion for weather and delays.',
      where: 'Proposal Page C'
    },
    'proposal.helperCount': {
      text: 'Use the number the work really needs. “Others” means at least two people besides you, of any age that suits the work.',
      good: 'About 8 helpers: 5 youth and 3 adults, including two who know the tools.',
      avoid: 'Picking the smallest number, or a big number you can’t recruit.',
      where: 'Proposal Page D'
    },
    'proposal.helperSource': {
      text: 'Name real groups you’ll ask, and how: your troop, classmates, family, neighbors, the beneficiary’s volunteers.',
      good: 'Troop members, my robotics club, and two parents. I’ll send a sign-up form three weeks ahead.',
      avoid: '“Whoever shows up.”',
      where: 'Proposal Page D', advice: true
    },
    'proposal.leadershipChallenges': {
      text: 'Name one or two real people-problems and what you’ll do about each.',
      good: 'Keeping 10 people busy in a small courtyard. I’ll split them into crews with a leader each and start with a quick demo.',
      avoid: 'Writing about the building work instead of leading people.',
      where: 'Proposal Page D', advice: true
    },
    'proposal.materials': {
      text: 'Materials become part of the finished project (boards, paint). Supplies get used up (sandpaper, gloves). A rough list with basic sizes is enough.',
      good: 'Cedar boards (2x10), screws, soil, gravel.',
      avoid: 'Vague entries like “wood” when you already know the size.',
      where: 'Proposal Page D'
    },
    'proposal.supplies': {
      text: 'Things that get used up: sandpaper, brushes, gloves, trash bags, and water and food for your helpers.',
      avoid: 'Forgetting food and water for the people who help.',
      where: 'Proposal Page D'
    },
    'proposal.permits': {
      text: 'Say what permission you think you need, who will get it, and how long it may take. Not sure? Ask the property owner and your reviewer.',
      good: 'The school office must approve the courtyard dates. The principal will ask the district, and they say it takes about two weeks.',
      avoid: 'Writing “none” without asking. Permits and marking underground utilities are the owner’s job, not yours.',
      where: 'Proposal Page E'
    },
    'proposal.costs': {
      for: 'proposal.costs.materials',
      text: 'A rounded guess is fine. Count the value of donated items and include sales tax. Real prices from a store or website make it believable.',
      avoid: 'A single total with nothing behind it.',
      where: 'Proposal Page F', advice: true
    },
    'proposal.fundraisingPlan': {
      text: 'Say how you’ll pay for the total. Money only from you, relatives, the beneficiary, your unit, its chartered organization, or unit parents needs no application. Other sources may need one.',
      avoid: 'Making fundraising the main event. A project can’t primarily be a fundraiser.',
      where: 'Proposal Page F'
    },
    'proposal.phases': {
      for: 'proposal.phases.0.description',
      text: 'List the big steps in order. The first may be preparing your project plan. One short line each is enough.',
      good: '1. Write the plan and review it with my coach. 2. Confirm dates with the school. 3. Gather materials. 4. Build on two work days. 5. Clean up and write my report.',
      where: 'Proposal Page F'
    },
    'proposal.logistics': {
      text: 'Say how people, materials, and tools will get to the site, and who will drive.',
      good: 'The store delivers lumber to the school. Two parents bring tools in their trucks. Helpers carpool from the troop meeting place.',
      avoid: 'Forgetting heavy items like lumber or soil.',
      where: 'Proposal Page F', advice: true
    },
    'proposal.safety': {
      text: 'Name real hazards (tools, lifting, heat, weather), how you’ll handle each, and what you’ll do if someone is hurt. Check the Guide to Safe Scouting. Adults, including property owners, are responsible.',
      good: 'Cuts and splinters, heavy soil, sun and heat, buried pipes. Gloves for all, age-appropriate tools only, water breaks, utilities marked before we dig, an adult watching the power-tool area.',
      avoid: '“Safety first” with no hazards named.',
      where: 'Proposal Page G'
    },
    'proposal.planning': {
      text: 'List the next steps you’ll take to finish your detailed project plan.',
      good: 'Measure the courtyard, draw a layout, get price quotes, confirm dates with the principal, and build my helper list.',
      avoid: 'Repeating the project description.',
      where: 'Proposal Page G'
    },

    'plan.presentCondition': {
      text: 'Describe the worksite as it is today so a reviewer can picture the “before.” For an event, describe your biggest obstacles.',
      good: 'The courtyard is about 30 by 40 feet of packed dirt with one water spigot. Rain pools near the door.',
      avoid: 'Describing the finished project. Attach “before” photos.',
      where: 'Project Plan Page A'
    },
    'plan.workProcesses': {
      text: 'Write the steps in the order helpers will do them, as if teaching someone new. Include setup and cleanup.',
      good: '1. Mark the bed layout with string. 2. Cut boards. 3. Assemble frames. 4. Move frames into place. 5. Fill with soil. 6. Clean up.',
      avoid: 'One line for the whole build.',
      where: 'Project Plan Page B', advice: true
    },
    'plan.permits': {
      text: 'Say what has been requested, from whom, and when it should be issued.',
      avoid: 'Waiting until the work week to ask. Approvals can take weeks.',
      where: 'Project Plan Page B', advice: true
    },
    'plan.materials': {
      for: 'plan.materials.0.item',
      text: 'List each item with where you’ll get it and its price. Show donated items at their value. Leave Total $ blank to use Qty × Unit $.',
      avoid: 'Leaving “Source” blank.',
      where: 'Project Plan Page C'
    },
    'plan.toBeRaised': {
      text: 'The money your fundraising still has to bring in. If the beneficiary pays part of the cost, put that in the next box. Not sure? Ask your coach.',
      avoid: 'Mixing up the total cost and the money still to be raised.',
      where: 'Project Plan Page D', advice: true
    },
    'plan.helpers': {
      for: 'plan.helpers.0.job',
      text: 'One row per job: what it is, the skill it needs, adult or youth, how many you need, and how many you have so far.',
      good: 'Painters · no skill needed · youth · 4 needed · 2 so far',
      avoid: 'One row called “helpers” for everything.',
      where: 'Project Plan Page D'
    },
    'plan.briefingPlan': {
      text: 'Say how helpers will learn what to do before they start.',
      good: 'A 10-minute demo at the start, a one-page job sheet, and a crew leader for each group.',
      where: 'Project Plan Page D', advice: true
    },
    'plan.communicationPlan': {
      text: 'How helpers will learn the date, start time, address, parking, and what to bring, and how you will remind them. Include a way for helpers to reach you.',
      good: 'An info email after they sign up, a reminder a few days before, and a day-before message. Each lists address, parking spot, start time, clothes, and water. Ask your unit leader about your unit’s rules for messaging youth.',
      avoid: 'Sending only the date. Helpers also need place, parking, and start time.',
      where: 'Project Plan Page D', advice: true
    },
    'plan.workerTransport': {
      text: 'Say how helpers get to and from the site: family rides, carpool, or meeting at the site. Name the parking spot. If you arrange rides, check the Guide to Safe Scouting travel rules first.',
      good: 'Most helpers arrive with their families and park in the school’s east lot. Two troop parents offer rides to four Scouts. Our unit leader checked those plans first.',
      avoid: 'Assuming everyone has a ride. Ask during sign-up.',
      where: 'Project Plan Page D', advice: true
    },
    'plan.materialTransport': {
      text: 'Say who brings materials, supplies, and tools to the site, in what vehicle, when, and where they are stored until use. Note anything heavy, long, or needing a trailer.',
      good: 'Hardware store delivers lumber to the shed Friday. A parent with a pickup brings tools at 7:30 a.m. Saturday. Unused supplies go back in the locked shed by 4 p.m.',
      avoid: 'Leaving delivery and storage unplanned. Ask the beneficiary where things may sit safely.',
      where: 'Project Plan Page D', advice: true
    },
    'plan.workingHours': {
      text: 'The workbook recommends no more than eight hours of work per day for helpers. Plan breaks, water, and food.',
      where: 'Project Plan Page E'
    },
    'plan.food': {
      text: 'Say who provides water and food, when, and where. Ask helpers about allergies in advance. Plan extra water if it will be hot.',
      good: 'Water jugs and cups at the shade tent all day. Pizza at noon, ordered for 25. The sign-up form asks about allergies, and a nut-free option is included.',
      avoid: 'Assuming everyone brings their own. Some helpers will forget.',
      where: 'Project Plan Page E', advice: true
    },
    'plan.restrooms': {
      text: 'Say where helpers can find restrooms and hand washing. It helps to ask the beneficiary first. If none are near the site, say what you will arrange.',
      good: 'Helpers may use the gym restrooms by the side door. The principal confirmed they will be unlocked Saturday. Hand sanitizer sits at the water table.',
      avoid: 'Not asking the beneficiary. Locked buildings are a common surprise.',
      where: 'Project Plan Page E', advice: true
    },
    'plan.firstAid': {
      text: 'Say if you will have a first aid kit and where it is kept. Most projects are safer with one on site, plus a charged phone to call for help.',
      good: 'Yes. The troop first aid kit sits on the water table at the shade tent, with a charged phone and the site address written on a card.',
      avoid: 'Answering “no” because the project seems safe.',
      where: 'Project Plan Page E', advice: true
    },
    'plan.hazardousMaterials': {
      text: 'Name any paint, stain, solvent, cleaner, or fuel, and how it will be handled. Read each label first and plan for what it says (gloves, ventilation). Ask whether an adult should handle it.',
      good: 'Exterior paint and brush cleaner. An adult opens and pours the cans. Helpers wear gloves, work outdoors, and keep cans closed when not in use.',
      avoid: 'Writing “none” without checking paints, glue, and cleaners.',
      where: 'Project Plan Page E', advice: true
    },
    'plan.safetyComm': {
      text: 'Say how helpers will learn the hazards and rules: a spoken briefing, posted signs, and a short reminder at each work station. Say how helpers who arrive late will hear it too.',
      good: 'A 10-minute briefing at 8:15. A one-page hazards sheet at each station. Crew leaders repeat it for anyone arriving late before that person starts work.',
      avoid: 'Telling only the first few helpers to arrive.',
      where: 'Project Plan Page E', advice: true
    },
    'plan.ppe': {
      text: 'List the safety gear each job needs, who supplies it, and what to do if someone shows up without it. Read tool and product labels for what the maker requires.',
      good: 'Gloves and safety glasses for all digging and sanding jobs (we supply 20 pairs). Closed-toe shoes. Our plan: no gear, no tool job. Ask your unit leader which tools are OK for each age.',
      avoid: 'Listing gear with no plan for who provides it.',
      where: 'Project Plan Page E', advice: true
    },
    'plan.safetyBriefing': {
      text: 'Give a time and who gives it. It works best before any work starts.',
      good: '8:15 a.m., before anyone picks up a tool. I lead it and the unit leader adds the tool rules.',
      avoid: 'Skipping it because helpers already know each other.',
      where: 'Project Plan Page E', advice: true
    },
    'plan.emergencyAccess': {
      text: 'Say how an ambulance or fire truck gets to the work area: which gate or road, whether it will be unlocked, and where nothing should block it. Write an address someone can read to 911.',
      good: 'Ambulances use the north service gate, unlocked by the custodian at 7:30. No cars park in the lane. The site address is on a card at the first aid kit.',
      avoid: 'Giving only the beneficiary’s mailing address. The work area may be far from it.',
      where: 'Project Plan Page E', advice: true
    },
    'plan.hazards': {
      for: 'plan.hazards.0.hazard',
      text: 'Pair each hazard with what you’ll do about it.',
      good: 'Heavy items → two people carry, nobody lifts alone, gloves on, adults handle the heaviest loads.',
      avoid: 'Naming a hazard with no plan, or listing only the weather.',
      where: 'Project Plan Page E'
    },
    'plan.contingency': {
      text: 'Name what could delay or cancel the project (rain, heat, late materials, too few helpers) and what you’ll do.',
      good: 'If it rains Saturday, we move to the next Saturday (the principal agreed). If fewer than six helpers sign up, I’ll send a reminder and ask the troop to recruit.',
      avoid: 'Only “reschedule” with no backup date.',
      where: 'Project Plan Page F'
    },
    'plan.coachComments': {
      text: 'Write what your coach said about your plan, even if short, and any changes you made. A coach’s review is optional. Your beneficiary can still ask for changes. Skip if you have none.',
      good: 'Coach suggested a second water station and a rain date a week later. I added both and moved the briefing earlier.',
      avoid: 'If you met a coach, note what they suggested.',
      where: 'Project Plan Page F', advice: true
    },

    'fundraising.description': {
      text: 'Say what you’ll do, who will do it, and that the money is for the beneficiary and the project only.',
      good: 'I’ll ask six local businesses and sell seed packets at the library fair. Everything raised is for the library garden and is held by the library until bills are due.',
      avoid: 'Asking for money or materials before your fundraising is approved. Ask your council if you need approval. Don’t make fundraising the whole project.',
      where: 'Fundraising Application Page A'
    },
    'fundraising.howMuch': {
      text: 'Give a number you can back up with your materials list. It’s what you expect, not a promise.',
      where: 'Fundraising Application Page A', advice: true
    },
    'fundraising.howCollected': {
      text: 'If you’ll ask people or companies for donations, say how and who will do it. Attach a list of who you’ll ask and what you’ll ask each for. A list isn’t needed for an event like a car wash.',
      avoid: 'A list of names with no ask, or forgetting donated materials.',
      where: 'Fundraising Application Page A'
    },
    'fundraising.contractSigner': {
      text: 'An adult signs in their own name, not for Scouting, and is personally liable for the contract.',
      good: 'My aunt will sign the dumpster rental as an individual.',
      avoid: 'Signing yourself, or binding the BSA, your council, or a chartered organization.',
      where: 'Fundraising Application Page A'
    },

    'report.startDate': {
      text: 'These two dates go on the report’s cover page. The next section asks when the hands-on work began and ended.',
      where: 'Project Report cover page'
    },
    'report.description': {
      text: 'Say what you did, who it helps, and one detail about the impact. A few sentences is fine.',
      good: 'We built six raised garden beds and a path at the Maple Court community center. About 40 kids in the after-school program will plant and harvest each season.',
      avoid: 'A day-by-day diary. Save the steps for the planning box.',
      where: 'Project Report Page A'
    },
    'report.planning': {
      text: 'List what you did after approval to finish planning, in order: meetings, materials, helpers, schedule, safety.',
      good: 'I measured the site with the director, made a materials list, got three quotes, built a schedule, and texted 25 volunteers.',
      avoid: '“I planned it” with no detail.',
      where: 'Project Report Page A', advice: true
    },
    'report.wentWell': {
      text: 'Pick two or three things that worked and say why.',
      good: 'Giving every crew a leader and a photo of the finished bed worked well. We finished in one day.',
      avoid: 'Praise with no facts behind it.',
      where: 'Project Report Page A', advice: true
    },
    'report.challenging': {
      text: 'Describe one real problem, what you did, and what you’d do differently. Being honest reads well.',
      good: 'The soil was harder than expected and the first crew fell behind. I moved two stronger helpers there and borrowed a second digging bar. Next time I’d test the soil first.',
      avoid: '“Nothing,” or blaming people.',
      where: 'Project Report Page A', advice: true
    },
    'report.changes': {
      text: 'Say what changed from the proposal and why. Be brief.',
      good: 'We built six beds instead of eight because lumber costs went up.',
      where: 'Project Report Page A'
    },
    'report.leadership': {
      text: 'Describe what you did to guide others: explained the goal, split up jobs, taught skills, checked work, solved problems.',
      good: 'I showed the plan, split 25 helpers into four crews with a leader each, taught two crews to use the drill safely, and moved people when a job finished.',
      avoid: '“I was a great leader” with no example.',
      where: 'Project Report Page B', advice: true
    },
    'report.difficultLeading': {
      text: 'Pick one honest hard thing and what you did about it.',
      good: 'It was hard to tell friends their work needed redoing. I learned to say what was good first, then show the fix.',
      where: 'Project Report Page B', advice: true
    },
    'report.rewardingLeading': {
      text: 'Say what felt best: the plan coming together, teaching someone, or the beneficiary’s reaction.',
      where: 'Project Report Page B', advice: true
    },
    'report.leadershipDeveloped': {
      text: 'Name one leadership skill that grew, with a short example.',
      good: 'I learned people work better when they know why a job matters, so I explained the reason for each task.',
      avoid: 'A list of buzzwords.',
      where: 'Project Report Page B', advice: true
    },
    'report.materialsUsed': {
      text: 'If you ran short or had extra, say what, what you did, and the effect. If not, say so.',
      good: 'We ran short of screws by about 40. A parent bought a box for $8. We had two extra bags of soil, which we gave to the center.',
      where: 'Project Report Page B'
    },
    'report.leftoverMaterials': {
      text: 'Money left over goes to the beneficiary. If it can’t keep it, it picks a charity or lets the unit keep it, and the unit must not influence that choice.',
      good: 'Yes. On June 2 I gave the library the $31 left over.',
      where: 'Project Report Page C'
    },
    'report.hours': {
      for: 'report.hours.2.h',
      text: 'Count yourself and your planning time. There is no minimum number of hours. A sign-in sheet and your own log make adding up easy.',
      avoid: 'Leaving yourself out, or guessing months later.',
      where: 'Project Report Page B', advice: true
    },
    'report.fundingSummary': {
      text: 'Say where money, materials, and supplies came from: you, donors, the beneficiary, fundraisers, donated items.',
      good: 'Lumber was bought with $420 from family and a $200 club gift. Green Hardware donated soil and mulch (about $150).',
      avoid: 'Leaving out donated items, or numbers that don’t match your receipts.',
      where: 'Project Report Page C'
    },
    'report.collected': {
      text: 'Use your own money-in and money-out sheets, and check the totals with a parent or coach.',
      where: 'Project Report Page C', advice: true
    },
    'report.excessFunds': {
      text: 'Only if you spent more than you had: say why, and how the extra was paid. Otherwise write “Not applicable.”',
      where: 'Project Report Page C'
    },
    'report.thanks': {
      text: 'Say how you thanked donors and helpers, and when.',
      good: 'I mailed handwritten cards with a photo of the finished beds to all eight donors on May 10.',
      avoid: '“Thanked everyone” with no how or when.',
      where: 'Project Report Page C', advice: true
    }
  };

  Object.defineProperty(tips, '__limits', { value: LIMITS, enumerable: false });
  window.EagleTips = tips;
})();
