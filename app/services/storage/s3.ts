import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

export interface S3UploadResponse {
  key: string; // S3 object key
  bucket: string; // Bucket name
  region: string; // AWS region
  url: string; // Direct S3 URL
  previewUrl: string; // Local preview URL
  contentType: string; // File MIME type
  size: number; // File size in bytes
  lastModified: Date; // Upload timestamp
}

export interface S3ObjectMetadata {
  key: string;
  bucket: string;
  region: string;
  contentType: string;
  size: number;
  lastModified: Date;
}

export async function uploadToS3(file: File): Promise<S3UploadResponse> {
  if (!process.env.NEXT_PUBLIC_AWS_REGION) {
    throw new Error("AWS Region is not configured");
  }
  if (!process.env.NEXT_PUBLIC_AWS_S3_BUCKET) {
    throw new Error("AWS S3 Bucket is not configured");
  }

  try {
    const fileExtension = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET!,
      Key: fileName,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    // Generate pre-signed URL for secure access
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET!,
      Key: fileName,
    });

    // URL expires in 1 hour (3600 seconds)
    const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 3600,
    });

    return {
      key: fileName,
      bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET!,
      region: process.env.NEXT_PUBLIC_AWS_REGION!,
      url: signedUrl,
      previewUrl: URL.createObjectURL(file),
      contentType: file.type,
      size: file.size,
      lastModified: new Date(),
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload file to S3");
  }
}

export async function generatePresignedUrl(
  metadata: S3ObjectMetadata
): Promise<string> {
  const getObjectCommand = new GetObjectCommand({
    Bucket: metadata.bucket,
    Key: metadata.key,
  });

  return await getSignedUrl(s3Client, getObjectCommand, {
    expiresIn: 3600, // 1 hour
  });
}
