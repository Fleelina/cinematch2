const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

// Dogum tarihinden yaşı hesaplar. Gecersiz tarih veya null gelirse null doner.
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age -= 1;
  return age;
};

// Gender degerini normalize eder; gecersiz deger gelirse null doner.
const normalizeGender = (gender) => {
  if (!gender) return null;
  const normalized = String(gender).trim().toUpperCase().replace(/-/g, '_');
  return VALID_GENDERS.includes(normalized) ? normalized : null;
};

module.exports = { calculateAge, normalizeGender };
