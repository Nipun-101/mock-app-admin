import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BulkUploadFormPage from "./page";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    catalogApi: {
      ...actual.catalogApi,
      listSubjects: vi.fn(),
      listAllExams: vi.fn(),
      listAllTags: vi.fn(),
    },
    ezPrepApiClient: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    },
  };
});

import { catalogApi, ezPrepApiClient } from "@/app/services/ezprep-api";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";

const listSubjects = vi.mocked(catalogApi.listSubjects);
const listAllExams = vi.mocked(catalogApi.listAllExams);
const listAllTags = vi.mocked(catalogApi.listAllTags);
const apiPost = vi.mocked(ezPrepApiClient.post);

function uploadSubmitButton() {
  const button = [...document.querySelectorAll("button")].find(
    (el) => el.textContent?.trim() === "Upload"
  );
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

async function chooseOption(formLabel: string, optionText: string) {
  const label = screen.getByText(formLabel, { selector: "label" });
  const item = label.closest(".ant-form-item");
  fireEvent.mouseDown(item!.querySelector(".ant-select-selector")!);
  const option = await waitFor(() => {
    const match = [...document.querySelectorAll(".ant-select-item-option-content")].find(
      (node) => node.textContent === optionText
    );
    expect(match).toBeTruthy();
    return match!;
  });
  fireEvent.click(option);
}

async function renderReady() {
  listSubjects.mockResolvedValue({
    message: "ok",
    data: [
      {
        id: "sub-1",
        name: "Polity",
        topics: [{ id: "top-1", name: "Parliament" }],
      },
    ],
  });
  listAllExams.mockResolvedValue([
    {
      id: "ex-1",
      name: "UPSC",
      isSessionWise: false,
      hasMultiLingualSupport: false,
      isActive: true,
      category: "c1",
      examGroup: "g1",
    },
  ]);
  listAllTags.mockResolvedValue([
    { id: "tag-1", name: "GK", subject: "sub-1", topic: "top-1" },
  ]);
  render(<BulkUploadFormPage />);
  expect(await screen.findByText("Click or drag a PDF file to upload")).toBeInTheDocument();
  expect(uploadSubmitButton()).toBeInTheDocument();
}

describe("BulkUploadFormPage", () => {
  beforeEach(() => {
    listSubjects.mockReset();
    listAllExams.mockReset();
    listAllTags.mockReset();
    apiPost.mockReset();
    push.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("loads form options", async () => {
    await renderReady();
    expect(screen.getByText("Click or drag a PDF file to upload")).toBeInTheDocument();
    expect(listSubjects).toHaveBeenCalled();
    expect(listAllExams).toHaveBeenCalled();
  });

  it("requires a PDF, subject, topic, and exam", async () => {
    await renderReady();
    fireEvent.submit(document.querySelector("form")!);
    expect(await screen.findByText("Please select a subject")).toBeInTheDocument();
    expect(screen.getByText("Please select a topic")).toBeInTheDocument();
    expect(screen.getByText("Please select at least one exam")).toBeInTheDocument();
    expect(
      screen.getByText("Please upload a PDF file", { hidden: true })
    ).toBeInTheDocument();
  });

  it("rejects a non-PDF file", async () => {
    await renderReady();
    const file = new File(["hi"], "notes.txt", { type: "text/plain" });
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith("Only PDF files are accepted")
    );
  });

  it("uploads a PDF with selected catalogs", async () => {
    apiPost.mockResolvedValue({ message: "PDF uploaded successfully" });
    await renderReady();

    const file = new File(["%PDF"], "paper.pdf", { type: "application/pdf" });
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await chooseOption("Subject", "Polity");
    await chooseOption("Topic", "Parliament");
    await waitFor(() => expect(listAllTags).toHaveBeenCalled());
    await chooseOption("Associated Exams", "UPSC");

    fireEvent.click(uploadSubmitButton());

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const [path, body] = apiPost.mock.calls[0];
    expect(path).toBe("/v1/imports/upload-pdf");
    expect(body).toBeInstanceOf(FormData);
    expect(message.success).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/admin/bulk-upload");
  });

  it("surfaces lookup and upload errors", async () => {
    listSubjects.mockRejectedValue(new Error("nope"));
    listAllExams.mockRejectedValue(new Error("nope"));
    render(<BulkUploadFormPage />);
    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith("Failed to load form options")
    );
  });

  it("surfaces API upload errors", async () => {
    apiPost.mockRejectedValue(new EzPrepApiError("too large", 400, "/upload", null));
    await renderReady();

    const file = new File(["%PDF"], "paper.pdf", { type: "application/pdf" });
    fireEvent.change(document.querySelector("input[type=file]") as HTMLInputElement, {
      target: { files: [file] },
    });
    await chooseOption("Subject", "Polity");
    await chooseOption("Topic", "Parliament");
    await chooseOption("Associated Exams", "UPSC");
    fireEvent.click(uploadSubmitButton());

    await waitFor(() => expect(message.error).toHaveBeenCalledWith("too large"));
  });

  it("cancels back to the list", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(push).toHaveBeenCalledWith("/admin/bulk-upload");
  });
});
