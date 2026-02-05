import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FormsListRow from "./FormsListRow";
import Modal from "../components/Modal";
import { useStore } from "../store";
import { useToast } from "../components/Toast";
import { downloadResourcePdf } from "../utils/pdf";
import { getArtifactBadge, getArtifactName, getArtifactUrl } from "../utils/artifacts";

const FormsSearch = () => {
  const { items, refreshDocuments } = useStore();
  const toast = useToast();
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState({ title: "", author: "", diagnosis: "", learner_level: "", patient_name: "", search: "" });
  const [showFilters, setShowFilters] = useState(false);
  const openArtifact = (artifact) => {
    const url = getArtifactUrl(artifact);
    if (url) {
      window.open(url, "_blank", "noopener");
    } else {
      downloadResourcePdf(current, getArtifactName(artifact));
    }
  };

  useEffect(() => {
    if (typeof refreshDocuments === "function") {
      refreshDocuments().catch((err) => console.warn("Failed to refresh documents", err));
    }
    // refresh on page load to pick up newly approved scripts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onArtifacts = (item) => {
    setCurrent(item);
    setArtifactsOpen(true);
  };

  const onPropose = async (item) => {
    try {
      const { api } = await import("../api/client");
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
      const needle = (s) => String(s || "").toLowerCase();
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
    setQ({ title: "", author: "", diagnosis: "", learner_level: "", patient_name: "", search: "" });
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
    <section className="w-full space-y-5">
      <div className="flex items-center justify-between text-left">
        <h1 className="text-2xl font-semibold text-[#b4152b]">Script Library</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-[#981e32]"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 stroke-current">
              <circle cx="9" cy="9" r="6" strokeWidth="2" />
              <path d="M13.5 13.5 18 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {showFilters ? "Hide search" : "Search library"}
          </button>
          <Link to="/" className="text-sm text-[#981e32] font-semibold hover:underline">Home</Link>
        </div>
      </div>

      {showFilters ? (
        <form onSubmit={runSearch} className="search-panel p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
          {[
            ["title", "Title"],
            ["author", "Author"],
            ["diagnosis", "Diagnosis"],
            ["learner_level", "Learner Level"],
            ["patient_name", "Patient Name"],
            ["search", "Multi-field Search"],
          ].map(([key, label]) => (
            <label key={key} className="text-xs text-gray-600 font-semibold flex flex-col gap-2 uppercase tracking-[0.15em]">
              {label}
              <input
                value={q[key] || ""}
                onChange={(e) => setQ({ ...q, [key]: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1b76d2]"
                placeholder={`Filter by ${label.toLowerCase()}`}
              />
            </label>
          ))}
          <div className="col-span-full flex flex-wrap gap-3 justify-end pt-2">
            <button type="submit" className="rounded-full bg-[#981e32] text-white px-5 py-2 font-semibold" disabled={loading}>
              {loading ? "Searching..." : "Run Search"}
            </button>
            <button type="button" onClick={clearSearch} className="rounded-full border border-gray-400 px-5 py-2 font-semibold text-gray-700 hover:border-[#981e32]">
              Clear Filters
            </button>
          </div>
        </form>
      ) : null}

      {err ? <div className="text-sm text-red-600 font-semibold">{err}</div> : null}

      {visible.length === 0 ? (
        <div className="text-gray-600 border border-dashed border-gray-400 rounded-2xl p-8 text-center bg-white">
          No scripts found. Try adjusting filters or create a new script request.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.slice(0, 10).map((it) => (
            <FormsListRow key={it.id} item={it} onArtifacts={onArtifacts} onPropose={onPropose} onDelete={onDelete} />
          ))}
        </div>
      )}

      <Modal open={artifactsOpen} title={`Resources for ${current?.id}`} onClose={() => setArtifactsOpen(false)}>
        {!current ? null : (
          <div className="space-y-2">
            {current.artifacts && current.artifacts.length ? (
              current.artifacts.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between border rounded px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-[#981e32]">
                      {getArtifactBadge(a)}
                    </span>
                    <span>{getArtifactName(a)}</span>
                  </div>
                  <button className="rounded border px-2 py-1 hover:bg-gray-50" title="Download resource" onClick={() => openArtifact(a)}>
                    Download
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-600">No resources uploaded.</div>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
};

export default FormsSearch;
