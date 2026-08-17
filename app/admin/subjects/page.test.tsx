import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Subject, Topic } from "@/app/services/ezprep-api";
import SubjectsPage from "./page";

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
      listTopics: vi.fn(),
      createSubject: vi.fn(),
      deleteSubject: vi.fn(),
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

const listSubjects = vi.mocked(catalogApi.listSubjects);
const listTopics = vi.mocked(catalogApi.listTopics);
const createSubject = vi.mocked(catalogApi.createSubject);
const deleteSubject = vi.mocked(catalogApi.deleteSubject);

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
    id: "s1",
    name: "Mathematics",
    description: "Quant",
    topics: [{ id: "top-1", name: "Algebra" }],
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

describe("SubjectsPage", { timeout: 15000 }, () => {
  beforeEach(() => {
    mockWideViewport();
    listSubjects.mockReset();
    listTopics.mockReset();
    createSubject.mockReset();
    deleteSubject.mockReset();
    push.mockReset();
    vi.mocked(showConfirmModal).mockClear();
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

  it("renders subjects returned by the API", async () => {
    listSubjects.mockResolvedValue({
      message: "ok",
      data: [
        makeSubject(),
        makeSubject({ id: "s2", name: "English", topics: [], description: undefined }),
        makeSubject({
          id: "s3",
          name: "Reasoning",
          topics: [{ id: "top-2", name: "" }],
        }),
      ],
    });

    render(<SubjectsPage />);

    await findRow("Mathematics");
    expect(screen.getAllByText("English").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Algebra").length).toBeGreaterThan(0);
    expect(screen.getByText("Add New Subject")).toBeInTheDocument();
    expect(screen.getByText("Total 3 subjects")).toBeInTheDocument();
  });

  it("shows an empty table when there are no subjects", async () => {
    listSubjects.mockResolvedValue({ message: "ok", data: [] });

    render(<SubjectsPage />);

    expect(await findEmpty()).toBeInTheDocument();
  });

  it("treats a missing data array as an empty list", async () => {
    listSubjects.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Subject[],
    });
    listTopics.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Topic[],
    });

    render(<SubjectsPage />);

    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces list errors without rendering leaked rows", async () => {
    listSubjects.mockRejectedValue(new Error("nope"));

    render(<SubjectsPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.queryAllByText("Mathematics")).toHaveLength(0);
  });

  it("surfaces topic list errors", async () => {
    listSubjects.mockResolvedValue({ message: "ok", data: [] });
    listTopics.mockRejectedValue(new Error("nope"));

    render(<SubjectsPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("creates a subject and refreshes the list", async () => {
    listSubjects
      .mockResolvedValueOnce({ message: "ok", data: [] })
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeSubject({ id: "s2", name: "English" })],
      });
    createSubject.mockResolvedValue({
      message: "ok",
      data: makeSubject({ id: "s2", name: "English" }),
    });

    render(<SubjectsPage />);
    await findEmpty();

    fireEvent.change(screen.getByPlaceholderText("Enter subject name"), {
      target: { value: "English" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter subject description"), {
      target: { value: "Language" },
    });
    await chooseSelectOption("Select topics", "Algebra");
    fireEvent.click(screen.getByRole("button", { name: /create subject/i }));

    await waitFor(() =>
      expect(createSubject).toHaveBeenCalledWith({
        name: "English",
        description: "Language",
        topics: ["top-1"],
      })
    );
    expect(message.success).toHaveBeenCalledWith("Subject created successfully");
    await findRow("English");
  });

  it("creates a subject with only a name", async () => {
    listSubjects.mockResolvedValue({ message: "ok", data: [] });
    createSubject.mockResolvedValue({
      message: "ok",
      data: makeSubject({ id: "s2", name: "English", topics: [] }),
    });

    render(<SubjectsPage />);
    await findEmpty();
    fireEvent.change(screen.getByPlaceholderText("Enter subject name"), {
      target: { value: "English" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create subject/i }));

    await waitFor(() =>
      expect(createSubject).toHaveBeenCalledWith({ name: "English" })
    );
  });

  it("shows a validation error when the name is missing", async () => {
    listSubjects.mockResolvedValue({ message: "ok", data: [] });

    render(<SubjectsPage />);
    await findEmpty();
    fireEvent.click(screen.getByRole("button", { name: /create subject/i }));

    expect(await screen.findByText("Please enter subject name")).toBeInTheDocument();
    expect(createSubject).not.toHaveBeenCalled();
  });

  it("surfaces create errors", async () => {
    listSubjects.mockResolvedValue({ message: "ok", data: [] });
    createSubject.mockRejectedValue(new Error("nope"));

    render(<SubjectsPage />);
    await findEmpty();
    fireEvent.change(screen.getByPlaceholderText("Enter subject name"), {
      target: { value: "English" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create subject/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("navigates to the edit page", async () => {
    listSubjects.mockResolvedValue({ message: "ok", data: [makeSubject()] });

    render(<SubjectsPage />);
    await findRow("Mathematics");
    clickFirst(/edit/i);
    expect(push).toHaveBeenCalledWith("/admin/subjects/s1");
  });

  it("deletes a subject after confirm", async () => {
    listSubjects
      .mockResolvedValueOnce({ message: "ok", data: [makeSubject()] })
      .mockResolvedValueOnce({ message: "ok", data: [] });
    deleteSubject.mockResolvedValue({ message: "ok", data: makeSubject() });

    render(<SubjectsPage />);
    await findRow("Mathematics");
    clickFirst(/delete/i);

    expect(showConfirmModal).toHaveBeenCalled();
    await waitFor(() => expect(deleteSubject).toHaveBeenCalledWith("s1"));
    expect(message.success).toHaveBeenCalledWith("Subject deleted successfully");
    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces delete errors", async () => {
    listSubjects.mockResolvedValue({ message: "ok", data: [makeSubject()] });
    deleteSubject.mockRejectedValue(new Error("nope"));

    render(<SubjectsPage />);
    await findRow("Mathematics");
    clickFirst(/delete/i);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getAllByText("Mathematics").length).toBeGreaterThan(0);
  });

  it("paginates client-side rows", async () => {
    const rows = Array.from({ length: 11 }, (_, i) =>
      makeSubject({ id: `s${i + 1}`, name: `Subject ${i + 1}` })
    );
    listSubjects.mockResolvedValue({ message: "ok", data: rows });

    render(<SubjectsPage />);
    await findRow("Subject 1");
    expect(screen.queryAllByText("Subject 11")).toHaveLength(0);

    fireEvent.click(screen.getByRole("listitem", { name: "2" }));

    await findRow("Subject 11");
    expect(screen.queryAllByText("Subject 1")).toHaveLength(0);
  });
});
