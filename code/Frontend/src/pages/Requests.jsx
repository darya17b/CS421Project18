import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStore } from "../store";
import { useToast } from "../components/Toast";
import { formatTitleWithDobAge } from "../utils/patientAge";
import { collapseDoorNoteArtifacts, dedupeArtifacts } from "../utils/artifacts";

const STORAGE_KEY = "mock-request-statuses";
const ACTION_STATUS_OPTIONS = ["In Review", "Rejected"];

// handles normalize status
const normalizeStatus = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "in review" || raw === "in_review" || raw === "review") return "In Review";
  if (raw === "approved" || raw === "published" || raw === "publish") return "Published";
  if (raw === "rejected") return "Rejected";
  if (raw === "pending") return "Pending";
  return value;
};

// handles load status
const loadStatus = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// handles save status
const saveStatus = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
   
  }
};

// handles clone value
const cloneValue = (value) => JSON.parse(JSON.stringify(value));

// handles unique artifacts
const uniqueArtifacts = (artifacts = []) => {
  return collapseDoorNoteArtifacts(dedupeArtifacts(artifacts));
};

// handles pick first text
const pickFirstText = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
};

// handles resolve request dob
const resolveRequestDob = (raw, fields = null) =>
  pickFirstText(
    fields?.patient?.date_of_birth,
    fields?.patient?.dob,
    raw?.draft_script?.patient?.date_of_birth,
    raw?.draft_script?.patient?.dob,
    raw?.patient?.date_of_birth,
    raw?.patient?.dob,
    raw?.patient_date_of_birth,
    raw?.date_of_birth,
    raw?.dob
  );

// handles resolve version fields
const resolveVersionFields = (request, versionKey = "request-draft") => {
  const raw = request?.raw || request || {};
  if (String(versionKey || "") === "request-draft") {
    if (raw.draft_script && typeof raw.draft_script === "object") return raw.draft_script;
    if (raw.patient && raw.admin && typeof raw === "object") return raw;
    return null;
  }
  const savedVersionId = String(versionKey || "").startsWith("saved:")
    ? String(versionKey).slice("saved:".length)
    : "";
  if (!savedVersionId) return null;
  const normalizedSavedVersionId = savedVersionId.toLowerCase();
  const draftVersions = Array.isArray(raw.draft_versions)
    ? raw.draft_versions
    : (
      raw.draft_versions && typeof raw.draft_versions === "object"
        ? Object.values(raw.draft_versions)
        : []
    );
  const selected = draftVersions.find(
    (entry) => String(entry?.version || "").trim().toLowerCase() === normalizedSavedVersionId
  );
  const fields =
    selected?.fields
    || selected?.document
    || selected?.draft_script
    || selected?.payload
    || selected?.data
    || (
      selected?.patient && selected?.admin
        ? selected
        : null
    );
  return fields && typeof fields === "object" ? fields : null;
};

// handles resolve version reason for visit
const resolveVersionReasonForVisit = (request, versionKey = "request-draft") => {
  const raw = request?.raw || request || {};
  const selectedFields = resolveVersionFields(request, versionKey);
  return pickFirstText(
    selectedFields?.admin?.reson_for_visit,
    selectedFields?.admin?.reason_for_visit,
    selectedFields?.patient?.visit_reason,
    raw?.draft_script?.admin?.reson_for_visit,
    raw?.draft_script?.admin?.reason_for_visit,
    raw?.draft_script?.patient?.visit_reason,
    raw?.reason_for_visit,
    raw?.reson_for_visit,
    raw?.chief_concern
  );
};

// handles resolve display title for version
const resolveDisplayTitleForVersion = (request, versionKey = "request-draft") => {
  const raw = request?.raw || request || {};
  const selectedFields = resolveVersionFields(request, versionKey);
  const reasonForVisit = resolveVersionReasonForVisit(request, versionKey);
  const dob = resolveRequestDob(raw, selectedFields);
  return formatTitleWithDobAge(reasonForVisit || request?.title || "Untitled", dob) || "Untitled";
};

// handles build script from request
const buildScriptFromRequest = (request, versionKey = "request-draft") => {
  const raw = request?.raw || request || {};
  const selectedFields = resolveVersionFields(request, versionKey);
  const fallbackDob = resolveRequestDob(raw, selectedFields);
  if (selectedFields) {
    const draft = cloneValue(selectedFields);
    const patient = draft?.patient && typeof draft.patient === "object" ? draft.patient : {};
    if (!pickFirstText(patient?.date_of_birth, patient?.dob) && fallbackDob) {
      draft.patient = {
        ...patient,
        date_of_birth: fallbackDob,
      };
    }
    draft.artifacts = uniqueArtifacts([
      ...(Array.isArray(draft.artifacts) ? draft.artifacts : []),
      ...(Array.isArray(raw.artifacts) ? raw.artifacts : []),
    ]);
    return draft;
  }

  const reasonForVisit =
    raw.reason_for_visit ||
    raw.reson_for_visit ||
    raw.chief_concern ||
    "";

  return {
    admin: {
      reson_for_visit: reasonForVisit,
      chief_concern: raw.chief_concern || "",
      diagnosis: raw.diagnosis || "",
      case_letter: raw.class || "",
      class: raw.class || "",
      medical_event: raw.event || "",
      learner_level: raw.learner_level || raw.pedagogy || "",
      summory_of_story: raw.summary_patient_story || "",
      student_expectations: raw.student_expec || "",
      patient_demographic: raw.patient_demog || "",
      case_factors: raw.case_factors || raw.pert_aspects_patient_case || "",
      special_supplies: raw.special_needs || "",
    },
    patient: {
      name: raw.patient_name || raw.patient_demog || "",
      date_of_birth: fallbackDob || "",
      visit_reason: reasonForVisit,
      context: raw.case_setting || "",
    },
    sp: {
      physical_chars: raw.physical_chars || "",
      current_ill_history: {
        symptom_quality: raw.spec_phyis_findings || "",
      },
    },
    med_hist: {
      sympton_review: raw.sympt_review || {},
    },
    special: {
      oppurtunity: raw.special_needs || "",
      feed_back: raw.additonal_ins || "",
    },
    artifacts: uniqueArtifacts(Array.isArray(raw.artifacts) ? raw.artifacts : []),
  };
};

// handles requests
const Requests = () => {
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;
  const { requests, refreshRequests, updateRequest, deleteRequest, addItem } = useStore();
  const toast = useToast();
  const [statusMap, setStatusMap] = useState(() => loadStatus());
  const [publishingId, setPublishingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [publishVersionMap, setPublishVersionMap] = useState({});
  // handles is admin
  const isAdmin = (() => {
    if (typeof window === "undefined") return true;
    const role = localStorage.getItem("role");
    return role === "admin" || !role;
  })();

  useEffect(() => {
    if (typeof refreshRequests === "function") {
      refreshRequests().catch((err) => console.warn("Failed to refresh requests", err));
    }
  }, [refreshRequests]);

  useEffect(() => {
    saveStatus(statusMap);
  }, [statusMap]);

  useEffect(() => {
    const source = requests || [];
    if (!source?.length) return;

    setStatusMap((prev) => {
      const next = { ...prev };
      source.forEach((it) => {
        const backendStatus = normalizeStatus(it.raw?.status || it.status || "");
        const backendNote = it.raw?.note || it.note || "";
        const backendUpdatedAt = it.raw?.updated_at || it.updatedAt;
        const previousStatus = normalizeStatus(next[it.id]?.status || "");
        const resolvedStatus = backendStatus || previousStatus || "Pending";

        next[it.id] = {
          status: resolvedStatus,
          note: backendNote,
          updatedAt: backendUpdatedAt || next[it.id]?.updatedAt || new Date().toISOString(),
        };
      });
      return next;
    });
  }, [requests]);

  const list = useMemo(() => {
    const mapped = (requests || []).map((it) => {
      const meta = statusMap[it.id] || {};
      const raw = it.raw || {};
      const draftVersions = Array.isArray(raw.draft_versions) ? raw.draft_versions : [];
      const linkedScriptId =
        it.approvedScriptId ||
        raw.approved_script_id ||
        raw.published_script_id ||
        "";
      const publishVersionOptions = [
        { key: "request-draft", label: "Request Draft" },
        ...draftVersions
          .map((entry) => String(entry?.version || "").trim())
          .filter(Boolean)
          .map((versionId) => ({ key: `saved:${versionId}`, label: `Saved ${versionId}` })),
      ];
      return {
        ...it,
        displayTitle: resolveDisplayTitleForVersion(it, "request-draft"),
        status: normalizeStatus(meta.status || it.status || "Pending"),
        note: meta.note ?? it.note ?? "",
        updatedAt: meta.updatedAt,
        approvedScriptId: linkedScriptId,
        publishedFromVersion: String(raw.published_from_version || "").trim(),
        publishVersionOptions,
      };
    });
    return mapped.filter((it) => it.status !== "Published");
  }, [requests, statusMap]);

  useEffect(() => {
    setPublishVersionMap((prev) => {
      const next = { ...prev };
      const activeIds = new Set(list.map((req) => req.id));
      list.forEach((req) => {
        const current = String(next[req.id] || "").trim();
        const allowed = req.publishVersionOptions?.map((entry) => entry.key) || ["request-draft"];
        next[req.id] = allowed.includes(current) ? current : "request-draft";
      });
      Object.keys(next).forEach((id) => {
        if (!activeIds.has(id)) delete next[id];
      });
      return next;
    });
  }, [list]);

  // handles persist request meta
  const persistRequestMeta = async (req, overrides = {}) => {
    if (typeof updateRequest !== "function") return req?.raw || null;

    const currentMeta = statusMap[req.id] || {};
    const payload = {
      ...(req.raw || {}),
      status: overrides.status ?? req.raw?.status ?? req.status ?? "Pending",
      note: overrides.note ?? currentMeta.note ?? req.note ?? "",
      updated_at: new Date().toISOString(),
      ...overrides,
    };

    const updated = await updateRequest(req.id, payload);
    return updated?.raw || updated || payload;
  };

  // handles update status
  const updateStatus = async (req, status) => {
    const normalizedStatus = normalizeStatus(status) || "Pending";
    const prevStatus = statusMap[req.id]?.status || req.status || "Pending";
    setStatusMap((prev) => ({
      ...prev,
      [req.id]: { ...prev[req.id], status: normalizedStatus, updatedAt: new Date().toISOString() },
    }));

    try {
      await persistRequestMeta(req, { status: normalizedStatus });
      toast.show(`Marked as ${normalizedStatus}`, { type: "success" });
      if (typeof refreshRequests === "function") await refreshRequests();
    } catch (err) {
      console.warn("Failed to update request status", err);
      setStatusMap((prev) => ({
        ...prev,
        [req.id]: { ...prev[req.id], status: normalizeStatus(prevStatus), updatedAt: new Date().toISOString() },
      }));
      toast.show("Failed to update request status", { type: "error" });
    }
  };

  // handles publish to library
  const publishToLibrary = async (req, versionKey = "request-draft") => {
    if (publishingId) return;
    const prevStatus = statusMap[req.id]?.status || req.status || "Pending";
    const raw = req.raw || {};
    const selectedVersionKey = String(versionKey || "request-draft");
    const selectedVersionLabel =
      req.publishVersionOptions?.find((entry) => entry.key === selectedVersionKey)?.label || "Request Draft";
    const selectedVersionTitle = resolveDisplayTitleForVersion(req, selectedVersionKey);
    const publishedFromVersion =
      selectedVersionKey === "request-draft"
        ? "request-draft"
        : String(selectedVersionKey).replace(/^saved:/, "");
    let publishedScriptId = "";
    const confirmMessage =
      `Publish "${selectedVersionLabel}" for "${selectedVersionTitle || req.displayTitle || req.title || req.id}"?`;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;
    }

    setPublishingId(req.id);
    try {
      const scriptPayload = buildScriptFromRequest(req, selectedVersionKey);
      const resolvedDob = resolveRequestDob(raw, scriptPayload);
      if (resolvedDob) {
        const patient =
          scriptPayload?.patient && typeof scriptPayload.patient === "object"
            ? scriptPayload.patient
            : {};
        if (!pickFirstText(patient?.date_of_birth, patient?.dob)) {
          scriptPayload.patient = {
            ...patient,
            date_of_birth: resolvedDob,
          };
        }
      }
      if (typeof addItem !== "function") {
        throw new Error("Script publishing is not configured.");
      }
      const created = await addItem(scriptPayload);
      publishedScriptId = created?.id || created?._id || "";
      if (!publishedScriptId) {
        throw new Error("Script publish did not return a script id.");
      }

      setStatusMap((prev) => ({
        ...prev,
        [req.id]: {
          ...prev[req.id],
          status: "Published",
          updatedAt: new Date().toISOString(),
        },
      }));

      await persistRequestMeta(req, {
        status: "Published",
        approved_script_id: publishedScriptId,
        published_script_id: publishedScriptId,
        published_from_version: publishedFromVersion,
        artifacts: scriptPayload.artifacts || raw.artifacts || [],
      });
      if (typeof refreshRequests === "function") {
        await refreshRequests();
      }
      toast.show(`Published ${selectedVersionLabel}`, { type: "success" });
    } catch (err) {
      console.warn("Failed to publish request", err);
      setStatusMap((prev) => ({
        ...prev,
        [req.id]: {
          ...prev[req.id],
          status: normalizeStatus(prevStatus) || "Pending",
          updatedAt: new Date().toISOString(),
        },
      }));
      toast.show("Failed to publish request", { type: "error" });
    } finally {
      setPublishingId("");
    }
  };

  // handles add note
  const addNote = async (req) => {
    const existing = statusMap[req.id]?.note || req.note || "";
    const note = prompt("Add a note for this request", existing);
    if (note === null) return;

    setStatusMap((prev) => ({
      ...prev,
      [req.id]: { ...prev[req.id], note, updatedAt: new Date().toISOString() },
    }));

    try {
      await persistRequestMeta(req, { note });
      if (typeof refreshRequests === "function") {
        await refreshRequests();
      }
      toast.show("Note saved", { type: "success" });
    } catch (err) {
      console.warn("Failed to save request note", err);
      toast.show("Failed to save note", { type: "error" });
    }
  };

  // handles delete from requests
  const deleteFromRequests = async (req) => {
    if (deletingId) return;
    const label = req.title || req.id || "this request";
    if (!confirm(`Delete ${label} from requests?`)) return;
    setDeletingId(req.id);
    try {
      if (typeof deleteRequest === "function") {
        await deleteRequest(req.id);
      } else {
        const { api } = await import("../api/client");
        await api.deleteScriptRequest(req.id);
      }
      setStatusMap((prev) => {
        const next = { ...prev };
        delete next[req.id];
        return next;
      });
      if (typeof refreshRequests === "function") {
        await refreshRequests();
      }
      toast.show("Request deleted", { type: "success" });
    } catch (err) {
      console.warn("Failed to delete request", err);
      toast.show("Failed to delete request", { type: "error" });
    } finally {
      setDeletingId("");
    }
  };

  if (!isAdmin) {
    return (
      <section className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#b4152b]">Script Requests</h1>
          <Link to="/dashboard" className="text-sm text-[#981e32] font-semibold hover:underline">Back to Dashboard</Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-gray-700">
          Admin access required to manage script requests. Please sign in as admin to continue.
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#b4152b]">Script Requests</h1>
          <p className="text-sm text-gray-600"></p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm text-[#981e32] font-semibold hover:underline">Back to Dashboard</Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y">
        {list.length === 0 ? (
          <div className="p-6 text-gray-600 text-center">No requests found.</div>
        ) : (
          list.map((req) => {
            const selectedVersionKey = publishVersionMap[req.id] || "request-draft";
            const rowDisplayTitle = resolveDisplayTitleForVersion(req, selectedVersionKey);
            return (
            <div key={req.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 truncate">{rowDisplayTitle || req.displayTitle || req.title || "Untitled"}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{req.department || "General"}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{req.patient || "Unknown"}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1 truncate">Status: <span className="font-semibold text-gray-800">{req.status}</span></div>
                {req.note ? <div className="text-xs text-gray-500 mt-1">Note: {req.note}</div> : null}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {req.status !== "Published"
                  ? ACTION_STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      onClick={() => { void updateStatus(req, status); }}
                      className={`rounded border px-3 py-1 text-sm font-semibold ${req.status === status ? "border-[#981e32] text-[#981e32]" : "border-gray-300 text-gray-700"} hover:border-[#981e32] hover:text-[#981e32]`}
                    >
                      {status}
                    </button>
                  ))
                  : null}
                <button
                  onClick={() => { void addNote(req); }}
                  className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                >
                  Add note
                </button>
                <select
                  value={publishVersionMap[req.id] || "request-draft"}
                  onChange={(event) =>
                    setPublishVersionMap((prev) => ({ ...prev, [req.id]: event.target.value }))
                  }
                  disabled={publishingId === req.id}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Select version to publish"
                >
                  {(req.publishVersionOptions || [{ key: "request-draft", label: "Request Draft" }]).map((entry) => (
                    <option key={entry.key} value={entry.key}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    void publishToLibrary(
                      req,
                      publishVersionMap[req.id] || "request-draft"
                    );
                  }}
                  disabled={publishingId === req.id}
                  className="rounded border border-emerald-600 px-3 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {publishingId === req.id ? "Publishing..." : "Publish to Library"}
                </button>
                <Link
                  to={`/clone-new?clone_source=request&source_id=${encodeURIComponent(req.id)}&version=${encodeURIComponent(selectedVersionKey)}`}
                  state={{ request: req, versionKey: selectedVersionKey, from }}
                  className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                >
                  Clone
                </Link>
                <Link
                  to={`/request-new?requestId=${encodeURIComponent(req.id)}`}
                  state={{ request: req, from }}
                  className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                >
                  Edit in Form
                </Link>
                <button
                  onClick={() => { void deleteFromRequests(req); }}
                  disabled={deletingId === req.id}
                  className="rounded border border-red-600 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deletingId === req.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>
      <div className="flex justify-end">
        <Link
          to="/request-new"
          className="inline-flex items-center justify-center rounded-md border border-[#981e32] px-4 py-2 text-sm font-semibold text-[#981e32] hover:bg-[#981e32] hover:text-white"
        >
          Add Script
        </Link>
      </div>
    </section>
  );
};

export default Requests;
