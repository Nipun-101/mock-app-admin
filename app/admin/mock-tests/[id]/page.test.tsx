import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MockTestDetailPage from "./page";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
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
  };
});

import { mockTestsApi } from "@/app/services/ezprep-api";

const get = vi.mocked(mockTestsApi.get);

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
  return render(<MockTestDetailPage params={paramsPromise()} />);
}

const detail = {
  id: "id-1",
  title: "Polity Practice",
  description: "Ten questions on parliament",
  isActive: true,
  totalQuestions: 10,
  durationInMinutes: 15,
  exam: { id: "ex-1", name: "UPSC" },
  subject: { id: "sub-1", name: "Polity" },
  topic: { id: "top-1", name: "Parliament" },
  difficultyDistribution: { easy: 3, medium: 3, hard: 4 },
  marksPerQuestion: 1,
  negativeMarking: 0.25,
  passingScore: 5,
  generationMode: "STATIC",
  allowRetake: true,
  shuffleOptions: false,
  showResultsImmediately: true,
  createdAt: "2026-08-17T00:00:00.000Z",
  questions: [
    {
      id: "q1",
      questionText: { en: { text: "Who is the speaker of the Lok Sabha in this scenario?" } },
      subject: { id: "sub-1", name: "Polity" },
    },
  ],
};

describe("MockTestDetailPage", () => {
  beforeEach(() => {
    get.mockReset();
    push.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.mocked(message.error).mockClear();
  });

  it("shows a loader while the test is fetched", async () => {
    get.mockReturnValue(new Promise(() => {}));
    renderPage();
    await waitFor(() => expect(document.querySelector(".ant-spin")).toBeInTheDocument());
  });

  it("renders mock test details and questions", async () => {
    get.mockResolvedValue({ message: "ok", data: detail });
    renderPage();

    expect(await screen.findAllByText("Polity Practice")).not.toHaveLength(0);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("15 minutes")).toBeInTheDocument();
    expect(screen.getByText("UPSC")).toBeInTheDocument();
    expect(screen.getByText("Easy: 3")).toBeInTheDocument();
    expect(screen.getByText("Questions (1)")).toBeInTheDocument();
    expect(screen.getByText(/Who is the speaker/)).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("id-1");
  });

  it("falls back when optional fields are missing", async () => {
    get.mockResolvedValue({
      message: "ok",
      data: {
        ...detail,
        title: undefined,
        topic: null,
        difficultyDistribution: undefined,
        passingScore: undefined,
        description: undefined,
        isActive: false,
        allowRetake: false,
        shuffleOptions: true,
        showResultsImmediately: false,
        questions: undefined,
        questionIds: [],
      },
    });

    renderPage();

    expect(await screen.findAllByText("Mock Test Details")).not.toHaveLength(0);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
    expect(screen.getByText("No description")).toBeInTheDocument();
    expect(screen.getByText("Questions (0)")).toBeInTheDocument();
  });

  it("navigates back to the list", async () => {
    get.mockResolvedValue({ message: "ok", data: detail });
    renderPage();
    await screen.findAllByText("Polity Practice");
    fireEvent.click(screen.getByRole("button", { name: /back to mock tests/i }));
    expect(push).toHaveBeenCalledWith("/admin/mock-tests");
  });

  it("redirects and surfaces an error when fetch fails", async () => {
    get.mockRejectedValue(new Error("nope"));
    renderPage();

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith("/admin/mock-tests");
  });
});
