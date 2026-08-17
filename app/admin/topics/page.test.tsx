import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Topic } from "@/app/services/ezprep-api";
import TopicsPage from "./page";

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
      createTopic: vi.fn(),
      deleteTopic: vi.fn(),
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

const listTopics = vi.mocked(catalogApi.listTopics);
const createTopic = vi.mocked(catalogApi.createTopic);
const deleteTopic = vi.mocked(catalogApi.deleteTopic);

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

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: "t1",
    name: "Algebra",
    description: "Intro algebra",
    isActive: true,
    ...overrides,
  };
}

describe("TopicsPage", { timeout: 15000 }, () => {
  beforeEach(() => {
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
    listTopics.mockReset();
    createTopic.mockReset();
    deleteTopic.mockReset();
    push.mockReset();
    vi.mocked(showConfirmModal).mockClear();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("renders topics returned by the API", async () => {
    listTopics.mockResolvedValue({
      message: "ok",
      data: [makeTopic(), makeTopic({ id: "t2", name: "Geometry" })],
    });

    render(<TopicsPage />);

    await findRow("Algebra");
    expect(screen.getAllByText("Geometry").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Intro algebra").length).toBeGreaterThan(0);
    expect(screen.getByText("Add New Topic")).toBeInTheDocument();
    expect(screen.getByText("Topics List")).toBeInTheDocument();
    expect(screen.getByText("Total 2 topics")).toBeInTheDocument();
    expect(listTopics).toHaveBeenCalled();
  });

  it("shows an empty table when there are no topics", async () => {
    listTopics.mockResolvedValue({ message: "ok", data: [] });

    render(<TopicsPage />);

    expect(await findEmpty()).toBeInTheDocument();
  });

  it("treats a missing data array as an empty list", async () => {
    listTopics.mockResolvedValue({
      message: "ok",
      data: undefined as unknown as Topic[],
    });

    render(<TopicsPage />);

    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces list errors without rendering leaked rows", async () => {
    listTopics.mockRejectedValue(new Error("nope"));

    render(<TopicsPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.queryAllByText("Algebra")).toHaveLength(0);
  });

  it("creates a topic and refreshes the list", async () => {
    listTopics
      .mockResolvedValueOnce({ message: "ok", data: [] })
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeTopic({ id: "t2", name: "Geometry", description: "Shapes" })],
      });
    createTopic.mockResolvedValue({
      message: "ok",
      data: makeTopic({ id: "t2", name: "Geometry" }),
    });

    render(<TopicsPage />);
    await findEmpty();

    fireEvent.change(screen.getByPlaceholderText("Enter topic name"), {
      target: { value: "Geometry" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter topic description"), {
      target: { value: "Shapes" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create topic/i }));

    await waitFor(() =>
      expect(createTopic).toHaveBeenCalledWith({
        name: "Geometry",
        description: "Shapes",
      })
    );
    expect(message.success).toHaveBeenCalledWith("Topic created successfully");
    await findRow("Geometry");
    expect(screen.getByPlaceholderText("Enter topic name")).toHaveValue("");
  });

  it("shows a validation error when the name is missing", async () => {
    listTopics.mockResolvedValue({ message: "ok", data: [] });

    render(<TopicsPage />);
    await findEmpty();

    fireEvent.click(screen.getByRole("button", { name: /create topic/i }));

    expect(await screen.findByText("Please enter topic name")).toBeInTheDocument();
    expect(createTopic).not.toHaveBeenCalled();
  });

  it("surfaces create errors", async () => {
    listTopics.mockResolvedValue({ message: "ok", data: [] });
    createTopic.mockRejectedValue(new Error("nope"));

    render(<TopicsPage />);
    await findEmpty();

    fireEvent.change(screen.getByPlaceholderText("Enter topic name"), {
      target: { value: "Geometry" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create topic/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(message.success).not.toHaveBeenCalled();
  });

  it("navigates to the edit page", async () => {
    listTopics.mockResolvedValue({
      message: "ok",
      data: [makeTopic()],
    });

    render(<TopicsPage />);
    await findRow("Algebra");

    clickFirst(/edit/i);
    expect(push).toHaveBeenCalledWith("/admin/topics/t1");
  });

  it("deletes a topic after confirm", async () => {
    listTopics
      .mockResolvedValueOnce({ message: "ok", data: [makeTopic()] })
      .mockResolvedValueOnce({ message: "ok", data: [] });
    deleteTopic.mockResolvedValue({ message: "ok", data: makeTopic() });

    render(<TopicsPage />);
    await findRow("Algebra");

    clickFirst(/delete/i);

    expect(showConfirmModal).toHaveBeenCalled();
    await waitFor(() => expect(deleteTopic).toHaveBeenCalledWith("t1"));
    expect(message.success).toHaveBeenCalledWith("Topic deleted successfully");
    expect(await findEmpty()).toBeInTheDocument();
  });

  it("surfaces delete errors", async () => {
    listTopics.mockResolvedValue({ message: "ok", data: [makeTopic()] });
    deleteTopic.mockRejectedValue(new Error("nope"));

    render(<TopicsPage />);
    await findRow("Algebra");

    clickFirst(/delete/i);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(screen.getAllByText("Algebra").length).toBeGreaterThan(0);
  });

  it("paginates client-side rows", async () => {
    const rows = Array.from({ length: 11 }, (_, i) =>
      makeTopic({ id: `t${i + 1}`, name: `Topic ${i + 1}` })
    );
    listTopics.mockResolvedValue({ message: "ok", data: rows });

    render(<TopicsPage />);
    await findRow("Topic 1");
    expect(screen.queryAllByText("Topic 11")).toHaveLength(0);

    fireEvent.click(screen.getByRole("listitem", { name: "2" }));

    await findRow("Topic 11");
    expect(screen.queryAllByText("Topic 1")).toHaveLength(0);
  });
});
