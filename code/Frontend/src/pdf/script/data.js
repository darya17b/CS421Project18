// Turns a stored script version into the plain values the PDF templates render.
import { getAgeFromDob } from "../../utils/patientAge";

// handles get
const get = (obj, path, fallback = "") => path.reduce((acc, k) => (acc ? acc[k] : undefined), obj) ?? fallback;

// handles text
const text = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return "";
  return String(value).trim();
};

// handles first text
const firstText = (...values) => {
  for (const value of values) {
    const clean = text(value);
    if (clean) return clean;
  }
  return "";
};

// handles to list
const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
};

// handles to lines
const toLines = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (entry && typeof entry === "object" ? firstText(entry.text, entry.name) : text(entry)))
      .filter(Boolean);
  }
  return text(value)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
};

// handles get icd10 code
const getIcd10Code = (value = "") => {
  const match = String(value).toUpperCase().match(/\b[A-TV-Z][0-9][0-9AB](?:\.[0-9A-TV-Z]{1,4})?\b/);
  return match ? match[0] : "";
};

// handles format long date
const formatLongDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

// handles format temperature
const formatTemperature = (reading, unit) => {
  const n = Number(reading);
  if (!Number.isFinite(n) || n <= 0) return "";
  const isFahrenheit = Number(unit) === 1;
  const c = isFahrenheit ? (n - 32) * (5 / 9) : n;
  const f = isFahrenheit ? n : c * (9 / 5) + 32;
  return `${Number(c.toFixed(1))} °C or ${Math.round(f)} °F`;
};

// handles positive number
const positive = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// handles includes door note vitals
const includesDoorNoteVitals = (value) => {
  if (value === false) return false;
  if (typeof value === "number") return value !== 0;
  const lowered = text(value).toLowerCase();
  return !["false", "0", "no", "off"].includes(lowered);
};

const ATTRIBUTE_KEYS = [
  ["Anxiety", "anxiety"],
  ["Surprise", "suprise"],
  ["Confusion", "confusion"],
  ["Guilt", "guilt"],
  ["Sadness", "sadness"],
  ["Indecision", "indecision"],
  ["Assertiveness", "assertiveness"],
  ["Frustration", "frustration"],
  ["Fear", "fear"],
  ["Anger", "anger"],
];

const ATTRIBUTE_LEVELS = ["none", "mild", "moderate", "concerning", "severe"];

// handles to attribute level
const toAttributeLevel = (value) => {
  const raw = text(value).toLowerCase();
  if (!raw) return 0;
  const named = ATTRIBUTE_LEVELS.indexOf(raw);
  if (named >= 0) return named + 1;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 0;
};

// handles to medication row
const toMedicationRow = (entry) => {
  if (!entry || typeof entry !== "object") {
    const name = text(entry);
    return name ? { generic: name, brand: "", dose: "", route: "", frequency: "", reason: "" } : null;
  }
  const generic = firstText(entry.generic, entry.generic_name, entry.name, entry.text);
  const brandRaw = firstText(entry.brand, entry.brand_name);
  const amount = text(entry.amount);
  const unit = text(entry.unit);
  const row = {
    generic,
    brand: brandRaw && brandRaw !== generic ? brandRaw : "",
    dose: amount && unit ? `${amount}${unit}` : firstText(amount, entry.dose),
    route: text(entry.route),
    frequency: text(entry.frequency),
    reason: firstText(entry.reason, entry.frequency_reason),
  };
  return Object.values(row).some(Boolean) ? row : null;
};

// handles to allergy row
const toAllergyRow = (entry) => {
  if (!entry || typeof entry !== "object") {
    const allergen = text(entry);
    return allergen ? { allergen, reaction: "", severity: "", notes: "" } : null;
  }
  const row = {
    allergen: firstText(entry.allergen, entry.text),
    reaction: text(entry.reaction),
    severity: text(entry.severity),
    notes: text(entry.notes),
  };
  return Object.values(row).some(Boolean) ? row : null;
};

// handles to family row
const toFamilyRow = (entry) => {
  if (!entry || typeof entry !== "object") {
    const notes = text(entry);
    return notes ? { relation: "", age: "", notes } : null;
  }
  const status = text(entry.status);
  const cause = text(entry.cause_of_death);
  const age = firstText(entry.age_text, positive(entry.age) || "", status);
  const notes = [
    firstText(entry.details, entry.conditions, entry.notes, entry.additonal_info),
    cause ? `Cause of death: ${cause}` : "",
  ].filter(Boolean).join("; ");
  const row = { relation: firstText(entry.family_member, entry.relation), age, notes };
  return Object.values(row).some(Boolean) ? row : null;
};

// handles build script view model
export function buildScriptViewModel(item = {}, versionObj) {
  const version = versionObj || item.versions?.[0] || { fields: {} };
  const fields = version.fields || {};
  const f = (...path) => get(fields, path, "");

  const patientName = firstText(f("patient", "name"), item.title) || "Standardized Patient";
  const diagnosis = text(f("admin", "diagnosis"));
  const icd10 = firstText(f("admin", "icd10_code"), getIcd10Code(diagnosis));
  const diagnosisNoCode = diagnosis.replace(/\b[A-TV-Z][0-9][0-9AB](?:\.[0-9A-TV-Z]{1,4})?\b/i, "").trim();
  const demographic = text(f("admin", "patient_demographic"));
  const abbreviatedDiagnosis = firstText(f("admin", "abbreviated_diagnosis"), diagnosisNoCode);
  const course = text(f("admin", "case_letter")) || text(f("admin", "class"));
  const academicYear = text(f("admin", "academic_year"));

  const modifiedRaw = firstText(version.createdAt, item.updatedAt, item.updated_at, item.createdAt);
  const modifiedDate = modifiedRaw && !Number.isNaN(new Date(modifiedRaw).getTime()) ? new Date(modifiedRaw) : new Date();
  const caseModified = formatLongDate(modifiedDate);

  const dob = firstText(f("patient", "date_of_birth"), f("patient", "dob"));
  const age = getAgeFromDob(dob, modifiedDate);

  const vitals = fields.patient?.vitals || {};
  const hr = positive(vitals.heart_rate);
  const rr = positive(vitals.respirations);
  const bpTop = positive(vitals.pressure?.top);
  const bpBottom = positive(vitals.pressure?.bottom);
  const spo2 = positive(vitals.blood_oxygen);

  const ros = fields.med_hist?.sympton_review || {};
  const pmh = fields.med_hist?.past_med_his || {};
  const preventative = fields.med_hist?.preventative_measure || {};
  const ob = pmh.obstetric_gynecologic || {};
  const social = fields.med_hist?.social_hist || {};
  const support = social.social_support || {};
  const sex = social.sex_history || {};
  const hpi = fields.sp?.current_ill_history || {};

  const allergySource = toList(fields.med_hist?.allergy_details).length
    ? toList(fields.med_hist?.allergy_details)
    : toLines(fields.med_hist?.allergies_list ?? fields.med_hist?.allergies);

  const caseTitle = [diagnosisNoCode || diagnosis, icd10].filter(Boolean).join(" ");
  const courseName = course === "General" ? "" : course;
  const scenarioName = [[courseName, icd10].filter(Boolean).join(" "), abbreviatedDiagnosis, patientName]
    .filter(Boolean)
    .join(" - ");
  const scriptName = scenarioName + (demographic ? ` (${demographic})` : "");
  const eyPrefix = academicYear ? `EY${academicYear}` : "";

  return {
    id: item.id || "",
    cover: {
      caseModified,
      caseLine: [demographic ? `${demographic}:` : "", patientName, caseTitle ? `- ${caseTitle}` : ""]
        .filter(Boolean)
        .join(" "),
      caseType: text(f("admin", "case_type")),
      contentWarning: text(f("admin", "content_warning")),
    },
    details: {
      reasonForVisit: text(f("admin", "reson_for_visit")),
      chiefConcern: text(f("admin", "chief_concern")),
      diagnosis,
      icd10,
      spAgeGroup: demographic,
      eventFormat: text(f("admin", "medical_event")),
      learnerLevel: firstText(f("admin", "learner_level"), f("admin", "academic_year")),
      authors: firstText(f("admin", "case_authors"), f("admin", "author")),
      summary: text(f("admin", "summory_of_story")),
      caseFactors: text(f("admin", "case_factors")),
      staffInstructions: text(f("admin", "staff_room_setup_instructions")),
    },
    ros: [
      ["General", ros.general],
      ["Skin", ros.skin],
      ["HEENT", ros.heent],
      ["Neck", ros.neck],
      ["Breast", ros.breast, { optional: true }],
      ["GU", ros.genitourinary],
      ["Respiratory", ros.respiratory],
      ["Cardiovascular", ros.cardiovascular],
      ["Gastrointestinal", ros.gastrointestinal],
      ["Peripheral Vascular", ros.peripheral_vascular],
      ["Musculoskeletal", ros.musculoskeletal],
      ["Psychiatric", ros.psychiatric],
      ["Neurological", ros.neurologival],
      ["Hematologic/Endocrine", [text(ros.hematologic), text(ros.endocine)].filter(Boolean).join(", ")],
    ].map(([label, value, options]) => ({ label, value: toLines(value).join("\n"), ...options })),
    doorNote: {
      patientName,
      dob: dob ? `${dob}${age === null ? "" : ` (${age}y as of ${caseModified})`}` : "",
      reasonForVisit: firstText(f("admin", "reson_for_visit"), f("patient", "visit_reason")),
      vitalsIncluded: includesDoorNoteVitals(fields.patient?.vitals_included_on_door_note),
      heartRate: hr ? `${hr} beats per minute` : "",
      bloodPressure: bpTop || bpBottom ? `${bpTop || "?"} / ${bpBottom || "?"}` : "",
      respiratoryRate: rr ? `${rr} breaths per minute` : "",
      oxygenSaturation: spo2 ? `${spo2} % on room air` : "",
      temperature: formatTemperature(vitals.temp?.reading, vitals.temp?.unit),
      context: text(f("patient", "context")),
      task: text(f("patient", "task")),
      duration: text(f("patient", "encounter_duration")),
    },
    vccItems: {
      demographics: demographic,
      supplies: text(f("admin", "special_supplies")),
    },
    portrayal: {
      name: patientName,
      dob,
      openingStatement: text(f("sp", "opening_statement")).replace(/\s*\r?\n\s*/g, " "),
      disclosure: [
        ["Other information offered spontaneously", f("sp", "disclosure_framework", "offered_spontaneously")],
        ["Information elicited when generally prompted", f("sp", "disclosure_framework", "elicited_generally_prompted")],
        ["Information hidden until asked directly", f("sp", "disclosure_framework", "hidden_until_directly_asked")],
        [
          "Information to not mistake: Vital info that need to be relayed correctly.",
          f("sp", "disclosure_framework", "must_relay_accurately"),
        ],
      ].map(([label, value]) => ({ label, value: text(value) })),
      attributes: ATTRIBUTE_KEYS.map(([label, key]) => ({
        label,
        level: toAttributeLevel(f("sp", "character_attributes", key)) || toAttributeLevel(f("sp", "attributes", key)),
      })),
    },
    gender: [
      ["Pronouns", f("sp", "gender_identity_expression", "pronouns")],
      ["Identifies as", f("sp", "gender_identity_expression", "identifies_as")],
      ["Sex assigned at birth", f("sp", "gender_identity_expression", "sex_assigned_at_birth")],
      ["Gender presentation", f("sp", "gender_identity_expression", "gender_presentation")],
    ].map(([label, value]) => ({ label, value: text(value) })),
    behaviors: {
      fields: [
        ["Affect", f("sp", "presentation_behaviors", "affect")],
        ["Body language", firstText(f("sp", "presentation_behaviors", "body_language"), f("sp", "physical_chars"))],
        ["Facial expression", f("sp", "presentation_behaviors", "facial_expression")],
        ["Eye contact", f("sp", "presentation_behaviors", "eye_contact")],
        ["Speech", f("sp", "presentation_behaviors", "speech")],
      ].map(([label, value]) => ({ label, value: text(value) })),
      note: text(f("sp", "presentation_behaviors", "note")),
    },
    hpi: {
      chiefConcern: firstText(f("admin", "chief_concern"), f("patient", "visit_reason")),
      fields: [
        ["Place/Location of Symptoms", hpi.body_location],
        ["Setting", hpi.symptom_settings],
        ["Timing", hpi.symptom_timing],
        ["Associated Symptoms", hpi.associated_symptoms],
        ["Radiation", hpi.radiation_of_symptoms],
        ["Quality", hpi.symptom_quality],
        ["Alleviating Factors", hpi.alleviating_factors],
        ["Aggravating Factors", hpi.aggravating_factors],
      ].map(([label, value]) => ({ label, value: toLines(value).join("\n") })),
      pain: Math.max(0, Math.min(10, Math.round(Number(hpi.pain) || 0))),
      painNotes: text(hpi.pain_notes),
      markers: toList(hpi.symptom_diagram)
        .map((m) => ({ x: Number(m?.x), y: Number(m?.y) }))
        .filter((m) => Number.isFinite(m.x) && Number.isFinite(m.y))
        .map((m) => ({ x: Math.max(0, Math.min(1, m.x)), y: Math.max(0, Math.min(1, m.y)) })),
    },
    pmh: [
      ["Childhood Illnesses", pmh.child_hood_illness],
      ["Trauma", pmh.trauma],
      ["Medical Illnesses & Hospitalizations", pmh.illness_and_hospital],
      ["Surgeries", pmh.surgeries],
      ["Transfusion History", pmh.transfusion],
      ["Psychiatric History", pmh.psychiatric],
      ["Immunizations", preventative.immunization],
      ["Screening Tests", preventative.screening_tests],
      ["Alternative/Complementary Health Care", preventative.alternate_health_care],
      ["Travel/Exposure History", preventative.travel_exposure],
    ].map(([label, value]) => ({ label, value: toLines(value).join("\n") })),
    obstetric: (() => {
      const textFields = [
        ["Menstrual History", ob.menstrual_history],
        ["Last Menstrual Period", ob.lmp],
        ["Last Menstrual Period Details", ob.lmp_details],
      ].map(([label, value]) => ({ label, value: text(value) }));
      const hasOb = textFields.some((field) => field.value) || positive(ob.pregnancies) || positive(ob.births);
      if (!hasOb) {
        const legacy = toLines(pmh.obe_and_gye).join("\n");
        return legacy ? [{ label: "History", value: legacy }] : [];
      }
      return [
        ...textFields,
        { label: "Pregnancies", value: String(positive(ob.pregnancies)) },
        { label: "Births", value: String(positive(ob.births)) },
        { label: "If pregnancies ≠ births, explain", value: text(ob.pregnancy_births_explanation) },
      ].filter((field) => field.value);
    })(),
    medications: toList(fields.med_hist?.medications).map(toMedicationRow).filter(Boolean),
    nonPrescriptionMedications: toLines(fields.med_hist?.non_prescription_medications),
    allergies: allergySource.map(toAllergyRow).filter(Boolean),
    family: {
      general: text(f("med_hist", "family_general_notes")),
      rows: toList(fields.med_hist?.family_hist).map(toFamilyRow).filter(Boolean),
    },
    social: {
      personalBackground: text(social.personal_background),
      nutritionExercise: text(social.nutrion_and_exercise),
      employment: [
        ["Level of Education", social.level_of_education],
        ["Occupation", firstText(social.occupation, social.level_of_education ? "" : social.community_and_employment)],
        ["Health Literacy", social.health_literacy],
        ["Military History", social.military_service],
      ].map(([label, value]) => ({ label, value: text(value) })),
      safetyMeasures: text(social.safety_measure),
      lifeStressors: text(social.life_stressors),
      substanceUse: toLines(social.substance_use),
      support: [
        ["Family & Friends", support.family_friends],
        ["Financial", support.financial],
        ["Health care", support.healthcare_access_insurance],
        ["Religious or Community Groups", support.religious_or_community_groups],
      ].map(([label, value]) => ({ label, value: text(value) })),
      sexualHistory: [
        ["Current sexual partners", sex.current_partners],
        ["Lifetime sexual partners", firstText(sex.lifetime_partners, sex.past_partners)],
        ["Contraceptives", sex.contraceptives],
        ["HIV Risk History", sex.hiv_risk_history],
        ["Safety in relationship", sex.safety_in_relations],
      ].map(([label, value]) => ({ label, value: text(value) })),
      // other_details falls back to a summary of the fields above when nothing else was entered.
      sexualHistoryOther: toLines(sex.other_details).every((line) =>
        /^(Contraceptives|HIV Risk History|Safety in Relationships):/i.test(line)
      )
        ? ""
        : text(sex.other_details),
    },
    otherNotes: {
      spNotes: text(f("sp", "other_sp_notes")),
      physicalExam: text(f("admin", "physical_examination")),
      prompts: [
        ["Provoking questions – ask the question below", f("special", "provoking_question")],
        ["Questions the patient MUST ask / statements the patient must make", f("special", "must_ask")],
        ["Questions the patient will ask if given the opportunity", f("special", "oppurtunity")],
      ].map(([label, value]) => ({ label, items: toLines(value) })),
      additionalInstructions: text(f("special", "feed_back")),
    },
    feedback: {
      enabled: Boolean(get(fields, ["sp", "sp_feedback_enabled"], false)),
      notes: text(f("sp", "custom_feedback_notes")),
    },
    admin: {
      names: [
        ["Script Name", scriptName],
        ["Scenario Name", scenarioName],
        ["MedCards Name", courseName ? ["Medication Cards -", eyPrefix, courseName].filter(Boolean).join(" ") : ""],
        ["Folder Name", courseName ? [eyPrefix, courseName].filter(Boolean).join(" ") : ""],
        ["Script Request Name", `Case Request - ${scriptName}`],
      ].map(([label, value]) => ({ label, value })),
      writeInNotes: text(f("admin", "final_page_notes")),
    },
  };
}
