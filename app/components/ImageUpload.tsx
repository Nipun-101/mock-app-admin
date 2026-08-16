"use client";

import { Upload, Button, message, Modal, Spin } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { CloseOutlined, UploadOutlined } from "@ant-design/icons";
import { filesApi, formatEzPrepError } from "@/app/services/ezprep-api";
import { Form } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePresignedUrl } from "@/app/hooks/usePresignedUrl";

interface ImageUploadProps {
  name: (string | number)[];
  label?: string;
  onUploadingChange?: (uploading: boolean) => void;
}

function toPlainImageMetadata(value: unknown): Record<string, unknown> | undefined {
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

/** Holds object values in Form state without mounting a DOM input. */
function FormObjectValue(_props: { value?: unknown; onChange?: (value: unknown) => void }) {
  return null;
}

export const ImageUpload = ({ name, label, onUploadingChange }: ImageUploadProps) => {
  const form = Form.useFormInstance();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
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
    if (!imageKey) {
      setFileList([]);
    }
  }, [signedUrl, imageKey, uploading, revokeLocalPreview]);

  const hasImage = fileList.length > 0;

  return (
    <>
      <Form.Item name={name} hidden>
        <FormObjectValue />
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
              const uploadFile = file as File;
              revokeLocalPreview();
              const localUrl = URL.createObjectURL(uploadFile);
              localPreviewUrlRef.current = localUrl;
              setUploading(true);
              setFileList([
                {
                  uid: "uploading-image",
                  name: uploadFile.name,
                  status: "uploading",
                  url: localUrl,
                },
              ]);
              try {
                const { data: response } = await filesApi.upload(uploadFile);
                const metadata = toPlainImageMetadata(response);
                if (!metadata) {
                  throw new Error("Upload did not return image metadata");
                }
                form.setFieldValue(name, metadata);
                setFileList([
                  {
                    uid: "current-image",
                    name: uploadFile.name,
                    status: "done",
                    url: localUrl,
                  },
                ]);
                onSuccess?.(metadata);
              } catch (error) {
                revokeLocalPreview();
                setFileList([]);
                form.setFieldValue(name, undefined);
                onError?.(error as Error);
                message.error(formatEzPrepError(error, "Failed to upload image"));
              } finally {
                setUploading(false);
              }
            }}
            onRemove={() => {
              if (uploading) {
                return false;
              }
              revokeLocalPreview();
              form.setFieldValue(name, undefined);
              setFileList([]);
              return true;
            }}
            beforeUpload={(file) => {
              const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
              if (!isJpgOrPng) {
                message.error("You can only upload JPG/PNG files!");
              }
              return isJpgOrPng;
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
