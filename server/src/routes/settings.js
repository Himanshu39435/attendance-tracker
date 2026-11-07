const router = require('express').Router();
const Settings = require('../models/Settings');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const target = require('../middleware/target');
const { adminOnly } = target;
const { calculate, isTime } = require('../utils/calc');
const { asyncH, httpError } = require('../middleware/error');
router.use(auth, target);

router.get('/', asyncH(async (req, res) => {
  const s = await Settings.findOneAndUpdate({ userId: req.targetId }, { $setOnInsert: { userId: req.targetId } }, { upsert: true, new: true });
  res.json(s);
}));

router.put('/', adminOnly, asyncH(async (req, res) => {
  const { officeStartTime, overtimeStartTime, defaultBreakMinutes, workingDays, reportPreferences, recalculate } = req.body;
  const upd = {};
  if (officeStartTime !== undefined) { if (!isTime(officeStartTime)) throw httpError(400, 'Invalid office start time'); upd.officeStartTime = officeStartTime; }
  if (overtimeStartTime !== undefined) { if (!isTime(overtimeStartTime)) throw httpError(400, 'Invalid overtime start time'); upd.overtimeStartTime = overtimeStartTime; }
  if (defaultBreakMinutes !== undefined) {
    const b = Number(defaultBreakMinutes);
    if (!Number.isInteger(b) || b < 0 || b > 600) throw httpError(400, 'Break must be 0-600 minutes');
    upd.defaultBreakMinutes = b;
  }
  if (workingDays !== undefined) {
    if (!Array.isArray(workingDays) || !workingDays.length || workingDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) throw httpError(400, 'Select at least one working day');
    upd.workingDays = [...new Set(workingDays)];
  }
  if (reportPreferences) upd.reportPreferences = reportPreferences;
  const s = await Settings.findOneAndUpdate({ userId: req.targetId }, { $set: upd }, { upsert: true, new: true, runValidators: true });
  if (recalculate && upd.overtimeStartTime) { // re-apply new overtime time to all existing records
    const all = await Attendance.find({ userId: req.targetId });
    if (all.length) await Attendance.bulkWrite(all.map((a) => {
      const c = calculate({ ...a.toObject(), overtimeStartTime: s.overtimeStartTime });
      return { updateOne: { filter: { _id: a._id }, update: { $set: { totalWorkingMinutes: c.totalWorkingMinutes, overtimeMinutes: c.overtimeMinutes } } } };
    }));
  }
  res.json(s);
}));
module.exports = router;
