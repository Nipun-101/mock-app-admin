"use client";

import type { ClipboardEvent, ReactNode } from "react";
import { hasImageUploader, uploadPastedImage } from "@/app/components/ImageUpload";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

function clipboardImageFile(event: ClipboardEvent): File | null {
  const data = event.clipboardData;
  if (!data) {
    return null;
  }

  for (const item of Array.from(data.items)) {
    if (item.kind !== "file" || !ACCEPTED_IMAGE_TYPES.has(item.type)) {
      continue;
    }
    const file = item.getAsFile();
    if (!file) {
      continue;
    }
    if (file.name && file.name !== "blob") {
      return file;
    }
    const ext = file.type === "image/jpeg" ? "jpg" : "png";
    return new File([file], `pasted-image.${ext}`, { type: file.type });
  }

  for (const file of Array.from(data.files)) {
    if (ACCEPTED_IMAGE_TYPES.has(file.type)) {
      return file;
    }
  }

  return null;
}

export function PasteToImage({
  target,
  children,
  className,
}: {
  target: (string | number)[];
  children: ReactNode;
  className?: string;
}) {
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = clipboardImageFile(event);
    if (!file || !hasImageUploader(target)) {
      return;
    }

    const pastedText = event.clipboardData.getData("text/plain").trim();
    if (!pastedText) {
      event.preventDefault();
    }

    void uploadPastedImage(target, file);
  };

  return (
    <div tabIndex={-1} onPaste={onPaste} className={className}>
      {children}
    </div>
  );
}
