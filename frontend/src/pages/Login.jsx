import { useState } from 'react';
import api from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';

export default function Login() {
  const { t, lang, setLang } = useI18n();
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', phone: '', password: '', village: '', district: '' });
  const [loc, setLoc] = useState(null);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const getLoc = () => navigator.geolocation?.getCurrentPosition(
    (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
    () => setErr(t('locationNeeded')));

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const body = mode === 'login'
        ? { phone: f.phone, password: f.password }
        : { ...f, language: lang, ...(loc || {}) };
      const r = await api.post(`/auth/${mode}`, body);
      login(r.data.token, r.data.user);
    } catch (e2) { setErr(e2.response?.data?.error || e2.message); }
  };

  return (
    <main>
      <div className="card">
        <h2>🐄 {t('appName')}</h2>
        <label>{t('language')}</label>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="kn">ಕನ್ನಡ</option><option value="en">English</option>
        </select>
        <form onSubmit={submit}>
          {mode === 'register' && (<>
            <label>{t('name')}</label><input required value={f.name} onChange={set('name')} />
            <label>{t('village')}</label><input value={f.village} onChange={set('village')} />
            <label>{t('district')}</label><input value={f.district} onChange={set('district')} />
            <button type="button" className="secondary" onClick={getLoc}>📍 {t('useLocation')}</button>
            {loc && <div className="msg">{t('locationSet')}: {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}</div>}
          </>)}
          <label>{t('phone')}</label><input required inputMode="tel" value={f.phone} onChange={set('phone')} />
          <label>{t('password')}</label><input required type="password" minLength={6} value={f.password} onChange={set('password')} />
          {err && <div className="msg err">{err}</div>}
          <button type="submit">{t(mode)}</button>
        </form>
        <button className="secondary" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {t(mode === 'login' ? 'register' : 'login')}
        </button>
      </div>
    </main>
  );
}
