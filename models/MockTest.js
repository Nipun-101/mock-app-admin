import mongoose from "mongoose";

const MockTestSchema = new mongoose.Schema(
  {
    // Core Configuration
    totalQuestions: {
      type: Number,
      required: true,
      enum: [10, 15, 20, 25, 30],
    },
    durationInMinutes: {
      type: Number,
      required: true,
      enum: [10, 15, 20, 25, 30],
    },
    // Single subject mock test
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    // Topic within the subject (optional)
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // STATIC mode for now
    generationMode: {
      type: String,
      enum: ["STATIC", "DYNAMIC"],
      default: "STATIC",
    },
    // Frozen question set (very important)
    questionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],
    // Evaluation Configuration
    marksPerQuestion: {
      type: Number,
      default: 1,
    },
    negativeMarking: {
      type: Number, // e.g. 0.25
      default: 0,
    },
    passingScore: {
      type: Number, // absolute score
    },
    allowRetake: {
      type: Boolean,
      default: true,
    },
    shuffleOptions: {
      type: Boolean,
      default: false,
    },
    showResultsImmediately: {
      type: Boolean,
      default: true,
    },
    // State Control
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    difficultyDistribution: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

const MockTest = mongoose.models.MockTest || mongoose.model("MockTest", MockTestSchema);
export default MockTest;
