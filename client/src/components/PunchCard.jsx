import { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut, Coffee, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { fmtMin, to12 } from '../utils/time';
import { Spinner } from './ui';

const hms = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':'); };
const Tile = ({ label, value, tone = '' }) => <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-xs text-slate-500">{label}</p><p className={`text-lg font-bold ${tone}`}>{value}</p></div>;

export default function PunchCard({ onChange }) {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [lunch, setLunch] = useState(30);
  const [tick, setTick] = useState(Date.now());

  const load = useCallback(() => api.get('/attendance/today').then((r) => setD({ ...r.data, fetchedAt: Date.now() })).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(t); }, []);

  if (!d) return <div className="card grid h-40 place-items-center"><Spinner /></div>;
  const offset = Date.parse(d.serverNow) - d.fetchedAt; // follow the server clock, not the phone's
  const now = tick + offset;
  const clock = (ms) => new Date(ms).toLocaleTimeString('en-IN', { timeZone: d.timezone, hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  const allowance = d.settings.lunchAllowance;
  const rec = d.record;

  const act = async (path, body, ok) => {
    setBusy(true);
    try { await api.post(`/attendance/${path}`, body); toast.success(ok); await load(); onChange?.(); setConfirm(false); }
    catch (e) { toast.error(errMsg(e)); await load(); }
    setBusy(false);
  };

  const hour = Number(new Date(now).toLocaleString('en-GB', { timeZone: d.timezone, hour: '2-digit', hour12: false }));
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // 1) Not checked in yet
  if (!rec) return (
    <div className="card bg-gradient-to-br from-indigo-600 to-blue-600 !border-0 text-white">
      <p className="text-sm text-indigo-100">{greet}, {user.name.split(' ')[0]}</p>
      <p className="mt-1 text-3xl font-extrabold">{clock(now)}</p>
      <p className="mt-3 text-lg font-semibold">Have you arrived at the office?</p>
      <button className="btn mt-4 w-full bg-white !text-indigo-700 hover:bg-indigo-50 sm:w-auto" disabled={busy} onClick={() => act('punch-in', {}, 'Check-in recorded')}><LogIn className="h-5 w-5" />{busy ? 'Saving…' : "Yes, I'm in"}</button>
    </div>
  );

  // 2) Checked in, still working
  if (rec.status === 'open') {
    const running = rec.lunchStart ? now - Date.parse(rec.lunchStart) : 0;
    const lunchSoFar = rec.lunchMinutes + Math.floor(running / 60000);
    return (
      <>
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="flex items-center gap-2 text-sm font-semibold text-emerald-600"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />Checked in at {to12(rec.inTime)}</p>
              <p className="text-3xl font-extrabold tabular-nums">{hms(now - Date.parse(rec.inAt))}</p><p className="text-xs text-slate-500">time since check-in</p></div>
            <p className="text-right text-sm text-slate-500">Now {clock(now)}<br />Lunch allowed: {allowance} min</p>
          </div>
          {rec.lunchStart ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
              <p className="text-sm"><Coffee className="mr-1 inline h-4 w-4 text-amber-600" />Lunch running: <b className="tabular-nums">{hms(running)}</b></p>
              <button className="btn-ghost" disabled={busy} onClick={() => act('lunch-end', {}, 'Lunch ended')}>End lunch</button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-sm text-slate-600 dark:text-slate-300"><Coffee className="mr-1 inline h-4 w-4" />Lunch taken: <b>{lunchSoFar} min</b></p>
              <button className="btn-ghost" disabled={busy} onClick={() => act('lunch-start', {}, 'Lunch started')}>Start lunch</button>
            </div>
          )}
          <button className="btn-primary w-full sm:w-auto" disabled={busy} onClick={() => { setLunch(lunchSoFar > 0 ? lunchSoFar : allowance); setConfirm(true); }}><LogOut className="h-5 w-5" />Yes, I'm leaving</button>
        </div>
        {confirm && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={() => setConfirm(false)}>
            <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <h3 className="text-lg font-bold">Check out now?</h3>
              <p className="mt-1 text-sm text-slate-500">Out time will be recorded as <b>{clock(now)}</b>.</p>
              <label className="label mt-4">Lunch taken (minutes)</label>
              <input className="input" type="number" min="0" max="600" inputMode="numeric" value={lunch} onChange={(e) => setLunch(e.target.value)} />
              <p className="mt-2 text-xs text-slate-500">Standard lunch is {allowance} min. If you took less, the unused minutes are added to your working time.</p>
              <div className="mt-5 flex gap-3"><button className="btn-ghost flex-1" onClick={() => setConfirm(false)}>Not yet</button>
                <button className="btn-primary flex-1" disabled={busy} onClick={() => act('punch-out', { lunchMinutes: Number(lunch) }, 'Check-out recorded')}>{busy ? 'Saving…' : 'Yes, check out'}</button></div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 3) Day complete: show the summary
  const gross = rec.totalWorkingMinutes + rec.breakMinutes;
  const bonus = Math.max(0, allowance - rec.breakMinutes);
  const extra = Math.max(0, rec.breakMinutes - allowance);
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-5 w-5" /><p className="font-semibold">Today's attendance is complete</p></div>
      <p className="text-2xl font-extrabold">Today you worked <span className="text-indigo-600 dark:text-indigo-300">{fmtMin(rec.totalWorkingMinutes)}</span></p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="In" value={to12(rec.inTime)} /><Tile label="Out" value={to12(rec.outTime)} />
        <Tile label="Time at office" value={fmtMin(gross)} /><Tile label={`Lunch (allowed ${allowance}m)`} value={`${rec.breakMinutes} min`} />
        <Tile label="Overtime" value={fmtMin(rec.overtimeMinutes)} tone="text-amber-600" />
      </div>
      {bonus > 0 && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">Lunch allowed {allowance} min, you took {rec.breakMinutes} min, so {bonus} min was added to your working time.</p>}
      {extra > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">You took {extra} min more than the {allowance} min lunch, so it was deducted from your working time.</p>}
    </div>
  );
}
