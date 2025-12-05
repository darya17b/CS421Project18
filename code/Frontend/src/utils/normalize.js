//file ensures backend payloads are in a way the UI expects
const emptyMedication = {
  name: '',
  brand: '',
  generic: '',
  dose: '',
  frequency: '',
  reason: '',
  startDate: '',
  otherNotes: '',
};

const emptyFamilyHistory = {
  health_status: '',
  age: 0,
  cause_of_death: '',
  additonal_info: '',
};

function normalizeSingleEntry(value, fallbackShape) {
  if (Array.isArray(value)) {
    const [first] = value;
    return { ...fallbackShape, ...(first || {}) };
  }
  if (value && typeof value === 'object') {
    return { ...fallbackShape, ...value };
  }
  return { ...fallbackShape };
}


export function normalizeScript(doc = {}) {
  const medHist = doc?.med_hist || {};
  return {
    ...doc,
    med_hist: {
      ...medHist,
      medications: normalizeSingleEntry(medHist.medications, emptyMedication),
      family_hist: normalizeSingleEntry(medHist.family_hist, emptyFamilyHistory),
    },
  };
}

export function mapVersionHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history.map((entry) => {
    const versionNumber = entry?.version_number ?? entry?.versionNumber ?? entry?.version ?? '';
    return {
      version: versionNumber ? `v${versionNumber}` : 'v1',
      notes: entry?.change_note || entry?.changeNote || '',
      createdAt: entry?.created_at || entry?.createdAt || '',
      createdBy: entry?.created_by || entry?.createdBy || '',
      fields: normalizeScript(entry?.document || entry?.fields || {}),
    };
  });
}
