import { ezPrepApiClient } from "./browser-client";
import { ApiItemResponse } from "./envelope";

export interface UploadedFileMetadata {
  key: string;
  bucket: string;
  region: string;
  contentType: string;
  size: number;
  lastModified: string | Date;
  url: string;
}

export const filesApi = {
  upload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return ezPrepApiClient.post<ApiItemResponse<UploadedFileMetadata>>(
      "/v1/files/upload",
      formData
    );
  },

  signedUrl(key: string, bucket: string) {
    return ezPrepApiClient.post<ApiItemResponse<{ url: string }>>(
      "/v1/files/signed-url",
      { key, bucket }
    );
  },
};
