// All times are "HH:mm" (24h) strings. Handles midnight crossing.
const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const isTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t));

/**
 * totalWorkingMinutes = (out - in, crossing midnight if out <= in) - break
 * overtimeMinutes     = minutes worked after overtimeStart (break is not deducted from overtime)
 */
function calculate({ inTime, outTime, breakMinutes = 0, overtimeStartTime = '19:30' }) {
  const inM = toMin(inTime);
  let outM = toMin(outTime);
  if (outM <= inM) outM += 1440; // overnight shift
  const gross = outM - inM;
  const totalWorkingMinutes = Math.max(0, gross - Math.max(0, Number(breakMinutes) || 0));
  const otStart = toMin(overtimeStartTime);
  const overtimeMinutes = Math.max(0, outM - Math.max(inM, otStart));
  return { totalWorkingMinutes, overtimeMinutes, crossesMidnight: outM > 1440 };
}
const fmt = (min) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;

module.exports = { calculate, toMin, isTime, fmt };
