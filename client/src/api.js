import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
api.interceptors.request.use((c) => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && !e.config.url.startsWith('/auth/login')) { localStorage.removeItem('token'); if (!location.pathname.startsWith('/login')) location.href = '/login'; }
  return Promise.reject(e);
});
export const errMsg = (e) => e.response?.data?.message || (e.request ? 'Cannot reach the server. Check that the backend is running.' : e.message);
export default api;
