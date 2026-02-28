import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/models/Category";

export async function GET(request) {
  try {
    await connectToDatabase();

    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Query for active, non-deleted categories
    const query = { isActive: true, isDeleted: false };

    // Get total count for pagination
    const totalCategories = await Category.countDocuments(query);

    // Get paginated results
    const categories = await Category.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      categories,
      pagination: {
        total: totalCategories,
        page,
        limit,
        totalPages: Math.ceil(totalCategories / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch categories", details: error.message },
      { status: 500 }
    );
  }
}
