// Rule-based intent/entity extraction for Kannada + English commands (works offline).
const SPECIES = {
  cow: ['cow', 'ಹಸು'],
  buffalo: ['buffalo', 'ಎಮ್ಮೆ'],
  goat: ['goat', 'ಮೇಕೆ'],
  sheep: ['sheep', 'ಕುರಿ'],
};
const NUM = {
  ಒಂದು: 1, ಎರಡು: 2, ಮೂರು: 3, ನಾಲ್ಕು: 4, ಐದು: 5, ಆರು: 6, ಏಳು: 7, ಎಂಟು: 8, ಒಂಬತ್ತು: 9, ಹತ್ತು: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const KN_DIGITS = '೦೧೨೩೪೫೬೭೮೯';
const normDigits = (s) => s.replace(/[೦-೯]/g, (d) => KN_DIGITS.indexOf(d));
const toNum = (w) => {
  if (!w) return null;
  const s = normDigits(w.toLowerCase().replace(/[.,]/g, ''));
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  return NUM[s] ?? null;
};

export function parseVoice(text) {
  const raw = (text || '').trim();
  const s = normDigits(raw.toLowerCase());
  const out = { intent: 'unknown', text: raw };

  for (const [sp, words] of Object.entries(SPECIES)) {
    if (words.some((w) => s.includes(w))) { out.species = sp; break; }
  }
  const nameM = raw.match(/ಹೆಸರು\s+([^\s,.]+)/) || raw.match(/(?:name is|named|called)\s+([a-zA-Z]+)/i);
  if (nameM) out.name = nameM[1];
  const ageM = s.match(/(\S+)\s*(?:years?|yrs?|ವರ್ಷ)/);
  if (ageM) { const n = toNum(ageM[1]); if (n !== null) out.ageYears = n; }

  const has = (re) => re.test(s);
  if (has(/remind|ನೆನಪಿಸು/) && has(/vaccin|ಲಸಿಕೆ/)) {
    out.intent = 'vaccine_reminder';
    const d = new Date();
    if (has(/next month|ಮುಂದಿನ ತಿಂಗಳು/)) d.setMonth(d.getMonth() + 1);
    else if (has(/next week|ಮುಂದಿನ ವಾರ/)) d.setDate(d.getDate() + 7);
    else if (has(/tomorrow|ನಾಳೆ/)) d.setDate(d.getDate() + 1);
    out.nextDue = d.toISOString().slice(0, 10);
  } else if (has(/vaccin|ಲಸಿಕೆ/)) out.intent = 'vaccine_query';
  else if (has(/mating|inseminat|pregnan|delivery|ಗರ್ಭ|ಮಿಲನ|ಹೆರಿಗೆ/)) out.intent = 'pregnancy';
  else if (has(/disease|sick|symptom|ill\b|ರೋಗ|ಅನಾರೋಗ್ಯ|ಲಕ್ಷಣ/)) out.intent = 'report';
  else if (has(/record|history|show|ದಾಖಲೆ|ತೋರಿಸು/) && !has(/add|new|ಸೇರಿಸ/)) out.intent = 'show_records';
  else if (has(/add|new|register|ಸೇರಿಸ|ಹೆಸರು|name is/) || out.name) out.intent = 'add_animal';
  return out;
}
