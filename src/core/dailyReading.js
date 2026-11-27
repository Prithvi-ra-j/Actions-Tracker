export const READING_FIELDS = [
  { key: 'energy', label: 'Energy' },
  { key: 'focus', label: 'Focus' },
  { key: 'mood', label: 'Mood' },
];
export const READING_OPTIONS = ['Low', 'Steady', 'High'];

export function parseDailyReading(raw) {
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      READING_FIELDS.some(field => value[field.key] != null && !READING_OPTIONS.includes(value[field.key]))) {
    throw new Error('Invalid daily reading.');
  }
  return value;
}
