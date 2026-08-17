import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Topic } from "@/app/services/ezprep-api";
import EditTopicPage from "./page";

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
      getTopic: vi.fn(),
      updateTopic: vi.fn(),
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

const getTopic = vi.mocked(catalogApi.getTopic);
const updateTopic = vi.mocked(catalogApi.updateTopic);

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: "id-1",
    name: "Algebra",
    description: "Intro algebra",
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
  return render(<EditTopicPage params={paramsPromise()} />);
}

describe("EditTopicPage", { timeout: 15000 }, () => {
  beforeEach(() => {
    getTopic.mockReset();
    updateTopic.mockReset();
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

  it("loads the topic into the form", async () => {
    getTopic.mockResolvedValue({ message: "ok", data: makeTopic() });

    renderPage();

    expect(await screen.findByDisplayValue("Algebra")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Intro algebra")).toBeInTheDocument();
    expect(screen.getByText("Edit Topic")).toBeInTheDocument();
    expect(getTopic).toHaveBeenCalledWith("id-1");
  });

  it("surfaces fetch errors", async () => {
    getTopic.mockRejectedValue(new Error("nope"));

    renderPage();

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getByText("Edit Topic")).toBeInTheDocument();
  });

  it("submits updated values and navigates back", async () => {
    getTopic.mockResolvedValue({ message: "ok", data: makeTopic() });
    updateTopic.mockResolvedValue({
      message: "ok",
      data: makeTopic({ name: "Geometry" }),
    });

    renderPage();
    const nameInput = await screen.findByDisplayValue("Algebra");
    fireEvent.change(nameInput, { target: { value: "Geometry" } });
    fireEvent.change(screen.getByDisplayValue("Intro algebra"), {
      target: { value: "Shapes" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update topic/i }));

    await waitFor(() =>
      expect(updateTopic).toHaveBeenCalledWith("id-1", {
        name: "Geometry",
        description: "Shapes",
      })
    );
    expect(message.success).toHaveBeenCalledWith("Topic updated successfully");
    expect(push).toHaveBeenCalledWith("/admin/topics");
  });

  it("surfaces update errors without navigating", async () => {
    getTopic.mockResolvedValue({ message: "ok", data: makeTopic() });
    updateTopic.mockRejectedValue(new Error("nope"));

    renderPage();
    await screen.findByDisplayValue("Algebra");
    fireEvent.click(screen.getByRole("button", { name: /update topic/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks submit when the name is cleared", async () => {
    getTopic.mockResolvedValue({ message: "ok", data: makeTopic() });

    renderPage();
    fireEvent.change(await screen.findByDisplayValue("Algebra"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update topic/i }));

    expect(await screen.findByText("Please enter topic name")).toBeInTheDocument();
    expect(updateTopic).not.toHaveBeenCalled();
  });

  it("cancels back to the list", async () => {
    getTopic.mockResolvedValue({ message: "ok", data: makeTopic() });

    renderPage();
    await screen.findByDisplayValue("Algebra");
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(push).toHaveBeenCalledWith("/admin/topics");
    expect(updateTopic).not.toHaveBeenCalled();
  });
});
