import { NextResponse } from "next/server";
import Subject from "@/models/Subject";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request) {
  try {
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 500);
    const skip = (page - 1) * limit;

    const query = { isActive: true, isDeleted: false };

    const [totalSubjects, subjects] = await Promise.all([
      Subject.countDocuments(query),
      Subject.find(query)
        .select("name topics")
        .populate("topics", "_id name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      subjects,
      pagination: {
        total: totalSubjects,
        page,
        limit,
        totalPages: Math.ceil(totalSubjects / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch subjects:", error);
    return NextResponse.json(
      { error: "Failed to fetch subjects", details: error.message },
      { status: 500 }
    );
  }
} 