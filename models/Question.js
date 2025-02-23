import mongoose from "mongoose";
import Tag from "./Tag"; // Import Tag model
import Subject from "./Subject"; // Import Subject model
import Exam from "./Exam"; // Import Exam model

const QuestionSchema = new mongoose.Schema({
  questionText: {
    en: {
      text: { type: String },
      image: { type: String }
    },
    ml: {
      text: { type: String },
      image: { type: String }
    }
  },
  options: [{
    id: { type: String },
    type: { type: String, enum: ['text', 'image'] },
    en: { type: String },
    ml: { type: String },
    url: { type: String }
  }],
  explanation: {
    en: { type: String },
    ml: { type: String }
  },
  correctAnswer: { type: String },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  exams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }]
}, {
  timestamps: true
});

const Question = mongoose.models.Question || mongoose.model("Question", QuestionSchema);
export default Question;
