import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Clock, Timer, Gauge, CalendarDays, Coffee, PlusCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { StatCard, PageHeader, PageLoader, MonthYear, Empty } from '../components/ui';
import { fmtMin, hrs, MONTHS } from '../utils/time';
import { useTarget } from '../hooks/useTarget';
import { useAuth } from '../context/AuthContext';
import PunchCard from '../components/PunchCard';
import { useTheme } from '../context/ThemeContext';

const Chart = ({ title, children, empty }) => (
  <div className="card"><h3 className="mb-3 font-semibold">{title}</h3>
    {empty ? <Empty title="No data for this period" hint="Add attendance to see this chart." /> : <div className="h-64 w-full">{children}</div>}</div>
);
export default function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [d, setD] = useState(null);
  const { dark } = useTheme();
  const { user } = useAuth();
  const { params: tp, q } = useTarget();
  const load = useCallback(() => {
    setD(null);
    api.get('/reports/summary', { params: { month, year, ...tp } }).then((r) => setD(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [month, year, tp.userId]);
  useEffect(load, [load]);
  const grid = dark ? '#334155' : '#e2e8f0';
  const tip = { contentStyle: { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.15)', background: dark ? '#0f172a' : '#fff', color: dark ? '#fff' : '#0f172a' } };
  const s = d?.summary;
  return (
    <>
      <PageHeader title="Dashboard" sub={`${MONTHS[month - 1]} ${year}`}>
        <div className="flex gap-2"><MonthYear month={month} year={year} onMonth={setMonth} onYear={setYear} /></div>
      </PageHeader>
      {!tp.userId && user.role === 'user' && <div className="mb-5"><PunchCard onChange={load} /></div>}
      {!d ? <PageLoader /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard icon={CalendarCheck} label="Total working days" value={s.totalWorkingDays} tone="indigo" />
            <StatCard icon={Clock} label="Total working hours" value={fmtMin(s.totalWorkingMinutes)} tone="blue" />
            <StatCard icon={Timer} label="Total overtime hours" value={fmtMin(s.totalOvertimeMinutes)} tone="amber" />
            <StatCard icon={Gauge} label="Average daily working hours" value={fmtMin(s.averageWorkingMinutes)} tone="emerald" />
            <StatCard icon={CalendarDays} label="Monthly attendance" value={`${s.totalWorkingDays} / ${d.calendar.expectedWorkingDays} days`} sub={`${d.calendar.absentDays} absent so far in ${MONTHS[month - 1]}`} tone="violet" />
            <StatCard icon={Coffee} label="Total break hours" value={fmtMin(s.totalBreakMinutes)} tone="rose" />
          </div>
          {s.totalWorkingDays === 0 && <div className="card"><Empty title="No attendance this month" hint="Add your first entry to see statistics here." action={<Link to={`/add${q}`} className="btn-primary mt-2"><PlusCircle className="h-4 w-4" />Add attendance</Link>} /></div>}
          <div className="grid gap-5 lg:grid-cols-2">
            <Chart title="Daily working hours" empty={!d.daily.length}>
              <ResponsiveContainer><BarChart data={d.daily.map((x) => ({ day: x.day, Hours: hrs(x.workingMinutes) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} /><XAxis dataKey="day" fontSize={12} /><YAxis fontSize={12} width={30} />
                <Tooltip {...tip} formatter={(v) => fmtMin(Math.round(v * 60))} labelFormatter={(l) => `Day ${l}`} /><Bar dataKey="Hours" fill="#4f46e5" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
            </Chart>
            <Chart title="Daily overtime" empty={!d.daily.length}>
              <ResponsiveContainer><LineChart data={d.daily.map((x) => ({ day: x.day, Overtime: hrs(x.overtimeMinutes) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} /><XAxis dataKey="day" fontSize={12} /><YAxis fontSize={12} width={30} />
                <Tooltip {...tip} formatter={(v) => fmtMin(Math.round(v * 60))} labelFormatter={(l) => `Day ${l}`} /><Line type="monotone" dataKey="Overtime" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
            </Chart>
          </div>
          <Chart title={`Monthly working hours comparison, ${year}`} empty={!d.monthly.some((m) => m.workingMinutes)}>
            <ResponsiveContainer><BarChart data={d.monthly.map((m) => ({ name: MONTHS[m.month - 1].slice(0, 3), Working: hrs(m.workingMinutes), Overtime: hrs(m.overtimeMinutes) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} width={36} />
              <Tooltip {...tip} formatter={(v) => fmtMin(Math.round(v * 60))} /><Legend /><Bar dataKey="Working" fill="#2563eb" radius={[6, 6, 0, 0]} /><Bar dataKey="Overtime" fill="#f59e0b" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </Chart>
        </div>
      )}
    </>
  );
}
