import { NextResponse } from "next/server";
import Tag from "@/models/Tag";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    const tag = await Tag.create({
      ...body,
      isActive: true,
      isDeleted: false
    });
    
    return NextResponse.json(
      { message: "Tag created successfully", tag },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create tag", details: error.message },
      { status: 500 }
    );
  }
} 