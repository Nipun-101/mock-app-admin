import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb"; 
import Exam from "@/models/Exam";

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();

    // Auto-compute totalQuestions and totalMarks from subjects
    if (body.subjects && body.subjects.length > 0) {
      body.totalQuestions = body.subjects.reduce(
        (sum, s) => sum + (s.numberOfQuestions || 0), 0
      );
      body.totalMarks = body.subjects.reduce(
        (sum, s) => sum + (s.numberOfQuestions || 0) * (s.marksPerQuestion || 0), 0
      );
    }
    
    const exam = await Exam.create({
      ...body,
      isActive: true,
      isDeleted: false
    });
    
    return NextResponse.json(
      { message: "Exam created successfully", exam },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create exam", details: error.message },
      { status: 500 }
    );
  }
}
