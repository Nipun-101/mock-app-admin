import { NextResponse } from "next/server";
import Topic from "@/models/Topic";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    const topic = await Topic.create({
      ...body,
      isActive: true,
      isDeleted: false
    });
    
    return NextResponse.json(
      { message: "Topic created successfully", topic },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create topic", details: error.message },
      { status: 500 }
    );
  }
} 
