import { NextResponse } from "next/server";
import Tag from "@/models/Tag";
import { connectToDatabase } from "@/lib/mongodb";

// Get single tag
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const tag = await Tag.findOne({ _id: id, isDeleted: false });
    
    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tag);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tag", details: error.message },
      { status: 500 }
    );
  }
}

// Update tag
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const tag = await Tag.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Tag updated successfully",
      tag
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update tag", details: error.message },
      { status: 500 }
    );
  }
}

// Soft delete tag
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const tag = await Tag.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { 
        $set: { 
          isDeleted: true,
          isActive: false,
          deletedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Tag deleted successfully"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete tag", details: error.message },
      { status: 500 }
    );
  }
} 