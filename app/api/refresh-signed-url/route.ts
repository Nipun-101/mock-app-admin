import { NextResponse } from "next/server";
import { generatePresignedUrl } from "@/app/services/storage/s3";

export async function POST(request: Request) {
  try {
    const metadata = await request.json();

    if (!metadata.key || !metadata.bucket) {
      return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
    }

    const url = await generatePresignedUrl(metadata);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate pre-signed URL" },
      { status: 500 }
    );
  }
}
