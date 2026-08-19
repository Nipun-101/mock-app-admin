import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuestionsPage from "./page";

const { replace, searchParams } = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams("page=5&limit=10"),
}));

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
          isActive: true,
        },
      ],
      pagination: { total: 50, page: 5, limit: 10, totalPages: 5, hasNextPage: false, hasPrevPage: true },
    });
  });

  it("loads the page from the URL and keeps it on the edit link", async () => {
    render(<QuestionsPage />);

    await waitFor(() =>
      expect(listQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ page: 5, limit: 10 })
      )
    );
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/admin/questions/q-1?page=5&limit=10"
    );
  });
});
