import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api, { cachedGet, postOrQueue } from '../api';
import { useI18n } from '../i18n';
import { speak } from '../voice';

const empty = { name: '', species: 'cow', sex: 'female', ageYears: '', breed: '' };

export default function Animals() {
  const { t, lang } = useI18n();
  const loc = useLocation();
  const [list, setList] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState('');
  const [qr, setQr] = useState(null);
  const [fromVoice, setFromVoice] = useState(false);
  const load = () => cachedGet('/animals').then(setList);
  useEffect(() => { load(); }, []);

  // Voice prefill: fill the form, read it back, wait for the farmer to confirm with Save.
  useEffect(() => {
    const p = loc.state?.prefill;
    if (!p) return;
    const f = { ...empty, name: p.name || '', species: p.species || 'cow', ageYears: p.ageYears ?? '' };
    setForm(f); setFromVoice(true);
    speak(t('readbackAnimal', { name: f.name || '?', species: t(f.species), age: f.ageYears || '?' }), lang);
    window.history.replaceState({}, '');
  }, [loc.state]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await postOrQueue('/animals', { ...form, ageMonths: Math.round(Number(form.ageYears || 0) * 12) });
      setMsg(r.queued ? t('savedOffline') : t('saved'));
      setForm(empty); setFromVoice(false); load();
    } catch (err) { setMsg(err.response?.data?.error || err.message); }
  };
  const del = async (id) => { await api.delete('/animals/' + id); load(); };

  return (
    <>
      <div className="card">
        <h2>{t('addAnimal')}</h2>
        {fromVoice && <div className="msg warn">🎤 {t('confirmHint')}</div>}
        <form onSubmit={submit}>
          <div className="row">
            <div><label>{t('name')}</label><input required value={form.name} onChange={set('name')} /></div>
            <div><label>{t('species')}</label>
              <select value={form.species} onChange={set('species')}>
                {['cow', 'buffalo', 'goat', 'sheep'].map((s) => <option key={s} value={s}>{t(s)}</option>)}
              </select></div>
            <div><label>{t('sex')}</label>
              <select value={form.sex} onChange={set('sex')}>
                <option value="female">{t('female')}</option><option value="male">{t('male')}</option></select></div>
            <div><label>{t('age')}</label><input type="number" min="0" step="0.5" value={form.ageYears} onChange={set('ageYears')} /></div>
            <div><label>{t('breed')}</label><input value={form.breed} onChange={set('breed')} /></div>
          </div>
          <button type="submit">{t('save')}</button>
        </form>
        {msg && <div className="msg">{msg}</div>}
      </div>

      <div className="card">
        <h2>{t('animals')} ({list.length})</h2>
        {list.length === 0 ? <p className="muted">{t('none')}</p> : (
          <table><tbody>{list.map((a) => (
            <tr key={a._id}>
              <td><b>{a.name}</b><br /><span className="muted">{t(a.species)} · {a.tag}</span></td>
              <td>
                <button className="small secondary" onClick={() => setQr(qr === a._id ? null : a._id)}>QR</button>
                <button className="small danger" onClick={() => del(a._id)}>{t('delete')}</button>
                {qr === a._id && <div style={{ marginTop: 8 }}><QRCodeSVG value={`livestock:${a.publicId}`} size={110} /></div>}
              </td>
            </tr>))}</tbody></table>)}
      </div>
    </>
  );
}
