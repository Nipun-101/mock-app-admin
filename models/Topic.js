import mongoose from "mongoose";

const TopicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Topic name is required"],
    trim: true,
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
  timestamps: true
});

const Topic = mongoose.models.Topic || mongoose.model("Topic", TopicSchema);
export default Topic;
