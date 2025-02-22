import { NextResponse } from "next/server";
import Subject from "@/models/Subject";

export async function GET(request) {
  try {
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Query for active, non-deleted subjects
    const query = { isActive: true, isDeleted: false };

    // Get total count for pagination
    const totalSubjects = await Subject.countDocuments(query);
    
    // Get paginated results
    const subjects = await Subject.find(query)
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      subjects,
      pagination: {
        total: totalSubjects,
        page,
        limit,
        totalPages: Math.ceil(totalSubjects / limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch subjects", details: error.message },
      { status: 500 }
    );
  }
} 