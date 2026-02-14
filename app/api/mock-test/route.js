import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import MockTest from "@/models/MockTest";
import Question from "@/models/Question";
import mongoose from "mongoose";

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: "Test title is required" },
        { status: 400 }
      );
    }

    if (!body.totalQuestions || body.totalQuestions <= 0) {
      return NextResponse.json(
        { error: "Total questions must be greater than 0" },
        { status: 400 }
      );
    }

    if (!body.durationInMinutes || body.durationInMinutes <= 0) {
      return NextResponse.json(
        { error: "Duration must be greater than 0" },
        { status: 400 }
      );
    }

    if (!body.subjects || body.subjects.length === 0) {
      return NextResponse.json(
        { error: "At least one subject is required" },
        { status: 400 }
      );
    }

    // Fetch random questions from the selected subjects
    const questions = await Question.aggregate([
      { 
        $match: { 
          subject: { $in: body.subjects.map(id => new mongoose.Types.ObjectId(id)) },
          isActive: true,
          isDeleted: false
        } 
      },
      { $sample: { size: body.totalQuestions } }
    ]);

    if (questions.length < body.totalQuestions) {
      return NextResponse.json(
        { 
          error: `Not enough questions available. Found ${questions.length}, need ${body.totalQuestions}`,
          availableQuestions: questions.length
        },
        { status: 400 }
      );
    }

    // Create test with validated data
    const mockTestData = {
      title: body.title,
      description: body.description || null,
      totalQuestions: body.totalQuestions,
      durationInMinutes: body.durationInMinutes,
      subjects: body.subjects,
      generationMode: body.generationMode || "STATIC",
      questionIds: questions.map(q => q._id),
      marksPerQuestion: body.marksPerQuestion || 1,
      negativeMarking: body.negativeMarking || 0,
      passingScore: body.passingScore || null,
      allowRetake: body.allowRetake !== undefined ? body.allowRetake : true,
      shuffleOptions: body.shuffleOptions !== undefined ? body.shuffleOptions : false,
      showResultsImmediately: body.showResultsImmediately !== undefined ? body.showResultsImmediately : true,
      isActive: true,
      isDeleted: false,
    };

    // Add optional fields
    if (body.createdBy) mockTestData.createdBy = body.createdBy;

    const mockTest = await MockTest.create(mockTestData);

    // Populate references for response
    await mockTest.populate([
      { path: 'subjects', select: 'name' },
      { path: 'questionIds', select: 'questionText subject' }
    ]);
    
    return NextResponse.json(
      { 
        message: "Mock test created successfully", 
        mockTest 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating mock test:', error);
    return NextResponse.json(
      { 
        error: "Failed to create mock test", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
