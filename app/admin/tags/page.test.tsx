import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Subject, Tag } from "@/app/services/ezprep-api";
import TagsPage from "./page";

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
      listTags: vi.fn(),
      listSubjects: vi.fn(),
      createTag: vi.fn(),
      deleteTag: vi.fn(),
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

const listTags = vi.mocked(catalogApi.listTags);
const listSubjects = vi.mocked(catalogApi.listSubjects);
const createTag = vi.mocked(catalogApi.createTag);
const deleteTag = vi.mocked(catalogApi.deleteTag);

const pagination = {
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

function makeSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: "sub-1",
    name: "Mathematics",
    topics: [{ id: "top-1", name: "Algebra" }],
    isActive: true,
    ...overrides,
  };
}

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: "tag-1",
    name: "Easy",
    description: "Beginner",
    subject: "sub-1",
    topic: "top-1",
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

describe("TagsPage", { timeout: 15000 }, () => {
  beforeEach(() => {
    mockWideViewport();
    listTags.mockReset();
    listSubjects.mockReset();
    createTag.mockReset();
    deleteTag.mockReset();
    push.mockReset();
    vi.mocked(showConfirmModal).mockClear();
    listSubjects.mockResolvedValue({ message: "ok", data: [makeSubject()] });
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("renders tags returned by the API", async () => {
    listTags.mockResolvedValue({
      message: "ok",
      data: [
        makeTag(),
        makeTag({
          id: "tag-2",
          name: "Hard",
          description: undefined,
          subject: { id: "sub-1", name: "Mathematics" },
          topic: { id: "top-1", name: "Algebra" },
        }),
        makeTag({
          id: "tag-3",
          name: "Unknown",
          subject: "missing",
          topic: "",
        }),
      ],
      pagination: { ...pagination, total: 3 },
    });

    render(<TagsPage />);

    await findRow("Easy");
    expect(screen.getAllByText("Hard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beginner").length).toBeGreaterThan(0);
    await findRow("Mathematics");
    expect(screen.getAllByText("Algebra").length).toBeGreaterThan(0);
    expect(screen.getByText("Add New Tag")).toBeInTheDocument();
    expect(listTags).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it("shows an empty table when there are no tags", async () => {
    listTags.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });

    render(<TagsPage />);

    expect(await findEmpty()).toBeInTheDocument();
  });

  it("treats a missing data array as an empty list", async () => {
    listTags.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Tag[],
    });
    listSubjects.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Subject[],
    });

    render(<TagsPage />);

    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces list errors without rendering leaked rows", async () => {
    listTags.mockRejectedValue(new Error("nope"));

    render(<TagsPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.queryAllByText("Easy")).toHaveLength(0);
  });

  it("surfaces subject list errors", async () => {
    listTags.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });
    listSubjects.mockRejectedValue(new Error("nope"));

    render(<TagsPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("creates a tag after selecting subject and topic", async () => {
    listTags
      .mockResolvedValueOnce({
        message: "ok",
        data: [],
        pagination: { ...pagination, total: 0 },
      })
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeTag({ id: "tag-2", name: "Medium" })],
        pagination,
      });
    createTag.mockResolvedValue({
      message: "ok",
      data: makeTag({ id: "tag-2", name: "Medium" }),
    });

    render(<TagsPage />);
    await findEmpty();

    fireEvent.change(screen.getByPlaceholderText("Enter tag name"), {
      target: { value: "Medium" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter tag description"), {
      target: { value: "Mid" },
    });
    await chooseSelectOption("Select subject", "Mathematics");
    await chooseSelectOption("Select topic", "Algebra");
    fireEvent.click(screen.getByRole("button", { name: /create tag/i }));

    await waitFor(() =>
      expect(createTag).toHaveBeenCalledWith({
        name: "Medium",
        description: "Mid",
        subject: "sub-1",
        topic: "top-1",
      })
    );
    expect(message.success).toHaveBeenCalledWith("Tag created successfully");
    await findRow("Medium");
  });

  it("keeps the topic select disabled until a subject is chosen", async () => {
    listTags.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });

    render(<TagsPage />);
    await screen.findByText("Please select a subject first");

    const topicSelect = screen
      .getByText("Please select a subject first")
      .closest(".ant-select");
    expect(topicSelect).toHaveClass("ant-select-disabled");
  });

  it("shows validation errors when required fields are missing", async () => {
    listTags.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });

    render(<TagsPage />);
    await findEmpty();
    fireEvent.click(screen.getByRole("button", { name: /create tag/i }));

    expect(await screen.findByText("Please enter tag name")).toBeInTheDocument();
    expect(screen.getByText("Please select a subject")).toBeInTheDocument();
    expect(screen.getByText("Please select a topic")).toBeInTheDocument();
    expect(createTag).not.toHaveBeenCalled();
  });

  it("surfaces create errors", async () => {
    listTags.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });
    createTag.mockRejectedValue(new Error("nope"));

    render(<TagsPage />);
    await findEmpty();
    fireEvent.change(screen.getByPlaceholderText("Enter tag name"), {
      target: { value: "Medium" },
    });
    await chooseSelectOption("Select subject", "Mathematics");
    await chooseSelectOption("Select topic", "Algebra");
    fireEvent.click(screen.getByRole("button", { name: /create tag/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("navigates to the edit page", async () => {
    listTags.mockResolvedValue({
      message: "ok",
      data: [makeTag()],
      pagination,
    });

    render(<TagsPage />);
    await findRow("Easy");
    clickFirst(/edit/i);
    expect(push).toHaveBeenCalledWith("/admin/tags/tag-1");
  });

  it("deletes a tag after confirm", async () => {
    listTags
      .mockResolvedValueOnce({ message: "ok", data: [makeTag()], pagination })
      .mockResolvedValueOnce({
        message: "ok",
        data: [],
        pagination: { ...pagination, total: 0 },
      });
    deleteTag.mockResolvedValue({ message: "ok", data: makeTag() });

    render(<TagsPage />);
    await findRow("Easy");
    clickFirst(/delete/i);

    expect(showConfirmModal).toHaveBeenCalled();
    await waitFor(() => expect(deleteTag).toHaveBeenCalledWith("tag-1"));
    expect(message.success).toHaveBeenCalledWith("Tag deleted successfully");
    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces delete errors", async () => {
    listTags.mockResolvedValue({
      message: "ok",
      data: [makeTag()],
      pagination,
    });
    deleteTag.mockRejectedValue(new Error("nope"));

    render(<TagsPage />);
    await findRow("Easy");
    clickFirst(/delete/i);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getAllByText("Easy").length).toBeGreaterThan(0);
  });

  it("paginates to the next page", async () => {
    listTags
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeTag()],
        pagination: { ...pagination, total: 30, totalPages: 3, hasNextPage: true },
      })
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeTag({ id: "tag-2", name: "Hard" })],
        pagination: { ...pagination, page: 2, total: 30, totalPages: 3 },
      });

    render(<TagsPage />);
    await findRow("Easy");
    fireEvent.click(screen.getByRole("listitem", { name: "2" }));

    await waitFor(() =>
      expect(listTags).toHaveBeenCalledWith({ page: 2, limit: 10 })
    );
    await findRow("Hard");
  });

  it("clears topics when the selected subject has none", async () => {
    listSubjects.mockResolvedValue({
      message: "ok",
      data: [
        makeSubject(),
        makeSubject({ id: "sub-2", name: "English", topics: undefined as unknown as Subject["topics"] }),
      ],
    });
    listTags.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });

    render(<TagsPage />);
    await findEmpty();
    await chooseSelectOption("Select subject", "English");

    expect(await screen.findByText("Select topic")).toBeInTheDocument();
  });
});
