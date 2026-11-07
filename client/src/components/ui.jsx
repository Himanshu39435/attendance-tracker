import { Loader2, Inbox, AlertTriangle } from 'lucide-react';
export const Spinner = ({ className = '' }) => <Loader2 className={`h-6 w-6 animate-spin text-indigo-600 ${className}`} />;
export const Avatar = ({ user, size = 'h-10 w-10' }) => user?.avatar
  ? <img src={user.avatar} alt={user.name} className={`${size} shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-800`} />
  : <span className={`${size} grid shrink-0 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300`}>{user?.name?.[0]?.toUpperCase()}</span>;
export const PageLoader = () => <div className="grid h-60 place-items-center"><Spinner className="h-8 w-8" /></div>;
export const Empty = ({ title, hint, action }) => (
  <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
    <Inbox className="h-10 w-10 text-slate-300 dark:text-slate-600" />
    <p className="font-semibold">{title}</p>{hint && <p className="max-w-xs text-sm text-slate-500">{hint}</p>}{action}
  </div>
);
export const PageHeader = ({ title, sub, children }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-xl font-bold sm:text-2xl">{title}</h1>{sub && <p className="text-sm text-slate-500">{sub}</p>}</div>{children}
  </div>
);
export function StatCard({ icon: Icon, label, value, sub, tone = 'indigo' }) {
  const tones = { indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15', blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15', amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15', emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15', rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15', violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15' };
  return (
    <div className="card flex items-center gap-3 sm:gap-4">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0"><p className="truncate text-xs text-slate-500 sm:text-sm">{label}</p><p className="truncate text-lg font-bold sm:text-xl">{value}</p>{sub && <p className="truncate text-xs text-slate-400">{sub}</p>}</div>
    </div>
  );
}
export function ConfirmDialog({ open, title, message, onCancel, onConfirm, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={onCancel}>
      <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15"><AlertTriangle className="h-5 w-5" /></div>
        <h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-sm text-slate-500">{message}</p>
        <div className="mt-5 flex gap-3"><button className="btn-ghost flex-1" onClick={onCancel}>Cancel</button>
          <button className="btn-danger flex-1" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button></div>
      </div>
    </div>
  );
}
export const MonthYear = ({ month, year, onMonth, onYear, all }) => {
  const y = new Date().getFullYear();
  return (<>
    <select className="input !w-auto" value={month} onChange={(e) => onMonth(e.target.value)} aria-label="Month">
      {all && <option value="">All months</option>}
      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
    </select>
    <select className="input !w-auto" value={year} onChange={(e) => onYear(e.target.value)} aria-label="Year">
      {Array.from({ length: 8 }, (_, i) => y + 1 - i).map((v) => <option key={v}>{v}</option>)}
    </select>
  </>);
};
