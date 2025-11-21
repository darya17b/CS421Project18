import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useStore } from "../store";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { exportScriptAsPdf } from "../utils/print";
import { downloadScriptPdf, downloadResourcePdf } from "../utils/pdf";

const ScriptDetail = () => {
  const { id } = useParams();
  const store = useStore();
  const { getById } = store;
  const toast = useToast();
  const item = getById(id);
  const [version, setVersion] = useState(item?.versions?.[0]?.version || "v1");
  const [artifactsOpen, setArtifactsOpen] = useState(false);

  useEffect(() => {
    if (!item && typeof store.fetchById === "function") {
      store.fetchById(id);
    }
  }, [id, item, store]);

  if (!item) {
    return (
      <section className="w-full p-4 text-center">
        <div className="text-gray-600">
          Not found. <Link className="text-blue-600 hover:underline" to="/forms-search">Back to search</Link>
        </div>
      </section>
    );
  }

  const current = item.versions?.find((v) => v.version === version) || item.versions?.[0];
  const meta = [item.id, item.patient, item.department, item.createdAt].filter(Boolean).join(" | ");

  return (
    <section className="w-full p-4 space-y-4 text-center">
      <div className="flex items-center justify-center gap-4">
        <h2 className="text-2xl font-semibold">{item.title}</h2>
        <Link to="/forms-search" className="text-blue-600 hover:underline">Back</Link>
      </div>
      <div className="text-sm text-gray-600">{meta}</div>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        <label className="text-sm text-gray-700">Version</label>
        <select className="rounded border px-2 py-1" value={version} onChange={(e) => setVersion(e.target.value)}>
          {(item.versions || []).map((v) => (
            <option key={v.version} value={v.version}>{v.version}</option>
          ))}
        </select>
        <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={() => setArtifactsOpen(true)}>Resources</button>
        <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={() => exportScriptAsPdf(item, current)}>Print</button>
        <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={() => downloadScriptPdf(item, current)}>Download PDF</button>
      </div>

      <div className="rounded border p-3 bg-white w-full mx-auto text-left">
        <div className="font-medium mb-2">Summary</div>
        <div className="text-gray-700">{item.summary || "No summary provided."}</div>
      </div>

      <div className="rounded border p-3 bg-white w-full mx-auto text-left">
        <div className="font-medium mb-2">Version Notes</div>
        <div className="text-gray-700">{current?.notes || "N/A"}</div>
      </div>

      <div className="rounded border p-3 bg-white w-full mx-auto text-left">
        <div className="font-medium mb-2">Fields</div>
        <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(current?.fields || {}, null, 2)}</pre>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <button
          className="rounded bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700"
          onClick={async () => {
            try {
              const { api } = await import("../api/client");
              const payload = current?.fields || {};
              await api.updateDocument(item.id, payload);
              toast.show("Updated", { type: "success" });
            } catch {
              toast.show("Update failed", { type: "error" });
            }
          }}
        >
          Save Update
        </button>
        <button
          className="rounded border px-4 py-2 hover:bg-gray-50"
          onClick={async () => {
            if (!confirm("Delete this document? This cannot be undone.")) return;
            try {
              const { api } = await import("../api/client");
              await api.deleteDocument(item.id);
              toast.show("Deleted", { type: "success" });
              window.location.href = "/forms-search";
            } catch {
              toast.show("Delete failed", { type: "error" });
            }
          }}
        >
          Delete
        </button>
        <button className="rounded border px-4 py-2 hover:bg-gray-50" onClick={() => setArtifactsOpen(true)}>Open Resources</button>
      </div>

      <Modal open={artifactsOpen} title={`Resources for ${item.id}`} onClose={() => setArtifactsOpen(false)}>
        <div className="space-y-2">
          {(item.artifacts && item.artifacts.length ? item.artifacts : ["Placeholder.pdf"]).map((a, idx) => (
            <div key={idx} className="flex items-center justify-between border rounded px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-[#981e32]">PDF</span>
                <span>{a}</span>
              </div>
              <button className="rounded border px-2 py-1 hover:bg-gray-50" title="Create PDF" onClick={() => downloadResourcePdf(item, a)}>
                Download PDF
              </button>
            </div>
          ))}
        </div>
      </Modal>
    </section>
  );
};

export default ScriptDetail;
