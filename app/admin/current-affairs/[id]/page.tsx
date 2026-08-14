"use client";

import { Button, Card, DatePicker, Form, Input, Typography, message } from "antd";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/app/components/ImageUpload";
import {
  currentAffairsApi,
  formatEzPrepError,
  type CurrentAffairImage,
} from "@/app/services/ezprep-api";
import { dateKeyToDayjs, datePickerValueFromEvent, toDateKey } from "../date-key";

const { Title } = Typography;

const cardStyles = {
  header: { padding: "20px 28px 16px" },
  body: { padding: "24px 28px 28px" },
};

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
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card
        title={
          <Title level={4} className="mb-0">
            Edit Current Affair
          </Title>
        }
        className="w-full shadow-sm"
        styles={cardStyles}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="max-w-4xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              label="Title"
              name="title"
              rules={[{ required: true, message: "Please enter a title" }]}
            >
              <Input placeholder="Headline for this event" size="large" />
            </Form.Item>

            <Form.Item
              label="Date"
              name="date"
              rules={[{ required: true, message: "Please select a date" }]}
              getValueFromEvent={datePickerValueFromEvent}
              getValueProps={(value: string | undefined) => ({
                value: dateKeyToDayjs(value),
              })}
            >
              <DatePicker
                allowClear={false}
                format="YYYY-MM-DD"
                className="w-full"
                size="large"
                getPopupContainer={() => document.body}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Description"
            name="description"
            rules={[
              { required: true, message: "Please enter a description" },
            ]}
          >
            <Input.TextArea
              placeholder="Details about the event"
              size="large"
              autoSize={{ minRows: 3, maxRows: 8 }}
            />
          </Form.Item>

          <Form.Item label="Memory Trick" name="memoryTrick">
            <Input.TextArea
              placeholder="Optional mnemonic to remember this event"
              size="large"
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>

          <ImageUpload name={["image"]} label="Image (optional)" />

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              className="bg-blue-600 hover:bg-blue-700"
              loading={loading}
            >
              Update Current Affair
            </Button>
            <Button
              className="ml-2"
              size="large"
              onClick={() => router.push("/admin/current-affairs")}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
