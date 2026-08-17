import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Subject, Tag } from "@/app/services/ezprep-api";
import EditTagPage from "./page";

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
      listSubjects: vi.fn(),
      getTag: vi.fn(),
      updateTag: vi.fn(),
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

const listSubjects = vi.mocked(catalogApi.listSubjects);
const getTag = vi.mocked(catalogApi.getTag);
const updateTag = vi.mocked(catalogApi.updateTag);

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
    id: "id-1",
    name: "Easy",
    description: "Beginner",
    subject: { id: "sub-1", name: "Mathematics" },
    topic: { id: "top-1", name: "Algebra" },
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
  return render(<EditTagPage params={paramsPromise()} />);
}

describe("EditTagPage", { timeout: 15000 }, () => {
  beforeEach(() => {
    listSubjects.mockReset();
    getTag.mockReset();
    updateTag.mockReset();
    push.mockReset();
    listSubjects.mockResolvedValue({
      message: "ok",
      data: [
        makeSubject(),
        makeSubject({
          id: "sub-2",
          name: "English",
          topics: [{ id: "top-2", name: "Grammar" }],
        }),
      ],
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

  it("loads the tag into the form", async () => {
    getTag.mockResolvedValue({ message: "ok", data: makeTag() });

    renderPage();

    expect(await screen.findByDisplayValue("Easy", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Beginner")).toBeInTheDocument();
    expect(getTag).toHaveBeenCalledWith("id-1");
  });

  it("loads a tag with string refs and no subject", async () => {
    getTag.mockResolvedValue({
      message: "ok",
      data: makeTag({ subject: "", topic: "" }),
    });
    listSubjects.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Subject[],
    });

    renderPage();

    expect(await screen.findByDisplayValue("Easy", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText("Please select a subject first")).toBeInTheDocument();
  });

  it("surfaces fetch errors", async () => {
    getTag.mockRejectedValue(new Error("nope"));

    renderPage();

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getByText("Edit Tag")).toBeInTheDocument();
  });

  it("submits updated values and navigates back", async () => {
    getTag.mockResolvedValue({ message: "ok", data: makeTag() });
    updateTag.mockResolvedValue({
      message: "ok",
      data: makeTag({ name: "Hard" }),
    });

    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Easy", {}, { timeout: 10000 }), {
      target: { value: "Hard" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update tag/i }));

    await waitFor(() =>
      expect(updateTag).toHaveBeenCalledWith("id-1", {
        name: "Hard",
        description: "Beginner",
        subject: "sub-1",
        topic: "top-1",
      })
    );
    expect(message.success).toHaveBeenCalledWith("Tag updated successfully");
    expect(push).toHaveBeenCalledWith("/admin/tags");
  });

  it("clears the topic when the subject changes", async () => {
    getTag.mockResolvedValue({ message: "ok", data: makeTag() });
    updateTag.mockResolvedValue({ message: "ok", data: makeTag() });

    renderPage();
    await screen.findByDisplayValue("Easy", {}, { timeout: 10000 });
    await chooseSelectOption("Mathematics", "English");
    await chooseSelectOption("Select topic", "Grammar");
    fireEvent.click(screen.getByRole("button", { name: /update tag/i }));

    await waitFor(() =>
      expect(updateTag).toHaveBeenCalledWith("id-1", {
        name: "Easy",
        description: "Beginner",
        subject: "sub-2",
        topic: "top-2",
      })
    );
  });

  it("surfaces update errors without navigating", async () => {
    getTag.mockResolvedValue({ message: "ok", data: makeTag() });
    updateTag.mockRejectedValue(new Error("nope"));

    renderPage();
    await screen.findByDisplayValue("Easy", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /update tag/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks submit when the name is cleared", async () => {
    getTag.mockResolvedValue({ message: "ok", data: makeTag() });

    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Easy", {}, { timeout: 10000 }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update tag/i }));

    expect(await screen.findByText("Please enter tag name")).toBeInTheDocument();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("cancels back to the list", async () => {
    getTag.mockResolvedValue({ message: "ok", data: makeTag() });

    renderPage();
    await screen.findByDisplayValue("Easy", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(push).toHaveBeenCalledWith("/admin/tags");
    expect(updateTag).not.toHaveBeenCalled();
  });
});
