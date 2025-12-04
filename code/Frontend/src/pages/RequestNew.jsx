import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useStore } from "../store";
import { useToast } from "../components/Toast";
import { buildScriptFromForm, downloadScriptJson } from "../utils/scriptFormat";

const RequestNew = () => {
  const navigate = useNavigate();
  const { addItem } = useStore();
  const toast = useToast();
  const initialForm = {
    admin: {
      reson_for_visit: "",
      chief_concern: "",
      diagnosis: "",
      class: "",
      medical_event: "",
      event_dates: "",
      learner_level: "",
      academic_year: "",
      author: "",
      summory_of_story: "",
      student_expectations: "",
      patient_demographic: "",
      special_supplies: "",
      case_factors: "",
    },
    patient: {
      name: "",
      vitals: {
        heart_rate: 0,
        respirations: 0,
        pressure: { top: 0, bottom: 0 },
        blood_oxygen: 0,
        temp: { reading: 0, unit: "Celcius" },
      },
      visit_reason: "",
      context: "",
      task: "",
      encounter_duration: "",
    },
  };

  const [form, setForm] = useState(initialForm);

  function setDeep(obj, path, value) {
    const copy = JSON.parse(JSON.stringify(obj));
    let cur = copy;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
      cur = cur[key];
    }
    cur[path[path.length - 1]] = value;
    return copy;
  }

  const setField = (path, value) => setForm(prev => setDeep(prev, path, value));
  const getField = (path) => path.reduce((acc, k) => (acc ? acc[k] : undefined), form);

  const onSubmit = (e) => {
    e.preventDefault();
    const id = `SCR-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString().slice(0, 10);
    const script = buildScriptFromForm(form);
    addItem({
      id,
      title: form.admin.reson_for_visit || "Untitled",
      patient: form.patient.name || "Unknown",
      department: form.admin.class || "General",
      createdAt: now,
      summary: form.admin.summory_of_story || "",
      artifacts: [],
      versions: [{ version: "v1", notes: "Initial", fields: script }],
    });
    toast.show("Request submitted (stub)", { type: "success" });
    navigate("/forms-search");
  };

  return (
    <section className="w-full p-4 text-center">
      <h2 className="text-2xl font-semibold mb-4">Create New Script</h2>
      <form onSubmit={onSubmit} className="space-y-4 max-w-4xl mx-auto text-left">
        <div className="rounded border p-4 bg-white">
          <h3 className="font-semibold mb-3">Professional</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Reason for Visit</label>
              <input value={getField(['admin','reson_for_visit']) || ''} onChange={(e) => setField(['admin','reson_for_visit'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chief Concern</label>
              <input value={getField(['admin','chief_concern']) || ''} onChange={(e) => setField(['admin','chief_concern'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Diagnosis</label>
              <input value={getField(['admin','diagnosis']) || ''} onChange={(e) => setField(['admin','diagnosis'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <input value={getField(['admin','class']) || ''} onChange={(e) => setField(['admin','class'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Medical Event</label>
              <input value={getField(['admin','medical_event']) || ''} onChange={(e) => setField(['admin','medical_event'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Event Dates</label>
              <input value={getField(['admin','event_dates']) || ''} onChange={(e) => setField(['admin','event_dates'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Learner Level</label>
              <input value={getField(['admin','learner_level']) || ''} onChange={(e) => setField(['admin','learner_level'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Academic Year</label>
              <input value={getField(['admin','academic_year']) || ''} onChange={(e) => setField(['admin','academic_year'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Author</label>
              <input value={getField(['admin','author']) || ''} onChange={(e) => setField(['admin','author'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Summary of Patient Story</label>
              <textarea rows={3} value={getField(['admin','summory_of_story']) || ''} onChange={(e) => setField(['admin','summory_of_story'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Student Expectations</label>
              <textarea rows={2} value={getField(['admin','student_expectations']) || ''} onChange={(e) => setField(['admin','student_expectations'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Patient Demographic</label>
              <input value={getField(['admin','patient_demographic']) || ''} onChange={(e) => setField(['admin','patient_demographic'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Special Supplies</label>
              <input value={getField(['admin','special_supplies']) || ''} onChange={(e) => setField(['admin','special_supplies'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Case Factors</label>
              <textarea rows={2} value={getField(['admin','case_factors']) || ''} onChange={(e) => setField(['admin','case_factors'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
          </div>
        </div>

        <div className="rounded border p-4 bg-white">
          <h3 className="font-semibold mb-3">Patient</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input value={getField(['patient','name']) || ''} onChange={(e) => setField(['patient','name'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Visit Reason</label>
              <input value={getField(['patient','visit_reason']) || ''} onChange={(e) => setField(['patient','visit_reason'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Context</label>
              <input value={getField(['patient','context']) || ''} onChange={(e) => setField(['patient','context'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Task</label>
              <input value={getField(['patient','task']) || ''} onChange={(e) => setField(['patient','task'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Encounter Duration</label>
              <input value={getField(['patient','encounter_duration']) || ''} onChange={(e) => setField(['patient','encounter_duration'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Heart Rate</label>
              <input type="number" value={getField(['patient','vitals','heart_rate']) || 0} onChange={(e) => setField(['patient','vitals','heart_rate'], Number(e.target.value))} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Respirations</label>
              <input type="number" value={getField(['patient','vitals','respirations']) || 0} onChange={(e) => setField(['patient','vitals','respirations'], Number(e.target.value))} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Blood Oxygen</label>
              <input type="number" value={getField(['patient','vitals','blood_oxygen']) || 0} onChange={(e) => setField(['patient','vitals','blood_oxygen'], Number(e.target.value))} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pressure Top</label>
              <input type="number" value={getField(['patient','vitals','pressure','top']) || 0} onChange={(e) => setField(['patient','vitals','pressure','top'], Number(e.target.value))} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pressure Bottom</label>
              <input type="number" value={getField(['patient','vitals','pressure','bottom']) || 0} onChange={(e) => setField(['patient','vitals','pressure','bottom'], Number(e.target.value))} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Temperature Reading</label>
              <input type="number" value={getField(['patient','vitals','temp','reading']) || 0} onChange={(e) => setField(['patient','vitals','temp','reading'], Number(e.target.value))} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Temperature Unit</label>
              <input value={getField(['patient','vitals','temp','unit']) || 'Celcius'} onChange={(e) => setField(['patient','vitals','temp','unit'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="rounded bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700">Submit</button>
          <button type="button" className="rounded border px-4 py-2 hover:bg-gray-50" onClick={() => navigate("/forms-search")}>Cancel</button>
          <button
            type="button"
            className="rounded border px-4 py-2 hover:bg-gray-50"
            onClick={() => {
              const script = buildScriptFromForm(form);
              downloadScriptJson(script, `script-${Date.now()}.json`);
            }}
          >
            Download Script 
          </button>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-medium mb-2">Live Script JSON Preview</div>
          <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(buildScriptFromForm(form), null, 2)}</pre>
        </div>
      </form>
    </section>
  );
};

export default RequestNew;
