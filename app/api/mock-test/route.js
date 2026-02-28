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
    if (!body.totalQuestions || ![10, 15, 20, 25, 30].includes(body.totalQuestions)) {
      return NextResponse.json(
        { error: "Total questions must be one of: 10, 15, 20, 25, 30" },
        { status: 400 }
      );
    }

    if (!body.durationInMinutes || ![10, 15, 20, 25, 30].includes(body.durationInMinutes)) {
      return NextResponse.json(
        { error: "Duration must be one of: 10, 15, 20, 25, 30" },
        { status: 400 }
      );
    }

    if (!body.subject) {
      return NextResponse.json(
        { error: "A subject is required" },
        { status: 400 }
      );
    }

    // Validate difficulty distribution
    const { difficultyDistribution } = body;
    if (!difficultyDistribution || 
        difficultyDistribution.easy === undefined || 
        difficultyDistribution.medium === undefined || 
        difficultyDistribution.hard === undefined) {
      return NextResponse.json(
        { error: "Difficulty distribution (easy, medium, hard) is required" },
        { status: 400 }
      );
    }

    const distSum = difficultyDistribution.easy + difficultyDistribution.medium + difficultyDistribution.hard;
    if (distSum !== body.totalQuestions) {
      return NextResponse.json(
        { error: `Difficulty distribution sum (${distSum}) must equal total questions (${body.totalQuestions})` },
        { status: 400 }
      );
    }

    // Build base question match filter
    const baseMatch = {
      subject: new mongoose.Types.ObjectId(body.subject),
      isActive: true,
      isDeleted: false,
    };
    if (body.topic) {
      baseMatch.topic = new mongoose.Types.ObjectId(body.topic);
    }

    // Fetch random questions per difficulty level
    const difficulties = ['easy', 'medium', 'hard'];
    let allQuestions = [];

    for (const level of difficulties) {
      const count = difficultyDistribution[level];
      if (count === 0) continue;

      const questions = await Question.aggregate([
        { $match: { ...baseMatch, difficultyLevel: level } },
        { $sample: { size: count } }
      ]);

      if (questions.length < count) {
        return NextResponse.json(
          { 
            error: `Not enough ${level} questions available. Found ${questions.length}, need ${count}`,
            availableQuestions: questions.length,
            difficulty: level
          },
          { status: 400 }
        );
      }

      allQuestions = allQuestions.concat(questions);
    }

    const questions = allQuestions;

    // Create test with validated data
    const mockTestData = {
      totalQuestions: body.totalQuestions,
      durationInMinutes: body.durationInMinutes,
      subject: body.subject,
      topic: body.topic || null,
      difficultyDistribution: {
        easy: difficultyDistribution.easy,
        medium: difficultyDistribution.medium,
        hard: difficultyDistribution.hard,
      },
      title: body.title || null,
      description: body.description || null,
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
      { path: 'subject', select: 'name' },
      { path: 'topic', select: 'name' },
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
