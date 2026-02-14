import mongoose from "mongoose";

const MockTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Core Configuration
    totalQuestions: {
      type: Number,
      required: true,
    },
    durationInMinutes: {
      type: Number,
      required: true,
    },
    // For now: Single subject/multiple subject mock test
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true,
      },
    ],
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
    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
    },
  },
  {
    timestamps: true,
  }
);

const MockTest = mongoose.models.MockTest || mongoose.model("MockTest", MockTestSchema);
export default MockTest;
