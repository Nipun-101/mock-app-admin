import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Exam from "@/models/Exam";

// Get single exam
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;

    const exam = await Exam.findOne({ _id: id, isDeleted: false });
    
    if (!exam) {
      return NextResponse.json(
        { error: "Exam not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(exam);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch exam", details: error.message },
      { status: 500 }
    );
  }
}

// Update exam
export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const body = await request.json();

    const exam = await Exam.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!exam) {
      return NextResponse.json(
        { error: "Exam not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Exam updated successfully",
      exam
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update exam", details: error.message },
      { status: 500 }
    );
  }
}

// Soft delete exam
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;

    const exam = await Exam.findOneAndUpdate(
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

    if (!exam) {
      return NextResponse.json(
        { error: "Exam not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Exam deleted successfully"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete exam", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;

    const exam = await Exam.findOne({ _id: id, isDeleted: false });
    
    if (!exam) {
      return NextResponse.json(
        { error: "Exam not found" },
        { status: 404 }
      );
    }

    exam.isActive = !exam.isActive;
    await exam.save();

    return NextResponse.json({
      message: `Exam ${exam.isActive ? 'activated' : 'deactivated'} successfully`,
      exam
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to toggle exam status", details: error.message },
      { status: 500 }
    );
  }
} 