"use client";

import { Button, Card, Form, Input, Typography, message } from "antd";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { catalogApi, formatEzPrepError } from "@/app/services/ezprep-api";
import { EditPageShell } from "@/app/components/PageLoader";

const { Title } = Typography;

export default function EditTopicPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const { data } = await catalogApi.getTopic(params.id);
        form.setFieldsValue({
          name: data.name,
          description: data.description,
        });
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to fetch topic"));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchTopic();
  }, [params.id, form]);

  const handleSubmit = async (values: {
    name: string;
    description?: string;
  }) => {
    setLoading(true);
    try {
      await catalogApi.updateTopic(params.id, values);
      message.success("Topic updated successfully");
      router.push("/admin/topics");
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to update topic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <EditPageShell loading={initialLoading}>
    <div className="space-y-6">
      <Card
        title={<Title level={4} className="mb-0">Edit Topic</Title>}
        className="w-full shadow-sm"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="max-w-4xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              label="Topic Name"
              name="name"
              rules={[{ required: true, message: "Please enter topic name" }]}
            >
              <Input placeholder="Enter topic name" size="large" />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea
                placeholder="Enter topic description"
                size="large"
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            </Form.Item>
          </div>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              className="bg-blue-600 hover:bg-blue-700"
              loading={loading}
            >
              Update Topic
            </Button>
            <Button
              className="ml-2"
              size="large"
              onClick={() => router.push("/admin/topics")}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
    </EditPageShell>
  );
}
