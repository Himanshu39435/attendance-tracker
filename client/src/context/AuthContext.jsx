import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';
const Ctx = createContext();
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
  }, []);
  const authed = (d) => { localStorage.setItem('token', d.token); setUser(d.user); };
  const login = async (b) => authed((await api.post('/auth/login', b)).data);
  const register = async (b) => { const d = (await api.post('/auth/register', b)).data; if (d.needsVerification) return d; authed(d); return d; };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  return <Ctx.Provider value={{ user, setUser, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
