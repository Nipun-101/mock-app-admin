import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/app/services/ezprep-api";
import EditCategoryPage from "./page";

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
      getCategory: vi.fn(),
      updateCategory: vi.fn(),
    },
  };
});


vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (value: unknown) => {
      if (value && typeof value === "object" && "then" in value) {
        const thenable = value as { value?: { id: string } };
        return thenable.value ?? { id: "id-1" };
      }
      return actual.use(value as never);
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

const getCategory = vi.mocked(catalogApi.getCategory);
const updateCategory = vi.mocked(catalogApi.updateCategory);

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "id-1",
    name: "Staff Selection Commission",
    shortName: "SSC",
    description: "Central exams",
    imageUrl: "https://example.com/ssc.png",
    isActive: true,
    ...overrides,
  };
}


function paramsPromise(id = "id-1") {
  const value = { id };
  return {
    status: "fulfilled" as const,
    value,
    then(onFulfilled?: (v: { id: string }) => unknown) {
      return Promise.resolve(onFulfilled ? onFulfilled(value) : value);
    },
  } as unknown as Promise<{ id: string }>;
}

function renderPage() {
  return render(<EditCategoryPage params={paramsPromise()} />);
}

describe("EditCategoryPage", { timeout: 15000 }, () => {
  beforeEach(() => {
    getCategory.mockReset();
    updateCategory.mockReset();
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

  it("loads the category into the form", async () => {
    getCategory.mockResolvedValue({ message: "ok", data: makeCategory() });

    renderPage();

    expect(await screen.findByDisplayValue("Staff Selection Commission")).toBeInTheDocument();
    expect(screen.getByDisplayValue("SSC")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/ssc.png")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Central exams")).toBeInTheDocument();
    expect(getCategory).toHaveBeenCalledWith("id-1");
  });

  it("surfaces fetch errors", async () => {
    getCategory.mockRejectedValue(new Error("nope"));

    renderPage();

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getByText("Edit Category")).toBeInTheDocument();
  });

  it("submits updated values and navigates back", async () => {
    getCategory.mockResolvedValue({ message: "ok", data: makeCategory() });
    updateCategory.mockResolvedValue({
      message: "ok",
      data: makeCategory({ name: "UPSC" }),
    });

    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Staff Selection Commission"), {
      target: { value: "UPSC" },
    });
    fireEvent.change(screen.getByDisplayValue("SSC"), {
      target: { value: "UPSC" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update category/i }));

    await waitFor(() =>
      expect(updateCategory).toHaveBeenCalledWith("id-1", {
        name: "UPSC",
        shortName: "UPSC",
        imageUrl: "https://example.com/ssc.png",
        description: "Central exams",
      })
    );
    expect(message.success).toHaveBeenCalledWith("Category updated successfully");
    expect(push).toHaveBeenCalledWith("/admin/categories");
  });

  it("surfaces update errors without navigating", async () => {
    getCategory.mockResolvedValue({ message: "ok", data: makeCategory() });
    updateCategory.mockRejectedValue(new Error("nope"));

    renderPage();
    await screen.findByDisplayValue("Staff Selection Commission");
    fireEvent.click(screen.getByRole("button", { name: /update category/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks submit when required fields are cleared", async () => {
    getCategory.mockResolvedValue({ message: "ok", data: makeCategory() });

    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Staff Selection Commission"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update category/i }));

    expect(await screen.findByText("Please enter category name")).toBeInTheDocument();
    expect(updateCategory).not.toHaveBeenCalled();
  });

  it("cancels back to the list", async () => {
    getCategory.mockResolvedValue({ message: "ok", data: makeCategory() });

    renderPage();
    await screen.findByDisplayValue("Staff Selection Commission");
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(push).toHaveBeenCalledWith("/admin/categories");
    expect(updateCategory).not.toHaveBeenCalled();
  });
});
