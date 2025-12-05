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

  const onSubmit = async (e) => {
    e.preventDefault();
    const script = buildScriptFromForm(form);

    try {
      await addItem(script);
      toast.show("Request submitted", { type: "success" });
      navigate("/dashboard");
    } catch (err) {
      toast.show("Creation failed", { type: "error" });
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
                    <input type="number" min={0} max={10} className={inputClass} value={getField(["sp", "attributes", k]) ?? ""} onChange={(e) => setNumberField(["sp", "attributes", k], e.target.value)} />
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
                <span className="text-sm text-gray-700">Pain</span>
                <input type="number" min={0} max={10} className={inputClass} value={getField(["sp", "current_ill_history", "pain"]) ?? ""} onChange={(e) => setNumberField(["sp", "current_ill_history", "pain"], e.target.value)} />
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
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rounded-full bg-emerald-600 text-white px-5 py-2 text-sm font-semibold hover:bg-emerald-700">Submit</button>
            <button type="button" className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:bg-gray-50" onClick={() => navigate("/dashboard")}>Cancel</button>
            <button
              type="button"
              className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:bg-gray-50"
              onClick={() => {
                const script = buildScriptFromForm(form);
                downloadScriptJson(script, `script-${Date.now()}.json`);
              }}
            >
              Download Script
            </button>
          </div>

          <div className="rounded-2xl border border-gray-300 bg-white shadow-sm p-4">
            <div className="font-medium mb-2">Live Script JSON Preview</div>
            <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(buildScriptFromForm(form), null, 2)}</pre>
          </div>
        </form>
      </div>
    </section>
  );
};

export default RequestNew;
