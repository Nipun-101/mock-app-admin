import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb"; 
import Exam from "@/models/Exam";
import ExamGroup from "@/models/ExamGroup";

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { isExamSameAsGroup, ...examData } = body;

    // If exam is same as group, create exam group first
    if (isExamSameAsGroup) {
      const examGroup = await ExamGroup.create({
        name: examData.name,
        shortName: examData.shortName || examData.name,
        category: examData.category,
        description: examData.description,
        isActive: true,
        isDeleted: false,
      });
      examData.examGroup = examGroup._id;
    }

    // Auto-compute totalQuestions and totalMarks from subjects
    if (examData.subjects && examData.subjects.length > 0) {
      examData.totalQuestions = examData.subjects.reduce(
        (sum, s) => sum + (s.numberOfQuestions || 0), 0
      );
      examData.totalMarks = examData.subjects.reduce(
        (sum, s) => sum + (s.numberOfQuestions || 0) * (s.marksPerQuestion || 0), 0
      );
    }
    
    const exam = await Exam.create({
      ...examData,
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
