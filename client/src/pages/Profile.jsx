import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { Avatar, PageHeader } from '../components/ui';
import { fileToAvatar } from '../utils/image';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef();

  const savePhoto = async (avatar) => {
    setPhotoBusy(true);
    try { const r = await api.put('/auth/profile', { avatar }); setUser(r.data.user); toast.success(avatar ? 'Profile photo updated' : 'Profile photo removed'); }
    catch (er) { toast.error(errMsg(er)); }
    setPhotoBusy(false);
  };
  const pick = async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    try { await savePhoto(await fileToAvatar(file)); } catch (er) { toast.error(er.message); }
  };
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await api.put('/auth/profile', { name, ...(pw.newPassword && pw) });
      setUser(r.data.user); setPw({ currentPassword: '', newPassword: '' }); toast.success('Profile updated');
    } catch (er) { toast.error(errMsg(er)); }
    setBusy(false);
  };
  return (
    <>
      <PageHeader title="Profile" />
      <div className="card mb-5 flex max-w-xl flex-wrap items-center gap-4">
        <Avatar user={user} size="h-24 w-24 text-3xl" />
        <div>
          <p className="font-semibold">{user.name}</p><p className="mb-3 text-sm text-slate-500">{user.email}</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost !min-h-[40px]" disabled={photoBusy} onClick={() => fileRef.current.click()}><Camera className="h-4 w-4" />{photoBusy ? 'Saving…' : user.avatar ? 'Change photo' : 'Upload photo'}</button>
            {user.avatar && <button className="btn-ghost !min-h-[40px] !text-rose-600" disabled={photoBusy} onClick={() => savePhoto('')}><Trash2 className="h-4 w-4" />Remove</button>}
          </div>
          <p className="mt-2 text-xs text-slate-500">JPG, PNG or WebP. It is cropped to a square automatically.</p>
        </div>
      </div>
      <form onSubmit={save} className="card max-w-xl space-y-4">
        <div><label className="label">Name</label><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">Email</label><input className="input opacity-70" disabled value={user.email} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Current password</label><input className="input" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
          <div><label className="label">New password</label><input className="input" type="password" minLength={6} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
        </div>
        <p className="text-xs text-slate-500">Leave the password fields empty to keep your current password.</p>
        <div className="flex gap-3"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button><button type="button" className="btn-ghost" onClick={logout}>Logout</button></div>
      </form>
    </>
  );
}
