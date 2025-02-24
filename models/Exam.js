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
  },
  totalQuestions: {
    type: Number,
  },
  subjects: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Subject",
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
