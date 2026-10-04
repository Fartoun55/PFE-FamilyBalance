const mongoose = require('mongoose');

const { Schema } = mongoose;

const newsletterDigestSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    profileInsights: [{ type: String, trim: true }],
    scoreInsights: [{ type: String, trim: true }],
    recommendations: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

newsletterDigestSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('NewsletterDigest', newsletterDigestSchema);
