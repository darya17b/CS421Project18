import { useNavigate, useLocation, useBeforeUnload } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";
import DOBDatePicker from "../components/DOBDatePicker";
import { buildScriptFromForm } from "../utils/scriptFormat";
import { collapseDoorNoteArtifacts, dedupeArtifacts } from "../utils/artifacts";
import hpiDiagram from "../assets/hpi-diagram.png";

// handles empty text row
const emptyTextRow = () => ({ text: "" });
// handles empty prescription row
const emptyPrescriptionRow = () => ({
  generic_name: "",
  brand_name: "",
  route: "",
  amount: "",
  unit: "",
  frequency: "",
  reason: "",
});
// handles empty non prescription row
const emptyNonPrescriptionRow = () => ({
  generic_name: "",
  brand_name: "",
  route: "",
  amount: "",
  unit: "",
  frequency: "",
  reason: "",
});
// handles empty allergy row
const emptyAllergyRow = () => ({
  allergen: "",
  reaction: "",
  severity: "",
  notes: "",
});
// handles empty obstetric gynecologic
const emptyObstetricGynecologic = () => ({
  menstrual_history: "",
  lmp: "",
  lmp_details: "",
  pregnancies: "",
  births: "",
  pregnancy_births_explanation: "",
});

// handles empty family row
const emptyFamilyRow = () => ({
  family_member: "",
  age_text: "",
  details: "",
});

// handles format medication entry
const formatMedicationEntry = (entry) => {
  if (typeof entry === "string") return String(entry || "").trim();
  if (!entry || typeof entry !== "object") return "";
  const genericName = String(entry.generic_name || entry.generic || "").trim();
  const brandName = String(entry.brand_name || entry.brand_substance || entry.brand || "").trim();
  const medicationName = String(entry.name || "").trim();
  const name = genericName && brandName
    ? `${genericName} (${brandName})`
    : genericName || brandName || medicationName;
  const route = String(entry.route || "").trim();
  const amount = String(entry.amount || "").trim();
  const unit = String(entry.unit || "").trim();
  const dose = String(entry.dose || "").trim();
  const amountWithUnit = amount && unit ? `${amount}${unit}` : amount || dose;
  const frequency = String(entry.frequency || "").trim();
  const reason = String(entry.reason || entry.frequency_reason || "").trim();
  const schedule = [frequency ? `frequency: ${frequency}` : "", reason ? `reason: ${reason}` : ""]
    .filter(Boolean)
    .join(", ");
  return [[name, amountWithUnit].filter(Boolean).join(" "), route ? `route: ${route}` : "", schedule]
    .filter(Boolean)
    .join(" - ")
    .trim();
};

// handles format allergy entry
const formatAllergyEntry = (entry) => {
  if (typeof entry === "string") return String(entry || "").trim();
  if (!entry || typeof entry !== "object") return "";
  const allergen = String(entry.allergen || entry.text || "").trim();
  const reaction = String(entry.reaction || "").trim();
  const severity = String(entry.severity || "").trim();
  const notes = String(entry.notes || "").trim();
  return [
    allergen,
    reaction ? `reaction: ${reaction}` : "",
    severity ? `severity: ${severity}` : "",
    notes ? `notes: ${notes}` : "",
  ]
    .filter(Boolean)
    .join(" | ")
    .trim();
};

// handles extract text list
const extractTextList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (!entry || typeof entry !== "object") return "";
        if (entry.text) return entry.text;
        if (
          entry.generic_name || entry.brand_name || entry.route || entry.amount || entry.unit || entry.frequency || entry.reason
          || entry.brand_substance || entry.frequency_reason || entry.brand || entry.generic || entry.name || entry.dose
        ) {
          return formatMedicationEntry(entry);
        }
        if (entry.allergen || entry.reaction || entry.severity || entry.notes) {
          return formatAllergyEntry(entry);
        }
        return "";
      })
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }
  if (value && typeof value === "object" && (value.allergen || value.reaction || value.severity || value.notes)) {
    const allergy = formatAllergyEntry(value);
    return allergy ? [allergy] : [];
  }
  if (
    value && typeof value === "object"
    && (value.generic_name || value.brand_name || value.route || value.amount || value.unit || value.frequency || value.reason
      || value.brand_substance || value.frequency_reason || value.brand || value.generic || value.name || value.dose)
  ) {
    const medication = formatMedicationEntry(value);
    return medication ? [medication] : [];
  }
  const text = String(value || "").trim();
  return text ? [text] : [];
};

// handles to bulleted text
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

const characterAttributeFields = [
  ["anxiety", "Anxiety"],
  ["suprise", "Surprise"],
  ["confusion", "Confusion"],
  ["guilt", "Guilt"],
  ["sadness", "Sadness"],
  ["indecision", "Indecision"],
  ["assertiveness", "Assertiveness"],
  ["frustration", "Frustration"],
  ["fear", "Fear"],
  ["anger", "Anger"],
];

const characterAttributeLevelOptions = [
  { value: "", label: "Select level" },
  { value: "None", label: "None" },
  { value: "Mild", label: "Mild" },
  { value: "Moderate", label: "Moderate" },
  { value: "Concerning", label: "Concerning" },
  { value: "Severe", label: "Severe" },
];

const disclosureFrameworkFields = [
  [
    "offered_spontaneously",
    "Information offered spontaneously",
    "Disclosed after any open-ended question",
  ],
  [
    "elicited_generally_prompted",
    "Information elicited when generally prompted",
    "Open-ended question about a specific topic",
  ],
  [
    "hidden_until_directly_asked",
    "Information hidden until asked directly",
    "Requires specific questioning",
  ],
  [
    "must_relay_accurately",
    "Information that MUST be relayed accurately",
    "",
  ],
];

const presentationBehaviorFields = [
  ["affect", "Affect"],
  ["body_language", "Body Language"],
  ["facial_expression", "Facial Expression"],
  ["eye_contact", "Eye Contact"],
  ["speech", "Speech"],
  ["note", "Note"],
];

const genderIdentityFields = [
  ["pronouns", "Pronouns"],
  ["identifies_as", "Identifies as"],
  ["sex_assigned_at_birth", "Sex assigned at birth"],
  ["gender_presentation", "Gender presentation"],
];

const obstetricGynecologicTextFields = [
  ["menstrual_history", "Menstrual History"],
  ["lmp", "LMP"],
  ["lmp_details", "LMP Details"],
  ["pregnancy_births_explanation", "If pregnancies \u2260 births, explain"],
];

const socialHistorySplitFields = [
  ["level_of_education", "Level of Education"],
  ["occupation", "Occupation"],
  ["health_literacy", "Health Literacy"],
  ["military_service", "Military Service"],
];

const familyMemberOptions = [
  "Mother",
  "Father",
  "Sister",
  "Brother",
  "Daughter",
  "Son",
  "Maternal Grandmother",
  "Maternal Grandfather",
  "Paternal Grandmother",
  "Paternal Grandfather",
  "Aunt",
  "Uncle",
  "Cousin",
  "Other",
];

// handles to multiline text
const toMultilineText = (value) => extractTextList(value).join("\n");

// handles build symptom review payload
const buildSymptomReviewPayload = (symptomReview = {}) =>
  reviewOfSystemsFields.reduce((acc, [key]) => {
    acc[key] = toMultilineText(symptomReview?.[key]);
    return acc;
  }, {});

// handles build script request payload
const buildScriptRequestPayload = (form = {}, draftScript = null, artifacts = []) => {
  const now = new Date().toISOString();
  const selectedCaseType = normalizeCaseType(form.admin?.case_type) || "Standardized";
  return {
    reason_for_visit: form.admin?.reson_for_visit || form.patient?.visit_reason || "",
    simulation_modal: selectedCaseType,
    case_type: selectedCaseType,
    case_setting: form.admin?.case_setting || form.patient?.context || "",
    chief_concern: form.admin?.chief_concern || "",
    diagnosis: form.admin?.diagnosis || "",
    abbreviated_diagnosis: form.admin?.abbreviated_diagnosis || "",
    icd10_code: form.admin?.icd10_code || "",
    event: form.admin?.medical_event || "",
    pedagogy: form.admin?.learner_level || "",
    class: form.admin?.case_letter || form.admin?.class || "",
    learner_level: form.admin?.learner_level || "",
    summary_patient_story: form.admin?.summory_of_story || "",
    pert_aspects_patient_case: form.admin?.case_factors || "",
    physical_chars:
      form.sp?.presentation_behaviors?.body_language || form.sp?.physical_chars || "",
    student_expec: toBulletedText(form.admin?.student_expectations),
    learning_objectives: toBulletedText(form.admin?.learning_objectives),
    spec_phyis_findings: form.sp?.current_ill_history?.symptom_quality || "",
    patient_demog: form.admin?.patient_demographic || "",
    vitals_included_on_door_note:
      form.patient?.vitals_included_on_door_note === false ? false : true,
    staff_room_setup_instructions: form.admin?.staff_room_setup_instructions || "",
    content_warning: form.admin?.content_warning || "",
    special_needs: toMultilineText(form.special?.oppurtunity),
    case_factors: form.admin?.case_factors || "",
    additonal_ins: form.special?.feed_back || "",
    final_page_notes: form.admin?.final_page_notes || "",
    other_sp_notes: form.sp?.other_sp_notes || "",
    sp_feedback_enabled: Boolean(form.sp?.sp_feedback_enabled),
    custom_feedback_notes: form.sp?.custom_feedback_notes || "",
    sympt_review: buildSymptomReviewPayload(form.med_hist?.sympton_review),
    status: "Pending",
    note: "",
    created_at: now,
    updated_at: now,
    draft_script: draftScript,
    artifacts,
  };
};

// handles format family history entry
const formatFamilyHistoryEntry = (entry) => {
  if (!entry || typeof entry !== "object") return "";
  const member = String(entry.family_member || "").trim();
  const ageText = String(entry.age_text || entry.age || "").trim();
  const details = String(entry.details || "").trim();
  return [
    member,
    ageText ? `Age: ${ageText}` : "",
    details,
  ].filter(Boolean).join(" - ").trim();
};

// handles clone value
const cloneValue = (value) => JSON.parse(JSON.stringify(value));

// handles merge deep
const mergeDeep = (baseValue, sourceValue) => {
  if (Array.isArray(sourceValue)) {
    return sourceValue.map((entry) =>
      entry && typeof entry === "object" ? mergeDeep(Array.isArray(entry) ? [] : {}, entry) : entry
    );
  }
  if (sourceValue && typeof sourceValue === "object") {
    const baseObject =
      baseValue && typeof baseValue === "object" && !Array.isArray(baseValue) ? baseValue : {};
    const next = { ...baseObject };
    Object.keys(sourceValue).forEach((key) => {
      next[key] = mergeDeep(baseObject[key], sourceValue[key]);
    });
    return next;
  }
  return sourceValue;
};

// handles first non empty string
const firstNonEmptyString = (...values) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
};

// handles has text
const hasText = (value) => String(value ?? "").trim().length > 0;

// handles first defined boolean
const firstDefinedBoolean = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const text = String(value).trim().toLowerCase();
    if (text === "true" || text === "1" || text === "yes" || text === "on") return true;
    if (text === "false" || text === "0" || text === "no" || text === "off") return false;
  }
  return false;
};

// handles normalize case type
const normalizeCaseType = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) continue;
    if (text.includes("standardized")) return "Standardized";
    if (text.includes("simulated")) return "Simulated";
  }
  return "";
};

// handles normalize character attribute level
const normalizeCharacterAttributeLevel = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const lowered = text.toLowerCase();
  if (lowered === "none" || text === "1") return "None";
  if (lowered === "mild" || text === "2") return "Mild";
  if (lowered === "moderate" || text === "3") return "Moderate";
  if (lowered === "concerning" || text === "4") return "Concerning";
  if (lowered === "severe" || text === "5") return "Severe";
  return "";
};

// handles split multiline entries
const splitMultilineEntries = (value) => String(value || "")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

// handles normalize medication rows for form
const normalizeMedicationRowsForForm = (value, rowFactory, options = {}) => {
  const { ensureAtLeastOne = true } = options;
  const rawRows = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? splitMultilineEntries(value)
      : value
        ? [value]
        : [];
  const rows = rawRows
    .map((entry) => {
      if (typeof entry === "string") {
        const text = entry.trim();
        if (!text) return null;
        return {
          ...rowFactory(),
          brand_name: text,
        };
      }
      if (!entry || typeof entry !== "object") return null;
      const genericName = String(entry.generic_name || entry.generic || "").trim();
      const brandName = String(
        entry.brand_name || entry.brand_substance || entry.brand || entry.name || ""
      ).trim();
      const route = String(entry.route || "").trim();
      const amount = String(entry.amount || "").trim();
      const unit = String(entry.unit || "").trim();
      const frequency = String(entry.frequency || "").trim();
      const reason = String(entry.reason || entry.frequency_reason || "").trim();
      const dose = String(entry.dose || "").trim();
      const amountValue = amount || dose;
      const nextRow = {
        ...rowFactory(),
        ...entry,
        generic_name: genericName,
        brand_name: brandName,
        route,
        amount: amountValue,
        unit,
        frequency,
        reason,
      };
      return nextRow;
    })
    .filter((entry) => {
      if (!entry) return false;
      return [
        entry.generic_name,
        entry.brand_name,
        entry.route,
        entry.amount,
        entry.unit,
        entry.frequency,
        entry.reason,
      ].some((field) => hasText(field));
    });
  if (rows.length) return rows;
  return ensureAtLeastOne ? [rowFactory()] : [];
};

// handles normalize allergy rows for form
const normalizeAllergyRowsForForm = (value, options = {}) => {
  const { ensureAtLeastOne = true } = options;
  const rawRows = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? splitMultilineEntries(value)
      : value
        ? [value]
        : [];
  const rows = rawRows
    .map((entry) => {
      if (typeof entry === "string") {
        const text = entry.trim();
        if (!text) return null;
        return {
          ...emptyAllergyRow(),
          allergen: text,
        };
      }
      if (!entry || typeof entry !== "object") return null;
      const allergen = String(entry.allergen || entry.text || "").trim();
      const reaction = String(entry.reaction || "").trim();
      const severity = String(entry.severity || "").trim();
      const notes = String(entry.notes || "").trim();
      return {
        ...emptyAllergyRow(),
        ...entry,
        allergen,
        reaction,
        severity,
        notes,
      };
    })
    .filter((entry) =>
      entry && [entry.allergen, entry.reaction, entry.severity, entry.notes].some((field) => hasText(field))
    );
  if (rows.length) return rows;
  return ensureAtLeastOne ? [emptyAllergyRow()] : [];
};

// handles normalize family history rows for form
const normalizeFamilyHistoryRowsForForm = (value, options = {}) => {
  const { ensureAtLeastOne = true } = options;
  const rawRows = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? splitMultilineEntries(value)
      : value
        ? [value]
        : [];
  const rows = rawRows
    .map((entry) => {
      if (typeof entry === "string") {
        const text = entry.trim();
        if (!text) return null;
        return {
          ...emptyFamilyRow(),
          details: text,
        };
      }
      if (!entry || typeof entry !== "object") return null;
      const familyMember = String(entry.family_member || entry.relation || "").trim();
      const ageText = String(entry.age_text || entry.age || "").trim();
      const details = String(
        entry.details
        || entry.conditions
        || entry.health_status
        || entry.notes
        || entry.additonal_info
        || ""
      ).trim();
      const additionalLegacy = extractTextList(entry.additional_details).join("\n");
      const combinedDetails = [details, additionalLegacy]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join("\n");
      return {
        ...emptyFamilyRow(),
        ...entry,
        family_member: familyMember,
        age_text: ageText,
        details: combinedDetails,
      };
    })
    .filter((entry) =>
      entry && [entry.family_member, entry.age_text, entry.details].some((field) => hasText(field))
    );
  if (rows.length) return rows;
  return ensureAtLeastOne ? [emptyFamilyRow()] : [];
};

// handles to number or empty
const toNumberOrEmpty = (value) => {
  if (value === 0 || value === "0") return 0;
  if (value === undefined || value === null || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
};

// handles normalize obstetric gynecologic for form
const normalizeObstetricGynecologicForForm = (value, legacyValue = "") => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      ...emptyObstetricGynecologic(),
      ...value,
      menstrual_history: firstNonEmptyString(value.menstrual_history, legacyValue),
      lmp: String(value.lmp || "").trim(),
      lmp_details: String(value.lmp_details || "").trim(),
      pregnancies: toNumberOrEmpty(value.pregnancies),
      births: toNumberOrEmpty(value.births),
      pregnancy_births_explanation: String(value.pregnancy_births_explanation || "").trim(),
    };
  }
  const fallbackText = firstNonEmptyString(value, legacyValue);
  return {
    ...emptyObstetricGynecologic(),
    menstrual_history: fallbackText,
  };
};

// handles normalize social history for form
const normalizeSocialHistoryForForm = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const sexHistory = source.sex_history && typeof source.sex_history === "object"
    ? source.sex_history
    : {};
  const legacyCombined = String(source.community_and_employment || "").trim();
  const levelOfEducation = String(source.level_of_education || "").trim();
  const occupation = String(source.occupation || "").trim();
  const healthLiteracy = String(source.health_literacy || "").trim();
  const militaryService = String(source.military_service || "").trim();
  const currentPartnersRaw = sexHistory.current_partners;
  const lifetimePartnersRaw = sexHistory.lifetime_partners ?? sexHistory.past_partners;
  const currentPartners = toNumberOrEmpty(currentPartnersRaw);
  const lifetimePartners = toNumberOrEmpty(lifetimePartnersRaw);
  const otherDetails = firstNonEmptyString(
    sexHistory.other_details,
    [
      sexHistory.contraceptives ? `Contraceptives: ${sexHistory.contraceptives}` : "",
      sexHistory.hiv_risk_history ? `HIV Risk History: ${sexHistory.hiv_risk_history}` : "",
      sexHistory.safety_in_relations ? `Safety in Relationships: ${sexHistory.safety_in_relations}` : "",
      ...extractTextList(source.sexual_history_entries),
    ].filter(Boolean).join("\n")
  );
  return {
    ...source,
    level_of_education: levelOfEducation,
    occupation: occupation || (!levelOfEducation && !healthLiteracy && !militaryService ? legacyCombined : ""),
    health_literacy: healthLiteracy,
    military_service: militaryService,
    sex_history: {
      ...sexHistory,
      current_partners: currentPartners,
      past_partners: lifetimePartners,
      lifetime_partners: lifetimePartners,
      other_details: otherDetails,
    },
  };
};

// handles unique artifacts
const uniqueArtifacts = (artifacts = []) => {
  return collapseDoorNoteArtifacts(dedupeArtifacts(artifacts));
};

// handles get request artifacts
const getRequestArtifacts = (requestItem) => {
  const raw = requestItem?.raw || requestItem || {};
  const fromRequest = Array.isArray(raw.artifacts) ? raw.artifacts : [];
  const fromDraft = Array.isArray(raw.draft_script?.artifacts) ? raw.draft_script.artifacts : [];
  return uniqueArtifacts([...fromRequest, ...fromDraft]);
};

// handles get request draft versions
const getRequestDraftVersions = (requestItem) => {
  const raw = requestItem?.raw || requestItem || {};
  const direct = raw?.draft_versions;
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === "object") {
    return Object.values(direct).filter((entry) => entry && typeof entry === "object");
  }
  return [];
};

// handles resolve request version fields
const resolveRequestVersionFields = (requestItem, versionKey = "request-draft") => {
  const raw = requestItem?.raw || requestItem || {};
  const normalizedVersionKey = String(versionKey || "request-draft").trim().toLowerCase();
  if (!normalizedVersionKey || normalizedVersionKey === "request-draft" || normalizedVersionKey === "draft") {
    if (raw.draft_script && typeof raw.draft_script === "object") return raw.draft_script;
    if (raw.patient && raw.admin && typeof raw === "object") return raw;
    return null;
  }
  const targetVersion = normalizedVersionKey.startsWith("saved:")
    ? normalizedVersionKey.slice("saved:".length)
    : normalizedVersionKey;
  const savedVersions = getRequestDraftVersions(raw);
  const selected = savedVersions.find(
    (entry) => String(entry?.version || "").trim().toLowerCase() === targetVersion
  );
  const fields =
    selected?.fields
    || selected?.document
    || selected?.draft_script
    || selected?.payload
    || selected?.data
    || (
      selected?.patient && selected?.admin
        ? selected
        : null
    );
  return fields && typeof fields === "object" ? fields : null;
};

// handles get current document version entry
const getCurrentDocumentVersionEntry = (item) => {
  const versions = Array.isArray(item?.versions) ? item.versions : [];
  if (!versions.length) return null;
  return (
    versions.find((entry) => String(entry?.version || "").trim().toLowerCase() === "current")
    || versions[0]
    || null
  );
};

// handles resolve document version fields
const resolveDocumentVersionFields = (documentItem, versionKey = "current") => {
  const raw = documentItem?.raw || documentItem || {};
  const normalizedVersionKey = String(versionKey || "current").trim().toLowerCase();
  const versions = Array.isArray(raw?.versions)
    ? raw.versions
    : (Array.isArray(documentItem?.versions) ? documentItem.versions : []);

  if (normalizedVersionKey && normalizedVersionKey !== "current") {
    const selected = versions.find(
      (entry) => String(entry?.version || entry?.version_number || "").trim().toLowerCase() === normalizedVersionKey
    );
    const selectedFields =
      selected?.fields
      || selected?.document
      || selected?.draft_script
      || (
        selected?.patient && selected?.admin
          ? selected
          : null
      );
    if (selectedFields && typeof selectedFields === "object") return selectedFields;
  }

  const currentEntry = getCurrentDocumentVersionEntry(raw) || getCurrentDocumentVersionEntry(documentItem);
  const currentFields =
    currentEntry?.fields
    || currentEntry?.document
    || currentEntry?.draft_script
    || (
      currentEntry?.patient && currentEntry?.admin
        ? currentEntry
        : null
    );
  if (currentFields && typeof currentFields === "object") return currentFields;
  if (raw?.patient && raw?.admin) return raw;
  if (documentItem?.patient && documentItem?.admin) return documentItem;
  return null;
};

// handles build prefill form from request
const buildPrefillFormFromRequest = (initialForm, requestItem) => {
  const raw = requestItem?.raw || requestItem || {};
  const draftScript =
    raw.draft_script && typeof raw.draft_script === "object" ? raw.draft_script : null;
  let next = cloneValue(initialForm);

  if (draftScript) {
    next = mergeDeep(next, draftScript);
  }

  next.admin = {
    ...(next.admin || {}),
    reson_for_visit: firstNonEmptyString(
      next.admin?.reson_for_visit,
      raw.reason_for_visit,
      raw.reson_for_visit,
      raw.chief_concern
    ),
    chief_concern: firstNonEmptyString(next.admin?.chief_concern, raw.chief_concern),
    diagnosis: firstNonEmptyString(next.admin?.diagnosis, raw.diagnosis),
    abbreviated_diagnosis: firstNonEmptyString(
      next.admin?.abbreviated_diagnosis,
      raw.abbreviated_diagnosis
    ),
    icd10_code: firstNonEmptyString(next.admin?.icd10_code, raw.icd10_code),
    case_setting: firstNonEmptyString(next.admin?.case_setting, raw.case_setting, next.patient?.context),
    case_type: normalizeCaseType(next.admin?.case_type, raw.case_type, raw.simulation_modal),
    case_letter: firstNonEmptyString(next.admin?.case_letter, next.admin?.class, raw.class),
    class: firstNonEmptyString(next.admin?.class, next.admin?.case_letter, raw.class),
    medical_event: firstNonEmptyString(next.admin?.medical_event, raw.event),
    learner_level: firstNonEmptyString(next.admin?.learner_level, raw.learner_level, raw.pedagogy),
    summory_of_story: firstNonEmptyString(next.admin?.summory_of_story, raw.summary_patient_story),
    patient_demographic: firstNonEmptyString(next.admin?.patient_demographic, raw.patient_demog),
    staff_room_setup_instructions: firstNonEmptyString(
      next.admin?.staff_room_setup_instructions,
      raw.staff_room_setup_instructions
    ),
    content_warning: firstNonEmptyString(next.admin?.content_warning, raw.content_warning),
    case_factors: firstNonEmptyString(
      next.admin?.case_factors,
      raw.case_factors,
      raw.pert_aspects_patient_case
    ),
    special_supplies: firstNonEmptyString(next.admin?.special_supplies, raw.special_needs),
    final_page_notes: firstNonEmptyString(next.admin?.final_page_notes, raw.final_page_notes),
  };

  next.patient = {
    ...(next.patient || {}),
    name: firstNonEmptyString(next.patient?.name, raw.patient_name, raw.patient_demog),
    visit_reason: firstNonEmptyString(next.admin?.reson_for_visit, next.patient?.visit_reason),
    context: firstNonEmptyString(next.patient?.context, raw.case_setting, next.admin?.case_setting),
    vitals_included_on_door_note: firstDefinedBoolean(
      raw.vitals_included_on_door_note,
      next.patient?.vitals_included_on_door_note,
      true
    ),
  };

  next.sp = {
    ...(next.sp || {}),
    physical_chars: firstNonEmptyString(next.sp?.physical_chars, raw.physical_chars),
    disclosure_framework: {
      ...(next.sp?.disclosure_framework || {}),
    },
    character_attributes: {
      ...(next.sp?.character_attributes || {}),
      anxiety: normalizeCharacterAttributeLevel(next.sp?.character_attributes?.anxiety),
      suprise: normalizeCharacterAttributeLevel(next.sp?.character_attributes?.suprise),
      confusion: normalizeCharacterAttributeLevel(next.sp?.character_attributes?.confusion),
      guilt: normalizeCharacterAttributeLevel(next.sp?.character_attributes?.guilt),
      sadness: normalizeCharacterAttributeLevel(next.sp?.character_attributes?.sadness),
      indecision: normalizeCharacterAttributeLevel(next.sp?.character_attributes?.indecision),
      assertiveness: normalizeCharacterAttributeLevel(next.sp?.character_attributes?.assertiveness),
      frustration: normalizeCharacterAttributeLevel(next.sp?.character_attributes?.frustration),
      fear: normalizeCharacterAttributeLevel(next.sp?.character_attributes?.fear),
      anger: normalizeCharacterAttributeLevel(next.sp?.character_attributes?.anger),
    },
    presentation_behaviors: {
      ...(next.sp?.presentation_behaviors || {}),
      body_language: firstNonEmptyString(
        next.sp?.presentation_behaviors?.body_language,
        next.sp?.physical_chars,
        raw.physical_chars
      ),
    },
    gender_identity_expression: {
      ...(next.sp?.gender_identity_expression || {}),
    },
    other_sp_notes: firstNonEmptyString(next.sp?.other_sp_notes, raw.other_sp_notes),
    sp_feedback_enabled: firstDefinedBoolean(
      next.sp?.sp_feedback_enabled,
      raw.sp_feedback_enabled,
      raw.sp_feedback
    ),
    custom_feedback_notes: firstNonEmptyString(
      next.sp?.custom_feedback_notes,
      raw.custom_feedback_notes
    ),
    current_ill_history: {
      ...(next.sp?.current_ill_history || {}),
      symptom_quality: firstNonEmptyString(
        next.sp?.current_ill_history?.symptom_quality,
        raw.spec_phyis_findings
      ),
      pain_notes: firstNonEmptyString(next.sp?.current_ill_history?.pain_notes, raw.pain_notes),
    },
  };

  next.special = {
    ...(next.special || {}),
    feed_back: firstNonEmptyString(next.special?.feed_back, raw.additonal_ins),
  };

  if (!extractTextList(next.admin?.student_expectations).length && extractTextList(raw.student_expec).length) {
    next.admin.student_expectations = extractTextList(raw.student_expec).map((text) => ({ text }));
  }

  if (!extractTextList(next.admin?.learning_objectives).length && extractTextList(raw.learning_objectives).length) {
    next.admin.learning_objectives = extractTextList(raw.learning_objectives).map((text) => ({ text }));
  }

  if (!extractTextList(next.special?.oppurtunity).length && extractTextList(raw.special_needs).length) {
    next.special.oppurtunity = extractTextList(raw.special_needs).map((text) => ({ text }));
  }

  const symptomSource = raw.sympt_review && typeof raw.sympt_review === "object" ? raw.sympt_review : {};
  const prefilledSymptomReview = { ...(next.med_hist?.sympton_review || {}) };
  reviewOfSystemsFields.forEach(([key]) => {
    if (extractTextList(prefilledSymptomReview[key]).length) return;
    const entries = extractTextList(symptomSource[key]);
    if (entries.length) {
      prefilledSymptomReview[key] = entries.map((text) => ({ text }));
    }
  });
  const allergyCandidates = [
    next.med_hist?.allergies,
    next.med_hist?.allergies_list,
    raw.allergies_list,
    raw.allergies,
  ];
  let normalizedAllergies = [];
  allergyCandidates.some((candidate) => {
    const rows = normalizeAllergyRowsForForm(candidate, { ensureAtLeastOne: false });
    if (!rows.length) return false;
    normalizedAllergies = rows;
    return true;
  });
  next.med_hist = {
    ...(next.med_hist || {}),
    medications: normalizeMedicationRowsForForm(next.med_hist?.medications, emptyPrescriptionRow),
    non_prescription_medications: normalizeMedicationRowsForForm(
      next.med_hist?.non_prescription_medications,
      emptyNonPrescriptionRow
    ),
    allergies: normalizedAllergies.length ? normalizedAllergies : [emptyAllergyRow()],
    family_hist: normalizeFamilyHistoryRowsForForm(next.med_hist?.family_hist),
    family_general_notes: firstNonEmptyString(
      next.med_hist?.family_general_notes,
      raw.family_general_notes
    ),
    social_hist: normalizeSocialHistoryForForm(next.med_hist?.social_hist),
    past_med_his: {
      ...(next.med_hist?.past_med_his || {}),
      obstetric_gynecologic: normalizeObstetricGynecologicForForm(
        next.med_hist?.past_med_his?.obstetric_gynecologic,
        next.med_hist?.past_med_his?.obe_and_gye
      ),
    },
    sympton_review: prefilledSymptomReview,
  };

  return next;
};

// handles build form from script fields
const buildFormFromScriptFields = (initialForm, scriptFields) => {
  if (!scriptFields || typeof scriptFields !== "object") {
    return cloneValue(initialForm);
  }
  const merged = mergeDeep(cloneValue(initialForm), scriptFields);
  return {
    ...merged,
    sp: {
      ...(merged.sp || {}),
      character_attributes: {
        ...(merged.sp?.character_attributes || {}),
        anxiety: normalizeCharacterAttributeLevel(merged.sp?.character_attributes?.anxiety),
        suprise: normalizeCharacterAttributeLevel(merged.sp?.character_attributes?.suprise),
        confusion: normalizeCharacterAttributeLevel(merged.sp?.character_attributes?.confusion),
        guilt: normalizeCharacterAttributeLevel(merged.sp?.character_attributes?.guilt),
        sadness: normalizeCharacterAttributeLevel(merged.sp?.character_attributes?.sadness),
        indecision: normalizeCharacterAttributeLevel(merged.sp?.character_attributes?.indecision),
        assertiveness: normalizeCharacterAttributeLevel(merged.sp?.character_attributes?.assertiveness),
        frustration: normalizeCharacterAttributeLevel(merged.sp?.character_attributes?.frustration),
        fear: normalizeCharacterAttributeLevel(merged.sp?.character_attributes?.fear),
        anger: normalizeCharacterAttributeLevel(merged.sp?.character_attributes?.anger),
      },
    },
    med_hist: {
      ...(merged.med_hist || {}),
      medications: normalizeMedicationRowsForForm(merged.med_hist?.medications, emptyPrescriptionRow),
      non_prescription_medications: normalizeMedicationRowsForForm(
        merged.med_hist?.non_prescription_medications,
        emptyNonPrescriptionRow
      ),
      allergies: normalizeAllergyRowsForForm(
        merged.med_hist?.allergies ?? merged.med_hist?.allergies_list
      ),
      family_hist: normalizeFamilyHistoryRowsForForm(merged.med_hist?.family_hist),
      family_general_notes: firstNonEmptyString(merged.med_hist?.family_general_notes),
      social_hist: normalizeSocialHistoryForForm(merged.med_hist?.social_hist),
      past_med_his: {
        ...(merged.med_hist?.past_med_his || {}),
        obstetric_gynecologic: normalizeObstetricGynecologicForForm(
          merged.med_hist?.past_med_his?.obstetric_gynecologic,
          merged.med_hist?.past_med_his?.obe_and_gye
        ),
      },
    },
  };
};

// handles request new
const RequestNew = ({ mode = "request" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    createRequest,
    updateRequest,
    getRequestById,
    refreshRequests,
    getById,
    fetchById,
  } = useStore();
  const toast = useToast();
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isPart1Open, setIsPart1Open] = useState(true);
  const [isPart2Open, setIsPart2Open] = useState(false);
  const [isSpInfoOpen, setIsSpInfoOpen] = useState(false);
  const [isHpiOpen, setIsHpiOpen] = useState(false);
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
      abbreviated_diagnosis: "",
      icd10_code: "",
      case_setting: "",
      case_type: "Standardized",
      case_letter: "",
      class: "",
      medical_event: "",
      learner_level: "",
      academic_year: "",
      case_authors: "",
      author: "",
      summory_of_story: "",
      student_expectations: [emptyTextRow()],
      learning_objectives: [emptyTextRow()],
      patient_demographic: "",
      staff_room_setup_instructions: "",
      content_warning: "",
      special_supplies: "",
      case_factors: "",
      physical_examination: "",
      final_page_notes: "",
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
      vitals_included_on_door_note: true,
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
      disclosure_framework: {
        offered_spontaneously: "",
        elicited_generally_prompted: "",
        hidden_until_directly_asked: "",
        must_relay_accurately: "",
      },
      character_attributes: {
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
      presentation_behaviors: {
        affect: "",
        body_language: "",
        facial_expression: "",
        eye_contact: "",
        speech: "",
        note: "",
      },
      gender_identity_expression: {
        pronouns: "",
        identifies_as: "",
        sex_assigned_at_birth: "",
        gender_presentation: "",
      },
      other_sp_notes: "",
      sp_feedback_enabled: false,
      custom_feedback_notes: "",
      current_ill_history: {
        symptom_settings: [emptyTextRow()],
        symptom_timing: [emptyTextRow()],
        associated_symptoms: [emptyTextRow()],
        radiation_of_symptoms: [emptyTextRow()],
        symptom_quality: "",
        alleviating_factors: "",
        aggravating_factors: "",
        pain: "",
        pain_notes: "",
        symptom_diagram: [],
      },
    },
    med_hist: {
      medications: [emptyPrescriptionRow()],
      non_prescription_medications: [emptyNonPrescriptionRow()],
      allergies: [emptyAllergyRow()],
      past_med_his: {
        child_hood_illness: [emptyTextRow()],
        trauma: [emptyTextRow()],
        illness_and_hospital: [emptyTextRow()],
        surgeries: [emptyTextRow()],
        obstetric_gynecologic: emptyObstetricGynecologic(),
        transfusion: [emptyTextRow()],
        psychiatric: [emptyTextRow()],
      },
      preventative_measure: {
        immunization: [emptyTextRow()],
        alternate_health_care: [emptyTextRow()],
        travel_exposure: [emptyTextRow()],
        screening_tests: [emptyTextRow()],
      },
      family_hist: [emptyFamilyRow()],
      family_general_notes: "",
      social_hist: {
        personal_background: "",
        nutrion_and_exercise: "",
        level_of_education: "",
        occupation: "",
        health_literacy: "",
        military_service: "",
        community_and_employment: "",
        safety_measure: "",
        life_stressors: "",
        social_support: {
          family_friends: "",
          financial: "",
          healthcare_access_insurance: "",
          religious_or_community_groups: "",
        },
        substance_use: [emptyTextRow()],
        sexual_history_entries: [emptyTextRow()],
        sex_history: {
          current_partners: "",
          lifetime_partners: "",
          past_partners: "",
          other_details: "",
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
  const prefillRequestRef = useRef(null);
  const appliedPrefillRequestIdRef = useRef("");
  const appliedCloneKeyRef = useRef("");
  const isCloneMode = String(mode || "").trim().toLowerCase() === "clone";
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const stateRequest = useMemo(() => {
    const candidate = location.state?.request;
    return candidate && typeof candidate === "object" ? candidate : null;
  }, [location.state]);
  const stateDocument = useMemo(() => {
    const candidate = location.state?.document || location.state?.item;
    return candidate && typeof candidate === "object" ? candidate : null;
  }, [location.state]);
  const cloneSource = useMemo(() => {
    const fromQuery = String(searchParams.get("clone_source") || "").trim().toLowerCase();
    const fromState = String(location.state?.cloneSource || "").trim().toLowerCase();
    return fromQuery || fromState || "";
  }, [location.state, searchParams]);
  const cloneSourceId = useMemo(() => {
    const fromQuery = String(searchParams.get("source_id") || "").trim();
    const fromState = String(location.state?.sourceId || "").trim();
    if (fromQuery || fromState) return fromQuery || fromState;
    if (cloneSource === "request") return String(stateRequest?.id || "").trim();
    if (cloneSource === "document") return String(stateDocument?.id || stateDocument?._id || "").trim();
    return "";
  }, [cloneSource, location.state, searchParams, stateDocument, stateRequest]);
  const cloneVersionKey = useMemo(() => {
    const fromQuery = String(searchParams.get("version") || "").trim();
    const fromState = String(location.state?.versionKey || "").trim();
    if (fromQuery || fromState) return fromQuery || fromState;
    return cloneSource === "document" ? "current" : "request-draft";
  }, [cloneSource, location.state, searchParams]);
  const requestId = useMemo(() => {
    const idFromQuery = searchParams.get("requestId");
    const idFromState = stateRequest?.id || location.state?.requestId;
    return String(idFromQuery || idFromState || "").trim();
  }, [location.state, searchParams, stateRequest]);
  const isPrefillMode = !isCloneMode && Boolean(requestId || stateRequest);
  const [prefillRequest, setPrefillRequest] = useState(null);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneSourceLabel, setCloneSourceLabel] = useState("");
  const [formVersionOptions, setFormVersionOptions] = useState([]);
  const [selectedFormVersionKey, setSelectedFormVersionKey] = useState("request-draft");
  const [formVersionsLoading, setFormVersionsLoading] = useState(false);
  const [saveVersionModalOpen, setSaveVersionModalOpen] = useState(false);
  const [saveVersionMode, setSaveVersionMode] = useState("new");
  const [overwriteVersionTarget, setOverwriteVersionTarget] = useState("");
  const [deleteVersionTarget, setDeleteVersionTarget] = useState("");
  const [deletingVersionId, setDeletingVersionId] = useState("");
  const [inlineEdit, setInlineEdit] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!isPrefillMode) {
      if (appliedPrefillRequestIdRef.current) {
        const resetForm = cloneValue(initialForm);
        setForm(resetForm);
        setAttachments([]);
        initialSnapshotRef.current = JSON.stringify(resetForm);
      }
      prefillRequestRef.current = null;
      appliedPrefillRequestIdRef.current = "";
      setPrefillRequest(null);
      setPrefillLoading(false);
      setFormVersionOptions([]);
      setSelectedFormVersionKey("request-draft");
      setFormVersionsLoading(false);
      setSaveVersionModalOpen(false);
      setSaveVersionMode("new");
      setOverwriteVersionTarget("");
      setDeleteVersionTarget("");
      setDeletingVersionId("");
      return undefined;
    }

    appliedPrefillRequestIdRef.current = "";
    prefillRequestRef.current = null;
    setPrefillRequest(null);
    setFormVersionOptions([]);
    setSelectedFormVersionKey("request-draft");

    // handles load request
    const loadRequest = async () => {
      setPrefillLoading(true);
      try {
        let found = stateRequest;
        if (
          found
          && requestId
          && String(found?.id || "").trim()
          && String(found?.id || "").trim() !== requestId
        ) {
          found = null;
        }
        if (!found && requestId && typeof getRequestById === "function") {
          found = getRequestById(requestId);
        }
        if (!found && requestId && typeof refreshRequests === "function") {
          const refreshed = await refreshRequests();
          found = Array.isArray(refreshed)
            ? refreshed.find((entry) => String(entry?.id || "") === requestId) || null
            : null;
        }
        if (cancelled) return;
        prefillRequestRef.current = found || null;
        setPrefillRequest(found || null);
        if (!found && requestId) {
          toast.show(`Request ${requestId} was not found.`, { type: "error" });
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Failed to load request for prefill", err);
        prefillRequestRef.current = null;
        setPrefillRequest(null);
        toast.show("Failed to load request data.", { type: "error" });
      } finally {
        if (!cancelled) {
          setPrefillLoading(false);
        }
      }
    };

    void loadRequest();
    return () => {
      cancelled = true;
    };
  }, [getRequestById, isPrefillMode, refreshRequests, requestId, stateRequest, toast]);

  useEffect(() => {
    let cancelled = false;

    if (!isCloneMode) {
      setCloneLoading(false);
      setCloneSourceLabel("");
      appliedCloneKeyRef.current = "";
      return undefined;
    }

    const normalizedSource = String(cloneSource || "").trim().toLowerCase();
    const normalizedSourceId = String(cloneSourceId || "").trim();
    const normalizedVersionKey = String(cloneVersionKey || "").trim();
    if (!normalizedSource || !normalizedSourceId) {
      setCloneLoading(false);
      setCloneSourceLabel("");
      appliedCloneKeyRef.current = "";
      return undefined;
    }
    const cloneKey = `${normalizedSource}:${normalizedSourceId}:${normalizedVersionKey}`;
    if (appliedCloneKeyRef.current === cloneKey) return undefined;

    // handles load clone source
    const loadCloneSource = async () => {
      setCloneLoading(true);
      setCloneSourceLabel("");
      try {
        let nextForm = cloneValue(initialForm);
        let nextLabel = "";

        if (normalizedSource === "request") {
          let sourceRequest = stateRequest;
          if (
            sourceRequest
            && normalizedSourceId
            && String(sourceRequest?.id || "").trim() !== normalizedSourceId
          ) {
            sourceRequest = null;
          }
          if (!sourceRequest && normalizedSourceId && typeof getRequestById === "function") {
            sourceRequest = getRequestById(normalizedSourceId);
          }
          if (!sourceRequest && normalizedSourceId && typeof refreshRequests === "function") {
            const refreshed = await refreshRequests();
            sourceRequest = Array.isArray(refreshed)
              ? refreshed.find((entry) => String(entry?.id || "").trim() === normalizedSourceId) || null
              : null;
          }
          if (!sourceRequest) {
            throw new Error(`Request ${normalizedSourceId || "source"} was not found.`);
          }
          const versionFields = resolveRequestVersionFields(sourceRequest, normalizedVersionKey || "request-draft");
          nextForm = versionFields
            ? buildFormFromScriptFields(initialForm, versionFields)
            : buildPrefillFormFromRequest(initialForm, sourceRequest);
          nextLabel = `Cloned from request ${sourceRequest.id || normalizedSourceId || ""} (${normalizedVersionKey || "request-draft"})`;
        } else if (normalizedSource === "document") {
          let sourceDocument = stateDocument;
          const stateDocumentId = String(sourceDocument?.id || sourceDocument?._id || "").trim();
          if (sourceDocument && normalizedSourceId && stateDocumentId !== normalizedSourceId) {
            sourceDocument = null;
          }
          if (!sourceDocument && normalizedSourceId && typeof getById === "function") {
            sourceDocument = getById(normalizedSourceId);
          }
          if (!sourceDocument && normalizedSourceId && typeof fetchById === "function") {
            sourceDocument = await fetchById(normalizedSourceId);
          }
          if (!sourceDocument && normalizedSourceId) {
            const { api } = await import("../api/client");
            sourceDocument = await api.getDocument(normalizedSourceId);
          }
          if (!sourceDocument) {
            throw new Error(`Script ${normalizedSourceId || "source"} was not found.`);
          }
          const versionFields = resolveDocumentVersionFields(sourceDocument, normalizedVersionKey || "current");
          nextForm = buildFormFromScriptFields(initialForm, versionFields || sourceDocument);
          const sourceDocId = String(sourceDocument?.id || sourceDocument?._id || normalizedSourceId || "").trim();
          nextLabel = `Cloned from script ${sourceDocId} (${normalizedVersionKey || "current"})`;
        } else {
          throw new Error("Clone source is missing or invalid.");
        }

        if (cancelled) return;
        setForm(nextForm);
        setAttachments([]);
        initialSnapshotRef.current = JSON.stringify(nextForm);
        appliedCloneKeyRef.current = cloneKey;
        setCloneSourceLabel(nextLabel);
      } catch (err) {
        if (cancelled) return;
        const message = String(err?.message || "").trim() || "Failed to load clone source.";
        toast.show(message, { type: "error" });
      } finally {
        if (!cancelled) {
          setCloneLoading(false);
        }
      }
    };

    void loadCloneSource();
    return () => {
      cancelled = true;
    };
  }, [
    cloneSource,
    cloneSourceId,
    cloneVersionKey,
    fetchById,
    getById,
    getRequestById,
    isCloneMode,
    refreshRequests,
    stateDocument,
    stateRequest,
    toast,
  ]);

  useEffect(() => {
    if (!isPrefillMode || !prefillRequest) return;
    const activePrefillId = String(requestId || prefillRequest?.id || "").trim();
    if (activePrefillId && appliedPrefillRequestIdRef.current === activePrefillId) return;
    const prefilled = buildPrefillFormFromRequest(initialForm, prefillRequest);
    setForm(prefilled);
    setAttachments([]);
    initialSnapshotRef.current = JSON.stringify(prefilled);
    prefillRequestRef.current = prefillRequest;
    appliedPrefillRequestIdRef.current = activePrefillId || "prefill-loaded";
  }, [isPrefillMode, prefillRequest, requestId]);

  useEffect(() => {
    let cancelled = false;

    if (!isPrefillMode || !prefillRequest) {
      setFormVersionOptions([]);
      setSelectedFormVersionKey("request-draft");
      setFormVersionsLoading(false);
      return undefined;
    }

    // handles load form versions
    const loadFormVersions = async () => {
      const requestDraftForm = buildPrefillFormFromRequest(initialForm, prefillRequest);
      const options = [
        {
          key: "request-draft",
          label: "Request Draft",
          form: requestDraftForm,
        },
      ];

      // handles push option
      const pushOption = (key, label, fields) => {
        if (!fields || typeof fields !== "object") return;
        if (options.some((entry) => entry.key === key)) return;
        options.push({
          key,
          label,
          form: buildFormFromScriptFields(initialForm, fields),
        });
      };

      const raw = prefillRequest.raw || prefillRequest || {};
      const requestDraftVersions = getRequestDraftVersions(raw);
      requestDraftVersions.forEach((entry, idx) => {
        const versionId = String(entry?.version || `rv${requestDraftVersions.length - idx}`);
        const fields = entry?.fields || entry?.document || entry?.draft_script || null;
        pushOption(`request-${versionId}`, `Saved ${versionId}`, fields);
      });

      if (cancelled) return;
      setFormVersionOptions(options);
      setSelectedFormVersionKey("request-draft");
      setFormVersionsLoading(false);
    };

    void loadFormVersions();
    return () => {
      cancelled = true;
    };
  }, [isPrefillMode, prefillRequest, requestId]);

  const requestSavedVersions = useMemo(() => {
    const raw = prefillRequest?.raw || prefillRequest || {};
    const versions = getRequestDraftVersions(raw);
    return versions
      .map((entry) => ({
        ...entry,
        version: String(entry?.version || "").trim(),
      }))
      .filter((entry) => entry.version);
  }, [prefillRequest]);

  useEffect(() => {
    setDeleteVersionTarget((prev) => {
      const trimmedPrev = String(prev || "").trim();
      if (
        trimmedPrev
        && requestSavedVersions.some((entry) => String(entry.version || "").trim() === trimmedPrev)
      ) {
        return trimmedPrev;
      }
      return requestSavedVersions[0]?.version || "";
    });
    setOverwriteVersionTarget((prev) => {
      const trimmedPrev = String(prev || "").trim();
      if (
        trimmedPrev
        && requestSavedVersions.some((entry) => String(entry.version || "").trim() === trimmedPrev)
      ) {
        return trimmedPrev;
      }
      return requestSavedVersions[0]?.version || "";
    });
  }, [requestSavedVersions]);

  const nextRequestVersionLabel = useMemo(() => {
    const maxVersionNumber = requestSavedVersions.reduce((max, entry) => {
      const match = String(entry.version || "").match(/(\d+)/);
      if (!match) return max;
      const number = Number(match[1]);
      return Number.isFinite(number) && number > max ? number : max;
    }, 0);
    return `rv${maxVersionNumber + 1}`;
  }, [requestSavedVersions]);

  const hasUnsavedChanges = useMemo(
    () => attachments.length > 0 || JSON.stringify(form) !== initialSnapshotRef.current,
    [attachments, form]
  );
  const shouldWarnOnLeave = hasUnsavedChanges && !submitting && !bypassNavigationRef.current;

  // handles on select form version
  const onSelectFormVersion = (valueOrEvent) => {
    const rawValue =
      typeof valueOrEvent === "string" ? valueOrEvent : valueOrEvent?.target?.value;
    const nextKey = String(rawValue || "").trim();
    if (!nextKey || nextKey === selectedFormVersionKey) return;
    const selectedVersion = formVersionOptions.find((entry) => entry.key === nextKey);
    if (!selectedVersion) return;
    if (shouldWarnOnLeave) {
      const ok = window.confirm("You have unsaved changes. Switch versions and replace current values?");
      if (!ok) return;
    }
    const nextForm = cloneValue(selectedVersion.form);
    setForm(nextForm);
    setInlineEdit(null);
    setAttachments([]);
    initialSnapshotRef.current = JSON.stringify(nextForm);
    setSelectedFormVersionKey(nextKey);
    toast.show(`Loaded ${selectedVersion.label}`, { type: "info" });
  };

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
    // handles on document click capture
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

  // handles set deep
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

  // handles set field
  const setField = (path, value) => setForm((prev) => setDeep(prev, path, value));
  // handles set number field
  const setNumberField = (path, value) => setForm((prev) => setDeep(prev, path, value === "" ? "" : Number(value)));
  // handles get field
  const getField = (path) => path.reduce((acc, k) => (acc ? acc[k] : undefined), form);
  // handles get list
  const getList = (path, fallbackFactory) => {
    const current = getField(path);
    if (Array.isArray(current) && current.length) return current;
    if (typeof current === "string" && current.trim()) return [{ text: current.trim() }];
    if (current && typeof current === "object" && typeof current.text === "string" && current.text.trim()) {
      return [{ text: current.text.trim() }];
    }
    return [fallbackFactory()];
  };
  // handles add list row
  const addListRow = (path, newRowFactory) => {
    const current = getList(path, newRowFactory);
    setField(path, [...current, newRowFactory()]);
  };
  // handles remove list row
  const removeListRow = (path, index, fallbackFactory) => {
    const current = getList(path, fallbackFactory);
    const next = current.filter((_, idx) => idx !== index);
    setField(path, next.length ? next : [fallbackFactory()]);
  };
  // handles update list row text
  const updateListRowText = (path, index, value, fallbackFactory) => {
    const current = getList(path, fallbackFactory);
    const next = current.map((entry, idx) => (
      idx === index
        ? (typeof entry === "string" ? value : { ...(entry || {}), text: value })
        : entry
    ));
    setField(path, next);
  };
  // handles update list row field
  const updateListRowField = (path, index, key, value, fallbackFactory) => {
    const current = getList(path, fallbackFactory);
    const next = current.map((entry, idx) => (
      idx === index
        ? { ...(entry && typeof entry === "object" ? entry : {}), [key]: value }
        : entry
    ));
    setField(path, next);
  };
  // handles update family history row
  const updateFamilyHistoryRow = (index, key, value) => {
    const current = getList(["med_hist", "family_hist"], emptyFamilyRow);
    const next = current.map((entry, idx) => (
      idx === index
        ? { ...(entry || {}), [key]: value }
        : entry
    ));
    setField(["med_hist", "family_hist"], next);
  };

  // handles path to key
  const pathToKey = (path) => (Array.isArray(path) ? path.join(".") : String(path || ""));
  // handles coerce inline value
  const coerceInlineValue = (value, type) => {
    if (type !== "number") return value;
    if (value === "") return "";
    const next = Number(value);
    return Number.isNaN(next) ? "" : next;
  };
  // handles begin inline edit
  const beginInlineEdit = ({ key, path, paths, type = "text", value }) => {
    if (submitting) return;
    const editKey = String(key || pathToKey(path || paths?.[0]) || "").trim();
    if (!editKey) return;
    const raw = value !== undefined ? value : Array.isArray(path) ? getField(path) : "";
    setInlineEdit({
      key: editKey,
      path: Array.isArray(path) ? path : null,
      paths: Array.isArray(paths) ? paths : null,
      type,
      value: raw === undefined || raw === null ? "" : String(raw),
    });
  };
  // handles cancel inline edit
  const cancelInlineEdit = () => setInlineEdit(null);
  // handles save inline edit
  const saveInlineEdit = () => {
    if (!inlineEdit) return;
    const nextValue = coerceInlineValue(inlineEdit.value, inlineEdit.type);
    if (Array.isArray(inlineEdit.paths) && inlineEdit.paths.length) {
      inlineEdit.paths.forEach((path) => setField(path, nextValue));
    } else if (Array.isArray(inlineEdit.path)) {
      setField(inlineEdit.path, nextValue);
    }
    setInlineEdit(null);
  };
  const renderInlineValue = ({
    path,
    paths,
    key,
    type = "text",
    value,
    displayValue,
    empty = "-",
    selectOptions = [],
  }) => {
    const editKey = String(key || pathToKey(path || paths?.[0]) || "").trim();
    const raw = value !== undefined ? value : Array.isArray(path) ? getField(path) : "";
    const shown = displayValue !== undefined ? displayValue : raw;
    const normalized =
      shown === 0
        ? "0"
        : shown === undefined || shown === null || String(shown).trim() === ""
          ? empty
          : String(shown);
    if (inlineEdit?.key === editKey) {
      return (
        <span className="inline-flex items-center gap-1 align-middle">
          {type === "select" ? (
            <select
              className="rounded border border-[#981e32] px-2 py-1 text-sm"
              value={inlineEdit.value}
              onChange={(event) =>
                setInlineEdit((prev) => (prev ? { ...prev, value: event.target.value } : prev))
              }
              autoFocus
            >
              {selectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type === "number" ? "number" : "text"}
              className="rounded border border-[#981e32] px-2 py-1 text-sm"
              value={inlineEdit.value}
              onChange={(event) =>
                setInlineEdit((prev) => (prev ? { ...prev, value: event.target.value } : prev))
              }
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveInlineEdit();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelInlineEdit();
                }
              }}
              autoFocus
            />
          )}
          <button
            type="button"
            className="rounded border border-[#981e32] px-2 py-1 text-xs font-semibold text-[#981e32] hover:bg-[#981e32] hover:text-white"
            onClick={saveInlineEdit}
          >
            Save
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs font-semibold hover:bg-gray-50"
            onClick={cancelInlineEdit}
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
        onDoubleClick={() => beginInlineEdit({ key: editKey, path, paths, type, value: raw })}
      >
        {normalized}
      </span>
    );
  };

  const inputClass = "w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400";
  const textAreaClass = "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400";
  const sectionLabelClass = "text-sm font-semibold text-gray-800";

  // handles add attachments
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

  // handles on files selected
  const onFilesSelected = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) addAttachments(files);
    event.target.value = "";
  };

  // handles remove attachment
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
  const pastMedicalGroups = [
    ["child_hood_illness", "Childhood Illnesses"],
    ["trauma", "Trauma"],
    ["illness_and_hospital", "Medical Illnesses and Hospitalizations"],
    ["surgeries", "Surgeries"],
    ["transfusion", "Transfusion History"],
    ["psychiatric", "Psychiatric History"],
  ];
  const preventativeGroups = [
    ["immunization", "Immunizations"],
    ["screening_tests", "Screening Tests"],
    ["alternate_health_care", "Alternative/Complimentary Health Care"],
    ["travel_exposure", "Travel/Exposure History"],
  ];
  const familyHistoryLines = (
    Array.isArray(getField(["med_hist", "family_hist"])) ? getField(["med_hist", "family_hist"]) : []
  )
    .map((entry) => formatFamilyHistoryEntry(entry))
    .filter(Boolean);
  const attachmentNames = attachments
    .map((file) => String(file?.name || "").trim())
    .filter(Boolean);

  // handles place diagram heart
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

  // handles clear diagram heart
  const clearDiagramHeart = () => {
    setField(["sp", "current_ill_history", "symptom_diagram"], []);
  };

  // handles remove last diagram heart
  const removeLastDiagramHeart = () => {
    if (!diagramMarkers.length) return;
    setField(["sp", "current_ill_history", "symptom_diagram"], diagramMarkers.slice(0, -1));
  };

  // handles upload attachments
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

  // handles save prefill request version
  const savePrefillRequestVersion = async (script, artifacts, options = {}) => {
    const requestItem = prefillRequestRef.current;
    if (!requestItem) {
      throw new Error("No request data is loaded for saving.");
    }

    const rawRequest = requestItem.raw || requestItem;
    if (typeof updateRequest !== "function") {
      throw new Error("Request update is not configured.");
    }
    const requestedMode = String(options?.mode || "new").trim().toLowerCase();
    const requestedTargetVersion = String(options?.targetVersion || "").trim();
    const existingDraftVersions = getRequestDraftVersions(rawRequest);
    const now = new Date().toISOString();

    let savedVersionId = "";
    let nextDraftVersions = existingDraftVersions;
    if (requestedMode === "overwrite" && requestedTargetVersion) {
      const existingVersion = existingDraftVersions.find(
        (entry) => String(entry?.version || "").trim() === requestedTargetVersion
      );
      if (existingVersion) {
        savedVersionId = requestedTargetVersion;
        const replacementVersion = {
          ...existingVersion,
          version: savedVersionId,
          notes: `Saved ${savedVersionId}`,
          fields: script,
          created_at: now,
        };
        nextDraftVersions = [
          replacementVersion,
          ...existingDraftVersions.filter(
            (entry) => String(entry?.version || "").trim() !== requestedTargetVersion
          ),
        ];
      }
    }

    if (!savedVersionId) {
      const maxVersionNumber = existingDraftVersions.reduce((max, entry) => {
        const match = String(entry?.version || "").match(/(\d+)/);
        if (!match) return max;
        const number = Number(match[1]);
        return Number.isFinite(number) && number > max ? number : max;
      }, 0);
      savedVersionId = `rv${maxVersionNumber + 1}`;
      const nextVersionEntry = {
        version: savedVersionId,
        notes: `Saved ${savedVersionId}`,
        fields: script,
        created_at: now,
      };
      nextDraftVersions = [nextVersionEntry, ...existingDraftVersions];
    }

    const nextRequestPayload = {
      ...rawRequest,
      status: rawRequest.status || requestItem.status || "Pending",
      draft_script: script,
      artifacts,
      draft_versions: nextDraftVersions,
      updated_at: now,
    };
    const updated = await updateRequest(requestItem.id || requestId, nextRequestPayload);
    const updatedRaw = updated?.raw || updated || {};
    const mergedRaw = {
      ...rawRequest,
      ...updatedRaw,
      draft_script: script,
      artifacts,
      draft_versions: nextDraftVersions,
    };
    const normalizedUpdated = {
      ...(requestItem || {}),
      ...(updated || {}),
      raw: mergedRaw,
    };
    prefillRequestRef.current = normalizedUpdated;
    setPrefillRequest(normalizedUpdated);
    setFormVersionOptions((prev) => {
      const requestDraftOption = prev.find((entry) => entry.key === "request-draft") || {
        key: "request-draft",
        label: "Request Draft",
        form: buildPrefillFormFromRequest(initialForm, normalizedUpdated),
      };
      const requestVersionOptions = nextDraftVersions
        .map((entry) => {
          const versionId = String(entry?.version || "").trim();
          if (!versionId) return null;
          const fields = entry?.fields || entry?.document || entry?.draft_script || null;
          if (!fields || typeof fields !== "object") return null;
          return {
            key: `request-${versionId}`,
            label: `Saved ${versionId}`,
            form: buildFormFromScriptFields(initialForm, fields),
          };
        })
        .filter(Boolean);
      const libraryOptions = prev.filter(
        (entry) => entry.key !== "request-draft" && !String(entry.key || "").startsWith("request-")
      );
      return [requestDraftOption, ...requestVersionOptions, ...libraryOptions];
    });
    return savedVersionId;
  };

  // handles execute prefill save version
  const executePrefillSaveVersion = async (mode = "new", targetVersion = "") => {
    bypassNavigationRef.current = false;
    setSubmitting(true);
    let uploadedArtifacts = [];
    try {
      const script = buildScriptFromForm(form);
      const existingArtifacts = getRequestArtifacts(prefillRequestRef.current);
      uploadedArtifacts = await uploadAttachments(script);
      const mergedArtifacts = uniqueArtifacts([...existingArtifacts, ...uploadedArtifacts]);
      if (mergedArtifacts.length) {
        script.artifacts = mergedArtifacts;
      }
      const savedVersionId = await savePrefillRequestVersion(script, mergedArtifacts, {
        mode,
        targetVersion,
      });
      toast.show(`Saved version ${savedVersionId}`, { type: "success" });
      initialSnapshotRef.current = JSON.stringify(form);
      setAttachments([]);
      setSelectedFormVersionKey("request-draft");
      if (typeof refreshRequests === "function") {
        await refreshRequests();
      }
      return true;
    } catch (err) {
      try {
        const { api } = await import("../api/client");
        await Promise.all(
          uploadedArtifacts.map((a) => (a?.id ? api.deleteArtifact(a.id) : null))
        );
      } catch {
      }
      const errorDetail = String(err?.message || "").trim();
      const message = errorDetail ? `Save version failed: ${errorDetail}` : "Save version failed";
      toast.show(message, { type: "error" });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // handles on confirm save version
  const onConfirmSaveVersion = async () => {
    const mode = saveVersionMode === "overwrite" ? "overwrite" : "new";
    if (mode === "overwrite" && !overwriteVersionTarget) {
      toast.show("Choose a version to overwrite or save as a new version.", { type: "error" });
      return;
    }
    setSaveVersionModalOpen(false);
    await executePrefillSaveVersion(mode, overwriteVersionTarget);
  };

  // handles delete prefill version
  const deletePrefillVersion = async (versionId) => {
    const targetVersionId = String(versionId || "").trim();
    if (!targetVersionId) {
      toast.show("Choose a saved version to delete.", { type: "error" });
      return;
    }
    if (deletingVersionId || submitting) return;
    const requestItem = prefillRequestRef.current;
    if (!requestItem) {
      toast.show("Request data is not loaded yet.", { type: "error" });
      return;
    }
    const rawRequest = requestItem.raw || requestItem || {};
    const existingDraftVersions = getRequestDraftVersions(rawRequest);
    if (
      !existingDraftVersions.some(
        (entry) => String(entry?.version || "").trim() === targetVersionId
      )
    ) {
      toast.show(`Saved version ${targetVersionId} was not found.`, { type: "error" });
      return;
    }
    const deletingSelectedVersion = selectedFormVersionKey === `request-${targetVersionId}`;
    if (deletingSelectedVersion && shouldWarnOnLeave) {
      const ok = window.confirm(
        "You have unsaved changes. Deleting this version will switch back to Request Draft. Continue?"
      );
      if (!ok) return;
    }
    const confirmed = window.confirm(
      `Delete saved version ${targetVersionId}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingVersionId(targetVersionId);
    try {
      if (typeof updateRequest !== "function") {
        throw new Error("Request update is not configured.");
      }
      const now = new Date().toISOString();
      const nextDraftVersions = existingDraftVersions.filter(
        (entry) => String(entry?.version || "").trim() !== targetVersionId
      );
      const nextRequestPayload = {
        ...rawRequest,
        status: rawRequest.status || requestItem.status || "Pending",
        draft_versions: nextDraftVersions,
        updated_at: now,
      };
      const updated = await updateRequest(requestItem.id || requestId, nextRequestPayload);
      const updatedRaw = updated?.raw || updated || {};
      const mergedRaw = {
        ...rawRequest,
        ...updatedRaw,
        draft_versions: nextDraftVersions,
      };
      const normalizedUpdated = {
        ...(requestItem || {}),
        ...(updated || {}),
        raw: mergedRaw,
      };
      prefillRequestRef.current = normalizedUpdated;
      setPrefillRequest(normalizedUpdated);
      setFormVersionOptions((prev) => {
        const requestDraftOption = {
          key: "request-draft",
          label: "Request Draft",
          form: buildPrefillFormFromRequest(initialForm, normalizedUpdated),
        };
        const requestVersionOptions = nextDraftVersions
          .map((entry) => {
            const version = String(entry?.version || "").trim();
            if (!version) return null;
            const fields = entry?.fields || entry?.document || entry?.draft_script || null;
            if (!fields || typeof fields !== "object") return null;
            return {
              key: `request-${version}`,
              label: `Saved ${version}`,
              form: buildFormFromScriptFields(initialForm, fields),
            };
          })
          .filter(Boolean);
        const libraryOptions = prev.filter(
          (entry) => entry.key !== "request-draft" && !String(entry.key || "").startsWith("request-")
        );
        return [requestDraftOption, ...requestVersionOptions, ...libraryOptions];
      });
      if (deletingSelectedVersion) {
        const draftForm = buildPrefillFormFromRequest(initialForm, normalizedUpdated);
        setForm(draftForm);
        setAttachments([]);
        initialSnapshotRef.current = JSON.stringify(draftForm);
        setSelectedFormVersionKey("request-draft");
      }
      setSaveVersionMode((prev) => (
        prev === "overwrite" && !nextDraftVersions.length ? "new" : prev
      ));
      toast.show(`Deleted version ${targetVersionId}`, { type: "success" });
      if (typeof refreshRequests === "function") {
        await refreshRequests();
      }
    } catch (err) {
      const detail = String(err?.message || "").trim();
      toast.show(detail ? `Delete version failed: ${detail}` : "Delete version failed", { type: "error" });
    } finally {
      setDeletingVersionId("");
    }
  };

  // handles on submit
  const onSubmit = async (e) => {
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (isPrefillMode) {
      if (prefillLoading || !prefillRequest) {
        toast.show("Request data is still loading.", { type: "error" });
        return;
      }
      setSaveVersionMode("new");
      setOverwriteVersionTarget(requestSavedVersions[0]?.version || "");
      setSaveVersionModalOpen(true);
      return;
    }

    bypassNavigationRef.current = false;
    setSubmitting(true);
    let uploadedArtifacts = [];

    try {
      const script = buildScriptFromForm(form);
      uploadedArtifacts = await uploadAttachments(script);
      const mergedArtifacts = uniqueArtifacts(uploadedArtifacts);
      if (mergedArtifacts.length) {
        script.artifacts = mergedArtifacts;
      }

      const requestPayload = buildScriptRequestPayload(form, script, mergedArtifacts);
      if (typeof createRequest !== "function") {
        throw new Error("Request submission is not configured");
      }
      await createRequest(requestPayload);
      toast.show(isCloneMode ? "Cloned script created" : "Request submitted", { type: "success" });
      initialSnapshotRef.current = JSON.stringify(form);
      setAttachments([]);
      bypassNavigationRef.current = true;
      navigate(isCloneMode ? "/requests" : "/dashboard");
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

  // handles on form key down
  const onFormKeyDown = (event) => {
    if (event.key !== "Enter") return;
    const tag = event.target?.tagName?.toLowerCase?.() || "";
    if (tag === "textarea") return;
    event.preventDefault();
  };

  // handles toggle top view mode
  const toggleTopViewMode = () => {
    setInlineEdit(null);
    setIsPreviewMode((prev) => !prev);
  };

  // handles handle backtrack
  const handleBacktrack = () => {
    if (shouldWarnOnLeave) {
      const ok = window.confirm("You have unsaved changes. Leave this page?");
      if (!ok) return;
    }
    const fromPath = String(location.state?.from || "").trim();
    const fallbackPath = isPrefillMode
      ? "/requests"
      : (isCloneMode ? (cloneSource === "document" ? "/forms-search" : "/requests") : "/dashboard");
    navigate(fromPath || fallbackPath);
  };

  return (
    <section className="w-full px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleBacktrack}
            className="rounded-full bg-[#981e32] px-3 py-1 text-xs font-semibold text-white hover:bg-[#7f1829]"
          >
            ← Back
          </button>
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-semibold">
            {isCloneMode ? "Clone Script" : (isPrefillMode ? "Edit Request Form" : "Script Request")}
          </h2>
          <p className="text-sm text-gray-600">
            {isCloneMode
              ? "Create a new request from cloned script data."
              : (
                isPrefillMode
                  ? "Editing a submitted request. Submitting saves a new request version."
                  : "Single-column request form for standardized patient scripts."
              )}
          </p>
        </div>

        {isPrefillMode ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {prefillLoading
              ? `Loading request ${requestId}...`
              : prefillRequest
                  ? `Request ${prefillRequest.id || requestId} loaded.`
                  : `Request ${requestId} was not found. You can still use this form manually.`}
          </div>
        ) : null}

        {isPrefillMode ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">Form Version</div>
              <div className="flex flex-wrap gap-2">
                {(formVersionOptions.length
                  ? formVersionOptions
                  : [{ key: "request-draft", label: "Request Draft" }]
                ).map((entry) => {
                  const isActive = entry.key === selectedFormVersionKey;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => onSelectFormVersion(entry.key)}
                      disabled={formVersionsLoading || submitting}
                      aria-pressed={isActive}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-[#981e32] bg-[#981e32] text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {entry.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {formVersionsLoading
                ? "Loading available versions..."
                : "Switching versions replaces current unsaved form values."}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Delete saved version:</span>
              <select
                value={deleteVersionTarget}
                onChange={(event) => setDeleteVersionTarget(String(event.target.value || "").trim())}
                disabled={submitting || formVersionsLoading || deletingVersionId !== "" || !requestSavedVersions.length}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {requestSavedVersions.length ? (
                  requestSavedVersions.map((entry) => (
                    <option key={entry.version} value={entry.version}>
                      {entry.version}
                    </option>
                  ))
                ) : (
                  <option value="">No saved versions</option>
                )}
              </select>
              <button
                type="button"
                onClick={() => {
                  void deletePrefillVersion(deleteVersionTarget);
                }}
                disabled={
                  submitting
                  || formVersionsLoading
                  || deletingVersionId !== ""
                  || !requestSavedVersions.length
                  || !deleteVersionTarget
                }
                className="rounded border border-red-600 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingVersionId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ) : null}

        {isCloneMode ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            {cloneLoading
              ? `Loading clone source ${cloneSourceId || "..."}...`
              : (
                cloneSourceLabel
                  ? `${cloneSourceLabel} loaded. Submitting creates a new request.`
                  : "Clone mode is active. You can edit fields before creating a new request."
              )}
          </div>
        ) : null}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={toggleTopViewMode}
            className="rounded-full border border-[#981e32] px-6 py-2 text-sm font-semibold text-[#981e32] hover:bg-[#981e32] hover:text-white"
          >
            {isPreviewMode ? "Form fillout" : "preview"}
          </button>
        </div>

        <form onSubmit={onSubmit} onKeyDown={onFormKeyDown} className="space-y-6 text-left">
          {!isPreviewMode ? (
          <div className="rounded-2xl border border-gray-300 bg-white shadow-sm p-6 space-y-8">
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <button
                type="button"
                onClick={() => setIsPart1Open((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900">Administrative Details</span>
                <span className="text-base font-semibold text-gray-700">{isPart1Open ? "(-)" : "(+)"}</span>
              </button>
              {isPart1Open ? (
                <div className="space-y-4">
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Patient's Reason for the Visit</span>
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
                    <span className="text-sm text-gray-700">Abbreviated Diagnosis for Script Name</span>
                    <input className={inputClass} value={getField(["admin", "abbreviated_diagnosis"]) || ""} onChange={(e) => setField(["admin", "abbreviated_diagnosis"], e.target.value)} />
                    <p className="text-xs text-gray-500">Used when system windows cannot display long names.</p>
                  </label>
                  <label className="block space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-700">ICD-10 Code</span>
                      <a
                        href="https://icd.who.int/browse10/2016/en"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#981e32] hover:underline"
                      >
                        Browse ICD-10
                      </a>
                    </div>
                    <input className={inputClass} value={getField(["admin", "icd10_code"]) || ""} onChange={(e) => setField(["admin", "icd10_code"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Case Setting</span>
                    <input className={inputClass} value={getField(["admin", "case_setting"]) || ""} onChange={(e) => setField(["admin", "case_setting"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Case Type</span>
                    <select
                      className={`${inputClass} pr-8`}
                      value={normalizeCaseType(getField(["admin", "case_type"])) || "Standardized"}
                      onChange={(e) => setField(["admin", "case_type"], normalizeCaseType(e.target.value))}
                    >
                      <option value="Simulated">Simulated</option>
                      <option value="Standardized">Standardized</option>
                    </select>
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
                    <span className="text-sm text-gray-700">Level of learner and discipline</span>
                    <input
                      className={inputClass}
                      value={firstNonEmptyString(
                        getField(["admin", "learner_level"]),
                        getField(["admin", "academic_year"])
                      )}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setField(["admin", "learner_level"], nextValue);
                        setField(["admin", "academic_year"], nextValue);
                      }}
                    />
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Learning Objectives</span>
                      <button
                        type="button"
                        onClick={() => addListRow(["admin", "learning_objectives"], emptyTextRow)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                      >
                        + Add bullet
                      </button>
                    </div>
                    {getList(["admin", "learning_objectives"], emptyTextRow).map((entry, idx) => (
                      <div key={`learning-objective-${idx}`} className="flex items-center gap-2">
                        <span className="text-gray-600">-</span>
                        <input
                          className={inputClass}
                          placeholder="Learning objective"
                          value={String(entry?.text || "")}
                          onChange={(e) => updateListRowText(["admin", "learning_objectives"], idx, e.target.value, emptyTextRow)}
                        />
                        <button
                          type="button"
                          onClick={() => removeListRow(["admin", "learning_objectives"], idx, emptyTextRow)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">SP Demographics & Recruitment Guidelines</span>
                    <input className={inputClass} value={getField(["admin", "patient_demographic"]) || ""} onChange={(e) => setField(["admin", "patient_demographic"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Special Instructions for Staff & Room Setup</span>
                    <textarea rows={2} className={textAreaClass} value={getField(["admin", "staff_room_setup_instructions"]) || ""} onChange={(e) => setField(["admin", "staff_room_setup_instructions"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Content Warning</span>
                    <textarea rows={2} className={textAreaClass} value={getField(["admin", "content_warning"]) || ""} onChange={(e) => setField(["admin", "content_warning"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Special Supplies & Props Needed</span>
                    <input className={inputClass} value={getField(["admin", "special_supplies"]) || ""} onChange={(e) => setField(["admin", "special_supplies"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Case Factors (Social Determinants of Health)</span>
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
                <span className="text-base font-semibold text-gray-900">Door Note and Learner Instruction</span>
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
                    <DOBDatePicker
                      className={inputClass}
                      value={getField(["patient", "date_of_birth"]) || ""}
                      onChange={(nextValue) => setField(["patient", "date_of_birth"], nextValue)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Diagnosis</span>
                    <input
                      className={`${inputClass} bg-gray-100 text-gray-600`}
                      value={getField(["admin", "diagnosis"]) || ""}
                      readOnly
                    />
                  </label>
                  <label className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={getField(["patient", "vitals_included_on_door_note"]) !== false}
                      onChange={(e) => setField(["patient", "vitals_included_on_door_note"], e.target.checked)}
                    />
                    <span>Vitals included on door note</span>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Context</span>
                    <textarea rows={3} className={textAreaClass} value={getField(["patient", "context"]) || ""} onChange={(e) => setField(["patient", "context"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Task</span>
                    <textarea rows={3} className={textAreaClass} value={getField(["patient", "task"]) || ""} onChange={(e) => setField(["patient", "task"], e.target.value)} />
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
                    <span className="text-sm text-gray-700">Blood Oxygen Saturation (%)</span>
                    <input type="number" className={inputClass} value={getField(["patient", "vitals", "blood_oxygen"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "blood_oxygen"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Systolic Pressure (mmHg)</span>
                    <input type="number" className={inputClass} value={getField(["patient", "vitals", "pressure", "top"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "pressure", "top"], e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Diastolic Pressure (mmHg)</span>
                    <input type="number" className={inputClass} value={getField(["patient", "vitals", "pressure", "bottom"]) ?? ""} onChange={(e) => setNumberField(["patient", "vitals", "pressure", "bottom"], e.target.value)} />
                  </label>
                  <div className="space-y-1">
                    <span className="text-sm text-gray-700">Temperature</span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr]">
                      <input
                        type="number"
                        className={inputClass}
                        placeholder="Reading"
                        value={getField(["patient", "vitals", "temp", "reading"]) ?? ""}
                        onChange={(e) => setNumberField(["patient", "vitals", "temp", "reading"], e.target.value)}
                      />
                      <select
                        className={`${inputClass} pr-8`}
                        value={getField(["patient", "vitals", "temp", "unit"]) ?? ""}
                        onChange={(e) => setNumberField(["patient", "vitals", "temp", "unit"], e.target.value)}
                      >
                        <option value="">Select unit</option>
                        <option value="0">Celsius</option>
                        <option value="1">Fahrenheit</option>
                      </select>
                    </div>
                  </div>
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
	              <div className={sectionLabelClass}>Disclosure Framework</div>
	              {disclosureFrameworkFields.map(([key, label, helperText]) => (
	                <label key={`disclosure-${key}`} className="block space-y-1">
	                  <span className="text-sm text-gray-700">{label}</span>
	                  {helperText ? <span className="block text-xs text-gray-500">{helperText}</span> : null}
	                  <textarea
	                    rows={3}
	                    className={textAreaClass}
	                    value={getField(["sp", "disclosure_framework", key]) || ""}
	                    onChange={(e) => setField(["sp", "disclosure_framework", key], e.target.value)}
	                  />
	                </label>
	              ))}
	              <div className={sectionLabelClass}>Character Attributes</div>
	              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
	                {characterAttributeFields.map(([key, label]) => (
	                  <label key={`character-attribute-${key}`} className="block space-y-1">
	                    <span className="text-sm text-gray-700">{label}</span>
                      <select
                        className={`${inputClass} pr-8`}
                        value={normalizeCharacterAttributeLevel(getField(["sp", "character_attributes", key]))}
                        onChange={(e) => setField(["sp", "character_attributes", key], normalizeCharacterAttributeLevel(e.target.value))}
                      >
                        {characterAttributeLevelOptions.map((option) => (
                          <option key={`character-attribute-level-${key}-${option.value || "blank"}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
	                  </label>
	                ))}
	              </div>
	              <div className={sectionLabelClass}>Presentation & Resulting Behaviors</div>
	              {presentationBehaviorFields.map(([key, label]) => (
	                <label key={`presentation-${key}`} className="block space-y-1">
	                  <span className="text-sm text-gray-700">{label}</span>
	                  <textarea
	                    rows={3}
	                    className={textAreaClass}
	                    value={getField(["sp", "presentation_behaviors", key]) || ""}
	                    onChange={(e) => setField(["sp", "presentation_behaviors", key], e.target.value)}
	                    placeholder={
	                      key === "note" ? "changes as the case progresses, etc." : ""
	                    }
	                  />
	                </label>
	              ))}
	              <div className={sectionLabelClass}>Gender Identity & Expression</div>
	              <a
	                href="https://thecenter.wsu.edu/resources/"
	                target="_blank"
	                rel="noreferrer"
	                className="inline-block text-xs font-semibold text-[#981e32] hover:underline"
	              >
	                https://thecenter.wsu.edu/resources/
	              </a>
	              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
	                {genderIdentityFields.map(([key, label]) => (
	                  <label key={`gender-identity-${key}`} className="block space-y-1">
	                    <span className="text-sm text-gray-700">{label}</span>
	                    <textarea
	                      rows={2}
	                      className={textAreaClass}
	                      value={getField(["sp", "gender_identity_expression", key]) || ""}
	                      onChange={(e) => setField(["sp", "gender_identity_expression", key], e.target.value)}
	                    />
	                  </label>
	                ))}
	              </div>
	              <label className="block space-y-1">
	                <span className="text-sm text-gray-700">Other SP Notes</span>
	                <textarea
                  rows={3}
                  className={textAreaClass}
                  value={getField(["sp", "other_sp_notes"]) || ""}
                  onChange={(e) => setField(["sp", "other_sp_notes"], e.target.value)}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#981e32] focus:ring-[#981e32]"
                  checked={Boolean(getField(["sp", "sp_feedback_enabled"]))}
                  onChange={(e) => setField(["sp", "sp_feedback_enabled"], e.target.checked)}
                />
                <span>SP Feedback (adds a Feedback Page to PDF output)</span>
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-gray-700">Custom Feedback Notes</span>
                <textarea
                  rows={3}
                  className={textAreaClass}
                  value={getField(["sp", "custom_feedback_notes"]) || ""}
                  onChange={(e) => setField(["sp", "custom_feedback_notes"], e.target.value)}
                  disabled={!getField(["sp", "sp_feedback_enabled"])}
                  placeholder="Enter SP feedback guidance for the feedback page..."
                />
              </label>
                </div>
              ) : null}
            </div>

	            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
	              <button
	                type="button"
	                onClick={() => setIsHpiOpen((prev) => !prev)}
	                className="flex w-full items-center justify-between text-left"
	              >
	                <span className="text-base font-semibold text-gray-900">History of Present Illness (HPI)</span>
	                <span className="text-base font-semibold text-gray-700">{isHpiOpen ? "(-)" : "(+)"}</span>
	              </button>
	              {isHpiOpen ? (
	                <div className="space-y-4">
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
                  {[
                    ["symptom_settings", "Setting in Which Symptom(s) Occur"],
                    ["symptom_timing", "Timing of Symptom(s)"],
                    ["associated_symptoms", "Associated Symptoms"],
                    ["radiation_of_symptoms", "Radiation of Symptom(s)"],
                  ].map(([k, label]) => (
                    <div key={k} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{label}</span>
	                        <button
	                          type="button"
	                          onClick={() => addListRow(["sp", "current_ill_history", k], emptyTextRow)}
	                          className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                          aria-label="Add row"
                        >
	                          +
	                        </button>
	                      </div>
	                      {getList(["sp", "current_ill_history", k], emptyTextRow).map((entry, idx) => (
	                        <div key={`${k}-row-${idx}`} className="flex items-center gap-2">
	                          <input
	                            className={`${inputClass} flex-1`}
	                            value={typeof entry === "string" ? entry : entry?.text || ""}
	                            onChange={(e) => updateListRowText(["sp", "current_ill_history", k], idx, e.target.value, emptyTextRow)}
	                          />
                          <button
                            type="button"
                            onClick={() => removeListRow(["sp", "current_ill_history", k], idx, emptyTextRow)}
                            className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                            aria-label="Remove row"
                          >
                            -
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                  {[
                    ["alleviating_factors", "Alleviating Factors of Symptom(s)"],
                    ["aggravating_factors", "Aggravating Factors of Symptom(s)"],
                  ].map(([k, label]) => (
                    <label key={k} className="block space-y-1">
                      <span className="text-sm text-gray-700">{label}</span>
                      <input className={inputClass} value={getField(["sp", "current_ill_history", k]) || ""} onChange={(e) => setField(["sp", "current_ill_history", k], e.target.value)} />
                    </label>
                  ))}
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Quality of Symptom(s)</span>
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
                  <label className="block space-y-1">
                    <span className="text-sm text-gray-700">Pain Notes</span>
                    <textarea
                      rows={3}
                      className={textAreaClass}
                      value={getField(["sp", "current_ill_history", "pain_notes"]) || ""}
                      onChange={(e) => setField(["sp", "current_ill_history", "pain_notes"], e.target.value)}
                    />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Generic Name</span>
                        <input
                          className={inputClass}
                          placeholder="Acetaminophen"
                          value={String(entry?.generic_name || entry?.generic || "")}
                          onChange={(e) => updateListRowField(["med_hist", "medications"], idx, "generic_name", e.target.value, emptyPrescriptionRow)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Brand Name</span>
                        <input
                          className={inputClass}
                          placeholder="Tylenol"
                          value={String(entry?.brand_name || entry?.brand_substance || entry?.brand || entry?.name || "")}
                          onChange={(e) => updateListRowField(["med_hist", "medications"], idx, "brand_name", e.target.value, emptyPrescriptionRow)}
                        />
                      </label>
                    </div>
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
                      <span className="text-sm text-gray-700">Route</span>
                      <input
                        className={inputClass}
                        placeholder="Oral"
                        value={String(entry?.route || "")}
                        onChange={(e) => updateListRowField(["med_hist", "medications"], idx, "route", e.target.value, emptyPrescriptionRow)}
                      />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Frequency</span>
                        <input
                          className={inputClass}
                          placeholder="Every 6 hours"
                          value={String(entry?.frequency || "")}
                          onChange={(e) => updateListRowField(["med_hist", "medications"], idx, "frequency", e.target.value, emptyPrescriptionRow)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Reason</span>
                        <input
                          className={inputClass}
                          placeholder="Headache pain"
                          value={String(entry?.reason || entry?.frequency_reason || "")}
                          onChange={(e) => updateListRowField(["med_hist", "medications"], idx, "reason", e.target.value, emptyPrescriptionRow)}
                        />
                      </label>
                    </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Generic Name</span>
                        <input
                          className={inputClass}
                          placeholder="Ibuprofen"
                          value={String(entry?.generic_name || entry?.generic || "")}
                          onChange={(e) => updateListRowField(["med_hist", "non_prescription_medications"], idx, "generic_name", e.target.value, emptyNonPrescriptionRow)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Brand Name</span>
                        <input
                          className={inputClass}
                          placeholder="Advil"
                          value={String(entry?.brand_name || entry?.brand_substance || entry?.brand || entry?.name || "")}
                          onChange={(e) => updateListRowField(["med_hist", "non_prescription_medications"], idx, "brand_name", e.target.value, emptyNonPrescriptionRow)}
                        />
                      </label>
                    </div>
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
                      <span className="text-sm text-gray-700">Route</span>
                      <input
                        className={inputClass}
                        placeholder="Oral"
                        value={String(entry?.route || "")}
                        onChange={(e) => updateListRowField(["med_hist", "non_prescription_medications"], idx, "route", e.target.value, emptyNonPrescriptionRow)}
                      />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Frequency</span>
                        <input
                          className={inputClass}
                          placeholder="As needed"
                          value={String(entry?.frequency || "")}
                          onChange={(e) => updateListRowField(["med_hist", "non_prescription_medications"], idx, "frequency", e.target.value, emptyNonPrescriptionRow)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Reason</span>
                        <input
                          className={inputClass}
                          placeholder="Pain relief"
                          value={String(entry?.reason || entry?.frequency_reason || "")}
                          onChange={(e) => updateListRowField(["med_hist", "non_prescription_medications"], idx, "reason", e.target.value, emptyNonPrescriptionRow)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Allergies</span>
                  <button
                    type="button"
                    onClick={() => addListRow(["med_hist", "allergies"], emptyAllergyRow)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
                  >
                    + Allergy
                  </button>
                </div>
                {getList(["med_hist", "allergies"], emptyAllergyRow).map((entry, idx) => (
                  <div key={`allergy-${idx}`} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">Allergy {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeListRow(["med_hist", "allergies"], idx, emptyAllergyRow)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-red-400 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Allergen</span>
                        <input
                          className={inputClass}
                          placeholder="Penicillin"
                          value={String(entry?.allergen || entry?.text || "")}
                          onChange={(e) => updateListRowField(["med_hist", "allergies"], idx, "allergen", e.target.value, emptyAllergyRow)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Reaction</span>
                        <input
                          className={inputClass}
                          placeholder="Rash"
                          value={String(entry?.reaction || "")}
                          onChange={(e) => updateListRowField(["med_hist", "allergies"], idx, "reaction", e.target.value, emptyAllergyRow)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Severity</span>
                        <input
                          className={inputClass}
                          placeholder="Mild, Moderate, Severe"
                          value={String(entry?.severity || "")}
                          onChange={(e) => updateListRowField(["med_hist", "allergies"], idx, "severity", e.target.value, emptyAllergyRow)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-700">Notes</span>
                        <input
                          className={inputClass}
                          placeholder="Additional context"
                          value={String(entry?.notes || "")}
                          onChange={(e) => updateListRowField(["med_hist", "allergies"], idx, "notes", e.target.value, emptyAllergyRow)}
                        />
                      </label>
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
                onClick={() => setIsPmhOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900">Past Medical History</span>
                <span className="text-base font-semibold text-gray-700">{isPmhOpen ? "(-)" : "(+)"}</span>
              </button>
              {isPmhOpen ? (
                <div className="space-y-4">
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
	                  <span className="text-sm text-gray-700">Trauma</span>
	                  <button
	                    type="button"
	                    onClick={() => addListRow(["med_hist", "past_med_his", "trauma"], emptyTextRow)}
	                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-[#981e32] hover:text-[#981e32]"
	                  >
	                    + Line
	                  </button>
	                </div>
	                {getList(["med_hist", "past_med_his", "trauma"], emptyTextRow).map((entry, idx) => (
	                  <div key={`pmh-trauma-${idx}`} className="flex items-center gap-2">
	                    <input
	                      className={inputClass}
	                      value={String(entry?.text || "")}
	                      onChange={(e) => updateListRowText(["med_hist", "past_med_his", "trauma"], idx, e.target.value, emptyTextRow)}
	                    />
	                    <button
	                      type="button"
	                      onClick={() => removeListRow(["med_hist", "past_med_his", "trauma"], idx, emptyTextRow)}
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
	                ["transfusion", "Transfusion History"],
	                ["psychiatric", "Psychiatric History"],
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
	              <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
	                <div className={sectionLabelClass}>Obstetric / Gynecologic</div>
	                {obstetricGynecologicTextFields.slice(0, 3).map(([key, label]) => (
	                  <label key={`obgyn-text-${key}`} className="block space-y-1">
	                    <span className="text-sm text-gray-700">{label}</span>
	                    <input
	                      className={inputClass}
	                      value={String(getField(["med_hist", "past_med_his", "obstetric_gynecologic", key]) || "")}
	                      onChange={(e) => setField(["med_hist", "past_med_his", "obstetric_gynecologic", key], e.target.value)}
	                    />
	                  </label>
	                ))}
	                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
	                  <label className="block space-y-1">
	                    <span className="text-sm text-gray-700">Pregnancies</span>
	                    <input
	                      type="number"
	                      min="0"
	                      step="1"
	                      className={inputClass}
	                      value={getField(["med_hist", "past_med_his", "obstetric_gynecologic", "pregnancies"]) ?? ""}
	                      onChange={(e) => setNumberField(["med_hist", "past_med_his", "obstetric_gynecologic", "pregnancies"], e.target.value)}
	                    />
	                  </label>
	                  <label className="block space-y-1">
	                    <span className="text-sm text-gray-700">Births</span>
	                    <input
	                      type="number"
	                      min="0"
	                      step="1"
	                      className={inputClass}
	                      value={getField(["med_hist", "past_med_his", "obstetric_gynecologic", "births"]) ?? ""}
	                      onChange={(e) => setNumberField(["med_hist", "past_med_his", "obstetric_gynecologic", "births"], e.target.value)}
	                    />
	                  </label>
	                </div>
	                <label className="block space-y-1">
	                  <span className="text-sm text-gray-700">{obstetricGynecologicTextFields[3][1]}</span>
	                  <input
	                    className={inputClass}
	                    value={String(getField(["med_hist", "past_med_his", "obstetric_gynecologic", "pregnancy_births_explanation"]) || "")}
	                    onChange={(e) => setField(["med_hist", "past_med_his", "obstetric_gynecologic", "pregnancy_births_explanation"], e.target.value)}
	                  />
	                </label>
	              </div>

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
	                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
	                      <label className="block space-y-1">
	                        <span className="text-sm text-gray-700">Family Member</span>
	                        <select
	                          className={`${inputClass} pr-8`}
	                          value={String(entry?.family_member || "")}
	                          onChange={(e) => updateFamilyHistoryRow(idx, "family_member", e.target.value)}
	                        >
	                          <option value="">Select family member</option>
	                          {familyMemberOptions.map((option) => (
	                            <option key={`family-member-option-${option}`} value={option}>
	                              {option}
	                            </option>
	                          ))}
	                        </select>
	                      </label>
	                      <label className="block space-y-1">
	                        <span className="text-sm text-gray-700">Age</span>
	                        <input
	                          className={inputClass}
	                          placeholder="e.g., 67, late 50s, unknown"
	                          value={String(entry?.age_text || entry?.age || "")}
	                          onChange={(e) => updateFamilyHistoryRow(idx, "age_text", e.target.value)}
	                        />
	                      </label>
	                    </div>
	                    <label className="block space-y-1">
	                      <span className="text-sm text-gray-700">Health Details & Additional Details</span>
	                      <textarea
	                        rows={4}
	                        className={textAreaClass}
	                        placeholder="Conditions, relevant history, outcomes, and any other family context"
	                        value={String(entry?.details || "")}
	                        onChange={(e) => updateFamilyHistoryRow(idx, "details", e.target.value)}
	                      />
	                    </label>
	                  </div>
	                ))}
	                <label className="block space-y-1">
	                  <span className="text-sm text-gray-700">General Family Notes</span>
	                  <textarea
	                    rows={3}
	                    className={textAreaClass}
	                    value={getField(["med_hist", "family_general_notes"]) || ""}
	                    onChange={(e) => setField(["med_hist", "family_general_notes"], e.target.value)}
	                  />
	                </label>
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
	              {[
	                ["personal_background", "Personal Background"],
	                ["nutrion_and_exercise", "Nutritional and Excercise History"],
	                ["safety_measure", "Safety Measures"],
	                ["life_stressors", "Significant Life Stressors"],
	              ].map(([k, label]) => (
	                <label key={k} className="block space-y-1">
	                  <span className="text-sm text-gray-700">{label}</span>
	                  <textarea rows={3} className={textAreaClass} value={getField(["med_hist", "social_hist", k]) || ""} onChange={(e) => setField(["med_hist", "social_hist", k], e.target.value)} />
	                </label>
	              ))}
	              <div className="space-y-3">
	                <div className="text-sm font-semibold text-gray-700">Military, Community, Education & Employment</div>
	                {socialHistorySplitFields.map(([key, label]) => (
	                  <label key={`social-split-${key}`} className="block space-y-1">
	                    <span className="text-sm text-gray-700">{label}</span>
	                    <input
	                      className={inputClass}
	                      value={getField(["med_hist", "social_hist", key]) || ""}
	                      onChange={(e) => setField(["med_hist", "social_hist", key], e.target.value)}
	                    />
	                  </label>
	                ))}
	              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-700">Social Support</div>
                {[
                  ["family_friends", "Family & Friends"],
                  ["financial", "Financial"],
                  ["healthcare_access_insurance", "Healthcare Access & Insurance"],
                  ["religious_or_community_groups", "Religious or Community Groups"],
                ].map(([k, label]) => (
                  <label key={k} className="block space-y-1">
                    <span className="text-sm text-gray-700">{label}</span>
                    <textarea
                      rows={2}
                      className={textAreaClass}
                      value={getField(["med_hist", "social_hist", "social_support", k]) || ""}
                      onChange={(e) =>
                        setField(["med_hist", "social_hist", "social_support", k], e.target.value)
                      }
                    />
                  </label>
                ))}
              </div>

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

	              <div className="space-y-3">
	                <div className="text-sm font-semibold text-gray-700">Sexual History</div>
	                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
	                  <label className="block space-y-1">
	                    <span className="text-sm text-gray-700">Current sexual partners</span>
	                    <input
	                      type="number"
	                      min="0"
	                      step="1"
	                      className={inputClass}
	                      value={getField(["med_hist", "social_hist", "sex_history", "current_partners"]) ?? ""}
	                      onChange={(e) => setNumberField(["med_hist", "social_hist", "sex_history", "current_partners"], e.target.value)}
	                    />
	                  </label>
	                  <label className="block space-y-1">
	                    <span className="text-sm text-gray-700">Lifetime sexual partners</span>
	                    <input
	                      type="number"
	                      min="0"
	                      step="1"
	                      className={inputClass}
	                      value={getField(["med_hist", "social_hist", "sex_history", "lifetime_partners"]) ?? getField(["med_hist", "social_hist", "sex_history", "past_partners"]) ?? ""}
	                      onChange={(e) => {
	                        setNumberField(["med_hist", "social_hist", "sex_history", "lifetime_partners"], e.target.value);
	                        setNumberField(["med_hist", "social_hist", "sex_history", "past_partners"], e.target.value);
	                      }}
	                    />
	                  </label>
	                </div>
	                <label className="block space-y-1">
	                  <span className="text-sm text-gray-700">All other details</span>
	                  <textarea
	                    rows={2}
	                    className={textAreaClass}
	                    value={getField(["med_hist", "social_hist", "sex_history", "other_details"]) || ""}
	                    onChange={(e) => setField(["med_hist", "social_hist", "sex_history", "other_details"], e.target.value)}
	                  />
	                </label>
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

            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-base font-semibold text-gray-900">Physical Examination</div>
              <textarea
                rows={4}
                className={textAreaClass}
                placeholder="Enter physical examination findings..."
                value={getField(["admin", "physical_examination"]) || ""}
                onChange={(e) => setField(["admin", "physical_examination"], e.target.value)}
              />
            </div>

            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-base font-semibold text-gray-900">Final Page Notes</div>
              <textarea
                rows={4}
                className={textAreaClass}
                placeholder="Enter notes for Part 5..."
                value={getField(["admin", "final_page_notes"]) || ""}
                onChange={(e) => setField(["admin", "final_page_notes"], e.target.value)}
              />
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
            ) : null}

	          <div className="flex flex-wrap gap-3">
	          <button
              type="submit"
              disabled={
                submitting
                || (isPrefillMode && (prefillLoading || !prefillRequest))
                || (isCloneMode && cloneLoading)
              }
              className="rounded-full bg-emerald-600 text-white px-5 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-70"
            >
	            {submitting
	              ? (isPrefillMode ? "Saving..." : (isCloneMode ? "Creating..." : "Submitting..."))
	              : (isPrefillMode ? "Save Version" : (isCloneMode ? "Create Cloned Script" : "Submit"))}
	          </button>
		          <button
		            type="button"
		            className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:bg-gray-50"
		            onClick={handleBacktrack}
		          >
		            Cancel
	          </button>
          <button
            type="button"
            className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:bg-gray-50"
            onClick={async () => {
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
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
            {isPreviewMode ? (
		          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
	            <div className="text-xs text-gray-500">Tip: double-click a value below to edit inline.</div>
	            <div className="text-center space-y-1">
	              <div className="text-xs uppercase tracking-[0.25em] text-gray-500">Virtual Clinical Center</div>
	              <h3 className="text-xl font-semibold text-[#981e32]">
                  {renderInlineValue({
                    path: ["admin", "reson_for_visit"],
                    displayValue: getField(["admin", "reson_for_visit"]) || "Script Preview",
                    empty: "Script Preview",
                  })}
                </h3>
	              <div className="text-sm text-gray-700">
	                {renderInlineValue({
                    path: ["admin", "diagnosis"],
                    displayValue: getField(["admin", "diagnosis"]) || "Diagnosis TBD",
                    empty: "Diagnosis TBD",
                  })}{" "}
                  |{" "}
                  {renderInlineValue({
                    path: ["admin", "case_letter"],
                    displayValue: getField(["admin", "case_letter"]) || "Case Letter",
                    empty: "Case Letter",
                  })}{" "}
                  |{" "}
                  {renderInlineValue({
                    path: ["admin", "case_authors"],
                    displayValue: getField(["admin", "case_authors"]) || "Case Authors",
                    empty: "Case Authors",
                  })}
	              </div>
	            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
	                <div className="font-semibold text-gray-900">Administrative Details</div>
	                <ul className="text-sm text-gray-700 space-y-1">
	                  <li><span className="font-semibold">Patient's Reason for the Visit:</span> {renderInlineValue({ path: ["admin", "reson_for_visit"] })}</li>
	                  <li><span className="font-semibold">Chief Complaint:</span> {renderInlineValue({ path: ["admin", "chief_concern"] })}</li>
	                  <li><span className="font-semibold">Diagnosis:</span> {renderInlineValue({ path: ["admin", "diagnosis"] })}</li>
	                  <li><span className="font-semibold">Abbreviated Diagnosis for Script Name:</span> {renderInlineValue({ path: ["admin", "abbreviated_diagnosis"] })}</li>
	                  <li><span className="font-semibold">ICD-10 Code:</span> {renderInlineValue({ path: ["admin", "icd10_code"] })}</li>
	                  <li><span className="font-semibold">Case Setting:</span> {renderInlineValue({ path: ["admin", "case_setting"] })}</li>
	                  <li><span className="font-semibold">Case Type:</span> {renderInlineValue({ path: ["admin", "case_type"] })}</li>
	                  <li><span className="font-semibold">Case Letter:</span> {renderInlineValue({ path: ["admin", "case_letter"] })}</li>
	                  <li><span className="font-semibold">Event Format:</span> {renderInlineValue({ path: ["admin", "medical_event"] })}</li>
	                  <li>
                      <span className="font-semibold">Level of learner and discipline:</span>{" "}
                      {renderInlineValue({
                        key: "admin.level_of_learner_discipline",
                        paths: [["admin", "learner_level"], ["admin", "academic_year"]],
                        value: firstNonEmptyString(
                          getField(["admin", "learner_level"]),
                          getField(["admin", "academic_year"])
                        ),
                      })}
                    </li>
	                  <li><span className="font-semibold">Case Authors:</span> {renderInlineValue({ path: ["admin", "case_authors"] })}</li>
	                </ul>
	                <div className="text-sm text-gray-700">
	                  <div className="font-semibold">Summary of Patient Story</div>
	                  <p className="text-gray-800">
                      {renderInlineValue({
                        path: ["admin", "summory_of_story"],
                        displayValue:
                          getField(["admin", "summory_of_story"]) ||
                          "Add a short narrative to summarize the case.",
                        empty: "Add a short narrative to summarize the case.",
                      })}
                    </p>
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
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">Learning Objectives</div>
                  {extractTextList(getField(["admin", "learning_objectives"])).length ? (
                    <ul className="list-disc pl-5 text-gray-800 space-y-1">
                      {extractTextList(getField(["admin", "learning_objectives"])).map((entry, idx) => (
                        <li key={`preview-learning-objective-${idx}`}>{entry}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-800">List learning objectives for learners.</p>
                  )}
                </div>
              </div>

		              <div className="space-y-2">
		                <div className="font-semibold text-gray-900">Patient Snapshot</div>
			                <ul className="text-sm text-gray-700 space-y-1">
			                  <li><span className="font-semibold">Patient:</span> {renderInlineValue({ path: ["patient", "name"] })}</li>
			                  <li><span className="font-semibold">Date of Birth:</span> {renderInlineValue({ path: ["patient", "date_of_birth"] })}</li>
			                  <li><span className="font-semibold">Diagnosis:</span> {renderInlineValue({ path: ["admin", "diagnosis"] })}</li>
			                  <li><span className="font-semibold">Context:</span> {renderInlineValue({ path: ["patient", "context"] })}</li>
			                  <li><span className="font-semibold">Task:</span> {renderInlineValue({ path: ["patient", "task"] })}</li>
		                  <li><span className="font-semibold">Patient Encounter Duration:</span> {renderInlineValue({ path: ["patient", "encounter_duration"] })}</li>
		                  <li><span className="font-semibold">Vitals Included on Door Note:</span> {getField(["patient", "vitals_included_on_door_note"]) === false ? "No" : "Yes"}</li>
		                </ul>
		                {getField(["patient", "vitals_included_on_door_note"]) === false ? (
		                  <div className="text-sm text-gray-700">
	                    <div className="font-semibold">Vital Signs</div>
	                    <p className="text-gray-800">Not included on door note.</p>
	                  </div>
		                ) : (
		                  <div className="text-sm text-gray-700">
	                    <div className="font-semibold">Vital Signs</div>
	                    <ul className="list-disc pl-5 space-y-1">
	                      <li><span className="font-semibold">Heart Rate:</span> {renderInlineValue({ path: ["patient", "vitals", "heart_rate"], type: "number" })} beats/min</li>
	                      <li><span className="font-semibold">Respirations:</span> {renderInlineValue({ path: ["patient", "vitals", "respirations"], type: "number" })} breaths/min</li>
	                      <li>
	                        <span className="font-semibold">Systolic Pressure:</span>{" "}
	                        {renderInlineValue({ path: ["patient", "vitals", "pressure", "top"], type: "number" })} mmHg
	                      </li>
	                      <li>
	                        <span className="font-semibold">Diastolic Pressure:</span>{" "}
	                        {renderInlineValue({ path: ["patient", "vitals", "pressure", "bottom"], type: "number" })} mmHg
	                      </li>
	                      <li><span className="font-semibold">Blood Oxygen Saturation:</span> {renderInlineValue({ path: ["patient", "vitals", "blood_oxygen"], type: "number" })}%</li>
	                      <li>
	                          {renderInlineValue({ path: ["patient", "vitals", "temp", "reading"], type: "number" })}{" "}
	                          {renderInlineValue({
	                            path: ["patient", "vitals", "temp", "unit"],
	                            type: "select",
	                            displayValue:
	                              String(getField(["patient", "vitals", "temp", "unit"]) || "") === "1"
	                                ? "Fahrenheit"
	                                : "Celsius",
	                            selectOptions: [
	                              { value: "0", label: "Celsius" },
	                              { value: "1", label: "Fahrenheit" },
	                            ],
	                          })}
	                        </li>
		                    </ul>
		                  </div>
		                )}
		              </div>
	            </div>

            <div className="grid md:grid-cols-2 gap-6">
		              <div className="space-y-2">
		                <div className="font-semibold text-gray-900">SP Content</div>
		                <div className="text-sm text-gray-700">
		                  <div className="font-semibold">Opening Statement</div>
		                  <p className="text-gray-800">{renderInlineValue({ path: ["sp", "opening_statement"] })}</p>
		                </div>
	                <div className="text-sm text-gray-700">
	                  <div className="font-semibold">Disclosure Framework</div>
	                  <ul className="list-disc pl-5 text-gray-800 space-y-1">
	                    {disclosureFrameworkFields.map(([key, label]) => (
	                      <li key={`preview-disclosure-${key}`}>
	                        <span className="font-semibold">{label}:</span>{" "}
	                        {String(getField(["sp", "disclosure_framework", key]) || "").trim() || "-"}
	                      </li>
	                    ))}
	                  </ul>
	                </div>
	                <div className="text-sm text-gray-700">
	                  <div className="font-semibold">Character Attributes</div>
	                  <ul className="list-disc pl-5 text-gray-800 space-y-1">
	                    {characterAttributeFields.map(([key, label]) => (
	                      <li key={`preview-character-attribute-${key}`}>
	                        <span className="font-semibold">{label}:</span>{" "}
	                        {String(getField(["sp", "character_attributes", key]) || "").trim() || "-"}
	                      </li>
	                    ))}
	                  </ul>
	                </div>
	                <div className="text-sm text-gray-700">
	                  <div className="font-semibold">Presentation & Resulting Behaviors</div>
	                  <ul className="list-disc pl-5 text-gray-800 space-y-1">
	                    {presentationBehaviorFields.map(([key, label]) => (
	                      <li key={`preview-presentation-${key}`}>
	                        <span className="font-semibold">{label}:</span>{" "}
	                        {String(getField(["sp", "presentation_behaviors", key]) || "").trim() || "-"}
	                      </li>
	                    ))}
	                  </ul>
	                </div>
	                <div className="text-sm text-gray-700">
	                  <div className="font-semibold">Gender Identity & Expression</div>
	                  <a
	                    href="https://thecenter.wsu.edu/resources/"
	                    target="_blank"
	                    rel="noreferrer"
	                    className="text-xs font-semibold text-[#981e32] hover:underline"
	                  >
	                    https://thecenter.wsu.edu/resources/
	                  </a>
	                  <ul className="list-disc pl-5 text-gray-800 space-y-1 mt-1">
	                    {genderIdentityFields.map(([key, label]) => (
	                      <li key={`preview-gender-identity-${key}`}>
	                        <span className="font-semibold">{label}:</span>{" "}
	                        {String(getField(["sp", "gender_identity_expression", key]) || "").trim() || "-"}
	                      </li>
	                    ))}
	                  </ul>
	                </div>
	                <div className="text-sm text-gray-700">
	                  <div className="font-semibold">Other SP Notes</div>
	                  <p className="text-gray-800">{renderInlineValue({ path: ["sp", "other_sp_notes"] })}</p>
	                </div>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">SP Feedback</div>
                  <p className="text-gray-800">
                    {Boolean(getField(["sp", "sp_feedback_enabled"])) ? "Enabled" : "Disabled"}
                  </p>
                </div>
                {Boolean(getField(["sp", "sp_feedback_enabled"])) ? (
                  <div className="text-sm text-gray-700">
                    <div className="font-semibold">Custom Feedback Notes</div>
                    <p className="text-gray-800">
                      {String(getField(["sp", "custom_feedback_notes"]) || "").trim() || "-"}
                    </p>
                  </div>
                ) : null}
	              </div>

	              <div className="space-y-2">
	                <div className="font-semibold text-gray-900">History of Present Illness (HPI)</div>
	                <ul className="text-sm text-gray-700 space-y-1">
	                  <li><span className="font-semibold">Setting in Which Symptom(s) Occur:</span> {extractTextList(getField(["sp", "current_ill_history", "symptom_settings"])).join(", ") || "-"}</li>
	                  <li><span className="font-semibold">Timing of Symptom(s):</span> {extractTextList(getField(["sp", "current_ill_history", "symptom_timing"])).join(", ") || "-"}</li>
	                  <li><span className="font-semibold">Associated Symptoms:</span> {extractTextList(getField(["sp", "current_ill_history", "associated_symptoms"])).join(", ") || "-"}</li>
	                  <li><span className="font-semibold">Radiation of Symptom(s):</span> {extractTextList(getField(["sp", "current_ill_history", "radiation_of_symptoms"])).join(", ") || "-"}</li>
	                  <li><span className="font-semibold">Quality of Symptom(s):</span> {renderInlineValue({ path: ["sp", "current_ill_history", "symptom_quality"] })}</li>
	                  <li><span className="font-semibold">Alleviating Factors of Symptom(s):</span> {renderInlineValue({ path: ["sp", "current_ill_history", "alleviating_factors"] })}</li>
	                  <li><span className="font-semibold">Aggravating Factors of Symptom(s):</span> {renderInlineValue({ path: ["sp", "current_ill_history", "aggravating_factors"] })}</li>
	                  <li><span className="font-semibold">Severity (0-10):</span> {renderInlineValue({ path: ["sp", "current_ill_history", "pain"], type: "number", empty: "0" })}</li>
	                  <li><span className="font-semibold">Pain Notes:</span> {renderInlineValue({ path: ["sp", "current_ill_history", "pain_notes"] })}</li>
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
                <div className="font-semibold text-gray-900">Case Factors and Special Supplies</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><span className="font-semibold">Special Supplies & Props Needed:</span> {renderInlineValue({ path: ["admin", "special_supplies"] })}</li>
                  <li><span className="font-semibold">Case Factors (Social Determinants of Health):</span> {renderInlineValue({ path: ["admin", "case_factors"] })}</li>
                  <li><span className="font-semibold">SP Demographics & Recruitment Guidelines:</span> {renderInlineValue({ path: ["admin", "patient_demographic"] })}</li>
                  <li><span className="font-semibold">Special Instructions for Staff & Room Setup:</span> {renderInlineValue({ path: ["admin", "staff_room_setup_instructions"] })}</li>
                  <li><span className="font-semibold">Content Warning:</span> {renderInlineValue({ path: ["admin", "content_warning"] })}</li>
                </ul>
              </div>
	            </div>

	            <div className="grid md:grid-cols-2 gap-6">
		              <div className="space-y-2">
		                <div className="font-semibold text-gray-900">Past Medical History</div>
		                <div className="space-y-2 text-sm text-gray-700">
		                  {pastMedicalGroups.map(([key, label]) => {
		                    const lines = extractTextList(getField(["med_hist", "past_med_his", key]));
		                    return (
		                      <div key={`preview-pmh-${key}`}>
		                        <div className="font-semibold text-gray-800">{label}</div>
		                        {lines.length ? (
		                          <ul className="list-disc pl-5">
		                            {lines.map((entry, idx) => (
		                              <li key={`preview-pmh-line-${key}-${idx}`}>{entry}</li>
		                            ))}
		                          </ul>
		                        ) : (
		                          <div>-</div>
		                        )}
		                      </div>
		                    );
		                  })}
		                  <div>
		                    <div className="font-semibold text-gray-800">Obstetric / Gynecologic</div>
		                    <ul className="list-disc pl-5">
		                      {obstetricGynecologicTextFields.slice(0, 3).map(([key, label]) => (
		                        <li key={`preview-obgyn-${key}`}>
		                          <span className="font-semibold">{label}:</span>{" "}
		                          {renderInlineValue({ path: ["med_hist", "past_med_his", "obstetric_gynecologic", key] })}
		                        </li>
		                      ))}
		                      <li>
		                        <span className="font-semibold">Pregnancies:</span>{" "}
		                        {renderInlineValue({
		                          path: ["med_hist", "past_med_his", "obstetric_gynecologic", "pregnancies"],
		                          type: "number",
		                          empty: "-",
		                        })}
		                      </li>
		                      <li>
		                        <span className="font-semibold">Births:</span>{" "}
		                        {renderInlineValue({
		                          path: ["med_hist", "past_med_his", "obstetric_gynecologic", "births"],
		                          type: "number",
		                          empty: "-",
		                        })}
		                      </li>
		                      <li>
		                        <span className="font-semibold">{obstetricGynecologicTextFields[3][1]}:</span>{" "}
		                        {renderInlineValue({
		                          path: ["med_hist", "past_med_his", "obstetric_gynecologic", "pregnancy_births_explanation"],
		                        })}
		                      </li>
		                    </ul>
		                  </div>
		                </div>
		              </div>
		              <div className="space-y-2">
		                <div className="font-semibold text-gray-900">Preventative Medicine</div>
		                <div className="space-y-2 text-sm text-gray-700">
		                  {preventativeGroups.map(([key, label]) => {
		                    const lines = extractTextList(getField(["med_hist", "preventative_measure", key]));
		                    return (
		                      <div key={`preview-preventative-${key}`}>
		                        <div className="font-semibold text-gray-800">{label}</div>
		                        {lines.length ? (
		                          <ul className="list-disc pl-5">
		                            {lines.map((entry, idx) => (
		                              <li key={`preview-preventative-line-${key}-${idx}`}>{entry}</li>
		                            ))}
		                          </ul>
		                        ) : (
		                          <div>-</div>
		                        )}
		                      </div>
	                    );
	                  })}
	                </div>
	              </div>
	            </div>

		            <div className="space-y-2">
		              <div className="font-semibold text-gray-900">Family Medical History</div>
		              <div className="rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700">
		                {familyHistoryLines.length ? (
	                  <ul className="list-disc pl-5 space-y-1">
	                    {familyHistoryLines.map((line, idx) => (
	                      <li key={`preview-family-history-${idx}`}>{line}</li>
	                    ))}
	                  </ul>
		                ) : (
		                  <div>None</div>
		                )}
		              </div>
		              <div className="text-sm text-gray-700">
		                <span className="font-semibold">General Family Notes:</span>{" "}
		                {renderInlineValue({ path: ["med_hist", "family_general_notes"] })}
		              </div>
		            </div>

	            <div className="grid md:grid-cols-2 gap-6">
		              <div className="space-y-2">
		                <div className="font-semibold text-gray-900">Social History</div>
	                <ul className="text-sm text-gray-700 space-y-1">
	                  <li><span className="font-semibold">Background:</span> {renderInlineValue({ path: ["med_hist", "social_hist", "personal_background"] })}</li>
	                  <li><span className="font-semibold">Nutrition/Exercise:</span> {renderInlineValue({ path: ["med_hist", "social_hist", "nutrion_and_exercise"] })}</li>
	                  <li><span className="font-semibold">Safety Measures:</span> {renderInlineValue({ path: ["med_hist", "social_hist", "safety_measure"] })}</li>
	                  <li><span className="font-semibold">Life Stressors:</span> {renderInlineValue({ path: ["med_hist", "social_hist", "life_stressors"] })}</li>
	                </ul>
	                <div className="text-sm text-gray-700">
	                  <div className="font-semibold">Military, Community, Education & Employment</div>
	                  <ul className="list-disc pl-5 space-y-1">
	                    {socialHistorySplitFields.map(([key, label]) => (
	                      <li key={`preview-social-split-${key}`}>
	                        <span className="font-semibold">{label}:</span>{" "}
	                        {renderInlineValue({ path: ["med_hist", "social_hist", key] })}
	                      </li>
	                    ))}
	                  </ul>
	                </div>
	                <div className="text-sm text-gray-700">
	                  <div className="font-semibold">Social Support</div>
	                  <ul className="list-disc pl-5 space-y-1">
	                    <li><span className="font-semibold">Family & Friends:</span> {renderInlineValue({ path: ["med_hist", "social_hist", "social_support", "family_friends"] })}</li>
                    <li><span className="font-semibold">Financial:</span> {renderInlineValue({ path: ["med_hist", "social_hist", "social_support", "financial"] })}</li>
                    <li><span className="font-semibold">Healthcare Access & Insurance:</span> {renderInlineValue({ path: ["med_hist", "social_hist", "social_support", "healthcare_access_insurance"] })}</li>
                    <li><span className="font-semibold">Religious or Community Groups:</span> {renderInlineValue({ path: ["med_hist", "social_hist", "social_support", "religious_or_community_groups"] })}</li>
                  </ul>
                </div>
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
	                  <ul className="list-disc pl-5 space-y-1">
	                    <li><span className="font-semibold">Current sexual partners:</span> {renderInlineValue({ path: ["med_hist", "social_hist", "sex_history", "current_partners"], type: "number", empty: "-" })}</li>
	                    <li><span className="font-semibold">Lifetime sexual partners:</span> {renderInlineValue({ path: ["med_hist", "social_hist", "sex_history", "lifetime_partners"], type: "number", empty: "-" })}</li>
	                    <li><span className="font-semibold">All other details:</span> {renderInlineValue({ path: ["med_hist", "social_hist", "sex_history", "other_details"] })}</li>
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
            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Physical Examination</div>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {String(getField(["admin", "physical_examination"]) || "").trim() || "-"}
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Final Page Notes</div>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {String(getField(["admin", "final_page_notes"]) || "").trim() || "-"}
              </p>
            </div>
	            <div className="space-y-2">
	              <div className="font-semibold text-gray-900">Attachments</div>
	              <div className="rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700">
	                {attachmentNames.length ? (
	                  <ul className="list-disc pl-5 space-y-1">
	                    {attachmentNames.map((name, idx) => (
	                      <li key={`preview-attachment-${idx}`}>{name}</li>
	                    ))}
	                  </ul>
	                ) : (
	                  <div>No attachments added.</div>
	                )}
	              </div>
	            </div>
	          </div>
          ) : null}
        </form>
      </div>
      <Modal
        open={saveVersionModalOpen}
        title="Save Version"
        onClose={() => {
          if (submitting) return;
          setSaveVersionModalOpen(false);
        }}
      >
        <div className="space-y-4 text-sm text-gray-700">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="save-version-mode"
              className="mt-0.5"
              checked={saveVersionMode === "new"}
              onChange={() => setSaveVersionMode("new")}
              disabled={submitting}
            />
            <span>Save as new version ({nextRequestVersionLabel})</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="save-version-mode"
              className="mt-0.5"
              checked={saveVersionMode === "overwrite"}
              onChange={() => {
                setSaveVersionMode("overwrite");
                if (!overwriteVersionTarget) {
                  setOverwriteVersionTarget(requestSavedVersions[0]?.version || "");
                }
              }}
              disabled={submitting || !requestSavedVersions.length}
            />
            <span>Overwrite existing version</span>
          </label>
          {saveVersionMode === "overwrite" ? (
            <select
              value={overwriteVersionTarget}
              onChange={(event) => setOverwriteVersionTarget(String(event.target.value || "").trim())}
              disabled={submitting || !requestSavedVersions.length}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {requestSavedVersions.length ? (
                requestSavedVersions.map((entry) => (
                  <option key={entry.version} value={entry.version}>
                    {entry.version}
                  </option>
                ))
              ) : (
                <option value="">No saved versions yet</option>
              )}
            </select>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSaveVersionModalOpen(false)}
              className="rounded border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void onConfirmSaveVersion();
              }}
              className="rounded bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
              disabled={submitting || (saveVersionMode === "overwrite" && !overwriteVersionTarget)}
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
};

export default RequestNew;

