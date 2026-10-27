import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MockTestsPage from "./page";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: ({ onConfirm }: { onConfirm: () => void | Promise<void> }) => {
    void onConfirm();
  },
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    mockTestsApi: {
      list: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
    },
    catalogApi: {
      ...actual.catalogApi,
      listSubjects: vi.fn(),
      listAllExams: vi.fn(),
      getSubject: vi.fn(),
      getExam: vi.fn(),
    },
  };
});

vi.mock("./api", () => ({
  topicWiseDraftsApi: {
    createDraft: vi.fn(),
    listDrafts: vi.fn(),
    discardDraft: vi.fn(),
  },
}));

import { catalogApi, mockTestsApi, type MockTest } from "@/app/services/ezprep-api";
import { topicWiseDraftsApi } from "./api";

const list = vi.mocked(mockTestsApi.list);
const createDraft = vi.mocked(topicWiseDraftsApi.createDraft);
const listDrafts = vi.mocked(topicWiseDraftsApi.listDrafts);
const remove = vi.mocked(mockTestsApi.delete);
const listSubjects = vi.mocked(catalogApi.listSubjects);
const listAllExams = vi.mocked(catalogApi.listAllExams);
const getSubject = vi.mocked(catalogApi.getSubject);
const getExam = vi.mocked(catalogApi.getExam);

function examRecord(
  id: string,
  name: string,
  subjects: { subject: string; name: string }[] = []
) {
  return {
    id,
    name,
    isSessionWise: false,
    hasMultiLingualSupport: false,
    trending: false,
    showInApp: false,
    isActive: true,
    category: "c1",
    examGroup: "g1",
    subjects: subjects.map((subject) => ({
      ...subject,
      numberOfQuestions: 10,
      marksPerQuestion: 1,
      hasNegativeMarking: false,
      negativeMarksPerQuestion: 0,
    })),
  };
}

const mockTest: MockTest = {
  id: "mt-1",
  title: "Polity Practice",
  durationInMinutes: 15,
  totalQuestions: 10,
  exam: { id: "ex-1", name: "UPSC" },
  subject: { id: "sub-1", name: "Polity" },
  topic: { id: "top-1", name: "Parliament" },
  isActive: true,
  marksPerQuestion: 1,
  negativeMarking: 0,
  allowRetake: true,
  shuffleOptions: false,
  showResultsImmediately: true,
};

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

async function waitUntilEnabled(formLabel: string) {
  await waitFor(() => {
    const label = screen.getByText(formLabel, { selector: "label" });
    const item = label.closest(".ant-form-item");
    expect(item!.querySelector(".ant-select-disabled")).toBeNull();
  });
}

function selectIn(formLabel: string) {
  const label = screen.getByText(formLabel, { selector: "label" });
  return label.closest(".ant-form-item")!.querySelector(".ant-select")!;
}

async function renderReady() {
  list.mockResolvedValue({
    message: "ok",
    data: [mockTest],
    pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
  });
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
  listAllExams.mockResolvedValue([examRecord("ex-1", "UPSC")]);
  getExam.mockResolvedValue({
    message: "ok",
    data: examRecord("ex-1", "UPSC", [{ subject: "sub-1", name: "Polity" }]),
  });
  getSubject.mockResolvedValue({
    message: "ok",
    data: {
      id: "sub-1",
      name: "Polity",
      topics: [{ id: "top-1", name: "Parliament" }],
    },
  });
  render(<MockTestsPage />);
  expect(await screen.findByText("Polity Practice")).toBeInTheDocument();
}

describe("MockTestsPage", () => {
  beforeEach(() => {
    list.mockReset();
    createDraft.mockReset();
    listDrafts.mockReset();
    remove.mockReset();
    listSubjects.mockReset();
    listAllExams.mockReset();
    getSubject.mockReset();
    getExam.mockReset();
    push.mockReset();
    listDrafts.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    });
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("lists mock tests and catalog data", async () => {
    await renderReady();
    expect(screen.getByText("Polity Practice")).toBeInTheDocument();
    expect(screen.getByText("UPSC")).toBeInTheDocument();
  });

  it("creates a topic-wise draft and opens review", async () => {
    createDraft.mockResolvedValue({
      message: "ok",
      data: { id: "draft-1" } as never,
    });
    await renderReady();

    await chooseOption("Total Questions", "10 Questions");
    await chooseOption("Duration (Minutes)", "15 Minutes");
    await chooseOption("Exam", "UPSC");
    await waitUntilEnabled("Subject");
    await chooseOption("Subject", "Polity");
    await waitFor(() => expect(getSubject).toHaveBeenCalledWith("sub-1"));
    await chooseOption("Topic", "Parliament");

    expect(screen.getByText(/Total: 10 \/ 10/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() => expect(createDraft).toHaveBeenCalled());
    expect(createDraft.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        totalQuestions: 10,
        durationInMinutes: 15,
        exam: "ex-1",
        subject: "sub-1",
        topic: "top-1",
        difficultyDistribution: { easy: 3, medium: 3, hard: 4 },
        accessMode: "FREE",
      })
    );
    expect(push).toHaveBeenCalledWith("/admin/mock-tests/drafts/draft-1");
    expect(message.success).toHaveBeenCalled();
  });

  it("limits subjects to the selected exam and topics to that subject", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
    listAllExams.mockResolvedValue([
      examRecord("ex-1", "UPSC"),
      examRecord("ex-2", "SSC"),
    ]);
    getExam.mockImplementation(async (id: string) => ({
      message: "ok",
      data:
        id === "ex-2"
          ? examRecord("ex-2", "SSC", [{ subject: "sub-2", name: "History" }])
          : examRecord("ex-1", "UPSC", [{ subject: "sub-1", name: "Polity" }]),
    }));
    getSubject.mockImplementation(async (id: string) => ({
      message: "ok",
      data: {
        id,
        name: id === "sub-2" ? "History" : "Polity",
        topics:
          id === "sub-2"
            ? [{ id: "top-2", name: "Ancient" }]
            : [{ id: "top-1", name: "Parliament" }],
      },
    }));

    render(<MockTestsPage />);
    expect(await screen.findByText("Create New Topic Wise Test")).toBeInTheDocument();
    expect(selectIn("Subject").className).toContain("ant-select-disabled");
    expect(selectIn("Topic").className).toContain("ant-select-disabled");

    await chooseOption("Exam", "UPSC");
    await waitUntilEnabled("Subject");
    await chooseOption("Subject", "Polity");
    expect(screen.queryByText("History")).not.toBeInTheDocument();
    await waitUntilEnabled("Topic");
    await chooseOption("Topic", "Parliament");
    expect(getSubject).toHaveBeenCalledWith("sub-1");

    await chooseOption("Exam", "SSC");
    await waitUntilEnabled("Subject");
    expect(selectIn("Topic").className).toContain("ant-select-disabled");
    await chooseOption("Subject", "History");
    expect(screen.queryByText("Polity")).not.toBeInTheDocument();
    await waitUntilEnabled("Topic");
    await chooseOption("Topic", "Ancient");
    expect(getSubject).toHaveBeenCalledWith("sub-2");
  });

  it("saves a new draft as entitled when the switch is on", async () => {
    createDraft.mockResolvedValue({
      message: "ok",
      data: { id: "draft-1" } as never,
    });
    await renderReady();

    await chooseOption("Total Questions", "10 Questions");
    await chooseOption("Duration (Minutes)", "15 Minutes");
    await chooseOption("Exam", "UPSC");
    await waitUntilEnabled("Subject");
    await chooseOption("Subject", "Polity");
    await waitFor(() => expect(getSubject).toHaveBeenCalledWith("sub-1"));
    await chooseOption("Topic", "Parliament");
    fireEvent.click(screen.getByRole("switch", { name: "Requires entitlement" }));
    fireEvent.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() => expect(createDraft).toHaveBeenCalled());
    expect(createDraft.mock.calls[0][0].accessMode).toBe("ENTITLED");
  });

  it("navigates to the detail page", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(push).toHaveBeenCalledWith("/admin/mock-tests/mt-1");
  });

  it("deletes a mock test after confirm", async () => {
    remove.mockResolvedValue({ message: "ok" });
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("mt-1"));
    expect(message.success).toHaveBeenCalled();
  });

  it("surfaces list, catalog, create, and delete errors", async () => {
    list.mockRejectedValue(new Error("nope"));
    listSubjects.mockRejectedValue(new Error("nope"));
    listAllExams.mockRejectedValue(new Error("nope"));

    render(<MockTestsPage />);
    await waitFor(() => expect(message.error).toHaveBeenCalled());

    list.mockResolvedValue({ message: "ok", data: [mockTest] });
    listSubjects.mockResolvedValue({ message: "ok", data: [] });
    listAllExams.mockResolvedValue([]);
    createDraft.mockRejectedValue(new Error("nope"));
    remove.mockRejectedValue(new Error("nope"));
  });

  it("surfaces a create error after a valid form submit", async () => {
    createDraft.mockRejectedValue(new Error("nope"));
    await renderReady();
    await chooseOption("Total Questions", "10 Questions");
    await chooseOption("Duration (Minutes)", "10 Minutes");
    await chooseOption("Exam", "UPSC");
    await waitUntilEnabled("Subject");
    await chooseOption("Subject", "Polity");
    fireEvent.click(screen.getByRole("button", { name: /create draft/i }));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("surfaces a delete error", async () => {
    remove.mockRejectedValue(new Error("nope"));
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("shows an empty table when the API returns no tests", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
    listSubjects.mockResolvedValue({ message: "ok", data: [] });
    listAllExams.mockResolvedValue([]);

    render(<MockTestsPage />);
    expect(await screen.findAllByText("No data")).not.toHaveLength(0);
  });
});
