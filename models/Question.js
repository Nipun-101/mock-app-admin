import mongoose from "mongoose";
import Tag from "./Tag"; // Import Tag model
import Subject from "./Subject"; // Import Subject model
import Exam from "./Exam"; // Import Exam model

const ImageMetadataSchema = new mongoose.Schema({
  key: { type: String, required: true }, // S3 object key
  bucket: { type: String, required: true }, // S3 bucket name
  region: { type: String, required: true }, // AWS region
  contentType: { type: String }, // File MIME type
  size: { type: Number }, // File size in bytes
  lastModified: { type: Date }, // Upload timestamp
  url: { type: String }, // Pre-signed URL (will need periodic refresh)
});

const QuestionSchema = new mongoose.Schema({
  questionText: {
    en: {
      text: { type: String },
      image: ImageMetadataSchema
    },
    ml: {
      text: { type: String },
      image: ImageMetadataSchema
    }
  },
  optionType: { type: String, enum: ['text', 'image'] },
  options: [{
    id: { type: String },
    type: { type: String, enum: ['text', 'image'] },
    en: { type: String },
    ml: { type: String },
    image: ImageMetadataSchema
  }],
  explanation: {
    en: { type: String },
    ml: { type: String },
    image: ImageMetadataSchema
  },
  correctAnswer: { type: String },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  exams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }],
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

const Question = mongoose.models.Question || mongoose.model("Question", QuestionSchema);
export default Question;
