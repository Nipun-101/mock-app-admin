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
      .populate('subjects', 'name')
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

    // If subjects or totalQuestions changed, regenerate question set
    let questionIds = body.questionIds;
    if (body.subjects && body.totalQuestions) {
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

      questionIds = questions.map(q => q._id);
    }

    // Prepare update data
    const mockTestData = {
      title: body.title,
      description: body.description,
      totalQuestions: body.totalQuestions,
      durationInMinutes: body.durationInMinutes,
      subjects: body.subjects,
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
    ).populate('subjects', 'name')
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
