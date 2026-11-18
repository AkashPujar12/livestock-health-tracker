// Browser speech APIs. Chrome (Android/desktop) supports kn-IN recognition & en-IN.
// For production-grade Kannada, swap in Google Cloud STT/TTS, Azure, or Bhashini.
export const LOCALE = { en: 'en-IN', kn: 'kn-IN' };

export const voiceSupported = () =>
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export function listen(lang) {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return reject(new Error('unsupported'));
    const r = new SR();
    r.lang = LOCALE[lang] || 'en-IN';
    r.interimResults = false;
    r.maxAlternatives = 1;
    let got = false;
    r.onresult = (e) => { got = true; resolve(e.results[0][0].transcript); };
    r.onerror = (e) => reject(new Error(e.error));
    r.onend = () => { if (!got) reject(new Error('no-speech')); };
    r.start();
  });
}

export function speak(text, lang) {
  if (!('speechSynthesis' in window) || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALE[lang] || 'en-IN';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
