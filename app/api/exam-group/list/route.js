import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ExamGroup from "@/models/ExamGroup";

export async function GET(request) {
  try {
    await connectToDatabase();

    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const categoryId = searchParams.get("categoryId");
    const skip = (page - 1) * limit;

    // Query for active, non-deleted exam groups
    const query = { isActive: true, isDeleted: false };
    
    // Filter by category if provided
    if (categoryId) {
      query.category = categoryId;
    }

    // Get total count for pagination
    const totalExamGroups = await ExamGroup.countDocuments(query);

    // Get paginated results
    const examGroups = await ExamGroup.find(query)
      .populate('category', 'name shortName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      examGroups,
      pagination: {
        total: totalExamGroups,
        page,
        limit,
        totalPages: Math.ceil(totalExamGroups / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch exam groups", details: error.message },
      { status: 500 }
    );
  }
}
