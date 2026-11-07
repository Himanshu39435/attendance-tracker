const nodemailer = require('nodemailer');
const crypto = require('crypto');
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const newToken = () => { const raw = crypto.randomBytes(32).toString('hex'); return { raw, hash: hash(raw) }; };
const clientUrl = () => (process.env.CLIENT_URL || (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0]).trim().replace(/\/$/, '');

let transport;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  transport ||= nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transport;
}
// Without SMTP settings the link is printed in the server console (handy for local development).
async function sendMail({ to, subject, text, html }) {
  const t = getTransport();
  if (!t) { console.log(`\n[MAIL not configured] To: ${to}\nSubject: ${subject}\n${text}\n`); return; }
  await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
}
const btn = (url, label) => `<p><a href="${url}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${label}</a></p><p style="color:#64748b;font-size:13px">Or open: ${url}</p>`;
exports = module.exports = {
  hash, newToken, sendMail,
  sendVerification: (u, raw) => { const url = `${clientUrl()}/verify-email/${raw}`; return sendMail({ to: u.email, subject: 'Verify your email: Himanshu Office Time Tracker', text: `Hi ${u.name}, verify your email: ${url}`, html: `<p>Hi ${u.name}, please verify your email.</p>${btn(url, 'Verify email')}` }); },
  sendReset: (u, raw) => { const url = `${clientUrl()}/reset-password/${raw}`; return sendMail({ to: u.email, subject: 'Reset your password: Himanshu Office Time Tracker', text: `Reset your password (valid for 1 hour): ${url}`, html: `<p>Hi ${u.name}, use the button to set a new password. The link is valid for 1 hour.</p>${btn(url, 'Reset password')}<p style="color:#64748b;font-size:13px">If you did not request this, ignore this email.</p>` }); },
};
