import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { cachedGet, postOrQueue } from '../api';
import { useI18n } from '../i18n';

export default function Vaccinations() {
  const { t, lang } = useI18n();
  const loc = useLocation();
  const today = new Date().toISOString().slice(0, 10);
  const blank = { animalId: '', vaccine: '', date: today, dose: '', vetName: '', nextDue: '' };
  const [animals, setAnimals] = useState([]);
  const [list, setList] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState('');
  const fmt = (x) => (x ? new Date(x).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN') : '-');
  const load = () => cachedGet('/vaccinations').then(setList);

  useEffect(() => {
    load();
    cachedGet('/animals').then((a) => { setAnimals(a); setF((p) => ({ ...p, animalId: a[0]?._id || '' })); });
  }, []);
  // Voice "remind me next month" pre-fills the next due date for confirmation.
  useEffect(() => {
    const r = loc.state?.reminder;
    if (r) { setF((p) => ({ ...p, nextDue: r.nextDue })); setMsg(t('confirmHint')); window.history.replaceState({}, ''); }
  }, [loc.state]);

  const animal = animals.find((a) => a._id === f.animalId);
  useEffect(() => {
    if (animal) cachedGet('/vaccinations/schedules?species=' + animal.species).then(setSchedules);
  }, [f.animalId, animals.length]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...f }; if (!body.nextDue) delete body.nextDue;
      const r = await postOrQueue('/vaccinations', body);
      setMsg(r.queued ? t('savedOffline') : t('saved'));
      setF({ ...blank, animalId: f.animalId }); load();
    } catch (err) { setMsg(err.response?.data?.error || err.message); }
  };
  const del = async (id) => { await api.delete('/vaccinations/' + id); load(); };

  return (
    <>
      <div className="card">
        <h2>{t('vaccination')}</h2>
        <form onSubmit={submit}>
          <div className="row">
            <div><label>{t('animal')}</label>
              <select required value={f.animalId} onChange={set('animalId')}>
                {animals.map((a) => <option key={a._id} value={a._id}>{a.name} ({t(a.species)})</option>)}</select></div>
            <div><label>{t('vaccine')}</label>
              <input required list="vaccines" value={f.vaccine} onChange={set('vaccine')} />
              <datalist id="vaccines">{schedules.map((s) => <option key={s._id} value={s.vaccine} />)}</datalist></div>
            <div><label>{t('date')}</label><input type="date" required value={f.date} onChange={set('date')} /></div>
            <div><label>{t('dose')}</label><input value={f.dose} onChange={set('dose')} /></div>
            <div><label>{t('vetName')}</label><input value={f.vetName} onChange={set('vetName')} /></div>
            <div><label>{t('nextDue')}</label><input type="date" value={f.nextDue} onChange={set('nextDue')} /></div>
          </div>
          <button type="submit">{t('save')}</button>
        </form>
        {msg && <div className="msg">{msg}</div>}
      </div>
      <div className="card">
        <table>
          <thead><tr><th>{t('animal')}</th><th>{t('vaccine')}</th><th>{t('date')}</th><th>{t('nextDue')}</th><th>{t('status')}</th><th /></tr></thead>
          <tbody>{list.map((v) => (
            <tr key={v._id}><td>{v.animal?.name}</td><td>{v.vaccine}</td><td>{fmt(v.date)}</td><td>{fmt(v.nextDue)}</td>
              <td><span className={'badge ' + v.status}>{t(v.status)}</span></td>
              <td><button className="small danger" onClick={() => del(v._id)}>✕</button></td></tr>))}</tbody>
        </table>
        {list.length === 0 && <p className="muted">{t('none')}</p>}
      </div>
    </>
  );
}
