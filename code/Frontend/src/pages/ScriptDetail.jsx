import { useParams, Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { exportScriptAsPdf } from "../utils/print";
import { downloadScriptPdf, downloadResourcePdf } from "../utils/pdf";
import { buildScriptFromForm } from "../utils/scriptFormat";
import { normalizeScript, mapVersionHistory } from "../utils/normalize";

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

function requestToScript(req = {}) {
  return {
    admin: {
      reson_for_visit: req.chief_concern || req.diagnosis || "",
      chief_concern: req.chief_concern || "",
      diagnosis: req.diagnosis || "",
      class: req.class || "",
      medical_event: req.event || "",
      event_dates: req.event_dates || "",
      learner_level: req.learner_level || "",
      academic_year: req.academic_year || "",
      author: req.case_authors || "",
      summory_of_story: req.summary_patient_story || "",
      student_expectations: req.student_expec || "",
      patient_demographic: req.patient_demog || "",
      special_supplies: req.special_needs || "",
      case_factors: req.case_factors || "",
    },
    patient: {
      name: req.patient_demog || "Patient",
      vitals: {
        heart_rate: "",
        respirations: "",
        pressure: { top: "", bottom: "" },
        blood_oxygen: "",
        temp: { reading: "", unit: "" },
      },
      visit_reason: req.chief_concern || "",
      context: req.case_setting || "",
      task: "",
      encounter_duration: "",
    },
    sp: {
      opening_statement: req.opening_statement || "",
      attributes: {
        anxiety: 0, suprise: 0, confusion: 0, guilt: 0, sadness: 0,
        indecision: 0, assertiveness: 0, frustration: 0, fear: 0, anger: 0,
      },
      physical_chars: req.physical_chars || "",
      current_ill_history: {
        symptom_settings: req.case_setting || "",
        symptom_timing: req.symptom_timing || "",
        associated_symptoms: req.associated_symptoms || "",
        radiation_of_symptoms: "",
        symptom_quality: req.symptom_quality || "",
        alleviating_factors: req.alleviating_factors || "",
        aggravating_factors: req.aggravating_factors || "",
        pain: 0,
        body_location: req.body_location || "",
      },
    },
    med_hist: {
      medications: [],
      allergies: "",
      past_med_his: {},
      preventative_measure: {},
      family_hist: [],
      social_hist: {},
      sympton_review: req.sympt_review || {},
    },
    special: {
      provoking_question: req.provoking_question || "",
      must_ask: req.must_ask || "",
      oppurtunity: req.opportunity || req.special_needs || "",
      opening_statement: req.opening_statement || "",
      feed_back: req.additonal_ins || "",
    },
  };
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
        type: "rating",
      })),
      { label: "Body Location", path: ["sp", "current_ill_history", "body_location"] },
      { label: "Symptom Settings", path: ["sp", "current_ill_history", "symptom_settings"] },
      { label: "Symptom Timing", path: ["sp", "current_ill_history", "symptom_timing"] },
      { label: "Associated Symptoms", path: ["sp", "current_ill_history", "associated_symptoms"] },
      { label: "Radiation of Symptoms", path: ["sp", "current_ill_history", "radiation_of_symptoms"] },
      { label: "Symptom Quality", path: ["sp", "current_ill_history", "symptom_quality"] },
      { label: "Alleviating Factors", path: ["sp", "current_ill_history", "alleviating_factors"] },
      { label: "Aggravating Factors", path: ["sp", "current_ill_history", "aggravating_factors"] },
      { label: "Pain / Severity", path: ["sp", "current_ill_history", "pain"], type: "scale10" },
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
  const { getById, getRequestById, requestsLoaded } = store;
  const toast = useToast();
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("role") === "admin";
  const useMock = import.meta.env.VITE_USE_MOCK === "true";
  const item = getById ? getById(id) : null;
  const requestFallback = !item && getRequestById ? getRequestById(id) : null;
  const isRequestView = Boolean(!item && requestFallback);
  const mappedRequest = useMemo(() => {
    if (!requestFallback) return null;
    const req = requestFallback.raw || requestFallback;
    const fields = requestToScript(req);
    return {
      id: requestFallback.id,
      title: requestFallback.title || "Script Request",
      patient: requestFallback.patient || req?.patient_demog || "Patient",
      department: requestFallback.department || req?.class || "General",
      createdAt: requestFallback.updatedAt || requestFallback.createdAt || new Date().toISOString().slice(0, 10),
      summary: requestFallback.summary || req?.summary_patient_story || "",
      versions: [{ version: "request", notes: requestFallback.note || "From request", fields }],
    };
  }, [requestFallback]);
  const activeItem = item || mappedRequest;
  const [versions, setVersions] = useState(activeItem?.versions || []);
  const [version, setVersion] = useState(activeItem?.versions?.[0]?.version || "current");
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [versionNotes, setVersionNotes] = useState("");
  const fieldRefs = useRef({});
  const [highlightPath, setHighlightPath] = useState(null);

  useEffect(() => {
    if (!item && requestsLoaded && typeof store.fetchById === "function" && !requestFallback) {
      store.fetchById(id);
    }
  }, [id, item, store, requestFallback, requestsLoaded]);

  useEffect(() => {
    if (activeItem?.versions?.length) {
      setVersions(activeItem.versions);
    } else {
      setVersions([]);
    }
  }, [activeItem]);

  useEffect(() => {
    if (!versions.length) return;
    if (!versions.some((v) => v.version === version)) {
      setVersion(versions[0].version);
    }
  }, [versions, version]);

  useEffect(() => {
    const currentVersion = versions.find((v) => v.version === version) || versions[0];
    if (!currentVersion) return;
    const fields = normalizeScript(currentVersion?.fields || {});
    setForm(mergeDeep(initialForm, fields));
    setVersionNotes(currentVersion?.notes || "");
  }, [versions, version]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (useMock || requestFallback) return;
      try {
        const { api } = await import("../api/client");
        const history = await api.listDocumentVersions(id);
        if (cancelled) return;
        const historyVersions = mapVersionHistory(history);
        setVersions((prev) => {
          const currentEntry = prev.find((v) => v.version === "current") || prev[0] || {
            version: "current",
            notes: item?.versions?.[0]?.notes || "Current",
            fields: normalizeScript(item?.versions?.[0]?.fields || {}),
          };
          const merged = [currentEntry, ...historyVersions];
          if (!merged.some((v) => v.version === version) && merged.length) {
            setVersion(merged[0].version);
          }
          return merged;
        });
      } catch (err) {
        console.warn("Failed to load version history", err);
      }
    })();
    return () => { cancelled = true; };
  }, [id, item, version, useMock]);

  if (!activeItem) {
    return (
      <section className="w-full p-4 text-center">
        <div className="text-gray-600">
          Not found. <Link className="text-blue-600 hover:underline" to="/forms-search">Back to search</Link>
        </div>
      </section>
    );
  }

  const current = versions.find((v) => v.version === version) || versions[0];
  const meta = [activeItem.id, activeItem.patient, activeItem.department, activeItem.createdAt].filter(Boolean).join(" | ");
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
      const payload = buildScriptFromForm(form);
      const changeNote = versionNotes || "Updated";
      const createdBy = (typeof window !== "undefined" && localStorage.getItem("user")) || "admin";
      if (isRequestView) {
        toast.show("Create or load a script before saving edits from a request.", { type: "error" });
        return;
      }
      if (useMock) {
        setVersions((prev) => {
          const rest = prev.filter((v) => v.version !== "current");
          return [{ version: "current", notes: changeNote, fields: normalizeScript(payload) }, ...rest];
        });
        toast.show("Updated", { type: "success" });
        return;
      }
      const { api } = await import("../api/client");
      await api.updateDocument(activeItem.id, payload, { change_note: changeNote, created_by: createdBy });
      if (typeof store.fetchById === "function") {
        await store.fetchById(activeItem.id);
      }
      try {
        const history = await api.listDocumentVersions(item.id);
        const historyVersions = mapVersionHistory(history);
        setVersions([
          { version: "current", notes: changeNote, fields: normalizeScript(payload) },
          ...historyVersions,
        ]);
      } catch (err) {
        console.warn("Failed to refresh version history after update", err);
      }
      toast.show("Updated", { type: "success" });
    } catch {
      toast.show("Update failed", { type: "error" });
    }
  };

  const renderInput = (field) => {
    const key = pathKey(field.path);
    const value = getDeep(form, field.path) ?? "";
    const ratingOptions = [
      { label: "None (0)", value: 0 },
      { label: "Mild (1)", value: 1 },
      { label: "Moderate (2)", value: 2 },
      { label: "Concerning (3)", value: 3 },
      { label: "Severe (4)", value: 4 },
      { label: "Extreme (5)", value: 5 },
    ];
    const scaleOptions = Array.from({ length: 11 }).map((_, idx) => ({
      label: `${idx} / 10`,
      value: idx,
    }));
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

    if (field.type === "rating") {
      return (
        <select {...common} value={value} onChange={(e) => setField(field.path, Number(e.target.value))}>
          {ratingOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (field.type === "scale10") {
      return (
        <select {...common} value={value} onChange={(e) => setField(field.path, Number(e.target.value))}>
          {scaleOptions.map((opt) => (
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

  const renderDisplayInput = (field) => {
    const key = pathKey(field.path);
    const value = getDeep(form, field.path) ?? "";
    const ringClass = highlightPath === key ? "ring-2 ring-[#1b76d2]" : "";
    const shared = {
      className: `w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${ringClass}`,
      ref: (el) => { if (el) fieldRefs.current[key] = el; },
      readOnly: true,
      disabled: true,
    };

    if (field.type === "textarea") {
      return <textarea {...shared} className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${ringClass}`} rows={field.rows || 3} value={value} readOnly disabled />;
    }

    if (field.type === "select") {
      return (
        <select {...shared} className={`${shared.className} pr-8`} value={value}>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    const inputType = field.type === "number" ? "number" : "text";
    return (
      <input
        {...shared}
        type={inputType}
        value={value}
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

  const padVal = (s) => {
    if (s === 0) return "0";
    if (s === undefined || s === null || s === "") return "—";
    return String(s);
  };

  const ratingLabel = (n) => {
    const v = Number(n);
    if (Number.isNaN(v)) return "None";
    return ["None", "Mild", "Moderate", "Concerning", "Severe", "Extreme"][v] || "None";
  };

  const ScriptHtmlView = () => {
    const data = form || initialForm;
    const medVal = data?.med_hist?.medications;
    const medCard = Array.isArray(medVal) ? medVal[0] || {} : (medVal || {});
    const ros = data?.med_hist?.sympton_review || {};
    const family = data?.med_hist?.family_hist;
    const familyInfo = Array.isArray(family)
      ? family.map((f) => `${padVal(f?.health_status)} • Age ${padVal(f?.age)} • ${padVal(f?.cause_of_death)}`).join(" | ")
      : (family && typeof family === "object")
        ? Object.values(family || {}).filter(Boolean).join(" | ")
        : "";

    return (
      <div className="rounded border bg-white p-6 space-y-6 text-left">
        <div className="text-sm text-gray-600">
          {[activeItem.id, activeItem.patient, activeItem.department, activeItem.createdAt].filter(Boolean).join(" | ")}
        </div>

        <div className="space-y-3">
          <div className="text-[#981e32] font-semibold text-lg">Administrative Details</div>
          <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800">
            {[
              ["Patient's Reason for Visit", data?.admin?.reson_for_visit],
              ["Chief Complaint", data?.admin?.chief_concern],
              ["Diagnosis", data?.admin?.diagnosis],
              ["Class", data?.admin?.class],
              ["Event", data?.admin?.medical_event],
              ["Learner Level", data?.admin?.learner_level],
              ["Academic Year", data?.admin?.academic_year],
              ["Author", data?.admin?.author],
              ["Student Expectations", data?.admin?.student_expectations],
              ["Patient Demographic", data?.admin?.patient_demographic],
              ["Special Supplies", data?.admin?.special_supplies],
              ["Case Factors", data?.admin?.case_factors],
              ["Additional Instructions", data?.special?.feed_back],
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <dt className="font-semibold text-gray-900">{label}</dt>
                <dd className="text-gray-700">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <div>
            <div className="font-semibold text-gray-900">Summary of patient story</div>
            <p className="text-gray-700 text-sm">{data?.admin?.summory_of_story || "—"}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[#981e32] font-semibold text-lg"> Content for Standardized Patients</div>
          <div className="space-y-1">
            <div className="font-semibold text-gray-900">Opening Statement</div>
            <div className="text-gray-700 text-sm">{data?.sp?.opening_statement || "—"}</div>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Character Attributes</div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {["anxiety","suprise","confusion","guilt","sadness","indecision","assertiveness","frustration","fear","anger"].map((k) => (
                <div key={k} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <span className="capitalize text-gray-800">{k}</span>
                  <span className="font-semibold text-[#981e32]">{ratingLabel(data?.sp?.attributes?.[k])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[#981e32] font-semibold text-lg">History of Present Illness</div>
          <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800">
            {[
              ["Setting", data?.sp?.current_ill_history?.symptom_settings],
              ["Timing", data?.sp?.current_ill_history?.symptom_timing],
              ["Associated Symptoms", data?.sp?.current_ill_history?.associated_symptoms],
              ["Radiation", data?.sp?.current_ill_history?.radiation_of_symptoms],
              ["Quality", data?.sp?.current_ill_history?.symptom_quality],
              ["Alleviating Factors", data?.sp?.current_ill_history?.alleviating_factors],
              ["Aggravating Factors", data?.sp?.current_ill_history?.aggravating_factors],
              ["Severity (0-10)", data?.sp?.current_ill_history?.pain],
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <dt className="font-semibold text-gray-900">{label}</dt>
                <dd className="text-gray-700">{value === 0 ? "0" : value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-2">
          <div className="text-[#981e32] font-semibold text-lg">Medications & Allergies</div>
          <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800">
            <div className="space-y-1">
              <dt className="font-semibold text-gray-900">Medication</dt>
              <dd className="text-gray-700">{[medCard.name, medCard.dose, medCard.frequency].filter(Boolean).join(" • ") || "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="font-semibold text-gray-900">Reason</dt>
              <dd className="text-gray-700">{medCard.reason || "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="font-semibold text-gray-900">Allergies</dt>
              <dd className="text-gray-700">{data?.med_hist?.allergies || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-2">
          <div className="text-[#981e32] font-semibold text-lg">Past Medical History</div>
          <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800">
            {Object.entries(data?.med_hist?.past_med_his || {}).map(([label, value]) => (
              <div key={label} className="space-y-1">
                <dt className="font-semibold text-gray-900">{label.replace(/_/g, " ")}</dt>
                <dd className="text-gray-700">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-2">
          <div className="text-[#981e32] font-semibold text-lg">Preventative Medicine</div>
          <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800">
            {Object.entries(data?.med_hist?.preventative_measure || {}).map(([label, value]) => (
              <div key={label} className="space-y-1">
                <dt className="font-semibold text-gray-900">{label.replace(/_/g, " ")}</dt>
                <dd className="text-gray-700">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-2">
          <div className="text-[#981e32] font-semibold text-lg">Family History</div>
          <div className="text-sm text-gray-700">{familyInfo || "—"}</div>
        </div>

        <div className="space-y-2">
          <div className="text-[#981e32] font-semibold text-lg">Social History</div>
          <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800">
            {[
              ["Personal Background", data?.med_hist?.social_hist?.personal_background],
              ["Nutrition & Exercise", data?.med_hist?.social_hist?.nutrion_and_exercise],
              ["Community & Employment", data?.med_hist?.social_hist?.community_and_employment],
              ["Safety Measures", data?.med_hist?.social_hist?.safety_measure],
              ["Life Stressors", data?.med_hist?.social_hist?.life_stressors],
              ["Substance Use", data?.med_hist?.social_hist?.substance_use],
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <dt className="font-semibold text-gray-900">{label}</dt>
                <dd className="text-gray-700">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-2">
          <div className="text-[#981e32] font-semibold text-lg">Review of Systems</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {Object.entries(ros).map(([label, value]) => (
              <div key={label} className="rounded border px-3 py-2 bg-gray-50">
                <div className="font-semibold text-gray-900">{label}</div>
                <div className="text-gray-700">{value || "—"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[#981e32] font-semibold text-lg">Prompts & Special Instructions</div>
          <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800">
            {[
              ["Provoking Question", data?.special?.provoking_question],
              ["Must Ask", data?.special?.must_ask],
              ["Opportunity", data?.special?.oppurtunity],
              ["Opening Statement", data?.special?.opening_statement],
              ["Feedback", data?.special?.feed_back],
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <dt className="font-semibold text-gray-900">{label}</dt>
                <dd className="text-gray-700">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  };

  const header = (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold">{activeItem.title}</h2>
        <Link to={backTarget} className="text-blue-600 hover:underline">Back</Link>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-700">Version</label>
        <select className="rounded border px-2 py-1" value={version} onChange={(e) => setVersion(e.target.value)}>
          {(versions || []).map((v) => (
            <option key={v.version} value={v.version}>{v.version}</option>
          ))}
        </select>
        <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={() => setArtifactsOpen(true)}>Resources</button>
        <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={() => exportScriptAsPdf(activeItem, current)}>Print</button>
        <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={() => downloadScriptPdf(activeItem, current)}>Download PDF</button>
      </div>
    </div>
  );

  if (isAdmin) {
    return (
      <section className="w-full p-4 space-y-4">
        {header}
        <div className="text-sm text-gray-600">{meta}</div>
        <ScriptHtmlView />

        <Modal open={artifactsOpen} title={`Resources for ${activeItem.id}`} onClose={() => setArtifactsOpen(false)}>
          <div className="space-y-2">
            {(activeItem.artifacts && activeItem.artifacts.length ? activeItem.artifacts : ["Placeholder.pdf"]).map((a, idx) => (
              <div key={idx} className="flex items-center justify-between border rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-[#981e32]">PDF</span>
                  <span>{a}</span>
                </div>
                <button className="rounded border px-2 py-1 hover:bg-gray-50" title="Create PDF" onClick={() => downloadResourcePdf(activeItem, a)}>
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
    <section className="w-full px-4 py-6 space-y-4 text-center">
      {header}
      <div className="text-sm text-gray-600">{meta}</div>
      <ScriptHtmlView />
      <Modal open={artifactsOpen} title={`Resources for ${activeItem.id}`} onClose={() => setArtifactsOpen(false)}>
        <div className="space-y-2">
          {(activeItem.artifacts && activeItem.artifacts.length ? activeItem.artifacts : ["Placeholder.pdf"]).map((a, idx) => (
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
