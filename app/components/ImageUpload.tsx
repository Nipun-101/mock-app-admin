"use client";

import { Upload, Button, message, Modal, Spin, Form } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { CloseOutlined, UploadOutlined } from "@ant-design/icons";
import { filesApi, formatEzPrepError } from "@/app/services/ezprep-api";
import { setFormValue } from "@/app/lib/form-store";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { usePresignedUrl } from "@/app/hooks/usePresignedUrl";

interface ImageUploadProps {
  name: (string | number)[];
  label?: string;
  onUploadingChange?: (uploading: boolean) => void;
}

export type PlainImageMetadata = {
  key: string;
  bucket: string;
  region?: string;
  contentType?: string;
  size?: number;
  lastModified?: string;
};

export function toPlainImageMetadata(
  value: unknown
): PlainImageMetadata | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.key !== "string" || !row.key || typeof row.bucket !== "string" || !row.bucket) {
    return undefined;
  }

  const lastModified =
    row.lastModified instanceof Date
      ? row.lastModified.toISOString()
      : typeof row.lastModified === "string"
        ? row.lastModified
        : undefined;

  return {
    key: row.key,
    bucket: row.bucket,
    ...(typeof row.region === "string" ? { region: row.region } : {}),
    ...(typeof row.contentType === "string" ? { contentType: row.contentType } : {}),
    ...(typeof row.size === "number" ? { size: row.size } : {}),
    ...(lastModified ? { lastModified } : {}),
  };
}

type ImageUploader = (file: File) => Promise<void>;

const imageUploaders = new Map<string, ImageUploader>();

export function imageFieldKey(name: (string | number)[]) {
  return JSON.stringify(name);
}

export function registerImageUploader(name: (string | number)[], upload: ImageUploader) {
  const key = imageFieldKey(name);
  imageUploaders.set(key, upload);
  return () => {
    if (imageUploaders.get(key) === upload) {
      imageUploaders.delete(key);
    }
  };
}

export function hasImageUploader(name: (string | number)[]) {
  return imageUploaders.has(imageFieldKey(name));
}

export async function uploadPastedImage(name: (string | number)[], file: File) {
  const upload = imageUploaders.get(imageFieldKey(name));
  if (!upload) {
    return false;
  }
  try {
    await upload(file);
    return true;
  } catch {
    return false;
  }
}

function isJpgOrPng(file: File) {
  return file.type === "image/jpeg" || file.type === "image/png";
}

/** Holds object values in Form state without mounting a DOM input. */
function FormObjectValue({
  onChange,
  changeRef,
}: {
  value?: unknown;
  onChange?: (value: unknown) => void;
  changeRef: MutableRefObject<((value: unknown) => void) | undefined>;
}) {
  changeRef.current = onChange;
  return null;
}

export const ImageUpload = ({ name, label, onUploadingChange }: ImageUploadProps) => {
  const form = Form.useFormInstance();
  const setValueRef = useRef<((value: unknown) => void) | undefined>(undefined);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);
  const localPreviewUrlRef = useRef<string | null>(null);
  const formMetadata = Form.useWatch(name, form);
  const storedMetadata = toPlainImageMetadata(formMetadata);
  const imageKey = typeof storedMetadata?.key === "string" ? storedMetadata.key : undefined;
  const { url: signedUrl } = usePresignedUrl(
    storedMetadata
      ? {
          key: String(storedMetadata.key),
          bucket: String(storedMetadata.bucket),
          region:
            typeof storedMetadata.region === "string"
              ? storedMetadata.region
              : undefined,
        }
      : null
  );

  const nameRef = useRef(name);
  nameRef.current = name;

  const writeValue = useCallback(
    (value: unknown) => {
      if (setValueRef.current) {
        setValueRef.current(value);
        return;
      }
      setFormValue(form, nameRef.current, value);
    },
    [form]
  );

  const revokeLocalPreview = useCallback(() => {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokeLocalPreview(), [revokeLocalPreview]);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [onUploadingChange, uploading]);

  useEffect(() => {
    if (uploading) {
      return;
    }
    if (signedUrl) {
      revokeLocalPreview();
      setFileList([{ uid: "current-image", name: "image", url: signedUrl, status: "done" }]);
      return;
    }
    if (localPreviewUrlRef.current) {
      return;
    }
    if (!imageKey) {
      setFileList([]);
    }
  }, [signedUrl, imageKey, uploading, revokeLocalPreview]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isJpgOrPng(file)) {
        message.error("You can only upload JPG/PNG files!");
        throw new Error("Invalid image type");
      }
      if (uploadingRef.current) {
        message.warning("Please wait for the current upload to finish");
        throw new Error("Upload in progress");
      }

      revokeLocalPreview();
      const localUrl = URL.createObjectURL(file);
      localPreviewUrlRef.current = localUrl;
      uploadingRef.current = true;
      setUploading(true);
      setFileList([
        {
          uid: "uploading-image",
          name: file.name,
          status: "uploading",
          url: localUrl,
        },
      ]);

      try {
        const { data: response } = await filesApi.upload(file);
        const metadata = toPlainImageMetadata(response);
        if (!metadata) {
          throw new Error("Upload did not return image metadata");
        }
        writeValue(metadata);
        setFileList([
          {
            uid: "current-image",
            name: file.name,
            status: "done",
            url: localUrl,
          },
        ]);
      } catch (error) {
        revokeLocalPreview();
        setFileList([]);
        writeValue(undefined);
        message.error(formatEzPrepError(error, "Failed to upload image"));
        throw error;
      } finally {
        uploadingRef.current = false;
        setUploading(false);
      }
    },
    [revokeLocalPreview, writeValue]
  );

  const nameKey = imageFieldKey(name);
  useEffect(() => registerImageUploader(name, uploadFile), [name, nameKey, uploadFile]);

  const hasImage = fileList.length > 0;

  return (
    <>
      <Form.Item name={name} hidden>
        <FormObjectValue changeRef={setValueRef} />
      </Form.Item>
      <Form.Item label={label}>
        <Spin spinning={uploading} tip="Uploading image…">
          <Upload
            fileList={fileList}
            listType="picture"
            maxCount={1}
            accept="image/jpeg,image/png"
            disabled={uploading}
            showUploadList={{
              showPreviewIcon: !uploading,
              showRemoveIcon: !uploading,
            }}
            onPreview={(file) => {
              const previewUrl = signedUrl || file.url;
              if (!previewUrl) {
                return;
              }
              Modal.info({
                title: "Image Preview",
                content: (
                  <div style={{ textAlign: "center" }}>
                    <img alt="preview" src={previewUrl} style={{ maxWidth: "100%" }} />
                  </div>
                ),
                width: "60%",
                maskClosable: true,
                footer: null,
                closable: true,
                closeIcon: <CloseOutlined />,
              });
            }}
            customRequest={async (options) => {
              const { file, onSuccess, onError } = options;
              try {
                await uploadFile(file as File);
                onSuccess?.({});
              } catch (error) {
                onError?.(error as Error);
              }
            }}
            onRemove={() => {
              if (uploading) {
                return false;
              }
              revokeLocalPreview();
              writeValue(undefined);
              setFileList([]);
              return true;
            }}
            beforeUpload={(file) => {
              if (!isJpgOrPng(file)) {
                message.error("You can only upload JPG/PNG files!");
                return false;
              }
              return true;
            }}
          >
            <Button
              icon={<UploadOutlined />}
              disabled={hasImage || uploading}
              loading={uploading}
            >
              {uploading ? "Uploading…" : "Upload Image"}
            </Button>
          </Upload>
        </Spin>
      </Form.Item>
    </>
  );
};
