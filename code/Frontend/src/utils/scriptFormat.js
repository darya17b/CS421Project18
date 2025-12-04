// Build a script object (matching your provided structure)
// from the minimal Request New form fields.

export function buildScriptFromForm(f = {}) {
  return {
    admin: {
      reson_for_visit: f.admin?.reson_for_visit || '',
      chief_concern: f.admin?.chief_concern || '',
      diagnosis: f.admin?.diagnosis || '',
      class: f.admin?.class || 'General',
      medical_event: f.admin?.medical_event || '',
      event_dates: f.admin?.event_dates || '',
      learner_level: f.admin?.learner_level || '',
      academic_year: f.admin?.academic_year || '',
      author: f.admin?.author || '',
      summory_of_story: f.admin?.summory_of_story || '',
      student_expectations: f.admin?.student_expectations || '',
      patient_demographic: f.admin?.patient_demographic || '',
      special_supplies: f.admin?.special_supplies || '',
      case_factors: f.admin?.case_factors || '',
    },
    patient: {
      name: f.patient?.name || 'Unknown',
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
          unit: f.patient?.vitals?.temp?.unit || 'Celcius',
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
        anxiety: Number(f.sp?.attributes?.anxiety || 0),
        suprise: Number(f.sp?.attributes?.suprise || 0),
        confusion: Number(f.sp?.attributes?.confusion || 0),
        guilt: Number(f.sp?.attributes?.guilt || 0),
        sadness: Number(f.sp?.attributes?.sadness || 0),
        indecision: Number(f.sp?.attributes?.indecision || 0),
        assertiveness: Number(f.sp?.attributes?.assertiveness || 0),
        frustration: Number(f.sp?.attributes?.frustration || 0),
        fear: Number(f.sp?.attributes?.fear || 0),
        anger: Number(f.sp?.attributes?.anger || 0),
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
      },
    },
    med_hist: {
      medications: {
        name: f.med_hist?.medications?.name || '',
        brand: f.med_hist?.medications?.brand || '',
        generic: f.med_hist?.medications?.generic || '',
        dose: f.med_hist?.medications?.dose || '',
        frequency: f.med_hist?.medications?.frequency || '',
        reason: f.med_hist?.medications?.reason || '',
        startDate: f.med_hist?.medications?.startDate || '',
        otherNotes: f.med_hist?.medications?.otherNotes || '',
      },
      allergies: f.med_hist?.allergies || '',
      past_med_his: {
        child_hood_illness: f.med_hist?.past_med_his?.child_hood_illness || '',
        illness_and_hospital: f.med_hist?.past_med_his?.illness_and_hospital || '',
        surgeries: f.med_hist?.past_med_his?.surgeries || '',
        obe_and_gye: f.med_hist?.past_med_his?.obe_and_gye || '',
        transfusion: f.med_hist?.past_med_his?.transfusion || '',
        psychiatric: f.med_hist?.past_med_his?.psychiatric || '',
        trauma: f.med_hist?.past_med_his?.trauma || '',
      },
      preventative_measure: {
        immunization: f.med_hist?.preventative_measure?.immunization || '',
        alternate_health_care: f.med_hist?.preventative_measure?.alternate_health_care || '',
        travel_exposure: f.med_hist?.preventative_measure?.travel_exposure || '',
      },
      family_hist: {
        health_status: f.med_hist?.family_hist?.health_status || '',
        age: Number(f.med_hist?.family_hist?.age || 0),
        cause_of_death: f.med_hist?.family_hist?.cause_of_death || '',
        additonal_info: f.med_hist?.family_hist?.additonal_info || '',
      },
      social_hist: {
        personal_background: f.med_hist?.social_hist?.personal_background || '',
        nutrion_and_exercise: f.med_hist?.social_hist?.nutrion_and_exercise || '',
        community_and_employment: f.med_hist?.social_hist?.community_and_employment || '',
        safety_measure: f.med_hist?.social_hist?.safety_measure || '',
        life_stressors: f.med_hist?.social_hist?.life_stressors || '',
        substance_use: f.med_hist?.social_hist?.substance_use || '',
        sex_history: {
          current_partners: Number(f.med_hist?.social_hist?.sex_history?.current_partners || 0),
          past_partners: Number(f.med_hist?.social_hist?.sex_history?.past_partners || 0),
          contraceptives: f.med_hist?.social_hist?.sex_history?.contraceptives || '',
          hiv_risk_history: f.med_hist?.social_hist?.sex_history?.hiv_risk_history || '',
          safety_in_relations: f.med_hist?.social_hist?.sex_history?.safety_in_relations || '',
        },
      },
      sympton_review: {
        general: f.med_hist?.sympton_review?.general || '',
        skin: f.med_hist?.sympton_review?.skin || '',
        heent: f.med_hist?.sympton_review?.heent || '',
        neck: f.med_hist?.sympton_review?.neck || '',
        breast: f.med_hist?.sympton_review?.breast || '',
        respiratory: f.med_hist?.sympton_review?.respiratory || '',
        cardiovascular: f.med_hist?.sympton_review?.cardiovascular || '',
        gastrointestinal: f.med_hist?.sympton_review?.gastrointestinal || '',
        peripheral_vascular: f.med_hist?.sympton_review?.peripheral_vascular || '',
        musculoskeletal: f.med_hist?.sympton_review?.musculoskeletal || '',
        psychiatric: f.med_hist?.sympton_review?.psychiatric || '',
        neurologival: f.med_hist?.sympton_review?.neurologival || '',
        endocine: f.med_hist?.sympton_review?.endocine || '',
      },
    },
    special: {
      provoking_question: f.special?.provoking_question || '',
      must_ask: f.special?.must_ask || '',
      oppurtunity: f.special?.oppurtunity || '',
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
