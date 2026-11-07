const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const mail = require('../utils/mail');
const { asyncH, httpError } = require('../middleware/error');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, isVerified: u.isVerified, avatar: u.avatar || '' });
const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const requireVerify = () => process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
const isAdminEmail = (e) => !!process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase() === e.toLowerCase();

async function issueVerification(user) {
  const t = mail.newToken();
  await User.updateOne({ _id: user._id }, { verifyTokenHash: t.hash });
  await mail.sendVerification(user, t.raw).catch((e) => console.error('Mail error:', e.message));
}

router.get('/setup-status', asyncH(async (req, res) => res.json({ needsSetup: (await User.countDocuments()) === 0 })));

router.post('/register', asyncH(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim()) throw httpError(400, 'Name is required');
  if (!emailRx.test(email || '')) throw httpError(400, 'Enter a valid email');
  if (!password || password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (await User.countDocuments() > 0) throw httpError(403, 'Registration is closed. Ask your admin to create your account.');
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role: 'admin', isVerified: true });
  await Settings.create({ userId: user._id });
  res.status(201).json({ token: sign(user), user: pub(user) });
}));

router.post('/login', asyncH(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw httpError(400, 'Email and password are required');
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +avatar');
  if (!user || !(await bcrypt.compare(password, user.password))) throw httpError(401, 'Invalid email or password');
  if (!user.isActive) throw httpError(403, 'This account has been disabled. Contact the administrator.');
  if (requireVerify() && !user.isVerified) return res.status(403).json({ message: 'Verify your email first. Check your inbox.', code: 'EMAIL_NOT_VERIFIED' });
  if (isAdminEmail(user.email) && user.role !== 'admin') { user.role = 'admin'; await user.save(); }
  res.json({ token: sign(user), user: pub(user) });
}));

router.post('/verify-email', asyncH(async (req, res) => {
  const user = await User.findOne({ verifyTokenHash: mail.hash(String(req.body.token || '')) }).select('+verifyTokenHash');
  if (!user) throw httpError(400, 'This verification link is invalid or already used.');
  user.isVerified = true; user.verifyTokenHash = undefined; await user.save();
  res.json({ message: 'Email verified. You can log in now.' });
}));

router.post('/resend-verification', asyncH(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
  if (user && !user.isVerified) await issueVerification(user);
  res.json({ message: 'If that account needs verification, a new email has been sent.' });
}));

router.post('/forgot-password', asyncH(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
  if (user && user.isActive) {
    const t = mail.newToken();
    await User.updateOne({ _id: user._id }, { resetTokenHash: t.hash, resetExpires: new Date(Date.now() + 3600 * 1000) });
    await mail.sendReset(user, t.raw).catch((e) => console.error('Mail error:', e.message));
  }
  res.json({ message: 'If that email is registered, a reset link has been sent.' }); // same reply either way
}));

router.post('/reset-password', asyncH(async (req, res) => {
  const { token, password } = req.body;
  if (!password || password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  const user = await User.findOne({ resetTokenHash: mail.hash(String(token || '')), resetExpires: { $gt: new Date() } }).select('+resetTokenHash +resetExpires');
  if (!user) throw httpError(400, 'This reset link is invalid or has expired.');
  user.password = await bcrypt.hash(password, 12); user.resetTokenHash = undefined; user.resetExpires = undefined; user.isVerified = true;
  await user.save();
  res.json({ message: 'Password updated. You can log in now.' });
}));

router.get('/me', auth, asyncH(async (req, res) => res.json({ user: pub(await User.findById(req.user._id).select('+avatar')) })));

router.put('/profile', auth, asyncH(async (req, res) => {
  const { name, currentPassword, newPassword, avatar } = req.body;
  const user = await User.findById(req.user._id).select('+password +avatar');
  if (avatar === '') user.avatar = ''; // remove photo
  else if (avatar !== undefined) {
    if (typeof avatar !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)) throw httpError(400, 'Profile image must be a JPEG, PNG or WebP image');
    if (avatar.length > 150000) throw httpError(400, 'Profile image is too large');
    user.avatar = avatar;
  }
  if (name?.trim()) user.name = name.trim();
  if (newPassword) {
    if (newPassword.length < 6) throw httpError(400, 'New password must be at least 6 characters');
    if (!(await bcrypt.compare(currentPassword || '', user.password))) throw httpError(400, 'Current password is incorrect');
    user.password = await bcrypt.hash(newPassword, 12);
  }
  await user.save();
  res.json({ user: pub(user) });
}));
module.exports = router;
