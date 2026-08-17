import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Category,
  Exam,
  ExamGroup,
  Subject,
} from "@/app/services/ezprep-api";
import ExamsPage from "./page";

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
      listAllExams: vi.fn(),
      listSubjects: vi.fn(),
      listActiveCategories: vi.fn(),
      listActiveExamGroups: vi.fn(),
      createExam: vi.fn(),
      createExamGroup: vi.fn(),
      deleteExam: vi.fn(),
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
import { showConfirmModal } from "@/components/ConfirmModal";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

function findEmpty() {
  return screen.findByText("No data", { selector: ".ant-empty-description" });
}


function findRow(text: string) {
  return screen.findAllByText(text, {}, { timeout: 10000 }).then((els) => {
    expect(els.length).toBeGreaterThan(0);
    return els[0];
  });
}

function clickFirst(name: RegExp) {
  fireEvent.click(screen.getAllByRole("button", { name })[0]);
}

function mockWideViewport() {
  window.matchMedia = (query: string) =>
    ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

const listAllExams = vi.mocked(catalogApi.listAllExams);
const listSubjects = vi.mocked(catalogApi.listSubjects);
const listActiveCategories = vi.mocked(catalogApi.listActiveCategories);
const listActiveExamGroups = vi.mocked(catalogApi.listActiveExamGroups);
const createExam = vi.mocked(catalogApi.createExam);
const createExamGroup = vi.mocked(catalogApi.createExamGroup);
const deleteExam = vi.mocked(catalogApi.deleteExam);

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
    id: "ex-1",
    name: "SSC CGL Tier 1",
    description: "Paper 1",
    category: "cat-1",
    examGroup: makeExamGroup(),
    duration: 60,
    totalQuestions: 100,
    totalMarks: 200,
    subjects: [
      {
        subject: "sub-1",
        numberOfQuestions: 25,
        marksPerQuestion: 2,
        hasNegativeMarking: false,
        negativeMarksPerQuestion: 0,
      },
    ],
    isSessionWise: false,
    hasMultiLingualSupport: false,
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

function clickSwitchByLabel(label: string) {
  const item = screen.getByText(label).closest(".ant-form-item");
  const sw = item?.querySelector("button.ant-switch");
  expect(sw).toBeTruthy();
  fireEvent.click(sw!);
}

describe("ExamsPage", { timeout: 15000 }, () => {
  beforeEach(() => {
    mockWideViewport();
    listAllExams.mockReset();
    listSubjects.mockReset();
    listActiveCategories.mockReset();
    listActiveExamGroups.mockReset();
    createExam.mockReset();
    createExamGroup.mockReset();
    deleteExam.mockReset();
    push.mockReset();
    vi.mocked(showConfirmModal).mockClear();
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

  it("renders exams returned by the API", async () => {
    listAllExams.mockResolvedValue([
      makeExam(),
      makeExam({
        id: "ex-2",
        name: "CHSL",
        duration: undefined,
        examGroup: "eg-1",
        subjects: [],
        isSessionWise: true,
        category: "missing",
      }),
    ]);

    render(<ExamsPage />);

    await findRow("SSC CGL Tier 1");
    expect(screen.getAllByText("CHSL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("60 mins").length).toBeGreaterThan(0);
    expect(screen.getAllByText("100").length).toBeGreaterThan(0);
    await findRow("Staff Selection Commission (SSC)");
    expect(screen.getAllByText("CGL").length).toBeGreaterThan(0);
    await findRow("Mathematics");
    expect(screen.getAllByText("Mixed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Session-wise").length).toBeGreaterThan(0);
    expect(screen.getByText("Add New Exam")).toBeInTheDocument();
  });

  it("shows an empty table when there are no exams", async () => {
    listAllExams.mockResolvedValue([]);

    render(<ExamsPage />);

    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces list errors without rendering leaked rows", async () => {
    listAllExams.mockRejectedValue(new Error("nope"));

    render(<ExamsPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.queryAllByText("SSC CGL Tier 1")).toHaveLength(0);
  });

  it("surfaces lookup list errors", async () => {
    listAllExams.mockResolvedValue([]);
    listSubjects.mockRejectedValue(new Error("nope"));
    listActiveCategories.mockRejectedValue(new Error("nope"));
    listActiveExamGroups.mockRejectedValue(new Error("nope"));

    render(<ExamsPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("creates an exam after selecting category and exam group", async () => {
    listAllExams
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeExam({ id: "ex-2", name: "New Exam" })]);
    createExam.mockResolvedValue({
      message: "ok",
      data: makeExam({ id: "ex-2", name: "New Exam" }),
    });

    render(<ExamsPage />);
    await findEmpty();

    fireEvent.change(screen.getByPlaceholderText("Enter exam name"), {
      target: { value: "New Exam" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter description"), {
      target: { value: "Desc" },
    });
    await chooseSelectOption(
      "Select category",
      "Staff Selection Commission (SSC)"
    );
    await chooseSelectOption("Select exam group", "CGL");
    fireEvent.click(screen.getByRole("button", { name: /create exam/i }));

    await waitFor(() =>
      expect(createExam).toHaveBeenCalledWith({
        name: "New Exam",
        description: "Desc",
        category: "cat-1",
        examGroup: "eg-1",
        duration: undefined,
        isSessionWise: false,
        hasMultiLingualSupport: false,
        subjects: undefined,
      })
    );
    expect(message.success).toHaveBeenCalledWith("Exam created successfully");
    await findRow("New Exam");
  });

  it("creates an exam group automatically when the exam is the group", async () => {
    listAllExams.mockResolvedValue([]);
    createExamGroup.mockResolvedValue({
      message: "ok",
      data: makeExamGroup({ id: "eg-new", name: "Overseer" }),
    });
    createExam.mockResolvedValue({
      message: "ok",
      data: makeExam({ id: "ex-2", name: "Overseer" }),
    });

    render(<ExamsPage />);
    await findEmpty();

    fireEvent.change(screen.getByPlaceholderText("Enter exam name"), {
      target: { value: "Overseer" },
    });
    await chooseSelectOption(
      "Select category",
      "Staff Selection Commission (SSC)"
    );
    clickSwitchByLabel("Exam is also the Exam Group");
    fireEvent.change(screen.getByPlaceholderText("e.g. CGL"), {
      target: { value: "OVR" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create exam/i }));

    await waitFor(() =>
      expect(createExamGroup).toHaveBeenCalledWith({
        name: "Overseer",
        shortName: "OVR",
        category: "cat-1",
        description: undefined,
      })
    );
    await waitFor(() =>
      expect(createExam).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Overseer",
          examGroup: "eg-new",
        })
      )
    );
  });

  it("falls back to the exam name when short name is omitted for a same-as-group exam", async () => {
    listAllExams.mockResolvedValue([]);
    createExamGroup.mockResolvedValue({
      message: "ok",
      data: makeExamGroup({ id: "eg-new" }),
    });
    createExam.mockResolvedValue({
      message: "ok",
      data: makeExam({ id: "ex-2" }),
    });

    render(<ExamsPage />);
    await findEmpty();
    fireEvent.change(screen.getByPlaceholderText("Enter exam name"), {
      target: { value: "Overseer" },
    });
    await chooseSelectOption(
      "Select category",
      "Staff Selection Commission (SSC)"
    );
    clickSwitchByLabel("Exam is also the Exam Group");
    fireEvent.click(screen.getByRole("button", { name: /create exam/i }));

    await waitFor(() =>
      expect(createExamGroup).toHaveBeenCalledWith({
        name: "Overseer",
        shortName: "Overseer",
        category: "cat-1",
        description: undefined,
      })
    );
  });

  it("errors when a same-as-group exam group is created without an id", async () => {
    listAllExams.mockResolvedValue([]);
    createExamGroup.mockResolvedValue({
      message: "ok",
      data: makeExamGroup({ id: "" }),
    });

    render(<ExamsPage />);
    await findEmpty();
    fireEvent.change(screen.getByPlaceholderText("Enter exam name"), {
      target: { value: "Overseer" },
    });
    await chooseSelectOption(
      "Select category",
      "Staff Selection Commission (SSC)"
    );
    clickSwitchByLabel("Exam is also the Exam Group");
    fireEvent.click(screen.getByRole("button", { name: /create exam/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(createExam).not.toHaveBeenCalled();
  });

  it("creates an exam with a configured subject", async () => {
    listAllExams.mockResolvedValue([]);
    createExam.mockResolvedValue({
      message: "ok",
      data: makeExam({ id: "ex-2" }),
    });

    render(<ExamsPage />);
    await findEmpty();
    fireEvent.change(screen.getByPlaceholderText("Enter exam name"), {
      target: { value: "New Exam" },
    });
    await chooseSelectOption(
      "Select category",
      "Staff Selection Commission (SSC)"
    );
    await chooseSelectOption("Select exam group", "CGL");
    fireEvent.click(screen.getByRole("button", { name: /add subject/i }));
    expect(await screen.findByText("Subject 1")).toBeInTheDocument();
    await chooseSelectOption("Select subject", "Mathematics");
    fireEvent.change(screen.getByPlaceholderText("e.g. 30"), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 4"), {
      target: { value: "2" },
    });
    clickSwitchByLabel("Negative Marking?");
    fireEvent.change(await screen.findByPlaceholderText("e.g. 1"), {
      target: { value: "0.5" },
    });
    clickSwitchByLabel("Exam Mode");
    fireEvent.change(await screen.findByPlaceholderText("e.g. 60"), {
      target: { value: "40" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create exam/i }));

    await waitFor(() =>
      expect(createExam).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Exam",
          isSessionWise: true,
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
      )
    );
  });

  it("shows validation errors when required fields are missing", async () => {
    listAllExams.mockResolvedValue([]);

    render(<ExamsPage />);
    await findEmpty();
    fireEvent.click(screen.getByRole("button", { name: /create exam/i }));

    expect(await screen.findByText("Please enter exam name")).toBeInTheDocument();
    expect(message.error).toHaveBeenCalledWith("Please fill in all required fields");
    expect(createExam).not.toHaveBeenCalled();
  });

  it("surfaces create errors", async () => {
    listAllExams.mockResolvedValue([]);
    createExam.mockRejectedValue(new Error("nope"));

    render(<ExamsPage />);
    await findEmpty();
    fireEvent.change(screen.getByPlaceholderText("Enter exam name"), {
      target: { value: "New Exam" },
    });
    await chooseSelectOption(
      "Select category",
      "Staff Selection Commission (SSC)"
    );
    await chooseSelectOption("Select exam group", "CGL");
    fireEvent.click(screen.getByRole("button", { name: /create exam/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("navigates to the edit page", async () => {
    listAllExams.mockResolvedValue([makeExam()]);

    render(<ExamsPage />);
    await findRow("SSC CGL Tier 1");
    clickFirst(/edit/i);
    expect(push).toHaveBeenCalledWith("/admin/exams/ex-1");
  });

  it("deletes an exam after confirm", async () => {
    listAllExams
      .mockResolvedValueOnce([makeExam()])
      .mockResolvedValueOnce([]);
    deleteExam.mockResolvedValue({ message: "ok", data: makeExam() });

    render(<ExamsPage />);
    await findRow("SSC CGL Tier 1");
    clickFirst(/delete/i);

    expect(showConfirmModal).toHaveBeenCalled();
    await waitFor(() => expect(deleteExam).toHaveBeenCalledWith("ex-1"));
    expect(message.success).toHaveBeenCalledWith("Exam deleted successfully");
    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces delete errors", async () => {
    listAllExams.mockResolvedValue([makeExam()]);
    deleteExam.mockRejectedValue(new Error("nope"));

    render(<ExamsPage />);
    await findRow("SSC CGL Tier 1");
    clickFirst(/delete/i);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getAllByText("SSC CGL Tier 1").length).toBeGreaterThan(0);
  });

  it("toggles the same-as-group switch back to the exam group select", async () => {
    listAllExams.mockResolvedValue([]);

    render(<ExamsPage />);
    await findEmpty();
    clickSwitchByLabel("Exam is also the Exam Group");
    expect(screen.getByPlaceholderText("e.g. CGL")).toBeInTheDocument();
    clickSwitchByLabel("Exam is also the Exam Group");
    expect(screen.getByText("Select exam group")).toBeInTheDocument();
  });

  it("removes a subject card", async () => {
    listAllExams.mockResolvedValue([]);

    render(<ExamsPage />);
    await findEmpty();
    fireEvent.click(screen.getByRole("button", { name: /add subject/i }));
    expect(await screen.findByText("Subject 1")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".anticon-minus-circle")!);
    expect(screen.queryByText("Subject 1")).not.toBeInTheDocument();
  });
});
