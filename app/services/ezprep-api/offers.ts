import { ezPrepApiClient } from "./browser-client";
import {
  ApiItemResponse,
  omitEmpty,
  omitUndefined,
} from "./envelope";

export type DurationPreset = "1M" | "3M" | "6M" | "12M" | "LIFETIME";

export type OfferStatus = "ACTIVE" | "INACTIVE";

export interface Offer {
  id: string;
  productId: string;
  durationPreset: DurationPreset;
  currency: string;
  listAmount: number;
  saleAmount?: number;
  taxIncluded: boolean;
  saleValidFrom?: string;
  saleValidUntil?: string;
  status: OfferStatus;
  effectiveAmount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateOfferPayload = {
  durationPreset: DurationPreset;
  listAmount: number;
  saleAmount?: number;
  saleValidFrom?: string;
  saleValidUntil?: string;
  status?: OfferStatus;
};

export type UpdateOfferPayload = {
  listAmount?: number;
  saleAmount?: number | null;
  saleValidFrom?: string | null;
  saleValidUntil?: string | null;
  status?: OfferStatus;
};

export const offersApi = {
  createForProduct(productId: string, body: CreateOfferPayload) {
    return ezPrepApiClient.post<ApiItemResponse<Offer>>(
      `/v1/admin/products/${productId}/offers`,
      omitEmpty(body as Record<string, unknown>)
    );
  },

  get(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<Offer>>(
      `/v1/admin/offers/${id}`
    );
  },

  update(id: string, body: UpdateOfferPayload) {
    return ezPrepApiClient.patch<ApiItemResponse<Offer>>(
      `/v1/admin/offers/${id}`,
      omitUndefined(body as Record<string, unknown>)
    );
  },
};
