import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import api, { errMsg } from '../api';
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post('/auth/forgot-password', { email }); setSent(true); } catch (er) { toast.error(errMsg(er)); }
    setBusy(false);
  };
  return (
    <AuthShell title="Forgot password" sub="Enter your email and we will send a reset link." footer={<Link to="/login" className="font-semibold text-indigo-600">Back to log in</Link>}>
      {sent ? <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">If that email is registered, a reset link is on its way. The link is valid for 1 hour.</div> : (
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>)}
    </AuthShell>
  );
}
