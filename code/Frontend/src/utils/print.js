export function openPrintWindow(title, bodyHtml) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Pop-up blocked. Please allow pop-ups to export as PDF.');
    return;
  }
  const styles = `
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 24px; }
    h1,h2,h3 { margin: 0 0 8px; }
    .muted { color: #555; }
    .section { margin: 16px 0; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fff; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; }
    .small { font-size: 12px; }
    @media print { .no-print { display: none; } }
  `;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>${styles}</style></head><body>${bodyHtml}<div class="no-print" style="margin-top:16px;color:#666;">Tip: Use Save as PDF in the print dialog.</div><script>window.onload = function(){ window.focus(); setTimeout(function(){ window.print(); }, 100); }<\/script></body></html>`);
  w.document.close();
}

export function exportScriptAsPdf(item, versionObj) {
  const v = versionObj || (item.versions && item.versions[0]) || { version: 'v1' };
  const body = `
    <h1>${escapeHtml(item.title)}</h1>
    <div class="muted small">${escapeHtml(item.id)} • ${escapeHtml(item.patient)} • ${escapeHtml(item.department)} • ${escapeHtml(item.createdAt)}</div>
    <div class="section card">
      <h3>Summary</h3>
      <div>${escapeHtml(item.summary || 'No summary provided.')}</div>
    </div>
    <div class="section card">
      <h3>Version: ${escapeHtml(v.version)}</h3>
      <div class="small muted" style="margin-bottom:8px;">${escapeHtml(v.notes || 'N/A')}</div>
      <pre style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:8px;overflow:auto;">${escapeHtml(JSON.stringify(v.fields || {}, null, 2))}</pre>
    </div>
  `;
  openPrintWindow(`${item.id} - ${item.title}`, body);
}

export function exportArtifactStubAsPdf(item, artifactName) {
  const body = `
    <h1>Artifact</h1>
    <div class="section card">
      <table>
        <tr><th style="width:160px;">Script</th><td>${escapeHtml(item.id)} — ${escapeHtml(item.title)}</td></tr>
        <tr><th>Artifact</th><td>${escapeHtml(artifactName)}</td></tr>
        <tr><th>Note</th><td>This is a placeholder export (no backend).</td></tr>
      </table>
    </div>
  `;
  openPrintWindow(`${item.id} - ${artifactName}`, body);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

