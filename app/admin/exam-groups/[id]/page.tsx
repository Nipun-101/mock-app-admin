"use client";

import { Button, Card, Form, Input, Select, Typography } from "antd";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function EditExamGroupPage({ params }: { params: { id: string } }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchExamGroup = async () => {
      try {
        const response = await fetch(`/api/exam-group/${params.id}`);
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        form.setFieldsValue({
          name: data.name,
          shortName: data.shortName,
          category: data.category?._id || data.category,
          description: data.description,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchExamGroup();
  }, [params.id, form]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/category/list?limit=100');
      const data = await response.json();
      setCategories(data.categories?.map((cat: any) => ({
        value: cat._id,
        label: `${cat.name} (${cat.shortName})`,
      })));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/exam-group/${params.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      router.push("/admin/exam-groups");
    } catch (error) {
      console.error(error);
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

            <Form.Item
              label="Short Name"
              name="shortName"
            >
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
