"use client";

import { Button, Card, Form, Spin, Typography, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  currentAffairsApi,
  formatEzPrepError,
  type CurrentAffairImage,
} from "@/app/services/ezprep-api";
import { toDateKey } from "../date-key";
import { toPlainImageMetadata } from "@/app/components/ImageUpload";
import { EditPageShell } from "@/app/components/PageLoader";
import {
  CurrentAffairFormFields,
  affairCardClassName,
  affairCardStyles,
} from "../form-fields";

const { Title } = Typography;

function isImageMeta(value: unknown): value is CurrentAffairImage {
  return Boolean(toPlainImageMetadata(value));
}

export default function EditCurrentAffairPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hadImage, setHadImage] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const { data } = await currentAffairsApi.get(params.id);
        form.setFieldsValue({
          title: data.title,
          description: data.description,
          memoryTrick: data.memoryTrick,
          date: data.date,
          image: toPlainImageMetadata(data.image),
        });
        setHadImage(isImageMeta(data.image));
      } catch (error) {
        message.error(
          formatEzPrepError(error, "Failed to fetch current affair")
        );
      } finally {
        setInitialLoading(false);
      }
    };

    fetchItem();
  }, [params.id, form]);

  const handleSubmit = async (values: {
    title: string;
    description?: string;
    date: string;
    memoryTrick?: string;
    image?: CurrentAffairImage;
  }) => {
    if (imageUploading) {
      return;
    }
    setLoading(true);
    try {
      const nextImage = isImageMeta(values.image)
        ? values.image
        : form.getFieldValue("image");
      await currentAffairsApi.update(params.id, {
        title: values.title,
        description: values.description,
        date: toDateKey(values.date) ?? values.date,
        memoryTrick: values.memoryTrick,
        image: isImageMeta(nextImage)
          ? nextImage
          : hadImage
            ? null
            : undefined,
      });
      message.success("Current affair updated successfully");
      router.push("/admin/current-affairs");
    } catch (error) {
      message.error(
        formatEzPrepError(error, "Failed to update current affair")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <EditPageShell loading={initialLoading}>
    <div className="space-y-4 sm:space-y-6 pb-6">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        className="px-0 min-h-11"
        onClick={() => router.push("/admin/current-affairs")}
      >
        Back to list
      </Button>
      <Card
        title={
          <Title level={4} className="!mb-0 !text-lg sm:!text-xl">
            Edit current affair
          </Title>
        }
        className={affairCardClassName}
        styles={affairCardStyles}
      >
        <Spin spinning={loading} tip="Saving current affair…">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="max-w-4xl"
          disabled={loading}
          scrollToFirstError={{ behavior: "smooth", block: "center" }}
        >
          <CurrentAffairFormFields onImageUploadingChange={setImageUploading} />

          <Form.Item className="mb-0">
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                size="large"
                className="w-full sm:w-auto min-h-11"
                onClick={() => router.push("/admin/current-affairs")}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className="w-full sm:w-auto min-h-11 bg-blue-600 hover:bg-blue-700"
                loading={loading || imageUploading}
                disabled={imageUploading}
              >
                {imageUploading ? "Uploading image…" : "Save changes"}
              </Button>
            </div>
          </Form.Item>
        </Form>
        </Spin>
      </Card>
    </div>
    </EditPageShell>
  );
}
