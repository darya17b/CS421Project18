import { useEffect, useRef, useState } from "react";
import FormsListRow from "./FormsListRow";
import Modal from "../components/Modal";
import { useStore } from "../store";
import { useToast } from "../components/Toast";
import { downloadResourcePdf } from "../utils/pdf";

const FormsSearch = () => {
  const { items } = useStore();
  const toast = useToast();
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState({ title: '', author: '', diagnosis: '', learner_level: '', patient_name: '', search: '' });

  const onArtifacts = (item) => {
    setCurrent(item);
    setArtifactsOpen(true);
  };

  const onPropose = async (item) => {
    try {
      const { api } = await import("../api/client");
      // Fetch latest doc and send it back as an update 
      const doc = await api.getDocument(item.id);
      const payload = doc || {};
      await api.updateDocument(item.id, payload);
      toast.show("Updated", { type: "success" });
    } catch {
      toast.show("Update failed", { type: "error" });
    }
  };

  const onDelete = async (item) => {
    if (!confirm(`Delete ${item.title || item.id}?`)) return;
    try {
      const { api } = await import("../api/client");
      await api.deleteDocument(item.id);
      toast.show("Deleted", { type: "success" });
      // Refresh results or base list
      if (results) {
        const fresh = await api.searchDocuments(q);
        setResults(Array.isArray(fresh) ? fresh : []);
      } else {
        const fresh = await api.listDocuments();
        setResults(Array.isArray(fresh) ? fresh : []);
      }
    } catch {
      toast.show("Delete failed", { type: "error" });
    }
  };

  const runSearch = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setErr("");
    try {
      const { api } = await import("../api/client");
      const { title, ...serverParams } = q;
      const serverRes = await api.searchDocuments(serverParams);
      const arr = Array.isArray(serverRes) ? serverRes : [];
      const needle = (s) => String(s || '').toLowerCase();
      const filtered = title
        ? arr.filter((doc) => {
            const a = doc?.admin || {};
            return needle(a.reson_for_visit || a.reason_for_visit).includes(needle(title));
          })
        : arr;
      setResults(filtered);
    } catch {
      setErr("Search failed");
      toast.show("Search failed", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = async () => {
    setQ({ title: '', author: '', diagnosis: '', learner_level: '', patient_name: '', search: '' });
    try {
      const { api } = await import("../api/client");
      setLoading(true);
      const res = await api.listDocuments();
      setResults(Array.isArray(res) ? res : []);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const visible = (results || items).filter((it) => !it.draftOf);

  return (
    <section className="w-full p-4 text-center">
      <div className="flex items-center justify-center mb-3">
        <h2 className="text-2xl font-semibold">Forms Search</h2>
      </div>

      <form onSubmit={runSearch} className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
        <input placeholder="Title" value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value })} className="rounded border px-3 py-2" />
        <input placeholder="Author" value={q.author} onChange={(e) => setQ({ ...q, author: e.target.value })} className="rounded border px-3 py-2" />
        <input placeholder="Diagnosis" value={q.diagnosis} onChange={(e) => setQ({ ...q, diagnosis: e.target.value })} className="rounded border px-3 py-2" />
        <input placeholder="Learner Level" value={q.learner_level} onChange={(e) => setQ({ ...q, learner_level: e.target.value })} className="rounded border px-3 py-2" />
        <input placeholder="Patient Name" value={q.patient_name} onChange={(e) => setQ({ ...q, patient_name: e.target.value })} className="rounded border px-3 py-2" />
        <input placeholder="Search (multi-field)" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value })} className="rounded border px-3 py-2" />
        <div className="col-span-full flex gap-2">
          <button type="submit" className="rounded bg-blue-600 text-white px-3 py-2" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
          <button type="button" onClick={clearSearch} className="rounded border px-3 py-2 hover:bg-gray-50">Reset</button>
        </div>
      </form>

      {err ? <div className="mb-3 text-sm text-red-600">{err}</div> : null}

      {visible.length === 0 ? (
        <div className="text-gray-600 border rounded-md p-6 text-center">No scripts found. Try creating one via Request New.</div>
      ) : (
        <div className="space-y-3 w-full mx-auto">
          {visible.slice(0, 10).map((it) => (
            <FormsListRow key={it.id} item={it} onArtifacts={onArtifacts} onPropose={onPropose} onDelete={onDelete} />
          ))}
        </div>
      )}

      <Modal open={artifactsOpen} title={`Resources for ${current?.id}`} onClose={() => setArtifactsOpen(false)}>
        {!current ? null : (
          <div className="space-y-2">
            {(current.artifacts && current.artifacts.length ? current.artifacts : ["Placeholder.pdf", "Placeholder.png"]).map((a, idx) => (
              <div key={idx} className="flex items-center justify-between border rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100">📄</span>
                  <span>{a}</span>
                </div>
                <button className="rounded border px-2 py-1 hover:bg-gray-50" title="Create PDF" onClick={() => downloadResourcePdf(current, a)}>
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </section>
  );
};

export default FormsSearch;
