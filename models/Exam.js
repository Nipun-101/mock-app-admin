import mongoose from "mongoose";

const ExamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  duration: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  subjects: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Subject",
    required: true
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

export default mongoose.models.Exam || mongoose.model("Exam", ExamSchema);
