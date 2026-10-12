import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/app/services/ezprep-api";
import ProductsPage from "./page";

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
      list: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    catalogApi: {
      ...actual.catalogApi,
      listExamGroups: vi.fn(),
      listAllExams: vi.fn(),
    },
    mockTestsApi: {
      ...actual.mockTestsApi,
      list: vi.fn(),
    },
    fetchAllPages: vi.fn(async (fetchPage) => {
      const first = await fetchPage(1, 100);
      return first.data || [];
    }),
  };
});

vi.mock("./grant-options", async () => {
  const actual = await vi.importActual<typeof import("./grant-options")>(
    "./grant-options"
  );
  return {
    ...actual,
    loadGrantScopeOptions: vi.fn(async () => ({
      EXAM_GROUP: [{ value: "g1", label: "SSC Group" }],
      EXAM: [{ value: "e1", label: "SSC CGL" }],
      MOCK_TEST: [{ value: "m1", label: "Mock 1" }],
    })),
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

import { productsApi } from "@/app/services/ezprep-api";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";

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

const listProducts = vi.mocked(productsApi.list);
const createProduct = vi.mocked(productsApi.create);

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    code: "SSC_PACK",
    name: "SSC Pack",
    status: "DRAFT",
    version: 0,
    grants: [{ scopeType: "EXAM_GROUP", scopeId: "g1" }],
    ...overrides,
  };
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

describe("ProductsPage", { timeout: 20000 }, () => {
  beforeEach(() => {
    mockWideViewport();
    listProducts.mockReset();
    createProduct.mockReset();
    push.mockReset();
    listProducts.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
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

  it("renders products returned by the API", async () => {
    listProducts.mockResolvedValue({
      message: "ok",
      data: [
        makeProduct(),
        makeProduct({
          id: "p2",
          code: "BANK",
          name: "Bank Pack",
          status: "PUBLISHED",
          version: 2,
          grants: [
            { scopeType: "EXAM_GROUP", scopeId: "g1" },
            { scopeType: "EXAM", scopeId: "e1" },
            { scopeType: "MOCK_TEST", scopeId: "m1" },
          ],
        }),
      ],
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    render(<ProductsPage />);

    await findRow("SSC Pack");
    expect(screen.getAllByText("Bank Pack").length).toBeGreaterThan(0);
    expect(screen.getByText("Add New Product")).toBeInTheDocument();
    expect(screen.getByText("Total 2 products")).toBeInTheDocument();
    expect(screen.getAllByText("SSC Group").length).toBeGreaterThan(0);
    expect(screen.getByText("SSC CGL")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.queryByText("Mock 1")).not.toBeInTheDocument();
  });

  it("requires name, code, and grants on create", async () => {
    render(<ProductsPage />);
    await findEmpty();

    fireEvent.click(screen.getByRole("button", { name: /create product/i }));

    expect(
      await screen.findByText("Please enter product code")
    ).toBeInTheDocument();
    expect(screen.getByText("Please enter product name")).toBeInTheDocument();
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("creates a product with grants", async () => {
    listProducts
      .mockResolvedValueOnce({
        message: "ok",
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      })
      .mockResolvedValueOnce({
        message: "ok",
        data: [makeProduct()],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    createProduct.mockResolvedValue({ message: "ok", data: makeProduct() });

    render(<ProductsPage />);
    await findEmpty();

    fireEvent.change(screen.getByPlaceholderText("SSC_CGL_COMPLETE"), {
      target: { value: "SSC_PACK" },
    });
    fireEvent.change(screen.getByPlaceholderText("SSC CGL Complete"), {
      target: { value: "SSC Pack" },
    });

    await chooseSelectOption("Scope type", "Exam Group");
    await chooseSelectOption("Select one or more targets", "SSC Group");

    fireEvent.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() =>
      expect(createProduct).toHaveBeenCalledWith({
        code: "SSC_PACK",
        name: "SSC Pack",
        description: undefined,
        grants: [{ scopeType: "EXAM_GROUP", scopeId: "g1" }],
      })
    );
    expect(message.success).toHaveBeenCalledWith(
      "Product created successfully"
    );
  });

  it("clears grant targets when the scope type changes", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ProductsPage />);
    await findEmpty();

    await chooseSelectOption("Scope type", "Exam Group");
    await chooseSelectOption("Select one or more targets", "SSC Group");

    const selectedType = document.querySelector(
      ".ant-select-selection-item[title='Exam Group']"
    );
    const selector = selectedType
      ?.closest(".ant-select")
      ?.querySelector(".ant-select-selector");
    expect(selector).toBeTruthy();
    fireEvent.mouseDown(selector!);
    fireEvent.click(
      await screen.findByText("Exam", {
        selector: ".ant-select-item-option-content",
      })
    );

    expect(await screen.findByText("Select one or more targets")).toBeInTheDocument();
    expect(
      document.querySelector(".ant-select-selection-item-content")?.textContent
    ).not.toBe("SSC Group");
    expect(
      errorSpy.mock.calls.some((call) =>
        call.some((part) => String(part).includes("circular references"))
      )
    ).toBe(false);
    errorSpy.mockRestore();
  });

  it("surfaces API errors via formatEzPrepError", async () => {
    listProducts.mockRejectedValue(
      new EzPrepApiError("x", 400, "/p", { message: "Boom products" })
    );

    render(<ProductsPage />);

    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith(
        expect.stringContaining("Boom products")
      )
    );
  });

  it("navigates to the edit page", async () => {
    listProducts.mockResolvedValue({
      message: "ok",
      data: [makeProduct()],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    render(<ProductsPage />);
    await findRow("SSC Pack");
    fireEvent.click(screen.getAllByRole("button", { name: /edit/i })[0]);
    expect(push).toHaveBeenCalledWith("/admin/products/p1");
  });
});
