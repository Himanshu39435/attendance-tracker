import { Clock } from 'lucide-react';
export default function AuthShell({ title, sub, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><Clock /></div><span className="text-lg font-extrabold">Himanshu Office Time Tracker</span></div>
        <div><p className="text-4xl font-extrabold leading-tight">Every hour you work,<br />counted correctly.</p><p className="mt-4 max-w-md text-indigo-100">Log in and out times, handle overnight shifts, and see overtime after 7:30 PM calculated for you.</p></div>
        <p className="text-sm text-indigo-200">Your records are stored securely in MongoDB.</p>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md"><div className="mb-6 flex items-center gap-2 lg:hidden"><div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white"><Clock className="h-5 w-5" /></div><b>Himanshu Office Time Tracker</b></div>
          <h1 className="text-2xl font-bold">{title}</h1><p className="mb-6 mt-1 text-sm text-slate-500">{sub}</p>{children}<p className="mt-6 text-center text-sm text-slate-500">{footer}</p></div>
      </div>
    </div>
  );
}
