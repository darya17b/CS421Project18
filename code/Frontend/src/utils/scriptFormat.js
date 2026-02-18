// builds script object
// from the minimal Request New form fields.

const hasText = (value) => String(value || "").trim() !== "";

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
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return { name: entry };
        if (entry && typeof entry === "object") {
          if (hasText(entry.text)) return { name: String(entry.text).trim() };
          if (hasText(entry.brand_substance) || hasText(entry.amount) || hasText(entry.unit) || hasText(entry.frequency_reason)) {
            const brand = String(entry.brand_substance || "").trim();
            const amount = String(entry.amount || "").trim();
            const unit = String(entry.unit || "").trim();
            const frequencyReason = String(entry.frequency_reason || "").trim();
            const amountWithUnit = amount && unit ? `${amount}${unit}` : amount || "";
            return {
              name: brand,
              dose: amountWithUnit,
              reason: frequencyReason,
            };
          }
          return {
            name: entry.name || "",
            brand: entry.brand || "",
            generic: entry.generic || "",
            dose: entry.dose || "",
            frequency: entry.frequency || "",
            reason: entry.reason || "",
            startDate: entry.startDate || "",
            otherNotes: entry.otherNotes || "",
          };
        }
        return null;
      })
      .filter((entry) => entry && Object.values(entry).some((field) => hasText(field)));
  }

  if (value && typeof value === "object") {
    if (hasText(value.brand_substance) || hasText(value.amount) || hasText(value.unit) || hasText(value.frequency_reason)) {
      const brand = String(value.brand_substance || "").trim();
      const amount = String(value.amount || "").trim();
      const unit = String(value.unit || "").trim();
      const frequencyReason = String(value.frequency_reason || "").trim();
      const amountWithUnit = amount && unit ? `${amount}${unit}` : amount || "";
      const med = {
        name: brand,
        dose: amountWithUnit,
        reason: frequencyReason,
      };
      return Object.values(med).some((field) => hasText(field)) ? [med] : [];
    }
    const med = {
      name: value.name || "",
      brand: value.brand || "",
      generic: value.generic || "",
      dose: value.dose || "",
      frequency: value.frequency || "",
      reason: value.reason || "",
      startDate: value.startDate || "",
      otherNotes: value.otherNotes || "",
    };
    return Object.values(med).some((field) => hasText(field)) ? [med] : [];
  }

  const text = String(value || "").trim();
  return text ? [{ name: text }] : [];
};

const normalizeNonPrescriptionEntries = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return String(entry || "").trim();
        if (!entry || typeof entry !== "object") return "";
        if (hasText(entry.text)) return String(entry.text).trim();
        const brand = String(entry.brand_substance || entry.brand || "").trim();
        const amount = String(entry.amount || "").trim();
        const unit = String(entry.unit || "").trim();
        const frequencyReason = String(entry.frequency_reason || entry.reason || "").trim();
        const amountWithUnit = amount && unit ? `${amount}${unit}` : amount || "";
        return [[brand, amountWithUnit].filter(Boolean).join(" "), frequencyReason]
          .filter(Boolean)
          .join(" - ")
          .trim();
      })
      .filter((entry) => hasText(entry));
  }

  if (value && typeof value === "object") {
    if (hasText(value.text)) return [String(value.text).trim()];
    const brand = String(value.brand_substance || value.brand || "").trim();
    const amount = String(value.amount || "").trim();
    const unit = String(value.unit || "").trim();
    const frequencyReason = String(value.frequency_reason || value.reason || "").trim();
    const amountWithUnit = amount && unit ? `${amount}${unit}` : amount || "";
    const merged = [[brand, amountWithUnit].filter(Boolean).join(" "), frequencyReason]
      .filter(Boolean)
      .join(" - ")
      .trim();
    return hasText(merged) ? [merged] : [];
  }

  const text = String(value || "").trim();
  return text ? [text] : [];
};

const normalizeFamilyHistoryEntries = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const familyMember = String(entry.family_member || "").trim();
        const details = String(entry.details || "").trim();
        const additionalDetails = extractTextEntries(entry.additional_details);
        if (familyMember || details || additionalDetails.length) {
          const primary = [familyMember, details].filter(Boolean).join(" - ");
          return {
            family_member: familyMember,
            details,
            additional_details: additionalDetails,
            // backward-compatible keys consumed by other views
            relation: familyMember,
            conditions: details,
            notes: additionalDetails.join("\n"),
            health_status: primary,
            additonal_info: additionalDetails.join("\n"),
            age: Number(entry.age || 0),
            cause_of_death: entry.cause_of_death || "",
          };
        }
        const relation = entry.relation || "";
        const status = entry.status || "";
        const conditions = entry.conditions || "";
        const notes = entry.notes || entry.additonal_info || "";
        const causeOfDeath = entry.cause_of_death || "";
        return {
          relation,
          status,
          conditions,
          notes,
          cause_of_death: causeOfDeath,
          // backward-compatible keys consumed by other views
          health_status: entry.health_status || [relation, status].filter(Boolean).join(" - "),
          additonal_info: notes,
          age: Number(entry.age || 0),
        };
      })
      .filter((entry) => entry && Object.values(entry).some((field) => (typeof field === "number" ? field !== 0 : hasText(field))));
  }

  if (value && typeof value === "object") {
    const familyMember = String(value.family_member || "").trim();
    const details = String(value.details || "").trim();
    const additionalDetails = extractTextEntries(value.additional_details);
    if (familyMember || details || additionalDetails.length) {
      const primary = [familyMember, details].filter(Boolean).join(" - ");
      const modern = {
        family_member: familyMember,
        details,
        additional_details: additionalDetails,
        relation: familyMember,
        conditions: details,
        notes: additionalDetails.join("\n"),
        health_status: primary,
        additonal_info: additionalDetails.join("\n"),
        age: Number(value.age || 0),
        cause_of_death: value.cause_of_death || "",
      };
      return Object.values(modern).some((field) => (typeof field === "number" ? field !== 0 : (Array.isArray(field) ? field.length : hasText(field))))
        ? [modern]
        : [];
    }
    const legacy = {
      health_status: value.health_status || "",
      age: Number(value.age || 0),
      cause_of_death: value.cause_of_death || "",
      additonal_info: value.additonal_info || "",
      relation: value.relation || "",
      status: value.status || "",
      conditions: value.conditions || "",
      notes: value.notes || value.additonal_info || "",
    };
    return Object.values(legacy).some((field) => (typeof field === "number" ? field !== 0 : hasText(field))) ? [legacy] : [];
  }

  return [];
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
  const allergiesList = extractTextEntries(f.med_hist?.allergies);
  const familyArr = normalizeFamilyHistoryEntries(f.med_hist?.family_hist);
  const studentExpectations = extractTextEntries(f.admin?.student_expectations);
  const substanceUseEntries = extractTextEntries(f.med_hist?.social_hist?.substance_use);
  const sexualHistoryEntries = extractTextEntries(f.med_hist?.social_hist?.sexual_history_entries);

  return {
    admin: {
      reson_for_visit: f.admin?.reson_for_visit || '',
      chief_concern: f.admin?.chief_concern || '',
      diagnosis: f.admin?.diagnosis || '',
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
      patient_demographic: f.admin?.patient_demographic || '',
      special_supplies: f.admin?.special_supplies || '',
      case_factors: f.admin?.case_factors || '',
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
      visit_reason: f.patient?.visit_reason || f.admin?.reson_for_visit || '',
      context: f.patient?.context || '',
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
      physical_chars: f.sp?.physical_chars || '',
      current_ill_history: {
        body_location: f.sp?.current_ill_history?.body_location || '',
        symptom_settings: f.sp?.current_ill_history?.symptom_settings || '',
        symptom_timing: f.sp?.current_ill_history?.symptom_timing || '',
        associated_symptoms: f.sp?.current_ill_history?.associated_symptoms || '',
        radiation_of_symptoms: f.sp?.current_ill_history?.radiation_of_symptoms || '',
        symptom_quality: f.sp?.current_ill_history?.symptom_quality || '',
        alleviating_factors: f.sp?.current_ill_history?.alleviating_factors || '',
        aggravating_factors: f.sp?.current_ill_history?.aggravating_factors || '',
        pain: Number(f.sp?.current_ill_history?.pain || 0),
        symptom_diagram: normalizeDiagramMarkers(f.sp?.current_ill_history?.symptom_diagram),
      },
    },
    med_hist: {
      medications: medicationsArr,
      non_prescription_medications: nonPrescriptionMeds,
      allergies_list: allergiesList,
      allergies: allergiesList.join('\n'),
      past_med_his: {
        child_hood_illness: extractTextEntries(f.med_hist?.past_med_his?.child_hood_illness).join('\n'),
        illness_and_hospital: extractTextEntries(f.med_hist?.past_med_his?.illness_and_hospital).join('\n'),
        surgeries: extractTextEntries(f.med_hist?.past_med_his?.surgeries).join('\n'),
        obe_and_gye: extractTextEntries(f.med_hist?.past_med_his?.obe_and_gye).join('\n'),
        transfusion: extractTextEntries(f.med_hist?.past_med_his?.transfusion).join('\n'),
        psychiatric: extractTextEntries(f.med_hist?.past_med_his?.psychiatric).join('\n'),
        trauma: extractTextEntries(f.med_hist?.past_med_his?.trauma).join('\n'),
      },
      preventative_measure: {
        immunization: extractTextEntries(f.med_hist?.preventative_measure?.immunization).join('\n'),
        alternate_health_care: extractTextEntries(f.med_hist?.preventative_measure?.alternate_health_care).join('\n'),
        travel_exposure: extractTextEntries(f.med_hist?.preventative_measure?.travel_exposure).join('\n'),
        screening_tests: extractTextEntries(f.med_hist?.preventative_measure?.screening_tests).join('\n'),
      },
      family_hist: familyArr,
      social_hist: {
        personal_background: f.med_hist?.social_hist?.personal_background || '',
        nutrion_and_exercise: f.med_hist?.social_hist?.nutrion_and_exercise || '',
        community_and_employment: f.med_hist?.social_hist?.community_and_employment || '',
        safety_measure: f.med_hist?.social_hist?.safety_measure || '',
        life_stressors: f.med_hist?.social_hist?.life_stressors || '',
        substance_use: substanceUseEntries.join('\n'),
        sex_history: {
          current_partners: Number(f.med_hist?.social_hist?.sex_history?.current_partners || 0),
          past_partners: Number(f.med_hist?.social_hist?.sex_history?.past_partners || 0),
          contraceptives: f.med_hist?.social_hist?.sex_history?.contraceptives || '',
          hiv_risk_history: f.med_hist?.social_hist?.sex_history?.hiv_risk_history || '',
          safety_in_relations: f.med_hist?.social_hist?.sex_history?.safety_in_relations || sexualHistoryEntries.join('\n') || '',
        },
        sexual_history_entries: sexualHistoryEntries,
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
