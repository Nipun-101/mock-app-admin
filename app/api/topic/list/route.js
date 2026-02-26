import { NextResponse } from "next/server";
import Topic from "@/models/Topic";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request) {
  try {
    await connectToDatabase();
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100"); // Ensure limit is set to fetch all topics
    const skip = (page - 1) * limit;

    // Query for active, non-deleted topics
    const query = { isActive: true, isDeleted: false };

    // Get total count for pagination
    const totalTopics = await Topic.countDocuments(query);
    
    // Get paginated results
    const topics = await Topic.find(query)
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      topics,
      pagination: {
        total: totalTopics,
        page,
        limit,
        totalPages: Math.ceil(totalTopics / limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch topics", details: error.message },
      { status: 500 }
    );
  }
} 
