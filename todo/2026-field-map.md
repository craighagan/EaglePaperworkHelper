# 2026 field map (generated)

**Status:** design data. Generated from the official 2026 workbook (SHA-256 `5810e017…`) and Appendix D (`75364d25…`) with the scratch scripts in [2026-design.md](2026-design.md) section 11, then checked by two independent reviews (October 2026). Every one of the 382 workbook field names and 28 Appendix D field names is listed exactly once. Field names are copied byte for byte from the PDF: most apostrophes are curly (’, U+2019), and one name (`Candidate's Promise Signature`) has a straight one. **Copy names from the JS block, never retype them.**

Kinds:

- **text**: The answer from the draft, written as typed. Single-line boxes get line breaks replaced by "; ".
- **date**: A date. The draft holds `YYYY-MM-DD` (from a date input) or, for a text input, `M/D/YYYY`; it is written in the box's own format (column "Format"). Anything else is written as typed, with note S10.
- **money**: A dollar amount, written `1234.50` (two decimals, no `$`, no commas). Not a plain amount: written as typed, with note S9.
- **count**: A head count, written as a whole number. Not a whole number: written as typed, with note S9.
- **hours**: Person-hours, written as typed (trimmed). The totals add them up.
- **computed**: Worked out by the helper from other answers, with the same formula as the form's own script (column "Format"), so Acrobat would show the same number. Column "Type" says how to write it: `money` and `hours` with 2 decimals, `count` as a whole number. Never read back.
- **fixed**: Always the same value (column "Format").
- **choice**: The drop-down: one of its export values, exactly.
- **radio**: A radio group: select the widget whose export value matches.
- **approvalName**: A printed name beside an approval signature. Filled from the draft unless the Scout ticks "Leave the printed names blank" (hard rule 6).
- **never**: Never written by the helper: a signature, the date beside a signature, or a box an approver fills in (hard rule 6).

## Workbook (22 pages)

| PDF page(s) | Field name | Kind | Draft path | Format | Type | Note |
|---|---|---|---|---|---|---|
| all 22 | `Candidates Full Name` | text | `candidate.name` |  |  | on all 22 pages |
| all 22 | `Project Title` | text | `proposal.projectName` |  |  | on all 22 pages |
| 5 | `Birth Date` | date | `candidate.dob` | m/d/yyyy |  |  |
| 5 | `City` | text | `candidate.city` |  |  |  |
| 5 | `City_2` | text | `parent.city` |  |  |  |
| 5 | `City_3` | text | `contacts.beneficiary.city` |  |  |  |
| 5 | `City_4` | text | `contacts.serviceCenter.city` |  |  |  |
| 5 | `Contact Name` | text | `contacts.serviceCenter.name` |  |  |  |
| 5 | `Dropdown1` | choice | `unit.type` |  |  | Troop, Crew, or Ship (exact export values) |
| 5 | `Email` | text | `candidate.email` |  |  |  |
| 5 | `Email_2` | text | `parent.email` |  |  |  |
| 5 | `Email_3` | text | `contacts.leader.email` |  |  |  |
| 5 | `Email_4` | text | `contacts.committee.email` |  |  |  |
| 5 | `Email_5` | text | `contacts.beneficiary.email` |  |  |  |
| 5 | `Email_6` | text | `contacts.beneficiaryRep.email` |  |  |  |
| 5 | `Email_7` | text | `contacts.serviceCenter.email` |  |  |  |
| 5 | `Email_8` | text | `contacts.approvalRep.email` |  |  |  |
| 5 | `Email_9` | text | `contacts.coach.email` |  |  |  |
| 5 | `Life Rank Board of Review Date` | date | `candidate.borDate` | m/d/yyyy |  |  |
| 5 | `Name of Council` | text | `unit.council` |  |  |  |
| 5 | `Name of District` | text | `unit.district` |  |  |  |
| 5,22 | `Name of Organization` | text | `contacts.beneficiary.name` |  |  |  |
| 5 | `Name of Project CoachAdvisor` | text | `contacts.coach.name` |  |  |  |
| 5 | `Name of Representative` | text | `contacts.beneficiaryRep.name` |  |  |  |
| 5 | `Name of Representative_2` | text | `contacts.approvalRep.name` |  |  |  |
| 5 | `Name_2` | text | `parent.name` |  |  |  |
| 5 | `Name_4` | text | `contacts.committee.name` |  |  |  |
| 5,11,22 | `Scoutmaster’s Name` | text | `contacts.leader.name` |  |  |  |
| 5 | `State` | text | `candidate.state` |  |  |  |
| 5 | `State_2` | text | `parent.state` |  |  |  |
| 5 | `State_3` | text | `contacts.beneficiary.state` |  |  |  |
| 5 | `State_4` | text | `contacts.serviceCenter.state` |  |  |  |
| 5 | `Street Address` | text | `candidate.address` |  |  |  |
| 5 | `Street Address_2` | text | `parent.address` |  |  |  |
| 5 | `Street Address_3` | text | `contacts.beneficiary.address` |  |  |  |
| 5 | `Street Address_4` | text | `contacts.serviceCenter.address` |  |  |  |
| 5 | `Telephone` | text | `candidate.phone` |  |  |  |
| 5 | `Telephone_2` | text | `parent.phone` |  |  |  |
| 5 | `Telephone_3` | text | `contacts.leader.phone` |  |  |  |
| 5 | `Telephone_4` | text | `contacts.committee.phone` |  |  |  |
| 5 | `Telephone_5` | text | `contacts.beneficiary.phone` |  |  |  |
| 5 | `Telephone_6` | text | `contacts.beneficiaryRep.phone` |  |  |  |
| 5 | `Telephone_7` | text | `contacts.serviceCenter.phone` |  |  |  |
| 5 | `Telephone_8` | text | `contacts.approvalRep.phone` |  |  |  |
| 5 | `Telephone_9` | text | `contacts.coach.phone` |  |  |  |
| 5 | `Text2` | text | `candidate.pid` |  |  |  |
| 5 | `Unit Number` | text | `unit.number` |  |  |  |
| 7 | `Beneficiary and Impact` | text | `proposal.beneficiaryImpact` |  |  |  |
| 7 | `Motivation` | text | `proposal.motivation` |  |  |  |
| 7,11,22 | `Project Description` | text | `proposal.description` |  |  | ONE field on pages 7, 11 and 22 (see design section 4.3) |
| 8 | `Complete Your Plan Date` | date | `proposal.planDate` | mm/dd/yyyy |  |  |
| 8 | `Leadership` | text | `proposal.leadership` |  |  |  |
| 8 | `Planned Begin Project Date` | date | `proposal.beginDate` | mm/dd/yyyy |  |  |
| 8 | `Planned Completion Date` | date | `proposal.completeDate` | mm/dd/yyyy |  |  |
| 8 | `Proposal Approved Date` | date | `proposal.approvedDate` | mm/dd/yyyy |  |  |
| 8 | `The Work` | text | `proposal.work` |  |  |  |
| 9,15,20 | `Eagle Scout Candidate` | fixed |  | 1 |  | always "1"; shared by pages 9, 15, 20 |
| 9 | `Estimated Cost of Materials` | money | `proposal.costs.materials` |  |  |  |
| 9 | `Estimated Cost of Other Needs` | money | `proposal.costs.other` |  |  |  |
| 9 | `Estimated Cost of Supplies` | money | `proposal.costs.supplies` |  |  |  |
| 9 | `Estimated Cost of Tools` | money | `proposal.costs.tools` |  |  |  |
| 9 | `Other Adults` | count | `proposal.hours.4.w` |  |  |  |
| 9 | `Other Youth` | count | `proposal.hours.2.w` |  |  |  |
| 9 | `Registered Scouting America adults` | count | `proposal.hours.3.w` |  |  |  |
| 9 | `Resources Needed` | text | `proposal.resources` |  |  |  |
| 9 | `Scouting America youth` | count | `proposal.hours.1.w` |  |  |  |
| 9,20 | `Total Hours Invested Eagle Scout candidate` | hours | `proposal.hours.0.h` |  |  | also shown on page 20 |
| 9,20 | `Total Hours Invested Other Adults` | hours | `proposal.hours.4.h` |  |  | also shown on page 20 |
| 9,20 | `Total Hours Invested Other Youth` | hours | `proposal.hours.2.h` |  |  | also shown on page 20 |
| 9,20 | `Total Hours Invested Registered Scouting America adults` | hours | `proposal.hours.3.h` |  |  | also shown on page 20 |
| 9,20 | `Total Hours Invested Scouting America youth` | hours | `proposal.hours.1.h` |  |  | also shown on page 20 |
| 9 | `Total People` | computed |  | 1 + proposal.hours[1..4].w | count | form sums the same |
| 9 | `Total Prelimary Cost Estimate` | computed |  | sum proposal.costs | money | form sums the same (name is misspelled in the PDF) |
| 9,20 | `Total Proposal Development Hours` | computed |  | sum proposal.hours[0..4].h | hours | form has no sum; also on page 20 |
| 10 | `Fundraising` | text | `proposal.fundraising` |  |  |  |
| 10 | `Need Fundraising App?` | radio | `proposal.needFundraisingApp` |  |  | export values 'Yes' / 'No' |
| 10 | `Safety` | text | `proposal.safety` |  |  |  |
| 11 | `Beneficiary Approval Name` | approvalName | `contacts.beneficiaryRep.name` |  |  | printed name; left blank when "leave printed names blank" is ticked |
| 11 | `Beneficiary Approval Signature` | never |  |  |  | signature field |
| 11 | `Beneficiary Approval Signature Date` | never |  |  |  | date beside a signature |
| 11 | `Candidate's Promise Signature` | never |  |  |  | signature field |
| 11 | `District or Council Approval Name` | approvalName | `contacts.approvalRep.name` |  |  | printed name; left blank when "leave printed names blank" is ticked |
| 11 | `District or Council Approval Signature` | never |  |  |  | signature field |
| 11 | `District or Council Signature Date` | never |  |  |  | date beside a signature |
| 11 | `Promise Signature Date` | never |  |  |  | date beside a signature |
| 11 | `Provided Copy of Info for Beneficiaries` | never |  |  |  | the beneficiary's own Yes/No in the beneficiary's approval box |
| 11 | `Scoutmaster Approval Date` | never |  |  |  | date beside a signature |
| 11 | `Scoutmaster’s Approval Signature` | never |  |  |  | signature field |
| 11 | `Unit Committee Approval Name` | approvalName | `contacts.committee.name` |  |  | printed name; left blank when "leave printed names blank" is ticked |
| 11 | `Unit Committee Approval Signature` | never |  |  |  | signature field |
| 11 | `Unit Committee Signature Date` | never |  |  |  | date beside a signature |
| 13 | `Comments from Proposal Review` | text | `plan.reviewComments` |  |  |  |
| 13 | `The Work Present Condition or Situation` | text | `plan.presentCondition` |  |  |  |
| 14 | `Adult or Youth` | text | `plan.helpers.0.adultYouth` |  |  |  |
| 14 | `Adult or Youth_10` | text | `plan.helpers.9.adultYouth` |  |  |  |
| 14 | `Adult or Youth_11` | text | `plan.helpers.10.adultYouth` |  |  |  |
| 14 | `Adult or Youth_12` | text | `plan.helpers.11.adultYouth` |  |  |  |
| 14 | `Adult or Youth_2` | text | `plan.helpers.1.adultYouth` |  |  |  |
| 14 | `Adult or Youth_3` | text | `plan.helpers.2.adultYouth` |  |  |  |
| 14 | `Adult or Youth_4` | text | `plan.helpers.3.adultYouth` |  |  |  |
| 14 | `Adult or Youth_5` | text | `plan.helpers.4.adultYouth` |  |  |  |
| 14 | `Adult or Youth_6` | text | `plan.helpers.5.adultYouth` |  |  |  |
| 14 | `Adult or Youth_7` | text | `plan.helpers.6.adultYouth` |  |  |  |
| 14 | `Adult or Youth_8` | text | `plan.helpers.7.adultYouth` |  |  |  |
| 14 | `Adult or Youth_9` | text | `plan.helpers.8.adultYouth` |  |  |  |
| 14 | `EXPECTED DURATION` | text | `plan.steps.0.duration` |  |  |  |
| 14 | `EXPECTED DURATION10` | text | `plan.steps.9.duration` |  |  |  |
| 14 | `EXPECTED DURATION_2` | text | `plan.steps.1.duration` |  |  |  |
| 14 | `EXPECTED DURATION_3` | text | `plan.steps.2.duration` |  |  |  |
| 14 | `EXPECTED DURATION_4` | text | `plan.steps.3.duration` |  |  |  |
| 14 | `EXPECTED DURATION_5` | text | `plan.steps.4.duration` |  |  |  |
| 14 | `EXPECTED DURATION_6` | text | `plan.steps.5.duration` |  |  |  |
| 14 | `EXPECTED DURATION_7` | text | `plan.steps.6.duration` |  |  |  |
| 14 | `EXPECTED DURATION_8` | text | `plan.steps.7.duration` |  |  |  |
| 14 | `EXPECTED DURATION_9` | text | `plan.steps.8.duration` |  |  |  |
| 14 | `Number Needed` | text | `plan.helpers.0.needed` |  |  |  |
| 14 | `Number Needed_10` | text | `plan.helpers.9.needed` |  |  |  |
| 14 | `Number Needed_11` | text | `plan.helpers.10.needed` |  |  |  |
| 14 | `Number Needed_12` | text | `plan.helpers.11.needed` |  |  |  |
| 14 | `Number Needed_2` | text | `plan.helpers.1.needed` |  |  |  |
| 14 | `Number Needed_3` | text | `plan.helpers.2.needed` |  |  |  |
| 14 | `Number Needed_4` | text | `plan.helpers.3.needed` |  |  |  |
| 14 | `Number Needed_5` | text | `plan.helpers.4.needed` |  |  |  |
| 14 | `Number Needed_6` | text | `plan.helpers.5.needed` |  |  |  |
| 14 | `Number Needed_7` | text | `plan.helpers.6.needed` |  |  |  |
| 14 | `Number Needed_8` | text | `plan.helpers.7.needed` |  |  |  |
| 14 | `Number Needed_9` | text | `plan.helpers.8.needed` |  |  |  |
| 14 | `Number So Far` | text | `plan.helpers.0.soFar` |  |  |  |
| 14 | `Number So Far_10` | text | `plan.helpers.9.soFar` |  |  |  |
| 14 | `Number So Far_11` | text | `plan.helpers.10.soFar` |  |  |  |
| 14 | `Number So Far_12` | text | `plan.helpers.11.soFar` |  |  |  |
| 14 | `Number So Far_2` | text | `plan.helpers.1.soFar` |  |  |  |
| 14 | `Number So Far_3` | text | `plan.helpers.2.soFar` |  |  |  |
| 14 | `Number So Far_4` | text | `plan.helpers.3.soFar` |  |  |  |
| 14 | `Number So Far_5` | text | `plan.helpers.4.soFar` |  |  |  |
| 14 | `Number So Far_6` | text | `plan.helpers.5.soFar` |  |  |  |
| 14 | `Number So Far_7` | text | `plan.helpers.6.soFar` |  |  |  |
| 14 | `Number So Far_8` | text | `plan.helpers.7.soFar` |  |  |  |
| 14 | `Number So Far_9` | text | `plan.helpers.8.soFar` |  |  |  |
| 14 | `Organizing Tasks` | text | `plan.organizing` |  |  |  |
| 14 | `Skills Needed` | text | `plan.helpers.0.skills` |  |  |  |
| 14 | `Skills Needed_10` | text | `plan.helpers.9.skills` |  |  |  |
| 14 | `Skills Needed_11` | text | `plan.helpers.10.skills` |  |  |  |
| 14 | `Skills Needed_12` | text | `plan.helpers.11.skills` |  |  |  |
| 14 | `Skills Needed_2` | text | `plan.helpers.1.skills` |  |  |  |
| 14 | `Skills Needed_3` | text | `plan.helpers.2.skills` |  |  |  |
| 14 | `Skills Needed_4` | text | `plan.helpers.3.skills` |  |  |  |
| 14 | `Skills Needed_5` | text | `plan.helpers.4.skills` |  |  |  |
| 14 | `Skills Needed_6` | text | `plan.helpers.5.skills` |  |  |  |
| 14 | `Skills Needed_7` | text | `plan.helpers.6.skills` |  |  |  |
| 14 | `Skills Needed_8` | text | `plan.helpers.7.skills` |  |  |  |
| 14 | `Skills Needed_9` | text | `plan.helpers.8.skills` |  |  |  |
| 14 | `Step 1` | text | `plan.steps.0.step` |  |  |  |
| 14 | `Step 10` | text | `plan.steps.9.step` |  |  |  |
| 14 | `Step 2` | text | `plan.steps.1.step` |  |  |  |
| 14 | `Step 3` | text | `plan.steps.2.step` |  |  |  |
| 14 | `Step 4` | text | `plan.steps.3.step` |  |  |  |
| 14 | `Step 5` | text | `plan.steps.4.step` |  |  |  |
| 14 | `Step 6` | text | `plan.steps.5.step` |  |  |  |
| 14 | `Step 7` | text | `plan.steps.6.step` |  |  |  |
| 14 | `Step 8` | text | `plan.steps.7.step` |  |  |  |
| 14 | `Step 9` | text | `plan.steps.8.step` |  |  |  |
| 14 | `Task or Role 1` | text | `plan.helpers.0.job` |  |  |  |
| 14 | `Task or Role 10` | text | `plan.helpers.9.job` |  |  |  |
| 14 | `Task or Role 11` | text | `plan.helpers.10.job` |  |  |  |
| 14 | `Task or Role 12` | text | `plan.helpers.11.job` |  |  |  |
| 14 | `Task or Role 2` | text | `plan.helpers.1.job` |  |  |  |
| 14 | `Task or Role 3` | text | `plan.helpers.2.job` |  |  |  |
| 14 | `Task or Role 4` | text | `plan.helpers.3.job` |  |  |  |
| 14 | `Task or Role 5` | text | `plan.helpers.4.job` |  |  |  |
| 14 | `Task or Role 6` | text | `plan.helpers.5.job` |  |  |  |
| 14 | `Task or Role 7` | text | `plan.helpers.6.job` |  |  |  |
| 14 | `Task or Role 8` | text | `plan.helpers.7.job` |  |  |  |
| 14 | `Task or Role 9` | text | `plan.helpers.8.job` |  |  |  |
| 15 | `Communicating with Helpers` | text | `plan.communication` |  |  |  |
| 15,20 | `Project Plan Eagle Scout Hours` | hours | `plan.hours.0.h` |  |  | also shown on page 20 |
| 15 | `Project Plan Other Adults` | count | `plan.hours.4.w` |  |  |  |
| 15,20 | `Project Plan Other Adults Hours` | hours | `plan.hours.4.h` |  |  | also shown on page 20 |
| 15 | `Project Plan Other Youth` | count | `plan.hours.2.w` |  |  |  |
| 15,20 | `Project Plan Other Youth Hours` | hours | `plan.hours.2.h` |  |  | also shown on page 20 |
| 15,20 | `Project Plan Registered Adult Hours` | hours | `plan.hours.3.h` |  |  | also shown on page 20 |
| 15 | `Project Plan Registered Scouting America Adults` | count | `plan.hours.3.w` |  |  |  |
| 15 | `Project Plan Registered Scouting America youth members` | count | `plan.hours.1.w` |  |  |  |
| 15,20 | `Project Plan Scouting America youth members hours` | hours | `plan.hours.1.h` |  |  | also shown on page 20 |
| 15,20 | `Project Plan Total Hours` | computed |  | sum plan.hours[0..4].h | hours | form has no sum; also on page 20 |
| 15 | `Project Plan Total Individuals` | computed |  | 1 + plan.hours[1..4].w | count | the form also adds "Project Description" (text, counts as 0) |
| 15 | `Training and Preparing Helpers` | text | `plan.training` |  |  |  |
| 15 | `Work Sessions` | text | `plan.workSessions` |  |  |  |
| 16 | `Construction Safety` | text | `plan.toolSafety` |  |  |  |
| 16 | `Emergency Vehicle Access` | text | `plan.emergencyAccess` |  |  |  |
| 16 | `First-aid kit information` | text | `plan.firstAidKit` |  |  |  |
| 16 | `How Problems Will Be MitigatedRow1` | text | `plan.hazards.0.prevention` |  |  |  |
| 16 | `How Problems Will Be MitigatedRow2` | text | `plan.hazards.1.prevention` |  |  |  |
| 16 | `How Problems Will Be MitigatedRow3` | text | `plan.hazards.2.prevention` |  |  |  |
| 16 | `Name of First Aid Specialist` | text | `plan.firstAidSpecialist` |  |  |  |
| 16 | `PPE` | text | `plan.ppe` |  |  |  |
| 16 | `Potential HazardRow1` | text | `plan.hazards.0.hazard` |  |  |  |
| 16 | `Potential HazardRow2` | text | `plan.hazards.1.hazard` |  |  |  |
| 16 | `Potential HazardRow3` | text | `plan.hazards.2.hazard` |  |  |  |
| 16 | `Safety Briefing` | text | `plan.safetyBriefing` |  |  |  |
| 16 | `Safety Discussions with Adults` | text | `plan.safetyAdults` |  |  |  |
| 16 | `Tools` | text | `plan.adultTools` |  |  |  |
| 17 | `Contribution from Beneficiary` | money | `plan.funds.beneficiary` |  |  |  |
| 17 | `Contributions` | money | `plan.funds.others` |  |  |  |
| 17 | `Contributions from Exempted Sources` | money | `plan.funds.exempt` |  |  |  |
| 17 | `Date Expected` | date | `plan.funds.futureDate` | m/d/yy |  |  |
| 17 | `DescriptionRow1` | text | `plan.items.0.description` |  |  |  |
| 17 | `DescriptionRow10` | text | `plan.items.9.description` |  |  |  |
| 17 | `DescriptionRow11` | text | `plan.items.10.description` |  |  |  |
| 17 | `DescriptionRow12` | text | `plan.items.11.description` |  |  |  |
| 17 | `DescriptionRow2` | text | `plan.items.1.description` |  |  |  |
| 17 | `DescriptionRow3` | text | `plan.items.2.description` |  |  |  |
| 17 | `DescriptionRow4` | text | `plan.items.3.description` |  |  |  |
| 17 | `DescriptionRow5` | text | `plan.items.4.description` |  |  |  |
| 17 | `DescriptionRow6` | text | `plan.items.5.description` |  |  |  |
| 17 | `DescriptionRow7` | text | `plan.items.6.description` |  |  |  |
| 17 | `DescriptionRow8` | text | `plan.items.7.description` |  |  |  |
| 17 | `DescriptionRow9` | text | `plan.items.8.description` |  |  |  |
| 17 | `Donations` | money | `plan.funds.donated` |  |  |  |
| 17 | `Estimated Future Fundraising` | money | `plan.funds.future` |  |  |  |
| 17 | `Funds Raised So Far` | computed |  | beneficiary + exempt + others | money | form sums the same |
| 17 | `ItemRow1` | text | `plan.items.0.item` |  |  |  |
| 17 | `ItemRow10` | text | `plan.items.9.item` |  |  |  |
| 17 | `ItemRow11` | text | `plan.items.10.item` |  |  |  |
| 17 | `ItemRow12` | text | `plan.items.11.item` |  |  |  |
| 17 | `ItemRow2` | text | `plan.items.1.item` |  |  |  |
| 17 | `ItemRow3` | text | `plan.items.2.item` |  |  |  |
| 17 | `ItemRow4` | text | `plan.items.3.item` |  |  |  |
| 17 | `ItemRow5` | text | `plan.items.4.item` |  |  |  |
| 17 | `ItemRow6` | text | `plan.items.5.item` |  |  |  |
| 17 | `ItemRow7` | text | `plan.items.6.item` |  |  |  |
| 17 | `ItemRow8` | text | `plan.items.7.item` |  |  |  |
| 17 | `ItemRow9` | text | `plan.items.8.item` |  |  |  |
| 17 | `Permissions or Permits` | text | `plan.permits` |  |  |  |
| 17 | `QuantityRow1` | text | `plan.items.0.qty` |  |  |  |
| 17 | `QuantityRow10` | text | `plan.items.9.qty` |  |  |  |
| 17 | `QuantityRow11` | text | `plan.items.10.qty` |  |  |  |
| 17 | `QuantityRow12` | text | `plan.items.11.qty` |  |  |  |
| 17 | `QuantityRow2` | text | `plan.items.1.qty` |  |  |  |
| 17 | `QuantityRow3` | text | `plan.items.2.qty` |  |  |  |
| 17 | `QuantityRow4` | text | `plan.items.3.qty` |  |  |  |
| 17 | `QuantityRow5` | text | `plan.items.4.qty` |  |  |  |
| 17 | `QuantityRow6` | text | `plan.items.5.qty` |  |  |  |
| 17 | `QuantityRow7` | text | `plan.items.6.qty` |  |  |  |
| 17 | `QuantityRow8` | text | `plan.items.7.qty` |  |  |  |
| 17 | `QuantityRow9` | text | `plan.items.8.qty` |  |  |  |
| 17 | `SourceRow1` | text | `plan.items.0.source` |  |  |  |
| 17 | `SourceRow10` | text | `plan.items.9.source` |  |  |  |
| 17 | `SourceRow11` | text | `plan.items.10.source` |  |  |  |
| 17 | `SourceRow12` | text | `plan.items.11.source` |  |  |  |
| 17 | `SourceRow2` | text | `plan.items.1.source` |  |  |  |
| 17 | `SourceRow3` | text | `plan.items.2.source` |  |  |  |
| 17 | `SourceRow4` | text | `plan.items.3.source` |  |  |  |
| 17 | `SourceRow5` | text | `plan.items.4.source` |  |  |  |
| 17 | `SourceRow6` | text | `plan.items.5.source` |  |  |  |
| 17 | `SourceRow7` | text | `plan.items.6.source` |  |  |  |
| 17 | `SourceRow8` | text | `plan.items.7.source` |  |  |  |
| 17 | `SourceRow9` | text | `plan.items.8.source` |  |  |  |
| 17 | `Total CostRow1` | computed | `plan.items.0.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostRow10` | computed | `plan.items.9.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostRow11` | computed | `plan.items.10.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostRow12` | computed | `plan.items.11.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostRow2` | computed | `plan.items.1.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostRow3` | computed | `plan.items.2.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostRow4` | computed | `plan.items.3.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostRow5` | computed | `plan.items.4.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostRow6` | computed | `plan.items.5.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostRow7` | computed | `plan.items.6.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostRow8` | computed | `plan.items.7.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostRow9` | computed | `plan.items.8.totalCost` | rowCost(row) (typed total wins, else qty x unit) | money | number box |
| 17 | `Total CostTotal Cost` | computed |  | sum of the 12 row costs | money | form sums the same |
| 17 | `Total Funds` | computed |  | beneficiary + exempt + others + future + donated | money | form sums the same |
| 17 | `Unit CostRow1` | text | `plan.items.0.unitCost` |  |  | no number format: keep as typed |
| 17 | `Unit CostRow10` | text | `plan.items.9.unitCost` |  |  | no number format: keep as typed |
| 17 | `Unit CostRow11` | text | `plan.items.10.unitCost` |  |  | no number format: keep as typed |
| 17 | `Unit CostRow12` | text | `plan.items.11.unitCost` |  |  | no number format: keep as typed |
| 17 | `Unit CostRow2` | text | `plan.items.1.unitCost` |  |  | no number format: keep as typed |
| 17 | `Unit CostRow3` | text | `plan.items.2.unitCost` |  |  | no number format: keep as typed |
| 17 | `Unit CostRow4` | text | `plan.items.3.unitCost` |  |  | no number format: keep as typed |
| 17 | `Unit CostRow5` | text | `plan.items.4.unitCost` |  |  | no number format: keep as typed |
| 17 | `Unit CostRow6` | text | `plan.items.5.unitCost` |  |  | no number format: keep as typed |
| 17 | `Unit CostRow7` | text | `plan.items.6.unitCost` |  |  | no number format: keep as typed |
| 17 | `Unit CostRow8` | text | `plan.items.7.unitCost` |  |  | no number format: keep as typed |
| 17 | `Unit CostRow9` | text | `plan.items.8.unitCost` |  |  | no number format: keep as typed |
| 18 | `Candidate’s Promise Date` | never |  |  |  | date beside a signature |
| 18 | `Candidate’s Promise Signature` | never |  |  |  | signature field |
| 18 | `Funding` | text | `plan.fundingSources` |  |  |  |
| 18 | `Input from Beneficiary` | text | `plan.beneficiaryInput` |  |  |  |
| 18 | `Input from Scoutmaster` | text | `plan.leaderInput` |  |  |  |
| 18 | `Logistics` | text | `plan.materialTransport` |  |  |  |
| 18 | `Transportation for Helpers` | text | `plan.workerTransport` |  |  |  |
| 19 | `Challenges` | text | `report.challenges` |  |  |  |
| 19 | `Changes` | text | `report.changes` |  |  |  |
| 19 | `Observations` | text | `report.observations` |  |  |  |
| 20 | `Eagle Scout Candidate Total Hours` | computed |  | proposal.hours[0].h + plan.hours[0].h + report.hours[0].h | hours | form sums the same |
| 20 | `Nonregistered Adults` | count | `report.hours.4.w` |  |  |  |
| 20 | `Nonregistered youth` | count | `report.hours.2.w` |  |  |  |
| 20 | `Other Youth Total Hours` | computed |  | proposal.hours[2].h + plan.hours[2].h + report.hours[2].h | hours | form sums the same |
| 20 | `Other_Adults_Total_Hours` | computed |  | proposal.hours[4].h + plan.hours[4].h + report.hours[4].h | hours | form sums the same |
| 20 | `Project Execution Number of Hours Eagle Scout Candidate` | hours | `report.hours.0.h` |  |  |  |
| 20 | `Project Execution Number of Hours Other Adults` | hours | `report.hours.4.h` |  |  |  |
| 20 | `Project Execution Number of Hours Other Youth` | hours | `report.hours.2.h` |  |  |  |
| 20 | `Project Execution Number of Hours Registered Scouting America adults` | hours | `report.hours.3.h` |  |  |  |
| 20 | `Project Execution Number of Hours Registered Scouting America youth` | hours | `report.hours.1.h` |  |  |  |
| 20 | `Project Execution Total Number of Hours` | computed |  | sum report.hours[0..4].h | hours | form sums the same |
| 20 | `Registered Adults` | count | `report.hours.3.w` |  |  |  |
| 20 | `Registered Adults Total Hours` | computed |  | proposal.hours[3].h + plan.hours[3].h + report.hours[3].h | hours | form sums the same |
| 20 | `Registered Scouting America youth members` | count | `report.hours.1.w` |  |  |  |
| 20 | `Total Volunteers` | computed |  | 1 + report.hours[1..4].w | count | form sums the same |
| 20 | `Total_Hours` | computed |  | sum of the five row totals | hours | form sums the same |
| 20 | `Use of Materials and Other Needs` | text | `report.materialsUse` |  |  |  |
| 20 | `What I Learned About Leadership` | text | `report.leadershipStyle` |  |  |  |
| 20 | `What Was Most Rewarding` | text | `report.rewarding` |  |  |  |
| 20 | `Youth Members Total Hours` | computed |  | proposal.hours[1].h + plan.hours[1].h + report.hours[1].h | hours | form sums the same |
| 21 | `Acknowledgment` | text | `report.thanks` |  |  |  |
| 21 | `AmountCollected` | money | `report.collected` |  |  |  |
| 21 | `AmountSpent` | money | `report.spent` |  |  |  |
| 21 | `Artificial Intelligence` | text | `report.aiUse` |  |  |  |
| 21 | `DescriptionRow1_2` | text | `report.spending.0.description` |  |  |  |
| 21 | `DescriptionRow2_2` | text | `report.spending.1.description` |  |  |  |
| 21 | `DescriptionRow3_2` | text | `report.spending.2.description` |  |  |  |
| 21 | `DescriptionRow4_2` | text | `report.spending.3.description` |  |  |  |
| 21 | `DescriptionRow5_2` | text | `report.spending.4.description` |  |  |  |
| 21 | `DescriptionRow6_2` | text | `report.spending.5.description` |  |  |  |
| 21 | `DescriptionRow7_2` | text | `report.spending.6.description` |  |  |  |
| 21 | `DescriptionRow8_2` | text | `report.spending.7.description` |  |  |  |
| 21 | `DescriptionRow9_2` | text | `report.spending.8.description` |  |  |  |
| 21 | `Difference` | computed |  | collected - spent | money | form computes the same |
| 21 | `Difference in amounts collected and spent` | text | `report.differenceExplained` |  |  |  |
| 21 | `ItemRow1_2` | text | `report.spending.0.item` |  |  |  |
| 21 | `ItemRow2_2` | text | `report.spending.1.item` |  |  |  |
| 21 | `ItemRow3_2` | text | `report.spending.2.item` |  |  |  |
| 21 | `ItemRow4_2` | text | `report.spending.3.item` |  |  |  |
| 21 | `ItemRow5_2` | text | `report.spending.4.item` |  |  |  |
| 21 | `ItemRow6_2` | text | `report.spending.5.item` |  |  |  |
| 21 | `ItemRow7_2` | text | `report.spending.6.item` |  |  |  |
| 21 | `ItemRow8_2` | text | `report.spending.7.item` |  |  |  |
| 21 | `ItemRow9_2` | text | `report.spending.8.item` |  |  |  |
| 21 | `QuantityRow1_2` | text | `report.spending.0.qty` |  |  |  |
| 21 | `QuantityRow2_2` | text | `report.spending.1.qty` |  |  |  |
| 21 | `QuantityRow3_2` | text | `report.spending.2.qty` |  |  |  |
| 21 | `QuantityRow4_2` | text | `report.spending.3.qty` |  |  |  |
| 21 | `QuantityRow5_2` | text | `report.spending.4.qty` |  |  |  |
| 21 | `QuantityRow6_2` | text | `report.spending.5.qty` |  |  |  |
| 21 | `QuantityRow7_2` | text | `report.spending.6.qty` |  |  |  |
| 21 | `QuantityRow8_2` | text | `report.spending.7.qty` |  |  |  |
| 21 | `QuantityRow9_2` | text | `report.spending.8.qty` |  |  |  |
| 21 | `SourceRow1_2` | text | `report.spending.0.source` |  |  |  |
| 21 | `SourceRow2_2` | text | `report.spending.1.source` |  |  |  |
| 21 | `SourceRow3_2` | text | `report.spending.2.source` |  |  |  |
| 21 | `SourceRow4_2` | text | `report.spending.3.source` |  |  |  |
| 21 | `SourceRow5_2` | text | `report.spending.4.source` |  |  |  |
| 21 | `SourceRow6_2` | text | `report.spending.5.source` |  |  |  |
| 21 | `SourceRow7_2` | text | `report.spending.6.source` |  |  |  |
| 21 | `SourceRow8_2` | text | `report.spending.7.source` |  |  |  |
| 21 | `SourceRow9_2` | text | `report.spending.8.source` |  |  |  |
| 21 | `Total CostRow1_2` | computed | `report.spending.0.totalCost` | rowCost(row) | money | number box |
| 21 | `Total CostRow2_2` | computed | `report.spending.1.totalCost` | rowCost(row) | money | number box |
| 21 | `Total CostRow3_2` | computed | `report.spending.2.totalCost` | rowCost(row) | money | number box |
| 21 | `Total CostRow4_2` | computed | `report.spending.3.totalCost` | rowCost(row) | money | number box |
| 21 | `Total CostRow5_2` | computed | `report.spending.4.totalCost` | rowCost(row) | money | number box |
| 21 | `Total CostRow6_2` | computed | `report.spending.5.totalCost` | rowCost(row) | money | number box |
| 21 | `Total CostRow7_2` | computed | `report.spending.6.totalCost` | rowCost(row) | money | number box |
| 21 | `Total CostRow8_2` | computed | `report.spending.7.totalCost` | rowCost(row) | money | number box |
| 21 | `Total CostRow9_2` | computed | `report.spending.8.totalCost` | rowCost(row) | money | number box |
| 21 | `Total CostTotal Cost_2` | computed |  | sum of the 9 row costs | money | form sums the same |
| 21 | `Unit CostRow1_2` | text | `report.spending.0.unitCost` |  |  | no number format: keep as typed |
| 21 | `Unit CostRow2_2` | text | `report.spending.1.unitCost` |  |  | no number format: keep as typed |
| 21 | `Unit CostRow3_2` | text | `report.spending.2.unitCost` |  |  | no number format: keep as typed |
| 21 | `Unit CostRow4_2` | text | `report.spending.3.unitCost` |  |  | no number format: keep as typed |
| 21 | `Unit CostRow5_2` | text | `report.spending.4.unitCost` |  |  | no number format: keep as typed |
| 21 | `Unit CostRow6_2` | text | `report.spending.5.unitCost` |  |  | no number format: keep as typed |
| 21 | `Unit CostRow7_2` | text | `report.spending.6.unitCost` |  |  | no number format: keep as typed |
| 21 | `Unit CostRow8_2` | text | `report.spending.7.unitCost` |  |  | no number format: keep as typed |
| 21 | `Unit CostRow9_2` | text | `report.spending.8.unitCost` |  |  | no number format: keep as typed |
| 22 | `Beneficiary Name` | approvalName | `contacts.beneficiaryRep.name` |  |  | printed name; left blank when "leave printed names blank" is ticked |
| 22 | `Beneficiary Signature Date` | never |  |  |  | date beside a signature |
| 22 | `Beneficiary’s Signature` | never |  |  |  | signature field |
| 22 | `Certification Signature Date` | never |  |  |  | date beside a signature |
| 22 | `Certification of Completion Signature` | never |  |  |  | signature field |
| 22 | `Scoutmaster Final Signature Date` | never |  |  |  | date beside a signature |
| 22 | `Scoutmaster’s Final Signature` | never |  |  |  | signature field |

## Appendix D (3 pages, fields on pages 1 and 2)

Appendix D prints "Name of Organization:" and "EIN:" with **no box** to type in (design F11, string S14). "Project Description (from page 6 …)" is a section heading: its box is the one under "For what will you use the funds?". Appendix D's page references ("page 6", "page 9") are one page early for the 2026 workbook, where the description is on page 7 and the Fundraising box on page 10.

| PDF page | Field name | Kind | Draft path | Format | Note |
|---|---|---|---|---|---|
| 1 | `Name` | text | `candidate.name` |  |  |
| 1 | `Street Address` | text | `candidate.address` |  |  |
| 1 | `City` | text | `candidate.city` |  |  |
| 1 | `State` | text | `candidate.state` |  |  |
| 1 | `Email` | text | `candidate.email` |  |  |
| 1 | `Telephone` | text | `candidate.phone` |  |  |
| 1 | `Scouting America Personal ID from Scoutbook or ID card` | text | `candidate.pid` |  |  |
| 1 | `Street Address_2` | text | `contacts.beneficiary.address` |  |  |
| 1 | `City_2` | text | `contacts.beneficiary.city` |  |  |
| 1 | `State_2` | text | `contacts.beneficiary.state` |  |  |
| 1 | `Name of Representative` | text | `contacts.beneficiaryRep.name` |  |  |
| 1 | `Email_2` | text | `contacts.beneficiaryRep.email` |  |  |
| 1 | `Telephone_2` | text | `contacts.beneficiaryRep.phone` |  |  |
| 1 | `For what will you use the funds` | text | `appendixD.useOfFunds` |  |  |
| 1 | `How will you seek donations from page 9 of the Eagle Scout Leadership Service Project Workbook` | text | `proposal.fundraising` |  | same question as the workbook’s Fundraising box (on page 10 of the 2026 workbook; Appendix D says “page 9”) |
| 1 | `undefined` | money | `appendixD.howMuch` |  | "How much money do you expect to raise? $" (the PDF names this box "undefined"; no number format) |
| 1 | `of your unit or their parents` | text | `appendixD.donors` |  |  |
| 2 | `units chartered organization` | text | `appendixD.contracts` |  |  |
| 2 | `any unneeded donations to the beneficiary` | text | `appendixD.safeguarding` |  |  |
| 1 | `Birth Date` | date | `candidate.dob` | m/d/yyyy |  |
| 1 | `Proposed dates MMDDYYYY for fundraising efforts` | date | `appendixD.dates` | mm/dd/yyyy | a text box in the helper; one date (YYYY-MM-DD or M/D/YYYY) is written as MM/DD/YYYY, anything else as typed with note S10 |
| 2 | `Unit Rep Signature` | never |  |  | signature field |
| 2 | `Beneficiary Signature` | never |  |  | signature field |
| 2 | `Council Rep Signature` | never |  |  | signature field |
| 2 | `Date` | never |  |  | date beside a signature |
| 2 | `Date_2` | never |  |  | date beside a signature |
| 2 | `Date_3` | never |  |  | date beside a signature |
| 2 | `Authorized Council Approval` | never |  |  | text box in the council approval area |

## Fixed-size boxes (12 pt, never shrink)

These 81 widgets keep a 12 pt font. The 37 multi-line ones also have the PDF "do not scroll" flag, so text past the bottom is cut off on screen and in print. The 44 single-line ones scroll on screen but are cut off when printed. Sizes are the real widget sizes (2 decimals). Lines = how many 12 pt lines fit: (height − 2) ÷ (12 × 1.35), rounded down, the same rule as `mayOverflow` in `lib/official-pdf.js`. The other 351 text widgets shrink their font to fit and are not checked.

| Field name | PDF page | Width pt | Height pt | Multi-line | Lines |
|---|---|---|---|---|---|
| `Beneficiary and Impact` | 7 | 497.57 | 156.84 | yes | 9 |
| `Project Description` | 7 | 499.53 | 185.64 | yes | 11 |
| `Motivation` | 7 | 499.53 | 101.2 | yes | 6 |
| `Proposal Approved Date` | 8 | 195.16 | 15.45 |  | 1 |
| `Complete Your Plan Date` | 8 | 195.16 | 15.46 |  | 1 |
| `Planned Begin Project Date` | 8 | 195.82 | 16.11 |  | 1 |
| `Planned Completion Date` | 8 | 196.47 | 16.11 |  | 1 |
| `The Work` | 8 | 502.8 | 171.89 | yes | 10 |
| `Leadership` | 8 | 504.11 | 180.4 | yes | 11 |
| `Total People` | 9 | 59.36 | 15.18 |  | 1 |
| `Eagle Scout Candidate` | 9 | 59.41 | 15.19 |  | 1 |
| `Total Proposal Development Hours` | 9 | 59.41 | 15.72 |  | 1 |
| `Resources Needed` | 9 | 502.93 | 229.88 | yes | 14 |
| `Fundraising` | 10 | 501.49 | 196.77 | yes | 12 |
| `Safety` | 10 | 503.45 | 161.29 | yes | 9 |
| `Project Description` | 11 | 502.41 | 57.08 | yes | 3 |
| `Comments from Proposal Review` | 13 | 503.98 | 101.07 | yes | 6 |
| `The Work Present Condition or Situation` | 13 | 503.45 | 54.2 | yes | 3 |
| `Step 1` | 14 | 339.03 | 15.72 |  | 1 |
| `Step 2` | 14 | 338.51 | 15.72 |  | 1 |
| `Step 3` | 14 | 339.03 | 15.72 |  | 1 |
| `Step 4` | 14 | 339.56 | 15.72 |  | 1 |
| `Step 5` | 14 | 340.08 | 16.76 |  | 1 |
| `Step 6` | 14 | 339.03 | 14.14 |  | 1 |
| `Step 7` | 14 | 339.56 | 15.19 |  | 1 |
| `Step 8` | 14 | 339.56 | 15.72 |  | 1 |
| `Step 9` | 14 | 340.08 | 15.72 |  | 1 |
| `Step 10` | 14 | 339.56 | 15.19 |  | 1 |
| `Task or Role 1` | 14 | 101.13 | 13.71 |  | 1 |
| `Task or Role 2` | 14 | 101.13 | 13.27 |  | 1 |
| `Task or Role 3` | 14 | 101.13 | 13.71 |  | 1 |
| `Task or Role 4` | 14 | 102 | 13.71 |  | 1 |
| `Task or Role 5` | 14 | 101.56 | 13.62 |  | 1 |
| `Task or Role 6` | 14 | 100.6 | 14.15 |  | 1 |
| `Task or Role 7` | 14 | 101.13 | 12.84 |  | 1 |
| `Task or Role 8` | 14 | 100.69 | 12.84 |  | 1 |
| `Task or Role 9` | 14 | 100.25 | 13.71 |  | 1 |
| `Task or Role 10` | 14 | 100.69 | 12.4 |  | 1 |
| `Task or Role 11` | 14 | 101.56 | 13.27 |  | 1 |
| `Task or Role 12` | 14 | 102 | 13.71 |  | 1 |
| `Organizing Tasks` | 14 | 504.11 | 104.47 | yes | 6 |
| `Training and Preparing Helpers` | 15 | 504.11 | 103.82 | yes | 6 |
| `Communicating with Helpers` | 15 | 504.11 | 106.44 | yes | 6 |
| `Work Sessions` | 15 | 504.77 | 60.62 | yes | 3 |
| `Project Plan Total Hours` | 15 | 59.24 | 15.89 |  | 1 |
| `First-aid kit information` | 16 | 506.07 | 18.73 |  | 1 |
| `Name of First Aid Specialist` | 16 | 353.56 | 19.38 |  | 1 |
| `Safety Discussions with Adults` | 16 | 504.11 | 51.46 | yes | 3 |
| `PPE` | 16 | 504.77 | 58 | yes | 3 |
| `Construction Safety` | 16 | 505.42 | 40.33 | yes | 2 |
| `Tools` | 16 | 505.42 | 40.33 | yes | 2 |
| `Safety Briefing` | 16 | 504.11 | 45.56 | yes | 2 |
| `Emergency Vehicle Access` | 16 | 504.11 | 34.44 | yes | 2 |
| `Permissions or Permits` | 17 | 504.11 | 78.29 | yes | 4 |
| `Contribution from Beneficiary` | 17 | 112.04 | 16.76 |  | 1 |
| `Contributions from Exempted Sources` | 17 | 112.69 | 19.38 |  | 1 |
| `Contributions` | 17 | 112.04 | 18.07 |  | 1 |
| `Funds Raised So Far` | 17 | 114 | 17.42 |  | 1 |
| `Estimated Future Fundraising` | 17 | 112.04 | 16.76 |  | 1 |
| `Donations` | 17 | 112.04 | 16.76 |  | 1 |
| `Total Funds` | 17 | 114 | 18.07 |  | 1 |
| `Date Expected` | 17 | 82.58 | 16.11 |  | 1 |
| `Funding` | 18 | 504.77 | 75.67 | yes | 4 |
| `Logistics` | 18 | 504.77 | 60.62 | yes | 3 |
| `Transportation for Helpers` | 18 | 504.77 | 38.36 | yes | 2 |
| `Input from Beneficiary` | 18 | 504.11 | 105.13 | yes | 6 |
| `Input from Scoutmaster` | 18 | 504.11 | 84.18 | yes | 5 |
| `Observations` | 19 | 504.11 | 93.74 | yes | 5 |
| `Challenges` | 19 | 504.77 | 110.36 | yes | 6 |
| `Changes` | 19 | 503.46 | 86.8 | yes | 5 |
| `What I Learned About Leadership` | 20 | 505.42 | 105.13 | yes | 6 |
| `What Was Most Rewarding` | 20 | 504.77 | 114.95 | yes | 6 |
| `Use of Materials and Other Needs` | 20 | 504.11 | 107.75 | yes | 6 |
| `AmountCollected` | 21 | 83.24 | 22 |  | 1 |
| `AmountSpent` | 21 | 84.55 | 22 |  | 1 |
| `Difference` | 21 | 83.89 | 22 |  | 1 |
| `Difference in amounts collected and spent` | 21 | 505.42 | 54.07 | yes | 3 |
| `Acknowledgment` | 21 | 503.46 | 57.35 | yes | 3 |
| `Artificial Intelligence` | 21 | 503.46 | 75.02 | yes | 4 |
| `Certification Signature Date` | 22 | 150 | 18.73 |  | 1 |
| `Project Description` | 22 | 503.46 | 122.15 | yes | 7 |

## JS blocks for `lib/w26-model.js`

Paste as is. `FIELDS` rows are `[name, kind, path, format, firstPage, type]` (`null` means none; `type` is set only for `computed`). `APPENDIX_D_FIELDS` rows are `[name, kind, path, format, page]`. Labels are keyed by **draft path** (computed totals by field name), because Appendix D reuses some workbook field names for other people (for example `City_2` is the parent's city in the workbook and the beneficiary's city in Appendix D). `OFFICIAL` holds the exact printed wording the Classic 2026 page shows; every string in it was found in the official PDFs with the normalizer in the plan (Task 2.4).

```js
  const FIELDS = [
    ["Candidates Full Name", "text", "candidate.name", null, 1, null],
    ["Project Title", "text", "proposal.projectName", null, 1, null],
    ["Birth Date", "date", "candidate.dob", "m/d/yyyy", 5, null],
    ["City", "text", "candidate.city", null, 5, null],
    ["City_2", "text", "parent.city", null, 5, null],
    ["City_3", "text", "contacts.beneficiary.city", null, 5, null],
    ["City_4", "text", "contacts.serviceCenter.city", null, 5, null],
    ["Contact Name", "text", "contacts.serviceCenter.name", null, 5, null],
    ["Dropdown1", "choice", "unit.type", null, 5, null],
    ["Email", "text", "candidate.email", null, 5, null],
    ["Email_2", "text", "parent.email", null, 5, null],
    ["Email_3", "text", "contacts.leader.email", null, 5, null],
    ["Email_4", "text", "contacts.committee.email", null, 5, null],
    ["Email_5", "text", "contacts.beneficiary.email", null, 5, null],
    ["Email_6", "text", "contacts.beneficiaryRep.email", null, 5, null],
    ["Email_7", "text", "contacts.serviceCenter.email", null, 5, null],
    ["Email_8", "text", "contacts.approvalRep.email", null, 5, null],
    ["Email_9", "text", "contacts.coach.email", null, 5, null],
    ["Life Rank Board of Review Date", "date", "candidate.borDate", "m/d/yyyy", 5, null],
    ["Name of Council", "text", "unit.council", null, 5, null],
    ["Name of District", "text", "unit.district", null, 5, null],
    ["Name of Organization", "text", "contacts.beneficiary.name", null, 5, null],
    ["Name of Project CoachAdvisor", "text", "contacts.coach.name", null, 5, null],
    ["Name of Representative", "text", "contacts.beneficiaryRep.name", null, 5, null],
    ["Name of Representative_2", "text", "contacts.approvalRep.name", null, 5, null],
    ["Name_2", "text", "parent.name", null, 5, null],
    ["Name_4", "text", "contacts.committee.name", null, 5, null],
    ["Scoutmaster’s Name", "text", "contacts.leader.name", null, 5, null],
    ["State", "text", "candidate.state", null, 5, null],
    ["State_2", "text", "parent.state", null, 5, null],
    ["State_3", "text", "contacts.beneficiary.state", null, 5, null],
    ["State_4", "text", "contacts.serviceCenter.state", null, 5, null],
    ["Street Address", "text", "candidate.address", null, 5, null],
    ["Street Address_2", "text", "parent.address", null, 5, null],
    ["Street Address_3", "text", "contacts.beneficiary.address", null, 5, null],
    ["Street Address_4", "text", "contacts.serviceCenter.address", null, 5, null],
    ["Telephone", "text", "candidate.phone", null, 5, null],
    ["Telephone_2", "text", "parent.phone", null, 5, null],
    ["Telephone_3", "text", "contacts.leader.phone", null, 5, null],
    ["Telephone_4", "text", "contacts.committee.phone", null, 5, null],
    ["Telephone_5", "text", "contacts.beneficiary.phone", null, 5, null],
    ["Telephone_6", "text", "contacts.beneficiaryRep.phone", null, 5, null],
    ["Telephone_7", "text", "contacts.serviceCenter.phone", null, 5, null],
    ["Telephone_8", "text", "contacts.approvalRep.phone", null, 5, null],
    ["Telephone_9", "text", "contacts.coach.phone", null, 5, null],
    ["Text2", "text", "candidate.pid", null, 5, null],
    ["Unit Number", "text", "unit.number", null, 5, null],
    ["Beneficiary and Impact", "text", "proposal.beneficiaryImpact", null, 7, null],
    ["Motivation", "text", "proposal.motivation", null, 7, null],
    ["Project Description", "text", "proposal.description", null, 7, null],
    ["Complete Your Plan Date", "date", "proposal.planDate", "mm/dd/yyyy", 8, null],
    ["Leadership", "text", "proposal.leadership", null, 8, null],
    ["Planned Begin Project Date", "date", "proposal.beginDate", "mm/dd/yyyy", 8, null],
    ["Planned Completion Date", "date", "proposal.completeDate", "mm/dd/yyyy", 8, null],
    ["Proposal Approved Date", "date", "proposal.approvedDate", "mm/dd/yyyy", 8, null],
    ["The Work", "text", "proposal.work", null, 8, null],
    ["Eagle Scout Candidate", "fixed", null, "1", 9, null],
    ["Estimated Cost of Materials", "money", "proposal.costs.materials", null, 9, null],
    ["Estimated Cost of Other Needs", "money", "proposal.costs.other", null, 9, null],
    ["Estimated Cost of Supplies", "money", "proposal.costs.supplies", null, 9, null],
    ["Estimated Cost of Tools", "money", "proposal.costs.tools", null, 9, null],
    ["Other Adults", "count", "proposal.hours.4.w", null, 9, null],
    ["Other Youth", "count", "proposal.hours.2.w", null, 9, null],
    ["Registered Scouting America adults", "count", "proposal.hours.3.w", null, 9, null],
    ["Resources Needed", "text", "proposal.resources", null, 9, null],
    ["Scouting America youth", "count", "proposal.hours.1.w", null, 9, null],
    ["Total Hours Invested Eagle Scout candidate", "hours", "proposal.hours.0.h", null, 9, null],
    ["Total Hours Invested Other Adults", "hours", "proposal.hours.4.h", null, 9, null],
    ["Total Hours Invested Other Youth", "hours", "proposal.hours.2.h", null, 9, null],
    ["Total Hours Invested Registered Scouting America adults", "hours", "proposal.hours.3.h", null, 9, null],
    ["Total Hours Invested Scouting America youth", "hours", "proposal.hours.1.h", null, 9, null],
    ["Total People", "computed", null, "1 + proposal.hours[1..4].w", 9, "count"],
    ["Total Prelimary Cost Estimate", "computed", null, "sum proposal.costs", 9, "money"],
    ["Total Proposal Development Hours", "computed", null, "sum proposal.hours[0..4].h", 9, "hours"],
    ["Fundraising", "text", "proposal.fundraising", null, 10, null],
    ["Need Fundraising App?", "radio", "proposal.needFundraisingApp", null, 10, null],
    ["Safety", "text", "proposal.safety", null, 10, null],
    ["Beneficiary Approval Name", "approvalName", "contacts.beneficiaryRep.name", null, 11, null],
    ["Beneficiary Approval Signature", "never", null, null, 11, null],
    ["Beneficiary Approval Signature Date", "never", null, null, 11, null],
    ["Candidate's Promise Signature", "never", null, null, 11, null],
    ["District or Council Approval Name", "approvalName", "contacts.approvalRep.name", null, 11, null],
    ["District or Council Approval Signature", "never", null, null, 11, null],
    ["District or Council Signature Date", "never", null, null, 11, null],
    ["Promise Signature Date", "never", null, null, 11, null],
    ["Provided Copy of Info for Beneficiaries", "never", null, null, 11, null],
    ["Scoutmaster Approval Date", "never", null, null, 11, null],
    ["Scoutmaster’s Approval Signature", "never", null, null, 11, null],
    ["Unit Committee Approval Name", "approvalName", "contacts.committee.name", null, 11, null],
    ["Unit Committee Approval Signature", "never", null, null, 11, null],
    ["Unit Committee Signature Date", "never", null, null, 11, null],
    ["Comments from Proposal Review", "text", "plan.reviewComments", null, 13, null],
    ["The Work Present Condition or Situation", "text", "plan.presentCondition", null, 13, null],
    ["Adult or Youth", "text", "plan.helpers.0.adultYouth", null, 14, null],
    ["Adult or Youth_10", "text", "plan.helpers.9.adultYouth", null, 14, null],
    ["Adult or Youth_11", "text", "plan.helpers.10.adultYouth", null, 14, null],
    ["Adult or Youth_12", "text", "plan.helpers.11.adultYouth", null, 14, null],
    ["Adult or Youth_2", "text", "plan.helpers.1.adultYouth", null, 14, null],
    ["Adult or Youth_3", "text", "plan.helpers.2.adultYouth", null, 14, null],
    ["Adult or Youth_4", "text", "plan.helpers.3.adultYouth", null, 14, null],
    ["Adult or Youth_5", "text", "plan.helpers.4.adultYouth", null, 14, null],
    ["Adult or Youth_6", "text", "plan.helpers.5.adultYouth", null, 14, null],
    ["Adult or Youth_7", "text", "plan.helpers.6.adultYouth", null, 14, null],
    ["Adult or Youth_8", "text", "plan.helpers.7.adultYouth", null, 14, null],
    ["Adult or Youth_9", "text", "plan.helpers.8.adultYouth", null, 14, null],
    ["EXPECTED DURATION", "text", "plan.steps.0.duration", null, 14, null],
    ["EXPECTED DURATION10", "text", "plan.steps.9.duration", null, 14, null],
    ["EXPECTED DURATION_2", "text", "plan.steps.1.duration", null, 14, null],
    ["EXPECTED DURATION_3", "text", "plan.steps.2.duration", null, 14, null],
    ["EXPECTED DURATION_4", "text", "plan.steps.3.duration", null, 14, null],
    ["EXPECTED DURATION_5", "text", "plan.steps.4.duration", null, 14, null],
    ["EXPECTED DURATION_6", "text", "plan.steps.5.duration", null, 14, null],
    ["EXPECTED DURATION_7", "text", "plan.steps.6.duration", null, 14, null],
    ["EXPECTED DURATION_8", "text", "plan.steps.7.duration", null, 14, null],
    ["EXPECTED DURATION_9", "text", "plan.steps.8.duration", null, 14, null],
    ["Number Needed", "text", "plan.helpers.0.needed", null, 14, null],
    ["Number Needed_10", "text", "plan.helpers.9.needed", null, 14, null],
    ["Number Needed_11", "text", "plan.helpers.10.needed", null, 14, null],
    ["Number Needed_12", "text", "plan.helpers.11.needed", null, 14, null],
    ["Number Needed_2", "text", "plan.helpers.1.needed", null, 14, null],
    ["Number Needed_3", "text", "plan.helpers.2.needed", null, 14, null],
    ["Number Needed_4", "text", "plan.helpers.3.needed", null, 14, null],
    ["Number Needed_5", "text", "plan.helpers.4.needed", null, 14, null],
    ["Number Needed_6", "text", "plan.helpers.5.needed", null, 14, null],
    ["Number Needed_7", "text", "plan.helpers.6.needed", null, 14, null],
    ["Number Needed_8", "text", "plan.helpers.7.needed", null, 14, null],
    ["Number Needed_9", "text", "plan.helpers.8.needed", null, 14, null],
    ["Number So Far", "text", "plan.helpers.0.soFar", null, 14, null],
    ["Number So Far_10", "text", "plan.helpers.9.soFar", null, 14, null],
    ["Number So Far_11", "text", "plan.helpers.10.soFar", null, 14, null],
    ["Number So Far_12", "text", "plan.helpers.11.soFar", null, 14, null],
    ["Number So Far_2", "text", "plan.helpers.1.soFar", null, 14, null],
    ["Number So Far_3", "text", "plan.helpers.2.soFar", null, 14, null],
    ["Number So Far_4", "text", "plan.helpers.3.soFar", null, 14, null],
    ["Number So Far_5", "text", "plan.helpers.4.soFar", null, 14, null],
    ["Number So Far_6", "text", "plan.helpers.5.soFar", null, 14, null],
    ["Number So Far_7", "text", "plan.helpers.6.soFar", null, 14, null],
    ["Number So Far_8", "text", "plan.helpers.7.soFar", null, 14, null],
    ["Number So Far_9", "text", "plan.helpers.8.soFar", null, 14, null],
    ["Organizing Tasks", "text", "plan.organizing", null, 14, null],
    ["Skills Needed", "text", "plan.helpers.0.skills", null, 14, null],
    ["Skills Needed_10", "text", "plan.helpers.9.skills", null, 14, null],
    ["Skills Needed_11", "text", "plan.helpers.10.skills", null, 14, null],
    ["Skills Needed_12", "text", "plan.helpers.11.skills", null, 14, null],
    ["Skills Needed_2", "text", "plan.helpers.1.skills", null, 14, null],
    ["Skills Needed_3", "text", "plan.helpers.2.skills", null, 14, null],
    ["Skills Needed_4", "text", "plan.helpers.3.skills", null, 14, null],
    ["Skills Needed_5", "text", "plan.helpers.4.skills", null, 14, null],
    ["Skills Needed_6", "text", "plan.helpers.5.skills", null, 14, null],
    ["Skills Needed_7", "text", "plan.helpers.6.skills", null, 14, null],
    ["Skills Needed_8", "text", "plan.helpers.7.skills", null, 14, null],
    ["Skills Needed_9", "text", "plan.helpers.8.skills", null, 14, null],
    ["Step 1", "text", "plan.steps.0.step", null, 14, null],
    ["Step 10", "text", "plan.steps.9.step", null, 14, null],
    ["Step 2", "text", "plan.steps.1.step", null, 14, null],
    ["Step 3", "text", "plan.steps.2.step", null, 14, null],
    ["Step 4", "text", "plan.steps.3.step", null, 14, null],
    ["Step 5", "text", "plan.steps.4.step", null, 14, null],
    ["Step 6", "text", "plan.steps.5.step", null, 14, null],
    ["Step 7", "text", "plan.steps.6.step", null, 14, null],
    ["Step 8", "text", "plan.steps.7.step", null, 14, null],
    ["Step 9", "text", "plan.steps.8.step", null, 14, null],
    ["Task or Role 1", "text", "plan.helpers.0.job", null, 14, null],
    ["Task or Role 10", "text", "plan.helpers.9.job", null, 14, null],
    ["Task or Role 11", "text", "plan.helpers.10.job", null, 14, null],
    ["Task or Role 12", "text", "plan.helpers.11.job", null, 14, null],
    ["Task or Role 2", "text", "plan.helpers.1.job", null, 14, null],
    ["Task or Role 3", "text", "plan.helpers.2.job", null, 14, null],
    ["Task or Role 4", "text", "plan.helpers.3.job", null, 14, null],
    ["Task or Role 5", "text", "plan.helpers.4.job", null, 14, null],
    ["Task or Role 6", "text", "plan.helpers.5.job", null, 14, null],
    ["Task or Role 7", "text", "plan.helpers.6.job", null, 14, null],
    ["Task or Role 8", "text", "plan.helpers.7.job", null, 14, null],
    ["Task or Role 9", "text", "plan.helpers.8.job", null, 14, null],
    ["Communicating with Helpers", "text", "plan.communication", null, 15, null],
    ["Project Plan Eagle Scout Hours", "hours", "plan.hours.0.h", null, 15, null],
    ["Project Plan Other Adults", "count", "plan.hours.4.w", null, 15, null],
    ["Project Plan Other Adults Hours", "hours", "plan.hours.4.h", null, 15, null],
    ["Project Plan Other Youth", "count", "plan.hours.2.w", null, 15, null],
    ["Project Plan Other Youth Hours", "hours", "plan.hours.2.h", null, 15, null],
    ["Project Plan Registered Adult Hours", "hours", "plan.hours.3.h", null, 15, null],
    ["Project Plan Registered Scouting America Adults", "count", "plan.hours.3.w", null, 15, null],
    ["Project Plan Registered Scouting America youth members", "count", "plan.hours.1.w", null, 15, null],
    ["Project Plan Scouting America youth members hours", "hours", "plan.hours.1.h", null, 15, null],
    ["Project Plan Total Hours", "computed", null, "sum plan.hours[0..4].h", 15, "hours"],
    ["Project Plan Total Individuals", "computed", null, "1 + plan.hours[1..4].w", 15, "count"],
    ["Training and Preparing Helpers", "text", "plan.training", null, 15, null],
    ["Work Sessions", "text", "plan.workSessions", null, 15, null],
    ["Construction Safety", "text", "plan.toolSafety", null, 16, null],
    ["Emergency Vehicle Access", "text", "plan.emergencyAccess", null, 16, null],
    ["First-aid kit information", "text", "plan.firstAidKit", null, 16, null],
    ["How Problems Will Be MitigatedRow1", "text", "plan.hazards.0.prevention", null, 16, null],
    ["How Problems Will Be MitigatedRow2", "text", "plan.hazards.1.prevention", null, 16, null],
    ["How Problems Will Be MitigatedRow3", "text", "plan.hazards.2.prevention", null, 16, null],
    ["Name of First Aid Specialist", "text", "plan.firstAidSpecialist", null, 16, null],
    ["PPE", "text", "plan.ppe", null, 16, null],
    ["Potential HazardRow1", "text", "plan.hazards.0.hazard", null, 16, null],
    ["Potential HazardRow2", "text", "plan.hazards.1.hazard", null, 16, null],
    ["Potential HazardRow3", "text", "plan.hazards.2.hazard", null, 16, null],
    ["Safety Briefing", "text", "plan.safetyBriefing", null, 16, null],
    ["Safety Discussions with Adults", "text", "plan.safetyAdults", null, 16, null],
    ["Tools", "text", "plan.adultTools", null, 16, null],
    ["Contribution from Beneficiary", "money", "plan.funds.beneficiary", null, 17, null],
    ["Contributions", "money", "plan.funds.others", null, 17, null],
    ["Contributions from Exempted Sources", "money", "plan.funds.exempt", null, 17, null],
    ["Date Expected", "date", "plan.funds.futureDate", "m/d/yy", 17, null],
    ["DescriptionRow1", "text", "plan.items.0.description", null, 17, null],
    ["DescriptionRow10", "text", "plan.items.9.description", null, 17, null],
    ["DescriptionRow11", "text", "plan.items.10.description", null, 17, null],
    ["DescriptionRow12", "text", "plan.items.11.description", null, 17, null],
    ["DescriptionRow2", "text", "plan.items.1.description", null, 17, null],
    ["DescriptionRow3", "text", "plan.items.2.description", null, 17, null],
    ["DescriptionRow4", "text", "plan.items.3.description", null, 17, null],
    ["DescriptionRow5", "text", "plan.items.4.description", null, 17, null],
    ["DescriptionRow6", "text", "plan.items.5.description", null, 17, null],
    ["DescriptionRow7", "text", "plan.items.6.description", null, 17, null],
    ["DescriptionRow8", "text", "plan.items.7.description", null, 17, null],
    ["DescriptionRow9", "text", "plan.items.8.description", null, 17, null],
    ["Donations", "money", "plan.funds.donated", null, 17, null],
    ["Estimated Future Fundraising", "money", "plan.funds.future", null, 17, null],
    ["Funds Raised So Far", "computed", null, "beneficiary + exempt + others", 17, "money"],
    ["ItemRow1", "text", "plan.items.0.item", null, 17, null],
    ["ItemRow10", "text", "plan.items.9.item", null, 17, null],
    ["ItemRow11", "text", "plan.items.10.item", null, 17, null],
    ["ItemRow12", "text", "plan.items.11.item", null, 17, null],
    ["ItemRow2", "text", "plan.items.1.item", null, 17, null],
    ["ItemRow3", "text", "plan.items.2.item", null, 17, null],
    ["ItemRow4", "text", "plan.items.3.item", null, 17, null],
    ["ItemRow5", "text", "plan.items.4.item", null, 17, null],
    ["ItemRow6", "text", "plan.items.5.item", null, 17, null],
    ["ItemRow7", "text", "plan.items.6.item", null, 17, null],
    ["ItemRow8", "text", "plan.items.7.item", null, 17, null],
    ["ItemRow9", "text", "plan.items.8.item", null, 17, null],
    ["Permissions or Permits", "text", "plan.permits", null, 17, null],
    ["QuantityRow1", "text", "plan.items.0.qty", null, 17, null],
    ["QuantityRow10", "text", "plan.items.9.qty", null, 17, null],
    ["QuantityRow11", "text", "plan.items.10.qty", null, 17, null],
    ["QuantityRow12", "text", "plan.items.11.qty", null, 17, null],
    ["QuantityRow2", "text", "plan.items.1.qty", null, 17, null],
    ["QuantityRow3", "text", "plan.items.2.qty", null, 17, null],
    ["QuantityRow4", "text", "plan.items.3.qty", null, 17, null],
    ["QuantityRow5", "text", "plan.items.4.qty", null, 17, null],
    ["QuantityRow6", "text", "plan.items.5.qty", null, 17, null],
    ["QuantityRow7", "text", "plan.items.6.qty", null, 17, null],
    ["QuantityRow8", "text", "plan.items.7.qty", null, 17, null],
    ["QuantityRow9", "text", "plan.items.8.qty", null, 17, null],
    ["SourceRow1", "text", "plan.items.0.source", null, 17, null],
    ["SourceRow10", "text", "plan.items.9.source", null, 17, null],
    ["SourceRow11", "text", "plan.items.10.source", null, 17, null],
    ["SourceRow12", "text", "plan.items.11.source", null, 17, null],
    ["SourceRow2", "text", "plan.items.1.source", null, 17, null],
    ["SourceRow3", "text", "plan.items.2.source", null, 17, null],
    ["SourceRow4", "text", "plan.items.3.source", null, 17, null],
    ["SourceRow5", "text", "plan.items.4.source", null, 17, null],
    ["SourceRow6", "text", "plan.items.5.source", null, 17, null],
    ["SourceRow7", "text", "plan.items.6.source", null, 17, null],
    ["SourceRow8", "text", "plan.items.7.source", null, 17, null],
    ["SourceRow9", "text", "plan.items.8.source", null, 17, null],
    ["Total CostRow1", "computed", "plan.items.0.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostRow10", "computed", "plan.items.9.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostRow11", "computed", "plan.items.10.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostRow12", "computed", "plan.items.11.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostRow2", "computed", "plan.items.1.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostRow3", "computed", "plan.items.2.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostRow4", "computed", "plan.items.3.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostRow5", "computed", "plan.items.4.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostRow6", "computed", "plan.items.5.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostRow7", "computed", "plan.items.6.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostRow8", "computed", "plan.items.7.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostRow9", "computed", "plan.items.8.totalCost", "rowCost(row) (typed total wins, else qty x unit)", 17, "money"],
    ["Total CostTotal Cost", "computed", null, "sum of the 12 row costs", 17, "money"],
    ["Total Funds", "computed", null, "beneficiary + exempt + others + future + donated", 17, "money"],
    ["Unit CostRow1", "text", "plan.items.0.unitCost", null, 17, null],
    ["Unit CostRow10", "text", "plan.items.9.unitCost", null, 17, null],
    ["Unit CostRow11", "text", "plan.items.10.unitCost", null, 17, null],
    ["Unit CostRow12", "text", "plan.items.11.unitCost", null, 17, null],
    ["Unit CostRow2", "text", "plan.items.1.unitCost", null, 17, null],
    ["Unit CostRow3", "text", "plan.items.2.unitCost", null, 17, null],
    ["Unit CostRow4", "text", "plan.items.3.unitCost", null, 17, null],
    ["Unit CostRow5", "text", "plan.items.4.unitCost", null, 17, null],
    ["Unit CostRow6", "text", "plan.items.5.unitCost", null, 17, null],
    ["Unit CostRow7", "text", "plan.items.6.unitCost", null, 17, null],
    ["Unit CostRow8", "text", "plan.items.7.unitCost", null, 17, null],
    ["Unit CostRow9", "text", "plan.items.8.unitCost", null, 17, null],
    ["Candidate’s Promise Date", "never", null, null, 18, null],
    ["Candidate’s Promise Signature", "never", null, null, 18, null],
    ["Funding", "text", "plan.fundingSources", null, 18, null],
    ["Input from Beneficiary", "text", "plan.beneficiaryInput", null, 18, null],
    ["Input from Scoutmaster", "text", "plan.leaderInput", null, 18, null],
    ["Logistics", "text", "plan.materialTransport", null, 18, null],
    ["Transportation for Helpers", "text", "plan.workerTransport", null, 18, null],
    ["Challenges", "text", "report.challenges", null, 19, null],
    ["Changes", "text", "report.changes", null, 19, null],
    ["Observations", "text", "report.observations", null, 19, null],
    ["Eagle Scout Candidate Total Hours", "computed", null, "proposal.hours[0].h + plan.hours[0].h + report.hours[0].h", 20, "hours"],
    ["Nonregistered Adults", "count", "report.hours.4.w", null, 20, null],
    ["Nonregistered youth", "count", "report.hours.2.w", null, 20, null],
    ["Other Youth Total Hours", "computed", null, "proposal.hours[2].h + plan.hours[2].h + report.hours[2].h", 20, "hours"],
    ["Other_Adults_Total_Hours", "computed", null, "proposal.hours[4].h + plan.hours[4].h + report.hours[4].h", 20, "hours"],
    ["Project Execution Number of Hours Eagle Scout Candidate", "hours", "report.hours.0.h", null, 20, null],
    ["Project Execution Number of Hours Other Adults", "hours", "report.hours.4.h", null, 20, null],
    ["Project Execution Number of Hours Other Youth", "hours", "report.hours.2.h", null, 20, null],
    ["Project Execution Number of Hours Registered Scouting America adults", "hours", "report.hours.3.h", null, 20, null],
    ["Project Execution Number of Hours Registered Scouting America youth", "hours", "report.hours.1.h", null, 20, null],
    ["Project Execution Total Number of Hours", "computed", null, "sum report.hours[0..4].h", 20, "hours"],
    ["Registered Adults", "count", "report.hours.3.w", null, 20, null],
    ["Registered Adults Total Hours", "computed", null, "proposal.hours[3].h + plan.hours[3].h + report.hours[3].h", 20, "hours"],
    ["Registered Scouting America youth members", "count", "report.hours.1.w", null, 20, null],
    ["Total Volunteers", "computed", null, "1 + report.hours[1..4].w", 20, "count"],
    ["Total_Hours", "computed", null, "sum of the five row totals", 20, "hours"],
    ["Use of Materials and Other Needs", "text", "report.materialsUse", null, 20, null],
    ["What I Learned About Leadership", "text", "report.leadershipStyle", null, 20, null],
    ["What Was Most Rewarding", "text", "report.rewarding", null, 20, null],
    ["Youth Members Total Hours", "computed", null, "proposal.hours[1].h + plan.hours[1].h + report.hours[1].h", 20, "hours"],
    ["Acknowledgment", "text", "report.thanks", null, 21, null],
    ["AmountCollected", "money", "report.collected", null, 21, null],
    ["AmountSpent", "money", "report.spent", null, 21, null],
    ["Artificial Intelligence", "text", "report.aiUse", null, 21, null],
    ["DescriptionRow1_2", "text", "report.spending.0.description", null, 21, null],
    ["DescriptionRow2_2", "text", "report.spending.1.description", null, 21, null],
    ["DescriptionRow3_2", "text", "report.spending.2.description", null, 21, null],
    ["DescriptionRow4_2", "text", "report.spending.3.description", null, 21, null],
    ["DescriptionRow5_2", "text", "report.spending.4.description", null, 21, null],
    ["DescriptionRow6_2", "text", "report.spending.5.description", null, 21, null],
    ["DescriptionRow7_2", "text", "report.spending.6.description", null, 21, null],
    ["DescriptionRow8_2", "text", "report.spending.7.description", null, 21, null],
    ["DescriptionRow9_2", "text", "report.spending.8.description", null, 21, null],
    ["Difference", "computed", null, "collected - spent", 21, "money"],
    ["Difference in amounts collected and spent", "text", "report.differenceExplained", null, 21, null],
    ["ItemRow1_2", "text", "report.spending.0.item", null, 21, null],
    ["ItemRow2_2", "text", "report.spending.1.item", null, 21, null],
    ["ItemRow3_2", "text", "report.spending.2.item", null, 21, null],
    ["ItemRow4_2", "text", "report.spending.3.item", null, 21, null],
    ["ItemRow5_2", "text", "report.spending.4.item", null, 21, null],
    ["ItemRow6_2", "text", "report.spending.5.item", null, 21, null],
    ["ItemRow7_2", "text", "report.spending.6.item", null, 21, null],
    ["ItemRow8_2", "text", "report.spending.7.item", null, 21, null],
    ["ItemRow9_2", "text", "report.spending.8.item", null, 21, null],
    ["QuantityRow1_2", "text", "report.spending.0.qty", null, 21, null],
    ["QuantityRow2_2", "text", "report.spending.1.qty", null, 21, null],
    ["QuantityRow3_2", "text", "report.spending.2.qty", null, 21, null],
    ["QuantityRow4_2", "text", "report.spending.3.qty", null, 21, null],
    ["QuantityRow5_2", "text", "report.spending.4.qty", null, 21, null],
    ["QuantityRow6_2", "text", "report.spending.5.qty", null, 21, null],
    ["QuantityRow7_2", "text", "report.spending.6.qty", null, 21, null],
    ["QuantityRow8_2", "text", "report.spending.7.qty", null, 21, null],
    ["QuantityRow9_2", "text", "report.spending.8.qty", null, 21, null],
    ["SourceRow1_2", "text", "report.spending.0.source", null, 21, null],
    ["SourceRow2_2", "text", "report.spending.1.source", null, 21, null],
    ["SourceRow3_2", "text", "report.spending.2.source", null, 21, null],
    ["SourceRow4_2", "text", "report.spending.3.source", null, 21, null],
    ["SourceRow5_2", "text", "report.spending.4.source", null, 21, null],
    ["SourceRow6_2", "text", "report.spending.5.source", null, 21, null],
    ["SourceRow7_2", "text", "report.spending.6.source", null, 21, null],
    ["SourceRow8_2", "text", "report.spending.7.source", null, 21, null],
    ["SourceRow9_2", "text", "report.spending.8.source", null, 21, null],
    ["Total CostRow1_2", "computed", "report.spending.0.totalCost", "rowCost(row)", 21, "money"],
    ["Total CostRow2_2", "computed", "report.spending.1.totalCost", "rowCost(row)", 21, "money"],
    ["Total CostRow3_2", "computed", "report.spending.2.totalCost", "rowCost(row)", 21, "money"],
    ["Total CostRow4_2", "computed", "report.spending.3.totalCost", "rowCost(row)", 21, "money"],
    ["Total CostRow5_2", "computed", "report.spending.4.totalCost", "rowCost(row)", 21, "money"],
    ["Total CostRow6_2", "computed", "report.spending.5.totalCost", "rowCost(row)", 21, "money"],
    ["Total CostRow7_2", "computed", "report.spending.6.totalCost", "rowCost(row)", 21, "money"],
    ["Total CostRow8_2", "computed", "report.spending.7.totalCost", "rowCost(row)", 21, "money"],
    ["Total CostRow9_2", "computed", "report.spending.8.totalCost", "rowCost(row)", 21, "money"],
    ["Total CostTotal Cost_2", "computed", null, "sum of the 9 row costs", 21, "money"],
    ["Unit CostRow1_2", "text", "report.spending.0.unitCost", null, 21, null],
    ["Unit CostRow2_2", "text", "report.spending.1.unitCost", null, 21, null],
    ["Unit CostRow3_2", "text", "report.spending.2.unitCost", null, 21, null],
    ["Unit CostRow4_2", "text", "report.spending.3.unitCost", null, 21, null],
    ["Unit CostRow5_2", "text", "report.spending.4.unitCost", null, 21, null],
    ["Unit CostRow6_2", "text", "report.spending.5.unitCost", null, 21, null],
    ["Unit CostRow7_2", "text", "report.spending.6.unitCost", null, 21, null],
    ["Unit CostRow8_2", "text", "report.spending.7.unitCost", null, 21, null],
    ["Unit CostRow9_2", "text", "report.spending.8.unitCost", null, 21, null],
    ["Beneficiary Name", "approvalName", "contacts.beneficiaryRep.name", null, 22, null],
    ["Beneficiary Signature Date", "never", null, null, 22, null],
    ["Beneficiary’s Signature", "never", null, null, 22, null],
    ["Certification Signature Date", "never", null, null, 22, null],
    ["Certification of Completion Signature", "never", null, null, 22, null],
    ["Scoutmaster Final Signature Date", "never", null, null, 22, null],
    ["Scoutmaster’s Final Signature", "never", null, null, 22, null],
  ];
  const APPENDIX_D_FIELDS = [
    ["Name", "text", "candidate.name", null, 1],
    ["Street Address", "text", "candidate.address", null, 1],
    ["City", "text", "candidate.city", null, 1],
    ["State", "text", "candidate.state", null, 1],
    ["Email", "text", "candidate.email", null, 1],
    ["Telephone", "text", "candidate.phone", null, 1],
    ["Scouting America Personal ID from Scoutbook or ID card", "text", "candidate.pid", null, 1],
    ["Street Address_2", "text", "contacts.beneficiary.address", null, 1],
    ["City_2", "text", "contacts.beneficiary.city", null, 1],
    ["State_2", "text", "contacts.beneficiary.state", null, 1],
    ["Name of Representative", "text", "contacts.beneficiaryRep.name", null, 1],
    ["Email_2", "text", "contacts.beneficiaryRep.email", null, 1],
    ["Telephone_2", "text", "contacts.beneficiaryRep.phone", null, 1],
    ["For what will you use the funds", "text", "appendixD.useOfFunds", null, 1],
    ["How will you seek donations from page 9 of the Eagle Scout Leadership Service Project Workbook", "text", "proposal.fundraising", null, 1],
    ["undefined", "money", "appendixD.howMuch", null, 1],
    ["of your unit or their parents", "text", "appendixD.donors", null, 1],
    ["units chartered organization", "text", "appendixD.contracts", null, 2],
    ["any unneeded donations to the beneficiary", "text", "appendixD.safeguarding", null, 2],
    ["Birth Date", "date", "candidate.dob", "m/d/yyyy", 1],
    ["Proposed dates MMDDYYYY for fundraising efforts", "date", "appendixD.dates", "mm/dd/yyyy", 1],
    ["Unit Rep Signature", "never", null, null, 2],
    ["Beneficiary Signature", "never", null, null, 2],
    ["Council Rep Signature", "never", null, null, 2],
    ["Date", "never", null, null, 2],
    ["Date_2", "never", null, null, 2],
    ["Date_3", "never", null, null, 2],
    ["Authorized Council Approval", "never", null, null, 2],
  ];
  // [name, page, width, height, multiLine]. Helvetica 12 pt.
  const FIXED_BOXES = [
    ["Beneficiary and Impact", 7, 497.57, 156.84, true],
    ["Project Description", 7, 499.53, 185.64, true],
    ["Motivation", 7, 499.53, 101.2, true],
    ["Proposal Approved Date", 8, 195.16, 15.45, false],
    ["Complete Your Plan Date", 8, 195.16, 15.46, false],
    ["Planned Begin Project Date", 8, 195.82, 16.11, false],
    ["Planned Completion Date", 8, 196.47, 16.11, false],
    ["The Work", 8, 502.8, 171.89, true],
    ["Leadership", 8, 504.11, 180.4, true],
    ["Total People", 9, 59.36, 15.18, false],
    ["Eagle Scout Candidate", 9, 59.41, 15.19, false],
    ["Total Proposal Development Hours", 9, 59.41, 15.72, false],
    ["Resources Needed", 9, 502.93, 229.88, true],
    ["Fundraising", 10, 501.49, 196.77, true],
    ["Safety", 10, 503.45, 161.29, true],
    ["Project Description", 11, 502.41, 57.08, true],
    ["Comments from Proposal Review", 13, 503.98, 101.07, true],
    ["The Work Present Condition or Situation", 13, 503.45, 54.2, true],
    ["Step 1", 14, 339.03, 15.72, false],
    ["Step 2", 14, 338.51, 15.72, false],
    ["Step 3", 14, 339.03, 15.72, false],
    ["Step 4", 14, 339.56, 15.72, false],
    ["Step 5", 14, 340.08, 16.76, false],
    ["Step 6", 14, 339.03, 14.14, false],
    ["Step 7", 14, 339.56, 15.19, false],
    ["Step 8", 14, 339.56, 15.72, false],
    ["Step 9", 14, 340.08, 15.72, false],
    ["Step 10", 14, 339.56, 15.19, false],
    ["Task or Role 1", 14, 101.13, 13.71, false],
    ["Task or Role 2", 14, 101.13, 13.27, false],
    ["Task or Role 3", 14, 101.13, 13.71, false],
    ["Task or Role 4", 14, 102, 13.71, false],
    ["Task or Role 5", 14, 101.56, 13.62, false],
    ["Task or Role 6", 14, 100.6, 14.15, false],
    ["Task or Role 7", 14, 101.13, 12.84, false],
    ["Task or Role 8", 14, 100.69, 12.84, false],
    ["Task or Role 9", 14, 100.25, 13.71, false],
    ["Task or Role 10", 14, 100.69, 12.4, false],
    ["Task or Role 11", 14, 101.56, 13.27, false],
    ["Task or Role 12", 14, 102, 13.71, false],
    ["Organizing Tasks", 14, 504.11, 104.47, true],
    ["Training and Preparing Helpers", 15, 504.11, 103.82, true],
    ["Communicating with Helpers", 15, 504.11, 106.44, true],
    ["Work Sessions", 15, 504.77, 60.62, true],
    ["Project Plan Total Hours", 15, 59.24, 15.89, false],
    ["First-aid kit information", 16, 506.07, 18.73, false],
    ["Name of First Aid Specialist", 16, 353.56, 19.38, false],
    ["Safety Discussions with Adults", 16, 504.11, 51.46, true],
    ["PPE", 16, 504.77, 58, true],
    ["Construction Safety", 16, 505.42, 40.33, true],
    ["Tools", 16, 505.42, 40.33, true],
    ["Safety Briefing", 16, 504.11, 45.56, true],
    ["Emergency Vehicle Access", 16, 504.11, 34.44, true],
    ["Permissions or Permits", 17, 504.11, 78.29, true],
    ["Contribution from Beneficiary", 17, 112.04, 16.76, false],
    ["Contributions from Exempted Sources", 17, 112.69, 19.38, false],
    ["Contributions", 17, 112.04, 18.07, false],
    ["Funds Raised So Far", 17, 114, 17.42, false],
    ["Estimated Future Fundraising", 17, 112.04, 16.76, false],
    ["Donations", 17, 112.04, 16.76, false],
    ["Total Funds", 17, 114, 18.07, false],
    ["Date Expected", 17, 82.58, 16.11, false],
    ["Funding", 18, 504.77, 75.67, true],
    ["Logistics", 18, 504.77, 60.62, true],
    ["Transportation for Helpers", 18, 504.77, 38.36, true],
    ["Input from Beneficiary", 18, 504.11, 105.13, true],
    ["Input from Scoutmaster", 18, 504.11, 84.18, true],
    ["Observations", 19, 504.11, 93.74, true],
    ["Challenges", 19, 504.77, 110.36, true],
    ["Changes", 19, 503.46, 86.8, true],
    ["What I Learned About Leadership", 20, 505.42, 105.13, true],
    ["What Was Most Rewarding", 20, 504.77, 114.95, true],
    ["Use of Materials and Other Needs", 20, 504.11, 107.75, true],
    ["AmountCollected", 21, 83.24, 22, false],
    ["AmountSpent", 21, 84.55, 22, false],
    ["Difference", 21, 83.89, 22, false],
    ["Difference in amounts collected and spent", 21, 505.42, 54.07, true],
    ["Acknowledgment", 21, 503.46, 57.35, true],
    ["Artificial Intelligence", 21, 503.46, 75.02, true],
    ["Certification Signature Date", 22, 150, 18.73, false],
    ["Project Description", 22, 503.46, 122.15, true],
  ];
  // Plain names for warnings in the workbook, by draft path.
  const LABELS = {
    "candidate.name": "Your name",
    "proposal.projectName": "Project title",
    "candidate.dob": "Your birth date",
    "candidate.borDate": "Your Life Rank board of review date",
    "candidate.address": "Your street address",
    "candidate.city": "Your city",
    "candidate.state": "Your state",
    "candidate.email": "Your email",
    "candidate.phone": "Your telephone",
    "candidate.pid": "Your Scouting America Personal ID",
    "parent.name": "Parent or guardian name",
    "parent.address": "Parent or guardian street address",
    "parent.city": "Parent or guardian city",
    "parent.state": "Parent or guardian state",
    "parent.email": "Parent or guardian email",
    "parent.phone": "Parent or guardian telephone",
    "unit.number": "Unit number",
    "unit.district": "Name of district",
    "unit.council": "Name of council",
    "contacts.leader.name": "Scoutmaster name",
    "contacts.leader.email": "Scoutmaster email",
    "contacts.leader.phone": "Scoutmaster telephone",
    "contacts.committee.name": "Unit committee representative name",
    "contacts.committee.email": "Unit committee representative email",
    "contacts.committee.phone": "Unit committee representative telephone",
    "contacts.beneficiary.name": "Beneficiary organization name",
    "contacts.beneficiary.address": "Beneficiary organization street address",
    "contacts.beneficiary.city": "Beneficiary organization city",
    "contacts.beneficiary.state": "Beneficiary organization state",
    "contacts.beneficiary.email": "Beneficiary organization email",
    "contacts.beneficiary.phone": "Beneficiary organization telephone",
    "contacts.beneficiaryRep.name": "Beneficiary representative name",
    "contacts.beneficiaryRep.email": "Beneficiary representative email",
    "contacts.beneficiaryRep.phone": "Beneficiary representative telephone",
    "contacts.serviceCenter.name": "Council service center name",
    "contacts.serviceCenter.address": "Council service center street address",
    "contacts.serviceCenter.city": "Council service center city",
    "contacts.serviceCenter.state": "Council service center state",
    "contacts.serviceCenter.email": "Council service center email",
    "contacts.serviceCenter.phone": "Council service center telephone",
    "contacts.approvalRep.name": "Council or district approval representative name",
    "contacts.approvalRep.email": "Council or district approval representative email",
    "contacts.approvalRep.phone": "Council or district approval representative telephone",
    "contacts.coach.name": "Project coach/advisor name",
    "contacts.coach.email": "Project coach/advisor email",
    "contacts.coach.phone": "Project coach/advisor telephone",
    "unit.type": "Unit type",
    "proposal.beneficiaryImpact": "Beneficiary and Impact",
    "proposal.description": "Project Description",
    "proposal.motivation": "Motivation",
    "proposal.work": "The Work",
    "proposal.leadership": "Leadership",
    "proposal.resources": "Resources Needed",
    "proposal.fundraising": "Fundraising",
    "proposal.safety": "Safety",
    "proposal.approvedDate": "When you expect your proposal to be approved",
    "proposal.planDate": "When you expect to complete your plan",
    "proposal.beginDate": "When you expect to begin actual work",
    "proposal.completeDate": "When you think your project report will be complete",
    "proposal.hours.0.h": "Estimated time (proposal), Eagle Scout candidate, total hours",
    "proposal.hours.1.w": "Estimated time (proposal), Registered youth members, number of individuals",
    "proposal.hours.1.h": "Estimated time (proposal), Registered youth members, total hours",
    "proposal.hours.2.w": "Estimated time (proposal), Other youth, number of individuals",
    "proposal.hours.2.h": "Estimated time (proposal), Other youth, total hours",
    "proposal.hours.3.w": "Estimated time (proposal), Registered adults, number of individuals",
    "proposal.hours.3.h": "Estimated time (proposal), Registered adults, total hours",
    "proposal.hours.4.w": "Estimated time (proposal), Other adults, number of individuals",
    "proposal.hours.4.h": "Estimated time (proposal), Other adults, total hours",
    "proposal.costs.materials": "Preliminary cost: materials",
    "proposal.costs.supplies": "Preliminary cost: supplies",
    "proposal.costs.tools": "Preliminary cost: tools",
    "proposal.costs.other": "Preliminary cost: other needs",
    "proposal.needFundraisingApp": "Whether you need a Fundraising Application",
    "plan.reviewComments": "Comments from your proposal review",
    "plan.presentCondition": "Present condition or situation",
    "plan.steps.0.step": "Project steps, row 1, Step",
    "plan.steps.0.duration": "Project steps, row 1, Expected duration",
    "plan.steps.1.step": "Project steps, row 2, Step",
    "plan.steps.1.duration": "Project steps, row 2, Expected duration",
    "plan.steps.2.step": "Project steps, row 3, Step",
    "plan.steps.2.duration": "Project steps, row 3, Expected duration",
    "plan.steps.3.step": "Project steps, row 4, Step",
    "plan.steps.3.duration": "Project steps, row 4, Expected duration",
    "plan.steps.4.step": "Project steps, row 5, Step",
    "plan.steps.4.duration": "Project steps, row 5, Expected duration",
    "plan.steps.5.step": "Project steps, row 6, Step",
    "plan.steps.5.duration": "Project steps, row 6, Expected duration",
    "plan.steps.6.step": "Project steps, row 7, Step",
    "plan.steps.6.duration": "Project steps, row 7, Expected duration",
    "plan.steps.7.step": "Project steps, row 8, Step",
    "plan.steps.7.duration": "Project steps, row 8, Expected duration",
    "plan.steps.8.step": "Project steps, row 9, Step",
    "plan.steps.8.duration": "Project steps, row 9, Expected duration",
    "plan.steps.9.step": "Project steps, row 10, Step",
    "plan.steps.9.duration": "Project steps, row 10, Expected duration",
    "plan.helpers.0.job": "Leading others, row 1, Task or role",
    "plan.helpers.0.skills": "Leading others, row 1, Skills needed",
    "plan.helpers.0.adultYouth": "Leading others, row 1, Adult or youth",
    "plan.helpers.0.needed": "Leading others, row 1, Number needed",
    "plan.helpers.0.soFar": "Leading others, row 1, Number so far",
    "plan.helpers.1.job": "Leading others, row 2, Task or role",
    "plan.helpers.1.skills": "Leading others, row 2, Skills needed",
    "plan.helpers.1.adultYouth": "Leading others, row 2, Adult or youth",
    "plan.helpers.1.needed": "Leading others, row 2, Number needed",
    "plan.helpers.1.soFar": "Leading others, row 2, Number so far",
    "plan.helpers.2.job": "Leading others, row 3, Task or role",
    "plan.helpers.2.skills": "Leading others, row 3, Skills needed",
    "plan.helpers.2.adultYouth": "Leading others, row 3, Adult or youth",
    "plan.helpers.2.needed": "Leading others, row 3, Number needed",
    "plan.helpers.2.soFar": "Leading others, row 3, Number so far",
    "plan.helpers.3.job": "Leading others, row 4, Task or role",
    "plan.helpers.3.skills": "Leading others, row 4, Skills needed",
    "plan.helpers.3.adultYouth": "Leading others, row 4, Adult or youth",
    "plan.helpers.3.needed": "Leading others, row 4, Number needed",
    "plan.helpers.3.soFar": "Leading others, row 4, Number so far",
    "plan.helpers.4.job": "Leading others, row 5, Task or role",
    "plan.helpers.4.skills": "Leading others, row 5, Skills needed",
    "plan.helpers.4.adultYouth": "Leading others, row 5, Adult or youth",
    "plan.helpers.4.needed": "Leading others, row 5, Number needed",
    "plan.helpers.4.soFar": "Leading others, row 5, Number so far",
    "plan.helpers.5.job": "Leading others, row 6, Task or role",
    "plan.helpers.5.skills": "Leading others, row 6, Skills needed",
    "plan.helpers.5.adultYouth": "Leading others, row 6, Adult or youth",
    "plan.helpers.5.needed": "Leading others, row 6, Number needed",
    "plan.helpers.5.soFar": "Leading others, row 6, Number so far",
    "plan.helpers.6.job": "Leading others, row 7, Task or role",
    "plan.helpers.6.skills": "Leading others, row 7, Skills needed",
    "plan.helpers.6.adultYouth": "Leading others, row 7, Adult or youth",
    "plan.helpers.6.needed": "Leading others, row 7, Number needed",
    "plan.helpers.6.soFar": "Leading others, row 7, Number so far",
    "plan.helpers.7.job": "Leading others, row 8, Task or role",
    "plan.helpers.7.skills": "Leading others, row 8, Skills needed",
    "plan.helpers.7.adultYouth": "Leading others, row 8, Adult or youth",
    "plan.helpers.7.needed": "Leading others, row 8, Number needed",
    "plan.helpers.7.soFar": "Leading others, row 8, Number so far",
    "plan.helpers.8.job": "Leading others, row 9, Task or role",
    "plan.helpers.8.skills": "Leading others, row 9, Skills needed",
    "plan.helpers.8.adultYouth": "Leading others, row 9, Adult or youth",
    "plan.helpers.8.needed": "Leading others, row 9, Number needed",
    "plan.helpers.8.soFar": "Leading others, row 9, Number so far",
    "plan.helpers.9.job": "Leading others, row 10, Task or role",
    "plan.helpers.9.skills": "Leading others, row 10, Skills needed",
    "plan.helpers.9.adultYouth": "Leading others, row 10, Adult or youth",
    "plan.helpers.9.needed": "Leading others, row 10, Number needed",
    "plan.helpers.9.soFar": "Leading others, row 10, Number so far",
    "plan.helpers.10.job": "Leading others, row 11, Task or role",
    "plan.helpers.10.skills": "Leading others, row 11, Skills needed",
    "plan.helpers.10.adultYouth": "Leading others, row 11, Adult or youth",
    "plan.helpers.10.needed": "Leading others, row 11, Number needed",
    "plan.helpers.10.soFar": "Leading others, row 11, Number so far",
    "plan.helpers.11.job": "Leading others, row 12, Task or role",
    "plan.helpers.11.skills": "Leading others, row 12, Skills needed",
    "plan.helpers.11.adultYouth": "Leading others, row 12, Adult or youth",
    "plan.helpers.11.needed": "Leading others, row 12, Number needed",
    "plan.helpers.11.soFar": "Leading others, row 12, Number so far",
    "plan.organizing": "Organizing tasks",
    "plan.training": "Training or preparing helpers",
    "plan.communication": "Communicating with helpers",
    "plan.workSessions": "Work sessions",
    "plan.hours.0.h": "Time (plan), Eagle Scout candidate, total hours",
    "plan.hours.1.w": "Time (plan), Registered youth members, number of individuals",
    "plan.hours.1.h": "Time (plan), Registered youth members, total hours",
    "plan.hours.2.w": "Time (plan), Other youth, number of individuals",
    "plan.hours.2.h": "Time (plan), Other youth, total hours",
    "plan.hours.3.w": "Time (plan), Registered adults, number of individuals",
    "plan.hours.3.h": "Time (plan), Registered adults, total hours",
    "plan.hours.4.w": "Time (plan), Other adults, number of individuals",
    "plan.hours.4.h": "Time (plan), Other adults, total hours",
    "plan.firstAidKit": "First aid kit",
    "plan.firstAidSpecialist": "First aid specialist",
    "plan.safetyAdults": "Adults you talked with about safety",
    "plan.ppe": "Personal protective equipment",
    "plan.toolSafety": "Tools in good condition and used safely",
    "plan.adultTools": "Tools only adults may operate",
    "plan.safetyBriefing": "Safety briefing",
    "plan.emergencyAccess": "Emergency vehicle access",
    "plan.permits": "Permissions or permits",
    "plan.hazards.0.hazard": "Hazards, row 1, Potential hazard",
    "plan.hazards.0.prevention": "Hazards, row 1, How problems will be mitigated",
    "plan.hazards.1.hazard": "Hazards, row 2, Potential hazard",
    "plan.hazards.1.prevention": "Hazards, row 2, How problems will be mitigated",
    "plan.hazards.2.hazard": "Hazards, row 3, Potential hazard",
    "plan.hazards.2.prevention": "Hazards, row 3, How problems will be mitigated",
    "plan.items.0.item": "Materials, supplies, tools, or other needs, row 1, Item",
    "plan.items.0.description": "Materials, supplies, tools, or other needs, row 1, Description",
    "plan.items.0.qty": "Materials, supplies, tools, or other needs, row 1, Quantity",
    "plan.items.0.unitCost": "Materials, supplies, tools, or other needs, row 1, Unit cost",
    "plan.items.0.source": "Materials, supplies, tools, or other needs, row 1, Source",
    "plan.items.1.item": "Materials, supplies, tools, or other needs, row 2, Item",
    "plan.items.1.description": "Materials, supplies, tools, or other needs, row 2, Description",
    "plan.items.1.qty": "Materials, supplies, tools, or other needs, row 2, Quantity",
    "plan.items.1.unitCost": "Materials, supplies, tools, or other needs, row 2, Unit cost",
    "plan.items.1.source": "Materials, supplies, tools, or other needs, row 2, Source",
    "plan.items.2.item": "Materials, supplies, tools, or other needs, row 3, Item",
    "plan.items.2.description": "Materials, supplies, tools, or other needs, row 3, Description",
    "plan.items.2.qty": "Materials, supplies, tools, or other needs, row 3, Quantity",
    "plan.items.2.unitCost": "Materials, supplies, tools, or other needs, row 3, Unit cost",
    "plan.items.2.source": "Materials, supplies, tools, or other needs, row 3, Source",
    "plan.items.3.item": "Materials, supplies, tools, or other needs, row 4, Item",
    "plan.items.3.description": "Materials, supplies, tools, or other needs, row 4, Description",
    "plan.items.3.qty": "Materials, supplies, tools, or other needs, row 4, Quantity",
    "plan.items.3.unitCost": "Materials, supplies, tools, or other needs, row 4, Unit cost",
    "plan.items.3.source": "Materials, supplies, tools, or other needs, row 4, Source",
    "plan.items.4.item": "Materials, supplies, tools, or other needs, row 5, Item",
    "plan.items.4.description": "Materials, supplies, tools, or other needs, row 5, Description",
    "plan.items.4.qty": "Materials, supplies, tools, or other needs, row 5, Quantity",
    "plan.items.4.unitCost": "Materials, supplies, tools, or other needs, row 5, Unit cost",
    "plan.items.4.source": "Materials, supplies, tools, or other needs, row 5, Source",
    "plan.items.5.item": "Materials, supplies, tools, or other needs, row 6, Item",
    "plan.items.5.description": "Materials, supplies, tools, or other needs, row 6, Description",
    "plan.items.5.qty": "Materials, supplies, tools, or other needs, row 6, Quantity",
    "plan.items.5.unitCost": "Materials, supplies, tools, or other needs, row 6, Unit cost",
    "plan.items.5.source": "Materials, supplies, tools, or other needs, row 6, Source",
    "plan.items.6.item": "Materials, supplies, tools, or other needs, row 7, Item",
    "plan.items.6.description": "Materials, supplies, tools, or other needs, row 7, Description",
    "plan.items.6.qty": "Materials, supplies, tools, or other needs, row 7, Quantity",
    "plan.items.6.unitCost": "Materials, supplies, tools, or other needs, row 7, Unit cost",
    "plan.items.6.source": "Materials, supplies, tools, or other needs, row 7, Source",
    "plan.items.7.item": "Materials, supplies, tools, or other needs, row 8, Item",
    "plan.items.7.description": "Materials, supplies, tools, or other needs, row 8, Description",
    "plan.items.7.qty": "Materials, supplies, tools, or other needs, row 8, Quantity",
    "plan.items.7.unitCost": "Materials, supplies, tools, or other needs, row 8, Unit cost",
    "plan.items.7.source": "Materials, supplies, tools, or other needs, row 8, Source",
    "plan.items.8.item": "Materials, supplies, tools, or other needs, row 9, Item",
    "plan.items.8.description": "Materials, supplies, tools, or other needs, row 9, Description",
    "plan.items.8.qty": "Materials, supplies, tools, or other needs, row 9, Quantity",
    "plan.items.8.unitCost": "Materials, supplies, tools, or other needs, row 9, Unit cost",
    "plan.items.8.source": "Materials, supplies, tools, or other needs, row 9, Source",
    "plan.items.9.item": "Materials, supplies, tools, or other needs, row 10, Item",
    "plan.items.9.description": "Materials, supplies, tools, or other needs, row 10, Description",
    "plan.items.9.qty": "Materials, supplies, tools, or other needs, row 10, Quantity",
    "plan.items.9.unitCost": "Materials, supplies, tools, or other needs, row 10, Unit cost",
    "plan.items.9.source": "Materials, supplies, tools, or other needs, row 10, Source",
    "plan.items.10.item": "Materials, supplies, tools, or other needs, row 11, Item",
    "plan.items.10.description": "Materials, supplies, tools, or other needs, row 11, Description",
    "plan.items.10.qty": "Materials, supplies, tools, or other needs, row 11, Quantity",
    "plan.items.10.unitCost": "Materials, supplies, tools, or other needs, row 11, Unit cost",
    "plan.items.10.source": "Materials, supplies, tools, or other needs, row 11, Source",
    "plan.items.11.item": "Materials, supplies, tools, or other needs, row 12, Item",
    "plan.items.11.description": "Materials, supplies, tools, or other needs, row 12, Description",
    "plan.items.11.qty": "Materials, supplies, tools, or other needs, row 12, Quantity",
    "plan.items.11.unitCost": "Materials, supplies, tools, or other needs, row 12, Unit cost",
    "plan.items.11.source": "Materials, supplies, tools, or other needs, row 12, Source",
    "plan.funds.beneficiary": "Contribution from beneficiary",
    "plan.funds.exempt": "Contributions from exempted sources",
    "plan.funds.others": "Contributions from others",
    "plan.funds.future": "Money you expect to raise",
    "plan.funds.donated": "Donations of materials, tools, or other items",
    "plan.funds.futureDate": "Date expected",
    "plan.fundingSources": "Source of funds",
    "plan.materialTransport": "Transporting materials, supplies, and tools",
    "plan.workerTransport": "Helpers’ transportation and restrooms",
    "plan.beneficiaryInput": "Input from beneficiary",
    "plan.leaderInput": "Input from Scoutmaster",
    "report.observations": "Observations",
    "report.challenges": "What was challenging",
    "report.changes": "Changes",
    "report.leadershipStyle": "Your leadership style",
    "report.rewarding": "Most rewarding and most challenging",
    "report.materialsUse": "Use of materials, supplies, tools, and other needs",
    "report.hours.0.h": "Time (report), Eagle Scout candidate, number of hours",
    "report.hours.1.w": "Time (report), Registered youth members, number of workers",
    "report.hours.1.h": "Time (report), Registered youth members, number of hours",
    "report.hours.2.w": "Time (report), Other youth, number of workers",
    "report.hours.2.h": "Time (report), Other youth, number of hours",
    "report.hours.3.w": "Time (report), Registered adults, number of workers",
    "report.hours.3.h": "Time (report), Registered adults, number of hours",
    "report.hours.4.w": "Time (report), Other adults, number of workers",
    "report.hours.4.h": "Time (report), Other adults, number of hours",
    "report.spending.0.item": "Spending summary, row 1, Item",
    "report.spending.0.description": "Spending summary, row 1, Description",
    "report.spending.0.qty": "Spending summary, row 1, Quantity",
    "report.spending.0.unitCost": "Spending summary, row 1, Unit cost",
    "report.spending.0.source": "Spending summary, row 1, Source",
    "report.spending.1.item": "Spending summary, row 2, Item",
    "report.spending.1.description": "Spending summary, row 2, Description",
    "report.spending.1.qty": "Spending summary, row 2, Quantity",
    "report.spending.1.unitCost": "Spending summary, row 2, Unit cost",
    "report.spending.1.source": "Spending summary, row 2, Source",
    "report.spending.2.item": "Spending summary, row 3, Item",
    "report.spending.2.description": "Spending summary, row 3, Description",
    "report.spending.2.qty": "Spending summary, row 3, Quantity",
    "report.spending.2.unitCost": "Spending summary, row 3, Unit cost",
    "report.spending.2.source": "Spending summary, row 3, Source",
    "report.spending.3.item": "Spending summary, row 4, Item",
    "report.spending.3.description": "Spending summary, row 4, Description",
    "report.spending.3.qty": "Spending summary, row 4, Quantity",
    "report.spending.3.unitCost": "Spending summary, row 4, Unit cost",
    "report.spending.3.source": "Spending summary, row 4, Source",
    "report.spending.4.item": "Spending summary, row 5, Item",
    "report.spending.4.description": "Spending summary, row 5, Description",
    "report.spending.4.qty": "Spending summary, row 5, Quantity",
    "report.spending.4.unitCost": "Spending summary, row 5, Unit cost",
    "report.spending.4.source": "Spending summary, row 5, Source",
    "report.spending.5.item": "Spending summary, row 6, Item",
    "report.spending.5.description": "Spending summary, row 6, Description",
    "report.spending.5.qty": "Spending summary, row 6, Quantity",
    "report.spending.5.unitCost": "Spending summary, row 6, Unit cost",
    "report.spending.5.source": "Spending summary, row 6, Source",
    "report.spending.6.item": "Spending summary, row 7, Item",
    "report.spending.6.description": "Spending summary, row 7, Description",
    "report.spending.6.qty": "Spending summary, row 7, Quantity",
    "report.spending.6.unitCost": "Spending summary, row 7, Unit cost",
    "report.spending.6.source": "Spending summary, row 7, Source",
    "report.spending.7.item": "Spending summary, row 8, Item",
    "report.spending.7.description": "Spending summary, row 8, Description",
    "report.spending.7.qty": "Spending summary, row 8, Quantity",
    "report.spending.7.unitCost": "Spending summary, row 8, Unit cost",
    "report.spending.7.source": "Spending summary, row 8, Source",
    "report.spending.8.item": "Spending summary, row 9, Item",
    "report.spending.8.description": "Spending summary, row 9, Description",
    "report.spending.8.qty": "Spending summary, row 9, Quantity",
    "report.spending.8.unitCost": "Spending summary, row 9, Unit cost",
    "report.spending.8.source": "Spending summary, row 9, Source",
    "report.collected": "How much was collected",
    "report.spent": "How much was spent",
    "report.differenceExplained": "Explaining the difference",
    "report.thanks": "Acknowledgment",
    "report.aiUse": "Artificial intelligence"
  };
  // Plain names for warnings about the computed totals, by field name.
  const COMPUTED_LABELS = {
    "Total People": "Estimated time (proposal), grand total of individuals",
    "Total Proposal Development Hours": "Estimated time (proposal), grand total of hours",
    "Total Prelimary Cost Estimate": "Preliminary cost estimate, total",
    "Project Plan Total Individuals": "Time (plan), grand total of individuals",
    "Project Plan Total Hours": "Time (plan), grand total of hours",
    "Total CostRow1": "Materials, supplies, tools, or other needs, row 1, Total cost",
    "Total CostRow2": "Materials, supplies, tools, or other needs, row 2, Total cost",
    "Total CostRow3": "Materials, supplies, tools, or other needs, row 3, Total cost",
    "Total CostRow4": "Materials, supplies, tools, or other needs, row 4, Total cost",
    "Total CostRow5": "Materials, supplies, tools, or other needs, row 5, Total cost",
    "Total CostRow6": "Materials, supplies, tools, or other needs, row 6, Total cost",
    "Total CostRow7": "Materials, supplies, tools, or other needs, row 7, Total cost",
    "Total CostRow8": "Materials, supplies, tools, or other needs, row 8, Total cost",
    "Total CostRow9": "Materials, supplies, tools, or other needs, row 9, Total cost",
    "Total CostRow10": "Materials, supplies, tools, or other needs, row 10, Total cost",
    "Total CostRow11": "Materials, supplies, tools, or other needs, row 11, Total cost",
    "Total CostRow12": "Materials, supplies, tools, or other needs, row 12, Total cost",
    "Total CostTotal Cost": "Materials, supplies, tools, or other needs, total cost",
    "Funds Raised So Far": "Total funds available or raised so far",
    "Total Funds": "Total funds",
    "Eagle Scout Candidate Total Hours": "Time (report), Eagle Scout candidate, total hours",
    "Youth Members Total Hours": "Time (report), Registered youth members, total hours",
    "Other Youth Total Hours": "Time (report), Other youth, total hours",
    "Registered Adults Total Hours": "Time (report), Registered adults, total hours",
    "Other_Adults_Total_Hours": "Time (report), Other adults, total hours",
    "Total Volunteers": "Time (report), grand total of workers",
    "Project Execution Total Number of Hours": "Time (report), grand total of execution hours",
    "Total_Hours": "Time (report), grand total of hours",
    "Total CostRow1_2": "Spending summary, row 1, Total cost",
    "Total CostRow2_2": "Spending summary, row 2, Total cost",
    "Total CostRow3_2": "Spending summary, row 3, Total cost",
    "Total CostRow4_2": "Spending summary, row 4, Total cost",
    "Total CostRow5_2": "Spending summary, row 5, Total cost",
    "Total CostRow6_2": "Spending summary, row 6, Total cost",
    "Total CostRow7_2": "Spending summary, row 7, Total cost",
    "Total CostRow8_2": "Spending summary, row 8, Total cost",
    "Total CostRow9_2": "Spending summary, row 9, Total cost",
    "Total CostTotal Cost_2": "Spending summary, total cost",
    "Difference": "Difference between collected and spent"
  };
  // Plain names for warnings in Appendix D, by draft path.
  const APPENDIX_D_LABELS = {
    "candidate.name": "Your name",
    "candidate.address": "Your street address",
    "candidate.city": "Your city",
    "candidate.state": "Your state",
    "candidate.email": "Your email",
    "candidate.phone": "Your telephone",
    "candidate.pid": "Your Scouting America Personal ID",
    "contacts.beneficiary.address": "Beneficiary street address",
    "contacts.beneficiary.city": "Beneficiary city",
    "contacts.beneficiary.state": "Beneficiary state",
    "contacts.beneficiaryRep.name": "Beneficiary representative name",
    "contacts.beneficiaryRep.email": "Beneficiary representative email",
    "contacts.beneficiaryRep.phone": "Beneficiary representative telephone",
    "appendixD.useOfFunds": "What the funds are for",
    "proposal.fundraising": "How you will seek donations",
    "appendixD.howMuch": "How much money you expect to raise",
    "appendixD.donors": "Donors",
    "appendixD.contracts": "Contracts",
    "appendixD.safeguarding": "Safeguarding donations",
    "candidate.dob": "Your birth date",
    "appendixD.dates": "Proposed dates for fundraising"
  };
  // Exact printed wording. boxes: path -> [page, label, help]; appendixD: path -> [page, label, help] (Appendix D pages);
  // sections: id -> [page, title, intro]; tables: id -> [page, [headers or row labels]]. help/intro may be "".
  const OFFICIAL = {
    "boxes": {
        "proposal.beneficiaryImpact": [
            7,
            "Beneficiary and Impact",
            "Who is your beneficiary? How are they part of the community? Explain the mission and function of your beneficiary. Tell how your project will further your beneficiary’s mission or be helpful to those served by the beneficiary. Share details about how your beneficiary’s programs and services are used, or approximately how many people will be impacted by your efforts. Add an attachment if you need more space."
        ],
        "proposal.description": [
            7,
            "Project Description",
            "Describe your project – what you propose to do, where you propose to do it, the size or scope of the project, and other details to help the beneficiary and Scouting America reviewers understand your proposal. Attach images on a separate page if appropriate."
        ],
        "proposal.motivation": [
            7,
            "Motivation",
            "Why do you want to do this project? Why is this cause important to you? How will this project help you to grow and develop? What do you expect to learn?"
        ],
        "proposal.work": [
            8,
            "The Work",
            "What kind of work or activity do you envision your project involving? What different kinds of tasks will be involved? How will you organize the work so you can accomplish your objectives? Which tasks will you delegate?"
        ],
        "proposal.leadership": [
            8,
            "Leadership",
            "How will you show leadership? You must demonstrate leadership of at least two people in addition to yourself. This is not a family project like the one described in the Family Life merit badge. Your family members may assist, but you must recruit the help needed to complete the project. How many people do you expect to need? Helpers may be involved in Scouting, or not, and of any age appropriate for the work. Who will you recruit? How will you obtain the “right” number (neither too few nor too many)? What types of people will you be leading? How will you organize and train those who will assist you? How will you delegate authority to others?"
        ],
        "proposal.resources": [
            9,
            "Resources Needed - Materials, Supplies, Tools, and Other Needs",
            "What types of materials, supplies, tools, or other needs will be required to complete your project? Refer to Scouting America SAFE Project Tool Use. This task is similar to crafting a shopping list of food for a camping trip. You probably won’t have the exact number, weights, or sizes at this point. That’s okay. You will develop a detailed list and exact quantities during the planning stage of your project. For now, a list of materials, supplies, tools, and other needs with basic description or dimensions is sufficient."
        ],
        "proposal.fundraising": [
            10,
            "Fundraising",
            "How will you raise the money to pay for the project? If you intend to seek “in-kind” donations of materials, services, supplies, tools, or other items, explain how you propose to do that. Consult the Fundraising Application (Appendix D). Ask your Scoutmaster for local council fundraising procedures."
        ],
        "proposal.safety": [
            10,
            "Safety",
            "An Eagle Scout Leadership Service Project is a unit activity that must follow Scouting America’s Safeguarding Youth policies, including having at least two registered adult leaders 21 years of age or older at all times. A registered female adult leader 21 years of age or older must be present for any activity involving female youth or female program participants. While adults are accountable for safety, you are responsible for planning a project that will be safe for all. As with any Scouting activity, you must follow the Guide to Safe Scouting and all current Scouting America safety policies. Consider: How will you recruit the registered adults responsible for safety at your project? How will you communicate with them, so they have enough advance warning that they can fit your project into their schedule? What risks do you foresee that might occur during your project? How will you mitigate those risks? Who will you work with to develop contingency plans? What permissions will you need to carry out your project? For example, you might need a principal, superintendent, or school board, not a teacher to approve a project at a school. If you are digging, many states require someone to contact 811, “Julie,” “Miss Dig,” “Miss Utility,” or another service unique to your state so that they can notify utility companies to mark their underground facilities before work begins. This helps prevent injuries, service outages, and costly damage. What permits will be needed, who will get them, and when will they be requested?"
        ],
        "plan.reviewComments": [
            13,
            "Comments from Your Proposal Review",
            "What comments or advice did you get from your beneficiary, Scoutmaster, troop committee, and council/district Eagle representative when they reviewed your proposal? How did their comments affect your thinking about the project? What significant changes, if any, did you make?"
        ],
        "plan.presentCondition": [
            13,
            "The Work – Present Condition or Situation",
            "Describe the present state of the project site. If your project is an event or activity rather than a construction project, describe factors at the site that may present challenges. Provide “before” photos, sketches, and description as applicable. Attach these items on a separate page rather than inserting them into the workbook."
        ],
        "plan.organizing": [
            14,
            "Organizing Tasks",
            "How do you plan to organize the tasks so your helpers work efficiently? What kind of groups, patrols, or teams will you need? How will that change as project execution proceeds? To whom will you delegate your authority, so you accomplish your objective?"
        ],
        "plan.training": [
            15,
            "How do you plan to train or prepare the helpers so they do the work you want?",
            ""
        ],
        "plan.communication": [
            15,
            "How will you communicate with helpers about the work schedule and location, how to prepare, and what to bring with them?",
            ""
        ],
        "plan.workSessions": [
            15,
            "How many work sessions will you need to complete the project?",
            "Where will each work session be held, and how long will it last?"
        ],
        "plan.firstAidKit": [
            16,
            "Who will supply a first aid kit, and where will it be kept during work sessions?",
            "(Be sure the kit is appropriate for the project and check the kit contents before work begins.)"
        ],
        "plan.firstAidSpecialist": [
            16,
            "Who will be your first aid specialist?",
            "(See Appendix A for more information.)"
        ],
        "plan.safetyAdults": [
            16,
            "Which adults have you talked with about safety during your project’s work activities?",
            "You are responsible for communicating with the key adults in your unit about your plans far enough in advance that they will have time to identify at least two registered adults to be present to monitor safety at all project work activity to comply with the Guide to Safe Scouting. What have unit adults told you about how the registered adults will be identified for your project? What conversations have you had with those adults about handling an emergency if one arises during your project?"
        ],
        "plan.ppe": [
            16,
            "What personal protective equipment is needed, and who will supply it?",
            ""
        ],
        "plan.toolSafety": [
            16,
            "If you are doing construction or making things, how will you ensure the tools used are in good condition?",
            "How will you maintain safe distances between helpers using tools? How will you ensure the tools are used and stored properly?"
        ],
        "plan.adultTools": [
            16,
            "Which tools, if any, may only be operated by adults?",
            "Refer to Scouting America SAFE Project Tool Use."
        ],
        "plan.safetyBriefing": [
            16,
            "When do you plan to hold a safety briefing?",
            "How will you make sure all of your helpers are aware of potential hazards and safety procedures, even if they arrive late? Who will conduct the safety briefing?"
        ],
        "plan.emergencyAccess": [
            16,
            "How will emergency vehicles access your work site if needed?",
            ""
        ],
        "plan.permits": [
            17,
            "Permissions or Permits",
            "If your project needs permissions or permits, explain who obtained them and when they were issued. This might include permission to access the property, work site, building or electrical permits and inspections, dig permits, event permits, backcountry permits, scheduling on the organization’s calendar, or other requirements. Be sure that you have permissions from people who are authorized to grant them. If you are waiting for a permit or permission, describe who is getting it and when it will be received. DO NOT START WORK UNTIL YOU HAVE ALL PERMITS AND PERMISSIONS. Attach copies of any permits to your workbook."
        ],
        "plan.fundingSources": [
            18,
            "Source of Funds",
            "Describe the sources of the funds you listed above. Include all sources of money and donated items."
        ],
        "plan.materialTransport": [
            18,
            "How will materials, supplies, and tools be transported to the work site?",
            ""
        ],
        "plan.workerTransport": [
            18,
            "How will helpers get to and from the work location?",
            "Where can workers access restrooms?"
        ],
        "plan.beneficiaryInput": [
            18,
            "Input from Beneficiary",
            "What input did you receive when you shared your project plan with your beneficiary? What modifications, if any, were made based on the input?"
        ],
        "plan.leaderInput": [
            18,
            "Input from Scoutmaster",
            "What input did you receive when you shared your project plan with your Scoutmaster? What modifications, if any, were made based on the input?"
        ],
        "report.observations": [
            19,
            "Observations",
            "What went well? How did you determine that these elements of the project were successful?"
        ],
        "report.challenges": [
            19,
            "What parts of the project were challenging?",
            "How did you adapt or deal with the challenges?"
        ],
        "report.changes": [
            19,
            "Changes",
            "What significant changes, if any, were made? Why did you make them, and how did they improve the project? Were they agreed to by those who approved the project proposal and plan?"
        ],
        "report.leadershipStyle": [
            20,
            "What did you learn about your own leadership style?",
            "How would you describe yourself as a leader?"
        ],
        "report.rewarding": [
            20,
            "What was most rewarding about being the leader on your project?",
            "What was the most challenging?"
        ],
        "report.materialsUse": [
            20,
            "Use of Materials, Supplies, Tools, and Other Needs",
            "Were there significant shortages or overages of materials, supplies, tools, or other needs? If so, what effect did this have?"
        ],
        "report.differenceExplained": [
            21,
            "Explain the difference above. If the amount you spent exceeded the amount collected, explain how you dealt with that. If you had money, materials, or supplies remaining at the end of your project, did you turn them over to the beneficiary or to a charity chosen by the beneficiary?",
            "If turned over to a charity, identify the charity."
        ],
        "report.thanks": [
            21,
            "Acknowledgment",
            "How did you thank your beneficiary, donors, and helpers?"
        ],
        "report.aiUse": [
            21,
            "Artificial Intelligence",
            "Did you use AI or other internet tools in developing, planning, and executing your project or writing any portion of your workbook? If you did, describe what you used, how you used it, and where you used it."
        ],
        "candidate.name": [
            5,
            "Name",
            ""
        ],
        "candidate.dob": [
            5,
            "Birth Date",
            ""
        ],
        "candidate.address": [
            5,
            "Street Address",
            ""
        ],
        "candidate.city": [
            5,
            "City",
            ""
        ],
        "candidate.state": [
            5,
            "State",
            ""
        ],
        "candidate.email": [
            5,
            "Email",
            ""
        ],
        "candidate.phone": [
            5,
            "Telephone",
            ""
        ],
        "candidate.pid": [
            5,
            "Scouting America Personal ID (from Scoutbook or ID card)",
            ""
        ],
        "candidate.borDate": [
            5,
            "Life Rank Board of Review Date",
            ""
        ],
        "unit.type": [
            5,
            "Unit Type",
            ""
        ],
        "unit.number": [
            5,
            "Unit Number",
            ""
        ],
        "unit.district": [
            5,
            "Name of District",
            ""
        ],
        "unit.council": [
            5,
            "Name of Council",
            ""
        ],
        "proposal.projectName": [
            1,
            "Project Title",
            ""
        ],
        "proposal.approvedDate": [
            8,
            "When do you expect your proposal to be approved?",
            ""
        ],
        "proposal.planDate": [
            8,
            "When do you expect to complete your plan?",
            ""
        ],
        "proposal.beginDate": [
            8,
            "When do you expect to begin actual work?",
            ""
        ],
        "proposal.completeDate": [
            8,
            "When do you think your project report will be complete?",
            ""
        ],
        "proposal.costs.materials": [
            9,
            "Materials (components that will become part of the finished project)",
            ""
        ],
        "proposal.costs.supplies": [
            9,
            "Supplies (things that will be used up to execute your project)",
            ""
        ],
        "proposal.costs.tools": [
            9,
            "Tools (equipment that will be used to prepare or assemble your project)",
            ""
        ],
        "proposal.costs.other": [
            9,
            "Other Needs (resources that are not Materials, Supplies, or Tools)",
            ""
        ],
        "proposal.needFundraisingApp": [
            10,
            "Based on Scouting America guidelines and your local council’s procedures, do you need to complete a Fundraising Application (Appendix D) and get it approved before seeking donations?",
            ""
        ],
        "plan.funds.beneficiary": [
            17,
            "Contribution from beneficiary",
            ""
        ],
        "plan.funds.exempt": [
            17,
            "Contributions from exempted sources",
            "Examples are your family or unit."
        ],
        "plan.funds.others": [
            17,
            "Contributions from others",
            "This can be discounts from hardware stores, fundraisers, donations via crowdfunding, etc."
        ],
        "plan.funds.future": [
            17,
            "If you expect to raise more money, estimate it",
            "and identify the date you expect to receive it."
        ],
        "plan.funds.futureDate": [
            17,
            "Date Expected",
            ""
        ],
        "plan.funds.donated": [
            17,
            "Donations of materials, tools, or other items",
            "Don’t include borrowed items."
        ],
        "report.collected": [
            21,
            "How much was collected?",
            ""
        ],
        "report.spent": [
            21,
            "How much was spent?",
            "This should match the total cost above."
        ]
    },
    "appendixD": {
        "appendixD.useOfFunds": [
            1,
            "For what will you use the funds?",
            ""
        ],
        "proposal.fundraising@appendixD": [
            1,
            "How will you seek donations? (from page 9 of the Eagle Scout Leadership Service Project Workbook)",
            ""
        ],
        "appendixD.dates": [
            1,
            "What are the proposed dates (MM/DD/YYYY) for fundraising efforts?",
            ""
        ],
        "appendixD.howMuch": [
            1,
            "How much money do you expect to raise?",
            ""
        ],
        "appendixD.donors": [
            1,
            "From whom will you seek donations of money, supplies, or tools, and how will it be done?",
            "Unless your donors will be anonymous or are unknown (e.g., from an event like a car wash, bake sale, or crowdfunding), you must list the names of prospective donors and what they will be asked to contribute. You do not need to list parents, family members, your beneficiary, unit, chartered organization, or members of your unit or their parents."
        ],
        "appendixD.contracts": [
            2,
            "Will your efforts to seek donations require any contracts (such as for a crowdfunding platform or website)?",
            "If so, explain the contract details and who (an adult) will sign the contract. Contracts may not bind Scouting America, the council, or the unit’s chartered organization, unless the chartered organization is the project beneficiary."
        ],
        "appendixD.safeguarding": [
            2,
            "Who will hold the funds between contribution and project execution? How will donations be stored and disbursed? How will you turn over any unneeded donations to the beneficiary?",
            ""
        ]
    },
    "sections": {
        "contacts": [
            5,
            "Project Contacts",
            ""
        ],
        "contacts.candidate": [
            5,
            "Eagle Scout Candidate",
            ""
        ],
        "contacts.parent": [
            5,
            "Scout Parent/Guardian",
            ""
        ],
        "contacts.unit": [
            5,
            "Unit Information",
            ""
        ],
        "contacts.leader": [
            5,
            "Scoutmaster",
            ""
        ],
        "contacts.committee": [
            5,
            "Unit Committee Representative",
            ""
        ],
        "contacts.beneficiary": [
            5,
            "Project Beneficiary",
            ""
        ],
        "contacts.beneficiaryRep": [
            5,
            "Project Beneficiary Representative",
            ""
        ],
        "contacts.serviceCenter": [
            5,
            "Council Service Center",
            ""
        ],
        "contacts.approvalRep": [
            5,
            "Council or District Proposal Approval Representative",
            "(Your Scoutmaster can help you learn who this will be.)"
        ],
        "contacts.coach": [
            5,
            "Project Coach/Advisor",
            "(an adult assigned by your council, district, or unit to help you with your project)"
        ],
        "proposal.timeline": [
            8,
            "Approximate Timeline",
            "You may find it challenging to estimate the amount of time needed for project approval and planning. Fill in your best estimates. Talk with your beneficiary, Scoutmaster, and others about your estimated timeline. Be prepared to make adjustments if you discover you’ve underestimated some of the challenges."
        ],
        "proposal.hours": [
            9,
            "Estimated Time",
            "You should keep track of the time that you and anyone who helps you invest in developing your project proposal. Enter the number of people who helped and the total number of hours invested. You will need to update as your proposal develops. See the example."
        ],
        "proposal.costs": [
            9,
            "Preliminary Cost Estimate",
            "Provide an estimate of your expected project cost. Enter your expected expenses in each category. Include sales tax if applicable. Include the value of items even if they will be donated. You will develop a detailed budget during the planning stage of your project. For now, your estimate should be detailed enough to show that you understand what fundraising needs you will have."
        ],
        "proposal.approval": [
            11,
            "Proposal Approval",
            "Don’t begin work until your project proposal is approved by all the signatories. If you start work on the project before getting all four approval signatures, you may have to begin again and do a different project."
        ],
        "proposal.brief": [
            11,
            "Brief Project Description",
            "Write two to three sentences that summarize your project and why it is important. Refer back to the project description on page 7."
        ],
        "proposal.promise": [
            11,
            "Candidate’s Promise",
            "(Sign here before you seek other approvals.)"
        ],
        "appendixD": [
            1,
            "Fundraising Application",
            ""
        ],
        "appendixD.description": [
            1,
            "Project Description (from page 6 of the Eagle Scout Leadership Service Project Workbook)",
            ""
        ],
        "appendixD.fundraising": [
            1,
            "Fundraising",
            ""
        ],
        "appendixD.donors": [
            1,
            "Donors",
            ""
        ],
        "appendixD.contracts": [
            2,
            "Contracts",
            ""
        ],
        "appendixD.safeguarding": [
            2,
            "Safeguarding Donations",
            ""
        ],
        "plan.steps": [
            14,
            "Project Steps and Organizing the Work",
            "Prepare a step-by-step list of what you must do to complete your project. Describe the duration (how long you expect it to take) for each step. Include key information, like the details of site preparation if you are doing construction, or rehearsals if you are planning a concert or play. What materials might you need to buy, or what other steps are essential to getting your project done? If your project has more than ten steps, include a separate sheet to continue the list. Some steps may overlap or be done at the same time."
        ],
        "plan.helpers": [
            14,
            "Leading Others",
            "List the helpers you need to execute your project. Indicate how many you have currently committed, following the example on the first line."
        ],
        "plan.hours": [
            15,
            "Time",
            "There is no minimum number of hours required for an Eagle Scout Leadership Service Project. The merit of a project is based not only on the hours needed to execute it, but also on the impact it has. You should keep track of the time that you and anyone who helps you invest in planning your project, just like you did in developing your project proposal."
        ],
        "plan.safety": [
            16,
            "Safety",
            ""
        ],
        "plan.hazards": [
            16,
            "Potential Hazard",
            "List hazards that might be encountered during the project. Examples may include hazardous materials, severe weather, sharp tools, overhead or underground utilities, or sun exposure. Indicate how you will deal with each. Attach an additional page if needed."
        ],
        "plan.items": [
            17,
            "Materials, Supplies, Tools, or Other Needs",
            "List each item, description, quantity, unit cost, total cost, and source. For donated items, include value in the cost column. If you are borrowing things like tools that might be lent to you at no cost and will be returned to the owner, enter “0” (i.e., zero) in the cost column. Attach additional pages if needed."
        ],
        "plan.items.note": [
            17,
            "Note",
            "If you need more lines than supplied above, please attach a separate sheet to continue listing materials, supplies, etc."
        ],
        "plan.funds": [
            17,
            "Fundraising",
            ""
        ],
        "plan.funds.total": [
            17,
            "Total Funds",
            "This should match your Total Cost of Materials, Supplies, Tools or Other Needs in the section above."
        ],
        "plan.logistics": [
            18,
            "Logistics",
            ""
        ],
        "plan.reviews": [
            18,
            "Project Plan Reviews",
            ""
        ],
        "plan.promise": [
            18,
            "Candidate’s Promise",
            "On my honor as a Scout, I confirm that I prepared this project plan, showed it to the beneficiary and Scoutmaster, and obtained their authorization to start work before beginning project execution."
        ],
        "report.reflections": [
            19,
            "Reflections on Your Project",
            "This is your opportunity to reflect on the project. Reflection is an important element of project management. By looking back on what happened, we can improve for the future. The goal is to learn from our experience and do a better job each time we do a project."
        ],
        "report.leadership": [
            20,
            "Leadership",
            ""
        ],
        "report.hours": [
            20,
            "Time",
            "Scouting America collects information about the hours worked on Eagle Scout leadership service projects because it underscores our citizenship aim. To assist with this data collection, please put in the table below the hours you and others invested in developing your Project Proposal, Project Plan, and executing the project. Remember to refer to your log of people who helped and the number of hours they worked. Be sure to include the time you spend writing this project report."
        ],
        "report.spending": [
            21,
            "Spending Summary",
            "Describe how you spent the money you collected for your project."
        ],
        "report.photos": [
            21,
            "Photos and Documents",
            "Attach (or submit separately) photographs taken before, during, and after the project completion."
        ],
        "report.certification": [
            22,
            "Certification of Completion",
            ""
        ],
        "report.acceptance": [
            22,
            "ACCEPTANCE OF THE WORK",
            ""
        ],
        "report.brief": [
            22,
            "Brief Project Description",
            "Write two or three sentences to describe what you did for the beneficiary."
        ]
    },
    "tables": {
        "plan.steps": [
            14,
            [
                "STEP",
                "EXPECTED DURATION"
            ]
        ],
        "plan.helpers": [
            14,
            [
                "Task or Role",
                "Skills Needed",
                "Adult or Youth",
                "Number Needed",
                "Number So Far"
            ]
        ],
        "plan.hazards": [
            16,
            [
                "Potential Hazard",
                "How Problems Will Be Mitigated"
            ]
        ],
        "plan.items": [
            17,
            [
                "Item",
                "Description",
                "Quantity",
                "Unit Cost",
                "Total Cost",
                "Source"
            ]
        ],
        "report.spending": [
            21,
            [
                "Item",
                "Description",
                "Quantity",
                "Unit Cost",
                "Total Cost",
                "Source"
            ]
        ],
        "proposal.hours.cols": [
            9,
            [
                "Number of Individuals",
                "Total Hours Invested"
            ]
        ],
        "plan.hours.cols": [
            15,
            [
                "Number of Individuals",
                "Total Hours Invested"
            ]
        ],
        "proposal.hours.rows": [
            9,
            [
                "Eagle Scout candidate – proposal development hours",
                "Registered Scouting America youth members – helping proposal development",
                "Other youth (siblings, friends, etc., who are not registered with Scouting America)",
                "Registered Scouting America adults",
                "Other adults (parents, grandparents, etc., not registered with Scouting America)",
                "Grand Total of Proposal Development hours"
            ]
        ],
        "plan.hours.rows": [
            15,
            [
                "Eagle Scout candidate – plan development hours",
                "Registered Scouting America youth members – helping plan development",
                "Other youth (siblings, friends, etc., who are not registered with Scouting America)",
                "Registered Scouting America adults",
                "Other adults (parents, grandparents, etc., not registered with Scouting America)",
                "Grand Total of Plan Development hours"
            ]
        ],
        "report.hours.rows": [
            20,
            [
                "Eagle Scout Candidate",
                "Registered Scouting America youth members",
                "Other youth (siblings, friends, etc., who are not registered with Scouting America)",
                "Registered Scouting America adults",
                "Other adults (parents, grandparents, etc., not registered with Scouting America)",
                "Grand Total of hours (enter here and on your Eagle Scout rank application)"
            ]
        ],
        "contacts.labels": [
            5,
            [
                "Name",
                "Street Address",
                "City",
                "State",
                "Email",
                "Telephone",
                "Name of Organization",
                "Name of Representative",
                "Contact Name",
                "Name of Project Coach/Advisor"
            ]
        ],
        "report.hours.headers": [
            20,
            [
                "Proposal Hours",
                "(from page 9)",
                "Project Plan Hours",
                "(from page 15)",
                "Project Execution",
                "Number of Workers",
                "Number of Hours",
                "Total Hours",
                "(workers x hours)"
            ]
        ]
    }
  };
```
