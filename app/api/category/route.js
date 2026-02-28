import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Category from "@/models/Category";

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();

    const category = await Category.create({
      ...body,
      isActive: true,
      isDeleted: false,
    });

    return NextResponse.json(
      { message: "Category created successfully", category },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create category", details: error.message },
      { status: 500 }
    );
  }
}
