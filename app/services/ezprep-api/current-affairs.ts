import { ezPrepApiClient } from "./browser-client";
import {
  ApiItemResponse,
  ApiListResponse,
  omitEmpty,
  omitUndefined,
} from "./envelope";

export interface CurrentAffairImage {
  key: string;
  bucket: string;
  region?: string;
  contentType?: string;
  size?: number;
  lastModified?: string | Date;
  url?: string;
}

export interface CurrentAffair {
  id: string;
  title: string;
  description: string;
  memoryTrick?: string;
  date: string;
  image?: CurrentAffairImage;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CurrentAffairPayload {
  title: string;
  description: string;
  date: string;
  memoryTrick?: string;
  image?: CurrentAffairImage | null;
}

export const currentAffairsApi = {
  list(searchParams?: {
    date?: string;
    page?: number;
    limit?: number;
    search?: string;
    activeOnly?: boolean;
  }) {
    return ezPrepApiClient.get<ApiListResponse<CurrentAffair>>(
      "/v1/current-affairs",
      { searchParams }
    );
  },

  get(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<CurrentAffair>>(
      `/v1/current-affairs/${id}`
    );
  },

  create(body: CurrentAffairPayload) {
    return ezPrepApiClient.post<ApiItemResponse<CurrentAffair>>(
      "/v1/current-affairs",
      omitEmpty({ ...body } as unknown as Record<string, unknown>)
    );
  },

  update(id: string, body: Partial<CurrentAffairPayload> & { isActive?: boolean }) {
    return ezPrepApiClient.patch<ApiItemResponse<CurrentAffair>>(
      `/v1/current-affairs/${id}`,
      omitUndefined({ ...body } as unknown as Record<string, unknown>)
    );
  },

  delete(id: string) {
    return ezPrepApiClient.delete<ApiItemResponse<CurrentAffair>>(
      `/v1/current-affairs/${id}`
    );
  },
};
