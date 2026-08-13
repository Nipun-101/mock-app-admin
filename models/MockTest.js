import mongoose from "mongoose";
import "./Exam";
import "./Subject";
import "./Topic";
import "./Question";
import "./User";

export const PAPER_TYPE = {
  TOPIC_WISE: "TOPIC_WISE",
  FULL_EXAM: "FULL_EXAM",
};

/** Same firewall as ez-prep-api: treat missing paperType as topic-wise. */
export const TOPIC_WISE_FILTER = {
  paperType: { $ne: PAPER_TYPE.FULL_EXAM },
};

const MockTestSubjectConfigSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    numberOfQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    marksPerQuestion: {
      type: Number,
      required: true,
      min: 0,
    },
    hasNegativeMarking: {
      type: Boolean,
      required: true,
      default: false,
    },
    negativeMarksPerQuestion: {
      type: Number,
      min: 0,
      default: 0,
    },
    sessionTime: {
      type: Number,
      min: 0,
    },
    questionStartIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    questionEndIndex: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const MockTestSchema = new mongoose.Schema(
  {
    paperType: {
      type: String,
      enum: Object.values(PAPER_TYPE),
      default: PAPER_TYPE.TOPIC_WISE,
      index: true,
    },
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
    // Exam reference
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    // Single subject mock test (required for TOPIC_WISE; omitted on FULL_EXAM papers)
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
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
    totalMarks: {
      type: Number,
      min: 0,
    },
    isSessionWise: {
      type: Boolean,
      default: false,
    },
    subjectConfig: {
      type: [MockTestSubjectConfigSchema],
      default: undefined,
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

// Delete cached model to ensure schema updates take effect on hot-reload
if (mongoose.models.MockTest) {
  delete mongoose.models.MockTest;
}

const MockTest = mongoose.model("MockTest", MockTestSchema);
export default MockTest;
