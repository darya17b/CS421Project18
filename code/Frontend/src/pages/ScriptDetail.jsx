import { useParams, Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { downloadScriptPdf, downloadResourcePdf, downloadMedicationCardPdf, getScriptPdfUrl } from "../utils/pdf";
import { getArtifactBadge, getArtifactName, getArtifactUrl, isMedicationCardName } from "../utils/artifacts";
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
  const draft = req?.draft_script && typeof req.draft_script === "object"
    ? normalizeScript(req.draft_script)
    : null;
  const artifacts = req?.artifacts || draft?.artifacts || [];
  const reasonForVisit =
    req.reason_for_visit ||
    req.reson_for_visit ||
    draft?.admin?.reson_for_visit ||
    draft?.patient?.visit_reason ||
    req.chief_concern ||
    req.diagnosis ||
    "";

  if (draft) {
    return mergeDeep(draft, {
      admin: {
        reson_for_visit: reasonForVisit,
        chief_concern: draft?.admin?.chief_concern || req.chief_concern || "",
        diagnosis: draft?.admin?.diagnosis || req.diagnosis || "",
      },
      patient: {
        name: draft?.patient?.name || req.patient_demog || "Patient",
        visit_reason: draft?.patient?.visit_reason || reasonForVisit,
        context: draft?.patient?.context || req.case_setting || "",
      },
      artifacts,
    });
  }

  return {
    admin: {
      reson_for_visit: reasonForVisit,
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
      visit_reason: reasonForVisit,
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
    artifacts,
  };
}

const fieldSections = [
  {
    title: "Professional",
    fields: [
      { label: "Diagnosis", path: ["admin", "reson_for_visit"] },
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
      { label: "Diagnosis", path: ["patient", "visit_reason"] },
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

const fieldConfigMap = (() => {
  const map = {};
  fieldSections.forEach((group) => {
    group.fields.forEach((f) => {
      map[pathKey(f.path)] = f;
    });
  });
  return map;
})();

const ScriptDetail = ({ requestInlineOnly = false }) => {
  const { id } = useParams();
  const store = useStore();
  const location = useLocation();
  const requestFromState = location.state?.request;
  const { getById, getRequestById, requestsLoaded, updateRequest, refreshRequests } = store;
  const toast = useToast();
  const isAdmin = (() => {
    if (typeof window === "undefined") return false;
    const role = (localStorage.getItem("role") || "").trim().toLowerCase();
    return role === "admin";
  })();
  const useMock = import.meta.env.VITE_USE_MOCK === "true";
  const item = requestInlineOnly ? null : (getById ? getById(id) : null);
  const requestFallback = (!item && getRequestById ? getRequestById(id) : null) || requestFromState || null;
  const isRequestView = Boolean(!item && requestFallback);
  const mappedRequest = useMemo(() => {
    if (!requestFallback) return null;
    const req = requestFallback.raw || requestFallback;
    const reasonForVisit =
      req?.reason_for_visit ||
      req?.reson_for_visit ||
      req?.draft_script?.admin?.reson_for_visit ||
      req?.draft_script?.patient?.visit_reason ||
      req?.chief_concern ||
      "";
    const patient = [
      requestFallback.patient,
      req?.patient_demog,
      req?.draft_script?.patient?.name,
      reasonForVisit,
      req?.case_setting,
      "Patient",
    ].find((value) => {
      if (typeof value !== "string") return Boolean(value);
      const trimmed = value.trim();
      return Boolean(trimmed) && trimmed.toLowerCase() !== "unknown";
    }) || "Patient";
    const fields = requestToScript(req);
    return {
      id: requestFallback.id,
      title: requestFallback.title || reasonForVisit || "Script Request",
      patient,
      department: requestFallback.department || req?.class || "General",
      createdAt: requestFallback.updatedAt || requestFallback.createdAt || new Date().toISOString().slice(0, 10),
      summary: requestFallback.summary || req?.summary_patient_story || "",
      artifacts: req?.artifacts || req?.draft_script?.artifacts || requestFallback.artifacts || [],
      versions: [{ version: "request", notes: requestFallback.note || "From request", fields }],
    };
  }, [requestFallback]);
  const activeItem = item || mappedRequest;
  const canRequestInlineEdit = isAdmin && requestInlineOnly && isRequestView;
  const [versions, setVersions] = useState(activeItem?.versions || []);
  const [version, setVersion] = useState(activeItem?.versions?.[0]?.version || "current");
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [versionNotes, setVersionNotes] = useState("");
  const [editingPath, setEditingPath] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingLine, setSavingLine] = useState(false);
  const fieldRefs = useRef({});
  const [highlightPath, setHighlightPath] = useState(null);

  useEffect(() => {
    if (!requestInlineOnly && !item && requestsLoaded && typeof store.fetchById === "function" && !requestFallback) {
      store.fetchById(id);
    }
  }, [id, item, store, requestFallback, requestsLoaded, requestInlineOnly]);

  useEffect(() => {
    if (!requestInlineOnly) return;
    if (requestFallback) return;
    if (typeof refreshRequests !== "function") return;
    refreshRequests().catch((err) => console.warn("Failed to refresh requests", err));
  }, [requestInlineOnly, requestFallback, refreshRequests]);

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
    setEditingPath(null);
    setEditingValue("");
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

  if (!activeItem && requestInlineOnly && !requestsLoaded) {
    return (
      <section className="w-full p-4 text-center">
        <div className="text-gray-600">Loading request...</div>
      </section>
    );
  }

  if (requestInlineOnly && !isAdmin) {
    return (
      <section className="w-full p-4 text-center">
        <div className="text-gray-600">
          Admin access required. <Link className="text-blue-600 hover:underline" to="/dashboard">Back</Link>
        </div>
      </section>
    );
  }

  if (!activeItem) {
    return (
      <section className="w-full p-4 text-center">
        <div className="text-gray-600">
          Not found. <Link className="text-blue-600 hover:underline" to={requestInlineOnly ? "/requests" : "/forms-search"}>Back</Link>
        </div>
      </section>
    );
  }

  const current = versions.find((v) => v.version === version) || versions[0];
  const meta = [activeItem.id, activeItem.patient, activeItem.department, activeItem.createdAt].filter(Boolean).join(" | ");
  const fromPath = location.state?.from;
  const backTarget =
    typeof fromPath === "string" && fromPath.trim()
      ? fromPath
      : (requestInlineOnly ? "/requests" : (isAdmin ? "/dashboard" : "/forms-search"));

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

  const saveEdits = async (nextForm = form, overrideNote = null) => {
    try {
      const payload = buildScriptFromForm(nextForm);
      const changeNote = overrideNote || versionNotes || "Updated";
      const createdBy = (typeof window !== "undefined" && localStorage.getItem("user")) || "admin";
      if (isRequestView) {
        toast.show("Create or load a script before saving edits from a request.", { type: "error" });
        return false;
      }
      if (useMock) {
        setVersions((prev) => {
          const rest = prev.filter((v) => v.version !== "current");
          return [{ version: "current", notes: changeNote, fields: normalizeScript(payload) }, ...rest];
        });
        toast.show("Updated", { type: "success" });
        return true;
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
      return true;
    } catch {
      toast.show("Update failed", { type: "error" });
      return false;
    }
  };

  const beginLineEdit = (path) => {
    if (!canRequestInlineEdit) {
      if (isAdmin && !requestInlineOnly) {
        toast.show("Inline edit is available on request scripts from the Requests page.", { type: "info" });
      }
      return;
    }
    const key = pathKey(path);
    const currentValue = getDeep(form, path);
    setEditingPath(key);
    setEditingValue(currentValue === undefined || currentValue === null ? "" : String(currentValue));
  };

  const cancelLineEdit = () => {
    if (savingLine) return;
    setEditingPath(null);
    setEditingValue("");
  };

  const coerceLineValue = (path, rawValue) => {
    const cfg = fieldConfigMap[pathKey(path)];
    if (!cfg) return rawValue;
    if (cfg.type === "number" || cfg.type === "rating" || cfg.type === "scale10") {
      if (rawValue === "") return "";
      const n = Number(rawValue);
      return Number.isNaN(n) ? "" : n;
    }
    return rawValue;
  };

  const saveLineEdit = async (path, label) => {
    const nextValue = coerceLineValue(path, editingValue);
    const nextForm = setDeep(form, path, nextValue);
    setForm(nextForm);
    setSavingLine(true);
    let ok = false;
    if (canRequestInlineEdit) {
      try {
        const req = requestFallback?.raw || requestFallback || {};
        const draftScript = buildScriptFromForm(nextForm);
        const payload = {
          ...req,
          draft_script: draftScript,
          status: req.status || requestFallback?.status || "",
          updated_at: new Date().toISOString(),
        };

        if (typeof updateRequest === "function") {
          await updateRequest(requestFallback.id, payload);
        } else {
          const { api } = await import("../api/client");
          await api.updateScriptRequest(requestFallback.id, payload);
        }
        setVersions((prev) => {
          const rest = prev.filter((v) => v.version !== "request");
          return [{ version: "request", notes: `Edited ${label}`, fields: normalizeScript(draftScript) }, ...rest];
        });
        toast.show("Request draft updated", { type: "success" });
        ok = true;
      } catch {
        toast.show("Update failed", { type: "error" });
      }
    } else {
      ok = await saveEdits(nextForm, `Edited ${label}`);
    }
    setSavingLine(false);
    if (ok) {
      setEditingPath(null);
      setEditingValue("");
    }
  };

  const printScriptPdf = () => {
    const pdfUrl = getScriptPdfUrl(activeItem, current);
    const printWindow = window.open(pdfUrl, "_blank");
    if (!printWindow) {
      toast.show("Pop-up blocked. Please allow pop-ups to print.", { type: "error" });
      return;
    }

    const triggerPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        // Some browsers block immediate print on PDF tabs; user can print manually.
      }
    };

    if (printWindow.document?.readyState === "complete") {
      setTimeout(triggerPrint, 150);
    } else {
      printWindow.onload = () => setTimeout(triggerPrint, 150);
    }
  };

  const openArtifact = (artifact) => {
    if (artifact?.__generatedMedicationCard) {
      void downloadMedicationCardPdf(activeItem, current, artifact?.name || "Medication Card");
      return;
    }
    const artifactName = getArtifactName(artifact);
    if (isMedicationCardName(artifactName)) {
      void downloadMedicationCardPdf(activeItem, current, artifactName);
      return;
    }
    const url = getArtifactUrl(artifact);
    if (url) {
      window.open(url, "_blank", "noopener");
    } else {
      downloadResourcePdf(activeItem, artifactName);
    }
  };

  const renderEditableValue = ({ path, label, displayValue }) => {
    const key = pathKey(path);
    const valueForDisplay = displayValue ?? getDeep(form, path);
    const formatted = valueForDisplay === 0 ? "0" : (valueForDisplay === undefined || valueForDisplay === null || valueForDisplay === "" ? "-" : String(valueForDisplay));

    if (!canRequestInlineEdit) return formatted;

    if (editingPath === key) {
      const cfg = fieldConfigMap[key];
      const isNumber = cfg?.type === "number" || cfg?.type === "rating" || cfg?.type === "scale10";
      return (
        <span className="inline-flex items-center gap-1 align-middle">
          <input
            type={isNumber ? "number" : "text"}
            className="rounded border border-[#981e32] px-2 py-1 text-sm"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveLineEdit(path, label);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelLineEdit();
              }
            }}
            autoFocus
          />
          <button
            type="button"
            className="rounded border border-[#981e32] px-2 py-1 text-xs font-semibold text-[#981e32] hover:bg-[#981e32] hover:text-white disabled:opacity-50"
            disabled={savingLine}
            onClick={() => { void saveLineEdit(path, label); }}
          >
            Save
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
            disabled={savingLine}
            onClick={cancelLineEdit}
          >
            Cancel
          </button>
        </span>
      );
    }

    return (
      <span
        className="cursor-text rounded px-1 hover:bg-[#f7e7eb]"
        title="Double-click to edit"
        onDoubleClick={() => beginLineEdit(path)}
      >
        {formatted}
      </span>
    );
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
    const empty = "-";
    const tempUnitRaw = data?.patient?.vitals?.temp?.unit;
    const tempUnit = typeof tempUnitRaw === "number"
      ? (tempUnitRaw === 1 ? "Fahrenheit" : "Celsius")
      : (tempUnitRaw || "");

    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <div className="text-center space-y-1">
          <div className="text-xs uppercase tracking-[0.25em] text-gray-500">Virtual Clinical Center</div>
          <h3 className="text-xl font-semibold text-[#981e32]">
            {renderEditableValue({
              path: ["admin", "reson_for_visit"],
              label: "Diagnosis",
              displayValue: data?.admin?.reson_for_visit || activeItem.title || "Script Preview",
            })}
          </h3>
          <div className="text-sm text-gray-700">
            {data?.admin?.diagnosis || "Diagnosis TBD"} - {data?.admin?.class || activeItem.department || "Course"} - {data?.admin?.author || "Author N/A"}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Administrative Details</div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><span className="font-semibold">Diagnosis:</span> {renderEditableValue({ path: ["admin", "reson_for_visit"], label: "Diagnosis", displayValue: data?.admin?.reson_for_visit || empty })}</li>
              <li><span className="font-semibold">Chief Complaint:</span> {renderEditableValue({ path: ["admin", "chief_concern"], label: "Chief Concern", displayValue: data?.admin?.chief_concern || empty })}</li>
              <li><span className="font-semibold">Diagnosis:</span> {renderEditableValue({ path: ["admin", "diagnosis"], label: "Diagnosis", displayValue: data?.admin?.diagnosis || empty })}</li>
              <li><span className="font-semibold">Event:</span> {renderEditableValue({ path: ["admin", "medical_event"], label: "Medical Event", displayValue: data?.admin?.medical_event || empty })}</li>
              <li><span className="font-semibold">Learner Level:</span> {renderEditableValue({ path: ["admin", "learner_level"], label: "Learner Level", displayValue: data?.admin?.learner_level || empty })}</li>
              <li><span className="font-semibold">Academic Year:</span> {renderEditableValue({ path: ["admin", "academic_year"], label: "Academic Year", displayValue: data?.admin?.academic_year || empty })}</li>
              <li><span className="font-semibold">Author:</span> {renderEditableValue({ path: ["admin", "author"], label: "Author", displayValue: data?.admin?.author || empty })}</li>
            </ul>
            <div className="text-sm text-gray-700">
              <div className="font-semibold">Summary of Patient Story</div>
              <p className="text-gray-800">{renderEditableValue({ path: ["admin", "summory_of_story"], label: "Summary of Patient Story", displayValue: data?.admin?.summory_of_story || "Add a short narrative to summarize the case." })}</p>
            </div>
            <div className="text-sm text-gray-700">
              <div className="font-semibold">Student Expectations</div>
              <p className="text-gray-800">{renderEditableValue({ path: ["admin", "student_expectations"], label: "Student Expectations", displayValue: data?.admin?.student_expectations || "List expectations for learners." })}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Patient Snapshot</div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><span className="font-semibold">Patient:</span> {renderEditableValue({ path: ["patient", "name"], label: "Patient Name", displayValue: data?.patient?.name || empty })}</li>
              <li><span className="font-semibold">Diagnosis:</span> {renderEditableValue({ path: ["patient", "visit_reason"], label: "Patient Diagnosis", displayValue: data?.patient?.visit_reason || data?.admin?.reson_for_visit || empty })}</li>
              <li><span className="font-semibold">Context:</span> {renderEditableValue({ path: ["patient", "context"], label: "Patient Context", displayValue: data?.patient?.context || empty })}</li>
              <li><span className="font-semibold">Task:</span> {renderEditableValue({ path: ["patient", "task"], label: "Patient Task", displayValue: data?.patient?.task || empty })}</li>
              <li><span className="font-semibold">Encounter Duration:</span> {renderEditableValue({ path: ["patient", "encounter_duration"], label: "Encounter Duration", displayValue: data?.patient?.encounter_duration || empty })}</li>
            </ul>
            <div className="text-sm text-gray-700">
              <div className="font-semibold">Vitals</div>
              <div className="grid grid-cols-2 gap-2">
                <div>HR: {data?.patient?.vitals?.heart_rate || empty}</div>
                <div>RR: {data?.patient?.vitals?.respirations || empty}</div>
                <div>BP: {data?.patient?.vitals?.pressure?.top || empty}/{data?.patient?.vitals?.pressure?.bottom || empty}</div>
                <div>SpO2: {data?.patient?.vitals?.blood_oxygen || empty}</div>
                <div>Temp: {data?.patient?.vitals?.temp?.reading || empty} {tempUnit}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="font-semibold text-gray-900">SP Content</div>
            <div className="text-sm text-gray-700">
              <div className="font-semibold">Opening Statement</div>
              <p className="text-gray-800">{renderEditableValue({ path: ["sp", "opening_statement"], label: "Opening Statement", displayValue: data?.sp?.opening_statement || empty })}</p>
            </div>
            <div className="text-sm text-gray-700">
              <div className="font-semibold">Character Attributes</div>
              <div className="grid grid-cols-2 gap-2">
                {["anxiety", "suprise", "confusion", "guilt", "sadness", "indecision", "assertiveness", "frustration", "fear", "anger"].map((k) => (
                  <div key={k} className="flex items-center justify-between rounded border px-2 py-1">
                    <span className="capitalize">{k}</span>
                    <span className="text-sm font-semibold text-[#981e32]">
                      {renderEditableValue({
                        path: ["sp", "attributes", k],
                        label: k.charAt(0).toUpperCase() + k.slice(1),
                        displayValue: ratingLabel(data?.sp?.attributes?.[k]),
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Symptoms</div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><span className="font-semibold">Setting:</span> {renderEditableValue({ path: ["sp", "current_ill_history", "symptom_settings"], label: "Symptom Settings", displayValue: data?.sp?.current_ill_history?.symptom_settings || empty })}</li>
              <li><span className="font-semibold">Timing:</span> {renderEditableValue({ path: ["sp", "current_ill_history", "symptom_timing"], label: "Symptom Timing", displayValue: data?.sp?.current_ill_history?.symptom_timing || empty })}</li>
              <li><span className="font-semibold">Associated Symptoms:</span> {renderEditableValue({ path: ["sp", "current_ill_history", "associated_symptoms"], label: "Associated Symptoms", displayValue: data?.sp?.current_ill_history?.associated_symptoms || empty })}</li>
              <li><span className="font-semibold">Radiation:</span> {renderEditableValue({ path: ["sp", "current_ill_history", "radiation_of_symptoms"], label: "Radiation of Symptoms", displayValue: data?.sp?.current_ill_history?.radiation_of_symptoms || empty })}</li>
              <li><span className="font-semibold">Quality:</span> {renderEditableValue({ path: ["sp", "current_ill_history", "symptom_quality"], label: "Symptom Quality", displayValue: data?.sp?.current_ill_history?.symptom_quality || empty })}</li>
              <li><span className="font-semibold">Alleviating Factors:</span> {renderEditableValue({ path: ["sp", "current_ill_history", "alleviating_factors"], label: "Alleviating Factors", displayValue: data?.sp?.current_ill_history?.alleviating_factors || empty })}</li>
              <li><span className="font-semibold">Aggravating Factors:</span> {renderEditableValue({ path: ["sp", "current_ill_history", "aggravating_factors"], label: "Aggravating Factors", displayValue: data?.sp?.current_ill_history?.aggravating_factors || empty })}</li>
              <li><span className="font-semibold">Severity (0-10):</span> {renderEditableValue({ path: ["sp", "current_ill_history", "pain"], label: "Pain / Severity", displayValue: data?.sp?.current_ill_history?.pain ?? 0 })}</li>
            </ul>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Medications & Allergies</div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><span className="font-semibold">Medication:</span> {renderEditableValue({ path: ["med_hist", "medications", "name"], label: "Medication Name", displayValue: medCard?.name || empty })} {medCard?.dose ? `(${medCard.dose})` : ""}</li>
              <li><span className="font-semibold">Frequency:</span> {renderEditableValue({ path: ["med_hist", "medications", "frequency"], label: "Medication Frequency", displayValue: medCard?.frequency || empty })}</li>
              <li><span className="font-semibold">Reason:</span> {renderEditableValue({ path: ["med_hist", "medications", "reason"], label: "Medication Reason", displayValue: medCard?.reason || empty })}</li>
              <li><span className="font-semibold">Allergies:</span> {renderEditableValue({ path: ["med_hist", "allergies"], label: "Allergies", displayValue: data?.med_hist?.allergies || empty })}</li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Case Factors & Supplies</div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><span className="font-semibold">Special Supplies:</span> {renderEditableValue({ path: ["admin", "special_supplies"], label: "Special Supplies", displayValue: data?.admin?.special_supplies || empty })}</li>
              <li><span className="font-semibold">Case Factors:</span> {renderEditableValue({ path: ["admin", "case_factors"], label: "Case Factors", displayValue: data?.admin?.case_factors || empty })}</li>
              <li><span className="font-semibold">Patient Demographic:</span> {renderEditableValue({ path: ["admin", "patient_demographic"], label: "Patient Demographic", displayValue: data?.admin?.patient_demographic || empty })}</li>
            </ul>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Social History</div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><span className="font-semibold">Background:</span> {renderEditableValue({ path: ["med_hist", "social_hist", "personal_background"], label: "Personal Background", displayValue: data?.med_hist?.social_hist?.personal_background || empty })}</li>
              <li><span className="font-semibold">Nutrition/Exercise:</span> {renderEditableValue({ path: ["med_hist", "social_hist", "nutrion_and_exercise"], label: "Nutritional and Exercise History", displayValue: data?.med_hist?.social_hist?.nutrion_and_exercise || empty })}</li>
              <li><span className="font-semibold">Community/Employment:</span> {renderEditableValue({ path: ["med_hist", "social_hist", "community_and_employment"], label: "Community and Employment History", displayValue: data?.med_hist?.social_hist?.community_and_employment || empty })}</li>
              <li><span className="font-semibold">Safety Measures:</span> {renderEditableValue({ path: ["med_hist", "social_hist", "safety_measure"], label: "Safety Measures", displayValue: data?.med_hist?.social_hist?.safety_measure || empty })}</li>
              <li><span className="font-semibold">Life Stressors:</span> {renderEditableValue({ path: ["med_hist", "social_hist", "life_stressors"], label: "Significant Life Stressors", displayValue: data?.med_hist?.social_hist?.life_stressors || empty })}</li>
              <li><span className="font-semibold">Substance Use:</span> {renderEditableValue({ path: ["med_hist", "social_hist", "substance_use"], label: "Substance Use", displayValue: data?.med_hist?.social_hist?.substance_use || empty })}</li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-gray-900">Review of Systems</div>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              {[
                ["general", "General"],
                ["skin", "Skin"],
                ["heent", "HEENT"],
                ["neck", "Neck"],
                ["breast", "Breast"],
                ["respiratory", "Respiratory"],
                ["cardiovascular", "Cardiovascular"],
                ["gastrointestinal", "Gastrointestinal"],
                ["peripheral_vascular", "Peripheral Vascular"],
                ["musculoskeletal", "Musculoskeletal"],
                ["psychiatric", "Psychiatric"],
                ["neurologival", "Neurological"],
                ["endocine", "Endocrine"],
              ].map(([k, label]) => (
                <div key={k} className="rounded border px-2 py-1 bg-gray-50">
                  <div className="font-semibold text-gray-800">{label}</div>
                  <div>{data?.med_hist?.sympton_review?.[k] || empty}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-semibold text-gray-900">Prompts & Special Instructions</div>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><span className="font-semibold">Provoking Question:</span> {renderEditableValue({ path: ["special", "provoking_question"], label: "Provoking Question", displayValue: data?.special?.provoking_question || empty })}</li>
            <li><span className="font-semibold">Must Ask:</span> {renderEditableValue({ path: ["special", "must_ask"], label: "Must Ask", displayValue: data?.special?.must_ask || empty })}</li>
            <li><span className="font-semibold">Opportunity:</span> {renderEditableValue({ path: ["special", "oppurtunity"], label: "Opportunity", displayValue: data?.special?.oppurtunity || empty })}</li>
            <li><span className="font-semibold">Opening Statement:</span> {renderEditableValue({ path: ["special", "opening_statement"], label: "Opening Statement", displayValue: data?.special?.opening_statement || empty })}</li>
            <li><span className="font-semibold">Feedback Notes:</span> {renderEditableValue({ path: ["special", "feed_back"], label: "Feedback", displayValue: data?.special?.feed_back || empty })}</li>
          </ul>
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
        <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={printScriptPdf}>Print</button>
        <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={() => downloadScriptPdf(activeItem, current)}>Download PDF</button>
      </div>
    </div>
  );

  const resourceItems = [
    { __generatedMedicationCard: true, name: "Medication Card" },
    ...(Array.isArray(activeItem?.artifacts) ? activeItem.artifacts : []),
  ];

  if (isAdmin) {
    return (
      <section className="w-full p-4 space-y-4">
        {header}
        <div className="text-sm text-gray-600">{meta}</div>
        {canRequestInlineEdit ? (
          <div className="text-xs text-gray-500">Admin tip: double-click any value to edit that line.</div>
        ) : null}
        <ScriptHtmlView />

        <Modal open={artifactsOpen} title={`Resources for ${activeItem.id}`} onClose={() => setArtifactsOpen(false)}>
          <div className="space-y-2">
            {resourceItems.length ? (
              resourceItems.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between border rounded px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-[#981e32]">
                      {a?.__generatedMedicationCard ? "PDF" : getArtifactBadge(a)}
                    </span>
                    <span>{a?.__generatedMedicationCard ? "Medication Card" : getArtifactName(a)}</span>
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
          {resourceItems.length ? (
            resourceItems.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between border rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-[#981e32]">
                    {a?.__generatedMedicationCard ? "PDF" : getArtifactBadge(a)}
                  </span>
                  <span>{a?.__generatedMedicationCard ? "Medication Card" : getArtifactName(a)}</span>
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
      </Modal>
    </section>
  );
};

export default ScriptDetail;
