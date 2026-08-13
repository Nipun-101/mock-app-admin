import { Upload, Button, message, Modal } from "antd";
import { CloseOutlined, UploadOutlined } from "@ant-design/icons";
import { filesApi, formatEzPrepError } from "@/app/services/ezprep-api";
import { Form } from "antd";
import { useEffect, useRef, useState } from "react";
import { usePresignedUrl } from "@/app/hooks/usePresignedUrl";

interface ImageUploadProps {
  name: (string | number)[]; // Form field path
  label?: string;
}

export const ImageUpload = ({ name, label }: ImageUploadProps) => {
  const form = Form.useFormInstance();
  const [fileList, setFileList] = useState<any[]>([]);
  const metadataRef = useRef<Record<string, unknown> | undefined>(
    form.getFieldValue(name)
  );

  // Get the stored metadata from the form
  const formMetadata = Form.useWatch(name, form);

  useEffect(() => {
    if (
      formMetadata &&
      typeof formMetadata === "object" &&
      typeof formMetadata.key === "string" &&
      formMetadata.key &&
      typeof formMetadata.bucket === "string" &&
      formMetadata.bucket
    ) {
      metadataRef.current = formMetadata;
      return;
    }
    metadataRef.current = undefined;
    setFileList([]);
  }, [formMetadata]);
  
  // Only pass metadata to the hook if it has the required fields
  const isValidMetadata = formMetadata && 
    typeof formMetadata === 'object' && 
    'key' in formMetadata && 
    'bucket' in formMetadata;
  
  const { url: signedUrl } = usePresignedUrl(isValidMetadata ? formMetadata : null);

  //when signedUrl is changed, update the fileList
  useEffect(() => {
    if (signedUrl) {
      setFileList([{ url: signedUrl }]);
    }
  }, [signedUrl]);

  // Watch for form reset
  useEffect(() => {
    const resetHandler = () => {
      setFileList([]);
    };

    const fieldValue = form.getFieldValue(name);
    if (fieldValue === undefined) {
      resetHandler();
    }
  }, [form, name]);


  // Determine if an image is already uploaded
  const hasImage = fileList.length > 0;

  return (
    <Form.Item
      name={name}
      label={label}
      getValueFromEvent={() => {
        const candidate = metadataRef.current;
        if (
          candidate &&
          typeof candidate.key === "string" &&
          candidate.key &&
          typeof candidate.bucket === "string" &&
          candidate.bucket
        ) {
          return {
            key: candidate.key,
            bucket: candidate.bucket,
            region: candidate.region,
            contentType: candidate.contentType,
            size: candidate.size,
            lastModified: candidate.lastModified,
          };
        }
        return undefined;
      }}
    >
      <Upload
        onPreview={async (file) => {
          // Only show preview if we have a signed URL or file URL and form value exists
          const previewUrl = signedUrl || file.url;
          if (previewUrl && formMetadata) {
            Modal.info({
              title: 'Image Preview',
              content: (
                <div style={{ textAlign: 'center' }}>
                  <img 
                    alt="preview" 
                    src={previewUrl}
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              ),
              width: '60%',
              maskClosable: true,
              footer: null,
              closable: true,
              closeIcon: <CloseOutlined />
            });
          }
        }}
        fileList={fileList.map((file) => ({
          ...file,
          // Use the refreshed signed URL for displaying the image
          url: signedUrl || file.url,
        }))}     
        customRequest={async (options: any) => {
          const { file, onSuccess, onError } = options;
          try {
            const { data: response } = await filesApi.upload(file as File);

            const metadata = {
              key: response.key,
              bucket: response.bucket,
              region: response.region,
              contentType: response.contentType,
              size: response.size,
              lastModified: response.lastModified,
            };

            const fileObject = {
              uid: `-${Date.now()}`,
              name: file.name,
              status: "done",
              url: response.url,
              type: response.contentType,
              size: response.size,
            };

            setFileList((prev) => [
              ...prev.filter((f) => f.uid !== fileObject.uid),
              fileObject,
            ]);

            metadataRef.current = metadata;
            form.setFieldValue(name, metadata);

            onSuccess(null);
          } catch (error) {
            console.error("Upload error:", error);
            onError?.(new Error("Upload failed"));
            message.error(formatEzPrepError(error, "Failed to upload image"));
          }
        }}
        listType="picture"
        maxCount={1}
        accept="image/jpeg,image/png"
        onRemove={() => {
          setFileList([]);
          metadataRef.current = undefined;
          form.setFieldValue(name, undefined);
          return true;
        }}
        beforeUpload={(file) => {
          const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
          if (!isJpgOrPng) {
            message.error('You can only upload JPG/PNG files!');
          }
          return isJpgOrPng;
        }}
      >
        <Button 
          icon={<UploadOutlined />}
          disabled={hasImage}
        >
          Upload Image
        </Button>
      </Upload>
    </Form.Item>
  );
};
