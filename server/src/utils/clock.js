// Server-authoritative time in the office timezone (staff cannot cheat by changing their phone clock).
const tz = () => process.env.TIMEZONE || 'Asia/Kolkata';
function nowParts(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const g = (t) => p.find((x) => x.type === t).value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${g('hour')}:${g('minute')}` };
}
module.exports = { nowParts, tz };

// Converts an office-local date + "HH:mm" into the exact Date (used for admin-entered check-ins)
function toDate(date, time) {
  const [y, m, d] = date.split('-').map(Number); const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const p = nowParts(new Date(guess)); const [py, pm, pd] = p.date.split('-').map(Number); const [ph, pmi] = p.time.split(':').map(Number);
  return new Date(guess - (Date.UTC(py, pm - 1, pd, ph, pmi) - guess));
}
module.exports.toDate = toDate;
