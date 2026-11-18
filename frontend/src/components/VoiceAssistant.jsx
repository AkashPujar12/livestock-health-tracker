import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { listen, speak, voiceSupported } from '../voice';
import { parseVoice } from '../voiceParser';

// Global mic button: listens, understands the command, and routes to the right screen.
// Anything that would be SAVED is only pre-filled; the farmer must press Save to confirm.
export default function VoiceAssistant() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const [on, setOn] = useState(false);
  const [note, setNote] = useState('');

  const go = async () => {
    if (!voiceSupported()) { setNote(t('voiceUnsupported')); return; }
    setOn(true); setNote(t('listening'));
    try {
      const text = await listen(lang);
      const p = parseVoice(text);
      setNote(`${t('heard')} "${text}"`);
      switch (p.intent) {
        case 'add_animal': nav('/animals', { state: { prefill: p } }); break;
        case 'show_records': nav('/animals'); break;
        case 'vaccine_query': nav('/vaccinations'); break;
        case 'vaccine_reminder': nav('/vaccinations', { state: { reminder: p } }); break;
        case 'pregnancy': nav('/pregnancy'); break;
        case 'report': nav('/report'); break;
        default: setNote(t('notUnderstood')); speak(t('notUnderstood'), lang);
      }
    } catch (e) {
      setNote(e.message === 'unsupported' ? t('voiceUnsupported') : t('notUnderstood'));
    } finally {
      setOn(false);
      setTimeout(() => setNote(''), 6000);
    }
  };
  return (
    <>
      {note && <div className="heard">{note}</div>}
      <button className={'mic' + (on ? ' on' : '')} onClick={go} aria-label={t('speak')}>🎤</button>
    </>
  );
}
