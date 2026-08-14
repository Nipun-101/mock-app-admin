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
import {
  CurrentAffairFormFields,
  affairCardClassName,
  affairCardStyles,
} from "../form-fields";

const { Title } = Typography;

function isImageMeta(value: unknown): value is CurrentAffairImage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const image = value as CurrentAffairImage;
  return (
    typeof image.key === "string" &&
    typeof image.bucket === "string" &&
    typeof image.region === "string"
  );
}

export default function EditCurrentAffairPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
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
          image: isImageMeta(data.image) ? data.image : undefined,
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
    description: string;
    date: string;
    memoryTrick?: string;
    image?: CurrentAffairImage;
  }) => {
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

  if (initialLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  return (
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
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="max-w-4xl"
          scrollToFirstError={{ behavior: "smooth", block: "center" }}
        >
          <CurrentAffairFormFields />

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
                loading={loading}
              >
                Save changes
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
