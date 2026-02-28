import mongoose from "mongoose";
import Category from "./Category";

const ExamSubjectSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: [true, "Subject is required"],
  },
  numberOfQuestions: {
    type: Number,
    required: [true, "Number of questions is required"],
    min: [1, "Must have at least 1 question"],
  },
  marksPerQuestion: {
    type: Number,
    required: [true, "Marks per question is required"],
    min: [0, "Marks cannot be negative"],
  },
  hasNegativeMarking: {
    type: Boolean,
    required: [true, "Negative marking flag is required"],
    default: false,
  },
  negativeMarksPerQuestion: {
    type: Number,
    min: [0, "Negative marks cannot be negative"],
    default: 0,
  },
  sessionTime: {
    type: Number,
    min: [0, "Session time cannot be negative"],
  },
}, { _id: false });

const ExamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: [true, "Category is required"],
  },
  duration: {
    type: Number,
  },
  totalQuestions: {
    type: Number,
  },
  totalMarks: {
    type: Number,
  },
  subjects: {
    type: [ExamSubjectSchema],
    default: [],
  },
  isSessionWise: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
    timestamps: true,
  }
);

// Delete cached model so schema changes take effect during dev hot-reload
if (mongoose.models.Exam) {
  mongoose.deleteModel('Exam');
}

export default mongoose.model("Exam", ExamSchema);
