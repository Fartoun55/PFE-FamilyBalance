const mongoose = require('mongoose');
const { validateEnv } = require('./env');

const connectDB = async () => {
  const { mongoUri } = validateEnv();

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);

  return mongoose.connection;
};

module.exports = connectDB;
