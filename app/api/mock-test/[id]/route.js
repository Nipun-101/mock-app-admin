import { NextResponse } from "next/server";
import MockTest from "@/models/MockTest";
import Question from "@/models/Question";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";

// Get single mock test
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    const mockTest = await MockTest.findOne({ _id: id, isDeleted: false })
      .populate('subject', 'name')
      .populate('topic', 'name')
      .populate('questionIds', 'questionText subject')
      .populate('createdBy', 'name email');

    if (!mockTest) {
      return NextResponse.json(
        { error: "Mock test not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(mockTest);
  } catch (error) {
    console.error('Error fetching mock test:', error);
    return NextResponse.json(
      { error: "Failed to fetch mock test", details: error.message },
      { status: 500 }
    );
  }
}

// Update mock test
export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    const body = await request.json();

    // Validate required fields
    if (body.totalQuestions && body.totalQuestions <= 0) {
      return NextResponse.json(
        { error: "Total questions must be greater than 0" },
        { status: 400 }
      );
    }

    if (body.durationInMinutes && body.durationInMinutes <= 0) {
      return NextResponse.json(
        { error: "Duration must be greater than 0" },
        { status: 400 }
      );
    }

    // If subject or totalQuestions changed, regenerate question set
    let questionIds = body.questionIds;
    if (body.subject && body.totalQuestions && body.difficultyDistribution) {
      const { difficultyDistribution } = body;
      const distSum = difficultyDistribution.easy + difficultyDistribution.medium + difficultyDistribution.hard;
      if (distSum !== body.totalQuestions) {
        return NextResponse.json(
          { error: `Difficulty distribution sum (${distSum}) must equal total questions (${body.totalQuestions})` },
          { status: 400 }
        );
      }

      const baseMatch = {
        subject: new mongoose.Types.ObjectId(body.subject),
        isActive: true,
        isDeleted: false,
      };
      if (body.topic) {
        baseMatch.topic = new mongoose.Types.ObjectId(body.topic);
      }

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

      questionIds = allQuestions.map(q => q._id);
    }

    // Prepare update data
    const mockTestData = {
      totalQuestions: body.totalQuestions,
      durationInMinutes: body.durationInMinutes,
      subject: body.subject,
      topic: body.topic || null,
      difficultyDistribution: body.difficultyDistribution || undefined,
      title: body.title,
      description: body.description,
      generationMode: body.generationMode,
      marksPerQuestion: body.marksPerQuestion,
      negativeMarking: body.negativeMarking,
      passingScore: body.passingScore,
      allowRetake: body.allowRetake,
      shuffleOptions: body.shuffleOptions,
      showResultsImmediately: body.showResultsImmediately,
    };

    if (questionIds) {
      mockTestData.questionIds = questionIds;
    }

    const mockTest = await MockTest.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: mockTestData },
      { 
        new: true,
        runValidators: true 
      }
    ).populate('subject', 'name')
     .populate('topic', 'name')
     .populate('questionIds', 'questionText subject')
     .populate('createdBy', 'name email');

    if (!mockTest) {
      return NextResponse.json(
        { error: "Mock test not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Mock test updated successfully",
      mockTest
    });
  } catch (error) {
    console.error('Error updating mock test:', error);
    return NextResponse.json(
      { error: "Failed to update mock test", details: error.message },
      { status: 500 }
    );
  }
}

// Delete mock test (soft delete)
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    const mockTest = await MockTest.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { 
        $set: { 
          isDeleted: true,
          isActive: false,
          deletedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!mockTest) {
      return NextResponse.json(
        { error: "Mock test not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Mock test deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting mock test:', error);
    return NextResponse.json(
      { error: "Failed to delete mock test", details: error.message },
      { status: 500 }
    );
  }
}
