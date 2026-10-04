const mongoose = require('mongoose');

const { Schema } = mongoose;

const surveyOptionSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const surveyBranchRuleSchema = new Schema(
  {
    values: [{ type: String, trim: true }],
    minValue: { type: Number },
    maxValue: { type: Number },
    nextCode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const surveyQuestionSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true, trim: true },
    domain: { type: String, required: true, index: true, trim: true },
    domainLabel: { type: String, required: true, trim: true },
    ageSegments: [{ type: String, index: true, trim: true }],
    order: { type: Number, required: true, index: true },
    type: {
      type: String,
      enum: ['single-choice', 'likert', 'text'],
      required: true,
    },
    prompt: { type: String, required: true, trim: true },
    helpText: { type: String, trim: true },
    options: [surveyOptionSchema],
    branchingRules: [surveyBranchRuleSchema],
    defaultNextCode: { type: String, trim: true },
    isEntryPoint: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SurveyQuestion', surveyQuestionSchema);