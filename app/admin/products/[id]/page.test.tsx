import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Offer, ProductDetail } from "@/app/services/ezprep-api";
import EditProductPage from "./page";

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
    productsApi: {
      get: vi.fn(),
      update: vi.fn(),
      publish: vi.fn(),
      archive: vi.fn(),
      duplicate: vi.fn(),
      delete: vi.fn(),
    },
    offersApi: {
      createForProduct: vi.fn(),
      update: vi.fn(),
      get: vi.fn(),
    },
  };
});

vi.mock("../grant-options", async () => {
  const actual = await vi.importActual<typeof import("../grant-options")>(
    "../grant-options"
  );
  return {
    ...actual,
    loadGrantScopeOptions: vi.fn(async () => ({
      EXAM_GROUP: [{ value: "g1", label: "SSC Group" }],
      EXAM: [],
      MOCK_TEST: [],
    })),
  };
});

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (value: unknown) => {
      if (value && typeof value === "object" && "then" in value) {
        const thenable = value as { value?: { id: string } };
        return thenable.value ?? { id: "p1" };
      }
      return actual.use(value as never);
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh }),
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: vi.fn(({ onConfirm }: { onConfirm: () => void }) =>
    onConfirm()
  ),
}));

import { offersApi, productsApi } from "@/app/services/ezprep-api";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import { showConfirmModal } from "@/components/ConfirmModal";

const getProduct = vi.mocked(productsApi.get);
const publishProduct = vi.mocked(productsApi.publish);
const createOffer = vi.mocked(offersApi.createForProduct);

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "o1",
    productId: "p1",
    durationPreset: "3M",
    currency: "INR",
    listAmount: 99900,
    taxIncluded: true,
    status: "ACTIVE",
    ...overrides,
  };
}

function makeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "p1",
    code: "SSC_PACK",
    name: "SSC Pack",
    status: "DRAFT",
    version: 0,
    grants: [{ scopeType: "EXAM_GROUP", scopeId: "g1" }],
    offers: [],
    ...overrides,
  };
}

function paramsPromise(id = "p1") {
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
  return render(<EditProductPage params={paramsPromise()} />);
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

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

async function chooseSelectOption(placeholder: string, optionLabel: string) {
  const placeholderNode = await screen.findByText(placeholder);
  const selector = placeholderNode
    .closest(".ant-select")
    ?.querySelector(".ant-select-selector");
  expect(selector).toBeTruthy();
  fireEvent.mouseDown(selector!);
  const option = await screen.findByText(optionLabel, {
    selector: ".ant-select-item-option-content",
  });
  fireEvent.click(option);
}

describe("EditProductPage", { timeout: 20000 }, () => {
  beforeEach(() => {
    mockWideViewport();
    getProduct.mockReset();
    publishProduct.mockReset();
    createOffer.mockReset();
    push.mockReset();
    vi.mocked(showConfirmModal).mockClear();
    getProduct.mockResolvedValue({ message: "ok", data: makeProduct() });
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("loads product detail", async () => {
    renderPage();
    expect(await screen.findByDisplayValue("SSC Pack")).toBeInTheDocument();
    expect(screen.getByDisplayValue("SSC_PACK")).toBeInTheDocument();
    expect(screen.getByText("Offers")).toBeInTheDocument();
  });

  it("calls publish endpoint on confirm", async () => {
    publishProduct.mockResolvedValue({
      message: "ok",
      data: makeProduct({ status: "PUBLISHED", version: 1 }),
    });
    getProduct
      .mockResolvedValueOnce({ message: "ok", data: makeProduct() })
      .mockResolvedValueOnce({
        message: "ok",
        data: makeProduct({ status: "PUBLISHED", version: 1 }),
      });

    renderPage();
    await screen.findByDisplayValue("SSC Pack");

    fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));

    expect(showConfirmModal).toHaveBeenCalled();
    await waitFor(() => expect(publishProduct).toHaveBeenCalledWith("p1"));
    expect(message.success).toHaveBeenCalledWith(
      "Product published successfully"
    );
  });

  it("creates an offer with durationPreset and paise amounts", async () => {
    createOffer.mockResolvedValue({ message: "ok", data: makeOffer() });
    getProduct
      .mockResolvedValueOnce({ message: "ok", data: makeProduct() })
      .mockResolvedValueOnce({
        message: "ok",
        data: makeProduct({ offers: [makeOffer()] }),
      });

    renderPage();
    await screen.findByDisplayValue("SSC Pack");

    fireEvent.click(screen.getByRole("button", { name: /add offer/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    await chooseSelectOption("Select duration", "3 months");

    const listInput = dialog.querySelector(
      "input#listAmountRupees"
    ) as HTMLInputElement | null;
    expect(listInput).toBeTruthy();
    fireEvent.focus(listInput!);
    fireEvent.change(listInput!, { target: { value: "999" } });
    fireEvent.blur(listInput!);

    fireEvent.click(screen.getByRole("button", { name: /create offer/i }));

    await waitFor(() =>
      expect(createOffer).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({
          durationPreset: "3M",
          listAmount: 99900,
          status: "ACTIVE",
        })
      )
    );
  });


  it("surfaces API errors when loading fails", async () => {
    getProduct.mockRejectedValue(
      new EzPrepApiError("x", 404, "/p", { message: "Product missing" })
    );

    renderPage();

    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith(
        expect.stringContaining("Product missing")
      )
    );
  });
});
