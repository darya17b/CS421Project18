import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useMockStore } from "../store/mockStore";
import { useToast } from "../components/Toast";

const RequestNew = () => {
  const navigate = useNavigate();
  const { addItem } = useMockStore();
  const toast = useToast();
  const [form, setForm] = useState({
    title: "",
    patient: "",
    department: "",
    summary: "",
  });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    const id = `SCR-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString().slice(0, 10);
    addItem({
      id,
      title: form.title || "Untitled",
      patient: form.patient || "Unknown",
      department: form.department || "General",
      createdAt: now,
      summary: form.summary || "",
      artifacts: [],
      versions: [{ version: "v1", notes: "Initial", fields: {} }],
    });
    toast.show("Request submitted (stub)", { type: "success" });
    navigate("/forms-search");
  };

  return (
    <section className="w-full p-4 text-center">
      <h2 className="text-2xl font-semibold mb-4">Request New Script</h2>
      <form onSubmit={onSubmit} className="space-y-4 max-w-4xl mx-auto text-left">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input name="title" value={form.title} onChange={onChange} className="w-full rounded border px-3 py-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Patient</label>
            <input name="patient" value={form.patient} onChange={onChange} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <input name="department" value={form.department} onChange={onChange} className="w-full rounded border px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Summary</label>
          <textarea name="summary" value={form.summary} onChange={onChange} rows={4} className="w-full rounded border px-3 py-2" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="rounded bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700">Submit</button>
          <button type="button" className="rounded border px-4 py-2 hover:bg-gray-50" onClick={() => navigate("/forms-search")}>Cancel</button>
        </div>
      </form>
    </section>
  );
};

export default RequestNew;
