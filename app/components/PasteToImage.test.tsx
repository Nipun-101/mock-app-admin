import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasImageUploader, uploadPastedImage } from "@/app/components/ImageUpload";
import { PasteHint, PasteToImage } from "./PasteToImage";

vi.mock("@/app/components/ImageUpload", () => ({
  hasImageUploader: vi.fn(),
  uploadPastedImage: vi.fn(),
}));

const hasUploader = vi.mocked(hasImageUploader);
const uploadPasted = vi.mocked(uploadPastedImage);

function pngFile(name = "photo.png") {
  return new File(["png"], name, { type: "image/png" });
}

function pasteData(file: File | null, extra?: { text?: string; asItem?: boolean }) {
  const items = file
    ? [
        {
          kind: extra?.asItem === false ? "string" : "file",
          type: file.type,
          getAsFile: () => (extra?.asItem === false ? null : file),
        },
      ]
    : [];

  return {
    clipboardData: {
      items,
      files: file ? [file] : [],
      getData: () => extra?.text ?? "",
    },
  };
}

describe("PasteHint", () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
  });

  it("shows the default Ctrl+V hint outside a paste context", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });

    render(<PasteHint />);

    expect(
      screen.getByText("You can paste an image (Ctrl+V) here to attach it")
    ).toBeInTheDocument();
  });

  it("uses the Mac shortcut when the user agent is a Mac", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });

    render(<PasteHint />);

    expect(
      screen.getByText("You can paste an image (⌘V) here to attach it")
    ).toBeInTheDocument();
  });
});

describe("PasteToImage", () => {
  beforeEach(() => {
    hasUploader.mockReset();
    uploadPasted.mockReset();
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.success).mockClear();
  });

  it("renders an inline paste target without a zone role or footer hint", () => {
    render(
      <PasteToImage target={["image"]}>
        <input aria-label="caption" />
      </PasteToImage>
    );

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Click this box, then paste/)
    ).not.toBeInTheDocument();
  });

  it("renders a zone with a paste hint and group label", () => {
    render(
      <PasteToImage target={["image"]} variant="zone">
        <span>Question image</span>
      </PasteToImage>
    );

    expect(screen.getByRole("group")).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/Paste target/)
    );
    expect(
      screen.getByText(/Click this box, then paste/)
    ).toBeInTheDocument();
  });

  it("uploads a pasted image when an uploader exists", async () => {
    hasUploader.mockReturnValue(true);
    uploadPasted.mockResolvedValue(true);

    render(
      <PasteToImage target={["image"]}>
        <PasteHint />
      </PasteToImage>
    );

    fireEvent.paste(screen.getByText(/You can paste an image/), pasteData(pngFile()));

    expect(await screen.findByText("Image added from clipboard")).toBeInTheDocument();
    expect(uploadPasted).toHaveBeenCalledWith(["image"], expect.any(File));
    expect(message.success).toHaveBeenCalledWith("Image added from clipboard");
  });

  it("ignores non-image clipboard files", async () => {
    hasUploader.mockReturnValue(true);
    const textFile = new File(["hi"], "note.txt", { type: "text/plain" });

    render(
      <PasteToImage target={["image"]} variant="zone">
        <span>drop</span>
      </PasteToImage>
    );

    fireEvent.paste(screen.getByRole("group"), pasteData(textFile));

    await waitFor(() => expect(uploadPasted).not.toHaveBeenCalled());
    expect(screen.queryByText("Image added from clipboard")).not.toBeInTheDocument();
  });

  it("does not upload when no image uploader is registered", async () => {
    hasUploader.mockReturnValue(false);

    render(
      <PasteToImage target={["image"]} variant="zone">
        <span>drop</span>
      </PasteToImage>
    );

    fireEvent.paste(screen.getByRole("group"), pasteData(pngFile()));

    await waitFor(() => expect(uploadPasted).not.toHaveBeenCalled());
  });

  it("renames a blob clipboard image before uploading", async () => {
    hasUploader.mockReturnValue(true);
    uploadPasted.mockResolvedValue(true);

    render(
      <PasteToImage target={["image"]} variant="zone">
        <span>drop</span>
      </PasteToImage>
    );

    fireEvent.paste(
      screen.getByRole("group"),
      pasteData(new File(["png"], "blob", { type: "image/png" }))
    );

    await waitFor(() => expect(uploadPasted).toHaveBeenCalled());
    const file = uploadPasted.mock.calls[0]?.[1] as File;
    expect(file.name).toBe("pasted-image.png");
  });
});
