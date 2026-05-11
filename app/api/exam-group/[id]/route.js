import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ExamGroup from "@/models/ExamGroup";

// Get single exam group
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;

    const examGroup = await ExamGroup.findOne({ _id: id, isDeleted: false })
      .populate('category', 'name shortName');

    if (!examGroup) {
      return NextResponse.json(
        { error: "Exam group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(examGroup);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch exam group", details: error.message },
      { status: 500 }
    );
  }
}

// Update exam group
export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const body = await request.json();

    const examGroup = await ExamGroup.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!examGroup) {
      return NextResponse.json(
        { error: "Exam group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Exam group updated successfully",
      examGroup,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update exam group", details: error.message },
      { status: 500 }
    );
  }
}

// Soft delete exam group
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;

    const examGroup = await ExamGroup.findOneAndUpdate(
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

    if (!examGroup) {
      return NextResponse.json(
        { error: "Exam group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Exam group deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete exam group", details: error.message },
      { status: 500 }
    );
  }
}
