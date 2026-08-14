"use client";

import { Button, Card, Form, Input, Select, Typography, message } from "antd";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  catalogApi,
  formatEzPrepError,
  refId,
} from "@/app/services/ezprep-api";

const { Title } = Typography;

export default function EditExamGroupPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>(
    []
  );
  const router = useRouter();

  useEffect(() => {
    const fetchExamGroup = async () => {
      try {
        const { data } = await catalogApi.getExamGroup(params.id);
        form.setFieldsValue({
          name: data.name,
          shortName: data.shortName,
          category: refId(data.category),
          description: data.description,
        });
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to fetch exam group"));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchExamGroup();
  }, [params.id, form]);

  const fetchCategories = async () => {
    try {
      const data = await catalogApi.listActiveCategories();
      setCategories(
        (data.data || []).map((cat) => ({
          value: cat.id,
          label: `${cat.name} (${cat.shortName})`,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch categories"));
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (values: {
    name: string;
    shortName?: string;
    category: string;
    description?: string;
  }) => {
    setLoading(true);
    try {
      await catalogApi.updateExamGroup(params.id, values);
      message.success("Exam group updated successfully");
      router.push("/admin/exam-groups");
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to update exam group"));
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
            Edit Exam Group
          </Title>
        }
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
              label="Exam Group Name"
              name="name"
              rules={[
                { required: true, message: "Please enter exam group name" },
              ]}
            >
              <Input placeholder="e.g. Combined Graduate Level" size="large" />
            </Form.Item>

            <Form.Item label="Short Name" name="shortName">
              <Input placeholder="e.g. CGL" size="large" />
            </Form.Item>

            <Form.Item
              label="Category"
              name="category"
              rules={[{ required: true, message: "Please select a category" }]}
            >
              <Select
                placeholder="Select category"
                size="large"
                options={categories}
                optionFilterProp="label"
                showSearch
              />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea
                placeholder="Enter exam group description"
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
              Update Exam Group
            </Button>
            <Button
              className="ml-2"
              size="large"
              onClick={() => router.push("/admin/exam-groups")}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
