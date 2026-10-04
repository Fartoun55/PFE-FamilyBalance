const mongoose = require('mongoose');

const { Schema } = mongoose;

const parentToolkitItemSchema = new Schema(
  {
    parent: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemType: { type: String, enum: ['contract', 'schedule'], required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    activities: [{ type: String, trim: true }],
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

parentToolkitItemSchema.index({ parent: 1, itemType: 1, createdAt: -1 });

module.exports = mongoose.model('ParentToolkitItem', parentToolkitItemSchema);
