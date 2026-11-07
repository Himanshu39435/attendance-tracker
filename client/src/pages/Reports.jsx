import { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useTarget } from '../hooks/useTarget';
import { Empty, MonthYear, PageHeader, PageLoader, StatCard } from '../components/ui';
import { CalendarX, CalendarCheck, Clock, Timer, Gauge, Coffee } from 'lucide-react';
import { fmtDate, fmtMin, MONTHS, to12 } from '../utils/time';
import { exportExcel, exportPdf } from '../utils/export';

export default function Reports() {
  const now = new Date();
  const { params: tp, name } = useTarget();
  const [mode, setMode] = useState('month');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [notes, setNotes] = useState(true);

  useEffect(() => { api.get('/settings', { params: tp }).then((r) => { setMode(r.data.reportPreferences?.defaultView || 'month'); setNotes(r.data.reportPreferences?.includeNotes ?? true); }).catch(() => {}); }, []);
  const load = useCallback(() => {
    if (mode === 'range' && (!from || !to)) { setData(null); return; }
    if (mode === 'range' && from > to) return toast.error('"From" date must be before "To" date');
    setData(null);
    api.get('/reports/monthly', { params: { ...(mode === 'range' ? { from, to } : { month, year }), ...tp } }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [mode, month, year, from, to, tp.userId]);
  useEffect(load, [load]);

  const label = mode === 'range' ? `${from} to ${to}` : `${MONTHS[month - 1]} ${year}`;
  const s = data?.summary;
  return (
    <>
      <PageHeader title="Monthly reports" sub={name ? `${name}: ${label}` : label}>
        <div className="flex gap-2">
          <button className="btn-ghost" disabled={!data?.records.length} onClick={() => { exportExcel(data.records, s, label, notes); toast.success('Excel downloaded'); }}><FileSpreadsheet className="h-4 w-4 text-emerald-600" />Excel</button>
          <button className="btn-ghost" disabled={!data?.records.length} onClick={() => { exportPdf(data.records, s, label, notes); toast.success('PDF downloaded'); }}><FileText className="h-4 w-4 text-rose-600" />PDF</button>
        </div>
      </PageHeader>
      <div className="card mb-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-slate-300 p-1 dark:border-slate-700">
          {[['month', 'Month'], ['range', 'Custom range']].map(([k, t]) => <button key={k} onClick={() => setMode(k)} className={`min-h-[36px] rounded-lg px-3 text-sm font-medium ${mode === k ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{t}</button>)}
        </div>
        {mode === 'month' ? <MonthYear month={month} year={year} onMonth={setMonth} onYear={setYear} /> : (<>
          <input type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <span className="text-slate-400">to</span>
          <input type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" /></>)}
      </div>
      {mode === 'range' && (!from || !to) ? <div className="card"><Empty title="Pick a date range" hint="Choose both From and To dates." /></div> : !data ? <PageLoader /> : (<div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard icon={CalendarCheck} label="Total working days" value={s.totalWorkingDays} />
          <StatCard icon={Clock} label="Total working hours" value={fmtMin(s.totalWorkingMinutes)} tone="blue" />
          <StatCard icon={Timer} label="Total overtime hours" value={fmtMin(s.totalOvertimeMinutes)} tone="amber" />
          <StatCard icon={Gauge} label="Average daily working hours" value={fmtMin(s.averageWorkingMinutes)} tone="emerald" />
          <StatCard icon={CalendarX} label="Absent working days" value={data.calendar.absentDays} sub={`of ${data.calendar.expectedWorkingDays} working days in range`} tone="violet" />
          <StatCard icon={Coffee} label="Total break hours" value={fmtMin(s.totalBreakMinutes)} tone="rose" />
        </div>
        <div className="card !p-0">
          <h3 className="p-4 pb-2 font-semibold">Date-wise details</h3>
          {!data.records.length ? <Empty title="No attendance in this period" /> : (<>
            <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-800/60"><tr>{['Date', 'In', 'Out', 'Break', 'Working', 'Overtime', ...(notes ? ['Notes'] : [])].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>{data.records.map((r) => <tr key={r._id} className="border-t border-slate-100 dark:border-slate-800"><td className="whitespace-nowrap px-4 py-3 font-medium">{fmtDate(r.date)}</td><td className="px-4 py-3">{to12(r.inTime)}</td><td className="px-4 py-3">{to12(r.outTime)}</td><td className="px-4 py-3">{r.breakMinutes}m</td><td className="px-4 py-3 font-semibold">{fmtMin(r.totalWorkingMinutes)}</td><td className="px-4 py-3 font-semibold text-amber-600">{fmtMin(r.overtimeMinutes)}</td>{notes && <td className="max-w-[220px] truncate px-4 py-3 text-slate-500">{r.notes}</td>}</tr>)}</tbody></table></div>
            <div className="divide-y divide-slate-100 px-4 pb-2 dark:divide-slate-800 md:hidden">{data.records.map((r) => (
              <div key={r._id} className="py-3 text-sm"><p className="font-semibold">{fmtDate(r.date)}</p><p className="text-slate-500">{to12(r.inTime)} to {to12(r.outTime)} · break {r.breakMinutes}m</p>
                <p>Working <b>{fmtMin(r.totalWorkingMinutes)}</b> · Overtime <b className="text-amber-600">{fmtMin(r.overtimeMinutes)}</b></p></div>))}</div></>)}
        </div></div>)}
    </>
  );
}
