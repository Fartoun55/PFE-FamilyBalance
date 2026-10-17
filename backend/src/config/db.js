const mongoose = require('mongoose');
const { validateEnv } = require('./env');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI n'est pas configurée");
  }

  // Autres variables obligatoires en production (secrets JWT).
  validateEnv();

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);

  return mongoose.connection;
};

module.exports = connectDB;
