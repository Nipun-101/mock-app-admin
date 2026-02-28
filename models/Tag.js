import mongoose from "mongoose";
import Subject from "./Subject";
import Topic from "./Topic";

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Tag name is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: [true, "Subject is required"],
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Topic",
    required: [true, "Topic is required"],
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

const Tag = mongoose.models.Tag || mongoose.model("Tag", TagSchema);
export default Tag;
