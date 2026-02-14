import { NextResponse } from "next/server";
import MockTest from "@/models/MockTest";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const query = { isDeleted: false };

    const totalMockTests = await MockTest.countDocuments(query);
    const mockTests = await MockTest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('subjects', 'name')
      .populate('createdBy', 'name email');

    return NextResponse.json({
      mockTests,
      pagination: {
        total: totalMockTests,
        page,
        limit,
        totalPages: Math.ceil(totalMockTests / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching mock tests:', error);
    return NextResponse.json(
      { error: "Failed to fetch mock tests", details: error.message },
      { status: 500 }
    );
  }
}
