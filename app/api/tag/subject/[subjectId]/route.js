import { NextResponse } from "next/server";
import Tag from "@/models/Tag";
import Subject from "@/models/Subject";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { subjectId } = params;

    // First, get the subject and its tag references
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    // Get the tag IDs from the subject
    const tagIds = subject.tags || [];

    // Then fetch all active, non-deleted tags that match these IDs
    const tags = await Tag.find({
      _id: { $in: tagIds },
      isActive: true,
      isDeleted: false
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      tags,
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tags", details: error.message },
      { status: 500 }
    );
  }
} 