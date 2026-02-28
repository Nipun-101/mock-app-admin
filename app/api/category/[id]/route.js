import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/models/Category";

// Get single category
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;

    const category = await Category.findOne({ _id: id, isDeleted: false });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch category", details: error.message },
      { status: 500 }
    );
  }
}

// Update category
export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const body = await request.json();

    const category = await Category.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update category", details: error.message },
      { status: 500 }
    );
  }
}

// Soft delete category
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;

    const category = await Category.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          isActive: false,
          deletedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete category", details: error.message },
      { status: 500 }
    );
  }
}
