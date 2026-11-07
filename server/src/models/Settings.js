const mongoose = require('mongoose');
module.exports = mongoose.model('Settings', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  officeStartTime: { type: String, default: '09:30' },
  overtimeStartTime: { type: String, default: '19:30' },
  defaultBreakMinutes: { type: Number, default: 30 }, // standard lunch allowance
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] }, // 0=Sun ... 6=Sat
  reportPreferences: {
    defaultView: { type: String, enum: ['month', 'range'], default: 'month' },
    includeNotes: { type: Boolean, default: true },
  },
}, { timestamps: true }));
