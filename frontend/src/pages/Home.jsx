import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cachedGet } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';

export default function Home() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [d, setD] = useState({ animals: [], due: [], preg: [], alerts: [] });
  const fmt = (x) => new Date(x).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN');

  useEffect(() => {
    Promise.all([cachedGet('/animals'), cachedGet('/vaccinations/due'), cachedGet('/pregnancies'), cachedGet('/alerts/nearby')])
      .then(([animals, due, preg, alerts]) => setD({ animals, due, preg: preg.filter((p) => p.status === 'active'), alerts }))
      .catch(() => {});
  }, []);

  const count = (species) => d.animals.filter((a) => a.species === species).length;
  return (
    <div className="dashboard">
      <section className="welcome-hero">
        <div className="hero-copy">
          <span className="eyebrow">FARM CARE • MADE SIMPLE</span>
          <h2>{t('welcome')}, {user.name}!</h2>
          <p>Keep every animal healthy with simple records, timely care and helpful reminders.</p>
          <Link className="hero-cta" to="/animals">＋ {t('addAnimal')}</Link>
        </div>
        <div className="hero-photo" role="img" aria-label="Healthy cows grazing on a green farm" />
        <div className="hero-stamp">🌿<span>Care<br/>every day</span></div>
      </section>

      {d.alerts.length > 0 && <div className="msg warn alert-banner">⚠️ {t('nearbyAlerts')}: {d.alerts.length}</div>}

      <section className="section-heading"><div><span className="eyebrow">YOUR FARM AT A GLANCE</span><h2>Farm overview</h2></div><span className="live-pill">● {t('home')}</span></section>
      <section className="stats-grid">
        <div className="stat-card stat-total"><div className="stat-icon">🐄</div><span>{t('animals')}</span><strong>{d.animals.length}</strong><small>Registered animals</small></div>
        <div className="stat-card"><div className="stat-icon">💉</div><span>{t('dueSoon')}</span><strong>{d.due.length}</strong><small>Vaccination reminders</small></div>
        <div className="stat-card"><div className="stat-icon">🐣</div><span>{t('upcomingDeliveries')}</span><strong>{d.preg.length}</strong><small>Expected deliveries</small></div>
        <div className="stat-card"><div className="stat-icon">📍</div><span>{t('nearbyAlerts')}</span><strong>{d.alerts.length}</strong><small>Community health alerts</small></div>
      </section>

      <section className="species-strip">
        <div><span className="species-emoji">🐄</span><b>{t('cow')}</b><strong>{count('cow')}</strong></div>
        <div><span className="species-emoji">🐃</span><b>{t('buffalo')}</b><strong>{count('buffalo')}</strong></div>
        <div><span className="species-emoji">🐐</span><b>{t('goat')}</b><strong>{count('goat')}</strong></div>
        <div><span className="species-emoji">🐑</span><b>{t('sheep')}</b><strong>{count('sheep')}</strong></div>
      </section>

      <div className="dashboard-columns">
        <div className="card dashboard-card">
          <div className="card-heading"><div><span className="eyebrow">DON'T MISS A DOSE</span><h2>💉 {t('dueSoon')}</h2></div><Link to="/vaccinations">View all →</Link></div>
          {d.due.length === 0 ? <p className="muted">{t('none')}</p> : <table><tbody>{d.due.map((v) => (
            <tr key={v._id}><td><b>{v.animal?.name}</b></td><td>{v.vaccine}</td><td>{fmt(v.nextDue)}</td><td><span className={'badge ' + v.status}>{t(v.status)}</span></td></tr>))}</tbody></table>}
        </div>
        <div className="card dashboard-card">
          <div className="card-heading"><div><span className="eyebrow">MATERNITY CARE</span><h2>🐣 {t('upcomingDeliveries')}</h2></div><Link to="/pregnancy">View all →</Link></div>
          {d.preg.length === 0 ? <p className="muted">{t('none')}</p> : <table><tbody>{d.preg.map((p) => (
            <tr key={p._id}><td><b>{p.animal?.name}</b></td><td>{fmt(p.expectedDate)}</td><td>{p.daysLeft} {t('daysLeft')}</td></tr>))}</tbody></table>}
        </div>
      </div>
      <section className="quick-actions">
        <Link to="/report"><span>🩺</span><div><b>Report a health issue</b><small>Get guidance and contact nearby vets</small></div><strong>→</strong></Link>
        <Link to="/animals"><span>🐾</span><div><b>Manage your animals</b><small>View and update your herd records</small></div><strong>→</strong></Link>
      </section>
    </div>
  );
}
