import { NextResponse } from "next/server";
import Subject from "@/models/Subject";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100"); // Default to 100 for dropdowns
    const skip = (page - 1) * limit;

    // Query for active, non-deleted subjects
    const query = { isActive: true, isDeleted: false };

    // Get total count for pagination
    const totalSubjects = await Subject.countDocuments(query);
    
    // Get paginated results without populating tags
    const subjects = await Subject.find(query)
      .select('_id name tags') // Only select id and name
      .sort({ createdAt: -1 })
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