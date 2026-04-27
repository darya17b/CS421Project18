import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FormsListRow from "./FormsListRow";
import Modal from "../components/Modal";
import { useStore } from "../store";
import { useToast } from "../components/Toast";
import { downloadResourcePdf, downloadMedicationCardPdf, downloadLabDataCardPdf } from "../utils/pdf";
import {
  collapseDoorNoteArtifacts,
  dedupeArtifacts,
  getArtifactBadge,
  getArtifactName,
  getArtifactUrl,
  isMedicationCardName,
  isLabDataCardName,
} from "../utils/artifacts";
import { buildScriptFromForm } from "../utils/scriptFormat";

const reviewOfSystemsFields = [
  "general",
  "skin",
  "heent",
  "neck",
  "breast",
  "respiratory",
  "cardiovascular",
  "gastrointestinal",
  "genitourinary",
  "peripheral_vascular",
  "musculoskeletal",
  "psychiatric",
  "neurologival",
  "endocine",
];

// handles clone value
const cloneValue = (value) => JSON.parse(JSON.stringify(value));

// handles extract text list
const extractTextList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (!entry || typeof entry !== "object") return "";
        if (entry.text) return entry.text;
        if (entry.brand_substance || entry.amount || entry.unit || entry.frequency_reason) {
          const brand = String(entry.brand_substance || "").trim();
          const amount = String(entry.amount || "").trim();
          const unit = String(entry.unit || "").trim();
          const reason = String(entry.frequency_reason || "").trim();
          const amountWithUnit = amount && unit ? `${amount}${unit}` : amount || "";
          return [[brand, amountWithUnit].filter(Boolean).join(" "), reason].filter(Boolean).join(" - ");
        }
        return "";
      })
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }
  const text = String(value || "").trim();
  return text ? [text] : [];
};

// handles to bulleted text
const toBulletedText = (value) => {
  const entries = extractTextList(value);
  return entries.length ? entries.map((entry) => `- ${entry}`).join("\n") : "";
};

// handles to multiline text
const toMultilineText = (value) => extractTextList(value).join("\n");

// handles unique artifacts
const uniqueArtifacts = (artifacts = []) => {
  return collapseDoorNoteArtifacts(dedupeArtifacts(artifacts));
};

// handles get current version entry
const getCurrentVersionEntry = (item) => {
  const versions = Array.isArray(item?.versions) ? item.versions : [];
  if (!versions.length) return null;
  return (
    versions.find((entry) => String(entry?.version || "").trim().toLowerCase() === "current")
    || versions[0]
    || null
  );
};

// handles build symptom review payload
const buildSymptomReviewPayload = (symptomReview = {}) =>
  reviewOfSystemsFields.reduce((acc, key) => {
    acc[key] = toMultilineText(symptomReview?.[key]);
    return acc;
  }, {});

// handles build request payload from library item
const buildRequestPayloadFromLibraryItem = (item, scriptFields) => {
  const normalizedScript = buildScriptFromForm(
    scriptFields && typeof scriptFields === "object" ? cloneValue(scriptFields) : {}
  );
  const fields = normalizedScript && typeof normalizedScript === "object" ? normalizedScript : {};
  const now = new Date().toISOString();
  return {
    reason_for_visit: fields.admin?.reson_for_visit || fields.patient?.visit_reason || "",
    simulation_modal: fields.meta?.simulation_modal || "Standardized Patient",
    case_setting: fields.patient?.context || "",
    chief_concern: fields.admin?.chief_concern || "",
    diagnosis: fields.admin?.diagnosis || "",
    event: fields.admin?.medical_event || "",
    pedagogy: fields.meta?.pedagogy || fields.admin?.learner_level || "",
    class: fields.admin?.case_letter || fields.admin?.class || "",
    learner_level: fields.admin?.learner_level || "",
    summary_patient_story: fields.admin?.summory_of_story || "",
    pert_aspects_patient_case: fields.admin?.case_factors || "",
    physical_chars: fields.sp?.physical_chars || "",
    student_expec: String(fields.admin?.student_expectations || "").trim(),
    spec_phyis_findings: fields.sp?.current_ill_history?.symptom_quality || "",
    patient_demog: fields.admin?.patient_demographic || fields.patient?.name || "",
    special_needs: String(fields.special?.oppurtunity || fields.admin?.special_supplies || "").trim(),
    case_factors: fields.admin?.case_factors || "",
    additonal_ins: fields.special?.feed_back || "",
    sympt_review: fields.med_hist?.sympton_review || buildSymptomReviewPayload({}),
    status: "Pending",
    note: `Sent from library script ${item.id}`,
    created_at: now,
    updated_at: now,
    draft_script: fields,
    draft_versions: [
      {
        version: "rv1",
        notes: "Sent from library",
        fields,
        created_at: now,
      },
    ],
    artifacts: uniqueArtifacts([
      ...(Array.isArray(fields.artifacts) ? fields.artifacts : []),
      ...(Array.isArray(item?.artifacts) ? item.artifacts : []),
    ]),
  };
};

// handles forms search
const FormsSearch = () => {
  const {
    items,
    requests,
    refreshDocuments,
    refreshRequests,
    deleteItem,
    createRequest,
    updateRequest,
    deleteRequest,
  } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("role") === "admin";
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState({ title: "", author: "", diagnosis: "", learner_level: "", patient_name: "", search: "" });
  const [showFilters, setShowFilters] = useState(false);
  // handles open artifact
  const openArtifact = (artifact) => {
    const currentVersion = getCurrentVersionEntry(current);
    if (artifact?.__generatedMedicationCard) {
      void downloadMedicationCardPdf(current, currentVersion || undefined, artifact?.name || "Medication Card");
      return;
    }
    if (artifact?.__generatedLabDataCard) {
      void downloadLabDataCardPdf(current, currentVersion || undefined, artifact?.name || "Lab Data Card");
      return;
    }
    const artifactName = getArtifactName(artifact);
    if (isMedicationCardName(artifactName)) {
      void downloadMedicationCardPdf(current, currentVersion || undefined, artifactName);
      return;
    }
    if (isLabDataCardName(artifactName)) {
      void downloadLabDataCardPdf(current, currentVersion || undefined, artifactName);
      return;
    }
    const url = getArtifactUrl(artifact);
    if (url) {
      window.open(url, "_blank", "noopener");
    } else {
      downloadResourcePdf(current, artifactName);
    }
  };

  useEffect(() => {
    if (typeof refreshDocuments === "function") {
      refreshDocuments().catch((err) => console.warn("Failed to refresh documents", err));
    }
    // refresh on page load to pick up newly approved scripts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handles on artifacts
  const onArtifacts = (item) => {
    setCurrent(item);
    setArtifactsOpen(true);
  };
  // handles on clone
  const onClone = (item) => {
    const currentVersion = getCurrentVersionEntry(item);
    const versionKey = String(currentVersion?.version || "current").trim() || "current";
    const from = `${location.pathname}${location.search}${location.hash}`;
    navigate(
      `/clone-new?clone_source=document&source_id=${encodeURIComponent(item.id)}&version=${encodeURIComponent(versionKey)}`,
      {
        state: {
          document: item,
          versionKey,
          from,
        },
      }
    );
  };
  const resourceItems = [
    { __generatedMedicationCard: true, name: "Medication Card" },
    { __generatedLabDataCard: true, name: "Lab Data Card" },
    ...collapseDoorNoteArtifacts(Array.isArray(current?.artifacts) ? current.artifacts : []),
  ];

  // handles on propose
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

  // handles on delete
  const onDelete = async (item) => {
    if (!confirm(`Delete ${item.title || item.id}?`)) return;
    try {
      const { api } = await import("../api/client");
      const linkedRequest = resolveLinkedPublishedRequest(item);
      if (typeof deleteItem === "function") {
        await deleteItem(item.id);
      } else {
        await api.deleteDocument(item.id);
      }
      if (linkedRequest?.id) {
        if (typeof deleteRequest === "function") {
          await deleteRequest(linkedRequest.id);
        } else {
          await api.deleteScriptRequest(linkedRequest.id);
        }
      }
      toast.show("Deleted", { type: "success" });
      if (typeof refreshRequests === "function") {
        await refreshRequests();
      }
      if (typeof refreshDocuments === "function") {
        await refreshDocuments();
      }
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

  // handles on send back to requests
  const onSendBackToRequests = async (item) => {
    if (!confirm(`Send ${item.title || item.id} back to requests?`)) return;
    try {
      const { api } = await import("../api/client");
      const linkedRequest = resolveLinkedPublishedRequest(item);
      let sourceScript = getCurrentVersionEntry(item)?.fields || null;
      if (!sourceScript) {
        const doc = await api.getDocument(item.id);
        sourceScript = getCurrentVersionEntry(doc)?.fields || doc || null;
      }
      if (!sourceScript || typeof sourceScript !== "object") {
        throw new Error("Script payload could not be loaded.");
      }
      const payload = buildRequestPayloadFromLibraryItem(item, sourceScript);
      const now = new Date().toISOString();
      if (linkedRequest?.id) {
        const updatedPayload = {
          ...(linkedRequest.raw || {}),
          ...payload,
          status: "Pending",
          note: `Sent back from library script ${item.id}`,
          approved_script_id: "",
          published_script_id: "",
          published_from_version: "",
          created_at: linkedRequest.raw?.created_at || payload.created_at || now,
          updated_at: now,
        };
        if (typeof updateRequest === "function") {
          await updateRequest(linkedRequest.id, updatedPayload);
        } else {
          await api.updateScriptRequest(linkedRequest.id, updatedPayload);
        }
      } else {
        if (typeof createRequest === "function") {
          await createRequest(payload);
        } else {
          await api.createScriptRequest(payload);
        }
      }
      if (typeof deleteItem === "function") {
        await deleteItem(item.id);
      } else {
        await api.deleteDocument(item.id);
      }
      if (typeof refreshRequests === "function") {
        await refreshRequests();
      }
      if (typeof refreshDocuments === "function") {
        await refreshDocuments();
      }
      toast.show("Sent back to requests", { type: "success" });
    } catch (err) {
      toast.show(err?.message || "Failed to send back to requests", { type: "error" });
    }
  };

  // handles run search
  const runSearch = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setErr("");
    try {
      const { api } = await import("../api/client");
      const { title, ...serverParams } = q;
      const serverRes = await api.searchDocuments(serverParams);
      const arr = Array.isArray(serverRes) ? serverRes : [];
      // handles needle
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

  // handles clear search
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

  const publishedByScriptId = useMemo(() => {
    const map = {};
    (requests || []).forEach((entry) => {
      const raw = entry?.raw || entry || {};
      const scriptId = String(
        raw.published_script_id || raw.approved_script_id || entry?.approvedScriptId || ""
      ).trim();
      if (!scriptId) return;
      const publishedFromVersion = String(raw.published_from_version || "").trim();
      if (!publishedFromVersion) return;
      const updatedAt = String(raw.updated_at || entry?.updatedAt || entry?.createdAt || "").trim();
      const prev = map[scriptId];
      if (!prev) {
        map[scriptId] = {
          version: publishedFromVersion,
          requestId: String(entry?.id || "").trim(),
          updatedAt,
        };
        return;
      }
      const prevTime = Date.parse(prev.updatedAt || "");
      const nextTime = Date.parse(updatedAt || "");
      if (Number.isFinite(nextTime) && (!Number.isFinite(prevTime) || nextTime >= prevTime)) {
        map[scriptId] = {
          version: publishedFromVersion,
          requestId: String(entry?.id || "").trim(),
          updatedAt,
        };
      }
    });
    return map;
  }, [requests]);

  // handles resolve linked published request
  const resolveLinkedPublishedRequest = (item) => {
    const directId = String(item?.publishedFromRequestId || "").trim();
    if (directId) {
      const directMatch = (requests || []).find((entry) => String(entry?.id || "").trim() === directId);
      if (directMatch) return directMatch;
    }

    const scriptId = String(item?.id || item?._id || "").trim();
    if (!scriptId) return null;

    let bestMatch = null;
    let bestTime = Number.NEGATIVE_INFINITY;
    (requests || []).forEach((entry) => {
      const raw = entry?.raw || entry || {};
      const linkedScriptId = String(
        raw.published_script_id || raw.approved_script_id || entry?.approvedScriptId || ""
      ).trim();
      if (linkedScriptId !== scriptId) return;

      const updatedAt = String(raw.updated_at || entry?.updatedAt || entry?.createdAt || "").trim();
      const parsedTime = Date.parse(updatedAt);
      const score = Number.isFinite(parsedTime) ? parsedTime : Number.NEGATIVE_INFINITY;
      if (!bestMatch || score >= bestTime) {
        bestMatch = entry;
        bestTime = score;
      }
    });

    return bestMatch;
  };

  const visible = (results || items).filter((it) => !it.draftOf);
  const visibleWithPublishMeta = useMemo(
    () =>
      visible.map((it) => {
        const scriptId = String(it?.id || it?._id || "").trim();
        const publishedMeta = scriptId ? publishedByScriptId[scriptId] : null;
        if (!publishedMeta) return it;
        return {
          ...it,
          publishedFromVersion: publishedMeta.version,
          publishedFromRequestId: publishedMeta.requestId,
        };
      }),
    [publishedByScriptId, visible]
  );

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

      {visibleWithPublishMeta.length === 0 ? (
        <div className="text-gray-600 border border-dashed border-gray-400 rounded-2xl p-8 text-center bg-white">
          No scripts found. Try adjusting filters or create a new script request.
        </div>
      ) : (
        <div className="space-y-2">
          {visibleWithPublishMeta.slice(0, 10).map((it) => (
            <FormsListRow
              key={it.id}
              item={it}
              onArtifacts={onArtifacts}
              onPropose={onPropose}
              onDelete={isAdmin ? onDelete : null}
              onSendBackToRequests={isAdmin ? onSendBackToRequests : null}
              onClone={isAdmin ? onClone : null}
            />
          ))}
        </div>
      )}

      {isAdmin ? (
        <div className="flex justify-center">
          <Link
            to="/request-new"
            className="inline-flex items-center justify-center rounded-md border border-[#981e32] px-4 py-2 text-sm font-semibold text-[#981e32] hover:bg-[#981e32] hover:text-white"
          >
            Add Script
          </Link>
        </div>
      ) : null}

      <Modal open={artifactsOpen} title={`Resources for ${current?.id}`} onClose={() => setArtifactsOpen(false)}>
        {!current ? null : (
          <div className="space-y-2">
            {resourceItems.length ? (
              resourceItems.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between border rounded px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-[#981e32]">
                      {(a?.__generatedMedicationCard || a?.__generatedLabDataCard) ? "PDF" : getArtifactBadge(a)}
                    </span>
                    <span>
                      {a?.__generatedMedicationCard
                        ? "Medication Card"
                        : (a?.__generatedLabDataCard ? "Lab Data Card" : getArtifactName(a))}
                    </span>
                  </div>
                  <button className="rounded border px-2 py-1 hover:bg-gray-50" title="Download resource" onClick={() => openArtifact(a)}>
                    Download
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-600">No resources available.</div>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
};

export default FormsSearch;
