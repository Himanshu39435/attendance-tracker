const mongoose = require('mongoose');
const User = require('../models/User');
// Admin may act on any staff member with ?userId=<id>. Everyone else only ever touches their own data.
module.exports = async (req, res, next) => {
  try {
    const uid = req.query.userId;
    if (uid && String(uid) !== String(req.user._id)) {
      if (req.user.role !== 'admin') return res.status(403).json({ message: 'You can only access your own records.' });
      if (!mongoose.isValidObjectId(uid) || !(await User.exists({ _id: uid }))) return res.status(404).json({ message: 'User not found' });
      req.targetId = uid;
    } else req.targetId = req.user._id;
    next();
  } catch (e) { next(e); }
};
module.exports.adminOnly = (req, res, next) => (req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Only the admin can do this.' }));
