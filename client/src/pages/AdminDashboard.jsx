import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Clock, Timer, CalendarCheck, UserPlus } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { Empty, MonthYear, PageHeader, PageLoader, StatCard } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { fmtDate, fmtMin, hrs, MONTHS, to12, todayStr } from '../utils/time';

const view = (u) => `/?userId=${u.id}&name=${encodeURIComponent(u.name)}`;
const Box = ({ title, children, className = '' }) => <div className={`card ${className}`}><h3 className="mb-3 font-semibold">{title}</h3>{children}</div>;

export default function AdminDashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [d, setD] = useState(null);
  const { dark } = useTheme();
  const load = useCallback(() => {
    setD(null);
    api.get('/admin/overview', { params: { month, year, today: todayStr() } }).then((r) => setD(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [month, year]);
  useEffect(load, [load]);
  const grid = dark ? '#334155' : '#e2e8f0';
  const tip = { contentStyle: { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.15)', background: dark ? '#0f172a' : '#fff', color: dark ? '#fff' : '#0f172a' } };
  const t = d?.totals;
  return (
    <>
      <PageHeader title="Admin dashboard" sub={`All staff, ${MONTHS[month - 1]} ${year}`}>
        <div className="flex gap-2"><MonthYear month={month} year={year} onMonth={setMonth} onYear={setYear} /></div>
      </PageHeader>
      {!d ? <PageLoader /> : !t.totalStaff ? (
        <div className="card"><Empty title="No staff accounts yet" hint="Create staff accounts so they can log their attendance." action={<Link to="/admin" className="btn-primary mt-2"><UserPlus className="h-4 w-4" />Add staff</Link>} /></div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard icon={Users} label="Total staff" value={t.totalStaff} sub={`${t.activeStaff} active`} />
            <StatCard icon={UserCheck} label="Present today" value={t.presentToday} tone="emerald" sub={fmtDate(d.today)} />
            <StatCard icon={UserX} label="Not logged today" value={t.notLoggedToday} tone="rose" />
            <StatCard icon={Clock} label="Staff working hours (month)" value={fmtMin(t.monthWorkingMinutes)} tone="blue" />
            <StatCard icon={Timer} label="Staff overtime (month)" value={fmtMin(t.monthOvertimeMinutes)} tone="amber" />
            <StatCard icon={CalendarCheck} label="Attendance entries (month)" value={t.monthEntries} tone="violet" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Box title="Today's attendance">
              {!d.presentList.length && !d.notLoggedList.length ? <Empty title="No active staff" /> : (<div className="space-y-2 text-sm">
                {d.presentList.map((p) => <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10"><span className="min-w-0 truncate font-medium">{p.name}</span><span className="shrink-0 text-slate-500">{p.open ? `In at ${to12(p.inTime)} · working now` : `${to12(p.inTime)} to ${to12(p.outTime)} · ${fmtMin(p.workingMinutes)}`}</span></div>)}
                {d.notLoggedList.map((p) => <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-2 dark:bg-rose-500/10"><span className="truncate font-medium">{p.name}</span><span className="text-rose-600">Not logged yet</span></div>)}
              </div>)}
            </Box>
            <Box title="Recent entries">
              {!d.recent.length ? <Empty title="No entries yet" /> : <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">{d.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2"><div className="min-w-0"><p className="truncate font-medium">{r.name}</p><p className="text-xs text-slate-500">{fmtDate(r.date)}</p></div>
                  <div className="shrink-0 text-right"><p className="font-semibold">{fmtMin(r.workingMinutes)}</p><p className="text-xs text-amber-600">OT {fmtMin(r.overtimeMinutes)}</p></div></li>))}</ul>}
            </Box>
          </div>

          <Box title={`Staff summary, ${MONTHS[month - 1]} ${year}`} className="!p-0 sm:!p-0">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">{d.staff.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{s.name} {!s.isActive && <span className="text-xs font-normal text-rose-600">(disabled)</span>}</p><p className="truncate text-xs text-slate-500">{s.email}</p></div>
                <div className="grid grid-cols-4 gap-3 text-center text-sm sm:w-[420px]">
                  <div><p className="text-xs text-slate-500">Days</p><b>{s.days}</b></div><div><p className="text-xs text-slate-500">Working</p><b>{fmtMin(s.workingMinutes)}</b></div>
                  <div><p className="text-xs text-slate-500">Overtime</p><b className="text-amber-600">{fmtMin(s.overtimeMinutes)}</b></div><div><p className="text-xs text-slate-500">Avg/day</p><b>{fmtMin(s.avgMinutes)}</b></div></div>
                <Link to={view(s)} className="btn-ghost !min-h-[40px] justify-center">Open</Link>
              </li>))}</ul>
          </Box>

          <div className="grid gap-5 lg:grid-cols-2">
            <Box title="Working and overtime hours by staff">
              <div className="h-64"><ResponsiveContainer><BarChart data={d.staff.map((s) => ({ name: s.name.split(' ')[0], Working: hrs(s.workingMinutes), Overtime: hrs(s.overtimeMinutes) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} width={36} /><Tooltip {...tip} formatter={(v) => fmtMin(Math.round(v * 60))} /><Legend />
                <Bar dataKey="Working" fill="#4f46e5" radius={[6, 6, 0, 0]} /><Bar dataKey="Overtime" fill="#f59e0b" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </Box>
            <Box title={`All staff, monthly hours, ${year}`}>
              <div className="h-64"><ResponsiveContainer><BarChart data={d.monthly.map((m) => ({ name: MONTHS[m.month - 1].slice(0, 3), Working: hrs(m.workingMinutes), Overtime: hrs(m.overtimeMinutes) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} width={40} /><Tooltip {...tip} formatter={(v) => fmtMin(Math.round(v * 60))} /><Legend />
                <Bar dataKey="Working" fill="#2563eb" radius={[6, 6, 0, 0]} /><Bar dataKey="Overtime" fill="#f59e0b" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </Box>
          </div>
        </div>
      )}
    </>
  );
}
