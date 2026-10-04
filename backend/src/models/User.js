const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const specialistProfileSchema = new Schema(
  {
    specialization: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    city: { type: String, trim: true },
    tariff: { type: Number, min: 0 },
    languages: [{ type: String, trim: true, lowercase: true }],
  },
  { _id: false }
);

const adolescentProfileSchema = new Schema(
  {
    birthDate: { type: Date },
    ageSegment: { type: String, trim: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'User' },
    consentGiven: { type: Boolean, default: false },
    consentAt: { type: Date },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['parent', 'adolescent', 'specialist', 'admin'],
      default: 'parent',
      required: true,
    },
    phone: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    mfaEnabled: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
    lastLoginAt: { type: Date },
    specialistProfile: specialistProfileSchema,
    adolescentProfile: adolescentProfileSchema,
  },
  {
    timestamps: true,
  }
);

userSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const plainObject = this.toObject({ versionKey: false });
  delete plainObject.passwordHash;
  return plainObject;
};

module.exports = mongoose.model('User', userSchema);
