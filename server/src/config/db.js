const mongoose = require('mongoose');
module.exports = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing in server/.env');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};
