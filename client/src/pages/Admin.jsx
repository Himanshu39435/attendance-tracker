import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, Database, CalendarDays, ShieldCheck, Ban, Trash2, UserPlus, KeyRound, LayoutDashboard, History, FileBarChart, Settings, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { Avatar, ConfirmDialog, Empty, PageHeader, PageLoader, StatCard } from '../components/ui';

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
    <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"><h3 className="mb-4 text-lg font-bold">{title}</h3>{children}</div>
  </div>
);

export default function Admin() {
  const { user: me } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [del, setDel] = useState(null);
  const [add, setAdd] = useState(false);
  const [reset, setReset] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    api.get('/admin/users').then((u) => setUsers(u.data)).catch((e) => toast.error(errMsg(e)));
  }, []);
  useEffect(load, [load]);
  const run = async (fn, ok) => { setBusy(true); try { await fn(); toast.success(ok); load(); return true; } catch (e) { toast.error(errMsg(e)); return false; } finally { setBusy(false); } };
  const patch = (u, body, msg) => run(() => api.patch(`/admin/users/${u.id}`, body), msg);

  if (!users) return <PageLoader />;
  const qs = (u) => `?userId=${u.id}&name=${encodeURIComponent(u.name)}`;
  const nav = [['/', 'Dashboard', LayoutDashboard], ['/history', 'Records', History], ['/reports', 'Reports', FileBarChart], ['/add', 'Add entry', PlusCircle], ['/settings', 'Settings', Settings]];
  return (
    <>
      <PageHeader title="Staff management" sub="Create staff accounts and control their attendance and settings.">
        <button className="btn-primary" onClick={() => { setForm({ name: '', email: '', password: '' }); setAdd(true); }}><UserPlus className="h-4 w-4" />Add staff</button>
      </PageHeader>
      <div className="card !p-0">
        <h3 className="p-4 pb-2 font-semibold">Staff and admins</h3>
        {!users.length ? <Empty title="No users yet" /> : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{users.map((u) => {
          const self = u.id === me.id;
          return (
            <li key={u.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3"><Avatar user={u} size="h-11 w-11" /><div className="min-w-0">
                  <p className="truncate font-semibold">{u.name} {self && <span className="text-xs font-normal text-slate-400">(you)</span>}</p>
                  <p className="truncate text-sm text-slate-500">{u.email}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className={`rounded-full px-2 py-0.5 ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{u.role === 'admin' ? 'admin' : 'staff'}</span>
                    <span className={`rounded-full px-2 py-0.5 ${u.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20'}`}>{u.isActive ? 'active' : 'disabled'}</span>
                    <span className="px-1 text-slate-500">{u.records} records{u.lastEntry && `, last ${u.lastEntry}`}</span>
                  </div>
                </div></div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-ghost !min-h-[40px]" onClick={() => { setPw(''); setReset(u); }}><KeyRound className="h-4 w-4" />Reset password</button>
                  {!self && <>
                    <button className="btn-ghost !min-h-[40px]" onClick={() => patch(u, { role: u.role === 'admin' ? 'user' : 'admin' }, u.role === 'admin' ? 'Now staff' : 'Now admin')}><ShieldCheck className="h-4 w-4" />{u.role === 'admin' ? 'Make staff' : 'Make admin'}</button>
                    <button className="btn-ghost !min-h-[40px]" onClick={() => patch(u, { isActive: !u.isActive }, u.isActive ? 'User disabled' : 'User enabled')}><Ban className="h-4 w-4" />{u.isActive ? 'Disable' : 'Enable'}</button>
                    <button className="btn-ghost !min-h-[40px] !text-rose-600" onClick={() => setDel(u)}><Trash2 className="h-4 w-4" />Delete</button></>}
                </div>
              </div>
              {!self && <div className="flex flex-wrap gap-2">{nav.map(([to, label, Icon]) => (
                <Link key={to} to={`${to}${qs(u)}`} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-indigo-50 px-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300"><Icon className="h-4 w-4" />{label}</Link>))}</div>}
            </li>);
        })}</ul>}
      </div>

      {add && <Modal title="Add staff member" onClose={() => setAdd(false)}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.post('/admin/users', form), 'Staff account created')) setAdd(false); }}>
          <div><label className="label">Full name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Login email</label><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Password (share it with them)</label><input className="input" type="text" minLength={6} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <p className="text-xs text-slate-500">They log in with this email and password and can only add and view their own attendance. They start with your current overtime and break settings.</p>
          <div className="flex gap-3 pt-1"><button type="button" className="btn-ghost flex-1" onClick={() => setAdd(false)}>Cancel</button><button className="btn-primary flex-1" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button></div>
        </form></Modal>}
      {reset && <Modal title={`Reset password for ${reset.name}`} onClose={() => setReset(null)}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await patch(reset, { password: pw }, 'Password updated')) setReset(null); }}>
          <div><label className="label">New password</label><input className="input" type="text" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div className="flex gap-3"><button type="button" className="btn-ghost flex-1" onClick={() => setReset(null)}>Cancel</button><button className="btn-primary flex-1" disabled={busy}>Save password</button></div>
        </form></Modal>}
      <ConfirmDialog open={!!del} busy={busy} title="Delete this user?" message={del ? `${del.name} and all ${del.records} of their attendance records will be permanently deleted.` : ''} onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => api.delete(`/admin/users/${del.id}`), 'User deleted')) setDel(null); }} />
    </>
  );
}
