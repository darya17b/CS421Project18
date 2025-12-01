import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { useToast } from "../components/Toast";

const STORAGE_KEY = "mock-request-statuses";
const STATUS_OPTIONS = ["Pending", "In Review", "Approved", "Rejected"];

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
    // ignore persistence errors
  }
};

const Requests = () => {
  const { items } = useStore();
  const toast = useToast();
  const [statusMap, setStatusMap] = useState(() => loadStatus());
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("role") === "admin";

  useEffect(() => {
    saveStatus(statusMap);
  }, [statusMap]);

  useEffect(() => {
    if (!items?.length) return;
    setStatusMap((prev) => {
      const next = { ...prev };
      items.forEach((it) => {
        if (!next[it.id]) {
          next[it.id] = { status: "Pending", note: "", updatedAt: new Date().toISOString() };
        }
      });
      return next;
    });
  }, [items]);

  const list = useMemo(() => {
    return (items || []).map((it) => {
      const meta = statusMap[it.id] || { status: "Pending" };
      return {
        ...it,
        status: meta.status,
        note: meta.note || "",
        updatedAt: meta.updatedAt,
      };
    });
  }, [items, statusMap]);

  const updateStatus = (id, status) => {
    setStatusMap((prev) => ({
      ...prev,
      [id]: { ...prev[id], status, updatedAt: new Date().toISOString() },
    }));
    toast.show(`Marked as ${status}`, { type: status === "Approved" ? "success" : "info" });
  };

  const addNote = (id) => {
    const existing = statusMap[id]?.note || "";
    const note = prompt("Add a note for this request", existing);
    if (note === null) return;
    setStatusMap((prev) => ({
      ...prev,
      [id]: { ...prev[id], note, updatedAt: new Date().toISOString() },
    }));
    toast.show("Note saved", { type: "success" });
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
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(req.id, status)}
                    className={`rounded border px-3 py-1 text-sm font-semibold ${req.status === status ? "border-[#981e32] text-[#981e32]" : "border-gray-300 text-gray-700"} hover:border-[#981e32] hover:text-[#981e32]`}
                  >
                    {status}
                  </button>
                ))}
                <button
                  onClick={() => addNote(req.id)}
                  className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                >
                  Add note
                </button>
                <Link
                  to={`/forms/${encodeURIComponent(req.id)}`}
                  className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                >
                  View script
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default Requests;
