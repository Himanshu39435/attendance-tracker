import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import api, { errMsg } from '../api';
export default function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState({ password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (f.password !== f.confirm) return toast.error('Passwords do not match');
    setBusy(true);
    try { await api.post('/auth/reset-password', { token, password: f.password }); toast.success('Password updated. Log in with your new password.'); nav('/login'); }
    catch (er) { toast.error(errMsg(er)); setBusy(false); }
  };
  return (
    <AuthShell title="Set a new password" sub="Choose a password with at least 6 characters." footer={<Link to="/login" className="font-semibold text-indigo-600">Back to log in</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">New password</label><input className="input" type="password" minLength={6} required autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div><label className="label">Confirm password</label><input className="input" type="password" minLength={6} required autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </AuthShell>
  );
}
