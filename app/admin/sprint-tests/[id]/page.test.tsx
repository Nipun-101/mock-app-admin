import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublishedSprintPage from "./page";

const { router } = vi.hoisted(() => ({
  router: { push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("../api", () => ({
  formatEzPrepError: (_error: unknown, fallback: string) => fallback,
  sprintTestsApi: {
    getPublished: vi.fn(),
  },
}));

import { sprintTestsApi } from "../api";

function paramsPromise(id = "sp-1") {
  const value = { id };
  return {
    status: "fulfilled" as const,
    value,
    then(onFulfilled?: (resolved: { id: string }) => unknown) {
      return Promise.resolve(onFulfilled ? onFulfilled(value) : value);
    },
  } as unknown as Promise<{ id: string }>;
}

beforeEach(() => {
  router.push.mockReset();
  vi.mocked(sprintTestsApi.getPublished).mockReset().mockResolvedValue({
    message: "ok",
    data: {
      id: "sp-1",
      title: "Morning sprint",
      description: "Mixed paper",
      totalQuestions: 10,
      durationInMinutes: 15,
      exam: { id: "e1", name: "CGL" },
      marksPerQuestion: 1,
      negativeMarking: 0.25,
      allowRetake: true,
      shuffleOptions: false,
      showResultsImmediately: true,
      isActive: true,
      questions: [
        {
          _id: "q1",
          position: 0,
          marksPerQuestion: 1,
          negativeMarking: 0.25,
          questionText: { en: { text: "Newest stem" }, ml: { text: null } },
          options: [],
          difficultyLevel: "easy",
        },
      ],
    },
  });
  vi.spyOn(message, "error").mockImplementation(
    (() => undefined) as unknown as typeof message.error
  );
});

describe("PublishedSprintPage", () => {
  it("shows the frozen paper and returns to the list", async () => {
    render(<PublishedSprintPage params={paramsPromise()} />);
    expect(await screen.findByRole("heading", { name: "Morning sprint" })).toBeInTheDocument();
    expect(screen.getByText("Newest stem")).toBeInTheDocument();
    expect(screen.getByText("CGL")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back to sprint tests/i }));
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/admin/sprint-tests");
    });
  });
});
