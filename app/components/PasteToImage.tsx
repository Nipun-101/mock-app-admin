"use client";

import { FileImageOutlined } from "@ant-design/icons";
import { message } from "antd";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type ReactNode,
} from "react";
import { hasImageUploader, uploadPastedImage } from "@/app/components/ImageUpload";
import { cn } from "@/lib/utils";

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

function pasteShortcut() {
  if (typeof navigator === "undefined") {
    return "Ctrl+V";
  }
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘V" : "Ctrl+V";
}

const PasteHintContext = createContext<{
  pasted: boolean;
  hintText: string;
} | null>(null);

export function PasteHint({ className }: { className?: string }) {
  const ctx = useContext(PasteHintContext);
  const shortcut = pasteShortcut();
  const hintText = ctx?.hintText ?? `You can paste an image (${shortcut}) here to attach it`;
  const pasted = ctx?.pasted ?? false;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs leading-snug text-neutral-500",
        className
      )}
    >
      <FileImageOutlined aria-hidden />
      <span>{pasted ? "Image added from clipboard" : hintText}</span>
    </span>
  );
}

export function PasteToImage({
  target,
  children,
  className,
  variant = "inline",
  hint,
}: {
  target: (string | number)[];
  children: ReactNode;
  className?: string;
  variant?: "inline" | "zone";
  hint?: boolean | string;
}) {
  const [pasted, setPasted] = useState(false);
  const pastedTimer = useRef<number | undefined>(undefined);
  const shortcut = pasteShortcut();
  const hintText =
    typeof hint === "string"
      ? hint
      : variant === "zone"
        ? `Click this box, then paste (${shortcut}) an image`
        : `You can paste an image (${shortcut}) here to attach it`;
  const showFooterHint = variant === "zone" && hint !== false;
  const contextValue = useMemo(
    () => ({ pasted, hintText }),
    [pasted, hintText]
  );

  useEffect(
    () => () => {
      window.clearTimeout(pastedTimer.current);
    },
    []
  );

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = clipboardImageFile(event);
    if (!file || !hasImageUploader(target)) {
      return;
    }

    const pastedText = event.clipboardData.getData("text/plain").trim();
    if (!pastedText) {
      event.preventDefault();
    }

    void uploadPastedImage(target, file).then((uploaded) => {
      if (!uploaded) {
        return;
      }
      window.clearTimeout(pastedTimer.current);
      setPasted(true);
      message.success("Image added from clipboard");
      pastedTimer.current = window.setTimeout(() => setPasted(false), 1800);
    });
  };

  return (
    <PasteHintContext.Provider value={contextValue}>
      <div
        tabIndex={-1}
        role={variant === "zone" ? "group" : undefined}
        aria-label={
          variant === "zone" ? `Paste target. ${hintText}` : undefined
        }
        onPaste={onPaste}
        onMouseDown={(event) => {
          if (variant !== "zone") {
            return;
          }
          const interactive = (event.target as HTMLElement).closest(
            "input, textarea, button, a, .ant-upload-list"
          );
          if (!interactive) {
            event.currentTarget.focus();
          }
        }}
        className={cn(
          "outline-none",
          variant === "zone" &&
            cn(
              "rounded-md border border-dashed border-neutral-300 bg-neutral-50/90",
              "transition-colors hover:border-blue-400 hover:bg-blue-50/40",
              "focus-within:border-solid focus-within:border-blue-500 focus-within:bg-blue-50/50",
              "[&_.ant-form-item]:mb-2",
              pasted && "border-solid border-green-500 bg-green-50/70"
            ),
          className
        )}
      >
        {children}
        {showFooterHint ? (
          <p className="mb-0 mt-2 flex items-center gap-1.5 text-xs leading-snug text-neutral-500">
            <FileImageOutlined aria-hidden />
            <span>{pasted ? "Image added from clipboard" : hintText}</span>
          </p>
        ) : null}
      </div>
    </PasteHintContext.Provider>
  );
}
