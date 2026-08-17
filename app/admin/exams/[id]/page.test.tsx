import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Category,
  Exam,
  ExamGroup,
  Subject,
} from "@/app/services/ezprep-api";
import EditExamPage from "./page";

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
      getExam: vi.fn(),
      listSubjects: vi.fn(),
      listActiveCategories: vi.fn(),
      listActiveExamGroups: vi.fn(),
      updateExam: vi.fn(),
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

const getExam = vi.mocked(catalogApi.getExam);
const listSubjects = vi.mocked(catalogApi.listSubjects);
const listActiveCategories = vi.mocked(catalogApi.listActiveCategories);
const listActiveExamGroups = vi.mocked(catalogApi.listActiveExamGroups);
const updateExam = vi.mocked(catalogApi.updateExam);

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
    id: "eg-1",
    name: "CGL",
    category: "cat-1",
    isActive: true,
    ...overrides,
  };
}

function makeSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: "sub-1",
    name: "Mathematics",
    topics: [],
    isActive: true,
    ...overrides,
  };
}

function makeExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: "id-1",
    name: "SSC CGL Tier 1",
    description: "Paper 1",
    category: makeCategory(),
    examGroup: makeExamGroup(),
    duration: 60,
    totalQuestions: 100,
    totalMarks: 200,
    subjects: [
      {
        subject: "sub-1",
        numberOfQuestions: 25,
        marksPerQuestion: 2,
        hasNegativeMarking: true,
        negativeMarksPerQuestion: 0.5,
        sessionTime: 40,
      },
    ],
    isSessionWise: true,
    hasMultiLingualSupport: true,
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
  return render(<EditExamPage params={paramsPromise()} />);
}

function clickSwitchByLabel(label: string) {
  const item = screen.getByText(label).closest(".ant-form-item");
  const sw = item?.querySelector("button.ant-switch");
  expect(sw).toBeTruthy();
  fireEvent.click(sw!);
}

describe("EditExamPage", { timeout: 15000 }, () => {
  beforeEach(() => {
    getExam.mockReset();
    listSubjects.mockReset();
    listActiveCategories.mockReset();
    listActiveExamGroups.mockReset();
    updateExam.mockReset();
    push.mockReset();
    listSubjects.mockResolvedValue({ message: "ok", data: [makeSubject()] });
    listActiveCategories.mockResolvedValue({
      message: "ok",
      data: [makeCategory()],
    });
    listActiveExamGroups.mockResolvedValue({
      message: "ok",
      data: [makeExamGroup()],
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

  it("loads the exam into the form", async () => {
    getExam.mockResolvedValue({ message: "ok", data: makeExam() });

    renderPage();

    expect(await screen.findByDisplayValue("SSC CGL Tier 1", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Paper 1")).toBeInTheDocument();
    expect(screen.getByText("Subject 1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. 1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. 60")).toBeInTheDocument();
    expect(getExam).toHaveBeenCalledWith("id-1");
  });

  it("loads an exam without subjects", async () => {
    getExam.mockResolvedValue({
      message: "ok",
      data: makeExam({ subjects: undefined, isSessionWise: false }),
    });
    listSubjects.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Subject[],
    });
    listActiveCategories.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Category[],
    });
    listActiveExamGroups.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as ExamGroup[],
    });

    renderPage();

    expect(await screen.findByDisplayValue("SSC CGL Tier 1", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByText("Subject 1")).not.toBeInTheDocument();
  });

  it("surfaces fetch errors", async () => {
    getExam.mockRejectedValue(new Error("nope"));

    renderPage();

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getByText("Edit Exam")).toBeInTheDocument();
  });

  it("surfaces lookup list errors", async () => {
    getExam.mockResolvedValue({ message: "ok", data: makeExam() });
    listSubjects.mockRejectedValue(new Error("nope"));
    listActiveCategories.mockRejectedValue(new Error("nope"));
    listActiveExamGroups.mockRejectedValue(new Error("nope"));

    renderPage();

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(await screen.findByDisplayValue("SSC CGL Tier 1", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it("submits updated values and navigates back", async () => {
    getExam.mockResolvedValue({ message: "ok", data: makeExam() });
    updateExam.mockResolvedValue({
      message: "ok",
      data: makeExam({ name: "Updated" }),
    });

    renderPage();
    fireEvent.change(await screen.findByDisplayValue("SSC CGL Tier 1", {}, { timeout: 10000 }), {
      target: { value: "Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update exam/i }));

    await waitFor(() =>
      expect(updateExam).toHaveBeenCalledWith("id-1", {
        name: "Updated",
        description: "Paper 1",
        category: "cat-1",
        examGroup: "eg-1",
        duration: 60,
        isSessionWise: true,
        hasMultiLingualSupport: true,
        subjects: [
          {
            subject: "sub-1",
            numberOfQuestions: 25,
            marksPerQuestion: 2,
            hasNegativeMarking: true,
            negativeMarksPerQuestion: 0.5,
            sessionTime: 40,
          },
        ],
      })
    );
    expect(message.success).toHaveBeenCalledWith("Exam updated successfully");
    expect(push).toHaveBeenCalledWith("/admin/exams");
  });

  it("submits with no subjects as undefined", async () => {
    getExam.mockResolvedValue({
      message: "ok",
      data: makeExam({ subjects: [] }),
    });
    updateExam.mockResolvedValue({ message: "ok", data: makeExam() });

    renderPage();
    await screen.findByDisplayValue("SSC CGL Tier 1", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /update exam/i }));

    await waitFor(() =>
      expect(updateExam).toHaveBeenCalledWith(
        "id-1",
        expect.objectContaining({ subjects: undefined })
      )
    );
  });

  it("normalizes missing negative marks to 0", async () => {
    getExam.mockResolvedValue({
      message: "ok",
      data: makeExam({
        subjects: [
          {
            subject: "sub-1",
            numberOfQuestions: 25,
            marksPerQuestion: 2,
            hasNegativeMarking: false,
            negativeMarksPerQuestion: undefined as unknown as number,
          },
        ],
      }),
    });
    updateExam.mockResolvedValue({ message: "ok", data: makeExam() });

    renderPage();
    await screen.findByDisplayValue("SSC CGL Tier 1", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /update exam/i }));

    await waitFor(() =>
      expect(updateExam).toHaveBeenCalledWith(
        "id-1",
        expect.objectContaining({
          subjects: [
            expect.objectContaining({
              hasNegativeMarking: false,
              negativeMarksPerQuestion: 0,
            }),
          ],
        })
      )
    );
  });

  it("surfaces update errors without navigating", async () => {
    getExam.mockResolvedValue({ message: "ok", data: makeExam() });
    updateExam.mockRejectedValue(new Error("nope"));

    renderPage();
    await screen.findByDisplayValue("SSC CGL Tier 1", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /update exam/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("blocks submit when the name is cleared", async () => {
    getExam.mockResolvedValue({ message: "ok", data: makeExam() });

    renderPage();
    fireEvent.change(await screen.findByDisplayValue("SSC CGL Tier 1", {}, { timeout: 10000 }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update exam/i }));

    expect(await screen.findByText("Please enter exam name")).toBeInTheDocument();
    expect(message.error).toHaveBeenCalledWith("Please fill in all required fields");
    expect(updateExam).not.toHaveBeenCalled();
  });

  it("cancels back to the list", async () => {
    getExam.mockResolvedValue({ message: "ok", data: makeExam() });

    renderPage();
    await screen.findByDisplayValue("SSC CGL Tier 1", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(push).toHaveBeenCalledWith("/admin/exams");
    expect(updateExam).not.toHaveBeenCalled();
  });

  it("adds and removes a subject card", async () => {
    getExam.mockResolvedValue({
      message: "ok",
      data: makeExam({ subjects: [] }),
    });

    renderPage();
    await screen.findByDisplayValue("SSC CGL Tier 1", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /add subject/i }));
    expect(await screen.findByText("Subject 1")).toBeInTheDocument();
    clickSwitchByLabel("Negative Marking?");
    expect(screen.getByPlaceholderText("e.g. 1")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".anticon-minus-circle")!);
    expect(screen.queryByText("Subject 1")).not.toBeInTheDocument();
  });
});
