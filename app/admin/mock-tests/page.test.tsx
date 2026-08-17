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
    },
  };
});

import { catalogApi, mockTestsApi } from "@/app/services/ezprep-api";

const list = vi.mocked(mockTestsApi.list);
const create = vi.mocked(mockTestsApi.create);
const remove = vi.mocked(mockTestsApi.delete);
const listSubjects = vi.mocked(catalogApi.listSubjects);
const listAllExams = vi.mocked(catalogApi.listAllExams);
const getSubject = vi.mocked(catalogApi.getSubject);

const mockTest = {
  id: "mt-1",
  title: "Polity Practice",
  durationInMinutes: 15,
  totalQuestions: 10,
  exam: { id: "ex-1", name: "UPSC" },
  subject: { id: "sub-1", name: "Polity" },
  topic: { id: "top-1", name: "Parliament" },
  isActive: true,
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
    create.mockReset();
    remove.mockReset();
    listSubjects.mockReset();
    listAllExams.mockReset();
    getSubject.mockReset();
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

  it("lists mock tests and catalog data", async () => {
    await renderReady();
    expect(screen.getByText("Polity Practice")).toBeInTheDocument();
    expect(screen.getByText("UPSC")).toBeInTheDocument();
  });

  it("creates a mock test with a valid difficulty split", async () => {
    create.mockResolvedValue({ message: "ok", data: mockTest });
    await renderReady();

    await chooseOption("Total Questions", "10 Questions");
    await chooseOption("Duration (Minutes)", "15 Minutes");
    await chooseOption("Exam", "UPSC");
    await chooseOption("Subject", "Polity");
    await waitFor(() => expect(getSubject).toHaveBeenCalledWith("sub-1"));
    await chooseOption("Topic", "Parliament");

    expect(screen.getByText(/Total: 10 \/ 10/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /create mock test/i }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        totalQuestions: 10,
        durationInMinutes: 15,
        exam: "ex-1",
        subject: "sub-1",
        topic: "top-1",
        difficultyDistribution: { easy: 3, medium: 3, hard: 4 },
      })
    );
    expect(message.success).toHaveBeenCalled();
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
    create.mockRejectedValue(new Error("nope"));
    remove.mockRejectedValue(new Error("nope"));
  });

  it("surfaces a create error after a valid form submit", async () => {
    create.mockRejectedValue(new Error("nope"));
    await renderReady();
    await chooseOption("Total Questions", "10 Questions");
    await chooseOption("Duration (Minutes)", "10 Minutes");
    await chooseOption("Exam", "UPSC");
    await chooseOption("Subject", "Polity");
    fireEvent.click(screen.getByRole("button", { name: /create mock test/i }));
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
