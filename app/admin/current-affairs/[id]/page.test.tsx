import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentAffair } from "@/app/services/ezprep-api";
import EditCurrentAffairPage from "./page";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
const currentAffairsMocks = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
}));

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
  useRouter: () => ({ push }),
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
    currentAffairsApi: currentAffairsMocks,
  };
});

import { currentAffairsApi } from "@/app/services/ezprep-api";

const get = vi.mocked(currentAffairsApi.get);
const update = vi.mocked(currentAffairsApi.update);

const item: CurrentAffair = {
  id: "id-1",
  title: "Monsoon arrives",
  description: "Southwest monsoon hit Kerala",
  memoryTrick: "M for monsoon",
  date: "2026-08-17",
  image: { key: "k1", bucket: "b1" },
  sortOrder: 1,
  isActive: true,
};

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
  return render(<EditCurrentAffairPage params={paramsPromise()} />);
}

async function loadedTitle() {
  return screen.findByDisplayValue("Monsoon arrives");
}

describe("EditCurrentAffairPage", () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ message: "ok", data: item });
    update.mockReset();
    push.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("loads the item into the form", async () => {
    renderPage();

    expect(await loadedTitle()).toBeInTheDocument();
    expect(screen.getByDisplayValue("Southwest monsoon hit Kerala")).toBeInTheDocument();
    expect(screen.getByDisplayValue("M for monsoon")).toBeInTheDocument();
    expect(screen.getByText("Edit current affair")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("id-1");
  });

  it("saves changes and returns to the list", async () => {
    update.mockResolvedValue({ message: "ok", data: item });

    renderPage();
    await loadedTitle();

    fireEvent.change(screen.getByPlaceholderText("Headline for this event"), {
      target: { value: "Monsoon delayed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        "id-1",
        expect.objectContaining({
          title: "Monsoon delayed",
          date: "2026-08-17",
          image: expect.objectContaining({ key: "k1", bucket: "b1" }),
        })
      )
    );
    expect(message.success).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/admin/current-affairs");
  });

  it("keeps a previously saved image when the field is unchanged", async () => {
    get.mockResolvedValue({
      message: "ok",
      data: { ...item, image: { key: "old", bucket: "b1" } },
    });
    update.mockResolvedValue({ message: "ok", data: item });

    renderPage();
    await loadedTitle();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    const payload = update.mock.calls[0][1];
    expect(payload.image).toEqual(expect.objectContaining({ key: "old" }));
  });

  it("surfaces a fetch error", async () => {
    get.mockRejectedValue(new Error("nope"));

    renderPage();

    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("surfaces an update error", async () => {
    update.mockRejectedValue(new Error("nope"));

    renderPage();
    await loadedTitle();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("goes back to the list from back and cancel", async () => {
    renderPage();
    await loadedTitle();

    fireEvent.click(screen.getByRole("button", { name: /back to list/i }));
    expect(push).toHaveBeenCalledWith("/admin/current-affairs");

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(push).toHaveBeenCalledWith("/admin/current-affairs");
  });
});
