import { jsPDF } from "jspdf";

export function downloadScriptPdf(item, versionObj) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(item.title || "Untitled Script", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const meta = `${item.id} | ${item.patient} | ${item.department} | ${item.createdAt}`;
  wrapLines(doc, meta, margin, y, 515).forEach((line) => {
    doc.text(line, margin, y);
    y += 14;
  });
  y += 6;

  const v = versionObj || (item.versions && item.versions[0]) || { version: "v1", notes: "", fields: {} };

  sectionTitle(doc, "Summary", margin, y); y += 18;
  wrapLines(doc, item.summary || "No summary provided.", margin, y, 515).forEach((line) => { doc.text(line, margin, y); y += 14; });
  y += 12;

  sectionTitle(doc, `Version: ${v.version}`, margin, y); y += 18;
  if (v.notes) { wrapLines(doc, v.notes, margin, y, 515).forEach((line) => { doc.text(line, margin, y); y += 14; }); y += 8; }
  sectionTitle(doc, "Fields", margin, y); y += 18;
  const fieldsText = JSON.stringify(v.fields || {}, null, 2);
  wrapLines(doc, fieldsText, margin, y, 515).forEach((line) => { doc.text(line, margin, y); y += 14; });

  doc.save(`${(item.id || "script").replace(/\s+/g, "_")}.pdf`);
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
    const lines = wrapLines(doc, value, margin + 80, y, 480);
    if (lines.length === 0) { y += 16; return; }
    lines.forEach((line, i) => { doc.text(line, i === 0 ? margin + 80 : margin + 80, y); y += 16; });
    y += 8;
  });

  const safeName = `${(item.id || "script").replace(/\s+/g, "_")}-${(resourceName || "resource").replace(/\s+/g, "_")}.pdf`;
  doc.save(safeName);
}

function sectionTitle(doc, text, x, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(text, x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
}

function wrapLines(doc, text, x, y, width) {
  if (!text) return [];
  return doc.splitTextToSize(String(text), width);
}
