import { useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, History, FileBarChart, Settings, User, ShieldCheck, Users, LogOut, Menu, X, Moon, Sun, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { Avatar } from './ui';
import { useTarget } from '../hooks/useTarget';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/add', label: 'Today: Punch In/Out', icon: PlusCircle },
  { to: '/history', label: 'Attendance History', icon: History },
  { to: '/reports', label: 'Monthly Reports', icon: FileBarChart },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: User },
];
export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const loc = useLocation();
  const { q, userId, name } = useTarget();
  const items = user.role === 'admin'
    ? [{ to: '/', label: 'Admin Dashboard', icon: LayoutDashboard, end: true }, { to: '/admin', label: 'Staff Management', icon: Users }, { to: '/settings', label: 'Default Settings', icon: Settings }, { to: '/profile', label: 'Profile', icon: User }]
    : links.filter((l) => l.to !== '/settings'); // staff: own pages only
  const title = items.find((l) => (l.end ? loc.pathname === l.to : loc.pathname.startsWith(l.to)))?.label || 'Himanshu Office Time Tracker';
  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${isActive && !userId ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
          <Icon className="h-5 w-5" />{label}
        </NavLink>
      ))}
      <button onClick={logout} className="mt-auto flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><LogOut className="h-5 w-5" />Logout</button>
    </nav>
  );
  const brand = (<div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5 dark:border-slate-800">
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white"><Clock className="h-5 w-5" /></div>
    <span className="text-sm font-extrabold leading-tight">Himanshu Office<br />Time Tracker</span></div>);
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">{brand}{nav}</aside>
      {open && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform dark:bg-slate-900 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between pr-3">{brand}<button className="btn-ghost !min-h-[40px] !px-2" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></div>{nav}
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
          <button className="btn-ghost !min-h-[40px] !px-2.5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <h2 className="truncate font-bold">{title}</h2>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn-ghost !min-h-[40px] !px-2.5" onClick={toggle} aria-label="Toggle theme">{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            <NavLink to="/profile" className="flex items-center gap-2"><Avatar user={user} />
              <span className="hidden text-sm font-semibold sm:block">{user.name}</span></NavLink>
          </div>
        </header>
        {userId && <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-indigo-600 px-4 py-2 text-center text-sm text-white">Admin view: you are managing {name || 'a staff member'}.<Link to="/admin" className="font-semibold underline">Back to Staff Management</Link></div>}
        {userId && <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">{[['/', 'Dashboard'], ['/history', 'Records'], ['/reports', 'Reports'], ['/add', 'Add entry'], ['/settings', 'Settings']].map(([to, l]) => <NavLink key={to} to={`${to}${q}`} end={to === '/'} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{l}</NavLink>)}</div>}
        {!user.isVerified && <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Your email is not verified.
          <button className="font-semibold underline" onClick={() => api.post('/auth/resend-verification', { email: user.email }).then(() => toast.success('Verification email sent')).catch((e) => toast.error(errMsg(e)))}>Resend verification email</button></div>}
        <main className="mx-auto max-w-7xl p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
