import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import AuthShell from './AuthShell';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';
export default function Login() {
  const { login } = useAuth();
  const [f, setF] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [setup, setSetup] = useState(false);
  useEffect(() => { api.get('/auth/setup-status').then((r) => setSetup(r.data.needsSetup)).catch(() => {}); }, []);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await login(f); toast.success('Welcome back'); } catch (er) { toast.error(errMsg(er)); setUnverified(er.response?.data?.code === 'EMAIL_NOT_VERIFIED'); setBusy(false); }
  };
  return (
    <AuthShell title="Log in" sub="Continue to your attendance records." footer={setup ? <>First time here? <Link to="/register" className="font-semibold text-indigo-600">Create the admin account</Link></> : 'Staff accounts are created by your admin.'}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Email</label><input className="input" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><div className="flex items-center justify-between"><label className="label">Password</label><Link to="/forgot-password" className="mb-1.5 text-sm font-medium text-indigo-600">Forgot password?</Link></div><input className="input" type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        {unverified && <button type="button" className="btn-ghost w-full" onClick={() => api.post('/auth/resend-verification', { email: f.email }).then(() => toast.success('Verification email sent'))}>Resend verification email</button>}
      </form>
    </AuthShell>
  );
}
