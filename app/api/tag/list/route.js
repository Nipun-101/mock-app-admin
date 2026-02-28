import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Tag from "@/models/Tag";

export async function GET(request) {
  try {
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const subject = searchParams.get("subject");
    const topic = searchParams.get("topic");

    const query = { isActive: true, isDeleted: false };

    if (subject) {
      query.subject = subject;
    }
    if (topic) {
      query.topic = topic;
    }

    const totalTags = await Tag.countDocuments(query);

    const tags = await Tag.find(query)
      .populate("subject", "name")
      .populate("topic", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      tags,
      pagination: {
        total: totalTags,
        page,
        limit,
        totalPages: Math.ceil(totalTags / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tags", details: error.message },
      { status: 500 }
    );
  }
}
