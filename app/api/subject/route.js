import { NextResponse } from "next/server";
import Subject from "@/models/Subject";

export async function POST(request) {
  try {
    const body = await request.json();
    console.log(body);
    
    const subject = await Subject.create({
      ...body,
      isActive: true,
      isDeleted: false
    });
    
    return NextResponse.json(
      { message: "Subject created successfully", subject },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create subject", details: error.message },
      { status: 500 }
    );
  }
} 