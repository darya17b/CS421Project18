import { useNavigate, useBeforeUnload } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { useToast } from "../components/Toast";
import { buildScriptFromForm } from "../utils/scriptFormat";
import hpiDiagram from "../assets/hpi-diagram.png";

const ratingOptions = [
  { label: "None (1)", value: 1 },
  { label: "Mild (2)", value: 2 },
  { label: "Moderate (3)", value: 3 },
  { label: "Concerning (4)", value: 4 },
  { label: "Severe (5)", value: 5 },
];

const emptyTextRow = () => ({ text: "" });
const emptyPrescriptionRow = () => ({
  brand_substance: "",
  amount: "",
  unit: "",
  frequency_reason: "",
});
const emptyNonPrescriptionRow = () => ({
  brand_substance: "",
  amount: "",
  unit: "",
  frequency_reason: "",
});

const emptyFamilyRow = () => ({
  family_member: "",
  details: "",
  additional_details: [emptyTextRow()],
});

const formatNonPrescriptionEntry = (entry) => {
  if (typeof entry === "string") return String(entry || "").trim();
  if (!entry || typeof entry !== "object") return "";
  const brand = String(entry.brand_substance || entry.brand || "").trim();
  const amount = String(entry.amount || "").trim();
  const unit = String(entry.unit || "").trim();
  const frequencyReason = String(entry.frequency_reason || entry.reason || "").trim();
  const amountWithUnit = amount && unit ? `${amount}${unit}` : amount || "";
  return [[brand, amountWithUnit].filter(Boolean).join(" "), frequencyReason]
    .filter(Boolean)
    .join(" - ")
    .trim();
};

const extractTextList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (!entry || typeof entry !== "object") return "";
        if (entry.text) return entry.text;
        if (entry.brand_substance || entry.amount || entry.unit || entry.frequency_reason) {
          return formatNonPrescriptionEntry(entry);
        }
        return "";
      })
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }
  const text = String(value || "").trim();
  return text ? [text] : [];
};

const toBulletedText = (value) => {
  const entries = extractTextList(value);
  return entries.length ? entries.map((entry) => `- ${entry}`).join("\n") : "";
};

const reviewOfSystemsFields = [
  ["general", "General"],
  ["skin", "Skin"],
  ["heent", "HEENT"],
  ["neck", "Neck"],
  ["breast", "Breast"],
  ["respiratory", "Respiratory"],
  ["cardiovascular", "Cardivascular"],
  ["gastrointestinal", "Gastrointestinal"],
  ["genitourinary", "Genitourinary"],
  ["peripheral_vascular", "Peripheral Vascular"],
  ["musculoskeletal", "Musculoskeletal"],
  ["psychiatric", "Psychiatric"],
  ["neurologival", "Neurological"],
  ["endocine", "Hematologic/Endocrine"],
];

const promptInstructionFields = [
  ["provoking_question", "Provoking questions - ask the question below"],
  ["must_ask", "Questions the patient MUST ask/ Statements patient must make"],
  ["oppurtunity", "Questions the patient will ask if given the opportunity"],
];

const toMultilineText = (value) => extractTextList(value).join("\n");

const buildSymptomReviewPayload = (symptomReview = {}) =>
  reviewOfSystemsFields.reduce((acc, [key]) => {
    acc[key] = toMultilineText(symptomReview?.[key]);
    return acc;
  }, {});

const buildScriptRequestPayload = (form = {}, draftScript = null, artifacts = []) => {
  const now = new Date().toISOString();
  return {
    reason_for_visit: form.admin?.reson_for_visit || form.patient?.visit_reason || "",
    simulation_modal: "Standardized Patient",
    case_setting: form.patient?.context || "",
    chief_concern: form.admin?.chief_concern || "",
    diagnosis: form.admin?.diagnosis || "",
    event: form.admin?.medical_event || "",
    pedagogy: form.admin?.learner_level || "",
    class: form.admin?.case_letter || form.admin?.class || "",
    learner_level: form.admin?.learner_level || "",
    summary_patient_story: form.admin?.summory_of_story || "",
    pert_aspects_patient_case: form.admin?.case_factors || "",
    physical_chars: form.sp?.physical_chars || "",
    student_expec: toBulletedText(form.admin?.student_expectations),
    spec_phyis_findings: form.sp?.current_ill_history?.symptom_quality || "",
    patient_demog: form.admin?.patient_demographic || "",
    special_needs: toMultilineText(form.special?.oppurtunity),
    case_factors: form.admin?.case_factors || "",
    additonal_ins: form.special?.feed_back || "",
    sympt_review: buildSymptomReviewPayload(form.med_hist?.sympton_review),
    status: "Pending",
    note: "",
    created_at: now,
    updated_at: now,
    draft_script: draftScript,
    artifacts,
  };
};

const RequestNew = () => {
  const navigate = useNavigate();
  const { createRequest } = useStore();
  const toast = useToast();
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isPart1Open, setIsPart1Open] = useState(true);
  const [isPart2Open, setIsPart2Open] = useState(false);
  const [isSpInfoOpen, setIsSpInfoOpen] = useState(false);
  const [isMedAllergiesOpen, setIsMedAllergiesOpen] = useState(false);
  const [isPmhOpen, setIsPmhOpen] = useState(false);
  const [isFamilyHistoryOpen, setIsFamilyHistoryOpen] = useState(false);
  const [isSocialHistoryOpen, setIsSocialHistoryOpen] = useState(false);
  const [isReviewSystemsOpen, setIsReviewSystemsOpen] = useState(false);
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);
  const bypassNavigationRef = useRef(false);
  const diagramImageRef = useRef(null);
  const initialForm = {
    admin: {
      reson_for_visit: "",
      chief_concern: "",
      diagnosis: "",
      case_letter: "",
      class: "",
      medical_event: "",
      learner_level: "",
      academic_year: "",
      case_authors: "",
      author: "",
      summory_of_story: "",
      student_expectations: [emptyTextRow()],
      patient_demographic: "",
      special_supplies: "",
      case_factors: "",
    },
    patient: {
      name: "",
      date_of_birth: "",
      vitals: {
        heart_rate: "",
        respirations: "",
        pressure: { top: "", bottom: "" },
        blood_oxygen: "",
        temp: { reading: "", unit: "" },
      },
      visit_reason: "",
      context: "",
      task: "",
      encounter_duration: "",
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
        symptom_settings: "",
        symptom_timing: "",
        associated_symptoms: "",
        radiation_of_symptoms: "",
        symptom_quality: "",
        alleviating_factors: "",
        aggravating_factors: "",
        pain: "",
        symptom_diagram: [],
      },
    },
    med_hist: {
      medications: [emptyPrescriptionRow()],
      non_prescription_medications: [emptyNonPrescriptionRow()],
      allergies: [emptyTextRow()],
      past_med_his: {
        child_hood_illness: [emptyTextRow()],
        illness_and_hospital: [emptyTextRow()],
        surgeries: [emptyTextRow()],
        obe_and_gye: [emptyTextRow()],
        transfusion: [emptyTextRow()],
        psychiatric: [emptyTextRow()],
        trauma: [emptyTextRow()],
      },
      preventative_measure: {
        immunization: [emptyTextRow()],
        alternate_health_care: [emptyTextRow()],
        travel_exposure: [emptyTextRow()],
        screening_tests: [emptyTextRow()],
      },
      family_hist: [emptyFamilyRow()],
      social_hist: {
        personal_background: "",
        nutrion_and_exercise: "",
        community_and_employment: "",
        safety_measure: "",
        life_stressors: "",
        substance_use: [emptyTextRow()],
        sexual_history_entries: [emptyTextRow()],
        sex_history: {
          current_partners: "",
          past_partners: "",
          contraceptives: "",
          hiv_risk_history: "",
          safety_in_relations: "",
        },
      },
      sympton_review: {
        general: [emptyTextRow()],
        skin: [emptyTextRow()],
        heent: [emptyTextRow()],
        neck: [emptyTextRow()],
        breast: [emptyTextRow()],
        respiratory: [emptyTextRow()],
        cardiovascular: [emptyTextRow()],
        gastrointestinal: [emptyTextRow()],
        peripheral_vascular: [emptyTextRow()],
        musculoskeletal: [emptyTextRow()],
        psychiatric: [emptyTextRow()],
        neurologival: [emptyTextRow()],
        endocine: [emptyTextRow()],
        genitourinary: [emptyTextRow()],
      },
    },
    special: {
      provoking_question: [emptyTextRow()],
      must_ask: [emptyTextRow()],
      oppurtunity: [emptyTextRow()],
      opening_statement: "",
      feed_back: "",
    },
  };

  const [form, setForm] = useState(initialForm);
  const initialSnapshotRef = useRef(JSON.stringify(initialForm));

  const hasUnsavedChanges = useMemo(
    () => attachments.length > 0 || JSON.stringify(form) !== initialSnapshotRef.current,
    [attachments, form]
  );
  const shouldWarnOnLeave = hasUnsavedChanges && !submitting && !bypassNavigationRef.current;

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!shouldWarnOnLeave) return;
        event.preventDefault();
        event.returnValue = "";
      },
      [shouldWarnOnLeave]
    )
  );

  useEffect(() => {
    if (!shouldWarnOnLeave) return;
    const onDocumentClickCapture = (event) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(anchor.href, currentUrl.href);
      if (nextUrl.origin !== currentUrl.origin) return;
      const currentPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (currentPath === nextPath) return;
      const ok = window.confirm("You have unsaved changes. Leave this page?");
      if (!ok) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", onDocumentClickCapture, true);
    return () => document.removeEventListener("click", onDocumentClickCapture, true);
  }, [shouldWarnOnLeave]);

  function setDeep(obj, path, value) {
    const copy = JSON.parse(JSON.stringify(obj));
    let cur = copy;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (cur[key] == null || typeof cur[key] !== "object") cur[key] = {};
      cur = cur[key];
    }
    cur[path[path.length - 1]] = value;
    return copy;
  }

  const setField = (path, value) => setForm((prev) => setDeep(prev, path, value));
  const setNumberField = (path, value) => setForm((prev) => setDeep(prev, path, value === "" ? "" : Number(value)));
  const getField = (path) => path.reduce((acc, k) => (acc ? acc[k] : undefined), form);
  const getList = (path, fallbackFactory) => {
    const current = getField(path);
    if (Array.isArray(current) && current.length) return current;
    if (typeof current === "string" && current.trim()) return [{ text: current.trim() }];
    if (current && typeof current === "object" && typeof current.text === "string" && current.text.trim()) {
      return [{ text: current.text.trim() }];
    }
    return [fallbackFactory()];
  };
  const addListRow = (path, newRowFactory) => {
    const current = getList(path, newRowFactory);
    setField(path, [...current, newRowFactory()]);
  };
  const removeListRow = (path, index, fallbackFactory) => {
    const current = getList(path, fallbackFactory);
    const next = current.filter((_, idx) => idx !== index);
    setField(path, next.length ? next : [fallbackFactory()]);
  };
  const updateListRowText = (path, index, value, fallbackFactory) => {
    const current = getList(path, fallbackFactory);
    const next = current.map((entry, idx) => (
      idx === index
        ? (typeof entry === "string" ? value : { ...(entry || {}), text: value })
        : entry
    ));
    setField(path, next);
  };
  const updateListRowField = (path, index, key, value, fallbackFactory) => {
    const current = getList(path, fallbackFactory);
    const next = current.map((entry, idx) => (
      idx === index
        ? { ...(entry && typeof entry === "object" ? entry : {}), [key]: value }
        : entry
    ));
    setField(path, next);
  };
  const updateFamilyHistoryRow = (index, key, value) => {
    const current = getList(["med_hist", "family_hist"], emptyFamilyRow);
    const next = current.map((entry, idx) => (
      idx === index
        ? { ...(entry || {}), [key]: value }
        : entry
    ));
    setField(["med_hist", "family_hist"], next);
  };
  const updateFamilyAdditionalDetail = (memberIndex, detailIndex, value) => {
    const current = getList(["med_hist", "family_hist"], emptyFamilyRow);
    const next = current.map((entry, idx) => {
      if (idx !== memberIndex) return entry;
      const details = Array.isArray(entry?.additional_details) && entry.additional_details.length
        ? entry.additional_details
        : [emptyTextRow()];
      const updated = details.map((detail, dIdx) => (
        dIdx === detailIndex ? { ...(detail || {}), text: value } : detail
      ));
      return { ...(entry || {}), additional_details: updated };
    });
    setField(["med_hist", "family_hist"], next);
  };
  const addFamilyAdditionalDetail = (memberIndex) => {
    const current = getList(["med_hist", "family_hist"], emptyFamilyRow);
    const next = current.map((entry, idx) => {
      if (idx !== memberIndex) return entry;
      const details = Array.isArray(entry?.additional_details) && entry.additional_details.length
        ? entry.additional_details
        : [emptyTextRow()];
      return { ...(entry || {}), additional_details: [...details, emptyTextRow()] };
    });
    setField(["med_hist", "family_hist"], next);
  };
  const removeFamilyAdditionalDetail = (memberIndex, detailIndex) => {
    const current = getList(["med_hist", "family_hist"], emptyFamilyRow);
    const next = current.map((entry, idx) => {
      if (idx !== memberIndex) return entry;
      const details = Array.isArray(entry?.additional_details) && entry.additional_details.length
        ? entry.additional_details
        : [emptyTextRow()];
      const filtered = details.filter((_, dIdx) => dIdx !== detailIndex);
      return { ...(entry || {}), additional_details: filtered.length ? filtered : [emptyTextRow()] };
    });
    setField(["med_hist", "family_hist"], next);
  };

  const inputClass = "w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400";
  const textAreaClass = "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400";
  const sectionLabelClass = "text-sm font-semibold text-gray-800";

  const addAttachments = (files) => {
    const next = [];
    const errors = [];
    files.forEach((file) => {
      const ext = String(file?.name || "").toLowerCase();
      const type = String(file?.type || "").toLowerCase();
      const isAllowedType = ["application/pdf", "image/png", "image/jpeg"].includes(type)
        || ext.endsWith(".pdf") || ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg");
      if (!isAllowedType) {
        errors.push(`${file.name} is not a supported file type.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name} exceeds the 5MB limit.`);
        return;
      }
      next.push(file);
    });
    if (errors.length) {
      toast.show(errors[0], { type: "error" });
    }
    if (next.length) {
      setAttachments((prev) => [...prev, ...next]);
    }
  };

  const onFilesSelected = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) addAttachments(files);
    event.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const rawDiagramMarkers = getField(["sp", "current_ill_history", "symptom_diagram"]);
  const diagramMarkers = (Array.isArray(rawDiagramMarkers) ? rawDiagramMarkers : [rawDiagramMarkers])
    .map((m) => (m && Number.isFinite(Number(m.x)) && Number.isFinite(Number(m.y))
      ? { x: Number(m.x), y: Number(m.y) }
      : null))
    .filter(Boolean);
  const hasDiagramMarker = diagramMarkers.length > 0;

  const placeDiagramHeart = (event) => {
    const target = diagramImageRef.current || event.currentTarget;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const rawX = (event.clientX - rect.left) / rect.width;
    const rawY = (event.clientY - rect.top) / rect.height;
    const x = Math.max(0, Math.min(1, rawX));
    const y = Math.max(0, Math.min(1, rawY));
    const next = [...diagramMarkers, { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) }];
    setField(["sp", "current_ill_history", "symptom_diagram"], next);
  };

  const clearDiagramHeart = () => {
    setField(["sp", "current_ill_history", "symptom_diagram"], []);
  };

  const removeLastDiagramHeart = () => {
    if (!diagramMarkers.length) return;
    setField(["sp", "current_ill_history", "symptom_diagram"], diagramMarkers.slice(0, -1));
  };

  const uploadAttachments = async (draftScript = null) => {
    const filesToUpload = [...attachments];
    if (draftScript) {
      try {
        const { createDoorNotePdfFile } = await import("../utils/pdf");
        const doorNoteFile = createDoorNotePdfFile(draftScript);
        if (doorNoteFile) filesToUpload.push(doorNoteFile);
      } catch (err) {
        console.warn("Failed to generate door note attachment", err);
      }
    }
    if (!filesToUpload.length) return [];
    const { api } = await import("../api/client");
    const uploaded = [];
    for (const file of filesToUpload) {
      try {
        const res = await api.uploadArtifact(file);
        uploaded.push(res);
      } catch (err) {
        console.warn("Failed to upload attachment", file?.name || "attachment", err);
      }
    }
    return uploaded;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    bypassNavigationRef.current = false;
    setSubmitting(true);
    let uploadedArtifacts = [];

    try {
      const script = buildScriptFromForm(form);
      uploadedArtifacts = await uploadAttachments(script);
      if (uploadedArtifacts.length) {
        script.artifacts = uploadedArtifacts;
      }
      const requestPayload = buildScriptRequestPayload(form, script, uploadedArtifacts);
      if (typeof createRequest !== "function") {
        throw new Error("Request submission is not configured");
      }
      await createRequest(requestPayload);
      toast.show("Request submitted", { type: "success" });
      initialSnapshotRef.current = JSON.stringify(form);
      bypassNavigationRef.current = true;
      navigate("/dashboard");
    } catch (err) {
      bypassNavigationRef.current = false;
      try {
        const { api } = await import("../api/client");
        await Promise.all(
          uploadedArtifacts.map((a) => (a?.id ? api.deleteArtifact(a.id) : null))
        );
      } catch {
      }
      const errorDetail = String(err?.message || "").trim();
      const message = errorDetail ? `Creation failed: ${errorDetail}` : "Creation failed";
      toast.show(message, { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const onFormKeyDown = (event) => {
    if (event.key !== "Enter") return;
    const tag = event.target?.tagName?.toLowerCase?.() || "";
    if (tag === "textarea") return;
    event.preventDefault();
  };

  return (
    <section className="w-full px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-semibold">Script Request</h2>
          <p className="text-sm text-gray-600">Single-column request form for standardized patient scripts.</p>
        </div>

        <form onSubmit={onSubmit} onKeyDown={onFormKeyDown} className="space-y-6 text-left">
          <div className="rounded-2xl border border-gray-300 bg-white shadow-sm p-6 space-y-8">
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <button
                type="button"
                onClick={() => setIsPart1Open((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900">Part 1 - Administrative Details</span>
                <span className="text-base font-semibold text-gray-700">{isPart1Open ? "(-)" : "(+)"}</span>
              </button>
              {isPart1Open ? (
                <div className="space-y-4">
                  <div className={sectionLabelClass}>Professional</div>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Reason for Visit</span>
                    <input className={inputClass} value={getField(["admin", "reson_for_visit"]) || ""} onChange={(e) => setField(["admin", "reson_for_visit"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Chief Concern</span>
                    <input className={inputClass} value={getField(["admin", "chief_concern"]) || ""} onChange={(e) => setField(["admin", "chief_concern"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Diagnosis</span>
                    <input className={inputClass} value={getField(["admin", "diagnosis"]) || ""} onChange={(e) => setField(["admin", "diagnosis"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Case Letter</span>
                    <input className={inputClass} value={getField(["admin", "case_letter"]) || ""} onChange={(e) => setField(["admin", "case_letter"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Event Format</span>
                    <input className={inputClass} value={getField(["admin", "medical_event"]) || ""} onChange={(e) => setField(["admin", "medical_event"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Learner Level</span>
                    <input className={inputClass} value={getField(["admin", "learner_level"]) || ""} onChange={(e) => setField(["admin", "learner_level"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Level of the learner and discipline</span>
                    <input className={inputClass} value={getField(["admin", "academic_year"]) || ""} onChange={(e) => setField(["admin", "academic_year"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Case Authors</span>
                    <input className={inputClass} value={getField(["admin", "case_authors"]) || ""} onChange={(e) => setField(["admin", "case_authors"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Summary of Patient Story</span>
                    <textarea rows={3} className={textAreaClass} value={getField(["admin", "summory_of_story"]) || ""} onChange={(e) => setField(["admin", "summory_of_story"], e.target.value)} />
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Student Expectations</span>
                      <button
                        type="button"
                        onClick={() => addListRow(["admin", "student_expectations"], emptyTextRow)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                      >
                        + Add bullet
                      </button>
                    </div>
                    {getList(["admin", "student_expectations"], emptyTextRow).map((entry, idx) => (
                      <div key={`student-expectation-${idx}`} className="flex items-center gap-2">
                        <span className="text-gray-600">-</span>
                        <input
                          className={inputClass}
                          placeholder="Expectation"
                          value={String(entry?.text || "")}
                          onChange={(e) => updateListRowText(["admin", "student_expectations"], idx, e.target.value, emptyTextRow)}
                        />
                        <button
                          type="button"
                          onClick={() => removeListRow(["admin", "student_expectations"], idx, emptyTextRow)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Patient Demographic</span>
                    <input className={inputClass} value={getField(["admin", "patient_demographic"]) || ""} onChange={(e) => setField(["admin", "patient_demographic"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Special Supplies</span>
                    <input className={inputClass} value={getField(["admin", "special_supplies"]) || ""} onChange={(e) => setField(["admin", "special_supplies"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Case Factors</span>
                    <textarea rows={2} className={textAreaClass} value={getField(["admin", "case_factors"]) || ""} onChange={(e) => setField(["admin", "case_factors"], e.target.value)} />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <button
                type="button"
                onClick={() => setIsPart2Open((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900">Part 2 - Door Chart/Note and Learner Instruction</span>
                <span className="text-base font-semibold text-gray-700">{isPart2Open ? "(-)" : "(+)"}</span>
              </button>
              {isPart2Open ? (
                <div className="space-y-4">
                  <div className={sectionLabelClass}>Patient</div>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Name</span>
                    <input className={inputClass} value={getField(["patient", "name"]) || ""} onChange={(e) => setField(["patient", "name"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Date of Birth</span>
                    <input className={inputClass} value={getField(["patient", "date_of_birth"]) || ""} onChange={(e) => setField(["patient", "date_of_birth"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Visit Reason</span>
                    <input className={inputClass} value={getField(["patient", "visit_reason"]) || ""} onChange={(e) => setField(["patient", "visit_reason"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Context</span>
                    <input className={inputClass} value={getField(["patient", "context"]) || ""} onChange={(e) => setField(["patient", "context"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Task</span>
                    <input className={inputClass} value={getField(["patient", "task"]) || ""} onChange={(e) => setField(["patient", "task"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Patient Encounter Duration</span>
                    <input className={inputClass} value={getField(["patient", "encounter_duration"]) || ""} onChange={(e) => setField(["patient", "encounter_duration"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Heart Rate (beats/min)</span>
                    <input type="number" className={inputClass} value={getField(["patient", "vitals", "heart_rate"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "heart_rate"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Respirations (breaths/min)</span>
                    <input type="number" className={inputClass} value={getField(["patient", "vitals", "respirations"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "respirations"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Blood Oxygen (%)</span>
                    <input type="number" className={inputClass} value={getField(["patient", "vitals", "blood_oxygen"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "blood_oxygen"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Pressure Top (mmHg)</span>
                    <input type="number" className={inputClass} value={getField(["patient", "vitals", "pressure", "top"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "pressure", "top"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Pressure Bottom (mmHg)</span>
                    <input type="number" className={inputClass} value={getField(["patient", "vitals", "pressure", "bottom"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "pressure", "bottom"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Temperature Reading</span>
                    <input type="number" className={inputClass} value={getField(["patient", "vitals", "temp", "reading"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "temp", "reading"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Temperature Unit</span>
                    <select className={`${inputClass} pr-8`} value={getField(["patient", "vitals", "temp", "unit"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "temp", "unit"], e.target.value)}>
                      <option value="">Select unit</option>
                      <option value="0">Celcius</option>
                      <option value="1">Fahrenheit</option>
                    </select>
                  </label>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <button
                type="button"
                onClick={() => setIsSpInfoOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900">SP Info</span>
                <span className="text-base font-semibold text-gray-700">{isSpInfoOpen ? "(-)" : "(+)"}</span>
              </button>
              {isSpInfoOpen ? (
                <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Opening Statement</span>
                <textarea rows={2} className={textAreaClass} value={getField(["sp", "opening_statement"]) || ""} onChange={(e) => setField(["sp", "opening_statement"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Physical Characteristics</span>
                <textarea rows={2} className={textAreaClass} value={getField(["sp", "physical_chars"]) || ""} onChange={(e) => setField(["sp", "physical_chars"], e.target.value)} />
              </label>
              <div className="space-y-2">
                <div className="text-sm text-gray-700">Symptom Location Diagram (click to place heart)</div>
                <div className="inline-block rounded border border-gray-300 bg-white p-2">
                  <div className="relative inline-block">
                    <img
                      ref={diagramImageRef}
                      src={hpiDiagram}
                      alt="Human outline symptom diagram"
                      onClick={placeDiagramHeart}
                      className="block w-56 h-auto select-none cursor-crosshair"
                      draggable="false"
                    />
                    {diagramMarkers.map((marker, idx) => (
                      <span
                        key={`diagram-marker-${idx}`}
                        className="absolute text-red-600 text-xl leading-none pointer-events-none -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
                      >
                        {"\u2665"}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={removeLastDiagramHeart}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                  >
                    Undo last
                  </button>
                  <button
                    type="button"
                    onClick={clearDiagramHeart}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                  >
                    Clear all
                  </button>
                  <span className="text-xs text-gray-500">
                    {hasDiagramMarker
                      ? `${diagramMarkers.length} marker${diagramMarkers.length === 1 ? "" : "s"} set`
                      : "No markers set"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["anxiety", "suprise", "confusion", "guilt", "sadness", "indecision", "assertiveness", "frustration", "fear", "anger"].map((k) => (
                  <label key={k} className="block space-y-1">
                    <span className="text-sm text-gray-700">{k[0].toUpperCase() + k.slice(1)}</span>
                    <select className={`${inputClass} pr-8`} value={Number(getField(["sp", "attributes", k]) || 1)} onChange={(e) => setNumberField(["sp", "attributes", k], e.target.value)}>
                      {ratingOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className={sectionLabelClass}>History of Present Illness (HPI)</div>
              {[
                ["symptom_settings", "Setting in Which Symptom(s) Occur"],
                ["symptom_timing", "Timing of Symptom(s)"],
                ["associated_symptoms", "Associated Symptoms"],
                ["radiation_of_symptoms", "Radiation of Symptom(s)"],
                ["alleviating_factors", "Alleviating Factors of Symptom(s)"],
                ["aggravating_factors", "Aggravating Factors of Symptom(s)"],
              ].map(([k, label]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input className={inputClass} value={getField(["sp", "current_ill_history", k]) || ""} onChange={(e) => setField(["sp", "current_ill_history", k], e.target.value)} />
                </label>
              ))}
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Severity/Quality of Symptom(s)</span>
                <input
                  className={inputClass}
                  value={getField(["sp", "current_ill_history", "symptom_quality"]) || ""}
                  onChange={(e) => setField(["sp", "current_ill_history", "symptom_quality"], e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Pain Severity</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="1"
                    className={`${inputClass} max-w-[120px]`}
                    value={getField(["sp", "current_ill_history", "pain"]) ?? ""}
                    onChange={(e) => setNumberField(["sp", "current_ill_history", "pain"], e.target.value)}
                  />
                  <span className="text-sm text-gray-700">/10</span>
                </div>
              </label>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <button
                type="button"
                onClick={() => setIsMedAllergiesOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900">Medication and Allergies</span>
                <span className="text-base font-semibold text-gray-700">{isMedAllergiesOpen ? "(-)" : "(+)"}</span>
              </button>
              {isMedAllergiesOpen ? (
                <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Medications</span>
                  <button
                    type="button"
                    onClick={() => addListRow(["med_hist", "medications"], emptyPrescriptionRow)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                  >
                    + Medication
                  </button>
                </div>
                {getList(["med_hist", "medications"], emptyPrescriptionRow).map((entry, idx) => (
                  <div key={`rx-med-${idx}`} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">Medication {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeListRow(["med_hist", "medications"], idx, emptyPrescriptionRow)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-sm text-gray-700">Brand/Substance</span>
                      <input
                        className={inputClass}
                        placeholder="Acetaminophen"
                        value={String(entry?.brand_substance || "")}
                        onChange={(e) => updateListRowField(["med_hist", "medications"], idx, "brand_substance", e.target.value, emptyPrescriptionRow)}
                      />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Amount</span>
                        <input
                          className={inputClass}
                          placeholder="500"
                          value={String(entry?.amount || "")}
                          onChange={(e) => updateListRowField(["med_hist", "medications"], idx, "amount", e.target.value, emptyPrescriptionRow)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Select Unit</span>
                        <select
                          className={`${inputClass} pr-8`}
                          value={String(entry?.unit || "")}
                          onChange={(e) => updateListRowField(["med_hist", "medications"], idx, "unit", e.target.value, emptyPrescriptionRow)}
                        >
                          <option value="">Select unit</option>
                          <option value="mg">mg</option>
                          <option value="g">g</option>
                          <option value="mcg">mcg</option>
                          <option value="units">units</option>
                          <option value="tablets">tablets</option>
                          <option value="capsules">capsules</option>
                          <option value="mL">mL</option>
                          <option value="drops">drops</option>
                        </select>
                      </label>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-sm text-gray-700">Frequency + Reason</span>
                      <input
                        className={inputClass}
                        placeholder="Take one or two tablets as needed for headache"
                        value={String(entry?.frequency_reason || "")}
                        onChange={(e) => updateListRowField(["med_hist", "medications"], idx, "frequency_reason", e.target.value, emptyPrescriptionRow)}
                      />
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Non-prescription Medications</span>
                  <button
                    type="button"
                    onClick={() => addListRow(["med_hist", "non_prescription_medications"], emptyNonPrescriptionRow)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                  >
                    + Non-prescription
                  </button>
                </div>
                {getList(["med_hist", "non_prescription_medications"], emptyNonPrescriptionRow).map((entry, idx) => (
                  <div key={`otc-med-${idx}`} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">Non-Rx {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeListRow(["med_hist", "non_prescription_medications"], idx, emptyNonPrescriptionRow)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-sm text-gray-700">Brand/Substance</span>
                      <input
                        className={inputClass}
                        placeholder="Acetaminophen"
                        value={String(entry?.brand_substance || "")}
                        onChange={(e) => updateListRowField(["med_hist", "non_prescription_medications"], idx, "brand_substance", e.target.value, emptyNonPrescriptionRow)}
                      />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Amount</span>
                        <input
                          className={inputClass}
                          placeholder="500"
                          value={String(entry?.amount || "")}
                          onChange={(e) => updateListRowField(["med_hist", "non_prescription_medications"], idx, "amount", e.target.value, emptyNonPrescriptionRow)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Select Unit</span>
                        <select
                          className={`${inputClass} pr-8`}
                          value={String(entry?.unit || "")}
                          onChange={(e) => updateListRowField(["med_hist", "non_prescription_medications"], idx, "unit", e.target.value, emptyNonPrescriptionRow)}
                        >
                          <option value="">Select unit</option>
                          <option value="mg">mg</option>
                          <option value="g">g</option>
                          <option value="mcg">mcg</option>
                          <option value="units">units</option>
                          <option value="tablets">tablets</option>
                          <option value="capsules">capsules</option>
                          <option value="mL">mL</option>
                          <option value="drops">drops</option>
                        </select>
                      </label>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-sm text-gray-700">Frequency + Reason</span>
                      <input
                        className={inputClass}
                        placeholder="Take one or two tablets as needed for headache"
                        value={String(entry?.frequency_reason || "")}
                        onChange={(e) => updateListRowField(["med_hist", "non_prescription_medications"], idx, "frequency_reason", e.target.value, emptyNonPrescriptionRow)}
                      />
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Allergies</span>
                  <button
                    type="button"
                    onClick={() => addListRow(["med_hist", "allergies"], emptyTextRow)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                  >
                    + Allergy
                  </button>
                </div>
                {getList(["med_hist", "allergies"], emptyTextRow).map((entry, idx) => (
                  <div key={`allergy-${idx}`} className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">Allergy {idx + 1}</span>
                    <input
                      className={inputClass}
                      placeholder="Penicillin: rash"
                      value={String(entry?.text || "")}
                      onChange={(e) => updateListRowText(["med_hist", "allergies"], idx, e.target.value, emptyTextRow)}
                    />
                    <button
                      type="button"
                      onClick={() => removeListRow(["med_hist", "allergies"], idx, emptyTextRow)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <button
                type="button"
                onClick={() => setIsPmhOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900">PMH</span>
                <span className="text-base font-semibold text-gray-700">{isPmhOpen ? "(-)" : "(+)"}</span>
              </button>
              {isPmhOpen ? (
                <div className="space-y-4">
              <div className={sectionLabelClass}>Past Medical History (PMH)</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Childhood Illnesses</span>
                  <button
                    type="button"
                    onClick={() => addListRow(["med_hist", "past_med_his", "child_hood_illness"], emptyTextRow)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                  >
                    + Line
                  </button>
                </div>
                {getList(["med_hist", "past_med_his", "child_hood_illness"], emptyTextRow).map((entry, idx) => (
                  <div key={`pmh-childhood-${idx}`} className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      value={String(entry?.text || "")}
                      onChange={(e) => updateListRowText(["med_hist", "past_med_his", "child_hood_illness"], idx, e.target.value, emptyTextRow)}
                    />
                    <button
                      type="button"
                      onClick={() => removeListRow(["med_hist", "past_med_his", "child_hood_illness"], idx, emptyTextRow)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Medical Illnesses and Hospitalizations</span>
                  <button
                    type="button"
                    onClick={() => addListRow(["med_hist", "past_med_his", "illness_and_hospital"], emptyTextRow)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                  >
                    + Line
                  </button>
                </div>
                {getList(["med_hist", "past_med_his", "illness_and_hospital"], emptyTextRow).map((entry, idx) => (
                  <div key={`pmh-hospital-${idx}`} className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      value={String(entry?.text || "")}
                      onChange={(e) => updateListRowText(["med_hist", "past_med_his", "illness_and_hospital"], idx, e.target.value, emptyTextRow)}
                    />
                    <button
                      type="button"
                      onClick={() => removeListRow(["med_hist", "past_med_his", "illness_and_hospital"], idx, emptyTextRow)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {[
                ["surgeries", "Surgeries"],
                ["obe_and_gye", "Obstetric/Gynecologic"],
                ["transfusion", "Transfusion History"],
                ["psychiatric", "Psychiatric History"],
                ["trauma", "Trauma"],
              ].map(([k, label]) => (
                <div key={k} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <button
                      type="button"
                      onClick={() => addListRow(["med_hist", "past_med_his", k], emptyTextRow)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                    >
                      + Line
                    </button>
                  </div>
                  {getList(["med_hist", "past_med_his", k], emptyTextRow).map((entry, idx) => (
                    <div key={`pmh-${k}-${idx}`} className="flex items-center gap-2">
                      <input
                        className={inputClass}
                        value={String(entry?.text || "")}
                        onChange={(e) => updateListRowText(["med_hist", "past_med_his", k], idx, e.target.value, emptyTextRow)}
                      />
                      <button
                        type="button"
                        onClick={() => removeListRow(["med_hist", "past_med_his", k], idx, emptyTextRow)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              <div className={sectionLabelClass}>Preventative Medicine</div>
              {[
                ["immunization", "Immunizations"],
                ["screening_tests", "Screening Tests"],
                ["alternate_health_care", "Alternative/Complimentary Health Care"],
                ["travel_exposure", "Travel/Exposure History"],
              ].map(([k, label]) => (
                <div key={k} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <button
                      type="button"
                      onClick={() => addListRow(["med_hist", "preventative_measure", k], emptyTextRow)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                    >
                      + Line
                    </button>
                  </div>
                  {getList(["med_hist", "preventative_measure", k], emptyTextRow).map((entry, idx) => (
                    <div key={`preventative-${k}-${idx}`} className="flex items-center gap-2">
                      <input
                        className={inputClass}
                        value={String(entry?.text || "")}
                        onChange={(e) => updateListRowText(["med_hist", "preventative_measure", k], idx, e.target.value, emptyTextRow)}
                      />
                      <button
                        type="button"
                        onClick={() => removeListRow(["med_hist", "preventative_measure", k], idx, emptyTextRow)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <button
                type="button"
                onClick={() => setIsFamilyHistoryOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900">Family Medical History</span>
                <span className="text-base font-semibold text-gray-700">{isFamilyHistoryOpen ? "(-)" : "(+)"}</span>
              </button>
              {isFamilyHistoryOpen ? (
                <div className="space-y-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={sectionLabelClass}>Family Medical History</span>
                  <button
                    type="button"
                    onClick={() => addListRow(["med_hist", "family_hist"], emptyFamilyRow)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                  >
                    + Family member
                  </button>
                </div>
                <div className="text-xs text-gray-500">Family Tree (e.g. health status, age, cause of death for appropriate family members)</div>
                {getList(["med_hist", "family_hist"], emptyFamilyRow).map((entry, idx) => (
                  <div key={`family-history-${idx}`} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">Member {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeListRow(["med_hist", "family_hist"], idx, emptyFamilyRow)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-sm text-gray-700">Family Member</span>
                      <input
                        className={inputClass}
                        placeholder="Father, Mother, Sister, Brother..."
                        value={String(entry?.family_member || "")}
                        onChange={(e) => updateFamilyHistoryRow(idx, "family_member", e.target.value)}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm text-gray-700">Health Details</span>
                      <input
                        className={inputClass}
                        placeholder="Coronary Artery Disease, Atrial Fibrillation, high blood pressure"
                        value={String(entry?.details || "")}
                        onChange={(e) => updateFamilyHistoryRow(idx, "details", e.target.value)}
                      />
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Additional Details (optional)</span>
                        <button
                          type="button"
                          onClick={() => addFamilyAdditionalDetail(idx)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                        >
                          + Detail
                        </button>
                      </div>
                      {(Array.isArray(entry?.additional_details) && entry.additional_details.length
                        ? entry.additional_details
                        : [emptyTextRow()]).map((detail, detailIdx) => (
                        <div key={`family-detail-${idx}-${detailIdx}`} className="flex items-center gap-2">
                          <input
                            className={inputClass}
                            placeholder="Your dad quit smoking 5 years ago. He had smoked since he was a teen."
                            value={String(detail?.text || "")}
                            onChange={(e) => updateFamilyAdditionalDetail(idx, detailIdx, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeFamilyAdditionalDetail(idx, detailIdx)}
                            className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <button
                type="button"
                onClick={() => setIsSocialHistoryOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900">Social History</span>
                <span className="text-base font-semibold text-gray-700">{isSocialHistoryOpen ? "(-)" : "(+)"}</span>
              </button>
              {isSocialHistoryOpen ? (
                <div className="space-y-4">
              <div className={sectionLabelClass}>Social History</div>
              {[
                ["personal_background", "Personal Background"],
                ["nutrion_and_exercise", "Nutritional and Excercise History"],
                ["community_and_employment", "Military, Community, Educational & Employment History"],
                ["safety_measure", "Safety Measures"],
                ["life_stressors", "Significant Life Stressors"],
              ].map(([k, label]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-sm text-gray-700">{label}</span>
                  <textarea rows={3} className={textAreaClass} value={getField(["med_hist", "social_hist", k]) || ""} onChange={(e) => setField(["med_hist", "social_hist", k], e.target.value)} />
                </label>
              ))}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Substance Abuse</span>
                  <button
                    type="button"
                    onClick={() => addListRow(["med_hist", "social_hist", "substance_use"], emptyTextRow)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                  >
                    + Line
                  </button>
                </div>
                {getList(["med_hist", "social_hist", "substance_use"], emptyTextRow).map((entry, idx) => (
                  <div key={`substance-abuse-${idx}`} className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      value={String(entry?.text || "")}
                      onChange={(e) => updateListRowText(["med_hist", "social_hist", "substance_use"], idx, e.target.value, emptyTextRow)}
                    />
                    <button
                      type="button"
                      onClick={() => removeListRow(["med_hist", "social_hist", "substance_use"], idx, emptyTextRow)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Sexual History</span>
                  <button
                    type="button"
                    onClick={() => addListRow(["med_hist", "social_hist", "sexual_history_entries"], emptyTextRow)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                  >
                    + Line
                  </button>
                </div>
                {getList(["med_hist", "social_hist", "sexual_history_entries"], emptyTextRow).map((entry, idx) => (
                  <div key={`sexual-history-${idx}`} className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      value={String(entry?.text || "")}
                      onChange={(e) => updateListRowText(["med_hist", "social_hist", "sexual_history_entries"], idx, e.target.value, emptyTextRow)}
                    />
                    <button
                      type="button"
                      onClick={() => removeListRow(["med_hist", "social_hist", "sexual_history_entries"], idx, emptyTextRow)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <button
                type="button"
                onClick={() => setIsReviewSystemsOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900">Review of Systems</span>
                <span className="text-base font-semibold text-gray-700">{isReviewSystemsOpen ? "(-)" : "(+)"}</span>
              </button>
              {isReviewSystemsOpen ? (
                <div className="space-y-4">
              <div className={sectionLabelClass}>Review of Systems</div>
              {reviewOfSystemsFields.map(([k, label]) => (
                <div key={k} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <button
                      type="button"
                      onClick={() => addListRow(["med_hist", "sympton_review", k], emptyTextRow)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                    >
                      + Line
                    </button>
                  </div>
                  {getList(["med_hist", "sympton_review", k], emptyTextRow).map((entry, idx) => (
                    <div key={`ros-${k}-${idx}`} className="flex items-center gap-2">
                      <input
                        className={inputClass}
                        value={String(entry?.text || "")}
                        onChange={(e) => updateListRowText(["med_hist", "sympton_review", k], idx, e.target.value, emptyTextRow)}
                      />
                      <button
                        type="button"
                        onClick={() => removeListRow(["med_hist", "sympton_review", k], idx, emptyTextRow)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <button
                type="button"
                onClick={() => setIsPromptsOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900">Prompts and Special Instructions</span>
                <span className="text-base font-semibold text-gray-700">{isPromptsOpen ? "(-)" : "(+)"}</span>
              </button>
              {isPromptsOpen ? (
                <div className="space-y-4">
              <div className={sectionLabelClass}>Prompts and Special Instructions</div>
              {promptInstructionFields.map(([k, label]) => (
                <div key={k} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <button
                      type="button"
                      onClick={() => addListRow(["special", k], emptyTextRow)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                    >
                      + Question
                    </button>
                  </div>
                  {getList(["special", k], emptyTextRow).map((entry, idx) => (
                    <div key={`special-${k}-${idx}`} className="flex items-center gap-2">
                      <input
                        className={inputClass}
                        placeholder="Question to ask"
                        value={String(entry?.text || "")}
                        onChange={(e) => updateListRowText(["special", k], idx, e.target.value, emptyTextRow)}
                      />
                      <button
                        type="button"
                        onClick={() => removeListRow(["special", k], idx, emptyTextRow)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className={sectionLabelClass}>Attachments</div>
              <div className="text-sm text-gray-600">
                Upload medical cards, door notes, or other resources. PDF/PNG/JPG only, max 5MB each.
              </div>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                onChange={onFilesSelected}
                className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border file:border-gray-300 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:border-[#981e32] hover:file:text-[#981e32]"
              />
              {attachments.length ? (
                <div className="space-y-2">
                  {attachments.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                      <span>{file.name}</span>
                      <button type="button" className="text-xs font-semibold text-red-600 hover:underline" onClick={() => removeAttachment(idx)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No attachments added.</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting} className="rounded-full bg-emerald-600 text-white px-5 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-70">
            {submitting ? "Submitting..." : "Submit"}
          </button>
          <button
            type="button"
            className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:bg-gray-50"
            onClick={() => {
              if (shouldWarnOnLeave) {
                const ok = window.confirm("You have unsaved changes. Leave this page?");
                if (!ok) return;
              }
              navigate("/dashboard");
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:bg-gray-50"
            onClick={async () => {
              const script = buildScriptFromForm(form);
              const { downloadScriptPdf } = await import("../utils/pdf");
              const item = {
                id: `draft-${Date.now()}`,
                title: script?.patient?.name || "Draft Script",
                patient: script?.patient?.name || "Patient",
                department: script?.admin?.case_letter || script?.admin?.class || "Course",
                createdAt: new Date().toISOString().slice(0, 10),
                summary: script?.admin?.summory_of_story || "",
                versions: [{ version: "draft", notes: "Draft", fields: script }],
              };
              downloadScriptPdf(item, item.versions[0]);
            }}
            >
              Download PDF
            </button>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="text-xs uppercase tracking-[0.25em] text-gray-500">Virtual Clinical Center</div>
              <h3 className="text-xl font-semibold text-[#981e32]">{getField(["admin", "reson_for_visit"]) || "Script Preview"}</h3>
              <div className="text-sm text-gray-700">
                {getField(["admin", "diagnosis"]) || "Diagnosis TBD"} | {getField(["admin", "case_letter"]) || "Case Letter"} | {getField(["admin", "case_authors"]) || "Case Authors"}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Administrative Details</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Reason for Visit:</span> {getField(["admin", "reson_for_visit"]) || "-"}</li>
                  <li><span className="font-semibold">Chief Complaint:</span> {getField(["admin", "chief_concern"]) || "-"}</li>
                  <li><span className="font-semibold">Diagnosis:</span> {getField(["admin", "diagnosis"]) || "-"}</li>
                  <li><span className="font-semibold">Case Letter:</span> {getField(["admin", "case_letter"]) || "-"}</li>
                  <li><span className="font-semibold">Event Format:</span> {getField(["admin", "medical_event"]) || "-"}</li>
                  <li><span className="font-semibold">Learner Level:</span> {getField(["admin", "learner_level"]) || "-"}</li>
                  <li><span className="font-semibold">Level of learner and discipline:</span> {getField(["admin", "academic_year"]) || "-"}</li>
                  <li><span className="font-semibold">Case Authors:</span> {getField(["admin", "case_authors"]) || "-"}</li>
                </ul>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Summary of Patient Story</div>
                  <p className="text-gray-800">{getField(["admin", "summory_of_story"]) || "Add a short narrative to summarize the case."}</p>
                </div>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Student Expectations</div>
                  {extractTextList(getField(["admin", "student_expectations"])).length ? (
                    <ul className="list-disc pl-5 text-gray-800 space-y-1">
                      {extractTextList(getField(["admin", "student_expectations"])).map((entry, idx) => (
                        <li key={`preview-student-expectation-${idx}`}>{entry}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-800">List expectations for learners.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Patient Snapshot</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Patient:</span> {getField(["patient", "name"]) || "-"}</li>
                  <li><span className="font-semibold">Visit Reason:</span> {getField(["patient", "visit_reason"]) || getField(["admin", "reson_for_visit"]) || "-"}</li>
                  <li><span className="font-semibold">Context:</span> {getField(["patient", "context"]) || "-"}</li>
                  <li><span className="font-semibold">Task:</span> {getField(["patient", "task"]) || "-"}</li>
                  <li><span className="font-semibold">Patient Encounter Duration:</span> {getField(["patient", "encounter_duration"]) || "-"}</li>
                </ul>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Vital Signs</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{(getField(["patient", "vitals", "heart_rate"]) ?? "") !== "" ? getField(["patient", "vitals", "heart_rate"]) : "-"} beats/min</li>
                    <li>{(getField(["patient", "vitals", "respirations"]) ?? "") !== "" ? getField(["patient", "vitals", "respirations"]) : "-"} breaths/min</li>
                    <li>{(getField(["patient", "vitals", "pressure", "top"]) ?? "") !== "" ? getField(["patient", "vitals", "pressure", "top"]) : "-"}/{(getField(["patient", "vitals", "pressure", "bottom"]) ?? "") !== "" ? getField(["patient", "vitals", "pressure", "bottom"]) : "-"} mmHg</li>
                    <li>{(getField(["patient", "vitals", "blood_oxygen"]) ?? "") !== "" ? getField(["patient", "vitals", "blood_oxygen"]) : "-"}%</li>
                    <li>{(getField(["patient", "vitals", "temp", "reading"]) ?? "") !== "" ? getField(["patient", "vitals", "temp", "reading"]) : "-"} {String(getField(["patient", "vitals", "temp", "unit"]) || "") === "1" ? "Fahrenheit" : "Celsius"}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">SP Content</div>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Opening Statement</div>
                  <p className="text-gray-800">{getField(["sp", "opening_statement"]) || "-"}</p>
                </div>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Character Attributes</div>
                  <div className="grid grid-cols-2 gap-2">
                    {["anxiety", "suprise", "confusion", "guilt", "sadness", "indecision", "assertiveness", "frustration", "fear", "anger"].map((k) => (
                      <div key={k} className="flex items-center justify-between rounded border px-2 py-1">
                        <span className="capitalize">{k}</span>
                        <span className="text-sm font-semibold text-[#981e32]">{Number(getField(["sp", "attributes", k]) || 1)}/5</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-gray-900">History of Present Illness (HPI)</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Setting in Which Symptom(s) Occur:</span> {getField(["sp", "current_ill_history", "symptom_settings"]) || "-"}</li>
                  <li><span className="font-semibold">Timing of Symptom(s):</span> {getField(["sp", "current_ill_history", "symptom_timing"]) || "-"}</li>
                  <li><span className="font-semibold">Associated Symptoms:</span> {getField(["sp", "current_ill_history", "associated_symptoms"]) || "-"}</li>
                  <li><span className="font-semibold">Radiation of Symptom(s):</span> {getField(["sp", "current_ill_history", "radiation_of_symptoms"]) || "-"}</li>
                  <li><span className="font-semibold">Severity/Quality of Symptom(s):</span> {getField(["sp", "current_ill_history", "symptom_quality"]) || "-"}</li>
                  <li><span className="font-semibold">Alleviating Factors of Symptom(s):</span> {getField(["sp", "current_ill_history", "alleviating_factors"]) || "-"}</li>
                  <li><span className="font-semibold">Aggravating Factors of Symptom(s):</span> {getField(["sp", "current_ill_history", "aggravating_factors"]) || "-"}</li>
                  <li><span className="font-semibold">Severity (0-10):</span> {getField(["sp", "current_ill_history", "pain"]) ?? 0}</li>
                </ul>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Medications and Allergies</div>
                <div className="text-sm text-gray-700 space-y-2">
                  <div>
                    <div className="font-semibold">Medications</div>
                    <ul className="list-disc pl-5">
                      {extractTextList(getField(["med_hist", "medications"])).length
                        ? extractTextList(getField(["med_hist", "medications"])).map((entry, idx) => <li key={`preview-rx-${idx}`}>{entry}</li>)
                        : <li>None</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold">Non-prescription Medications</div>
                    <ul className="list-disc pl-5">
                      {extractTextList(getField(["med_hist", "non_prescription_medications"])).length
                        ? extractTextList(getField(["med_hist", "non_prescription_medications"])).map((entry, idx) => <li key={`preview-otc-${idx}`}>{entry}</li>)
                        : <li>None</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold">Allergies</div>
                    <ul className="list-disc pl-5">
                      {extractTextList(getField(["med_hist", "allergies"])).length
                        ? extractTextList(getField(["med_hist", "allergies"])).map((entry, idx) => <li key={`preview-allergy-${idx}`}>{entry}</li>)
                        : <li>None</li>}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Case Factors and Supplies</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Special Supplies:</span> {getField(["admin", "special_supplies"]) || "-"}</li>
                  <li><span className="font-semibold">Case Factors:</span> {getField(["admin", "case_factors"]) || "-"}</li>
                  <li><span className="font-semibold">Patient Demographic:</span> {getField(["admin", "patient_demographic"]) || "-"}</li>
                </ul>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Social History</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Background:</span> {getField(["med_hist", "social_hist", "personal_background"]) || "-"}</li>
                  <li><span className="font-semibold">Nutrition/Exercise:</span> {getField(["med_hist", "social_hist", "nutrion_and_exercise"]) || "-"}</li>
                  <li><span className="font-semibold">Community/Employment:</span> {getField(["med_hist", "social_hist", "community_and_employment"]) || "-"}</li>
                  <li><span className="font-semibold">Safety Measures:</span> {getField(["med_hist", "social_hist", "safety_measure"]) || "-"}</li>
                  <li><span className="font-semibold">Life Stressors:</span> {getField(["med_hist", "social_hist", "life_stressors"]) || "-"}</li>
                </ul>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Substance Abuse</div>
                  <ul className="list-disc pl-5">
                    {extractTextList(getField(["med_hist", "social_hist", "substance_use"])).length
                      ? extractTextList(getField(["med_hist", "social_hist", "substance_use"])).map((entry, idx) => <li key={`preview-substance-${idx}`}>{entry}</li>)
                      : <li>None</li>}
                  </ul>
                </div>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Sexual History</div>
                  <ul className="list-disc pl-5">
                    {extractTextList(getField(["med_hist", "social_hist", "sexual_history_entries"])).length
                      ? extractTextList(getField(["med_hist", "social_hist", "sexual_history_entries"])).map((entry, idx) => <li key={`preview-sexual-history-${idx}`}>{entry}</li>)
                      : <li>None</li>}
                  </ul>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Review of Systems</div>
                <div className="space-y-2 text-sm text-gray-700">
                  {reviewOfSystemsFields.map(([k, label]) => (
                    <div key={`preview-ros-${k}`} className="rounded border px-2 py-1 bg-gray-50">
                      <div className="font-semibold text-gray-800">{label}</div>
                      {extractTextList(getField(["med_hist", "sympton_review", k])).length ? (
                        extractTextList(getField(["med_hist", "sympton_review", k])).map((entry, idx) => (
                          <div key={`preview-ros-line-${k}-${idx}`}>{entry}</div>
                        ))
                      ) : (
                        <div>-</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Prompts and Special Instructions</div>
              <div className="space-y-2 text-sm text-gray-700">
                {promptInstructionFields.map(([k, label]) => (
                  <div key={`preview-special-${k}`} className="rounded border px-2 py-1 bg-gray-50">
                    <div className="font-semibold text-gray-800">{label}</div>
                    {extractTextList(getField(["special", k])).length ? (
                      extractTextList(getField(["special", k])).map((entry, idx) => (
                        <div key={`preview-special-line-${k}-${idx}`}>{entry}</div>
                      ))
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};

export default RequestNew;
