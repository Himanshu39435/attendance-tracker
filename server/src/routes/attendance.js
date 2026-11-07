const router = require('express').Router();
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const target = require('../middleware/target');
const { adminOnly } = target;
const { calculate, isTime } = require('../utils/calc');
const { nowParts, tz, toDate } = require('../utils/clock');
const { asyncH, httpError } = require('../middleware/error');
router.use(auth, target);

const dateRx = /^\d{4}-\d{2}-\d{2}$/;
function validate(b) {
  if (!dateRx.test(b.date || '') || isNaN(new Date(b.date))) throw httpError(400, 'Enter a valid date');
  if (!isTime(b.inTime)) throw httpError(400, 'Enter a valid in-time');
  if (b.outTime && !isTime(b.outTime)) throw httpError(400, 'Enter a valid out-time'); // out-time can be added later
  const br = Number(b.breakMinutes ?? 0);
  if (!Number.isInteger(br) || br < 0 || br > 600) throw httpError(400, 'Break must be 0-600 minutes');
  if (String(b.notes || '').length > 500) throw httpError(400, 'Notes can be up to 500 characters');
  return br;
}
const otStart = async (userId) => (await Settings.findOne({ userId }))?.overtimeStartTime || '19:30';

const allowanceOf = (s) => s?.defaultBreakMinutes ?? 30;
const openOf = (uid) => Attendance.findOne({ userId: uid, status: 'open' });
const minsSince = (d) => Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));

// ---- Staff punch flow (always the logged-in user, server clock) ----
router.get('/today', asyncH(async (req, res) => {
  const uid = req.user._id; const { date } = nowParts();
  const record = (await openOf(uid)) || (await Attendance.findOne({ userId: uid, date }));
  const s = await Settings.findOne({ userId: uid });
  res.json({ date, serverNow: new Date().toISOString(), timezone: tz(), record, settings: { lunchAllowance: allowanceOf(s), overtimeStartTime: s?.overtimeStartTime || '19:30' } });
}));

router.post('/punch-in', asyncH(async (req, res) => {
  const uid = req.user._id; const { date, time } = nowParts();
  const open = await openOf(uid);
  if (open) throw httpError(409, open.date === date ? 'You are already checked in today.' : `You still have an open check-in from ${open.date}. Ask your admin to correct it.`);
  if (await Attendance.exists({ userId: uid, date })) throw httpError(409, "Today's attendance is already completed.");
  res.status(201).json(await Attendance.create({ userId: uid, date, inTime: time, status: 'open', inAt: new Date() }));
}));

router.post('/lunch-start', asyncH(async (req, res) => {
  const rec = await openOf(req.user._id);
  if (!rec) throw httpError(409, 'Check in first.');
  if (rec.lunchStart) throw httpError(409, 'Lunch is already running.');
  rec.lunchStart = new Date(); await rec.save(); res.json(rec);
}));

router.post('/lunch-end', asyncH(async (req, res) => {
  const rec = await openOf(req.user._id);
  if (!rec) throw httpError(409, 'Check in first.');
  if (!rec.lunchStart) throw httpError(409, 'Lunch has not been started.');
  rec.lunchMinutes += minsSince(rec.lunchStart); rec.lunchStart = null; await rec.save(); res.json(rec);
}));

router.post('/punch-out', asyncH(async (req, res) => {
  const uid = req.user._id;
  const rec = await openOf(uid);
  if (!rec) throw httpError(409, 'You have not checked in.');
  const elapsed = minsSince(rec.inAt);
  if (elapsed < 1) throw httpError(409, 'Please wait a minute before checking out.');
  if (elapsed >= 1440) throw httpError(409, 'This check-in is older than 24 hours. Ask your admin to correct it.');
  if (rec.lunchStart) { rec.lunchMinutes += minsSince(rec.lunchStart); rec.lunchStart = null; }
  const s = await Settings.findOne({ userId: uid });
  const allowance = allowanceOf(s);
  let lunch;
  if (req.body.lunchMinutes !== undefined && req.body.lunchMinutes !== '') {
    lunch = Number(req.body.lunchMinutes);
    if (!Number.isInteger(lunch) || lunch < 0 || lunch > 600) throw httpError(400, 'Lunch must be 0-600 minutes');
  } else lunch = rec.lunchMinutes > 0 ? rec.lunchMinutes : allowance;
  lunch = Math.min(lunch, elapsed);
  const { time } = nowParts();
  const c = calculate({ inTime: rec.inTime, outTime: time, breakMinutes: lunch, overtimeStartTime: s?.overtimeStartTime || '19:30' });
  Object.assign(rec, { outTime: time, breakMinutes: lunch, lunchMinutes: lunch, totalWorkingMinutes: c.totalWorkingMinutes, overtimeMinutes: c.overtimeMinutes, status: 'complete' });
  await rec.save();
  res.json({ record: rec, lunchAllowance: allowance, bonusMinutes: Math.max(0, allowance - lunch), extraLunchMinutes: Math.max(0, lunch - allowance) });
}));

// GET /api/attendance?search=2025-03-05&month=3&year=2025&from=&to=
router.get('/', asyncH(async (req, res) => {
  const { search, month, year, from, to } = req.query;
  const q = { userId: req.targetId };
  if (search) q.date = { $regex: `^${String(search).replace(/[^0-9-]/g, '')}` };
  else if (from || to) q.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  else if (year) {
    const y = String(Number(year));
    q.date = month ? { $regex: `^${y}-${String(Number(month)).padStart(2, '0')}-` } : { $regex: `^${y}-` };
  }
  res.json(await Attendance.find(q).sort({ date: -1 }));
}));

router.post('/', asyncH(async (req, res) => {
  const br = validate(req.body);
  if (req.user.role !== 'admin') throw httpError(403, 'Use the Punch In / Punch Out buttons on your dashboard.');
  const open = !req.body.outTime; // only in-time given: record stays "in progress" until out-time is added
  const c = open ? { totalWorkingMinutes: 0, overtimeMinutes: 0 } : calculate({ ...req.body, breakMinutes: br, overtimeStartTime: await otStart(req.targetId) });
  if (await Attendance.exists({ userId: req.targetId, date: req.body.date })) throw httpError(409, 'Attendance for this date already exists. Edit it instead.');
  if (open && (await openOf(req.targetId))) throw httpError(409, 'This staff member already has an in-progress check-in. Complete it first.');
  const doc = await Attendance.create({
    userId: req.targetId, date: req.body.date, inTime: req.body.inTime, outTime: req.body.outTime || '',
    breakMinutes: br, totalWorkingMinutes: c.totalWorkingMinutes, overtimeMinutes: c.overtimeMinutes, notes: req.body.notes || '',
    status: open ? 'open' : 'complete', inAt: toDate(req.body.date, req.body.inTime), lunchMinutes: br,
  });
  res.status(201).json(doc);
}));

router.put('/:id', adminOnly, asyncH(async (req, res) => {
  const br = validate(req.body);
  const open = !req.body.outTime;
  const c = open ? { totalWorkingMinutes: 0, overtimeMinutes: 0 } : calculate({ ...req.body, breakMinutes: br, overtimeStartTime: await otStart(req.targetId) });
  if (open && (await Attendance.exists({ userId: req.targetId, status: 'open', _id: { $ne: req.params.id } }))) throw httpError(409, 'This staff member already has another in-progress check-in.');
  if (await Attendance.exists({ userId: req.targetId, date: req.body.date, _id: { $ne: req.params.id } })) throw httpError(409, 'Another record already exists for this date.');
  const doc = await Attendance.findOneAndUpdate(
    { _id: req.params.id, userId: req.targetId },
    { date: req.body.date, inTime: req.body.inTime, outTime: req.body.outTime || '', breakMinutes: br, inAt: toDate(req.body.date, req.body.inTime),
      totalWorkingMinutes: c.totalWorkingMinutes, overtimeMinutes: c.overtimeMinutes, notes: req.body.notes || '', status: open ? 'open' : 'complete', lunchStart: null, lunchMinutes: br },
    { new: true, runValidators: true });
  if (!doc) throw httpError(404, 'Record not found');
  res.json(doc);
}));

router.delete('/:id', adminOnly, asyncH(async (req, res) => {
  const doc = await Attendance.findOneAndDelete({ _id: req.params.id, userId: req.targetId });
  if (!doc) throw httpError(404, 'Record not found');
  res.json({ message: 'Deleted' });
}));
module.exports = router;
