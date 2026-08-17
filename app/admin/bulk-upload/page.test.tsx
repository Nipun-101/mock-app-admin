import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BulkUploadPage from "./page";
import type { BulkUpload } from "./types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
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
      listTopics: vi.fn(),
      listAllExams: vi.fn(),
      getSubject: vi.fn(),
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
const listTopics = vi.mocked(catalogApi.listTopics);
const listAllExams = vi.mocked(catalogApi.listAllExams);
const getSubject = vi.mocked(catalogApi.getSubject);
const apiGet = vi.mocked(ezPrepApiClient.get);
const apiPost = vi.mocked(ezPrepApiClient.post);

function makeUpload(overrides: Partial<BulkUpload> = {}): BulkUpload {
  return {
    id: "up-1",
    title: "Polity PDF",
    filename: "polity.pdf",
    fileSize: 2048,
    status: "uploaded",
    subjectId: "sub-1",
    topicId: "top-1",
    examIds: ["ex-1", "ex-2", "ex-3"],
    s3Key: "s3/key",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

async function renderReady(uploads: BulkUpload[] = [makeUpload()]) {
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
  listTopics.mockResolvedValue({
    message: "ok",
    data: [{ id: "top-1", name: "Parliament" }],
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
    {
      id: "ex-2",
      name: "SSC",
      isSessionWise: false,
      hasMultiLingualSupport: false,
      isActive: true,
      category: "c1",
      examGroup: "g1",
    },
    {
      id: "ex-3",
      name: "State PSC",
      isSessionWise: false,
      hasMultiLingualSupport: false,
      isActive: true,
      category: "c1",
      examGroup: "g1",
    },
  ]);
  getSubject.mockResolvedValue({
    message: "ok",
    data: {
      id: "sub-1",
      name: "Polity",
      topics: [{ id: "top-1", name: "Parliament" }],
    },
  });
  apiGet.mockResolvedValue({
    message: "ok",
    data: {
      uploads,
      pagination: { page: 1, limit: 10, total: uploads.length, totalPages: 1 },
    },
  });
  render(<BulkUploadPage />);
  expect(await screen.findByText("Bulk Upload")).toBeInTheDocument();
}

describe("BulkUploadPage", () => {
  beforeEach(() => {
    listSubjects.mockReset();
    listTopics.mockReset();
    listAllExams.mockReset();
    getSubject.mockReset();
    apiGet.mockReset();
    apiPost.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.spyOn(message, "loading").mockImplementation(((() => vi.fn()) as unknown) as typeof message.loading);
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("lists uploads with status, size, and exam overflow", async () => {
    await renderReady();
    expect(screen.getByText("polity.pdf")).toBeInTheDocument();
    expect(screen.getByText("Polity PDF")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    expect(screen.getByText("Polity")).toBeInTheDocument();
    expect(screen.getByText("Parliament")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload" })).toHaveAttribute(
      "href",
      "/admin/bulk-upload/upload"
    );
    expect(apiGet).toHaveBeenCalledWith(
      "/v1/imports/uploads",
      expect.objectContaining({
        searchParams: expect.objectContaining({ page: 1, limit: 10 }),
      })
    );
  });

  it("shows parse, enrich, import, retry, and processing actions by status", async () => {
    await renderReady([
      makeUpload({ id: "u1", filename: "a.pdf", status: "uploaded" }),
      makeUpload({ id: "u2", filename: "b.pdf", status: "parsing" }),
      makeUpload({ id: "u3", filename: "c.pdf", status: "parsed" }),
      makeUpload({ id: "u4", filename: "d.pdf", status: "processing" }),
      makeUpload({ id: "u5", filename: "e.pdf", status: "enriched" }),
      makeUpload({ id: "u6", filename: "f.pdf", status: "completed" }),
      makeUpload({
        id: "u7",
        filename: "g.pdf",
        status: "failed",
        errorMessage: "Could not parse",
      }),
    ]);

    expect(screen.getByRole("button", { name: "Parse PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Parsing..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "AI Enrich" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Processing..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add to Question Bank" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByText("Could not parse")).toBeInTheDocument();
    expect(screen.queryByText("f.pdf")?.closest("tr")?.querySelector("button")).toBeNull();
  });

  it("starts PDF parsing", async () => {
    apiPost.mockResolvedValue({ message: "Parsing started" });
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Parse PDF" }));
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith(
        "/v1/imports/parse-pdf/up-1",
        expect.any(Object)
      )
    );
    expect(message.success).toHaveBeenCalled();
  });

  it("starts AI enrichment", async () => {
    apiPost.mockResolvedValue({ message: "Enrichment started" });
    await renderReady([makeUpload({ status: "parsed" })]);
    fireEvent.click(screen.getByRole("button", { name: "AI Enrich" }));
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith(
        "/v1/imports/enrich/up-1",
        expect.any(Object)
      )
    );
  });

  it("imports questions and shows the processing modal", async () => {
    apiPost.mockResolvedValue({
      message: "Imported",
      data: { summary: "12 questions imported" },
    });
    await renderReady([makeUpload({ status: "enriched" })]);
    fireEvent.click(screen.getByRole("button", { name: "Add to Question Bank" }));
    expect(await screen.findByText("Importing Questions")).toBeInTheDocument();
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith("/v1/imports/questions/up-1")
    );
  });

  it("searches by file name", async () => {
    await renderReady();
    const search = screen.getByPlaceholderText("Search by file name");
    fireEvent.change(search, { target: { value: "polity" } });
    fireEvent.keyDown(search, { key: "Enter", code: "Enter" });
    await waitFor(() =>
      expect(apiGet).toHaveBeenCalledWith(
        "/v1/imports/uploads",
        expect.objectContaining({
          searchParams: expect.objectContaining({ search: "polity" }),
        })
      )
    );
  });

  it("surfaces list and lookup errors", async () => {
    listSubjects.mockRejectedValue(new Error("nope"));
    listTopics.mockRejectedValue(new Error("nope"));
    listAllExams.mockRejectedValue(new Error("nope"));
    apiGet.mockRejectedValue(new EzPrepApiError("boom", 500, "/v1/imports/uploads", null));

    render(<BulkUploadPage />);
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("surfaces action errors", async () => {
    apiPost.mockRejectedValue(new EzPrepApiError("parse failed", 400, "/parse", null));
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Parse PDF" }));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });
});
