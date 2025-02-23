"use client";

import { Button, Card, Form, Input, Typography } from "antd";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function EditTagPage({ params }: { params: { id: string } }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTag = async () => {
      try {
        const response = await fetch(`/api/tag/${params.id}`);
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        form.setFieldsValue(data);
      } catch (error) {
        console.error(error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchTag();
  }, [params.id, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tag/${params.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      router.push('/admin/tags');
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
        title={<Title level={4} className="mb-0">Edit Tag</Title>}
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
              label="Tag Name"
              name="name"
              rules={[{ required: true, message: "Please enter tag name" }]}
            >
              <Input placeholder="Enter tag name" size="large" />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
              //rules={[{ required: true, message: "Please enter description" }]}
            >
              <Input.TextArea 
                placeholder="Enter tag description" 
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
              Update Tag
            </Button>
            <Button 
              className="ml-2" 
              size="large"
              onClick={() => router.push('/admin/tags')}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 