import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api';
// Only used once, to create the first (admin) account. After that, the admin creates staff accounts.
export default function Register() {
  const { register } = useAuth();
  const [open, setOpen] = useState(null);
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/auth/setup-status').then((r) => setOpen(r.data.needsSetup)).catch(() => setOpen(false)); }, []);
  const submit = async (e) => {
    e.preventDefault();
    if (f.password !== f.confirm) return toast.error('Passwords do not match');
    setBusy(true);
    try { await register({ name: f.name, email: f.email, password: f.password }); toast.success('Admin account created'); } catch (er) { toast.error(errMsg(er)); setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  if (open === null) return null;
  return (
    <AuthShell title={open ? 'Create the admin account' : 'Registration is closed'} sub={open ? 'This first account controls the whole system and creates staff accounts.' : 'Staff accounts are created by your admin. Ask them for your login email and password.'} footer={<Link to="/login" className="font-semibold text-indigo-600">Go to log in</Link>}>
      {open && <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Full name</label><input className="input" required value={f.name} onChange={set('name')} autoComplete="name" /></div>
        <div><label className="label">Email</label><input className="input" type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Password</label><input className="input" type="password" required minLength={6} value={f.password} onChange={set('password')} autoComplete="new-password" /></div>
          <div><label className="label">Confirm password</label><input className="input" type="password" required minLength={6} value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></div>
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create admin account'}</button>
      </form>}
    </AuthShell>
  );
}
