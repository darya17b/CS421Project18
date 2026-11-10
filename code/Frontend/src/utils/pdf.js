import { jsPDF } from "jspdf";
import hpiDiagramDataUrl from "../assets/hpi-diagram.png?inline";
import { formatDobWithAge } from "./patientAge";

// handles get
const get = (obj, path, fallback = "") => path.reduce((acc, k) => (acc ? acc[k] : undefined), obj) ?? fallback;
// handles pad
const pad = (s) => (s === 0 ? "0" : s ? String(s) : "");
const COLORS = {
  crimsonDark: "#7b0a20",
  label: "#520716",
  dark: "#4d4d4d",
  body: "#000000",
  border: "#000000",
};

const VALUE_INDENT = 16.55;

// handles sanitize file part
function sanitizeFilePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// handles download resource pdf
export function downloadResourcePdf(item, resourceName) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  let y = 62;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(COLORS.crimsonDark);
  doc.text("Resource Summary", pageWidth / 2, y, { align: "center" });
  y += 22;

  doc.setDrawColor(COLORS.border);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.body);

  const rows = [
    ["Script", `${item.id} - ${item.title}`],
    ["Resource", resourceName],
    ["Note", "This is a placeholder export (no backend)."],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.label);
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.body);
    const lines = doc.splitTextToSize(String(value || ""), pageWidth - margin * 2 - VALUE_INDENT);
    doc.text(lines, margin + VALUE_INDENT, y + 13);
    y += lines.length * 13 + 20;
  });

  const safeName = `${(item.id || "script").replace(/\s+/g, "_")}-${(resourceName || "resource").replace(/\s+/g, "_")}.pdf`;
  doc.save(safeName);
}

// handles build medication card pdf file name
function buildMedicationCardPdfFileName(fields = {}) {
  const name = sanitizeFilePart(get(fields, ["patient", "name"], ""));
  return name ? `medication-card-${name}.pdf` : "medication-card.pdf";
}

// handles normalize medication row
function normalizeMedicationRow(entry) {
  if (!entry || typeof entry !== "object") return null;
  return {
    name: pad(entry.name || entry.brand_substance || entry.medication_name),
    brand: pad(entry.brand || entry.generic || entry.brand_substance || entry.generic_name),
    dose: pad(
      entry.dose
      || [pad(entry.amount), pad(entry.unit)].filter(Boolean).join(" ")
      || entry.medication_dose
    ),
    frequency: pad(entry.frequency || entry.frequency_reason || entry.schedule),
    startDate: pad(entry.startDate || entry.date_started || entry.dateStarted),
  };
}

// handles normalize non prescription row
function normalizeNonPrescriptionRow(entry) {
  if (typeof entry === "string") {
    const text = pad(entry);
    return text ? { name: text, brand: "", dose: "", frequency: "", startDate: "" } : null;
  }
  if (!entry || typeof entry !== "object") return null;
  if (entry.text) {
    const text = pad(entry.text);
    return text ? { name: text, brand: "", dose: "", frequency: "", startDate: "" } : null;
  }
  return {
    name: pad(entry.name || entry.brand_substance || entry.medication_name),
    brand: pad(entry.brand || entry.generic || entry.brand_substance || entry.generic_name),
    dose: pad(
      entry.dose
      || [pad(entry.amount), pad(entry.unit)].filter(Boolean).join(" ")
      || entry.medication_dose
    ),
    frequency: pad(entry.frequency || entry.frequency_reason || entry.schedule),
    startDate: pad(entry.startDate || entry.date_started || entry.dateStarted),
  };
}

// handles normalize medication rows
function normalizeMedicationRows(rawValue) {
  return (Array.isArray(rawValue) ? rawValue : [rawValue])
    .map(normalizeMedicationRow)
    .filter((row) => row && (row.name || row.brand || row.dose || row.frequency || row.startDate));
}

// handles normalize non prescription rows
function normalizeNonPrescriptionRows(rawValue) {
  return (Array.isArray(rawValue) ? rawValue : [rawValue])
    .map(normalizeNonPrescriptionRow)
    .filter((row) => row && (row.name || row.brand || row.dose || row.frequency || row.startDate));
}

async function fetchMedicationRowsByDocumentId(id) {
  if (!id) return [];
  const base = import.meta.env.VITE_API_URL || "/api";
  const url = `${base}/document/medications?id=${encodeURIComponent(id)}`;
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return normalizeMedicationRows(data);
  } catch {
    return [];
  }
}

export async function downloadMedicationCardPdf(item, versionObj, resourceName = "Medication Card") {
  const fields = versionObj?.fields || item?.versions?.[0]?.fields || item?.fields || {};
  const medHist =
    get(fields, ["med_hist"], null)
    || get(item, ["med_hist"], null)
    || get(versionObj, ["med_hist"], null)
    || {};
  const patientName = pad(get(fields, ["patient", "name"], "")) || "Patient";
  const patientAge = pad(get(fields, ["patient", "age"], ""));
  const fieldRows = normalizeMedicationRows(medHist?.medications || []);
  const apiRows = await fetchMedicationRowsByDocumentId(item?.id);
  const prescribedMeds = apiRows.length ? apiRows : fieldRows;
  const nonPrescriptionMeds = normalizeNonPrescriptionRows(
    medHist?.non_prescription_medications
    || medHist?.nonPrescriptionMedications
    || medHist?.non_prescription
    || []
  );

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  const pageBottom = doc.internal.pageSize.getHeight() - margin;
  let y = 62;

  const colWidths = [95, 95, 90, 130, 95];
  const headers = ["Name", "Brand", "Dose", "Frequency", "Date Started"];
  const tableX = margin;
  const rowPaddingY = 5;
  const lineHeight = 12;

  // handles draw table header
  const drawTableHeader = () => {
    let x = tableX;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.body);
    headers.forEach((header, idx) => {
      doc.rect(x, y, colWidths[idx], 20);
      doc.text(header, x + 4, y + 13);
      x += colWidths[idx];
    });
    y += 20;
  };

  // handles ensure row space
  const ensureRowSpace = (height) => {
    if (y + height > pageBottom) {
      doc.addPage();
      y = margin;
      drawTableHeader();
    }
  };

  // handles draw medication table
  const drawMedicationTable = (title, rows, emptyText) => {
    ensureRowSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(COLORS.crimsonDark);
    doc.text(title, margin, y + 12);
    y += 20;

    drawTableHeader();

    if (!rows.length) {
      ensureRowSpace(24);
      const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
      doc.rect(tableX, y, totalWidth, 24);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text(emptyText, tableX + 4, y + 15);
      y += 24;
      return;
    }

    rows.forEach((row) => {
      const values = [row.name, row.brand, row.dose, row.frequency, row.startDate].map((value) => value || "N/A");
      const wrapped = values.map((value, idx) => doc.splitTextToSize(value, colWidths[idx] - 8));
      const rowHeight = Math.max(24, ...wrapped.map((lines) => lines.length * lineHeight + rowPaddingY * 2));

      ensureRowSpace(rowHeight);

      let x = tableX;
      wrapped.forEach((lines, idx) => {
        doc.rect(x, y, colWidths[idx], rowHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(lines, x + 4, y + rowPaddingY + 9);
        x += colWidths[idx];
      });
      y += rowHeight;
    });
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(COLORS.crimsonDark);
  doc.text(resourceName || "Medication Card", pageWidth / 2, y, { align: "center" });
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.body);
  doc.text(`Patient Name: ${patientName}`, margin, y);
  y += 16;
  doc.text(`Patient Age: ${patientAge || "N/A"}`, margin, y);
  y += 16;

  drawMedicationTable("Prescription Medications", prescribedMeds, "No prescription medications listed.");
  y += 12;
  drawMedicationTable("Non-prescription Medications", nonPrescriptionMeds, "No non-prescription medications listed.");

  const safeName = buildMedicationCardPdfFileName(fields);
  doc.save(safeName);
}

// handles build lab data card pdf file name
function buildLabDataCardPdfFileName(fields = {}) {
  const name = sanitizeFilePart(get(fields, ["patient", "name"], ""));
  return name ? `lab-data-card-${name}.pdf` : "lab-data-card.pdf";
}

// handles to finite number
function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// handles classify range
function classifyRange(value, low, high) {
  if (!Number.isFinite(value)) return "";
  if (Number.isFinite(low) && value < low) return "Low";
  if (Number.isFinite(high) && value > high) return "High";
  return "Normal";
}

// handles to text lines
function toTextLines(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (!entry || typeof entry !== "object") return "";
        return String(entry.text || entry.details || entry.name || "").trim();
      })
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }
  const text = String(value || "").trim();
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

// handles build derived vital rows
function buildDerivedVitalRows(fields = {}) {
  const vitals = get(fields, ["patient", "vitals"], {}) || {};
  const heartRate = toFiniteNumber(vitals?.heart_rate);
  const respirations = toFiniteNumber(vitals?.respirations);
  const systolic = toFiniteNumber(vitals?.pressure?.top);
  const diastolic = toFiniteNumber(vitals?.pressure?.bottom);
  const bloodOxygen = toFiniteNumber(vitals?.blood_oxygen);
  const tempReading = toFiniteNumber(vitals?.temp?.reading);
  const tempUnitRaw = String(vitals?.temp?.unit ?? "").trim().toLowerCase();
  const tempIsFahrenheit = tempUnitRaw === "1" || tempUnitRaw.startsWith("f");
  const tempCelsius = Number.isFinite(tempReading)
    ? (tempIsFahrenheit ? ((tempReading - 32) * 5) / 9 : tempReading)
    : null;

  return [
    {
      test: "Heart Rate",
      result: Number.isFinite(heartRate) ? String(heartRate) : "N/A",
      unit: "bpm",
      flag: classifyRange(heartRate, 60, 100),
    },
    {
      test: "Respirations",
      result: Number.isFinite(respirations) ? String(respirations) : "N/A",
      unit: "breaths/min",
      flag: classifyRange(respirations, 12, 20),
    },
    {
      test: "Blood Oxygen Saturation",
      result: Number.isFinite(bloodOxygen) ? String(bloodOxygen) : "N/A",
      unit: "%",
      flag: Number.isFinite(bloodOxygen) ? (bloodOxygen < 95 ? "Low" : "Normal") : "",
    },
    {
      test: "Systolic Blood Pressure",
      result: Number.isFinite(systolic) ? String(systolic) : "N/A",
      unit: "mmHg",
      flag: classifyRange(systolic, 90, 120),
    },
    {
      test: "Diastolic Blood Pressure",
      result: Number.isFinite(diastolic) ? String(diastolic) : "N/A",
      unit: "mmHg",
      flag: classifyRange(diastolic, 60, 80),
    },
    {
      test: "Temperature",
      result: Number.isFinite(tempReading) ? tempReading.toFixed(1) : "N/A",
      unit: tempIsFahrenheit ? "F" : "C",
      flag: classifyRange(tempCelsius, 36.1, 37.2),
    },
  ];
}

// handles build derived lab notes
function buildDerivedLabNotes(fields = {}) {
  const notes = [
    get(fields, ["admin", "chief_concern"], ""),
    get(fields, ["admin", "diagnosis"], ""),
    get(fields, ["sp", "current_ill_history", "symptom_quality"], ""),
    get(fields, ["sp", "current_ill_history", "associated_symptoms"], ""),
    get(fields, ["med_hist", "preventative_measure", "screening_tests"], ""),
  ]
    .flatMap((value) => toTextLines(value))
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  return Array.from(new Set(notes));
}

// handles download lab data card pdf
export function downloadLabDataCardPdf(item, versionObj, resourceName = "Lab Data Card") {
  const fields = versionObj?.fields || item?.versions?.[0]?.fields || item?.fields || {};
  const patientName = pad(get(fields, ["patient", "name"], "")) || "Patient";
  const patientDob = pad(get(fields, ["patient", "date_of_birth"], get(fields, ["patient", "dob"], "")));
  const vitalRows = buildDerivedVitalRows(fields);
  const notes = buildDerivedLabNotes(fields);

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  const pageBottom = doc.internal.pageSize.getHeight() - margin;
  let y = 62;

  const headers = ["Test", "Result", "Unit", "Flag"];
  const colWidths = [220, 95, 90, 90];
  const tableX = margin;
  const lineHeight = 12;
  const rowPaddingY = 5;

  // handles draw table header
  const drawTableHeader = () => {
    let x = tableX;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.body);
    headers.forEach((header, idx) => {
      doc.rect(x, y, colWidths[idx], 20);
      doc.text(header, x + 4, y + 13);
      x += colWidths[idx];
    });
    y += 20;
  };

  // handles ensure row space
  const ensureRowSpace = (height) => {
    if (y + height > pageBottom) {
      doc.addPage();
      y = margin;
      drawTableHeader();
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(COLORS.crimsonDark);
  doc.text(resourceName || "Lab Data Card", pageWidth / 2, y, { align: "center" });
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(COLORS.body);
  doc.text(`Patient Name: ${patientName}`, margin, y);
  y += 16;
  doc.text(`Date of Birth: ${patientDob || "N/A"}`, margin, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(COLORS.crimsonDark);
  doc.text("Derived Vital Measurements", margin, y + 12);
  y += 20;

  drawTableHeader();

  vitalRows.forEach((row) => {
    const values = [row.test, row.result, row.unit, ""];
    const wrapped = values.map((value, idx) => doc.splitTextToSize(String(value ?? "N/A"), colWidths[idx] - 8));
    const rowHeight = Math.max(24, ...wrapped.map((lines) => lines.length * lineHeight + rowPaddingY * 2));
    ensureRowSpace(rowHeight);
    let x = tableX;
    wrapped.forEach((lines, idx) => {
      doc.rect(x, y, colWidths[idx], rowHeight);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(COLORS.body);
      doc.text(lines, x + 4, y + rowPaddingY + 9);
      x += colWidths[idx];
    });
    y += rowHeight;
  });

  y += 14;
  ensureRowSpace(28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(COLORS.crimsonDark);
  doc.text("Additional Clinical Inputs (Lab-Relevant)", margin, y);
  y += 10;

  const noteLines = notes.length ? notes.map((line) => `- ${line}`) : ["- None provided"];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.body);
  noteLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
    ensureRowSpace(wrapped.length * 12 + 2);
    doc.text(wrapped, margin, y + 12);
    y += wrapped.length * 12 + 2;
  });

  const safeName = buildLabDataCardPdfFileName(fields);
  doc.save(safeName);
}

// handles build door note pdf file name
function buildDoorNotePdfFileName(fields = {}) {
  const name = sanitizeFilePart(get(fields, ["patient", "name"], ""));
  const reason = sanitizeFilePart(get(fields, ["admin", "reson_for_visit"], get(fields, ["patient", "visit_reason"], "")));
  if (name && reason) return `door-note-${name}-${reason}.pdf`;
  if (name) return `door-note-${name}.pdf`;
  if (reason) return `door-note-${reason}.pdf`;
  return "door-note.pdf";
}

// handles create door note pdf file
export function createDoorNotePdfFile(script = {}, fileName = "") {
  const fields = script?.fields && typeof script.fields === "object" ? script.fields : (script || {});
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 36;
  const marginRight = 36;
  const top = 54;
  const bottom = pageHeight - 48;
  const labelSize = 12;
  const valueSize = 11;
  const lineHeight = 13;
  let y = top;

  // handles ensure space
  const ensureSpace = (space = 20) => {
    if (y + space > bottom) {
      doc.addPage();
      y = top;
    }
  };

  // handles draw title
  const drawTitle = (text) => {
    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(COLORS.crimsonDark);
    doc.text(text, pageWidth / 2, y, { align: "center" });
    y += 22;
  };

  // handles draw section
  const drawSection = (text) => {
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(COLORS.body);
    doc.text(text, marginLeft, y);
    y += 16;
  };

  // handles draw field
  const drawField = (label, value) => {
    const clean = value === undefined || value === null ? "" : String(value).trim();
    const valueText = clean || "None";
    const wrapWidth = Math.max(40, pageWidth - marginLeft - marginRight - VALUE_INDENT);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueSize);
    doc.setTextColor(COLORS.body);
    const wrapped = doc.splitTextToSize(valueText, wrapWidth);
    const blockHeight = lineHeight + Math.max(lineHeight, wrapped.length * lineHeight) + 6;
    ensureSpace(blockHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelSize);
    doc.setTextColor(COLORS.crimsonDark);
    doc.text(`${label}:`, marginLeft, y);
    y += lineHeight;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueSize);
    doc.setTextColor(COLORS.body);
    doc.text(wrapped, marginLeft + VALUE_INDENT, y);
    y += Math.max(lineHeight, wrapped.length * lineHeight) + 6;
  };

  // handles draw list field
  const drawListField = (label, entries) => {
    const lines = (entries || []).map((entry) => String(entry || "").trim()).filter(Boolean);
    const finalLines = lines.length ? lines : ["None"];
    const wrapWidth = Math.max(40, pageWidth - marginLeft - marginRight - VALUE_INDENT);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueSize);
    doc.setTextColor(COLORS.body);
    const wrapped = finalLines.flatMap((line) => doc.splitTextToSize(`- ${line}`, wrapWidth));
    const blockHeight = lineHeight + Math.max(lineHeight, wrapped.length * lineHeight) + 6;
    ensureSpace(blockHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelSize);
    doc.setTextColor(COLORS.crimsonDark);
    doc.text(`${label}:`, marginLeft, y);
    y += lineHeight;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueSize);
    doc.setTextColor(COLORS.body);
    doc.text(wrapped, marginLeft + VALUE_INDENT, y);
    y += Math.max(lineHeight, wrapped.length * lineHeight) + 6;
  };

  // handles draw heart marker
  const drawHeartMarker = (cx, cy, size = 12) => {
    const radius = size * 0.28;
    const lobeY = cy - size * 0.18;
    doc.setFillColor(176, 12, 38);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.8);
    doc.circle(cx - radius, lobeY, radius, "FD");
    doc.circle(cx + radius, lobeY, radius, "FD");
    doc.triangle(
      cx - radius * 2,
      lobeY,
      cx + radius * 2,
      lobeY,
      cx,
      cy + size * 0.75,
      "FD"
    );
  };

  // handles draw symptom diagram
  const drawSymptomDiagram = () => {
    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelSize);
    doc.setTextColor(COLORS.crimsonDark);
    doc.text("Symptom Location Diagram:", marginLeft, y);
    y += lineHeight;

    if (!hpiDiagramDataUrl) {
      drawField("Symptom Location Diagram", "Unavailable");
      return;
    }

    const rawMarkers = get(fields, ["sp", "current_ill_history", "symptom_diagram"], []);
    const markers = (Array.isArray(rawMarkers) ? rawMarkers : [rawMarkers])
      .map((m) => ({ x: Number(m?.x), y: Number(m?.y) }))
      .filter((m) => Number.isFinite(m.x) && Number.isFinite(m.y));

    try {
      const props = doc.getImageProperties(hpiDiagramDataUrl);
      const ratio = props?.width && props?.height ? props.height / props.width : 1;
      const maxDiagramWidth = Math.min(300, pageWidth - marginLeft - marginRight);
      const width = Math.max(140, maxDiagramWidth);
      const height = Math.max(40, width * ratio);
      ensureSpace(height + 10);
      const imageX = marginLeft + (pageWidth - marginLeft - marginRight - width) / 2;
      doc.addImage(hpiDiagramDataUrl, "PNG", imageX, y, width, height);
      markers.forEach((marker) => {
        const x = imageX + Math.max(0, Math.min(1, marker.x)) * width;
        const heartY = y + Math.max(0, Math.min(1, marker.y)) * height;
        drawHeartMarker(x, heartY, 12);
      });
      y += height + 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(COLORS.dark);
      doc.text(`Symptom markers: ${markers.length}`, imageX, y);
      y += 12;
    } catch {
      drawField("Symptom Location Diagram", "Unable to render diagram.");
    }
  };

  const doorTempReadingRaw = get(fields, ["patient", "vitals", "temp", "reading"], "");
  const doorTempReading = Number(doorTempReadingRaw);
  const doorTempUnitRaw = String(get(fields, ["patient", "vitals", "temp", "unit"], "")).toLowerCase();
  const doorIsFahrenheit = doorTempUnitRaw === "1" || doorTempUnitRaw.startsWith("f");
  const doorTempPair = Number.isFinite(doorTempReading) && doorTempReading > 0
    ? (
      doorIsFahrenheit
        ? `${doorTempReading.toFixed(1)}� F / ${(((doorTempReading - 32) * 5) / 9).toFixed(1)}� C`
        : `${doorTempReading.toFixed(1)}� C / ${((doorTempReading * 9) / 5 + 32).toFixed(1)}� F`
    )
    : "";

  const vitalLines = [
    `Heart Rate: ${pad(get(fields, ["patient", "vitals", "heart_rate"], "")) || "None"} beats/min`,
    `Respirations: ${pad(get(fields, ["patient", "vitals", "respirations"], "")) || "None"} respirations/min`,
    `Systolic Pressure: ${pad(get(fields, ["patient", "vitals", "pressure", "top"], "")) || "None"} mmHg`,
    `Diastolic Pressure: ${pad(get(fields, ["patient", "vitals", "pressure", "bottom"], "")) || "None"} mmHg`,
    `Blood Oxygen Saturation: ${pad(get(fields, ["patient", "vitals", "blood_oxygen"], "")) || "None"} %`,
    doorTempPair || "None",
  ];
  const includeDoorNoteVitalsRaw = get(fields, ["patient", "vitals_included_on_door_note"], true);
  // handles include door note vitals
  const includeDoorNoteVitals = (() => {
    if (includeDoorNoteVitalsRaw === false) return false;
    if (typeof includeDoorNoteVitalsRaw === "number") return includeDoorNoteVitalsRaw !== 0;
    const lowered = String(includeDoorNoteVitalsRaw || "").trim().toLowerCase();
    if (!lowered) return true;
    return !["false", "0", "no", "off"].includes(lowered);
  })();

  drawTitle("Door Note and Learner Instruction");
  drawSection("Instructions to Learners:");
  drawField("Patient Name", get(fields, ["patient", "name"], ""));
  const patientDob = get(fields, ["patient", "date_of_birth"], get(fields, ["patient", "dob"], ""));
  drawField("Date of Birth", formatDobWithAge(patientDob));
  if (includeDoorNoteVitals) {
    drawListField("Vital Signs", vitalLines);
  } else {
    drawField("Vital Signs", "Not included on door note");
  }
  drawField("Diagnosis", get(fields, ["admin", "diagnosis"], get(fields, ["admin", "reson_for_visit"], get(fields, ["patient", "visit_reason"], ""))));
  drawField("Context", get(fields, ["patient", "context"], ""));
  drawField("Task", get(fields, ["patient", "task"], ""));
  drawField("Patient Encounter Duration", get(fields, ["patient", "encounter_duration"], ""));
  drawSymptomDiagram();

  const resolvedName = sanitizeFilePart(fileName);
  const safeName = resolvedName.endsWith(".pdf")
    ? resolvedName
    : (resolvedName ? `${resolvedName}.pdf` : buildDoorNotePdfFileName(fields));
  const blob = doc.output("blob");
  return new File([blob], safeName, { type: "application/pdf" });
}









