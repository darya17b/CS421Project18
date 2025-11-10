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
        heart_rate: '',
        respirations: '',
        pressure: { top: '', bottom: '' },
        blood_oxygen: '',
        temp: { reading: '', unit: '' },
      },
      visit_reason: "",
      context: "",
      task: "",
      encounter_duration: "",
    },
    sp: {
      opening_statement: "",
      attributes: {
        anxiety: '',
        suprise: '',
        confusion: '',
        guilt: '',
        sadness: '',
        indecision: '',
        assertiveness: '',
        frustration: '',
        fear: '',
        anger: '',
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
        pain: '',
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
      if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
      cur = cur[key];
    }
    cur[path[path.length - 1]] = value;
    return copy;
  }

  const setField = (path, value) => setForm(prev => setDeep(prev, path, value));
  const setNumberField = (path, value) => setForm(prev => setDeep(prev, path, value === '' ? '' : Number(value)));
  const getField = (path) => path.reduce((acc, k) => (acc ? acc[k] : undefined), form);

  const onSubmit = async (e) => {
    e.preventDefault();
    const script = buildScriptFromForm(form);

    try {
      const { api } = await import("../api/client");
      await api.createDocument(script);
      toast.show("Request submitted", { type: "success" });
      navigate("/forms-search");
      // list reloads from backend on arrival
      setTimeout(() => window.location.reload(), 0);
    } catch (err) {
      toast.show("Creation failed", { type: "error" });
    }
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
              <input type="number" value={getField(['patient','vitals','heart_rate']) ?? ''} onChange={(e) => setNumberField(['patient','vitals','heart_rate'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Respirations</label>
              <input type="number" value={getField(['patient','vitals','respirations']) ?? ''} onChange={(e) => setNumberField(['patient','vitals','respirations'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Blood Oxygen</label>
              <input type="number" value={getField(['patient','vitals','blood_oxygen']) ?? ''} onChange={(e) => setNumberField(['patient','vitals','blood_oxygen'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pressure Top</label>
              <input type="number" value={getField(['patient','vitals','pressure','top']) ?? ''} onChange={(e) => setNumberField(['patient','vitals','pressure','top'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pressure Bottom</label>
              <input type="number" value={getField(['patient','vitals','pressure','bottom']) ?? ''} onChange={(e) => setNumberField(['patient','vitals','pressure','bottom'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Temperature Reading</label>
              <input type="number" value={getField(['patient','vitals','temp','reading']) ?? ''} onChange={(e) => setNumberField(['patient','vitals','temp','reading'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Temperature Unit</label>
              <select value={getField(['patient','vitals','temp','unit']) ?? ''} onChange={(e) => setNumberField(['patient','vitals','temp','unit'], e.target.value)} className="w-full rounded border px-3 py-2">
                <option value="">Select unit</option>
                <option value="0">Celcius</option>
                <option value="1">Fahrenheit</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded border p-4 bg-white">
          <h3 className="font-semibold mb-3">SP Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Opening Statement</label>
              <textarea rows={2} value={getField(['sp','opening_statement']) || ''} onChange={(e) => setField(['sp','opening_statement'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Physical Characteristics</label>
              <textarea rows={2} value={getField(['sp','physical_chars']) || ''} onChange={(e) => setField(['sp','physical_chars'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            {['anxiety','suprise','confusion','guilt','sadness','indecision','assertiveness','frustration','fear','anger'].map((k) => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1">{k[0].toUpperCase()+k.slice(1)}</label>
                <input type="number" min={0} max={10} value={getField(['sp','attributes',k]) ?? ''} onChange={(e) => setNumberField(['sp','attributes',k], e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
            ))}
            <div className="sm:col-span-2 font-medium">Current Illness History</div>
            {[
              ['body_location','Body Location'],
              ['symptom_settings','Symptom Settings'],
              ['symptom_timing','Symptom Timing'],
              ['associated_symptoms','Associated Symptoms'],
              ['radiation_of_symptoms','Radiation of Symptoms'],
              ['symptom_quality','Symptom Quality'],
              ['alleviating_factors','Alleviating Factors'],
              ['aggravating_factors','Aggravating Factors'],
            ].map(([k,label]) => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input value={getField(['sp','current_ill_history',k]) || ''} onChange={(e) => setField(['sp','current_ill_history',k], e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium mb-1">Pain</label>
              <input type="number" min={0} max={10} value={getField(['sp','current_ill_history','pain']) ?? ''} onChange={(e) => setNumberField(['sp','current_ill_history','pain'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
          </div>
        </div>

        <div className="rounded border p-4 bg-white">
          <h3 className="font-semibold mb-3">Medical History</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 font-medium">Medications</div>
            {[
              ['name','Name'],
              ['brand','Brand'],
              ['generic','Generic Name'],
              ['dose','Dose'],
              ['frequency','Frequency'],
              ['reason','Reason'],
              ['startDate','Date Started'],
              ['otherNotes','Other Notes'],
            ].map(([k,label]) => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input value={getField(['med_hist','medications',k]) || ''} onChange={(e) => setField(['med_hist','medications',k], e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Allergies</label>
              <input value={getField(['med_hist','allergies']) || ''} onChange={(e) => setField(['med_hist','allergies'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div className="sm:col-span-2 font-medium">Past Medical History</div>
            {[
              ['child_hood_illness','Childhood Illness'],
              ['illness_and_hospital','Medical Illnesses and Hospitalizations'],
              ['surgeries','Surgeries'],
              ['obe_and_gye','Obstetric or Gynecologic History'],
              ['transfusion','Transfusion History'],
              ['psychiatric','Psychiatric History'],
              ['trauma','Trauma'],
            ].map(([k,label]) => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input value={getField(['med_hist','past_med_his',k]) || ''} onChange={(e) => setField(['med_hist','past_med_his',k], e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
            ))}
            <div className="sm:col-span-2 font-medium">Preventative Measures</div>
            {[
              ['immunization','Immunizations'],
              ['alternate_health_care','Alternative/Complementary Health Care'],
              ['travel_exposure','Travel/Exposure History'],
            ].map(([k,label]) => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input value={getField(['med_hist','preventative_measure',k]) || ''} onChange={(e) => setField(['med_hist','preventative_measure',k], e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
            ))}
            <div className="sm:col-span-2 font-medium">Family History (single entry)</div>
            {[
              ['health_status','Health Status'],
              ['cause_of_death','Cause of Death'],
              ['additonal_info','Additional Info'],
            ].map(([k,label]) => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input value={getField(['med_hist','family_hist',k]) || ''} onChange={(e) => setField(['med_hist','family_hist',k], e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium mb-1">age</label>
              <input type="number" value={getField(['med_hist','family_hist','age']) ?? ''} onChange={(e) => setNumberField(['med_hist','family_hist','age'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div className="sm:col-span-2 font-medium">Social History</div>
            {[
              ['personal_background','Personal Background'],
              ['nutrion_and_exercise','Nutritional and Exercise History'],
              ['community_and_employment','Community and Employment History'],
              ['safety_measure','Safety Measures'],
              ['life_stressors','Significant Life Stressors'],
              ['substance_use','Substance Use'],
            ].map(([k,label]) => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input value={getField(['med_hist','social_hist',k]) || ''} onChange={(e) => setField(['med_hist','social_hist',k], e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
            ))}
            <div className="sm:col-span-2 font-medium">Sexual History</div>
            <div>
              <label className="block text-sm font-medium mb-1">current_partners</label>
              <input type="number" value={getField(['med_hist','social_hist','sex_history','current_partners']) ?? ''} onChange={(e) => setNumberField(['med_hist','social_hist','sex_history','current_partners'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">past_partners</label>
              <input type="number" value={getField(['med_hist','social_hist','sex_history','past_partners']) ?? ''} onChange={(e) => setNumberField(['med_hist','social_hist','sex_history','past_partners'], e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            {[
              ['contraceptives','Contraceptives'],
              ['hiv_risk_history','HIV Risk History'],
              ['safety_in_relations','Safety in Relationships'],
            ].map(([k,label]) => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input value={getField(['med_hist','social_hist','sex_history',k]) || ''} onChange={(e) => setField(['med_hist','social_hist','sex_history',k], e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
            ))}
            <div className="sm:col-span-2 font-medium">Review Of Symptoms</div>
            {[
              ['general','General'],
              ['skin','Skin'],
              ['heent','HEENT'],
              ['neck','Neck'],
              ['breast','Breast'],
              ['respiratory','Respiratory'],
              ['cardiovascular','Cardiovascular'],
              ['gastrointestinal','Gastrointestinal'],
              ['peripheral_vascular','Peripheral Vascular'],
              ['musculoskeletal','Musculoskeletal'],
              ['psychiatric','Psychiatric'],
              ['neurologival','Neurological'],
              ['endocine','Endocrine'],
            ].map(([k,label]) => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input value={getField(['med_hist','sympton_review',k]) || ''} onChange={(e) => setField(['med_hist','sympton_review',k], e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border p-4 bg-white">
          <h3 className="font-semibold mb-3">Special Instructions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['provoking_question','Provoking Question'],
              ['must_ask','Must Ask'],
              ['oppurtunity','Opportunity'],
              ['opening_statement','Opening Statement'],
              ['feed_back','Feedback'],
            ].map(([k,label]) => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input value={getField(['special',k]) || ''} onChange={(e) => setField(['special',k], e.target.value)} className="w-full rounded border px-3 py-2" />
              </div>
            ))}
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
