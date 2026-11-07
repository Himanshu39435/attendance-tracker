export const fmtMin = (m = 0) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
export const to12 = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
export const hrs = (m) => +(m / 60).toFixed(2);
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const fmtDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' }); };
// Same rules as the server, used only for the live preview in the form
export function previewCalc({ inTime, outTime, breakMinutes, overtimeStartTime }) {
  if (!inTime || !outTime) return null;
  const t = (x) => { const [h, m] = x.split(':').map(Number); return h * 60 + m; };
  const i = t(inTime); let o = t(outTime); if (o <= i) o += 1440;
  return { total: Math.max(0, o - i - (Number(breakMinutes) || 0)), ot: Math.max(0, o - Math.max(i, t(overtimeStartTime || '19:30'))), overnight: o > 1440 };
}
