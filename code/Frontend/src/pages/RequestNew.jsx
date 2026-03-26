import { useNavigate, useBeforeUnload } from "react-router-dom";
import { useCallback, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { useToast } from "../components/Toast";

const emptyTextRow = () => ({ text: "" });

const reviewOfSystemsFields = [
  ["general", "General"],
  ["skin", "Skin"],
  ["heent", "HEENT"],
  ["neck", "Neck"],
  ["breast", "Breast"],
  ["respiratory", "Respiratory"],
  ["cardiovascular", "Cardiovascular"],
  ["gastrointestinal", "Gastrointestinal"],
  ["genitourinary", "Genitourinary"],
  ["peripheral_vascular", "Peripheral Vascular"],
  ["musculoskeletal", "Musculoskeletal"],
  ["psychiatric", "Psychiatric"],
  ["neurologival", "Neurological"],
  ["endocine", "Hematologic/Endocrine"],
];

const extractTextList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : entry?.text || ""))
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

const buildSymptomReviewPayload = (symptomReview = {}) =>
  reviewOfSystemsFields.reduce((acc, [key]) => {
    acc[key] = extractTextList(symptomReview?.[key]).join("\n");
    return acc;
  }, {});

const buildDraftScript = (form = {}) => ({
  admin: {
    reson_for_visit: form.admin?.reson_for_visit || "",
    chief_concern: form.admin?.chief_concern || "",
    diagnosis: form.admin?.diagnosis || "",
    case_letter: form.admin?.case_letter || "",
    class: form.admin?.case_letter || "",
    medical_event: form.admin?.medical_event || "",
    learner_level: form.admin?.learner_level || "",
    summory_of_story: form.admin?.summory_of_story || "",
    student_expectations: toBulletedText(form.admin?.student_expectations),
    patient_demographic: form.admin?.patient_demographic || "",
    special_supplies: form.admin?.special_supplies || "",
    case_factors: form.admin?.case_factors || "",
    pertinent_case_aspects: form.admin?.pertinent_case_aspects || "",
  },
  patient: {
    visit_reason: form.admin?.reson_for_visit || "",
    context: form.patient?.context || "",
  },
  sp: {
    physical_chars: form.sp?.physical_chars || "",
    current_ill_history: {
      symptom_quality: form.sp?.current_ill_history?.symptom_quality || "",
    },
  },
  med_hist: {
    sympton_review: buildSymptomReviewPayload(form.med_hist?.sympton_review),
  },
  special: {
    feed_back: form.special?.feed_back || "",
  },
  meta: {
    simulation_modal: form.meta?.simulation_modal || "",
    pedagogy: form.meta?.pedagogy || "",
  },
});

const buildScriptRequestPayload = (form = {}, draftScript = null) => {
  const now = new Date().toISOString();
  return {
    reason_for_visit: form.admin?.reson_for_visit || "",
    simulation_modal: form.meta?.simulation_modal || "",
    case_setting: form.patient?.context || "",
    chief_concern: form.admin?.chief_concern || "",
    diagnosis: form.admin?.diagnosis || "",
    event: form.admin?.medical_event || "",
    pedagogy: form.meta?.pedagogy || "",
    class: form.admin?.case_letter || "",
    learner_level: form.admin?.learner_level || "",
    summary_patient_story: form.admin?.summory_of_story || "",
    pert_aspects_patient_case: form.admin?.pertinent_case_aspects || "",
    physical_chars: form.sp?.physical_chars || "",
    student_expec: toBulletedText(form.admin?.student_expectations),
    spec_phyis_findings: form.sp?.current_ill_history?.symptom_quality || "",
    patient_demog: form.admin?.patient_demographic || "",
    special_needs: form.admin?.special_supplies || "",
    case_factors: form.admin?.case_factors || "",
    additonal_ins: form.special?.feed_back || "",
    sympt_review: buildSymptomReviewPayload(form.med_hist?.sympton_review),
    status: "Pending",
    note: "",
    created_at: now,
    updated_at: now,
    draft_script: draftScript,
    artifacts: [],
  };
};

const RequestNew = () => {
  const navigate = useNavigate();
  const { createRequest } = useStore();
  const toast = useToast();

  const [submitting, setSubmitting] = useState(false);
  const bypassNavigationRef = useRef(false);

  const initialForm = {
    meta: {
      simulation_modal: "",
      pedagogy: "",
    },
    admin: {
      reson_for_visit: "",
      chief_concern: "",
      diagnosis: "",
      medical_event: "",
      case_letter: "",
      learner_level: "",
      summory_of_story: "",
      pertinent_case_aspects: "",
      student_expectations: [emptyTextRow()],
      patient_demographic: "",
      special_supplies: "",
      case_factors: "",
    },
    patient: {
      context: "",
    },
    sp: {
      physical_chars: "",
      current_ill_history: {
        symptom_quality: "",
      },
    },
    med_hist: {
      sympton_review: reviewOfSystemsFields.reduce((acc, [key]) => {
        acc[key] = [emptyTextRow()];
        return acc;
      }, {}),
    },
    special: {
      feed_back: "",
    },
  };

  const [form, setForm] = useState(initialForm);
  const initialSnapshotRef = useRef(JSON.stringify(initialForm));

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== initialSnapshotRef.current,
    [form]
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

  const setDeep = (obj, path, value) => {
    const copy = JSON.parse(JSON.stringify(obj));
    let cur = copy;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (cur[key] == null || typeof cur[key] !== "object") cur[key] = {};
      cur = cur[key];
    }
    cur[path[path.length - 1]] = value;
    return copy;
  };

  const setField = (path, value) => setForm((prev) => setDeep(prev, path, value));
  const getField = (path) => path.reduce((acc, key) => (acc ? acc[key] : undefined), form);

  const getList = (path, fallbackFactory) => {
    const current = getField(path);
    if (Array.isArray(current) && current.length) return current;
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
    const next = current.map((entry, idx) =>
      idx === index ? { ...(entry || {}), text: value } : entry
    );
    setField(path, next);
  };

  const onFormKeyDown = (event) => {
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
      event.preventDefault();
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    bypassNavigationRef.current = false;
    setSubmitting(true);

    try {
      const draftScript = buildDraftScript(form);
      const requestPayload = buildScriptRequestPayload(form, draftScript);
      if (typeof createRequest !== "function") {
        throw new Error("Request submission is not configured");
      }
      await createRequest(requestPayload);

      initialSnapshotRef.current = JSON.stringify(form);
      bypassNavigationRef.current = true;
      toast.show("Script request submitted successfully.", { type: "success" });
      navigate("/dashboard");
    } catch (err) {
      toast.show(err?.message || "Failed to submit request.", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400";
  const textAreaClass = "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400";
  const sectionLabelClass = "text-sm font-semibold text-gray-800";

  return (
    <section className="w-full">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-semibold">Script Request</h2>
          <p className="text-sm text-gray-600">Single-column request form for standardized patient scripts.</p>
        </div>

        <form onSubmit={onSubmit} onKeyDown={onFormKeyDown} className="space-y-6 text-left">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className={sectionLabelClass}>Simulation Modality</div>
                <input className={inputClass} value={getField(["meta", "simulation_modal"]) || ""} onChange={(e) => setField(["meta", "simulation_modal"], e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className={sectionLabelClass}>Case Setting</div>
                <input className={inputClass} value={getField(["patient", "context"]) || ""} onChange={(e) => setField(["patient", "context"], e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className={sectionLabelClass}>Chief Concern</div>
                <input className={inputClass} value={getField(["admin", "chief_concern"]) || ""} onChange={(e) => setField(["admin", "chief_concern"], e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className={sectionLabelClass}>Diagnosis and ICD-10 Code</div>
                <input className={inputClass} value={getField(["admin", "diagnosis"]) || ""} onChange={(e) => setField(["admin", "diagnosis"], e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className={sectionLabelClass}>Event</div>
                <input className={inputClass} value={getField(["admin", "medical_event"]) || ""} onChange={(e) => setField(["admin", "medical_event"], e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className={sectionLabelClass}>Pedagogy</div>
                <input className={inputClass} value={getField(["meta", "pedagogy"]) || ""} onChange={(e) => setField(["meta", "pedagogy"], e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className={sectionLabelClass}>Class</div>
                <input className={inputClass} value={getField(["admin", "case_letter"]) || ""} onChange={(e) => setField(["admin", "case_letter"], e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className={sectionLabelClass}>Learner Level</div>
                <input className={inputClass} value={getField(["admin", "learner_level"]) || ""} onChange={(e) => setField(["admin", "learner_level"], e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className={sectionLabelClass}>Summary of Patient Story</div>
                <textarea rows={3} className={textAreaClass} value={getField(["admin", "summory_of_story"]) || ""} onChange={(e) => setField(["admin", "summory_of_story"], e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className={sectionLabelClass}>Pertinent Aspects of Patient Case</div>
                <textarea rows={2} className={textAreaClass} value={getField(["admin", "pertinent_case_aspects"]) || ""} onChange={(e) => setField(["admin", "pertinent_case_aspects"], e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className={sectionLabelClass}>Nonverbal Behavior and Physical Characteristics</div>
                <textarea rows={2} className={textAreaClass} value={getField(["sp", "physical_chars"]) || ""} onChange={(e) => setField(["sp", "physical_chars"], e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className={sectionLabelClass}>Student Expectations</div>
                  <button
                    type="button"
                    onClick={() => addListRow(["admin", "student_expectations"], emptyTextRow)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                  >
                    + Expectation
                  </button>
                </div>
                {getList(["admin", "student_expectations"], emptyTextRow).map((entry, idx) => (
                  <div key={`student-expectation-${idx}`} className="flex items-center gap-2">
                    <input
                      className={inputClass}
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
              <div className="space-y-2 md:col-span-2">
                <div className={sectionLabelClass}>Specific Physical Findings the Patient Should Portray or Be Provided to the Student</div>
                <textarea rows={2} className={textAreaClass} value={getField(["sp", "current_ill_history", "symptom_quality"]) || ""} onChange={(e) => setField(["sp", "current_ill_history", "symptom_quality"], e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className={sectionLabelClass}>Demographic of Patient</div>
                <input className={inputClass} value={getField(["admin", "patient_demographic"]) || ""} onChange={(e) => setField(["admin", "patient_demographic"], e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className={sectionLabelClass}>Special Supplies Needed for Encounter</div>
                <input className={inputClass} value={getField(["admin", "special_supplies"]) || ""} onChange={(e) => setField(["admin", "special_supplies"], e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className={sectionLabelClass}>Case Factors Associated with Social Determinants of Health</div>
                <textarea rows={2} className={textAreaClass} value={getField(["admin", "case_factors"]) || ""} onChange={(e) => setField(["admin", "case_factors"], e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className={sectionLabelClass}>Additional Instructions</div>
                <textarea rows={2} className={textAreaClass} value={getField(["special", "feed_back"]) || ""} onChange={(e) => setField(["special", "feed_back"], e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <div className="font-semibold text-gray-900">Review of Symptoms</div>
            <div className="text-sm text-gray-600">Include the relevant details for each symptom category.</div>
            <div className="space-y-4">
              {reviewOfSystemsFields.map(([k, label]) => (
                <div key={k} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <button
                      type="button"
                      onClick={() => addListRow(["med_hist", "sympton_review", k], emptyTextRow)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                    >
                      + Symptom
                    </button>
                  </div>
                  {getList(["med_hist", "sympton_review", k], emptyTextRow).map((entry, idx) => (
                    <div key={`review-${k}-${idx}`} className="flex items-center gap-2">
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
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-emerald-600 text-white px-5 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-70"
            >
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
          </div>
        </form>
      </div>
    </section>
  );
};

export default RequestNew;
