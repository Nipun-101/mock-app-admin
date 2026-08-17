import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, ExamGroup } from "@/app/services/ezprep-api";
import EditExamGroupPage from "./page";

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
      getExamGroup: vi.fn(),
      listActiveCategories: vi.fn(),
      updateExamGroup: vi.fn(),
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

const getExamGroup = vi.mocked(catalogApi.getExamGroup);
const listActiveCategories = vi.mocked(catalogApi.listActiveCategories);
const updateExamGroup = vi.mocked(catalogApi.updateExamGroup);

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
    id: "id-1",
    name: "Combined Graduate Level",
    shortName: "CGL",
    category: makeCategory(),
    description: "Tiered exam",
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
  return render(<EditExamGroupPage params={paramsPromise()} />);
}

describe("EditExamGroupPage", { timeout: 15000 }, () => {
  beforeEach(() => {
    getExamGroup.mockReset();
    listActiveCategories.mockReset();
    updateExamGroup.mockReset();
    push.mockReset();
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

  it("loads the exam group into the form", async () => {
    getExamGroup.mockResolvedValue({ message: "ok", data: makeExamGroup() });

    renderPage();

    expect(await screen.findByDisplayValue("Combined Graduate Level", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByDisplayValue("CGL")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Tiered exam")).toBeInTheDocument();
    expect(getExamGroup).toHaveBeenCalledWith("id-1");
  });

  it("loads when category is a string id", async () => {
    getExamGroup.mockResolvedValue({
      message: "ok",
      data: makeExamGroup({ category: "cat-1" }),
    });
    listActiveCategories.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Category[],
    });

    renderPage();

    expect(await screen.findByDisplayValue("Combined Graduate Level", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it("surfaces fetch errors", async () => {
    getExamGroup.mockRejectedValue(new Error("nope"));

    renderPage();

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getByText("Edit Exam Group")).toBeInTheDocument();
  });

  it("surfaces category list errors", async () => {
    getExamGroup.mockResolvedValue({ message: "ok", data: makeExamGroup() });
    listActiveCategories.mockRejectedValue(new Error("nope"));

    renderPage();

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(await screen.findByDisplayValue("Combined Graduate Level", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it("submits updated values and navigates back", async () => {
    getExamGroup.mockResolvedValue({ message: "ok", data: makeExamGroup() });
    updateExamGroup.mockResolvedValue({
      message: "ok",
      data: makeExamGroup({ name: "CHSL" }),
    });

    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Combined Graduate Level", {}, { timeout: 10000 }), {
      target: { value: "CHSL" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update exam group/i }));

    await waitFor(() =>
      expect(updateExamGroup).toHaveBeenCalledWith("id-1", {
        name: "CHSL",
        shortName: "CGL",
        category: "cat-1",
        description: "Tiered exam",
      })
    );
    expect(message.success).toHaveBeenCalledWith("Exam group updated successfully");
    expect(push).toHaveBeenCalledWith("/admin/exam-groups");
  });

  it("surfaces update errors without navigating", async () => {
    getExamGroup.mockResolvedValue({ message: "ok", data: makeExamGroup() });
    updateExamGroup.mockRejectedValue(new Error("nope"));

    renderPage();
    await screen.findByDisplayValue("Combined Graduate Level", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /update exam group/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks submit when the name is cleared", async () => {
    getExamGroup.mockResolvedValue({ message: "ok", data: makeExamGroup() });

    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Combined Graduate Level", {}, { timeout: 10000 }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update exam group/i }));

    expect(await screen.findByText("Please enter exam group name")).toBeInTheDocument();
    expect(updateExamGroup).not.toHaveBeenCalled();
  });

  it("cancels back to the list", async () => {
    getExamGroup.mockResolvedValue({ message: "ok", data: makeExamGroup() });

    renderPage();
    await screen.findByDisplayValue("Combined Graduate Level", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(push).toHaveBeenCalledWith("/admin/exam-groups");
    expect(updateExamGroup).not.toHaveBeenCalled();
  });
});
