import { downloadResourcePdf, printScriptPdf } from "./pdf";

// handles export script as pdf
export function exportScriptAsPdf(item, versionObj) {
  printScriptPdf(item, versionObj);
}

// handles export artifact stub as pdf
export function exportArtifactStubAsPdf(item, artifactName) {
  downloadResourcePdf(item, artifactName);
}
