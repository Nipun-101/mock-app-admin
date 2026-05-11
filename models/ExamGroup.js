import mongoose from "mongoose";

const ExamGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Exam group name is required"],
    trim: true,
  },
  shortName: {
    type: String,
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: [true, "Category is required"],
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

const ExamGroup = mongoose.models.ExamGroup || mongoose.model("ExamGroup", ExamGroupSchema);
export default ExamGroup;
