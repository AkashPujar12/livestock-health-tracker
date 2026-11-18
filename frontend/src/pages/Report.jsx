import { useEffect, useState } from 'react';
import api, { cachedGet } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { speak } from '../voice';

const CATS = ['skin', 'fever', 'mouth_foot', 'breathing', 'diarrhea', 'abortion', 'other'];

export default function Report() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [animals, setAnimals] = useState([]);
  const [vets, setVets] = useState(null);
  const [species, setSpecies] = useState('cow');
  const [file, setFile] = useState(null);
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rep, setRep] = useState({ animalId: '', category: 'skin', notes: '' });
  const [coords, setCoords] = useState(user.location);
  const [msg, setMsg] = useState(null);
  const tx = (o) => (lang === 'kn' ? o.kn : o.en);

  useEffect(() => {
    cachedGet('/animals').then(setAnimals);
    cachedGet('/vets/nearby', null).then((v) => setVets(v || []));
  }, []);

  const getLoc = () => navigator.geolocation?.getCurrentPosition(
    (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
    () => setMsg({ cls: 'err', text: t('locationNeeded') }));

  const analyze = async () => {
    if (!file) return;
    setBusy(true); setAi(null);
    try {
      const fd = new FormData(); fd.append('image', file); fd.append('species', species);
      const r = await api.post('/ai/analyze', fd);
      setAi(r.data);
    } catch (e) { setMsg({ cls: 'err', text: e.response?.data?.error || e.message }); }
    setBusy(false);
  };

  const submit = async (e) => {
    e.preventDefault(); setMsg(null);
    if (!coords) { setMsg({ cls: 'err', text: t('locationNeeded') }); return; }
    try {
      const body = { ...rep, species, lat: coords.lat, lng: coords.lng };
      if (!body.animalId) delete body.animalId;
      const r = await api.post('/reports', body);
      setMsg({ cls: r.data.clusterAlertTriggered ? 'warn' : '', text: t('reportSent') + (r.data.clusterAlertTriggered ? ' ' + t('clusterTriggered') : '') });
    } catch (err) { setMsg({ cls: 'err', text: err.response?.data?.error || err.message }); }
  };

  const readAi = () => ai && speak([...ai.observations, ...ai.possibleConcerns, ...ai.precautions].map(tx).join('. ') + ' ' + t('disclaimer'), lang);

  return (
    <>
      <div className="card">
        <h2>📷 {t('uploadPhoto')}</h2>
        <label>{t('species')}</label>
        <select value={species} onChange={(e) => setSpecies(e.target.value)}>
          {['cow', 'buffalo', 'goat', 'sheep'].map((s) => <option key={s} value={s}>{t(s)}</option>)}</select>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files[0])} style={{ marginTop: 8 }} />
        <button disabled={!file || busy} onClick={analyze}>{busy ? t('analyzing') : t('analyze')}</button>

        {ai && (
          <div style={{ marginTop: 12 }}>
            <div className="msg warn"><b>{t('disclaimer')}</b></div>
            <h3>{t('observations')}</h3><ul>{ai.observations.map((o, i) => <li key={i}>{tx(o)}</li>)}</ul>
            {ai.possibleConcerns.length > 0 && <><h3>{t('concerns')}</h3><ul>{ai.possibleConcerns.map((o, i) => <li key={i}>{tx(o)}</li>)}</ul></>}
            <h3>{t('precautions')}</h3><ul>{ai.precautions.map((o, i) => <li key={i}>{tx(o)}</li>)}</ul>
            {ai.emergencySigns && <><h3>🚨 {t('emergencySigns')}</h3><ul>{ai.emergencySigns.map((o, i) => <li key={i}>{tx(o)}</li>)}</ul></>}
            <button className="secondary" onClick={readAi}>🔊 {t('readAloud')}</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>🩺 {t('nearbyDoctor')}</h2>
        {vets === null ? <p className="muted">{t('loading')}</p> : vets.length === 0 ? <p className="muted">{t('noVets')}</p> : (
          <table><tbody>{vets.map((v) => (
            <tr key={v.id}><td><b>{v.name}</b><br /><span className="muted">{v.district} · {v.distanceKm} {t('kmAway')}</span></td>
              <td><a href={`tel:${v.phone}`}><button className="small">📞 {t('call')}</button></a></td></tr>))}</tbody></table>)}
      </div>

      <div className="card">
        <h2>{t('reportDisease')}</h2>
        <form onSubmit={submit}>
          <label>{t('animal')}</label>
          <select value={rep.animalId} onChange={(e) => setRep({ ...rep, animalId: e.target.value })}>
            <option value="">-</option>
            {animals.map((a) => <option key={a._id} value={a._id}>{a.name} ({t(a.species)})</option>)}</select>
          <label>{t('category')}</label>
          <select value={rep.category} onChange={(e) => setRep({ ...rep, category: e.target.value })}>
            {CATS.map((c) => <option key={c} value={c}>{t('cat_' + c)}</option>)}</select>
          <label>{t('notes')}</label>
          <textarea rows={3} value={rep.notes} onChange={(e) => setRep({ ...rep, notes: e.target.value })} />
          <button type="button" className="secondary" onClick={getLoc}>📍 {t('useLocation')}</button>
          {coords && <div className="msg">{t('confirmLocation')} ({coords.lat.toFixed(3)}, {coords.lng.toFixed(3)})</div>}
          <button type="submit">{t('submitReport')}</button>
        </form>
        {msg && <div className={'msg ' + msg.cls}>{msg.text}</div>}
      </div>
    </>
  );
}
