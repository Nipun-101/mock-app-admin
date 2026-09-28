import { ezPrepApiClient } from "./browser-client";
import { ApiItemResponse } from "./envelope";

export interface InstanceConfig {
  id: string;
  schemaVersion: number;
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInstanceConfigInput {
  name: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

export interface UpdateInstanceConfigInput {
  name?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

const PATH = "/v1/instance-config";

export const instanceConfigApi = {
  get() {
    return ezPrepApiClient.get<ApiItemResponse<InstanceConfig | null>>(PATH);
  },

  create(body: CreateInstanceConfigInput) {
    return ezPrepApiClient.post<ApiItemResponse<InstanceConfig>>(PATH, body);
  },

  update(body: UpdateInstanceConfigInput) {
    return ezPrepApiClient.put<ApiItemResponse<InstanceConfig>>(PATH, body);
  },
};
