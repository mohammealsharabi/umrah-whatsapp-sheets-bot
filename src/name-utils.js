const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;
const TATWEEL = /\u0640/g;

const REMOVABLE_WORDS = [
  'تاشيرة', 'تأشيرة', 'تأشيره', 'تاشيره',
  'visa', 'umrah', 'عمرة', 'العمره', 'العمرة'
];

export function normalizeArabicName(input = '') {
  let text = String(input)
    .replace(/\.pdf$/i, '')
    .replace(ARABIC_DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(/[ـ_\-–—]+/g, ' ')
    .replace(/[()\[\]{}]/g, ' ')
    .trim();

  // Remove known non-name words if the employee adds them to filenames.
  for (const word of REMOVABLE_WORDS) {
    const re = new RegExp(`(^|\\s)${escapeRegExp(word)}(?=\\s|$)`, 'giu');
    text = text.replace(re, ' ');
  }

  return text.replace(/\s+/g, ' ').trim();
}

export function firstWords(input = '', count = 3) {
  const normalized = normalizeArabicName(input);
  if (!normalized) return '';
  return normalized.split(' ').filter(Boolean).slice(0, count).join(' ');
}

export function isPdfDocument(message) {
  const doc = message?.document;
  if (!doc) return false;

  const filename = doc.filename || '';
  const mime = doc.mime_type || '';

  return mime.toLowerCase().includes('pdf') || filename.toLowerCase().endsWith('.pdf');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
