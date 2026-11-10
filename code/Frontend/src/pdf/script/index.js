// Public entry point for script PDFs. The renderer and templates are loaded on
// first use so @react-pdf/renderer stays out of the main bundle.

// handles sanitize file part
const sanitizeFilePart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "");

// handles build script pdf file name
export function buildScriptPdfFileName(item) {
  const id = sanitizeFilePart(item?.id || "script");
  const title = sanitizeFilePart(item?.title);
  return title ? `${id}-${title}.pdf` : `${id}.pdf`;
}

// handles build script pdf blob
export async function buildScriptPdfBlob(item, versionObj) {
  const [{ pdf }, { createElement }, { default: ScriptDocument }, { buildScriptViewModel }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("react"),
    import("./ScriptDocument.jsx"),
    import("./data"),
  ]);
  const model = buildScriptViewModel(item, versionObj);
  return pdf(createElement(ScriptDocument, { model })).toBlob();
}

// handles download script pdf
export async function downloadScriptPdf(item, versionObj) {
  const blob = await buildScriptPdfBlob(item, versionObj);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildScriptPdfFileName(item);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// handles preview script pdf
// Opens the tab before rendering so the popup is tied to the click and not blocked.
export async function previewScriptPdf(item, versionObj) {
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    throw new Error("Pop-up blocked. Please allow pop-ups to preview PDFs.");
  }
  previewWindow.document.title = "Generating PDF…";
  previewWindow.document.body.style.fontFamily = "system-ui, sans-serif";
  previewWindow.document.body.textContent = "Generating PDF…";

  try {
    const blob = await buildScriptPdfBlob(item, versionObj);
    const url = URL.createObjectURL(blob);
    previewWindow.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  } catch (err) {
    previewWindow.close();
    throw err;
  }
}
