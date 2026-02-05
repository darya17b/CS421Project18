import { jsPDF } from "jspdf";

// Utilities
const get = (obj, path, fallback = "") => path.reduce((acc, k) => (acc ? acc[k] : undefined), obj) ?? fallback;
const ratingWord = (n) => {
  const v = Number.isFinite(Number(n)) ? Number(n) : -1;
  return ["None", "Mild", "Moderate", "Concerning", "Severe", "Extreme"][v] || "None";
};
const pad = (s) => (s === 0 ? "0" : s ? String(s) : "");

const headingColor = "#981e32";
const gray = "#444444";
const subheadLabelWidth = 190;
const subheadLineHeight = 14;

const logoDataUrl = "";
const logoFormat = "PNG";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formatMonthYear = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
};

function buildScriptPdfDoc(item, versionObj) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 54;
  const top = 78;
  const headerY = 44;
  const headerLineY = 54;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;
  let tocStartY = 0;
  let tocPage = 0;

  const version = versionObj || (item.versions && item.versions[0]) || { version: "v1", fields: {}, notes: "" };
  const fields = version.fields || {};

  const patientName = get(fields, ["patient", "name"], item.title || "Standardized Patient Script");
  const diagnosis = get(fields, ["admin", "diagnosis"], "");
  const classLabel = get(fields, ["admin", "class"], item.department || "");
  const eventLabel = get(fields, ["admin", "medical_event"], "");
  const caseLabel = [classLabel, eventLabel].filter(Boolean).join(" ");
  const docVersion = formatMonthYear(item.createdAt || get(fields, ["admin", "event_dates"], ""));

  const headerText = [patientName, diagnosis, caseLabel].filter(Boolean).join(" - ");

  const drawLogo = (x, yPos, width) => {
    const height = Math.max(1, Math.round(width * 0.35));
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, logoFormat, x, yPos, width, height);
      return height;
    }
    doc.setDrawColor(200);
    doc.rect(x, yPos, width, height);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#666666");
    doc.setFontSize(10);
    doc.text("LOGO", x + width / 2, yPos + height / 2 + 3, { align: "center" });
    doc.setTextColor(gray);
    return height;
  };

  const drawHeader = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor("#666666");
    doc.text(headerText, margin, headerY, { maxWidth });
    doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, headerY, { align: "right" });
    doc.setDrawColor(210);
    doc.line(margin, headerLineY, pageWidth - margin, headerLineY);
    doc.setTextColor(gray);
    doc.setFontSize(11);
  };

  const ensureSpace = (space = 60) => {
    if (y + space > pageHeight - margin) {
      doc.addPage();
      y = top;
      drawHeader();
    }
  };

  const section = (title) => {
    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headingColor);
    doc.setFontSize(13);
    doc.text(title, margin, y);
    y += 16;
    doc.setFontSize(11);
    doc.setTextColor(gray);
  };

  const partTitle = (num, title) => {
    ensureSpace(36);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headingColor);
    doc.setFontSize(14);
    doc.text(`Part ${num}  ${title}`, margin, y);
    y += 12;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
    doc.setFontSize(11);
    doc.setTextColor(gray);
  };

  const subhead = (label, value, { force = false } = {}) => {
    const clean = value === undefined || value === null ? "" : String(value);
    if (!clean && !force) return;
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = clean ? doc.splitTextToSize(clean, maxWidth - subheadLabelWidth) : [""];
    doc.text(lines, margin + subheadLabelWidth, y, { align: "left" });
    y += Math.max(lines.length * subheadLineHeight, subheadLineHeight);
  };

  const paragraph = (text) => {
    if (!text) return;
    const lines = doc.splitTextToSize(String(text), maxWidth);
    lines.forEach((ln) => { ensureSpace(14); doc.text(ln, margin, y); y += 14; });
    y += 6;
  };

  const labelValue = (label, value) => subhead(label, value, { force: true });

  const characterAttributes = () => {
    section("Character Attributes");
    const attrs = ["anxiety", "suprise", "confusion", "guilt", "sadness", "indecision", "assertiveness", "frustration", "fear", "anger"];
    attrs.forEach((key) => {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      const val = get(fields, ["sp", "attributes", key], "");
      const display = val === "" ? "" : `${val}/5`;
      subhead(label, display);
    });
    y += 6;
  };

  const severityBar = () => {
    ensureSpace(40);
    const severity = Number(get(fields, ["sp", "current_ill_history", "pain"], 0));
    const boxW = (maxWidth - 10) / 11;
    doc.setFont("helvetica", "bold");
    doc.text("Severity (0-10):", margin, y);
    y += 14;
    for (let i = 0; i <= 10; i++) {
      const x = margin + i * boxW;
      doc.setFillColor(i === severity ? headingColor : 255, i === severity ? 30 : 255, i === severity ? 60 : 255);
      doc.rect(x, y, boxW - 2, 18, "FD");
      doc.setTextColor(i === severity ? "#fff" : "#000");
      doc.setFontSize(9);
      doc.text(String(i), x + boxW / 2 - 3, y + 12);
    }
    doc.setTextColor(gray);
    doc.setFontSize(11);
    y += 28;
  };

  const medicationBlock = () => {
    section("Medications & Allergies");
    const med = get(fields, ["med_hist", "medications"], {});
    const medName = Array.isArray(med) ? med[0] || {} : med;
    const medLine = [pad(medName.name), pad(medName.dose), pad(medName.frequency)].filter(Boolean).join(" - ");
    subhead("Medication", medLine || "None reported");
    subhead("Reason", pad(medName.reason));
    subhead("Allergies", get(fields, ["med_hist", "allergies"], ""));
  };

  const socialHistory = () => {
    section("Social History");
    const items = [
      ["Personal Background", get(fields, ["med_hist", "social_hist", "personal_background"])],
      ["Nutrition and Exercise", get(fields, ["med_hist", "social_hist", "nutrion_and_exercise"])],
      ["Community and Employment", get(fields, ["med_hist", "social_hist", "community_and_employment"])],
      ["Safety Measures", get(fields, ["med_hist", "social_hist", "safety_measure"])],
      ["Life Stressors", get(fields, ["med_hist", "social_hist", "life_stressors"])],
      ["Substance Use", get(fields, ["med_hist", "social_hist", "substance_use"])],
      ["Sexual History", (() => {
        const sh = get(fields, ["med_hist", "social_hist", "sex_history"], {});
        return [
          `Current partners: ${pad(sh.current_partners)}`,
          `Past partners: ${pad(sh.past_partners)}`,
          `Contraceptives: ${pad(sh.contraceptives)}`,
          `HIV Risk: ${pad(sh.hiv_risk_history)}`,
          `Safety: ${pad(sh.safety_in_relations)}`,
        ].filter(Boolean).join(" | ");
      })()],
    ];
    items.forEach(([label, value]) => subhead(label, value));
  };

  const ros = () => {
    section("Review of Systems");
    const rosObj = get(fields, ["med_hist", "sympton_review"], {});
    Object.entries(rosObj || {}).forEach(([label, value]) => {
      ensureSpace(16);
      doc.setFont("helvetica", "bold");
      doc.text(`${label[0].toUpperCase() + label.slice(1)}:`, margin, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(pad(value), maxWidth - 120);
      doc.text(lines, margin + 120, y);
      y += lines.length * 14;
    });
    y += 4;
  };

  const prompts = () => {
    section("Prompts and Special Instructions");
    subhead("Provoking Question", get(fields, ["special", "provoking_question"], ""));
    subhead("Must Ask", get(fields, ["special", "must_ask"], ""));
    subhead("Opportunity", get(fields, ["special", "oppurtunity"], ""));
    subhead("Opening Statement", get(fields, ["special", "opening_statement"], ""));
    subhead("Feedback Notes", get(fields, ["special", "feed_back"], ""));
  };

  const partPages = {};

  const startPart = (num, title) => {
    doc.addPage();
    y = top;
    drawHeader();
    partPages[num] = doc.internal.getNumberOfPages();
    partTitle(num, title);
  };

  const drawCover = () => {
    y = 110;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(headingColor);
    doc.setFontSize(24);
    doc.text("Virtual Clinical Center", margin, y);
    y += 26;

    doc.setFontSize(12);
    doc.setTextColor(gray);
    doc.setFont("helvetica", "bold");
    doc.text("YOUNG STANDARDIZED PATIENT:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(patientName || "N/A", margin + 210, y);
    y += 18;

    labelValue("ICD-10 Code and Diagnosis", diagnosis || "N/A");
    labelValue("Case", caseLabel || "N/A");
  };

  const drawTocPage = () => {
    doc.addPage();
    y = top;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headingColor);
    doc.setFontSize(13);
    doc.text("Contents", margin, y);
    y += 16;
    tocStartY = y;
    tocPage = doc.internal.getNumberOfPages();
  };

  const drawToc = () => {
    doc.setPage(tocPage);
    let tocY = tocStartY;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(gray);
    const entries = [
      ["Part 1", "Administrative Details", partPages[1]],
      ["Part 3", "Reports to Release", partPages[3]],
      ["Part 4", "Content for Standardized Patients", partPages[4]],
      ["Part 5", "After Action Review", partPages[5]],
    ];
    entries.forEach(([part, title, page]) => {
      const left = `${part}  ${title}`;
      doc.text(left, margin, tocY);
      if (page) {
        doc.text(String(page), pageWidth - margin, tocY, { align: "right" });
      }
      tocY += 14;
    });
  };

  // Cover page
  drawCover();
  drawTocPage();

  // Part 1 - Administrative Details
  startPart(1, "Administrative Details");
  subhead("Patient's Reason for the Visit", get(fields, ["admin", "reson_for_visit"], ""), { force: true });
  subhead("Patient's Chief complaint", get(fields, ["admin", "chief_concern"], ""), { force: true });
  subhead("ICD-10 Code and Diagnosis", get(fields, ["admin", "diagnosis"], ""), { force: true });
  subhead("Case Letter", get(fields, ["admin", "case_letter"], ""), { force: true });
  subhead("Event Format", get(fields, ["admin", "class"], ""), { force: true });
  subhead("Level of the learner and discipline", get(fields, ["admin", "learner_level"], ""), { force: true });
  subhead("Case authors", get(fields, ["admin", "author"], ""), { force: true });
  doc.setFont("helvetica", "bold");
  doc.text("Summary of patient story:", margin, y); y += 14;
  doc.setFont("helvetica", "normal");
  const summary = get(fields, ["admin", "summory_of_story"], "");
  if (summary) {
    paragraph(summary);
  } else {
    y += 14;
  }
  subhead("Student Expectations", get(fields, ["admin", "student_expectations"], ""), { force: true });
  y += 12;
  y += 12;
  subhead("Demographics of patient/recruitment guidelines", get(fields, ["admin", "patient_demographic"], ""), { force: true });
  y += 12;
  subhead("List of special supplies needed for encounter", get(fields, ["admin", "special_supplies"], ""), { force: true });
  subhead("Case factors associated with social determinants of health", get(fields, ["admin", "case_factors"], ""), { force: true });
  subhead("Additional Instructions", get(fields, ["special", "feed_back"], ""), { force: true });

  // Part 3 - Reports to Release (Part 2 skipped per request)
  startPart(3, "Reports to Release");
  subhead("Items to Include", get(fields, ["reports", "items"], "None"));
  subhead("Release Timing", get(fields, ["reports", "release_timing"], "Before"));

  // Part 4 - Content for Standardized Patients
  startPart(4, "Content for Standardized Patients");
  section("Opening Statement");
  paragraph(get(fields, ["sp", "opening_statement"], ""));
  characterAttributes();
  section("Nonverbal behavior and physical characteristics");
  paragraph(get(fields, ["sp", "physical_chars"], ""));

  section("Chief Complaint");
  paragraph(get(fields, ["admin", "chief_concern"], "") || get(fields, ["admin", "reson_for_visit"], ""));

  section("History of Present Illness (HPI)");
  subhead("Place/Location of Symptoms", get(fields, ["sp", "current_ill_history", "body_location"], ""));
  subhead("Setting in which Symptom(s) Occur", get(fields, ["sp", "current_ill_history", "symptom_settings"], ""));
  subhead("Timing of Symptom(s)", get(fields, ["sp", "current_ill_history", "symptom_timing"], ""));
  subhead("Associated Symptoms", get(fields, ["sp", "current_ill_history", "associated_symptoms"], ""));
  subhead("Radiation of Symptom(s)", get(fields, ["sp", "current_ill_history", "radiation_of_symptoms"], ""));
  subhead("Quality of Symptom(s)", get(fields, ["sp", "current_ill_history", "symptom_quality"], ""));
  subhead("Alleviating Factors of Symptom(s)", get(fields, ["sp", "current_ill_history", "alleviating_factors"], ""));
  subhead("Aggravating Factors of Symptom(s)", get(fields, ["sp", "current_ill_history", "aggravating_factors"], ""));
  severityBar();

  medicationBlock();

  section("Past Medical History (PMH)");
  const pmh = get(fields, ["med_hist", "past_med_his"], {});
  Object.entries(pmh || {}).forEach(([label, value]) => subhead(label.replace(/_/g, " "), value));

  section("Preventative Medicine");
  const prev = get(fields, ["med_hist", "preventative_measure"], {});
  Object.entries(prev || {}).forEach(([label, value]) => subhead(label.replace(/_/g, " "), value));

  subhead("Travel/Exposure History", get(fields, ["med_hist", "preventative_measure", "travel_exposure"], ""));

  section("Family Medical History");
  const fam = get(fields, ["med_hist", "family_hist"], {});
  if (Array.isArray(fam) && fam.length) {
    subhead("Family Tree", fam.map((f) => `${pad(f.health_status)} - Age ${pad(f.age)} - ${pad(f.cause_of_death)}`).join(" | "));
  } else if (fam && typeof fam === "object") {
    Object.entries(fam).forEach(([label, value]) => subhead(label.replace(/_/g, " "), value));
  } else {
    paragraph("None reported");
  }

  socialHistory();
  ros();
  prompts();

  section("Guidelines for Feedback");
  paragraph(get(fields, ["special", "feed_back"], "") || "No feedback guidance provided.");

  // Part 5 - After Action Review
  startPart(5, "After Action Review");
  section("Notes for internal use only");
  paragraph(version.notes || "No internal notes provided.");

  drawToc();
  return doc;
}

export function downloadScriptPdf(item, versionObj) {
  const doc = buildScriptPdfDoc(item, versionObj);
  const safeName = `${(item.id || "script").replace(/\s+/g, "_")}.pdf`;
  doc.save(safeName);
}

export function getScriptPdfUrl(item, versionObj) {
  const doc = buildScriptPdfDoc(item, versionObj);
  return doc.output("bloburl");
}

export function downloadResourcePdf(item, resourceName) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Resource Summary", margin, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const rows = [
    ["Script", `${item.id} - ${item.title}`],
    ["Resource", resourceName],
    ["Note", "This is a placeholder export (no backend)."],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(value || ""), 480);
    doc.text(lines, margin + 80, y);
    y += lines.length * 14 + 6;
  });

  const safeName = `${(item.id || "script").replace(/\s+/g, "_")}-${(resourceName || "resource").replace(/\s+/g, "_")}.pdf`;
  doc.save(safeName);
}
