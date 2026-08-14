"use client";

import { Button, Card, Form, Input, Typography, message } from "antd";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { catalogApi, formatEzPrepError } from "@/app/services/ezprep-api";

const { Title } = Typography;

export default function EditCategoryPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const { data } = await catalogApi.getCategory(params.id);
        form.setFieldsValue({
          name: data.name,
          shortName: data.shortName,
          imageUrl: data.imageUrl,
          description: data.description,
        });
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to fetch category"));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchCategory();
  }, [params.id, form]);

  const handleSubmit = async (values: {
    name: string;
    shortName: string;
    imageUrl?: string;
    description?: string;
  }) => {
    setLoading(true);
    try {
      await catalogApi.updateCategory(params.id, values);
      message.success("Category updated successfully");
      router.push("/admin/categories");
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to update category"));
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
            Edit Category
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
              label="Category Name"
              name="name"
              rules={[
                { required: true, message: "Please enter category name" },
              ]}
            >
              <Input placeholder="e.g. Staff Selection Commission" size="large" />
            </Form.Item>

            <Form.Item
              label="Short Name"
              name="shortName"
              rules={[{ required: true, message: "Please enter short name" }]}
            >
              <Input placeholder="e.g. SSC" size="large" />
            </Form.Item>

            <Form.Item label="Image URL" name="imageUrl">
              <Input placeholder="Enter image URL" size="large" />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea
                placeholder="Enter category description"
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
              Update Category
            </Button>
            <Button
              className="ml-2"
              size="large"
              onClick={() => router.push("/admin/categories")}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
