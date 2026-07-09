/* action-plan.js — auto-generated "Going Well / Needs Addressing" Action Plan,
 * replicating the TEXTJOIN/FILTER formulas from the original spreadsheet reports,
 * combining both Tool 1 and Tool 2 data per Setting or Zone.
 *
 * Tool 1 thresholds (confirmed against real historical data): Going Well > 1.5,
 * Needs Addressing <= 1 (out of 2.00). Needs Addressing can also flag an overall
 * score of <= 1 as a distinct "Overall" item; Going Well never does the same,
 * since "overall is going well" isn't a specific achievement the way a skill
 * area is — it's the summary, not a flaggable item in its own right.
 *
 * Tool 2 thresholds are per-section, confirmed by hand for each of the 9 default
 * sections, based on the AVERAGE number of "Yes" answers per assessment for that
 * section within the group — matching the original SUMPRODUCT/COUNTIF mechanism
 * revealed by the source spreadsheet. A section that's been renamed/customized
 * away from these exact titles falls back to a generic 80%/50% rule instead of
 * silently never triggering.
 */

const TOOL2_SECTION_THRESHOLDS = {
  "Child Protection": { green: 5, red: 5 },
  "Health Safety": { green: 7, red: 7 },
  "Equipment & Resources": { green: 5, red: 3 },
  "Planning for and Implementing Purposeful Play": { green: 4, red: 3 },
  "Interactions & Relationships": { green: 11, red: 7 },
  "Inclusive Play": { green: 5, red: 5 },
  "Attitudes Behaviours Dispositions": { green: 5, red: 3 },
  "Continuous Child Assessment": { green: 6, red: 4 },
  "Family Engagement": { green: 5, red: 3 }
};

function tool1GoingWellNeedsAddressing(records) {
  const goingWell = [];
  const needsAddressing = [];
  for (const prefix of Object.keys(SECTION_LABELS)) {
    const avg = tool1SectionAvgForGroup(records, prefix); // defined in view-records.js
    if (avg === null) continue;
    if (avg > 1.5) goingWell.push(SECTION_LABELS[prefix]);
    else if (avg <= 1) needsAddressing.push(SECTION_LABELS[prefix]);
  }
  const overall = tool1OverallForGroup(records); // defined in view-records.js
  if (overall !== null && overall <= 1) needsAddressing.push("Overall");
  return { goingWell, needsAddressing };
}

function tool2SectionAvgYesCountForGroup(records, sectionGoals) {
  if (!records.length) return null;
  let yesCount = 0;
  for (const rec of records) {
    for (const goal of sectionGoals) {
      if ((rec.scores || {})[goal] === "Yes") yesCount++;
    }
  }
  return yesCount / records.length;
}

function tool2GoingWellNeedsAddressing(records) {
  const sections = DB.tool2Sections.get();
  const goingWell = [];
  const needsAddressing = [];
  for (const [title, data] of Object.entries(sections)) {
    const avg = tool2SectionAvgYesCountForGroup(records, data.goals);
    if (avg === null) continue;
    const custom = TOOL2_SECTION_THRESHOLDS[title];
    if (custom) {
      if (avg >= custom.green) goingWell.push(title);
      else if (avg < custom.red) needsAddressing.push(title);
    } else {
      // Fallback for a renamed/customized section: generic 80% / 50% of its own goal count.
      const total = data.goals.length;
      if (!total) continue;
      const pct = avg / total;
      if (pct >= 0.8) goingWell.push(title);
      else if (pct <= 0.5) needsAddressing.push(title);
    }
  }
  return { goingWell, needsAddressing };
}

function joinOrNoMatches(list) {
  return list.length ? list.join(", ") : "No Matches";
}
