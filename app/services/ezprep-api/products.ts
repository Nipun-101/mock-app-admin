import { ezPrepApiClient } from "./browser-client";
import {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
  omitEmpty,
  omitUndefined,
} from "./envelope";
import type { Offer } from "./offers";

export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type EntitlementScopeType = "EXAM_GROUP" | "EXAM" | "MOCK_TEST";

export interface ProductGrant {
  scopeType: EntitlementScopeType;
  scopeId: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: ProductStatus;
  version: number;
  grants: ProductGrant[];
  display?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductDetail extends Product {
  offers?: Offer[];
}

export type CreateProductPayload = {
  code: string;
  name: string;
  description?: string;
  grants: ProductGrant[];
  display?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type UpdateProductPayload = {
  name?: string;
  description?: string;
  grants?: ProductGrant[];
  display?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type DuplicateProductPayload = {
  code?: string;
};

export const productsApi = {
  list(searchParams?: {
    page?: number;
    limit?: number;
    status?: ProductStatus;
    search?: string;
  }) {
    return ezPrepApiClient.get<ApiListResponse<Product>>("/v1/admin/products", {
      searchParams,
    });
  },

  get(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<ProductDetail>>(
      `/v1/admin/products/${id}`
    );
  },

  create(body: CreateProductPayload) {
    return ezPrepApiClient.post<ApiItemResponse<Product>>(
      "/v1/admin/products",
      omitEmpty(body as Record<string, unknown>)
    );
  },

  update(id: string, body: UpdateProductPayload) {
    return ezPrepApiClient.patch<ApiItemResponse<Product>>(
      `/v1/admin/products/${id}`,
      omitUndefined(body as Record<string, unknown>)
    );
  },

  publish(id: string) {
    return ezPrepApiClient.post<ApiItemResponse<Product>>(
      `/v1/admin/products/${id}/publish`
    );
  },

  archive(id: string) {
    return ezPrepApiClient.post<ApiItemResponse<Product>>(
      `/v1/admin/products/${id}/archive`
    );
  },

  duplicate(id: string, body: DuplicateProductPayload = {}) {
    return ezPrepApiClient.post<ApiItemResponse<Product>>(
      `/v1/admin/products/${id}/duplicate`,
      omitEmpty(body as Record<string, unknown>)
    );
  },

  delete(id: string) {
    return ezPrepApiClient.delete<ApiMessageResponse>(
      `/v1/admin/products/${id}`
    );
  },
};
