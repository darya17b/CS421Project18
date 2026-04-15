// builds script object
// from the minimal Request New form fields.

const hasText = (value) => String(value || "").trim() !== "";

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
};

const extractTextEntries = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object" && hasText(entry.text)) return entry.text;
        return "";
      })
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }
  if (value && typeof value === "object") {
    if (hasText(value.text)) return [String(value.text).trim()];
    return [];
  }
  const text = String(value || "").trim();
  return text ? [text] : [];
};

const normalizeMedicationEntries = (value) => {
  const toMedication = (entry) => {
    if (typeof entry === "string") {
      const text = String(entry || "").trim();
      if (!text) return null;
      return {
        name: text,
        brand: text,
        generic: "",
        dose: "",
        route: "",
        frequency: "",
        reason: "",
        startDate: "",
        otherNotes: "",
      };
    }
    if (!entry || typeof entry !== "object") return null;
    if (hasText(entry.text)) {
      const text = String(entry.text).trim();
      return {
        name: text,
        brand: text,
        generic: "",
        dose: "",
        route: "",
        frequency: "",
        reason: "",
        startDate: "",
        otherNotes: "",
      };
    }
    const generic = String(entry.generic_name || entry.generic || "").trim();
    const brand = String(entry.brand_name || entry.brand_substance || entry.brand || "").trim();
    const name = String(entry.name || "").trim() || generic || brand;
    const amount = String(entry.amount || "").trim();
    const unit = String(entry.unit || "").trim();
    const dose = (amount && unit ? `${amount}${unit}` : amount || String(entry.dose || "").trim());
    const route = String(entry.route || "").trim();
    const frequency = String(entry.frequency || "").trim();
    const reason = String(entry.reason || entry.frequency_reason || "").trim();
    const startDate = String(entry.startDate || "").trim();
    const otherNotes = String(entry.otherNotes || "").trim();
    const medication = {
      name,
      brand: brand || name,
      generic,
      dose,
      route,
      frequency,
      reason,
      startDate,
      otherNotes,
    };
    return Object.values(medication).some((field) => hasText(field)) ? medication : null;
  };

  const rawEntries = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
  return rawEntries
    .map((entry) => toMedication(entry))
    .filter(Boolean);
};

const normalizeNonPrescriptionEntries = (value) => {
  const formatMedicationSummary = (entry) => {
    const generic = String(entry.generic_name || entry.generic || "").trim();
    const brand = String(entry.brand_name || entry.brand_substance || entry.brand || entry.name || "").trim();
    const name = generic && brand ? `${generic} (${brand})` : generic || brand;
    const amount = String(entry.amount || "").trim();
    const unit = String(entry.unit || "").trim();
    const dose = amount && unit ? `${amount}${unit}` : amount || String(entry.dose || "").trim();
    const route = String(entry.route || "").trim();
    const frequency = String(entry.frequency || "").trim();
    const reason = String(entry.reason || entry.frequency_reason || "").trim();
    const schedule = [frequency ? `frequency: ${frequency}` : "", reason ? `reason: ${reason}` : ""]
      .filter(Boolean)
      .join(", ");
    return [[name, dose].filter(Boolean).join(" "), route ? `route: ${route}` : "", schedule]
      .filter(Boolean)
      .join(" - ")
      .trim();
  };

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return String(entry || "").trim();
        if (!entry || typeof entry !== "object") return "";
        if (hasText(entry.text)) return String(entry.text).trim();
        return formatMedicationSummary(entry);
      })
      .filter((entry) => hasText(entry));
  }

  if (value && typeof value === "object") {
    if (hasText(value.text)) return [String(value.text).trim()];
    const merged = formatMedicationSummary(value);
    return hasText(merged) ? [merged] : [];
  }

  const text = String(value || "").trim();
  return text ? [text] : [];
};

const normalizeAllergyEntries = (value) => {
  const rawEntries = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
  return rawEntries
    .map((entry) => {
      if (typeof entry === "string") {
        const text = entry.trim();
        if (!text) return null;
        return {
          allergen: text,
          reaction: "",
          severity: "",
          notes: "",
        };
      }
      if (!entry || typeof entry !== "object") return null;
      const allergy = {
        allergen: String(entry.allergen || entry.text || "").trim(),
        reaction: String(entry.reaction || "").trim(),
        severity: String(entry.severity || "").trim(),
        notes: String(entry.notes || "").trim(),
      };
      return Object.values(allergy).some((field) => hasText(field)) ? allergy : null;
    })
    .filter(Boolean);
};

const buildAllergySummary = (entry) => [
  String(entry?.allergen || "").trim(),
  hasText(entry?.reaction) ? `reaction: ${String(entry.reaction).trim()}` : "",
  hasText(entry?.severity) ? `severity: ${String(entry.severity).trim()}` : "",
  hasText(entry?.notes) ? `notes: ${String(entry.notes).trim()}` : "",
]
  .filter(Boolean)
  .join(" | ")
  .trim();

const toNumberOrZero = (value) => {
  if (value === 0 || value === "0") return 0;
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

const normalizeFamilyHistoryEntries = (value) => {
  const toFamilyEntry = (entry) => {
    if (!entry || typeof entry !== "object") return null;
    const familyMember = String(entry.family_member || entry.relation || "").trim();
    const ageText = String(entry.age_text || entry.age || "").trim();
    const detailsCore = String(
      entry.details || entry.conditions || entry.health_status || entry.notes || entry.additonal_info || ""
    ).trim();
    const additionalDetails = extractTextEntries(entry.additional_details);
    const details = [detailsCore, ...additionalDetails]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join("\n");
    const numericAge = /^\d+$/.test(ageText) ? Number(ageText) : 0;
    const normalized = {
      family_member: familyMember,
      age_text: ageText,
      details,
      relation: familyMember,
      conditions: details,
      notes: details,
      health_status: [familyMember, details].filter(Boolean).join(" - "),
      additonal_info: details,
      age: numericAge,
      cause_of_death: entry.cause_of_death || "",
    };
    return Object.values(normalized).some((field) => (typeof field === "number" ? field !== 0 : hasText(field)))
      ? normalized
      : null;
  };

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") {
          const text = String(entry || "").trim();
          if (!text) return null;
          return {
            family_member: "",
            age_text: "",
            details: text,
            relation: "",
            conditions: text,
            notes: text,
            health_status: text,
            additonal_info: text,
            age: 0,
            cause_of_death: "",
          };
        }
        return toFamilyEntry(entry);
      })
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    const one = toFamilyEntry(value);
    return one ? [one] : [];
  }

  const text = String(value || "").trim();
  if (!text) return [];
  return [{
    family_member: "",
    age_text: "",
    details: text,
    relation: "",
    conditions: text,
    notes: text,
    health_status: text,
    additonal_info: text,
    age: 0,
    cause_of_death: "",
  }];
};

const normalizeDiagramMarkers = (value) => {
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const x = Number(entry.x);
      const y = Number(entry.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      };
    })
    .filter(Boolean);
};

export function buildScriptFromForm(f = {}) {
  //  temperature unit to numeric
  const unitRaw = f.patient?.vitals?.temp?.unit;
  const tempUnit = typeof unitRaw === 'number'
    ? unitRaw
    : String(unitRaw || 'Celcius').toLowerCase().startsWith('f') ? 1 : 0;

  const medicationsArr = normalizeMedicationEntries(f.med_hist?.medications);
  const nonPrescriptionMeds = normalizeNonPrescriptionEntries(f.med_hist?.non_prescription_medications);
  const allergyDetails = (() => {
    const direct = normalizeAllergyEntries(f.med_hist?.allergies);
    if (direct.length) return direct;
    return normalizeAllergyEntries(f.med_hist?.allergies_list);
  })();
  const allergiesList = allergyDetails
    .map((entry) => buildAllergySummary(entry))
    .filter((entry) => hasText(entry));
  const obstetricSource = f.med_hist?.past_med_his?.obstetric_gynecologic || {};
  const legacyObstetricHistory = extractTextEntries(f.med_hist?.past_med_his?.obe_and_gye).join('\n');
  const obstetricGynecologic = {
    menstrual_history: String(obstetricSource.menstrual_history || "").trim(),
    lmp: String(obstetricSource.lmp || "").trim(),
    lmp_details: String(obstetricSource.lmp_details || "").trim(),
    pregnancies: toNumberOrZero(obstetricSource.pregnancies),
    births: toNumberOrZero(obstetricSource.births),
    pregnancy_births_explanation: String(obstetricSource.pregnancy_births_explanation || "").trim(),
  };
  if (!obstetricGynecologic.menstrual_history && hasText(legacyObstetricHistory)) {
    obstetricGynecologic.menstrual_history = legacyObstetricHistory;
  }
  const obstetricSummaryLines = [
    obstetricGynecologic.menstrual_history ? `Menstrual History: ${obstetricGynecologic.menstrual_history}` : "",
    obstetricGynecologic.lmp ? `LMP: ${obstetricGynecologic.lmp}` : "",
    obstetricGynecologic.lmp_details ? `LMP Details: ${obstetricGynecologic.lmp_details}` : "",
    (obstetricGynecologic.pregnancies || obstetricGynecologic.pregnancies === 0) ? `Pregnancies: ${obstetricGynecologic.pregnancies}` : "",
    (obstetricGynecologic.births || obstetricGynecologic.births === 0) ? `Births: ${obstetricGynecologic.births}` : "",
    obstetricGynecologic.pregnancy_births_explanation
      ? `If pregnancies \u2260 births, explain: ${obstetricGynecologic.pregnancy_births_explanation}`
      : "",
  ].filter(Boolean);
  const obstetricSummary = obstetricSummaryLines.join('\n');
  const familyArr = normalizeFamilyHistoryEntries(f.med_hist?.family_hist);
  const studentExpectations = extractTextEntries(f.admin?.student_expectations);
  const learningObjectives = extractTextEntries(f.admin?.learning_objectives);
  const caseTypeRaw = String(f.admin?.case_type || '').trim().toLowerCase();
  const normalizedCaseType = caseTypeRaw.includes('simulated')
    ? 'Simulated'
    : caseTypeRaw.includes('standardized')
      ? 'Standardized'
      : '';
  const rawDoorNoteVitalsToggle = f.patient?.vitals_included_on_door_note;
  const doorNoteVitalsIncluded = (() => {
    if (rawDoorNoteVitalsToggle === undefined || rawDoorNoteVitalsToggle === null || rawDoorNoteVitalsToggle === "") {
      return true;
    }
    if (typeof rawDoorNoteVitalsToggle === "boolean") return rawDoorNoteVitalsToggle;
    if (typeof rawDoorNoteVitalsToggle === "number") return rawDoorNoteVitalsToggle !== 0;
    const lowered = String(rawDoorNoteVitalsToggle).trim().toLowerCase();
    if (["false", "0", "no", "off"].includes(lowered)) return false;
    return true;
  })();
  const socialHistory = f.med_hist?.social_hist || {};
  const substanceUseEntries = extractTextEntries(socialHistory.substance_use);
  const levelOfEducation = String(socialHistory.level_of_education || "").trim();
  const communityAndEmploymentLegacy = String(socialHistory.community_and_employment || "").trim();
  const occupation = String(socialHistory.occupation || "").trim()
    || (!levelOfEducation && !String(socialHistory.health_literacy || "").trim() && !String(socialHistory.military_service || "").trim()
      ? communityAndEmploymentLegacy
      : "");
  const healthLiteracy = String(socialHistory.health_literacy || "").trim();
  const militaryService = String(socialHistory.military_service || "").trim();
  const communityAndEmploymentSummary = communityAndEmploymentLegacy || [
    levelOfEducation ? `Level of Education: ${levelOfEducation}` : "",
    occupation ? `Occupation: ${occupation}` : "",
    healthLiteracy ? `Health Literacy: ${healthLiteracy}` : "",
    militaryService ? `Military Service: ${militaryService}` : "",
  ].filter(Boolean).join('\n');
  const sexualHistoryEntries = extractTextEntries(socialHistory.sexual_history_entries);
  const sexHistory = socialHistory.sex_history || {};
  const normalizePartnerCount = (value) => {
    if (value === 0 || value === "0") return "0";
    if (value === undefined || value === null || value === "") return "";
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return String(Math.trunc(parsed));
    return String(value || "").trim();
  };
  const currentSexualPartners = normalizePartnerCount(sexHistory.current_partners);
  const lifetimeSexualPartners = normalizePartnerCount(
    sexHistory.lifetime_partners || sexHistory.past_partners
  );
  const contraceptives = String(sexHistory.contraceptives || "").trim();
  const hivRiskHistory = String(sexHistory.hiv_risk_history || "").trim();
  const safetyInRelationships = String(sexHistory.safety_in_relations || "").trim();
  const legacySexualDetails = [
    contraceptives ? `Contraceptives: ${contraceptives}` : "",
    hivRiskHistory ? `HIV Risk History: ${hivRiskHistory}` : "",
    safetyInRelationships ? `Safety in Relationships: ${safetyInRelationships}` : "",
  ].filter(Boolean).join('\n');
  const otherSexualDetails = firstNonEmptyString(
    sexHistory.other_details,
    sexualHistoryEntries.join('\n'),
    legacySexualDetails
  );
  const normalizedSexualHistoryEntries = [
    currentSexualPartners ? `Current Sexual Partners: ${currentSexualPartners}` : "",
    lifetimeSexualPartners ? `Lifetime Sexual Partners: ${lifetimeSexualPartners}` : "",
    otherSexualDetails ? `All other details: ${otherSexualDetails}` : "",
  ].filter(Boolean);
  const toCharacterAttributeNarrative = (key) => {
    const direct = normalizeCharacterAttributeLevel(f.sp?.character_attributes?.[key]);
    if (direct) return direct;
    return normalizeCharacterAttributeLevel(f.sp?.attributes?.[key]);
  };

  return {
    admin: {
      reson_for_visit: f.admin?.reson_for_visit || '',
      chief_concern: f.admin?.chief_concern || '',
      diagnosis: f.admin?.diagnosis || '',
      abbreviated_diagnosis: f.admin?.abbreviated_diagnosis || '',
      icd10_code: f.admin?.icd10_code || '',
      case_setting: f.admin?.case_setting || f.patient?.context || '',
      case_type: normalizedCaseType,
      case_letter: f.admin?.case_letter || f.admin?.class || 'General',
      class: f.admin?.case_letter || f.admin?.class || 'General',
      medical_event: f.admin?.medical_event || '',
      event_dates: '',
      learner_level: f.admin?.learner_level || '',
      academic_year: f.admin?.academic_year || '',
      case_authors: f.admin?.case_authors || f.admin?.author || '',
      author: f.admin?.case_authors || f.admin?.author || '',
      summory_of_story: f.admin?.summory_of_story || '',
      student_expectations: studentExpectations.length ? studentExpectations.map((entry) => `- ${entry}`).join('\n') : '',
      learning_objectives: learningObjectives.length ? learningObjectives.map((entry) => `- ${entry}`).join('\n') : '',
      patient_demographic: f.admin?.patient_demographic || '',
      staff_room_setup_instructions: f.admin?.staff_room_setup_instructions || '',
      content_warning: f.admin?.content_warning || '',
      special_supplies: f.admin?.special_supplies || '',
      case_factors: f.admin?.case_factors || '',
      physical_examination: f.admin?.physical_examination || '',
      final_page_notes: f.admin?.final_page_notes || '',
    },
    patient: {
      name: f.patient?.name || 'Unknown',
      date_of_birth: f.patient?.date_of_birth || '',
      vitals: {
        heart_rate: Number(f.patient?.vitals?.heart_rate || 0),
        respirations: Number(f.patient?.vitals?.respirations || 0),
        pressure: {
          top: Number(f.patient?.vitals?.pressure?.top || 0),
          bottom: Number(f.patient?.vitals?.pressure?.bottom || 0),
        },
        blood_oxygen: Number(f.patient?.vitals?.blood_oxygen || 0),
        temp: {
          reading: Number(f.patient?.vitals?.temp?.reading || 0),
          unit: tempUnit,
        },
      },
      visit_reason: f.admin?.reson_for_visit || f.patient?.visit_reason || '',
      vitals_included_on_door_note: doorNoteVitalsIncluded,
      context: f.patient?.context || f.admin?.case_setting || '',
      task: f.patient?.task || '',
      encounter_duration: f.patient?.encounter_duration || '',
    },
    sp: {
      opening_statement: f.sp?.opening_statement || '',
      attributes: {
        anxiety: Number(f.sp?.attributes?.anxiety || 1),
        suprise: Number(f.sp?.attributes?.suprise || 1),
        confusion: Number(f.sp?.attributes?.confusion || 1),
        guilt: Number(f.sp?.attributes?.guilt || 1),
        sadness: Number(f.sp?.attributes?.sadness || 1),
        indecision: Number(f.sp?.attributes?.indecision || 1),
        assertiveness: Number(f.sp?.attributes?.assertiveness || 1),
        frustration: Number(f.sp?.attributes?.frustration || 1),
        fear: Number(f.sp?.attributes?.fear || 1),
        anger: Number(f.sp?.attributes?.anger || 1),
      },
      physical_chars: f.sp?.presentation_behaviors?.body_language || f.sp?.physical_chars || '',
      disclosure_framework: {
        offered_spontaneously: f.sp?.disclosure_framework?.offered_spontaneously || '',
        elicited_generally_prompted: f.sp?.disclosure_framework?.elicited_generally_prompted || '',
        hidden_until_directly_asked: f.sp?.disclosure_framework?.hidden_until_directly_asked || '',
        must_relay_accurately: f.sp?.disclosure_framework?.must_relay_accurately || '',
      },
      character_attributes: {
        anxiety: toCharacterAttributeNarrative("anxiety"),
        suprise: toCharacterAttributeNarrative("suprise"),
        confusion: toCharacterAttributeNarrative("confusion"),
        guilt: toCharacterAttributeNarrative("guilt"),
        sadness: toCharacterAttributeNarrative("sadness"),
        indecision: toCharacterAttributeNarrative("indecision"),
        assertiveness: toCharacterAttributeNarrative("assertiveness"),
        frustration: toCharacterAttributeNarrative("frustration"),
        fear: toCharacterAttributeNarrative("fear"),
        anger: toCharacterAttributeNarrative("anger"),
      },
      presentation_behaviors: {
        affect: f.sp?.presentation_behaviors?.affect || '',
        body_language: f.sp?.presentation_behaviors?.body_language || f.sp?.physical_chars || '',
        facial_expression: f.sp?.presentation_behaviors?.facial_expression || '',
        eye_contact: f.sp?.presentation_behaviors?.eye_contact || '',
        speech: f.sp?.presentation_behaviors?.speech || '',
        note: f.sp?.presentation_behaviors?.note || '',
      },
      gender_identity_expression: {
        pronouns: f.sp?.gender_identity_expression?.pronouns || '',
        identifies_as: f.sp?.gender_identity_expression?.identifies_as || '',
        sex_assigned_at_birth: f.sp?.gender_identity_expression?.sex_assigned_at_birth || '',
        gender_presentation: f.sp?.gender_identity_expression?.gender_presentation || '',
      },
      other_sp_notes: f.sp?.other_sp_notes || '',
      sp_feedback_enabled: Boolean(f.sp?.sp_feedback_enabled),
      custom_feedback_notes: f.sp?.custom_feedback_notes || '',
      current_ill_history: {
        body_location: f.sp?.current_ill_history?.body_location || '',
        symptom_settings: extractTextEntries(f.sp?.current_ill_history?.symptom_settings).join('\n'),
        symptom_timing: extractTextEntries(f.sp?.current_ill_history?.symptom_timing).join('\n'),
        associated_symptoms: extractTextEntries(f.sp?.current_ill_history?.associated_symptoms).join('\n'),
        radiation_of_symptoms: extractTextEntries(f.sp?.current_ill_history?.radiation_of_symptoms).join('\n'),
        symptom_quality: f.sp?.current_ill_history?.symptom_quality || '',
        alleviating_factors: f.sp?.current_ill_history?.alleviating_factors || '',
        aggravating_factors: f.sp?.current_ill_history?.aggravating_factors || '',
        pain: Number(f.sp?.current_ill_history?.pain || 0),
        pain_notes: f.sp?.current_ill_history?.pain_notes || '',
        symptom_diagram: normalizeDiagramMarkers(f.sp?.current_ill_history?.symptom_diagram),
      },
    },
    med_hist: {
      medications: medicationsArr,
      non_prescription_medications: nonPrescriptionMeds,
      allergy_details: allergyDetails,
      allergies_list: allergiesList,
      allergies: allergiesList.join('\n'),
      past_med_his: {
        child_hood_illness: extractTextEntries(f.med_hist?.past_med_his?.child_hood_illness).join('\n'),
        trauma: extractTextEntries(f.med_hist?.past_med_his?.trauma).join('\n'),
        illness_and_hospital: extractTextEntries(f.med_hist?.past_med_his?.illness_and_hospital).join('\n'),
        surgeries: extractTextEntries(f.med_hist?.past_med_his?.surgeries).join('\n'),
        obstetric_gynecologic: obstetricGynecologic,
        obe_and_gye: obstetricSummary || legacyObstetricHistory,
        transfusion: extractTextEntries(f.med_hist?.past_med_his?.transfusion).join('\n'),
        psychiatric: extractTextEntries(f.med_hist?.past_med_his?.psychiatric).join('\n'),
      },
      preventative_measure: {
        immunization: extractTextEntries(f.med_hist?.preventative_measure?.immunization).join('\n'),
        alternate_health_care: extractTextEntries(f.med_hist?.preventative_measure?.alternate_health_care).join('\n'),
        travel_exposure: extractTextEntries(f.med_hist?.preventative_measure?.travel_exposure).join('\n'),
        screening_tests: extractTextEntries(f.med_hist?.preventative_measure?.screening_tests).join('\n'),
      },
      family_hist: familyArr,
      family_general_notes: f.med_hist?.family_general_notes || '',
      social_hist: {
        personal_background: socialHistory.personal_background || '',
        nutrion_and_exercise: socialHistory.nutrion_and_exercise || '',
        level_of_education: levelOfEducation,
        occupation,
        health_literacy: healthLiteracy,
        military_service: militaryService,
        community_and_employment: communityAndEmploymentSummary,
        safety_measure: socialHistory.safety_measure || '',
        life_stressors: socialHistory.life_stressors || '',
        social_support: {
          family_friends: socialHistory.social_support?.family_friends || '',
          financial: socialHistory.social_support?.financial || '',
          healthcare_access_insurance:
            socialHistory.social_support?.healthcare_access_insurance || '',
          religious_or_community_groups:
            socialHistory.social_support?.religious_or_community_groups || '',
        },
        substance_use: substanceUseEntries.join('\n'),
        sex_history: {
          current_partners: currentSexualPartners,
          past_partners: lifetimeSexualPartners,
          lifetime_partners: lifetimeSexualPartners,
          other_details: otherSexualDetails,
          contraceptives,
          hiv_risk_history: hivRiskHistory,
          safety_in_relations: safetyInRelationships,
        },
        sexual_history_entries: normalizedSexualHistoryEntries,
      },
      sympton_review: {
        general: extractTextEntries(f.med_hist?.sympton_review?.general).join('\n'),
        skin: extractTextEntries(f.med_hist?.sympton_review?.skin).join('\n'),
        heent: extractTextEntries(f.med_hist?.sympton_review?.heent).join('\n'),
        neck: extractTextEntries(f.med_hist?.sympton_review?.neck).join('\n'),
        breast: extractTextEntries(f.med_hist?.sympton_review?.breast).join('\n'),
        respiratory: extractTextEntries(f.med_hist?.sympton_review?.respiratory).join('\n'),
        cardiovascular: extractTextEntries(f.med_hist?.sympton_review?.cardiovascular).join('\n'),
        gastrointestinal: extractTextEntries(f.med_hist?.sympton_review?.gastrointestinal).join('\n'),
        peripheral_vascular: extractTextEntries(f.med_hist?.sympton_review?.peripheral_vascular).join('\n'),
        musculoskeletal: extractTextEntries(f.med_hist?.sympton_review?.musculoskeletal).join('\n'),
        psychiatric: extractTextEntries(f.med_hist?.sympton_review?.psychiatric).join('\n'),
        neurologival: extractTextEntries(f.med_hist?.sympton_review?.neurologival).join('\n'),
        endocine: extractTextEntries(f.med_hist?.sympton_review?.endocine).join('\n'),
        genitourinary: extractTextEntries(f.med_hist?.sympton_review?.genitourinary).join('\n'),
      },
    },
    special: {
      provoking_question: extractTextEntries(f.special?.provoking_question).join('\n'),
      must_ask: extractTextEntries(f.special?.must_ask).join('\n'),
      oppurtunity: extractTextEntries(f.special?.oppurtunity).join('\n'),
      opening_statement: f.special?.opening_statement || '',
      feed_back: f.special?.feed_back || '',
    },
  };
}

export function downloadScriptJson(script, filename = 'script.json') {
  const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
