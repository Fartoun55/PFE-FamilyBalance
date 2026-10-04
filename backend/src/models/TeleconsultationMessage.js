const mongoose = require('mongoose');

const { Schema } = mongoose;

const teleconsultationMessageSchema = new Schema(
  {
    appointment: { type: Schema.Types.ObjectId, ref: 'TeleconsultationAppointment', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    encryptedContent: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    messageType: { type: String, enum: ['pre', 'post'], default: 'pre', required: true },
  },
  { timestamps: true }
);

teleconsultationMessageSchema.index({ appointment: 1, createdAt: 1 });

module.exports = mongoose.model('TeleconsultationMessage', teleconsultationMessageSchema);
