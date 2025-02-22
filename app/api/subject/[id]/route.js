import { NextResponse } from "next/server";
import Subject from "@/models/Subject";
import { connectToDatabase } from "@/lib/mongodb";

// Get single subject
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const subject = await Subject.findOne({ _id: id, isDeleted: false })
      .populate('tags', 'name');
    
    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(subject);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch subject", details: error.message },
      { status: 500 }
    );
  }
}

// Update subject
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const subject = await Subject.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Subject updated successfully",
      subject
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update subject", details: error.message },
      { status: 500 }
    );
  }
}

// Soft delete subject
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const subject = await Subject.findOneAndUpdate(
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

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Subject deleted successfully"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete subject", details: error.message },
      { status: 500 }
    );
  }
} 