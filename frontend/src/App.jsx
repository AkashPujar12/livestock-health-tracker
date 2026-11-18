import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from './auth';
import { useI18n } from './i18n';
import api from './api';
import Login from './pages/Login';
import Home from './pages/Home';
import Animals from './pages/Animals';
import Vaccinations from './pages/Vaccinations';
import Pregnancy from './pages/Pregnancy';
import Report from './pages/Report';
import Alerts from './pages/Alerts';
import VoiceAssistant from './components/VoiceAssistant';

export default function App() {
  const { user, ready, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  if (!ready) return <p className="center">…</p>;
  if (!user) return <Login />;

  const switchLang = (l) => { setLang(l); api.patch('/auth/me', { language: l }).catch(() => {}); };
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark">🐄</div>
          <div><h1>{t('appName')}</h1><span>Healthy livestock · Happy farms</span></div>
        </div>
        <nav className="main-nav">
          <NavLink to="/"><span>⌂</span>{t('home')}</NavLink>
          <NavLink to="/animals"><span>🐾</span>{t('animals')}</NavLink>
          <NavLink to="/vaccinations"><span>＋</span>{t('vaccination')}</NavLink>
          <NavLink to="/pregnancy"><span>♡</span>{t('expectedDelivery')}</NavLink>
          <NavLink to="/report"><span>✚</span>{t('reportDisease')}</NavLink>
          <NavLink to="/alerts"><span>♧</span>{t('diseaseAlert')}</NavLink>
        </nav>
        <div className="header-actions">
          <button className="small language-button" onClick={() => switchLang(lang === 'kn' ? 'en' : 'kn')}>
            {lang === 'kn' ? 'English' : 'ಕನ್ನಡ'}
          </button>
          <button className="small logout-button" onClick={logout}>{t('logout')}</button>
        </div>
      </header>
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/animals" element={<Animals />} />
          <Route path="/vaccinations" element={<Vaccinations />} />
          <Route path="/pregnancy" element={<Pregnancy />} />
          <Route path="/report" element={<Report />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <VoiceAssistant />
    </div>
  );
}
