import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Question from "@/models/Question";

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();

    console.log("XXX", body);

    // Validate required fields
    // if (!body.questionText?.en?.text) {
    //   return NextResponse.json(
    //     { error: "Question text in English is required" },
    //     { status: 400 }
    //   );
    // }

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

    // Create question with validated data
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

    console.log("XXX >>>>>>", questionData);

    const question = await Question.create(questionData);

    // Populate references for response if they exist
    const populateFields = [];
    if (question.subject) populateFields.push({ path: 'subject', select: 'name' });
    if (question.tags?.length > 0) populateFields.push({ path: 'tags', select: 'name' });
    if (question.exams?.length > 0) populateFields.push({ path: 'exams', select: 'name' });

    if (populateFields.length > 0) {
      await question.populate(populateFields);
    }
    
    return NextResponse.json(
      { 
        message: "Question created successfully", 
        question 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating question:', error);
    console.log("XXX error", error);
    return NextResponse.json(
      { 
        error: "Failed to create question", 
        details: error.message 
      },
      { status: 500 }
    );
  }
} 