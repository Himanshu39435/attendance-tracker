import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useTarget } from '../hooks/useTarget';
import { PageHeader, PageLoader } from '../components/ui';
import { DAYS } from '../utils/time';

export default function Settings() {
  const { params: tp, name } = useTarget();
  const [f, setF] = useState(null);
  const [orig, setOrig] = useState('');
  const [recalc, setRecalc] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/settings', { params: tp }).then((r) => { setF(r.data); setOrig(r.data.overtimeStartTime); }).catch((e) => toast.error(errMsg(e))); }, [tp.userId]);
  if (!f) return <PageLoader />;
  const toggleDay = (d) => setF({ ...f, workingDays: f.workingDays.includes(d) ? f.workingDays.filter((x) => x !== d) : [...f.workingDays, d].sort() });
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await api.put('/settings', { ...f, defaultBreakMinutes: Number(f.defaultBreakMinutes), recalculate: recalc && f.overtimeStartTime !== orig }, { params: tp });
      setF(r.data); setOrig(r.data.overtimeStartTime); setRecalc(false); toast.success('Settings saved');
    } catch (er) { toast.error(errMsg(er)); }
    setBusy(false);
  };
  const rp = f.reportPreferences || {};
  return (
    <>
      <PageHeader title="Settings" sub={name ? `Settings used for ${name}'s attendance calculation.` : 'Defaults copied to every new staff account you create. Open a staff member to change their own settings.'} />
      <form onSubmit={save} className="card max-w-2xl space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">Office start time</label><input className="input" type="time" required value={f.officeStartTime} onChange={(e) => setF({ ...f, officeStartTime: e.target.value })} /></div>
          <div><label className="label">Overtime starts at</label><input className="input" type="time" required value={f.overtimeStartTime} onChange={(e) => setF({ ...f, overtimeStartTime: e.target.value })} /></div>
          <div><label className="label">Standard lunch (min)</label><input className="input" type="number" min="0" max="600" value={f.defaultBreakMinutes} onChange={(e) => setF({ ...f, defaultBreakMinutes: e.target.value })} /></div>
        </div>
        {f.overtimeStartTime !== orig && <label className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-500/10"><input type="checkbox" className="mt-1" checked={recalc} onChange={(e) => setRecalc(e.target.checked)} />Also recalculate overtime for all my existing records with the new time.</label>}
        <div><label className="label">Working days</label><div className="flex flex-wrap gap-2">{DAYS.map((d, i) => (
          <button type="button" key={d} onClick={() => toggleDay(i)} className={`btn !min-h-[40px] border ${f.workingDays.includes(i) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>{d}</button>))}</div></div>
        <div><label className="label">Monthly report preferences</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="input" value={rp.defaultView || 'month'} onChange={(e) => setF({ ...f, reportPreferences: { ...rp, defaultView: e.target.value } })}><option value="month">Open reports by month</option><option value="range">Open reports by custom range</option></select>
            <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={rp.includeNotes ?? true} onChange={(e) => setF({ ...f, reportPreferences: { ...rp, includeNotes: e.target.checked } })} />Include notes in reports and exports</label>
          </div></div>
        <button className="btn-primary" disabled={busy}><Save className="h-4 w-4" />{busy ? 'Saving…' : 'Save settings'}</button>
      </form>
    </>
  );
}
