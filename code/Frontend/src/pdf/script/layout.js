// Part titles, table-of-contents groups, and which parts share a printed page.

export const SCRIPT_PARTS = {
  1: { title: "Part 1 – Script Details", group: "admin" },
  2: { title: "Part 2 – Review of Systems", group: "admin" },
  3: { title: "Part 3 – Door Note & Learner Instruction", group: "admin" },
  4: { title: "Part 4 – VCC Items", group: "admin" },
  5: { title: "Part 5 – Character Portrayal Overview", group: "sp" },
  5.2: { title: "Part 5.2 – Character Portrayal Overview Continued", group: "sp", continued: true },
  6: { title: "Part 6 – Gender Identity", group: "sp" },
  7: { title: "Part 7 – Presentation and Resulting Behaviors", group: "sp" },
  8: { title: "Part 8 – Chief Concern & HPI", group: "sp" },
  8.2: { title: "Part 8.2 – Chief Concern & HPI Continued", group: "sp", continued: true },
  9: { title: "Part 9 – Past Medical History", group: "sp" },
  10: { title: "Part 10 – Medications & Allergies", group: "sp" },
  11: { title: "Part 11 – Family Medical History", group: "sp" },
  12: { title: "Part 12 – Social History", group: "sp" },
  12.2: { title: "Part 12.2 – Social History Continued", group: "sp", continued: true },
  13: { title: "Part 13 – Other SP Notes", group: "sp" },
  // Only included when SP feedback is enabled on the script.
  14: { title: "Part 14 – SP Feedback", group: "other" },
  15: { title: "Part 15 – Admin Notes", group: "other" },
};

export const TOC_GROUPS = [
  { id: "admin", title: "Administrative Details" },
  { id: "sp", title: "Content for Standardized Patients" },
  { id: "other", title: "Other" },
];

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
