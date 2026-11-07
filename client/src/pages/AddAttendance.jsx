import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useTarget } from '../hooks/useTarget';
import { PageHeader, PageLoader } from '../components/ui';
import { fmtMin, previewCalc, todayStr, to12 } from '../utils/time';

export default function AddAttendance() {
  const { id } = useParams();
  const nav = useNavigate();
  const { params: tp, q, name } = useTarget();
  const [settings, setSettings] = useState(null);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = (await api.get('/settings', { params: tp })).data;
        setSettings(s);
        if (id) {
          const all = (await api.get('/attendance', { params: tp })).data;
          const r = all.find((x) => x._id === id);
          if (!r) { toast.error('Record not found'); return nav(`/history${q}`); }
          setF({ date: r.date, inTime: r.inTime, outTime: r.outTime, breakMinutes: r.breakMinutes, notes: r.notes });
        } else setF({ date: todayStr(), inTime: s.officeStartTime, outTime: '', breakMinutes: s.defaultBreakMinutes, notes: '' });
      } catch (e) { toast.error(errMsg(e)); }
    })();
  }, [id, nav, tp.userId]);

  if (!f) return <PageLoader />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const p = previewCalc({ ...f, overtimeStartTime: settings.overtimeStartTime });

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const body = { ...f, breakMinutes: Number(f.breakMinutes || 0) };
      if (id) await api.put(`/attendance/${id}`, body, { params: tp }); else await api.post('/attendance', body, { params: tp });
      toast.success(id ? 'Attendance updated' : 'Attendance saved');
      nav(`/history${q}`);
    } catch (er) { toast.error(errMsg(er)); setBusy(false); }
  };
  return (
    <>
      <PageHeader title={id ? 'Edit attendance' : 'Add attendance'} sub={`${name ? `For ${name}. ` : ''}Overtime counts after ${to12(settings.overtimeStartTime)}`} />
      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={submit} className="card space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Date</label><input className="input" type="date" required value={f.date} onChange={set('date')} /></div>
            <div><label className="label">Break time (minutes)</label><input className="input" type="number" min="0" max="600" step="1" inputMode="numeric" value={f.breakMinutes} onChange={set('breakMinutes')} /></div>
            <div><label className="label">Office in-time</label><input className="input" type="time" required value={f.inTime} onChange={set('inTime')} /></div>
            <div><label className="label">Office out-time <span className="font-normal text-slate-400">(optional, add later)</span></label><input className="input" type="time" value={f.outTime} onChange={set('outTime')} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input min-h-[90px]" maxLength={500} placeholder="Optional" value={f.notes} onChange={set('notes')} /></div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="btn-primary sm:min-w-[200px]" disabled={busy}><Save className="h-4 w-4" />{busy ? 'Saving…' : id ? 'Update attendance' : 'Save attendance'}</button>
            <button type="button" className="btn-ghost" onClick={() => nav(-1)}>Cancel</button>
          </div>
        </form>
        <div className="card h-fit">
          <h3 className="mb-3 font-semibold">Live calculation</h3>
          {!p ? <p className="text-sm text-slate-500">{f.inTime && !f.outTime ? 'Only in-time entered. This will be saved as in progress, and you can add the out-time later.' : 'Enter the in-time (and out-time) to see working hours and overtime.'}</p> : (
            <div className="space-y-3">
              <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-500/10"><p className="text-xs text-slate-500">Total working time</p><p className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">{fmtMin(p.total)}</p></div>
              <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10"><p className="text-xs text-slate-500">Overtime after {to12(settings.overtimeStartTime)}</p><p className="text-2xl font-bold text-amber-600">{fmtMin(p.ot)}</p></div>
              {p.overnight && <p className="flex items-center gap-2 text-sm text-slate-500"><Moon className="h-4 w-4" />Overnight shift: out-time is on the next day.</p>}
            </div>)}
        </div>
      </div>
    </>
  );
}
