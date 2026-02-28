import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Category name is required"],
    trim: true,
  },
  shortName: {
    type: String,
    required: [true, "Short name is required"],
    trim: true,
    uppercase: true,
  },
  imageUrl: {
    type: String,
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
  timestamps: true,
});

const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
export default Category;
