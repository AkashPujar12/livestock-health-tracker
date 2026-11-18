import { useEffect, useState } from 'react';
import api, { cachedGet, postOrQueue } from '../api';
import { useI18n } from '../i18n';

export default function Pregnancy() {
  const { t, lang } = useI18n();
  const [animals, setAnimals] = useState([]);
  const [list, setList] = useState([]);
  const [f, setF] = useState({ animalId: '', matingDate: new Date().toISOString().slice(0, 10) });
  const [calf, setCalf] = useState({});
  const [msg, setMsg] = useState('');
  const fmt = (x) => new Date(x).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN');
  const load = () => cachedGet('/pregnancies').then(setList);

  useEffect(() => {
    load();
    cachedGet('/animals').then((a) => {
      const females = a.filter((x) => x.sex === 'female');
      setAnimals(females); setF((p) => ({ ...p, animalId: females[0]?._id || '' }));
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await postOrQueue('/pregnancies', f);
      setMsg(r.queued ? t('savedOffline') : t('saved')); load();
    } catch (err) { setMsg(err.response?.data?.error || err.message); }
  };
  const deliver = async (id) => {
    await api.patch(`/pregnancies/${id}/deliver`, { actualDate: new Date().toISOString(), calfName: calf[id] || undefined });
    load();
  };

  return (
    <>
      <div className="card">
        <h2>{t('expectedDelivery')}</h2>
        <form onSubmit={submit}>
          <div className="row">
            <div><label>{t('animal')}</label>
              <select required value={f.animalId} onChange={(e) => setF({ ...f, animalId: e.target.value })}>
                {animals.map((a) => <option key={a._id} value={a._id}>{a.name} ({t(a.species)})</option>)}</select></div>
            <div><label>{t('matingDate')}</label>
              <input type="date" required value={f.matingDate} onChange={(e) => setF({ ...f, matingDate: e.target.value })} /></div>
          </div>
          <button type="submit">{t('calculate')}</button>
        </form>
        {msg && <div className="msg">{msg}</div>}
        <p className="muted">{t('gestationNote')}</p>
      </div>
      {list.map((p) => (
        <div className="card" key={p._id}>
          <h2>{p.animal?.name} <span className={'badge ' + (p.status === 'active' ? 'upcoming' : 'completed')}>{p.status === 'active' ? t('upcoming') : t('delivered')}</span></h2>
          <p>{t('matingDate')}: {fmt(p.matingDate)}<br />
            {t('expectedOn')}: <b>{fmt(p.expectedDate)}</b>
            {p.status === 'active' && <> · <b>{p.daysLeft}</b> {t('daysLeft')}</>}</p>
          {p.status === 'active' && (<>
            <input placeholder={t('calfName')} value={calf[p._id] || ''} onChange={(e) => setCalf({ ...calf, [p._id]: e.target.value })} />
            <button className="secondary" onClick={() => deliver(p._id)}>{t('markDelivered')}</button>
          </>)}
        </div>))}
    </>
  );
}
