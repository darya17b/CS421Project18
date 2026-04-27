// handles is valid date
const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

// handles to date only
const toDateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// handles parse dob date
export const parseDobDate = (value) => {
  if (value instanceof Date) {
    return isValidDate(value) ? toDateOnly(value) : null;
  }

  const raw = String(value || "").trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      isValidDate(parsed) &&
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return toDateOnly(parsed);
    }
    return null;
  }

  const usMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (usMatch) {
    const month = Number(usMatch[1]);
    const day = Number(usMatch[2]);
    const year = Number(usMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      isValidDate(parsed) &&
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return toDateOnly(parsed);
    }
    return null;
  }

  const fallback = new Date(raw);
  return isValidDate(fallback) ? toDateOnly(fallback) : null;
};

export const getAgeFromDob = (dobValue, asOfValue = new Date()) => {
  const dob = parseDobDate(dobValue);
  if (!dob) return null;

  const asOfRaw = asOfValue instanceof Date ? asOfValue : new Date(asOfValue);
  if (!isValidDate(asOfRaw)) return null;
  const asOf = toDateOnly(asOfRaw);
  if (dob > asOf) return null;

  let age = asOf.getFullYear() - dob.getFullYear();
  const monthDelta = asOf.getMonth() - dob.getMonth();
  const birthdayNotReached = monthDelta < 0 || (monthDelta === 0 && asOf.getDate() < dob.getDate());
  if (birthdayNotReached) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

// handles format dob with age
export const formatDobWithAge = (dobValue) => {
  const dobText = String(dobValue || "").trim();
  if (!dobText) return "";
  const age = getAgeFromDob(dobText);
  return age === null ? dobText : `${dobText}, ${age}`;
};

// handles format title with dob age
export const formatTitleWithDobAge = (titleValue, dobValue) => {
  const titleText = String(titleValue || "").trim();
  if (!titleText) return "";
  const age = getAgeFromDob(dobValue);
  return age === null ? titleText : `${titleText}, ${age}`;
};
