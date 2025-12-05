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

function buildScriptPdfDoc(item, versionObj) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 54;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const version = versionObj || (item.versions && item.versions[0]) || { version: "v1", fields: {}, notes: "" };
  const fields = version.fields || {};

  const ensureSpace = (space = 60) => {
    if (y + space > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const section = (title) => {
    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headingColor);
    doc.setFontSize(15);
    doc.text(title, margin, y);
    y += 18;
    doc.setFontSize(11);
    doc.setTextColor(gray);
  };

  const subhead = (label, value) => {
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const clean = value === undefined || value === null ? "" : String(value);
    const lines = clean ? doc.splitTextToSize(clean, maxWidth - 110) : [""];
    doc.text(lines, margin + 110, y, { align: "left" });
    y += Math.max(lines.length * 14, 14);
  };

  const paragraph = (text) => {
    const lines = doc.splitTextToSize(text || "", maxWidth);
    lines.forEach((ln) => { ensureSpace(14); doc.text(ln, margin, y); y += 14; });
    y += 6;
  };

  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headingColor);
    doc.setFontSize(16);
    const title = get(fields, ["patient", "name"], item.title || "Standardized Patient Script");
    doc.text(title, margin, y);
    doc.setFontSize(12);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(gray);
    const meta = [
      get(fields, ["admin", "diagnosis"], "Diagnosis TBD"),
      get(fields, ["admin", "class"], item.department || "Course"),
      get(fields, ["admin", "event_dates"], item.createdAt || ""),
    ].filter(Boolean).join(" • ");
    doc.text(meta || "", margin, y);
    y += 16;
  };

  const characterAttributes = () => {
    ensureSpace(140);
    doc.setFont("helvetica", "bold");
    doc.text("Character Attributes", margin, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    const attrs = ["anxiety","suprise","confusion","guilt","sadness","indecision","assertiveness","frustration","fear","anger"];
    attrs.forEach((key) => {
      ensureSpace(16);
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      const val = ratingWord(get(fields, ["sp", "attributes", key], 0));
      doc.text(`${label}:`, margin, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(headingColor);
      doc.text(val, margin + 140, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(gray);
      y += 14;
    });
    y += 8;
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
    const medLine = [pad(medName.name), pad(medName.dose), pad(medName.frequency)].filter(Boolean).join(" • ");
    subhead("Medication", medLine || "None reported");
    subhead("Reason", pad(medName.reason));
    subhead("Allergies", get(fields, ["med_hist", "allergies"], ""));
  };

  const socialHistory = () => {
    section("Social History");
    const items = [
      ["Personal Background", get(fields, ["med_hist", "social_hist", "personal_background"])],
      ["Nutrition & Exercise", get(fields, ["med_hist", "social_hist", "nutrion_and_exercise"])],
      ["Community & Employment", get(fields, ["med_hist", "social_hist", "community_and_employment"])],
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
    section("Prompts & Special Instructions");
    subhead("Provoking Question", get(fields, ["special", "provoking_question"], ""));
    subhead("Must Ask", get(fields, ["special", "must_ask"], ""));
    subhead("Opportunity", get(fields, ["special", "oppurtunity"], ""));
    subhead("Opening Statement", get(fields, ["special", "opening_statement"], ""));
    subhead("Feedback Notes", get(fields, ["special", "feed_back"], ""));
  };

  // Compose pages
  header();

  section("Administrative Details");
  subhead("Patient's Reason for Visit", get(fields, ["admin", "reson_for_visit"], ""));
  subhead("Chief Complaint", get(fields, ["admin", "chief_concern"], ""));
  subhead("Diagnosis", get(fields, ["admin", "diagnosis"], ""));
  subhead("Class", get(fields, ["admin", "class"], ""));
  subhead("Event", get(fields, ["admin", "medical_event"], ""));
  subhead("Learner Level", get(fields, ["admin", "learner_level"], ""));
  subhead("Academic Year", get(fields, ["admin", "academic_year"], ""));
  subhead("Author", get(fields, ["admin", "author"], ""));
  subhead("Student Expectations", get(fields, ["admin", "student_expectations"], ""));
  subhead("Patient Demographic", get(fields, ["admin", "patient_demographic"], ""));
  subhead("Special Supplies", get(fields, ["admin", "special_supplies"], ""));
  subhead("Case Factors", get(fields, ["admin", "case_factors"], ""));
  subhead("Additional Instructions", get(fields, ["special", "feed_back"], ""));
  doc.setFont("helvetica", "bold");
  doc.text("Summary of patient story:", margin, y); y += 14;
  doc.setFont("helvetica", "normal");
  paragraph(get(fields, ["admin", "summory_of_story"], ""));

  ensureSpace(60);
  section("Content for Standardized Patients");
  subhead("Opening Statement", get(fields, ["sp", "opening_statement"], ""));
  characterAttributes();

  ensureSpace(60);
  section("History of Present Illness");
  subhead("Setting", get(fields, ["sp", "current_ill_history", "symptom_settings"], ""));
  subhead("Timing", get(fields, ["sp", "current_ill_history", "symptom_timing"], ""));
  subhead("Associated Symptoms", get(fields, ["sp", "current_ill_history", "associated_symptoms"], ""));
  subhead("Radiation", get(fields, ["sp", "current_ill_history", "radiation_of_symptoms"], ""));
  subhead("Quality", get(fields, ["sp", "current_ill_history", "symptom_quality"], ""));
  subhead("Alleviating Factors", get(fields, ["sp", "current_ill_history", "alleviating_factors"], ""));
  subhead("Aggravating Factors", get(fields, ["sp", "current_ill_history", "aggravating_factors"], ""));
  severityBar();

  doc.addPage();
  y = margin;
  medicationBlock();

  ensureSpace(60);
  section("Past Medical History");
  const pmh = get(fields, ["med_hist", "past_med_his"], {});
  Object.entries(pmh || {}).forEach(([label, value]) => subhead(label.replace(/_/g, " "), value));

  ensureSpace(60);
  section("Preventative Medicine");
  const prev = get(fields, ["med_hist", "preventative_measure"], {});
  Object.entries(prev || {}).forEach(([label, value]) => subhead(label.replace(/_/g, " "), value));

  ensureSpace(60);
  section("Family History");
  const fam = get(fields, ["med_hist", "family_hist"], {});
  if (Array.isArray(fam) && fam.length) {
    subhead("Family Tree", fam.map((f) => `${pad(f.health_status)} • Age ${pad(f.age)} • ${pad(f.cause_of_death)}`).join(" | "));
  } else if (fam && typeof fam === "object") {
    Object.entries(fam).forEach(([label, value]) => subhead(label.replace(/_/g, " "), value));
  } else {
    paragraph("None reported");
  }

  doc.addPage();
  y = margin;
  socialHistory();
  ros();
  prompts();

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
