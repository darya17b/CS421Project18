import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { useToast } from "../components/Toast";

const STORAGE_KEY = "mock-request-statuses";
const ACTION_STATUS_OPTIONS = ["In Review", "Approved", "Rejected"];

const normalizeStatus = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "in review" || raw === "in_review" || raw === "review") return "In Review";
  if (raw === "approved") return "Approved";
  if (raw === "rejected") return "Rejected";
  if (raw === "pending") return "Pending";
  return value;
};

const loadStatus = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveStatus = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
   
  }
};

const buildScriptFromRequest = (request) => {
  const raw = request?.raw || request || {};
  if (raw.draft_script && typeof raw.draft_script === "object") {
    return { ...raw.draft_script, artifacts: raw.draft_script.artifacts || raw.artifacts || [] };
  }

  const reasonForVisit =
    raw.reason_for_visit ||
    raw.reson_for_visit ||
    raw.draft_script?.admin?.reson_for_visit ||
    raw.draft_script?.patient?.visit_reason ||
    raw.chief_concern ||
    "";

  return {
    admin: {
      reson_for_visit: reasonForVisit,
      chief_concern: raw.chief_concern || "",
      diagnosis: raw.diagnosis || "",
      class: raw.class || "",
      medical_event: raw.event || "",
      event_dates: raw.event || "",
      learner_level: raw.learner_level || raw.pedagogy || "",
      author: "approved-from-request",
      summory_of_story: raw.summary_patient_story || "",
      student_expectations: raw.student_expec || "",
      patient_demographic: raw.patient_demog || "",
      case_factors: raw.case_factors || raw.pert_aspects_patient_case || "",
    },
    patient: {
      name: raw.patient_demog || raw.draft_script?.patient?.name || "",
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
    artifacts: raw.artifacts || [],
  };
};

const Requests = () => {
  const { requests, refreshRequests, updateRequest, addItem, deleteRequest } = useStore();
  const toast = useToast();
  const [statusMap, setStatusMap] = useState(() => loadStatus());
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
        const resolvedStatus =
          backendStatus === "Approved"
            ? "Approved"
            : (previousStatus && backendStatus === "Pending")
                ? previousStatus
                : (backendStatus || previousStatus || "Pending");

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
    return (requests || []).map((it) => {
      const meta = statusMap[it.id] || {};
      return {
        ...it,
        status: normalizeStatus(meta.status || it.status || "Pending"),
        note: meta.note ?? it.note ?? "",
        updatedAt: meta.updatedAt,
        approvedScriptId: it.approvedScriptId || it.raw?.approved_script_id || "",
      };
    }).filter((it) => String(it.status || "").toLowerCase() !== "approved");
  }, [requests, statusMap]);

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

  const promoteApprovedRequest = async (req, latestRaw) => {
    const existingScriptId = latestRaw?.approved_script_id || req.approvedScriptId || req.raw?.approved_script_id;
    if (existingScriptId || typeof addItem !== "function") return existingScriptId || "";

    const scriptPayload = buildScriptFromRequest({ ...req, raw: latestRaw || req.raw });
    const created = await addItem(scriptPayload);
    const createdId = created?.id || created?._id || "";

    return createdId;
  };

  const updateStatus = async (req, status) => {
    const normalizedStatus = normalizeStatus(status) || "Pending";
    const prevStatus = statusMap[req.id]?.status || req.status || "Pending";

    if (normalizedStatus !== "Approved") {
      setStatusMap((prev) => ({
        ...prev,
        [req.id]: { ...prev[req.id], status: normalizedStatus, updatedAt: new Date().toISOString() },
      }));
      toast.show(`Marked as ${normalizedStatus}`, { type: "info" });
      return;
    }

    setStatusMap((prev) => ({
      ...prev,
      [req.id]: { ...prev[req.id], status: "Approved", updatedAt: new Date().toISOString() },
    }));

    try {
      const latestRaw = req.raw || {};
      const createdId = await promoteApprovedRequest(req, latestRaw);
      if (typeof deleteRequest === "function") {
        await deleteRequest(req.id);
      }
      setStatusMap((prev) => {
        const next = { ...prev };
        delete next[req.id];
        return next;
      });
      toast.show(createdId ? "Marked as Approved and added to Script Library" : "Marked as Approved", { type: "success" });
      if (typeof refreshRequests === "function") await refreshRequests();
    } catch (err) {
      console.warn("Failed to update request status", err);
      setStatusMap((prev) => ({
        ...prev,
        [req.id]: { ...prev[req.id], status: normalizeStatus(prevStatus), updatedAt: new Date().toISOString() },
      }));
      toast.show("Failed to approve request", { type: "error" });
    }
  };

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

  const resetMock = () => {
    setStatusMap({});
    toast.show("Mock approvals reset", { type: "info" });
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
          <button
            type="button"
            onClick={resetMock}
            className="text-sm font-semibold text-gray-700 hover:text-[#981e32]"
          >
            Reset mock approvals
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y">
        {list.length === 0 ? (
          <div className="p-6 text-gray-600 text-center">No requests found.</div>
        ) : (
          list.map((req) => (
            <div key={req.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 truncate">{req.title || "Untitled"}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{req.department || "General"}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{req.patient || "Unknown"}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1 truncate">Status: <span className="font-semibold text-gray-800">{req.status}</span></div>
                {req.note ? <div className="text-xs text-gray-500 mt-1">Note: {req.note}</div> : null}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {ACTION_STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    onClick={() => { void updateStatus(req, status); }}
                    className={`rounded border px-3 py-1 text-sm font-semibold ${req.status === status ? "border-[#981e32] text-[#981e32]" : "border-gray-300 text-gray-700"} hover:border-[#981e32] hover:text-[#981e32]`}
                  >
                    {status}
                  </button>
                ))}
                <button
                  onClick={() => { void addNote(req); }}
                  className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                >
                  Add note
                </button>
                <Link
                  to={`/forms/${encodeURIComponent(req.approvedScriptId || req.id)}`}
                  state={{ request: req }}
                  className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                >
                  View script
                </Link>
              </div>
            </div>
          ))
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
