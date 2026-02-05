import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useStore } from "../store";
import { useToast } from "../components/Toast";
import { buildScriptFromForm } from "../utils/scriptFormat";

const ratingOptions = [
  { label: "None (0)", value: 0 },
  { label: "Mild (1)", value: 1 },
  { label: "Moderate (2)", value: 2 },
  { label: "Concerning (3)", value: 3 },
  { label: "Severe (4)", value: 4 },
  { label: "Extreme (5)", value: 5 },
];

const severityScale = Array.from({ length: 11 }).map((_, idx) => ({
  label: `${idx} / 10`,
  value: idx,
}));

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
    class: form.admin?.class || "",
    learner_level: form.admin?.learner_level || "",
    summary_patient_story: form.admin?.summory_of_story || "",
    pert_aspects_patient_case: form.admin?.case_factors || "",
    physical_chars: form.sp?.physical_chars || "",
    student_expec: form.admin?.student_expectations || "",
    spec_phyis_findings: form.sp?.current_ill_history?.symptom_quality || "",
    patient_demog: form.admin?.patient_demographic || "",
    special_needs: form.special?.oppurtunity || "",
    case_factors: form.admin?.case_factors || "",
    additonal_ins: form.special?.feed_back || "",
    sympt_review: form.med_hist?.sympton_review || {},
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

  const [form, setForm] = useState(initialForm);

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

  const uploadAttachments = async () => {
    if (!attachments.length) return [];
    const { api } = await import("../api/client");
    const uploaded = [];
    for (const file of attachments) {
      const res = await api.uploadArtifact(file);
      uploaded.push(res);
    }
    return uploaded;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    let uploadedArtifacts = [];

    try {
      uploadedArtifacts = await uploadAttachments();
      const script = buildScriptFromForm(form);
      if (uploadedArtifacts.length) {
        script.artifacts = uploadedArtifacts;
      }
      const requestPayload = buildScriptRequestPayload(form, script, uploadedArtifacts);
      if (typeof createRequest !== "function") {
        throw new Error("Request submission is not configured");
      }
      await createRequest(requestPayload);
      toast.show("Request submitted", { type: "success" });
      navigate("/dashboard");
    } catch (err) {
      try {
        const { api } = await import("../api/client");
        await Promise.all(
          uploadedArtifacts.map((a) => (a?.id ? api.deleteArtifact(a.id) : null))
        );
      } catch {
        
      }
      toast.show("Creation failed", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="w-full px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-semibold">Script Request</h2>
          <p className="text-sm text-gray-600">Single-column request form for standardized patient scripts.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6 text-left">
          <div className="rounded-2xl border border-gray-300 bg-white shadow-sm p-6 space-y-8">
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
                <span className="text-sm text-gray-700">Class</span>
                <input className={inputClass} value={getField(["admin", "class"]) || ""} onChange={(e) => setField(["admin", "class"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Medical Event</span>
                <input className={inputClass} value={getField(["admin", "medical_event"]) || ""} onChange={(e) => setField(["admin", "medical_event"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Event Dates</span>
                <input className={inputClass} value={getField(["admin", "event_dates"]) || ""} onChange={(e) => setField(["admin", "event_dates"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Learner Level</span>
                <input className={inputClass} value={getField(["admin", "learner_level"]) || ""} onChange={(e) => setField(["admin", "learner_level"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Academic Year</span>
                <input className={inputClass} value={getField(["admin", "academic_year"]) || ""} onChange={(e) => setField(["admin", "academic_year"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Author</span>
                <input className={inputClass} value={getField(["admin", "author"]) || ""} onChange={(e) => setField(["admin", "author"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Summary of Patient Story</span>
                <textarea rows={3} className={textAreaClass} value={getField(["admin", "summory_of_story"]) || ""} onChange={(e) => setField(["admin", "summory_of_story"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Student Expectations</span>
                <textarea rows={2} className={textAreaClass} value={getField(["admin", "student_expectations"]) || ""} onChange={(e) => setField(["admin", "student_expectations"], e.target.value)} />
              </label>
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

            <div className="space-y-4">
              <div className={sectionLabelClass}>Patient</div>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Name</span>
                <input className={inputClass} value={getField(["patient", "name"]) || ""} onChange={(e) => setField(["patient", "name"], e.target.value)} />
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
                <span className="text-sm text-gray-700">Encounter Duration</span>
                <input className={inputClass} value={getField(["patient", "encounter_duration"]) || ""} onChange={(e) => setField(["patient", "encounter_duration"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Heart Rate</span>
                <input type="number" className={inputClass} value={getField(["patient", "vitals", "heart_rate"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "heart_rate"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Respirations</span>
                <input type="number" className={inputClass} value={getField(["patient", "vitals", "respirations"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "respirations"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Blood Oxygen</span>
                <input type="number" className={inputClass} value={getField(["patient", "vitals", "blood_oxygen"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "blood_oxygen"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Pressure Top</span>
                <input type="number" className={inputClass} value={getField(["patient", "vitals", "pressure", "top"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "pressure", "top"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Pressure Bottom</span>
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

            <div className="space-y-4">
              <div className={sectionLabelClass}>SP Info</div>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Opening Statement</span>
                <textarea rows={2} className={textAreaClass} value={getField(["sp", "opening_statement"]) || ""} onChange={(e) => setField(["sp", "opening_statement"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Physical Characteristics</span>
                <textarea rows={2} className={textAreaClass} value={getField(["sp", "physical_chars"]) || ""} onChange={(e) => setField(["sp", "physical_chars"], e.target.value)} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["anxiety", "suprise", "confusion", "guilt", "sadness", "indecision", "assertiveness", "frustration", "fear", "anger"].map((k) => (
                  <label key={k} className="block space-y-1">
                    <span className="text-sm text-gray-700">{k[0].toUpperCase() + k.slice(1)}</span>
                    <select className={`${inputClass} pr-8`} value={getField(["sp", "attributes", k]) ?? 0} onChange={(e) => setNumberField(["sp", "attributes", k], e.target.value)}>
                      {ratingOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className={sectionLabelClass}>Current Illness History</div>
              {[
                ["body_location", "Body Location"],
                ["symptom_settings", "Symptom Settings"],
                ["symptom_timing", "Symptom Timing"],
                ["associated_symptoms", "Associated Symptoms"],
                ["radiation_of_symptoms", "Radiation of Symptoms"],
                ["symptom_quality", "Symptom Quality"],
                ["alleviating_factors", "Alleviating Factors"],
                ["aggravating_factors", "Aggravating Factors"],
              ].map(([k, label]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input className={inputClass} value={getField(["sp", "current_ill_history", k]) || ""} onChange={(e) => setField(["sp", "current_ill_history", k], e.target.value)} />
                </label>
              ))}
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Pain / Severity</span>
                <select className={`${inputClass} pr-8`} value={getField(["sp", "current_ill_history", "pain"]) ?? 0} onChange={(e) => setNumberField(["sp", "current_ill_history", "pain"], e.target.value)}>
                  {severityScale.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-4">
              <div className={sectionLabelClass}>Medical History</div>
              <div className={sectionLabelClass}>Medications</div>
              {[
                ["name", "Name"],
                ["brand", "Brand"],
                ["generic", "Generic Name"],
                ["dose", "Dose"],
                ["frequency", "Frequency"],
                ["reason", "Reason"],
                ["startDate", "Date Started"],
                ["otherNotes", "Other Notes"],
              ].map(([k, label]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input className={inputClass} value={getField(["med_hist", "medications", k]) || ""} onChange={(e) => setField(["med_hist", "medications", k], e.target.value)} />
                </label>
              ))}
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Allergies</span>
                <input className={inputClass} value={getField(["med_hist", "allergies"]) || ""} onChange={(e) => setField(["med_hist", "allergies"], e.target.value)} />
              </label>

              <div className={sectionLabelClass}>Past Medical History</div>
              {[
                ["child_hood_illness", "Childhood Illness"],
                ["illness_and_hospital", "Medical Illnesses and Hospitalizations"],
                ["surgeries", "Surgeries"],
                ["obe_and_gye", "Obstetric or Gynecologic History"],
                ["transfusion", "Transfusion History"],
                ["psychiatric", "Psychiatric History"],
                ["trauma", "Trauma"],
              ].map(([k, label]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input className={inputClass} value={getField(["med_hist", "past_med_his", k]) || ""} onChange={(e) => setField(["med_hist", "past_med_his", k], e.target.value)} />
                </label>
              ))}

              <div className={sectionLabelClass}>Preventative Measures</div>
              {[
                ["immunization", "Immunizations"],
                ["alternate_health_care", "Alternative/Complementary Health Care"],
                ["travel_exposure", "Travel/Exposure History"],
              ].map(([k, label]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input className={inputClass} value={getField(["med_hist", "preventative_measure", k]) || ""} onChange={(e) => setField(["med_hist", "preventative_measure", k], e.target.value)} />
                </label>
              ))}

              <div className={sectionLabelClass}>Family History (single entry)</div>
              {[
                ["health_status", "Health Status"],
                ["cause_of_death", "Cause of Death"],
                ["additonal_info", "Additional Info"],
              ].map(([k, label]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input className={inputClass} value={getField(["med_hist", "family_hist", k]) || ""} onChange={(e) => setField(["med_hist", "family_hist", k], e.target.value)} />
                </label>
              ))}
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Age</span>
                <input type="number" className={inputClass} value={getField(["med_hist", "family_hist", "age"]) ?? ""} onChange={(e) => setNumberField(["med_hist", "family_hist", "age"], e.target.value)} />
              </label>

              <div className={sectionLabelClass}>Social History</div>
              {[
                ["personal_background", "Personal Background"],
                ["nutrion_and_exercise", "Nutritional and Exercise History"],
                ["community_and_employment", "Community and Employment History"],
                ["safety_measure", "Safety Measures"],
                ["life_stressors", "Significant Life Stressors"],
                ["substance_use", "Substance Use"],
              ].map(([k, label]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input className={inputClass} value={getField(["med_hist", "social_hist", k]) || ""} onChange={(e) => setField(["med_hist", "social_hist", k], e.target.value)} />
                </label>
              ))}

              <div className={sectionLabelClass}>Sexual History</div>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Current Partners</span>
                <input type="number" className={inputClass} value={getField(["med_hist", "social_hist", "sex_history", "current_partners"]) ?? ""} onChange={(e) => setNumberField(["med_hist", "social_hist", "sex_history", "current_partners"], e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Past Partners</span>
                <input type="number" className={inputClass} value={getField(["med_hist", "social_hist", "sex_history", "past_partners"]) ?? ""} onChange={(e) => setNumberField(["med_hist", "social_hist", "sex_history", "past_partners"], e.target.value)} />
              </label>
              {[
                ["contraceptives", "Contraceptives"],
                ["hiv_risk_history", "HIV Risk History"],
                ["safety_in_relations", "Safety in Relationships"],
              ].map(([k, label]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input className={inputClass} value={getField(["med_hist", "social_hist", "sex_history", k]) || ""} onChange={(e) => setField(["med_hist", "social_hist", "sex_history", k], e.target.value)} />
                </label>
              ))}

              <div className={sectionLabelClass}>Review Of Symptoms</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                  <label key={k} className="block space-y-1">
                    <span className="text-sm text-gray-700">{label}</span>
                    <input className={inputClass} value={getField(["med_hist", "sympton_review", k]) || ""} onChange={(e) => setField(["med_hist", "sympton_review", k], e.target.value)} />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className={sectionLabelClass}>Special Instructions</div>
              {[
                ["provoking_question", "Provoking Question"],
                ["must_ask", "Must Ask"],
                ["oppurtunity", "Opportunity"],
                ["opening_statement", "Opening Statement"],
                ["feed_back", "Feedback"],
              ].map(([k, label]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input className={inputClass} value={getField(["special", k]) || ""} onChange={(e) => setField(["special", k], e.target.value)} />
                </label>
              ))}
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
          <button type="button" className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:bg-gray-50" onClick={() => navigate("/dashboard")}>Cancel</button>
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
                department: script?.admin?.class || "Course",
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
                {getField(["admin", "diagnosis"]) || "Diagnosis TBD"} • {getField(["admin", "class"]) || "Course"} • {getField(["admin", "author"]) || "Author N/A"}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Administrative Details</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Reason for Visit:</span> {getField(["admin", "reson_for_visit"]) || "—"}</li>
                  <li><span className="font-semibold">Chief Complaint:</span> {getField(["admin", "chief_concern"]) || "—"}</li>
                  <li><span className="font-semibold">Diagnosis:</span> {getField(["admin", "diagnosis"]) || "—"}</li>
                  <li><span className="font-semibold">Event:</span> {getField(["admin", "medical_event"]) || "—"}</li>
                  <li><span className="font-semibold">Learner Level:</span> {getField(["admin", "learner_level"]) || "—"}</li>
                  <li><span className="font-semibold">Academic Year:</span> {getField(["admin", "academic_year"]) || "—"}</li>
                  <li><span className="font-semibold">Author:</span> {getField(["admin", "author"]) || "—"}</li>
                </ul>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Summary of Patient Story</div>
                  <p className="text-gray-800">{getField(["admin", "summory_of_story"]) || "Add a short narrative to summarize the case."}</p>
                </div>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Student Expectations</div>
                  <p className="text-gray-800">{getField(["admin", "student_expectations"]) || "List expectations for learners."}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Patient Snapshot</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Patient:</span> {getField(["patient", "name"]) || "—"}</li>
                  <li><span className="font-semibold">Visit Reason:</span> {getField(["patient", "visit_reason"]) || getField(["admin", "reson_for_visit"]) || "—"}</li>
                  <li><span className="font-semibold">Context:</span> {getField(["patient", "context"]) || "—"}</li>
                  <li><span className="font-semibold">Task:</span> {getField(["patient", "task"]) || "—"}</li>
                  <li><span className="font-semibold">Encounter Duration:</span> {getField(["patient", "encounter_duration"]) || "—"}</li>
                </ul>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Vitals</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>HR: {getField(["patient", "vitals", "heart_rate"]) || "—"}</div>
                    <div>RR: {getField(["patient", "vitals", "respirations"]) || "—"}</div>
                    <div>BP: {getField(["patient", "vitals", "pressure", "top"]) || "—"}/{getField(["patient", "vitals", "pressure", "bottom"]) || "—"}</div>
                    <div>SpO₂: {getField(["patient", "vitals", "blood_oxygen"]) || "—"}</div>
                    <div>Temp: {getField(["patient", "vitals", "temp", "reading"]) || "—"} {getField(["patient", "vitals", "temp", "unit"]) || ""}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">SP Content</div>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Opening Statement</div>
                  <p className="text-gray-800">{getField(["sp", "opening_statement"]) || "—"}</p>
                </div>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Character Attributes</div>
                  <div className="grid grid-cols-2 gap-2">
                    {["anxiety", "suprise", "confusion", "guilt", "sadness", "indecision", "assertiveness", "frustration", "fear", "anger"].map((k) => (
                      <div key={k} className="flex items-center justify-between rounded border px-2 py-1">
                        <span className="capitalize">{k}</span>
                        <span className="text-sm font-semibold text-[#981e32]">{getField(["sp", "attributes", k]) ?? 0}/5</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Symptoms</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Setting:</span> {getField(["sp", "current_ill_history", "symptom_settings"]) || "—"}</li>
                  <li><span className="font-semibold">Timing:</span> {getField(["sp", "current_ill_history", "symptom_timing"]) || "—"}</li>
                  <li><span className="font-semibold">Associated Symptoms:</span> {getField(["sp", "current_ill_history", "associated_symptoms"]) || "—"}</li>
                  <li><span className="font-semibold">Radiation:</span> {getField(["sp", "current_ill_history", "radiation_of_symptoms"]) || "—"}</li>
                  <li><span className="font-semibold">Quality:</span> {getField(["sp", "current_ill_history", "symptom_quality"]) || "—"}</li>
                  <li><span className="font-semibold">Alleviating Factors:</span> {getField(["sp", "current_ill_history", "alleviating_factors"]) || "—"}</li>
                  <li><span className="font-semibold">Aggravating Factors:</span> {getField(["sp", "current_ill_history", "aggravating_factors"]) || "—"}</li>
                  <li><span className="font-semibold">Severity (0-10):</span> {getField(["sp", "current_ill_history", "pain"]) ?? 0}</li>
                </ul>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Medications & Allergies</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Medication:</span> {getField(["med_hist", "medications", "name"]) || "—"} {getField(["med_hist", "medications", "dose"]) ? `(${getField(["med_hist", "medications", "dose"])})` : ""}</li>
                  <li><span className="font-semibold">Frequency:</span> {getField(["med_hist", "medications", "frequency"]) || "—"}</li>
                  <li><span className="font-semibold">Reason:</span> {getField(["med_hist", "medications", "reason"]) || "—"}</li>
                  <li><span className="font-semibold">Allergies:</span> {getField(["med_hist", "allergies"]) || "—"}</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Case Factors & Supplies</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Special Supplies:</span> {getField(["admin", "special_supplies"]) || "—"}</li>
                  <li><span className="font-semibold">Case Factors:</span> {getField(["admin", "case_factors"]) || "—"}</li>
                  <li><span className="font-semibold">Patient Demographic:</span> {getField(["admin", "patient_demographic"]) || "—"}</li>
                </ul>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="font-semibold text-gray-900">Social History</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Background:</span> {getField(["med_hist", "social_hist", "personal_background"]) || "—"}</li>
                  <li><span className="font-semibold">Nutrition/Exercise:</span> {getField(["med_hist", "social_hist", "nutrion_and_exercise"]) || "—"}</li>
                  <li><span className="font-semibold">Community/Employment:</span> {getField(["med_hist", "social_hist", "community_and_employment"]) || "—"}</li>
                  <li><span className="font-semibold">Safety Measures:</span> {getField(["med_hist", "social_hist", "safety_measure"]) || "—"}</li>
                  <li><span className="font-semibold">Life Stressors:</span> {getField(["med_hist", "social_hist", "life_stressors"]) || "—"}</li>
                  <li><span className="font-semibold">Substance Use:</span> {getField(["med_hist", "social_hist", "substance_use"]) || "—"}</li>
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
                      <div>{getField(["med_hist", "sympton_review", k]) || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Prompts & Special Instructions</div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><span className="font-semibold">Provoking Question:</span> {getField(["special", "provoking_question"]) || "—"}</li>
                <li><span className="font-semibold">Must Ask:</span> {getField(["special", "must_ask"]) || "—"}</li>
                <li><span className="font-semibold">Opportunity:</span> {getField(["special", "oppurtunity"]) || "—"}</li>
                <li><span className="font-semibold">Opening Statement:</span> {getField(["special", "opening_statement"]) || "—"}</li>
                <li><span className="font-semibold">Feedback Notes:</span> {getField(["special", "feed_back"]) || "—"}</li>
              </ul>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};

export default RequestNew;
