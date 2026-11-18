import { createContext, useContext, useEffect, useState } from 'react';
import api, { syncQueue } from './api';
import { useI18n } from './i18n';

const Ctx = createContext();

export function AuthProvider({ children }) {
  const { setLang } = useI18n();
  const cached = localStorage.getItem('user');
  const [user, setUser] = useState(cached ? JSON.parse(cached) : null);
  const [ready, setReady] = useState(false);

  const store = (u) => { setUser(u); u ? localStorage.setItem('user', JSON.stringify(u)) : localStorage.removeItem('user'); };

  useEffect(() => {
    if (!localStorage.getItem('token')) { store(null); setReady(true); return; }
    api.get('/auth/me')
      .then((r) => { store(r.data); setLang(r.data.language); syncQueue(); })
      .catch((e) => { if (e.response?.status === 401) { localStorage.removeItem('token'); store(null); } })
      .finally(() => setReady(true));
  }, []);

  const login = (token, u) => { localStorage.setItem('token', token); store(u); setLang(u.language); };
  const logout = () => { localStorage.removeItem('token'); store(null); };
  const refresh = () => api.get('/auth/me').then((r) => store(r.data));
  return <Ctx.Provider value={{ user, ready, login, logout, refresh }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
