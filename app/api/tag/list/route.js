import { NextResponse } from "next/server";
import Tag from "@/models/Tag";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request) {
  try {
    await connectToDatabase();
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100"); // Ensure limit is set to fetch all tags
    const skip = (page - 1) * limit;

    // Query for active, non-deleted tags
    const query = { isActive: true, isDeleted: false };

    // Get total count for pagination
    const totalTags = await Tag.countDocuments(query);
    
    // Get paginated results
    const tags = await Tag.find(query)
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      tags,
      pagination: {
        total: totalTags,
        page,
        limit,
        totalPages: Math.ceil(totalTags / limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tags", details: error.message },
      { status: 500 }
    );
  }
} 