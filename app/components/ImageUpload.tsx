import { Upload, Button, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { uploadToS3 } from "@/app/services/storage";
import { Form } from "antd";
import { useState } from "react";
import { usePresignedUrl } from "@/app/hooks/usePresignedUrl";

interface ImageUploadProps {
  name: (string | number)[]; // Form field path
  label?: string;
}

export const ImageUpload = ({ name, label }: ImageUploadProps) => {
  const form = Form.useFormInstance();
  const [fileList, setFileList] = useState<any[]>([]);

  // Get the stored metadata from the form
  const formMetadata = Form.useWatch(name, form);
  
  // Only pass metadata to the hook if it has the required fields
  const isValidMetadata = formMetadata && 
    typeof formMetadata === 'object' && 
    'key' in formMetadata && 
    'bucket' in formMetadata;
  
  const { url: signedUrl } = usePresignedUrl(isValidMetadata ? formMetadata : null);

  return (
    <Form.Item name={name} label={label}>
      <Upload
        fileList={fileList.map((file) => ({
          ...file,
          // Use the refreshed signed URL for displaying the image
          url: signedUrl || file.url,
        }))}
        customRequest={async (options: any) => {
          const { file, onSuccess, onError } = options;
          try {
            const response = await uploadToS3(file as File);

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
              url: response.url, // Initial signed URL
              thumbUrl: response.previewUrl,
              type: response.contentType,
              size: response.size,
            };

            setFileList((prev) => [
              ...prev.filter((f) => f.uid !== fileObject.uid),
              fileObject,
            ]);

            // Store metadata in form
            form.setFieldValue(name, metadata);

            onSuccess(null);
          } catch (error) {
            console.error("Upload error:", error);
            onError?.(new Error("Upload failed"));
            message.error("Failed to upload image");
          }
        }}
        listType="picture"
        maxCount={1}
        accept="image/*"
        onRemove={() => {
          setFileList([]);
          form.setFieldValue(name, undefined);
          return true;
        }}
        beforeUpload={(file) => {
          const isImage = file.type.startsWith("image/");
          if (!isImage) {
            message.error("You can only upload image files!");
          }
          return isImage;
        }}
      >
        <Button icon={<UploadOutlined />}>Upload Image</Button>
      </Upload>
    </Form.Item>
  );
};
