import { useParams, Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { exportScriptAsPdf } from "../utils/print";
import { downloadScriptPdf, downloadResourcePdf } from "../utils/pdf";

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
    visit_reason: "",
    context: "",
    task: "",
    encounter_duration: "",
    vitals: {
      heart_rate: "",
      respirations: "",
      pressure: { top: "", bottom: "" },
      blood_oxygen: "",
      temp: { reading: "", unit: "" },
    },
  },
  sp: {
    opening_statement: "",
    attributes: {
      anxiety: "",
      suprise: "",
      confusion: "",
      guilt: "",
      sadness: "",
      indecision: "",
      assertiveness: "",
      frustration: "",
      fear: "",
      anger: "",
    },
    physical_chars: "",
    current_ill_history: {
      body_location: "",
      symptom_settings: "",
      symptom_timing: "",
      associated_symptoms: "",
      radiation_of_symptoms: "",
      symptom_quality: "",
      alleviating_factors: "",
      aggravating_factors: "",
      pain: "",
    },
  },
  med_hist: {
    medications: {
      name: "",
      brand: "",
      generic: "",
      dose: "",
      frequency: "",
      reason: "",
      startDate: "",
      otherNotes: "",
    },
    allergies: "",
    past_med_his: {
      child_hood_illness: "",
      illness_and_hospital: "",
      surgeries: "",
      obe_and_gye: "",
      transfusion: "",
      psychiatric: "",
      trauma: "",
    },
    preventative_measure: {
      immunization: "",
      alternate_health_care: "",
      travel_exposure: "",
    },
    family_hist: {
      health_status: "",
      age: "",
      cause_of_death: "",
      additonal_info: "",
    },
    social_hist: {
      personal_background: "",
      nutrion_and_exercise: "",
      community_and_employment: "",
      safety_measure: "",
      life_stressors: "",
      substance_use: "",
      sex_history: {
        current_partners: "",
        past_partners: "",
        contraceptives: "",
        hiv_risk_history: "",
        safety_in_relations: "",
      },
    },
    sympton_review: {
      general: "",
      skin: "",
      heent: "",
      neck: "",
      breast: "",
      respiratory: "",
      cardiovascular: "",
      gastrointestinal: "",
      peripheral_vascular: "",
      musculoskeletal: "",
      psychiatric: "",
      neurologival: "",
      endocine: "",
    },
  },
  special: {
    provoking_question: "",
    must_ask: "",
    oppurtunity: "",
    opening_statement: "",
    feed_back: "",
  },
};

const pathKey = (path) => path.join(".");

function setDeep(obj, path, value) {
  const copy = structuredClone(obj);
  let cur = copy;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[path[path.length - 1]] = value;
  return copy;
}

function getDeep(obj, path) {
  return path.reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}

function mergeDeep(base, incoming) {
  if (incoming === undefined || incoming === null) return base;
  if (typeof base !== "object" || typeof incoming !== "object") return incoming;
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(incoming)) {
    result[key] = mergeDeep(base[key], incoming[key]);
  }
  return result;
}

const fieldSections = [
  {
    title: "Professional",
    fields: [
      { label: "Reason for Visit", path: ["admin", "reson_for_visit"] },
      { label: "Chief Concern", path: ["admin", "chief_concern"] },
      { label: "Diagnosis", path: ["admin", "diagnosis"] },
      { label: "Class", path: ["admin", "class"] },
      { label: "Learner Level", path: ["admin", "learner_level"] },
      { label: "Academic Year", path: ["admin", "academic_year"] },
      { label: "Author", path: ["admin", "author"] },
      { label: "Summary of Patient Story", path: ["admin", "summory_of_story"], type: "textarea" },
      { label: "Student Expectations", path: ["admin", "student_expectations"], type: "textarea" },
      { label: "Patient Demographic", path: ["admin", "patient_demographic"] },
      { label: "Special Supplies", path: ["admin", "special_supplies"] },
      { label: "Case Factors", path: ["admin", "case_factors"], type: "textarea" },
      { label: "Medical Event", path: ["admin", "medical_event"] },
      { label: "Event Dates", path: ["admin", "event_dates"] },
    ],
  },
  {
    title: "Patient",
    fields: [
      { label: "Name", path: ["patient", "name"] },
      { label: "Visit Reason", path: ["patient", "visit_reason"] },
      { label: "Context", path: ["patient", "context"] },
      { label: "Task", path: ["patient", "task"] },
      { label: "Encounter Duration", path: ["patient", "encounter_duration"] },
    ],
  },
  {
    title: "Vitals",
    fields: [
      { label: "Heart Rate", path: ["patient", "vitals", "heart_rate"], type: "number" },
      { label: "Respirations", path: ["patient", "vitals", "respirations"], type: "number" },
      { label: "Blood Oxygen", path: ["patient", "vitals", "blood_oxygen"], type: "number" },
      { label: "Pressure Top", path: ["patient", "vitals", "pressure", "top"], type: "number" },
      { label: "Pressure Bottom", path: ["patient", "vitals", "pressure", "bottom"], type: "number" },
      { label: "Temperature Reading", path: ["patient", "vitals", "temp", "reading"], type: "number" },
      { label: "Temperature Unit", path: ["patient", "vitals", "temp", "unit"], type: "select", options: [
        { label: "Select unit", value: "" },
        { label: "Celsius", value: "C" },
        { label: "Fahrenheit", value: "F" },
      ] },
    ],
  },
  {
    title: "SP Info",
    fields: [
      { label: "Opening Statement", path: ["sp", "opening_statement"], type: "textarea" },
      { label: "Physical Characteristics", path: ["sp", "physical_chars"], type: "textarea" },
      ...["anxiety","suprise","confusion","guilt","sadness","indecision","assertiveness","frustration","fear","anger"].map((k) => ({
        label: k.charAt(0).toUpperCase() + k.slice(1),
        path: ["sp", "attributes", k],
        type: "number",
      })),
      { label: "Body Location", path: ["sp", "current_ill_history", "body_location"] },
      { label: "Symptom Settings", path: ["sp", "current_ill_history", "symptom_settings"] },
      { label: "Symptom Timing", path: ["sp", "current_ill_history", "symptom_timing"] },
      { label: "Associated Symptoms", path: ["sp", "current_ill_history", "associated_symptoms"] },
      { label: "Radiation of Symptoms", path: ["sp", "current_ill_history", "radiation_of_symptoms"] },
      { label: "Symptom Quality", path: ["sp", "current_ill_history", "symptom_quality"] },
      { label: "Alleviating Factors", path: ["sp", "current_ill_history", "alleviating_factors"] },
      { label: "Aggravating Factors", path: ["sp", "current_ill_history", "aggravating_factors"] },
      { label: "Pain", path: ["sp", "current_ill_history", "pain"], type: "number" },
    ],
  },
  {
    title: "Medications",
    fields: [
      { label: "Name", path: ["med_hist", "medications", "name"] },
      { label: "Brand", path: ["med_hist", "medications", "brand"] },
      { label: "Generic Name", path: ["med_hist", "medications", "generic"] },
      { label: "Dose", path: ["med_hist", "medications", "dose"] },
      { label: "Frequency", path: ["med_hist", "medications", "frequency"] },
      { label: "Reason", path: ["med_hist", "medications", "reason"] },
      { label: "Date Started", path: ["med_hist", "medications", "startDate"] },
      { label: "Other Notes", path: ["med_hist", "medications", "otherNotes"], type: "textarea" },
      { label: "Allergies", path: ["med_hist", "allergies"] },
    ],
  },
  {
    title: "Past Medical History",
    fields: [
      { label: "Childhood Illness", path: ["med_hist", "past_med_his", "child_hood_illness"] },
      { label: "Medical Illnesses and Hospitalizations", path: ["med_hist", "past_med_his", "illness_and_hospital"] },
      { label: "Surgeries", path: ["med_hist", "past_med_his", "surgeries"] },
      { label: "Obstetric or Gynecologic History", path: ["med_hist", "past_med_his", "obe_and_gye"] },
      { label: "Transfusion History", path: ["med_hist", "past_med_his", "transfusion"] },
      { label: "Psychiatric History", path: ["med_hist", "past_med_his", "psychiatric"] },
      { label: "Trauma", path: ["med_hist", "past_med_his", "trauma"] },
    ],
  },
  {
    title: "Preventative Measures",
    fields: [
      { label: "Immunizations", path: ["med_hist", "preventative_measure", "immunization"] },
      { label: "Alternative/Complementary Health Care", path: ["med_hist", "preventative_measure", "alternate_health_care"] },
      { label: "Travel/Exposure History", path: ["med_hist", "preventative_measure", "travel_exposure"] },
    ],
  },
  {
    title: "Family History",
    fields: [
      { label: "Health Status", path: ["med_hist", "family_hist", "health_status"] },
      { label: "Age", path: ["med_hist", "family_hist", "age"], type: "number" },
      { label: "Cause of Death", path: ["med_hist", "family_hist", "cause_of_death"] },
      { label: "Additional Info", path: ["med_hist", "family_hist", "additonal_info"], type: "textarea" },
    ],
  },
  {
    title: "Social History",
    fields: [
      { label: "Personal Background", path: ["med_hist", "social_hist", "personal_background"] },
      { label: "Nutritional and Exercise History", path: ["med_hist", "social_hist", "nutrion_and_exercise"] },
      { label: "Community and Employment History", path: ["med_hist", "social_hist", "community_and_employment"] },
      { label: "Safety Measures", path: ["med_hist", "social_hist", "safety_measure"] },
      { label: "Significant Life Stressors", path: ["med_hist", "social_hist", "life_stressors"] },
      { label: "Substance Use", path: ["med_hist", "social_hist", "substance_use"] },
      { label: "Current Partners", path: ["med_hist", "social_hist", "sex_history", "current_partners"], type: "number" },
      { label: "Past Partners", path: ["med_hist", "social_hist", "sex_history", "past_partners"], type: "number" },
      { label: "Contraceptives", path: ["med_hist", "social_hist", "sex_history", "contraceptives"] },
      { label: "HIV Risk History", path: ["med_hist", "social_hist", "sex_history", "hiv_risk_history"] },
      { label: "Safety in Relationships", path: ["med_hist", "social_hist", "sex_history", "safety_in_relations"] },
    ],
  },
  {
    title: "Review of Symptoms",
    fields: [
      { label: "General", path: ["med_hist", "sympton_review", "general"] },
      { label: "Skin", path: ["med_hist", "sympton_review", "skin"] },
      { label: "HEENT", path: ["med_hist", "sympton_review", "heent"] },
      { label: "Neck", path: ["med_hist", "sympton_review", "neck"] },
      { label: "Breast", path: ["med_hist", "sympton_review", "breast"] },
      { label: "Respiratory", path: ["med_hist", "sympton_review", "respiratory"] },
      { label: "Cardiovascular", path: ["med_hist", "sympton_review", "cardiovascular"] },
      { label: "Gastrointestinal", path: ["med_hist", "sympton_review", "gastrointestinal"] },
      { label: "Peripheral Vascular", path: ["med_hist", "sympton_review", "peripheral_vascular"] },
      { label: "Musculoskeletal", path: ["med_hist", "sympton_review", "musculoskeletal"] },
      { label: "Psychiatric", path: ["med_hist", "sympton_review", "psychiatric"] },
      { label: "Neurological", path: ["med_hist", "sympton_review", "neurologival"] },
      { label: "Endocrine", path: ["med_hist", "sympton_review", "endocine"] },
    ],
  },
  {
    title: "Special Instructions",
    fields: [
      { label: "Provoking Question", path: ["special", "provoking_question"] },
      { label: "Must Ask", path: ["special", "must_ask"] },
      { label: "Opportunity", path: ["special", "oppurtunity"] },
      { label: "Opening Statement", path: ["special", "opening_statement"] },
      { label: "Feedback", path: ["special", "feed_back"] },
    ],
  },
];

const labelMap = (() => {
  const map = {};
  fieldSections.forEach((group) => {
    group.fields.forEach((f) => {
      map[pathKey(f.path)] = f.label;
    });
  });
  return map;
})();

const ScriptDetail = () => {
  const { id } = useParams();
  const store = useStore();
  const { getById } = store;
  const toast = useToast();
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("role") === "admin";
  const item = getById(id);
  const [version, setVersion] = useState(item?.versions?.[0]?.version || "v1");
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [versionNotes, setVersionNotes] = useState("");
  const fieldRefs = useRef({});
  const [highlightPath, setHighlightPath] = useState(null);

  useEffect(() => {
    if (!item && typeof store.fetchById === "function") {
      store.fetchById(id);
    }
  }, [id, item, store]);

  useEffect(() => {
    const current = item?.versions?.find((v) => v.version === version) || item?.versions?.[0];
    if (!current) return;
    const fields = current?.fields || {};
    setForm(mergeDeep(initialForm, fields));
    setVersionNotes(current?.notes || "");
  }, [item, version]);

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
  const backTarget = isAdmin ? "/dashboard" : "/forms-search";

  const setField = (path, value) => {
    setForm((prev) => setDeep(prev, path, value));
  };

  const scrollToField = (path) => {
    const key = pathKey(path);
    const el = fieldRefs.current[key];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightPath(key);
      setTimeout(() => setHighlightPath(null), 1200);
    }
  };

  const saveEdits = async () => {
    try {
      if (current) {
        current.fields = form;
        current.notes = versionNotes;
      }
      const { api } = await import("../api/client");
      await api.updateDocument(item.id, { ...form, notes: versionNotes });
      toast.show("Updated", { type: "success" });
    } catch {
      toast.show("Update failed", { type: "error" });
    }
  };

  const renderInput = (field) => {
    const key = pathKey(field.path);
    const value = getDeep(form, field.path) ?? "";
    const common = {
      className: `rounded border px-3 py-2 text-sm ${highlightPath === key ? "ring-2 ring-[#1b76d2]" : ""}`,
      ref: (el) => { if (el) fieldRefs.current[key] = el; },
    };

    if (field.type === "textarea") {
      return <textarea {...common} rows={field.rows || 3} value={value} onChange={(e) => setField(field.path, e.target.value)} />;
    }

    if (field.type === "select") {
      return (
        <select {...common} value={value} onChange={(e) => setField(field.path, e.target.value)}>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    const inputType = field.type === "number" ? "number" : "text";
    return (
      <input
        {...common}
        type={inputType}
        value={value}
        onChange={(e) => setField(field.path, e.target.value === "" ? "" : inputType === "number" ? Number(e.target.value) : e.target.value)}
      />
    );
  };

  const buildJsonLines = (val) => {
    const lines = [];
    const walk = (node, indent, path, isLast) => {
      if (node && typeof node === "object" && !Array.isArray(node)) {
        const keys = Object.keys(node);
        lines.push({ text: `${indent}{`, path: null });
        keys.forEach((k, idx) => {
          const last = idx === keys.length - 1;
          const childPath = path.concat(k);
          const displayKey = labelMap[pathKey(childPath)] || k;
          const v = node[k];
          if (v && typeof v === "object" && !Array.isArray(v)) {
            lines.push({ text: `${indent}  "${displayKey}": {`, path: childPath });
            walk(v, `${indent}  `, childPath, last);
            lines.push({ text: `${indent}  }${last ? "" : ","}`, path: childPath });
          } else {
            lines.push({ text: `${indent}  "${displayKey}": ${JSON.stringify(v)}${last ? "" : ","}`, path: childPath });
          }
        });
        lines.push({ text: `${indent}}${isLast ? "" : ","}`, path: null });
      } else {
        lines.push({ text: `${indent}${JSON.stringify(node)}${isLast ? "" : ","}`, path });
      }
    };
    walk(val ?? {}, "", [], true);
    return lines;
  };

  const jsonLines = useMemo(
    () => buildJsonLines(isAdmin ? form : current?.fields || {}),
    [form, current, isAdmin]
  );

  const header = (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold">{item.title}</h2>
        <Link to={backTarget} className="text-blue-600 hover:underline">Back</Link>
      </div>
      <div className="flex items-center gap-3">
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
    </div>
  );

  if (isAdmin) {
    return (
      <section className="w-full p-4 space-y-4">
        {header}
        <div className="text-sm text-gray-600">{meta}</div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded border bg-white p-4 space-y-3">
            <h3 className="text-lg font-semibold text-[#b4152b]">Edit Script (Admin)</h3>
            {fieldSections.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="text-sm font-semibold text-gray-800">{group.title}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.fields.map((f) => (
                    <label key={pathKey(f.path)} className="text-sm text-gray-700 flex flex-col gap-1">
                      {f.label}
                      {renderInput(f)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <label className="text-sm text-gray-700 flex flex-col gap-1">
              Version notes
              <textarea className="rounded border px-3 py-2" rows={3} value={versionNotes} onChange={(e) => setVersionNotes(e.target.value)} />
            </label>
            <div className="flex gap-2 justify-end">
              <button className="rounded bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700" onClick={saveEdits}>Save Update</button>
              <button className="rounded border px-4 py-2 hover:bg-gray-50" onClick={() => setArtifactsOpen(true)}>Resources</button>
            </div>
          </div>
          <div className="space-y-3 text-left">
            <div className="rounded border p-3 bg-white">
              <div className="font-medium mb-2">Summary</div>
              <div className="text-gray-700">{item.summary || "No summary provided."}</div>
            </div>
            <div className="rounded border p-3 bg-white">
              <div className="font-medium mb-2">Version Notes</div>
              <div className="text-gray-700">{versionNotes || current?.notes || "N/A"}</div>
            </div>
            <div className="rounded border p-3 bg-white">
              <div className="font-medium mb-2">Fields</div>
              <div className="text-xs font-mono bg-gray-50 rounded p-[1px] space-y-[1px] text-left">
                {jsonLines.map((line, idx) => {
                  const clickable = Boolean(line.path);
                  const Comp = clickable ? "button" : "div";
                  return (
                    <Comp
                      key={idx}
                      type={clickable ? "button" : undefined}
                      onClick={clickable ? () => scrollToField(line.path) : undefined}
                      className={clickable ? "w-full text-left rounded px-[1px] py-[1px] hover:bg-blue-50 hover:text-[#1b76d2] border border-transparent hover:border-[#1b76d2] whitespace-pre" : "whitespace-pre px-[1px] py-[1px]"}
                    >
                      {line.text}
                    </Comp>
                  );
                })}
              </div>
            </div>
          </div>
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
  }

  return (
    <section className="w-full p-4 space-y-4 text-center">
      {header}
      <div className="text-sm text-gray-600">{meta}</div>
      <div className="rounded border p-3 bg-white w-full mx-auto text-left">
        <div className="font-medium mb-2">Summary</div>
        <div className="text-gray-700">{item.summary || "No summary provided."}</div>
      </div>
      <div className="rounded border p-3 bg-white w-full mx-auto text-left">
        <div className="font-medium mb-2">Version Notes</div>
        <div className="text-gray-700">{current?.notes || "N/A"}</div>
      </div>
      <div className="rounded border p-3 bg-white">
        <div className="font-medium mb-2">Fields</div>
        <div className="text-xs font-mono bg-gray-50 rounded p-[1px] space-y-[1px] text-left">
          {jsonLines.map((line, idx) => (
            <div key={idx} className="whitespace-pre px-[1px] py-[1px] text-gray-800">
              {line.text}
            </div>
          ))}
        </div>
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
