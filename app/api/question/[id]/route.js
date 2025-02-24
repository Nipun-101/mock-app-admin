import { NextResponse } from "next/server";
import Question from "@/models/Question";

// Get single question
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const question = await Question.findOne({ _id: id, isDeleted: false })

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(question);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch question", details: error.message },
      { status: 500 }
    );
  }
}

// Update question
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate required fields
    if (!body.options || !Array.isArray(body.options) || body.options.length !== 4) {
      return NextResponse.json(
        { error: "Exactly 4 options are required" },
        { status: 400 }
      );
    }

    if (!body.correctAnswer) {
      return NextResponse.json(
        { error: "Correct answer is required" },
        { status: 400 }
      );
    }

    // Prepare update data
    const questionData = {
      questionText: {
        en: {
          text: body.questionText.en.text,
          image: body.questionText.en.image || null
        },
        ml: {
          text: body.questionText.ml.text || null,
          image: body.questionText.ml.image || null
        }
      },
      explanation: {
        en: body.explanation.en || null,
        ml: body.explanation.ml || null
      },
      options: body.options.map(option => ({
        id: option.id,
        type: option.type || 'text',
        en: option.en,
        ml: option.ml || null,
        url: option.url || null
      })),
      correctAnswer: body.correctAnswer
    };

    // Add optional fields if they exist
    if (body.subject) questionData.subject = body.subject;
    if (body.tags?.length > 0) questionData.tags = body.tags;
    if (body.exams?.length > 0) questionData.exams = body.exams;

    const question = await Question.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: questionData },
      { 
        new: true,
        runValidators: true 
      }
    ).populate('subject', 'name')
     .populate('tags', 'name')
     .populate('exams', 'name');

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Question updated successfully",
      question
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update question", details: error.message },
      { status: 500 }
    );
  }
}

// Delete question (soft delete)
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const question = await Question.findOneAndUpdate(
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

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Question deleted successfully"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete question", details: error.message },
      { status: 500 }
    );
  }
} 