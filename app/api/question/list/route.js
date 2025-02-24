import { NextResponse } from "next/server";
import Question from "@/models/Question";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request) {
  try {
    await connectToDatabase();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const query = { isDeleted: false, isActive: true };

    const totalQuestions = await Question.countDocuments(query);
    const questions = await Question.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('subject', 'name')
        .populate('tags', 'name')
        .populate('exams', 'name');


    return NextResponse.json({
      questions,
      pagination: {
        total: totalQuestions,
        page,
        limit,
        totalPages: Math.ceil(totalQuestions / limit)
      }
    });
  } catch (error) {
    console.log("XXX >>>>>>", error);
    return NextResponse.json(
      { error: "Failed to fetch questions", details: error.message },
      { status: 500 }
    );
  }
} 