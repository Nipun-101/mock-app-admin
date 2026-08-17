import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Subject, Topic } from "@/app/services/ezprep-api";
import EditSubjectPage from "./page";

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
      listTopics: vi.fn(),
      getSubject: vi.fn(),
      updateSubject: vi.fn(),
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

const listTopics = vi.mocked(catalogApi.listTopics);
const getSubject = vi.mocked(catalogApi.getSubject);
const updateSubject = vi.mocked(catalogApi.updateSubject);

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: "top-1",
    name: "Algebra",
    isActive: true,
    ...overrides,
  };
}

function makeSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: "id-1",
    name: "Mathematics",
    description: "Quant",
    topics: [{ id: "top-1", name: "Algebra" }],
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
  return render(<EditSubjectPage params={paramsPromise()} />);
}

describe("EditSubjectPage", { timeout: 15000 }, () => {
  beforeEach(() => {
    listTopics.mockReset();
    getSubject.mockReset();
    updateSubject.mockReset();
    push.mockReset();
    listTopics.mockResolvedValue({ message: "ok", data: [makeTopic()] });
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("loads the subject into the form", async () => {
    getSubject.mockResolvedValue({ message: "ok", data: makeSubject() });

    renderPage();

    expect(await screen.findByDisplayValue("Mathematics", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Quant")).toBeInTheDocument();
    expect(getSubject).toHaveBeenCalledWith("id-1");
    expect(listTopics).toHaveBeenCalled();
  });

  it("loads a subject with no topics", async () => {
    getSubject.mockResolvedValue({
      message: "ok",
      data: makeSubject({ topics: undefined as unknown as Subject["topics"] }),
    });
    listTopics.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Topic[],
    });

    renderPage();

    expect(await screen.findByDisplayValue("Mathematics", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it("surfaces fetch errors", async () => {
    getSubject.mockRejectedValue(new Error("nope"));

    renderPage();

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getByText("Edit Subject")).toBeInTheDocument();
  });

  it("submits updated values and navigates back", async () => {
    getSubject.mockResolvedValue({ message: "ok", data: makeSubject() });
    updateSubject.mockResolvedValue({
      message: "ok",
      data: makeSubject({ name: "English" }),
    });

    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Mathematics", {}, { timeout: 10000 }), {
      target: { value: "English" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update subject/i }));

    await waitFor(() =>
      expect(updateSubject).toHaveBeenCalledWith("id-1", {
        name: "English",
        description: "Quant",
        topics: ["top-1"],
      })
    );
    expect(message.success).toHaveBeenCalledWith("Subject updated successfully");
    expect(push).toHaveBeenCalledWith("/admin/subjects");
  });

  it("surfaces update errors without navigating", async () => {
    getSubject.mockResolvedValue({ message: "ok", data: makeSubject() });
    updateSubject.mockRejectedValue(new Error("nope"));

    renderPage();
    await screen.findByDisplayValue("Mathematics", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /update subject/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks submit when the name is cleared", async () => {
    getSubject.mockResolvedValue({ message: "ok", data: makeSubject() });

    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Mathematics", {}, { timeout: 10000 }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update subject/i }));

    expect(await screen.findByText("Please enter subject name")).toBeInTheDocument();
    expect(updateSubject).not.toHaveBeenCalled();
  });

  it("cancels back to the list", async () => {
    getSubject.mockResolvedValue({ message: "ok", data: makeSubject() });

    renderPage();
    await screen.findByDisplayValue("Mathematics", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(push).toHaveBeenCalledWith("/admin/subjects");
    expect(updateSubject).not.toHaveBeenCalled();
  });
});
