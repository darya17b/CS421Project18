// Part names, table-of-contents groups, and which parts share a printed page.
// Keys are stable part ids; the printed "Part N" number comes from numbering.js.

export const SCRIPT_PARTS = {
  1: { name: "Script Details", group: "admin" },
  2: { name: "Review of Systems", group: "admin" },
  3: { name: "Door Note & Learner Instruction", group: "admin" },
  4: { name: "VCC Items", group: "admin" },
  5: { name: "Character Portrayal Overview", group: "sp" },
  5.2: {
    name: "Character Portrayal Overview Continued",
    group: "sp",
    continued: true,
  },
  6: { name: "Gender Identity", group: "sp" },
  7: { name: "Presentation and Resulting Behaviors", group: "sp" },
  8: { name: "Chief Concern & HPI", group: "sp" },
  8.2: { name: "Chief Concern & HPI Continued", group: "sp", continued: true },
  9: { name: "Past Medical History", group: "sp" },
  10: { name: "Medications & Allergies", group: "sp" },
  11: { name: "Family Medical History", group: "sp" },
  12: { name: "Social History", group: "sp" },
  12.2: { name: "Social History Continued", group: "sp", continued: true },
  13: { name: "Other SP Notes", group: "sp" },
  // Only included when SP feedback is enabled on the script.
  14: { name: "SP Feedback", group: "other" },
  15: { name: "Admin Notes", group: "admin" },
};

export const TOC_GROUPS = [
  { id: "admin", title: "Administrative Details" },
  { id: "sp", title: "Content for Standardized Patients" },
  { id: "other", title: "Other" },
];

// Which TOC groups each exported version of the script includes.
export const AUDIENCES = {
  master: {
    label: "Master",
    groups: ["admin", "sp", "other"],
    fileSuffix: "Master",
  },
  faculty: {
    label: "Faculty",
    groups: ["admin", "other"],
    fileSuffix: "Faculty",
  },
  sp: { label: "SP", groups: ["sp"], fileSuffix: "SP" },
};

export const PAGE_LAYOUT = [
  [1],
  [2],
  [3, 4],
  [5],
  [5.2, 6],
  [7, 8],
  [8.2],
  [9],
  [10, 11],
  [12],
  [12.2, 13],
  [14],
  [15],
];
