import mongoose from "mongoose";

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
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tag",
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

export default mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);
