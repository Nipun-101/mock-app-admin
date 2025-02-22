import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb"; 
import Exam from "@/models/Exam";

export async function GET(request) {
  try {
    await connectToDatabase();
    
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Query for active, non-deleted exams
    const query = { isActive: true, isDeleted: false, isActive: true };

    // Get total count for pagination
    const totalExams = await Exam.countDocuments(query);
    
    // Get paginated results
    const exams = await Exam.find(query)
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      exams,
      pagination: {
        total: totalExams,
        page,
        limit,
        totalPages: Math.ceil(totalExams / limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch exams", details: error.message },
      { status: 500 }
    );
  }
} 