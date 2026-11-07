const router = require('express').Router();
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const target = require('../middleware/target');
const { adminOnly } = target;
const { asyncH, httpError } = require('../middleware/error');
router.use(auth, target);

const sum = (rows) => {
  const total = rows.reduce((a, r) => a + r.totalWorkingMinutes, 0);
  return {
    totalWorkingDays: rows.length, totalWorkingMinutes: total,
    totalOvertimeMinutes: rows.reduce((a, r) => a + r.overtimeMinutes, 0),
    totalBreakMinutes: rows.reduce((a, r) => a + r.breakMinutes, 0),
    averageWorkingMinutes: rows.length ? Math.round(total / rows.length) : 0,
  };
};
const pad = (n) => String(n).padStart(2, '0');

// Working-day calendar: expected = days in range matching the user's working days (up to today); absent = expected - attended on those days.
async function calendar(userId, from, to) {
  const wd = (await Settings.findOne({ userId }))?.workingDays || [1, 2, 3, 4, 5, 6];
  const now = new Date(); const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  let expectedWorkingDays = 0, elapsedWorkingDays = 0;
  const dates = new Set();
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    if (wd.includes(d.getUTCDay())) { expectedWorkingDays++; if (key <= today) { elapsedWorkingDays++; dates.add(key); } }
  }
  const attended = await Attendance.countDocuments({ userId, date: { $in: [...dates] } });
  return { expectedWorkingDays, elapsedWorkingDays, absentDays: Math.max(0, elapsedWorkingDays - attended) };
}

// GET /api/reports/monthly?month=3&year=2025  OR  ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/monthly', asyncH(async (req, res) => {
  let { month, year, from, to } = req.query;
  if (!from || !to) {
    month = Number(month); year = Number(year);
    if (!(month >= 1 && month <= 12) || !year) throw httpError(400, 'Provide month (1-12) and year, or from/to dates');
    from = `${year}-${pad(month)}-01`; to = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;
  }
  const records = await Attendance.find({ userId: req.targetId, status: { $ne: 'open' }, date: { $gte: from, $lte: to } }).sort({ date: 1 });
  res.json({ from, to, summary: sum(records), calendar: await calendar(req.targetId, from, to), records });
}));

// GET /api/reports/summary?month=&year=  -> dashboard data
router.get('/summary', asyncH(async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();
  const yearRows = await Attendance.find({ userId: req.targetId, status: { $ne: 'open' }, date: { $regex: `^${year}-` } }).sort({ date: 1 });
  const monthRows = yearRows.filter((r) => r.date.startsWith(`${year}-${pad(month)}-`));
  const daily = monthRows.map((r) => ({ date: r.date, day: Number(r.date.slice(8)), workingMinutes: r.totalWorkingMinutes, overtimeMinutes: r.overtimeMinutes }));
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const rows = yearRows.filter((r) => r.date.startsWith(`${year}-${pad(i + 1)}-`));
    const s = sum(rows);
    return { month: i + 1, workingMinutes: s.totalWorkingMinutes, overtimeMinutes: s.totalOvertimeMinutes, days: rows.length };
  });
  const last = new Date(year, month, 0).getDate();
  const cal = await calendar(req.targetId, `${year}-${pad(month)}-01`, `${year}-${pad(month)}-${pad(last)}`);
  res.json({ month, year, summary: sum(monthRows), calendar: cal, daily, monthly });
}));
module.exports = router;
