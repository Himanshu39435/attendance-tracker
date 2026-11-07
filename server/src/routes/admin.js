const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const { asyncH, httpError } = require('../middleware/error');
router.use(auth, (req, res, next) => (req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admin access required' })));
const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const self = (req) => String(req.params.id) === String(req.user._id);

router.get('/stats', asyncH(async (req, res) => {
  const now = new Date(); const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`;
  const [totalUsers, activeUsers, totalRecords, recordsThisMonth] = await Promise.all([
    User.countDocuments(), User.countDocuments({ isActive: true }), Attendance.countDocuments(), Attendance.countDocuments({ date: { $regex: `^${prefix}` } }),
  ]);
  res.json({ totalUsers, activeUsers, totalRecords, recordsThisMonth });
}));

// Admin dashboard: company-wide overview of all staff (admins' own accounts are excluded)
router.get('/overview', asyncH(async (req, res) => {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();
  const today = /^\d{4}-\d{2}-\d{2}$/.test(req.query.today || '') ? req.query.today : `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const staff = await User.find({ role: 'user' }).sort({ name: 1 });
  const ids = staff.map((u) => u._id);
  const name = Object.fromEntries(staff.map((u) => [String(u._id), u.name]));
  const [yearRows, todayRows, recent] = await Promise.all([
    Attendance.find({ userId: { $in: ids }, status: { $ne: 'open' }, date: { $regex: `^${year}-` } }).lean(),
    Attendance.find({ userId: { $in: ids }, date: today }).lean(),
    Attendance.find({ userId: { $in: ids }, status: { $ne: 'open' } }).sort({ createdAt: -1 }).limit(8).lean(),
  ]);
  const prefix = `${year}-${pad(month)}-`;
  const monthRows = yearRows.filter((r) => r.date.startsWith(prefix));
  const byUser = {};
  monthRows.forEach((r) => { (byUser[String(r.userId)] ||= []).push(r); });
  const staffStats = staff.map((u) => {
    const rows = byUser[String(u._id)] || [];
    const w = rows.reduce((a, r) => a + r.totalWorkingMinutes, 0);
    return { id: u._id, name: u.name, email: u.email, isActive: u.isActive, days: rows.length, workingMinutes: w, overtimeMinutes: rows.reduce((a, r) => a + r.overtimeMinutes, 0), avgMinutes: rows.length ? Math.round(w / rows.length) : 0 };
  });
  const loggedToday = new Set(todayRows.map((r) => String(r.userId)));
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const rows = yearRows.filter((r) => r.date.startsWith(`${year}-${pad(i + 1)}-`));
    return { month: i + 1, workingMinutes: rows.reduce((a, r) => a + r.totalWorkingMinutes, 0), overtimeMinutes: rows.reduce((a, r) => a + r.overtimeMinutes, 0) };
  });
  const active = staff.filter((u) => u.isActive);
  res.json({
    month, year, today,
    totals: {
      totalStaff: staff.length, activeStaff: active.length, presentToday: todayRows.length,
      notLoggedToday: active.filter((u) => !loggedToday.has(String(u._id))).length,
      monthEntries: monthRows.length, monthWorkingMinutes: staffStats.reduce((a, s) => a + s.workingMinutes, 0), monthOvertimeMinutes: staffStats.reduce((a, s) => a + s.overtimeMinutes, 0),
    },
    staff: staffStats, monthly,
    presentList: todayRows.map((r) => ({ id: r.userId, open: r.status === 'open', name: name[String(r.userId)], inTime: r.inTime, outTime: r.outTime, workingMinutes: r.totalWorkingMinutes, overtimeMinutes: r.overtimeMinutes })),
    notLoggedList: active.filter((u) => !loggedToday.has(String(u._id))).map((u) => ({ id: u._id, name: u.name })),
    recent: recent.map((r) => ({ id: r._id, userId: r.userId, name: name[String(r.userId)], date: r.date, inTime: r.inTime, outTime: r.outTime, workingMinutes: r.totalWorkingMinutes, overtimeMinutes: r.overtimeMinutes })),
  });
}));

router.get('/users', asyncH(async (req, res) => {
  const [users, counts] = await Promise.all([User.find().select('+avatar').sort({ createdAt: -1 }), Attendance.aggregate([{ $group: { _id: '$userId', n: { $sum: 1 }, last: { $max: '$date' } } }])]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  res.json(users.map((u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, avatar: u.avatar || '', isActive: u.isActive, createdAt: u.createdAt, records: map[String(u._id)]?.n || 0, lastEntry: map[String(u._id)]?.last || null })));
}));

// Admin creates staff accounts (staff cannot self-register)
router.post('/users', asyncH(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name?.trim()) throw httpError(400, 'Name is required');
  if (!emailRx.test(email || '')) throw httpError(400, 'Enter a valid email');
  if (!password || password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (await User.findOne({ email: email.toLowerCase() })) throw httpError(409, 'A user with this email already exists');
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 12), role: role === 'admin' ? 'admin' : 'user', isVerified: true });
  const base = await Settings.findOne({ userId: req.user._id }); // new staff inherit the admin's current defaults
  await Settings.create({ userId: u._id, ...(base && { officeStartTime: base.officeStartTime, overtimeStartTime: base.overtimeStartTime, defaultBreakMinutes: base.defaultBreakMinutes, workingDays: base.workingDays }) });
  res.status(201).json({ id: u._id, name: u.name, email: u.email, role: u.role });
}));

// Edit name, role, active status, or reset password
router.patch('/users/:id', asyncH(async (req, res) => {
  const upd = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) upd.name = req.body.name.trim();
  if (req.body.password !== undefined) {
    if (String(req.body.password).length < 6) throw httpError(400, 'Password must be at least 6 characters');
    upd.password = await bcrypt.hash(req.body.password, 12);
  }
  if (!self(req)) { // admins cannot lock themselves out
    if (typeof req.body.isActive === 'boolean') upd.isActive = req.body.isActive;
    if (['user', 'admin'].includes(req.body.role)) upd.role = req.body.role;
  } else if (req.body.isActive !== undefined || req.body.role !== undefined) throw httpError(400, 'You cannot change your own role or status.');
  if (!Object.keys(upd).length) throw httpError(400, 'Nothing to update');
  const u = await User.findByIdAndUpdate(req.params.id, upd, { new: true });
  if (!u) throw httpError(404, 'User not found');
  res.json({ id: u._id, role: u.role, isActive: u.isActive });
}));

router.delete('/users/:id', asyncH(async (req, res) => {
  if (self(req)) throw httpError(400, 'You cannot delete your own account.');
  const u = await User.findByIdAndDelete(req.params.id);
  if (!u) throw httpError(404, 'User not found');
  await Promise.all([Attendance.deleteMany({ userId: u._id }), Settings.deleteMany({ userId: u._id })]);
  res.json({ message: 'User and all their data deleted' });
}));
module.exports = router;
