import { NextResponse } from "next/server";
import Topic from "@/models/Topic";
import { connectToDatabase } from "@/lib/mongodb";

// Get single topic
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const topic = await Topic.findOne({ _id: id, isDeleted: false });
    
    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(topic);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch topic", details: error.message },
      { status: 500 }
    );
  }
}

// Update topic
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const topic = await Topic.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Topic updated successfully",
      topic
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update topic", details: error.message },
      { status: 500 }
    );
  }
}

// Soft delete topic
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const topic = await Topic.findOneAndUpdate(
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

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Topic deleted successfully"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete topic", details: error.message },
      { status: 500 }
    );
  }
} 
