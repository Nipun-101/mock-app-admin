import mongoose from "mongoose";
import Topic from "./Topic"; // Import Topic model

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Subject name is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  topics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Topic",
    default: []
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true
});

const Subject = mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);
export default Subject;
