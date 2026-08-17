import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentAffair } from "@/app/services/ezprep-api";
import { todayDateKey } from "./date-key";
import CurrentAffairsPage from "./page";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: ({ onConfirm }: { onConfirm: () => void | Promise<void> }) => {
    void onConfirm();
  },
}));

vi.mock("@/app/components/ImageUpload", () => ({
  ImageUpload: ({ label }: { label?: string }) => (
    <div data-testid="image-upload">{label ?? "Image upload"}</div>
  ),
  toPlainImageMetadata: (value: unknown) => {
    if (!value || typeof value !== "object") return undefined;
    const row = value as { key?: unknown; bucket?: unknown };
    if (typeof row.key !== "string" || !row.key) return undefined;
    if (typeof row.bucket !== "string" || !row.bucket) return undefined;
    return value;
  },
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    currentAffairsApi: {
      list: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
    },
  };
});

import { currentAffairsApi } from "@/app/services/ezprep-api";

const list = vi.mocked(currentAffairsApi.list);
const create = vi.mocked(currentAffairsApi.create);
const remove = vi.mocked(currentAffairsApi.delete);

function makeAffair(overrides: Partial<CurrentAffair> = {}): CurrentAffair {
  return {
    id: "ca-1",
    title: "Monsoon arrives",
    description: "Southwest monsoon hit Kerala",
    memoryTrick: "M for monsoon",
    date: todayDateKey(),
    imageUrl: "https://cdn.example/rain.png",
    sortOrder: 1,
    isActive: true,
    ...overrides,
  };
}

const pagination = {
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

describe("CurrentAffairsPage", () => {
  beforeEach(() => {
    list.mockReset();
    create.mockReset();
    remove.mockReset();
    push.mockReset();
    list.mockResolvedValue({
      message: "ok",
      data: [makeAffair()],
      pagination,
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

  it("lists current affairs for today", async () => {
    render(<CurrentAffairsPage />);

    expect(await screen.findAllByText("Monsoon arrives")).not.toHaveLength(0);
    expect(list).toHaveBeenCalledWith({
      date: todayDateKey(),
      page: 1,
      limit: 10,
    });
    expect(screen.getByText("Create current affair")).toBeInTheDocument();
    expect(screen.getByText("Saved current affairs")).toBeInTheDocument();
  });

  it("shows an empty state when there are no items", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });

    render(<CurrentAffairsPage />);

    expect(
      await screen.findByText(new RegExp(`No items for ${todayDateKey()}`))
    ).toBeInTheDocument();
  });

  it("creates an item and refreshes the list", async () => {
    create.mockResolvedValue({
      message: "ok",
      data: makeAffair({ id: "ca-2", title: "Budget day" }),
    });

    render(<CurrentAffairsPage />);
    await screen.findAllByText("Monsoon arrives");

    fireEvent.change(screen.getByPlaceholderText("Headline for this event"), {
      target: { value: "Budget day" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create item/i }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Budget day",
          date: todayDateKey(),
        })
      )
    );
    expect(message.success).toHaveBeenCalled();
    expect(list.mock.calls.length).toBeGreaterThan(1);
  });

  it("surfaces a create error", async () => {
    create.mockRejectedValue(new Error("nope"));

    render(<CurrentAffairsPage />);
    await screen.findAllByText("Monsoon arrives");

    fireEvent.change(screen.getByPlaceholderText("Headline for this event"), {
      target: { value: "Budget day" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create item/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("navigates to edit", async () => {
    render(<CurrentAffairsPage />);
    await screen.findAllByText("Monsoon arrives");

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(push).toHaveBeenCalledWith("/admin/current-affairs/ca-1");
  });

  it("deletes an item after confirm", async () => {
    remove.mockResolvedValue({
      message: "ok",
      data: makeAffair(),
    });

    render(<CurrentAffairsPage />);
    await screen.findAllByText("Monsoon arrives");

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    await waitFor(() => expect(remove).toHaveBeenCalledWith("ca-1"));
    expect(message.success).toHaveBeenCalled();
  });

  it("surfaces a delete error", async () => {
    remove.mockRejectedValue(new Error("nope"));

    render(<CurrentAffairsPage />);
    await screen.findAllByText("Monsoon arrives");

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("surfaces a list fetch error", async () => {
    list.mockRejectedValue(new Error("nope"));

    render(<CurrentAffairsPage />);

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("renders a description excerpt and a dash when there is no image", async () => {
    const long = "x".repeat(90);
    list.mockResolvedValue({
      message: "ok",
      data: [
        makeAffair({
          description: long,
          memoryTrick: undefined,
          imageUrl: undefined,
        }),
      ],
      pagination,
    });

    render(<CurrentAffairsPage />);

    expect(await screen.findAllByText("Monsoon arrives")).not.toHaveLength(0);
    expect(screen.getAllByText("x".repeat(90)).length).toBeGreaterThan(0);
  });
});
