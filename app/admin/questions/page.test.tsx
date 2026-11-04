import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import QuestionsPage from "./page";

const { replace, searchParamsState } = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParamsState: { current: new URLSearchParams("page=5&limit=10") },
}));

const searchParams = {
  get: (key: string) => searchParamsState.current.get(key),
  toString: () => searchParamsState.current.toString(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/questions",
  useSearchParams: () => searchParams,
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    questionsApi: {
      list: vi.fn(),
      delete: vi.fn(),
    },
    catalogApi: {
      ...actual.catalogApi,
      listSubjects: vi.fn(),
      listAllExams: vi.fn(),
      getSubject: vi.fn(),
    },
  };
});

import { catalogApi, questionsApi } from "@/app/services/ezprep-api";

const listQuestions = vi.mocked(questionsApi.list);
const listSubjects = vi.mocked(catalogApi.listSubjects);
const listAllExams = vi.mocked(catalogApi.listAllExams);

describe("QuestionsPage", () => {
  beforeEach(() => {
    replace.mockReset();
    searchParamsState.current = new URLSearchParams("page=5&limit=10");
    listQuestions.mockReset();
    listSubjects.mockReset();
    listAllExams.mockReset();
    listSubjects.mockResolvedValue({ message: "ok", data: [] });
    listAllExams.mockResolvedValue([]);
    listQuestions.mockResolvedValue({
      message: "ok",
      data: [
        {
          id: "q-1",
          questionText: { en: { text: "Capital of India?" }, ml: { text: null } },
          options: [],
          correctAnswer: "opt-a",
          isActive: true,
        },
      ],
      pagination: { total: 50, page: 5, limit: 10, totalPages: 5, hasNextPage: false, hasPrevPage: true },
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the page from the URL and keeps it on the edit link", async () => {
    render(<QuestionsPage />);

    await waitFor(() =>
      expect(listQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ page: 5, limit: 10 })
      )
    );
    expect(screen.getByRole("heading", { name: "Questions" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search question text")).toBeInTheDocument();
    expect(screen.getByText("No Tags")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/admin/questions/q-1?page=5&limit=10"
    );
  });

  it("debounces search text into the URL and lists with filters", async () => {
    searchParamsState.current = new URLSearchParams(
      "page=2&limit=10&examId=e1&subjectId=s1"
    );
    render(<QuestionsPage />);

    await waitFor(() =>
      expect(listQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          examId: "e1",
          subjectId: "s1",
        })
      )
    );

    const input = screen.getByPlaceholderText("Search question text");
    fireEvent.change(input, { target: { value: "pres" } });
    expect(replace).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/admin/questions?page=1&limit=10&examId=e1&subjectId=s1&search=pres",
        { scroll: false }
      )
    );

    searchParamsState.current = new URLSearchParams(
      "page=1&limit=10&examId=e1&subjectId=s1&search=pres"
    );
    render(<QuestionsPage />);
    await waitFor(() =>
      expect(listQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          examId: "e1",
          subjectId: "s1",
          search: "pres",
        })
      )
    );
  });

  it("clears search from the URL when the input is emptied", async () => {
    searchParamsState.current = new URLSearchParams(
      "page=1&limit=10&search=pres"
    );
    render(<QuestionsPage />);
    await waitFor(() =>
      expect(listQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ search: "pres" })
      )
    );

    const input = screen.getByPlaceholderText("Search question text");
    fireEvent.change(input, { target: { value: "" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/admin/questions?page=1&limit=10", {
        scroll: false,
      })
    );
  });

  it("shows a disabled sprint button until the selection is an allowed size", async () => {
    render(<QuestionsPage />);
    expect(await screen.findByText("Capital of India?")).toBeInTheDocument();
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[checkboxes.length - 1]);

    const button = screen.getByRole("button", { name: "+ Sprint Test" });
    expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: "+ Topic Test" })).toBeDisabled();
    expect(screen.getByText(/Select at least 10 questions/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear selection \(1\)/i }));
    expect(screen.queryByRole("button", { name: "+ Sprint Test" })).not.toBeInTheDocument();
  });
});
