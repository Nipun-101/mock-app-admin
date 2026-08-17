import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/app/services/ezprep-api";
import CategoriesPage from "./page";

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
      listCategories: vi.fn(),
      createCategory: vi.fn(),
      deleteCategory: vi.fn(),
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

const listCategories = vi.mocked(catalogApi.listCategories);
const createCategory = vi.mocked(catalogApi.createCategory);
const deleteCategory = vi.mocked(catalogApi.deleteCategory);

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
    id: "c1",
    name: "Staff Selection Commission",
    shortName: "SSC",
    description: "Central exams",
    imageUrl: "https://example.com/ssc.png",
    isActive: true,
    ...overrides,
  };
}

describe("CategoriesPage", { timeout: 15000 }, () => {
  beforeEach(() => {
    mockWideViewport();
    listCategories.mockReset();
    createCategory.mockReset();
    deleteCategory.mockReset();
    push.mockReset();
    vi.mocked(showConfirmModal).mockClear();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("renders categories returned by the API", async () => {
    listCategories.mockResolvedValue({
      message: "ok",
      data: [makeCategory(), makeCategory({ id: "c2", name: "UPSC", shortName: "UPSC", imageUrl: undefined })],
      pagination: { ...pagination, total: 2 },
    });

    render(<CategoriesPage />);

    await findRow("Staff Selection Commission");
    expect(screen.getAllByText("UPSC").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SSC").length).toBeGreaterThan(0);
    expect(screen.getByAltText("category")).toHaveAttribute(
      "src",
      "https://example.com/ssc.png"
    );
    expect(screen.getByText("Add New Category")).toBeInTheDocument();
    expect(listCategories).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it("shows an empty table when there are no categories", async () => {
    listCategories.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });

    render(<CategoriesPage />);

    expect(await findEmpty()).toBeInTheDocument();
  });

  it("treats a missing data array as an empty list", async () => {
    listCategories.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Category[],
    });

    render(<CategoriesPage />);

    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces list errors without rendering leaked rows", async () => {
    listCategories.mockRejectedValue(new Error("nope"));

    render(<CategoriesPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.queryAllByText("Staff Selection Commission")).toHaveLength(0);
  });

  it("creates a category and refreshes the list", async () => {
    listCategories
      .mockResolvedValueOnce({ message: "ok", data: [], pagination: { ...pagination, total: 0 } })
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeCategory({ id: "c2", name: "Railways", shortName: "RRB" })],
        pagination,
      });
    createCategory.mockResolvedValue({
      message: "ok",
      data: makeCategory({ id: "c2", name: "Railways", shortName: "RRB" }),
    });

    render(<CategoriesPage />);
    await findEmpty();

    fireEvent.change(screen.getByPlaceholderText("e.g. Staff Selection Commission"), {
      target: { value: "Railways" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. SSC"), {
      target: { value: "RRB" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter image URL"), {
      target: { value: "https://example.com/rrb.png" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter category description"), {
      target: { value: "Railway exams" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create category/i }));

    await waitFor(() =>
      expect(createCategory).toHaveBeenCalledWith({
        name: "Railways",
        shortName: "RRB",
        imageUrl: "https://example.com/rrb.png",
        description: "Railway exams",
      })
    );
    expect(message.success).toHaveBeenCalledWith("Category created successfully");
    await findRow("Railways");
  });

  it("shows validation errors when required fields are missing", async () => {
    listCategories.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });

    render(<CategoriesPage />);
    await findEmpty();
    fireEvent.click(screen.getByRole("button", { name: /create category/i }));

    expect(await screen.findByText("Please enter category name")).toBeInTheDocument();
    expect(screen.getByText("Please enter short name")).toBeInTheDocument();
    expect(createCategory).not.toHaveBeenCalled();
  });

  it("surfaces create errors", async () => {
    listCategories.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });
    createCategory.mockRejectedValue(new Error("nope"));

    render(<CategoriesPage />);
    await findEmpty();
    fireEvent.change(screen.getByPlaceholderText("e.g. Staff Selection Commission"), {
      target: { value: "Railways" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. SSC"), {
      target: { value: "RRB" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create category/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("navigates to the edit page", async () => {
    listCategories.mockResolvedValue({
      message: "ok",
      data: [makeCategory()],
      pagination,
    });

    render(<CategoriesPage />);
    await findRow("Staff Selection Commission");
    clickFirst(/edit/i);
    expect(push).toHaveBeenCalledWith("/admin/categories/c1");
  });

  it("deletes a category after confirm", async () => {
    listCategories
      .mockResolvedValueOnce({ message: "ok", data: [makeCategory()], pagination })
      .mockResolvedValueOnce({
        message: "ok",
        data: [],
        pagination: { ...pagination, total: 0 },
      });
    deleteCategory.mockResolvedValue({ message: "ok", data: makeCategory() });

    render(<CategoriesPage />);
    await findRow("Staff Selection Commission");
    clickFirst(/delete/i);

    expect(showConfirmModal).toHaveBeenCalled();
    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith("c1"));
    expect(message.success).toHaveBeenCalledWith("Category deleted successfully");
    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces delete errors", async () => {
    listCategories.mockResolvedValue({
      message: "ok",
      data: [makeCategory()],
      pagination,
    });
    deleteCategory.mockRejectedValue(new Error("nope"));

    render(<CategoriesPage />);
    await findRow("Staff Selection Commission");
    clickFirst(/delete/i);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getAllByText("Staff Selection Commission").length).toBeGreaterThan(0);
  });

  it("paginates to the next page", async () => {
    listCategories
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeCategory()],
        pagination: { ...pagination, total: 30, totalPages: 3, hasNextPage: true },
      })
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeCategory({ id: "c2", name: "UPSC", shortName: "UPSC" })],
        pagination: { ...pagination, page: 2, total: 30, totalPages: 3 },
      });

    render(<CategoriesPage />);
    await findRow("Staff Selection Commission");
    fireEvent.click(screen.getByRole("listitem", { name: "2" }));

    await waitFor(() =>
      expect(listCategories).toHaveBeenCalledWith({ page: 2, limit: 10 })
    );
    await findRow("UPSC");
  });
});
