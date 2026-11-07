const mongoose = require('mongoose');
const s = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  inTime: { type: String, required: true },
  outTime: { type: String, default: '' }, // empty while the staff member is still checked in
  breakMinutes: { type: Number, default: 0, min: 0 },
  totalWorkingMinutes: { type: Number, default: 0 },
  overtimeMinutes: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'complete'], default: 'complete' },
  inAt: { type: Date },            // exact check-in moment (punch records)
  lunchStart: { type: Date, default: null }, // set while lunch is running
  lunchMinutes: { type: Number, default: 0 },  // lunch tracked so far
  notes: { type: String, default: '', maxlength: 500 },
}, { timestamps: true });
s.index({ userId: 1, date: 1 }, { unique: true }); // no duplicate date per user
module.exports = mongoose.model('Attendance', s);
