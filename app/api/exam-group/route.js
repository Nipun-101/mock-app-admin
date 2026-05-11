import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ExamGroup from "@/models/ExamGroup";

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();

    const examGroup = await ExamGroup.create({
      ...body,
      isActive: true,
      isDeleted: false,
    });

    return NextResponse.json(
      { message: "Exam group created successfully", examGroup },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create exam group", details: error.message },
      { status: 500 }
    );
  }
}
