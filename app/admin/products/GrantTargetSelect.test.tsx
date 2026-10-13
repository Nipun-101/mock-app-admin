import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EzPrepApiError, grantTargetsApi } from "@/app/services/ezprep-api";
import { GrantTargetSelect } from "./GrantTargetSelect";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    grantTargetsApi: {
      search: vi.fn(),
    },
  };
});

const search = vi.mocked(grantTargetsApi.search);

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

function page(
  data: { id: string; label: string }[],
  overrides: {
    total?: number;
    page?: number;
    hasNextPage?: boolean;
  } = {}
) {
  const total = overrides.total ?? data.length;
  const pageNumber = overrides.page ?? 1;
  return {
    message: "ok",
    data,
    pagination: {
      total,
      page: pageNumber,
      limit: 20,
      totalPages: Math.ceil(total / 20) || 0,
      hasNextPage: overrides.hasNextPage ?? false,
      hasPrevPage: pageNumber > 1,
    },
  };
}

function openSelect() {
  const input = screen.getByRole("combobox");
  const selector = input.closest(".ant-select-selector");
  expect(selector).toBeTruthy();
  fireEvent.mouseDown(selector!);
}

describe("GrantTargetSelect", () => {
  beforeEach(() => {
    search.mockReset();
    vi.useRealTimers();
  });

  it("loads the first page when the dropdown opens", async () => {
    search.mockResolvedValue(page([{ id: "m1", label: "Topic · Polity" }]));

    render(<GrantTargetSelect scopeType="MOCK_TEST" />);
    openSelect();

    expect(
      await screen.findByText("Topic · Polity", {
        selector: ".ant-select-item-option-content",
      })
    ).toBeInTheDocument();
    expect(search).toHaveBeenCalledWith({
      scopeType: "MOCK_TEST",
      search: undefined,
      page: 1,
      limit: 20,
    });
  });

  it("loads the first page again when the scope type changes", async () => {
    search.mockResolvedValue(page([{ id: "e1", label: "SSC CGL" }]));
    const { rerender } = render(<GrantTargetSelect scopeType="EXAM" />);

    await waitFor(() =>
      expect(search).toHaveBeenCalledWith({
        scopeType: "EXAM",
        search: undefined,
        page: 1,
        limit: 20,
      })
    );

    search.mockClear();
    search.mockResolvedValue(page([{ id: "g1", label: "SSC (CGL)" }]));
    rerender(<GrantTargetSelect scopeType="EXAM_GROUP" />);

    await waitFor(() =>
      expect(search).toHaveBeenCalledWith({
        scopeType: "EXAM_GROUP",
        search: undefined,
        page: 1,
        limit: 20,
      })
    );
  });

  it("shows an empty state when nothing matches", async () => {
    search.mockResolvedValue(page([]));
    render(<GrantTargetSelect scopeType="EXAM" />);
    openSelect();
    expect(await screen.findByText("No targets")).toBeInTheDocument();
  });

  it("tells the user when more results exist", async () => {
    search.mockResolvedValue(
      page([{ id: "e1", label: "SSC CGL" }], { total: 40, hasNextPage: true })
    );
    render(<GrantTargetSelect scopeType="EXAM" />);
    openSelect();
    expect(await screen.findByTestId("grant-target-status")).toHaveTextContent(
      "Showing 1 of 40. Scroll for more or refine the search."
    );
  });

  it("debounces typed search and ignores a stale response", async () => {
    let resolveFirst: (value: ReturnType<typeof page>) => void = () => {};
    search.mockImplementation(async (params) => {
      if (!params.search) return page([]);
      if (params.search === "aaa") {
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      }
      return page([{ id: "b1", label: "BBB paper" }]);
    });

    render(<GrantTargetSelect scopeType="MOCK_TEST" />);
    openSelect();
    await waitFor(() => expect(search).toHaveBeenCalled());
    search.mockClear();

    vi.useFakeTimers();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "aaa" } });
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ search: "aaa", page: 1 })
    );

    fireEvent.change(input, { target: { value: "bbb" } });
    await vi.advanceTimersByTimeAsync(300);
    await vi.waitFor(() => {
      expect(screen.getByText("BBB paper")).toBeInTheDocument();
    });

    resolveFirst(page([{ id: "a1", label: "AAA paper" }]));
    await vi.waitFor(() => {
      expect(screen.queryByText("AAA paper")).not.toBeInTheDocument();
    });
    expect(screen.getByText("BBB paper")).toBeInTheDocument();
  });

  it("keeps a selected target when it is absent from the new search", async () => {
    search.mockImplementation(async (params) => {
      if (params.ids) return page([{ id: "kept", label: "Kept paper" }]);
      if (params.search === "other") {
        return page([{ id: "other", label: "Other paper" }]);
      }
      return page([{ id: "kept", label: "Kept paper" }]);
    });

    render(
      <GrantTargetSelect scopeType="MOCK_TEST" value={["kept"]} onChange={() => {}} />
    );
    await waitFor(() => {
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({ ids: "kept" })
      );
    });
    openSelect();

    expect(
      await screen.findByText("Kept paper", {
        selector: ".ant-select-item-option-content",
      })
    ).toBeInTheDocument();

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "other" } });

    expect(
      await screen.findByText("Other paper", {
        selector: ".ant-select-item-option-content",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Kept paper", {
        selector: ".ant-select-item-option-content",
      })
    ).toBeInTheDocument();
  });

  it("shows an error without dropping the current selection", async () => {
    search.mockImplementation(async (params) => {
      if (params.ids) return page([{ id: "kept", label: "Kept paper" }]);
      throw new EzPrepApiError("nope", 500, "/v1/admin/grant-targets", {
        message: "Search failed",
      });
    });

    render(<GrantTargetSelect scopeType="MOCK_TEST" value={["kept"]} />);
    await waitFor(() => {
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({ ids: "kept" })
      );
    });
    openSelect();

    expect(await screen.findByTestId("grant-target-error")).toHaveTextContent(
      "Search failed"
    );
    expect(
      screen.getByText("Kept paper", {
        selector: ".ant-select-item-option-content",
      })
    ).toBeInTheDocument();
  });

  it("loads the next page when the menu is scrolled", async () => {
    search.mockImplementation(async (params) => {
      if (params.page === 2) {
        return page([{ id: "m2", label: "Second paper" }], {
          total: 40,
          page: 2,
          hasNextPage: true,
        });
      }
      return page([{ id: "m1", label: "First paper" }], {
        total: 40,
        hasNextPage: true,
      });
    });

    render(<GrantTargetSelect scopeType="MOCK_TEST" />);
    openSelect();
    expect(await screen.findByTestId("grant-target-status")).toBeInTheDocument();

    const holder = document.querySelector(".rc-virtual-list-holder");
    expect(holder).toBeTruthy();
    fireEvent.scroll(holder!);

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, scopeType: "MOCK_TEST" })
      );
    });
    expect(
      await screen.findByText("Second paper", {
        selector: ".ant-select-item-option-content",
      })
    ).toBeInTheDocument();
  });
});
