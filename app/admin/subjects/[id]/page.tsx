"use client";

import { Button, Card, Form, Input, Typography, Select, message } from "antd";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { catalogApi, formatEzPrepError } from "@/app/services/ezprep-api";

const { Title } = Typography;

export default function EditSubjectPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();
  const [topicOptions, setTopicOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const fetchData = async () => {
    try {
      const [topicsRes, subjectRes] = await Promise.all([
        catalogApi.listTopics(),
        catalogApi.getSubject(params.id),
      ]);
      setTopicOptions(
        (topicsRes.data || []).map((topic) => ({
          value: topic.id,
          label: topic.name,
        }))
      );
      form.setFieldsValue({
        name: subjectRes.data.name,
        description: subjectRes.data.description,
        topics: subjectRes.data.topics?.map((topic) => topic.id) || [],
      });
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch subject"));
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleSubmit = async (values: {
    name: string;
    description?: string;
    topics?: string[];
  }) => {
    setLoading(true);
    try {
      await catalogApi.updateSubject(params.id, values);
      message.success("Subject updated successfully");
      router.push("/admin/subjects");
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to update subject"));
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
        title={<Title level={4} className="mb-0">Edit Subject</Title>}
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
              label="Subject Name"
              name="name"
              rules={[{ required: true, message: "Please enter subject name" }]}
            >
              <Input placeholder="Enter subject name" size="large" />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea
                placeholder="Enter subject description"
                size="large"
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            </Form.Item>

            <Form.Item label="Topics" name="topics">
              <Select
                mode="multiple"
                placeholder="Select topics"
                size="large"
                options={topicOptions}
                optionFilterProp="label"
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
              Update Subject
            </Button>
            <Button
              className="ml-2"
              size="large"
              onClick={() => router.push("/admin/subjects")}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
