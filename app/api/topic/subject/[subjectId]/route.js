import { NextResponse } from "next/server";
import Topic from "@/models/Topic";
import Subject from "@/models/Subject";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { subjectId } = params;

    // First, get the subject and its topic references
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    // Get the topic IDs from the subject
    const topicIds = subject.topics || [];

    // Then fetch all active, non-deleted topics that match these IDs
    const topics = await Topic.find({
      _id: { $in: topicIds },
      isActive: true,
      isDeleted: false
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      topics,
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch topics", details: error.message },
      { status: 500 }
    );
  }
} 
