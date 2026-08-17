import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, ExamGroup } from "@/app/services/ezprep-api";
import ExamGroupsPage from "./page";

const { push, replace, refresh } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    catalogApi: {
      listExamGroups: vi.fn(),
      listActiveCategories: vi.fn(),
      createExamGroup: vi.fn(),
      deleteExamGroup: vi.fn(),
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh }),
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: vi.fn(({ onConfirm }: { onConfirm: () => void }) => onConfirm()),
}));

import { catalogApi } from "@/app/services/ezprep-api";
import { showConfirmModal } from "@/components/ConfirmModal";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

function findEmpty() {
  return screen.findByText("No data", { selector: ".ant-empty-description" });
}


function findRow(text: string) {
  return screen.findAllByText(text, {}, { timeout: 10000 }).then((els) => {
    expect(els.length).toBeGreaterThan(0);
    return els[0];
  });
}

function clickFirst(name: RegExp) {
  fireEvent.click(screen.getAllByRole("button", { name })[0]);
}

function mockWideViewport() {
  window.matchMedia = (query: string) =>
    ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

const listExamGroups = vi.mocked(catalogApi.listExamGroups);
const listActiveCategories = vi.mocked(catalogApi.listActiveCategories);
const createExamGroup = vi.mocked(catalogApi.createExamGroup);
const deleteExamGroup = vi.mocked(catalogApi.deleteExamGroup);

const pagination = {
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "Staff Selection Commission",
    shortName: "SSC",
    isActive: true,
    ...overrides,
  };
}

function makeExamGroup(overrides: Partial<ExamGroup> = {}): ExamGroup {
  return {
    id: "eg-1",
    name: "Combined Graduate Level",
    shortName: "CGL",
    category: makeCategory(),
    description: "Tiered exam",
    isActive: true,
    ...overrides,
  };
}

async function chooseSelectOption(placeholder: string, optionLabel: string) {
  const placeholderNode = await screen.findByText(placeholder);
  const selector = placeholderNode.closest(".ant-select")?.querySelector(
    ".ant-select-selector"
  );
  expect(selector).toBeTruthy();
  fireEvent.mouseDown(selector!);
  const option = await screen.findByText(optionLabel, {
    selector: ".ant-select-item-option-content",
  });
  fireEvent.click(option);
}

describe("ExamGroupsPage", { timeout: 15000 }, () => {
  beforeEach(() => {
    mockWideViewport();
    listExamGroups.mockReset();
    listActiveCategories.mockReset();
    createExamGroup.mockReset();
    deleteExamGroup.mockReset();
    push.mockReset();
    vi.mocked(showConfirmModal).mockClear();
    listActiveCategories.mockResolvedValue({
      message: "ok",
      data: [makeCategory()],
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

  it("renders exam groups returned by the API", async () => {
    listExamGroups.mockResolvedValue({
      message: "ok",
      data: [
        makeExamGroup(),
        makeExamGroup({
          id: "eg-2",
          name: "CHSL",
          shortName: "CHSL",
          category: "cat-1",
          description: undefined,
        }),
        makeExamGroup({
          id: "eg-3",
          name: "Nameless Cat",
          category: { id: "cat-1", name: "", shortName: "SSC", isActive: true },
        }),
      ],
      pagination: { ...pagination, total: 3 },
    });

    render(<ExamGroupsPage />);

    await findRow("Combined Graduate Level");
    expect(screen.getAllByText("CHSL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Staff Selection Commission").length).toBeGreaterThan(0);
    expect(screen.getByText("Add New Exam Group")).toBeInTheDocument();
    expect(listExamGroups).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it("shows an empty table when there are no exam groups", async () => {
    listExamGroups.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });

    render(<ExamGroupsPage />);

    expect(await findEmpty()).toBeInTheDocument();
  });

  it("treats a missing data array as an empty list", async () => {
    listExamGroups.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as ExamGroup[],
    });
    listActiveCategories.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Category[],
    });

    render(<ExamGroupsPage />);

    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces list errors without rendering leaked rows", async () => {
    listExamGroups.mockRejectedValue(new Error("nope"));

    render(<ExamGroupsPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.queryAllByText("Combined Graduate Level")).toHaveLength(0);
  });

  it("surfaces category list errors", async () => {
    listExamGroups.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });
    listActiveCategories.mockRejectedValue(new Error("nope"));

    render(<ExamGroupsPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("creates an exam group after selecting a category", async () => {
    listExamGroups
      .mockResolvedValueOnce({
        message: "ok",
        data: [],
        pagination: { ...pagination, total: 0 },
      })
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeExamGroup({ id: "eg-2", name: "CHSL", shortName: "CHSL" })],
        pagination,
      });
    createExamGroup.mockResolvedValue({
      message: "ok",
      data: makeExamGroup({ id: "eg-2", name: "CHSL" }),
    });

    render(<ExamGroupsPage />);
    await findEmpty();

    fireEvent.change(screen.getByPlaceholderText("e.g. Combined Graduate Level"), {
      target: { value: "CHSL" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. CGL"), {
      target: { value: "CHSL" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter exam group description"), {
      target: { value: "10+2" },
    });
    await chooseSelectOption(
      "Select category",
      "Staff Selection Commission (SSC)"
    );
    fireEvent.click(screen.getByRole("button", { name: /create exam group/i }));

    await waitFor(() =>
      expect(createExamGroup).toHaveBeenCalledWith({
        name: "CHSL",
        shortName: "CHSL",
        category: "cat-1",
        description: "10+2",
      })
    );
    expect(message.success).toHaveBeenCalledWith("Exam group created successfully");
    await findRow("CHSL");
  });

  it("shows validation errors when required fields are missing", async () => {
    listExamGroups.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });

    render(<ExamGroupsPage />);
    await findEmpty();
    fireEvent.click(screen.getByRole("button", { name: /create exam group/i }));

    expect(await screen.findByText("Please enter exam group name")).toBeInTheDocument();
    expect(screen.getByText("Please select a category")).toBeInTheDocument();
    expect(createExamGroup).not.toHaveBeenCalled();
  });

  it("surfaces create errors", async () => {
    listExamGroups.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });
    createExamGroup.mockRejectedValue(new Error("nope"));

    render(<ExamGroupsPage />);
    await findEmpty();
    fireEvent.change(screen.getByPlaceholderText("e.g. Combined Graduate Level"), {
      target: { value: "CHSL" },
    });
    await chooseSelectOption(
      "Select category",
      "Staff Selection Commission (SSC)"
    );
    fireEvent.click(screen.getByRole("button", { name: /create exam group/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("navigates to the edit page", async () => {
    listExamGroups.mockResolvedValue({
      message: "ok",
      data: [makeExamGroup()],
      pagination,
    });

    render(<ExamGroupsPage />);
    await findRow("Combined Graduate Level");
    clickFirst(/edit/i);
    expect(push).toHaveBeenCalledWith("/admin/exam-groups/eg-1");
  });

  it("deletes an exam group after confirm", async () => {
    listExamGroups
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeExamGroup()],
        pagination,
      })
      .mockResolvedValueOnce({
        message: "ok",
        data: [],
        pagination: { ...pagination, total: 0 },
      });
    deleteExamGroup.mockResolvedValue({ message: "ok", data: makeExamGroup() });

    render(<ExamGroupsPage />);
    await findRow("Combined Graduate Level");
    clickFirst(/delete/i);

    expect(showConfirmModal).toHaveBeenCalled();
    await waitFor(() => expect(deleteExamGroup).toHaveBeenCalledWith("eg-1"));
    expect(message.success).toHaveBeenCalledWith("Exam group deleted successfully");
    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces delete errors", async () => {
    listExamGroups.mockResolvedValue({
      message: "ok",
      data: [makeExamGroup()],
      pagination,
    });
    deleteExamGroup.mockRejectedValue(new Error("nope"));

    render(<ExamGroupsPage />);
    await findRow("Combined Graduate Level");
    clickFirst(/delete/i);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getAllByText("Combined Graduate Level").length).toBeGreaterThan(0);
  });

  it("paginates to the next page", async () => {
    listExamGroups
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeExamGroup()],
        pagination: { ...pagination, total: 30, totalPages: 3, hasNextPage: true },
      })
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeExamGroup({ id: "eg-2", name: "CHSL" })],
        pagination: { ...pagination, page: 2, total: 30, totalPages: 3 },
      });

    render(<ExamGroupsPage />);
    await findRow("Combined Graduate Level");
    fireEvent.click(screen.getByRole("listitem", { name: "2" }));

    await waitFor(() =>
      expect(listExamGroups).toHaveBeenCalledWith({ page: 2, limit: 10 })
    );
    await findRow("CHSL");
  });
});
