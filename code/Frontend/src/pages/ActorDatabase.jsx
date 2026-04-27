import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const COLLAPSED_COUNT = 6;
const PAGE_SIZE = 18;

const INITIAL_FORM = {
  name: "",
  email: "",
  notes: "",
  phone_number: "",
  age_range: "",
  pronouns: "",
  employee_id: "",
  workday_name: "",
  time_code: "",
  lead_time_code: "",
  specialized_time_code: "",
};

const REQUIRED_FIELDS = ["name", "email", "phone_number", "employee_id", "workday_name", "time_code"];
const OPTIONAL_FIELDS = ["notes", "age_range", "pronouns", "lead_time_code", "specialized_time_code"];

// handles normalize actor
const normalizeActor = (raw) => ({
  id: Number(raw?.id || 0),
  name: raw?.name || "",
  email: raw?.email || "",
  notes: raw?.notes || "",
  phoneNumber: raw?.phone_number || "",
  ageRange: raw?.age_range || "",
  pronouns: raw?.pronouns || "",
  employeeId: raw?.employee_id || "",
  workdayName: raw?.workday_name || "",
  timeCode: raw?.time_code || "",
  leadTimeCode: raw?.lead_time_code || "",
  specializedTimeCode: raw?.specialized_time_code || "",
});

// handles parse api error
const parseApiError = (text, status) => {
  if (!text) return `HTTP ${status}`;
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error) return parsed.error;
  } catch {
    // Ignore JSON parsing errors and fall back to raw text.
  }
  return text;
};

// handles initials for
const initialsFor = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "--";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

// handles preview words
const previewWords = (text, count = 25) => {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= count) return text;
  return `${words.slice(0, count).join(" ")}...`;
};

// handles actor database
const ActorDatabase = () => {
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [page, setPage] = useState(1);
  const [adminFormOpen, setAdminFormOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [adminFeedback, setAdminFeedback] = useState("");
  const [deleteFeedback, setDeleteFeedback] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const isAdmin = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (localStorage.getItem("role") || "").toLowerCase() === "admin";
  }, []);

  const authHeaders = useCallback(() => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadActors = useCallback(
    async ({ keepSelection = true } = {}) => {
      const selectedBefore = selectedId;
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/actors", {
          method: "GET",
          credentials: "include",
          headers: { ...authHeaders() },
        });
        const text = await res.text();
        if (!res.ok) throw new Error(parseApiError(text, res.status));
        const payload = text ? JSON.parse(text) : [];
        const normalized = Array.isArray(payload) ? payload.map(normalizeActor) : [];
        setActors(normalized);
        if (keepSelection && normalized.some((a) => a.id === selectedBefore)) {
          setSelectedId(selectedBefore);
        } else {
          setSelectedId(null);
        }
      } catch (err) {
        setActors([]);
        setError(err?.message || "Unable to load actors");
      } finally {
        setLoading(false);
      }
    },
    [authHeaders, selectedId]
  );

  useEffect(() => {
    loadActors();
  }, [loadActors]);

  const filteredActors = useMemo(() => {
    const q = query.toLowerCase().trim();
    const sorted = [...actors].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter((a) =>
      [a.name, a.pronouns, a.ageRange, a.workdayName].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [actors, query]);

  const canCollapse = filteredActors.length > COLLAPSED_COUNT;
  const totalPages = Math.max(1, Math.ceil(filteredActors.length / PAGE_SIZE));
  const safePage = collapsed ? 1 : Math.min(Math.max(page, 1), totalPages);

  const visibleActors = useMemo(() => {
    if (collapsed) return filteredActors.slice(0, COLLAPSED_COUNT);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredActors.slice(start, start + PAGE_SIZE);
  }, [collapsed, filteredActors, safePage]);

  useEffect(() => {
    if (collapsed && page !== 1) setPage(1);
    if (!collapsed && page > totalPages) setPage(totalPages);
  }, [collapsed, page, totalPages]);

  useEffect(() => {
    if (filteredActors.some((a) => a.id === selectedId)) return;
    setSelectedId(visibleActors[0]?.id ?? null);
  }, [filteredActors, selectedId, visibleActors]);

  const selectedActor = useMemo(
    () => filteredActors.find((a) => a.id === selectedId) || visibleActors[0] || null,
    [filteredActors, selectedId, visibleActors]
  );

  // handles handle create actor
  const handleCreateActor = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    const payload = {};
    for (const key of REQUIRED_FIELDS) {
      const value = String(form[key] || "").trim();
      if (!value) {
        setAdminFeedback("Please complete all required fields.");
        return;
      }
      payload[key] = value;
    }
    for (const key of OPTIONAL_FIELDS) {
      const value = String(form[key] || "").trim();
      payload[key] = value === "" ? null : value;
    }

    setAdminFeedback("Saving actor...");
    try {
      const res = await fetch("/api/actors", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(parseApiError(text, res.status));

      let createdId = null;
      try {
        const parsed = text ? JSON.parse(text) : {};
        createdId = Number(parsed?.id || 0) || null;
      } catch {
        createdId = null;
      }

      setForm(INITIAL_FORM);
      setAdminFeedback("Actor created.");
      setQuery("");
      setCollapsed(true);
      setPage(1);
      await loadActors({ keepSelection: false });
      if (createdId) setSelectedId(createdId);
    } catch (err) {
      setAdminFeedback(err?.message || "Create failed");
    }
  };

  // handles handle delete actor
  const handleDeleteActor = async () => {
    if (!isAdmin || !selectedActor) return;
    const name = selectedActor?.name || `ID ${selectedActor.id}`;
    if (!window.confirm(`Delete actor ${name}?`)) return;

    setDeleteBusy(true);
    setDeleteFeedback("Deleting...");
    try {
      const res = await fetch(`/api/actors/${selectedActor.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { ...authHeaders() },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(parseApiError(text, res.status));
      setDeleteFeedback("Actor deleted.");
      await loadActors({ keepSelection: false });
    } catch (err) {
      setDeleteFeedback(err?.message || "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  };

  const start = (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, filteredActors.length);

  return (
    <section className="w-full">
      <header className="mb-4">
        <Link to="/dashboard" className="inline-flex text-sm font-semibold text-[#981e32] hover:underline">
          Back to Dashboard
        </Link>
        <h1 className="mt-1 text-3xl font-semibold text-[#b4152b]">Actor Database</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-[#d6d2cc] bg-white p-4 shadow-sm">
          <div className="mb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, pronouns, age range..."
              className="w-full rounded-full border border-[#d6d2cc] px-4 py-2 text-sm outline-none focus:border-[#a60f2d] focus:ring-2 focus:ring-[#a60f2d]/20"
            />
          </div>

          {loading && actors.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Loading actors...</p>
          ) : filteredActors.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              {error ? `Failed to load actors: ${error}` : "No actors match your search."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleActors.map((actor) => (
                <button
                  key={actor.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(actor.id);
                    setDeleteFeedback("");
                  }}
                  className={`rounded-2xl border p-3 text-left transition ${
                    actor.id === selectedId
                      ? "border-[#a60f2d] ring-2 ring-[#a60f2d]/20"
                      : "border-[#d6d2cc] hover:-translate-y-0.5 hover:border-[#d8a9b4] hover:shadow-sm"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#ca1237] to-[#8f0f28] text-xs font-black text-white">
                      {initialsFor(actor.name)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{actor.name}</p>
                      <p className="text-xs text-gray-500">
                        {actor.ageRange || "N/A"} | {actor.pronouns || "N/A"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700">{previewWords(actor.notes, 25) || "-"}</p>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-600">
              {filteredActors.length === 0
                ? "0 results"
                : collapsed
                ? canCollapse
                  ? `Showing ${Math.min(COLLAPSED_COUNT, filteredActors.length)} of ${filteredActors.length}`
                  : `${filteredActors.length} result${filteredActors.length === 1 ? "" : "s"}`
                : `Showing ${start}-${end} of ${filteredActors.length}`}
            </p>

            <div className="flex items-center gap-2">
              {canCollapse ? (
                <button
                  type="button"
                  onClick={() => {
                    setCollapsed((prev) => !prev);
                    setPage(1);
                  }}
                  className="rounded-full border border-[#cfa2ae] px-3 py-1 text-xs font-semibold text-[#a60f2d] hover:bg-[#fcf3f5]"
                >
                  {collapsed ? "Expand Grid" : "Collapse Grid"}
                </button>
              ) : null}

              {!collapsed && filteredActors.length > 0 ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={safePage <= 1}
                    className="rounded-full border border-[#cfa2ae] px-3 py-1 text-xs font-semibold text-[#a60f2d] disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="min-w-20 text-center text-xs text-gray-600">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={safePage >= totalPages}
                    className="rounded-full border border-[#cfa2ae] px-3 py-1 text-xs font-semibold text-[#a60f2d] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              ) : null}

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setAdminFormOpen((prev) => !prev)}
                  className="rounded-full border border-[#cfa2ae] px-3 py-1 text-xs font-semibold text-[#a60f2d] hover:bg-[#fcf3f5]"
                >
                  {adminFormOpen ? "Hide Add Actor" : "+ Add Actor"}
                </button>
              ) : null}
            </div>
          </div>

          {isAdmin && adminFormOpen ? (
            <section className="mt-3 rounded-xl border border-[#d6c5c9] bg-[#fffaf9] p-3">
              <h3 className="mb-2 text-sm font-bold text-[#a60f2d]">Add Actor (Admin)</h3>
              <form onSubmit={handleCreateActor} className="space-y-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="text-xs font-semibold text-[#6a4f56]">
                    Name *
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-[#d8d0cc] px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#6a4f56]">
                    Email *
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-[#d8d0cc] px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#6a4f56] md:col-span-2">
                    Notes (max 100 chars)
                    <textarea
                      maxLength={100}
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="mt-1 min-h-16 w-full rounded-md border border-[#d8d0cc] px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#6a4f56]">
                    Phone Number *
                    <input
                      required
                      value={form.phone_number}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-[#d8d0cc] px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#6a4f56]">
                    Age Range
                    <input
                      value={form.age_range}
                      onChange={(e) => setForm((prev) => ({ ...prev, age_range: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-[#d8d0cc] px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#6a4f56]">
                    Pronouns
                    <input
                      value={form.pronouns}
                      onChange={(e) => setForm((prev) => ({ ...prev, pronouns: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-[#d8d0cc] px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#6a4f56]">
                    Employee ID (9 digits) *
                    <input
                      required
                      pattern="[0-9]{9}"
                      value={form.employee_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-[#d8d0cc] px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#6a4f56]">
                    Workday Name *
                    <input
                      required
                      value={form.workday_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, workday_name: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-[#d8d0cc] px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#6a4f56]">
                    Time Code (digits/dash) *
                    <input
                      required
                      pattern="[0-9-]+"
                      value={form.time_code}
                      onChange={(e) => setForm((prev) => ({ ...prev, time_code: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-[#d8d0cc] px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#6a4f56]">
                    Lead Time Code
                    <input
                      pattern="[0-9]*"
                      value={form.lead_time_code}
                      onChange={(e) => setForm((prev) => ({ ...prev, lead_time_code: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-[#d8d0cc] px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#6a4f56]">
                    Specialized Time Code
                    <input
                      pattern="[0-9]*"
                      value={form.specialized_time_code}
                      onChange={(e) => setForm((prev) => ({ ...prev, specialized_time_code: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-[#d8d0cc] px-2 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="submit"
                    className="rounded-full border border-[#be8d99] px-4 py-2 text-xs font-bold text-[#a60f2d] hover:bg-[#fcf3f5]"
                  >
                    Add Actor
                  </button>
                  <p className="text-xs text-[#7f0f24]">{adminFeedback}</p>
                </div>
              </form>
            </section>
          ) : null}
        </article>

        <aside className="h-fit rounded-2xl border border-[#d6d2cc] bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <h2 className="mb-2 text-2xl font-semibold text-gray-900">{selectedActor?.name || "Select an actor"}</h2>
          <p className="mb-3 rounded-lg bg-[#f7e7eb] px-3 py-2 text-sm text-[#7f0f24]">
            {selectedActor?.notes || "Click a card to view contact info, IDs, and time codes."}
          </p>

          {[
            ["Email", selectedActor?.email],
            ["Phone Number", selectedActor?.phoneNumber],
            ["Age Range", selectedActor?.ageRange],
            ["Pronouns", selectedActor?.pronouns],
            ["Employee ID", selectedActor?.employeeId],
            ["Workday Name", selectedActor?.workdayName],
            ["Time Code", selectedActor?.timeCode],
            ["Lead Time Code", selectedActor?.leadTimeCode],
            ["Specialized Time Code", selectedActor?.specializedTimeCode],
          ].map(([label, value]) => (
            <p key={label} className="flex items-start justify-between gap-3 border-b border-gray-100 py-2 text-sm">
              <span className="text-gray-500">{label}</span>
              <b className="text-right font-semibold text-gray-900">{value || "-"}</b>
            </p>
          ))}

          {isAdmin ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDeleteActor}
                disabled={!selectedActor || deleteBusy}
                className="rounded-full border border-[#c58f9b] px-3 py-1 text-xs font-bold text-[#9a1731] hover:bg-[#fff2f4] disabled:opacity-50"
              >
                Delete Actor
              </button>
              <p className="text-xs text-[#7f0f24]">{deleteFeedback}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
};

export default ActorDatabase;
