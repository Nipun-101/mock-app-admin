import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb"; 
import Exam from "@/models/Exam";

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    
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
