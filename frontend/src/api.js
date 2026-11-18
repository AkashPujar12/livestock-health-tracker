import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = 'Bearer ' + t;
  return c;
});

// ---- Offline support: cache GETs, queue POSTs while offline, sync when back online ----
const QKEY = 'offlineQueue';
const readQ = () => JSON.parse(localStorage.getItem(QKEY) || '[]');

export async function cachedGet(url, fallback = []) {
  try {
    const r = await api.get(url);
    localStorage.setItem('c:' + url, JSON.stringify(r.data));
    return r.data;
  } catch (e) {
    const c = localStorage.getItem('c:' + url);
    return c ? JSON.parse(c) : fallback;
  }
}

export async function postOrQueue(url, data) {
  try {
    const r = await api.post(url, data);
    return { data: r.data };
  } catch (e) {
    if (!e.response) { // network error -> keep locally
      const q = readQ();
      q.push({ url, data, at: Date.now() });
      localStorage.setItem(QKEY, JSON.stringify(q));
      return { queued: true };
    }
    throw e;
  }
}

export async function syncQueue() {
  const q = readQ();
  if (!q.length || !localStorage.getItem('token')) return;
  const left = [];
  for (const item of q) {
    try { await api.post(item.url, item.data); }
    catch (e) { if (!e.response) left.push(item); } // drop items the server rejects (4xx)
  }
  localStorage.setItem(QKEY, JSON.stringify(left));
}
window.addEventListener('online', syncQueue);

export default api;
