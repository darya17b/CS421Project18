import { downloadResourcePdf, printScriptPdf } from "./pdf";

export function exportScriptAsPdf(item, versionObj) {
  printScriptPdf(item, versionObj);
}

export function exportArtifactStubAsPdf(item, artifactName) {
  downloadResourcePdf(item, artifactName);
}
