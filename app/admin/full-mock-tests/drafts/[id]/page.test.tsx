import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { message } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FullMockDraftPage from "./page";
import type { DraftResponse } from "../../types";

const { router } = vi.hoisted(() => ({
  router: { push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: ({ onConfirm }: { onConfirm: () => void | Promise<void> }) => {
    void onConfirm();
  },
}));

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

function renderDraftPage() {
  return render(<FullMockDraftPage params={paramsPromise()} />);
}

const reviewDraft: DraftResponse = {
  id: "id-1",
  examId: "ex-1",
  status: "REVIEW",
  examSnapshot: {
    name: "UPSC Prelims",
    description: "Full paper",
    duration: 120,
    totalQuestions: 2,
    totalMarks: 4,
    isSessionWise: false,
  },
  subjects: [
    {
      subjectId: "sub-1",
      name: "Polity",
      numberOfQuestions: 2,
      marksPerQuestion: 2,
      hasNegativeMarking: true,
      negativeMarksPerQuestion: 0.66,
      questions: [
        {
          _id: "q1",
          position: 0,
          marksPerQuestion: 2,
          negativeMarking: 0.66,
          questionText: { en: { text: "Who elects the President?" }, ml: { text: null } },
          options: [{ id: "a", type: "text", en: "Parliament" }],
          topic: "top-1",
          difficultyLevel: "easy",
        },
        {
          _id: "q2",
          position: 1,
          marksPerQuestion: 2,
          negativeMarking: 0,
          replacedFrom: "q-old",
          questionText: { en: { text: "Article 32" }, ml: { text: null } },
          options: [],
          difficultyLevel: "hard",
        },
      ],
    },
  ],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const searchResults = {
  message: "ok",
  data: [
    {
      _id: "q-new",
      snippet: "Replacement question about VP",
      questionText: { en: { text: "VP" }, ml: { text: null } },
      options: [],
      topic: "top-1",
      difficultyLevel: "medium",
    },
  ],
  pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
};

function jsonResponse(data: unknown, ok = true) {
  return new Response(JSON.stringify(data), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

let currentDraft: DraftResponse = reviewDraft;
let fetchMock: ReturnType<typeof vi.fn>;

function installFetchMock() {
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || "GET").toUpperCase();

    if (method === "GET" && url.includes("/full-mock-tests/questions")) {
      const topic = url.includes("allowCrossSubject=true") ? "top-gs" : "top-1";
      return jsonResponse({
        ...searchResults,
        data: searchResults.data.map((item) => ({ ...item, topic })),
      });
    }
    if (method === "GET" && url.includes("/full-mock-tests/drafts/")) {
      return jsonResponse({ message: "ok", data: currentDraft });
    }
    if (method === "POST" && url.includes("/publish")) {
      return jsonResponse({
        message: "Full mock published",
        data: {
          mockTestId: "fm-9",
          draft: { ...currentDraft, status: "PUBLISHED" },
        },
      });
    }
    if (method === "DELETE" && url.includes("/drafts/")) {
      return jsonResponse({ message: "Draft discarded" });
    }
    if (method === "PATCH" && url.includes("/questions/")) {
      return jsonResponse({ message: "Question replaced", data: currentDraft });
    }
    if (url.includes("/subjects/")) {
      if (url.includes("sub-gs")) {
        return jsonResponse({
          message: "ok",
          data: {
            id: "sub-gs",
            name: "General Science",
            topics: [{ id: "top-gs", name: "Physics" }],
          },
        });
      }
      return jsonResponse({
        message: "ok",
        data: {
          id: "sub-1",
          name: "Polity",
          topics: [{ id: "top-1", name: "Parliament" }],
        },
      });
    }
    if (url.includes("/subjects")) {
      return jsonResponse({
        message: "ok",
        data: [
          {
            id: "sub-1",
            name: "Polity",
            topics: [{ id: "top-1", name: "Parliament" }],
          },
          {
            id: "sub-gs",
            name: "General Science",
            topics: [{ id: "top-gs", name: "Physics" }],
          },
        ],
      });
    }
    return jsonResponse({ message: `unmocked ${method} ${url}` }, false);
  });
  vi.stubGlobal("fetch", fetchMock);
}

async function renderReady(draft: DraftResponse = reviewDraft) {
  currentDraft = draft;
  renderDraftPage();
  expect(await screen.findAllByText("UPSC Prelims")).not.toHaveLength(0);
}

describe("FullMockDraftPage", () => {
  beforeEach(() => {
    currentDraft = reviewDraft;
    router.push.mockReset();
    installFetchMock();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads a reviewable draft", async () => {
    await renderReady();
    expect(screen.getByText("REVIEW")).toBeInTheDocument();
    expect(screen.getByText("Who elects the President?")).toBeInTheDocument();
    expect(screen.getByText("Replaced")).toBeInTheDocument();
    expect(screen.getByText("Publish Full Mock")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("publishes the draft and navigates to the published test", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /publish full mock/i }));
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/admin/full-mock-tests/fm-9")
    );
  });

  it("discards the draft after confirm", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /discard draft/i }));
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/admin/full-mock-tests")
    );
  });

  it("replaces a question from search results", async () => {
    await renderReady();
    fireEvent.click(screen.getAllByRole("button", { name: "Replace" })[0]);
    expect(await screen.findByText(/Replace question #1/)).toBeInTheDocument();
    expect(await screen.findByText("Replacement question about VP")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use this" }));
    await waitFor(() => expect(message.success).toHaveBeenCalled());
  });

  it("searches across subjects when the replace opt-in is enabled", async () => {
    await renderReady();
    fireEvent.click(screen.getAllByRole("button", { name: "Replace" })[0]);
    expect(await screen.findByText(/Replace question #1/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("switch"));
    expect(await screen.findByText(/Section stays the same/)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes("allowCrossSubject=true")
        )
      ).toBe(true)
    );
    const subjectField = screen.getByText("Subject").closest(".ant-select-selector");
    expect(subjectField).toBeTruthy();
    fireEvent.mouseDown(subjectField!);
    fireEvent.click(await screen.findByText("General Science"));
    expect(await screen.findByText("Physics")).toBeInTheDocument();
    expect(screen.queryByText("top-gs")).not.toBeInTheDocument();
  });

  it("shows a view-published button for a published draft", async () => {
    await renderReady({
      ...reviewDraft,
      status: "PUBLISHED",
      publishedMockTestId: "fm-9",
    });
    fireEvent.click(screen.getByRole("button", { name: /view published test/i }));
    expect(router.push).toHaveBeenCalledWith("/admin/full-mock-tests/fm-9");
    expect(screen.queryByText("Publish Full Mock")).not.toBeInTheDocument();
  });

  it("redirects when the draft cannot be loaded", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ message: "ok", data: null }));
    renderDraftPage();
    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(router.push).toHaveBeenCalledWith("/admin/full-mock-tests");
  });

  it("surfaces publish and discard errors", async () => {
    await renderReady();
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method || "GET").toUpperCase();
      if (method === "POST" || method === "DELETE") {
        return jsonResponse({ message: "nope" }, false);
      }
      return jsonResponse({ message: "ok", data: currentDraft });
    });
    fireEvent.click(screen.getByRole("button", { name: /publish full mock/i }));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /discard draft/i }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) => {
          const init = call[1] as RequestInit | undefined;
          return (init?.method || "").toUpperCase() === "DELETE";
        })
      ).toBe(true)
    );
  });

  it("shows session duration for session-wise drafts", async () => {
    await renderReady({
      ...reviewDraft,
      examSnapshot: { ...reviewDraft.examSnapshot, isSessionWise: true, duration: undefined },
      subjects: [
        {
          ...reviewDraft.subjects[0],
          sessionTime: 40,
        },
      ],
    });
    expect(screen.getByText("40 mins (sum of sessions)")).toBeInTheDocument();
    expect(screen.getByText("40 min session")).toBeInTheDocument();
  });
});
