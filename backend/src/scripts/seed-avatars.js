const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const generateAvatarUrl = (firstName = '', lastName = '') => {
  const name = encodeURIComponent(`${firstName || ''} ${lastName || ''}`.trim());
  return `https://ui-avatars.com/api/?name=${name}&background=eef4ff&color=1246c4&size=128`;
};

(async () => {
  try {
    await connectDB();
    console.log('Mongo connected');

    const adolescents = await User.find({ role: 'adolescent', avatarUrl: { $exists: false } }).limit(500).lean();

    console.log(`Found ${adolescents.length} adolescents without avatarUrl.`);

    for (const a of adolescents) {
      const avatar = generateAvatarUrl(a.firstName, a.lastName);
      await User.updateOne({ _id: a._id }, { $set: { avatarUrl: avatar } });
      console.log(`Updated ${a.firstName} ${a.lastName} -> ${avatar}`);
    }

    await mongoose.disconnect();
    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding avatars:', err);
    process.exit(1);
  }
})();
