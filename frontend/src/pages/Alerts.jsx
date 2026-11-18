import { useEffect, useState } from 'react';
import api, { cachedGet } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { speak } from '../voice';

export default function Alerts() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [queue, setQueue] = useState([]);
  const fmt = (x) => new Date(x).toLocaleString(lang === 'kn' ? 'kn-IN' : 'en-IN');
  const pick = (n, k) => n[k + (lang === 'kn' ? 'Kn' : 'En')];

  const load = () => {
    cachedGet('/notifications').then(setNotes);
    cachedGet('/alerts/nearby').then(setAlerts);
    if (user.role === 'vet') cachedGet('/alerts/all').then(setQueue);
  };
  useEffect(() => { load(); api.post('/notifications/read-all').catch(() => {}); }, []);

  const review = async (id, status) => { await api.patch('/alerts/' + id, { status }); load(); };

  return (
    <>
      {user.role === 'vet' && (
        <div className="card">
          <h2>🩺 {t('vetPanel')}</h2>
          {queue.length === 0 ? <p className="muted">{t('none')}</p> : queue.map((a) => (
            <div key={a._id} style={{ marginBottom: 12 }}>
              <b>{t('cat_' + a.category)}</b> · {a.reporterCount} {t('reports')} · {fmt(a.createdAt)} <span className={'badge ' + a.status}>{t(a.status)}</span>
              {a.status === 'suspected' && (<div style={{ marginTop: 6 }}>
                <button className="small" onClick={() => review(a._id, 'verified')}>{t('verify')}</button>
                <button className="small danger" onClick={() => review(a._id, 'dismissed')}>{t('dismiss')}</button></div>)}
            </div>))}
        </div>
      )}
      <div className="card">
        <h2>⚠️ {t('nearbyAlerts')}</h2>
        {alerts.length === 0 ? <p className="muted">{t('none')}</p> : alerts.map((a) => (
          <p key={a._id}><b>{t('cat_' + a.category)}</b> · {a.reporterCount} {t('reports')} · {a.radiusKm} km
            {' '}<span className={'badge ' + a.status}>{t(a.status)}</span></p>))}
      </div>
      <div className="card">
        <h2>🔔 {t('notifications')}</h2>
        {notes.length === 0 ? <p className="muted">{t('none')}</p> : notes.map((n) => (
          <div key={n._id} style={{ marginBottom: 12 }}>
            <b>{pick(n, 'title')}</b> <span className="muted">{fmt(n.createdAt)}</span>
            <div>{pick(n, 'body')}</div>
            <button className="small secondary" style={{ marginTop: 6 }} onClick={() => speak(pick(n, 'title') + '. ' + pick(n, 'body'), lang)}>🔊 {t('readAloud')}</button>
          </div>))}
      </div>
    </>
  );
}
