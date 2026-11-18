import { createContext, useContext, useState, useCallback } from 'react';
import en from './locales/en.json';
import kn from './locales/kn.json';

const dict = { en, kn };
const Ctx = createContext();

export function I18nProvider({ children }) {
  const [lang, setL] = useState(localStorage.getItem('lang') || 'kn');
  const setLang = (l) => { localStorage.setItem('lang', l); setL(l); };
  const t = useCallback((key, vars) => {
    let s = dict[lang][key] ?? dict.en[key] ?? key;
    if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
    return s;
  }, [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
