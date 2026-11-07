import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Search, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useTarget } from '../hooks/useTarget';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog, Empty, MonthYear, PageHeader, PageLoader } from '../components/ui';
import { fmtDate, fmtMin, to12 } from '../utils/time';

export default function History() {
  const now = new Date();
  const { params: tp, q, name } = useTarget();
  const isAdmin = useAuth().user.role === 'admin';
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    const params = search ? { search } : { year, ...(month && { month }) };
    api.get('/attendance', { params: { ...params, ...tp } }).then((r) => setRows(r.data)).catch((e) => { toast.error(errMsg(e)); setRows([]); });
  }, [month, year, search, tp.userId]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/attendance/${del._id}`, { params: tp }); toast.success('Attendance deleted'); setDel(null); load(); } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  };
  const Actions = ({ r }) => !isAdmin ? null : (<div className="flex gap-2">
    <Link to={`/edit/${r._id}${q}`} className="btn-ghost !min-h-[40px] !px-3" aria-label="Edit"><Pencil className="h-4 w-4" /></Link>
    <button className="btn-ghost !min-h-[40px] !px-3 !text-rose-600" onClick={() => setDel(r)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button></div>);

  return (
    <>
      <PageHeader title="Attendance history" sub={name ? `Records of ${name}` : 'Search by date, or filter by month and year.'}>
        <Link to={`/add${q}`} className="btn-primary"><PlusCircle className="h-4 w-4" />Add attendance</Link>
      </PageHeader>
      <div className="card mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input className="input !pl-9" type="date" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search by date" /></div>
        <MonthYear all month={month} year={year} onMonth={(v) => { setSearch(''); setMonth(v); }} onYear={(v) => { setSearch(''); setYear(v); }} />
        {search && <button className="btn-ghost" onClick={() => setSearch('')}>Clear date</button>}
      </div>
      {!rows ? <PageLoader /> : !rows.length ? <div className="card"><Empty title="No records found" hint="Try another month or date, or add a new entry." /></div> : (<>
        <div className="card hidden overflow-x-auto !p-0 md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-800/60"><tr>{['Date', 'In', 'Out', 'Break', 'Working', 'Overtime', 'Notes', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r._id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="whitespace-nowrap px-4 py-3 font-medium">{fmtDate(r.date)}</td><td className="px-4 py-3">{to12(r.inTime)}</td><td className="px-4 py-3">{r.status === 'open' ? 'working…' : to12(r.outTime)}</td>
                <td className="px-4 py-3">{r.breakMinutes}m</td><td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-300">{r.status === 'open' ? '-' : fmtMin(r.totalWorkingMinutes)}</td>
                <td className="px-4 py-3 font-semibold text-amber-600">{r.status === 'open' ? '-' : fmtMin(r.overtimeMinutes)}</td><td className="max-w-[200px] truncate px-4 py-3 text-slate-500">{r.notes}</td>
                <td className="px-4 py-3"><Actions r={r} /></td></tr>))}</tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">{rows.map((r) => (
          <div key={r._id} className="card">
            <div className="mb-2 flex items-start justify-between gap-2"><div><p className="font-semibold">{fmtDate(r.date)}</p><p className="text-sm text-slate-500">{to12(r.inTime)} to {r.status === 'open' ? 'working…' : to12(r.outTime)} · break {r.breakMinutes}m</p></div><Actions r={r} /></div>
            <div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-500/10"><span className="block text-xs text-slate-500">Working</span><b>{r.status === 'open' ? '-' : fmtMin(r.totalWorkingMinutes)}</b></div>
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-500/10"><span className="block text-xs text-slate-500">Overtime</span><b>{r.status === 'open' ? '-' : fmtMin(r.overtimeMinutes)}</b></div></div>
            {r.notes && <p className="mt-2 text-sm text-slate-500">{r.notes}</p>}
          </div>))}</div>
      </>)}
      <ConfirmDialog open={!!del} busy={busy} title="Delete this attendance?" message={del ? `The record for ${fmtDate(del.date)} will be permanently removed.` : ''} onCancel={() => setDel(null)} onConfirm={remove} />
    </>
  );
}
