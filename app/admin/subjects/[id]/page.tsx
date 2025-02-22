"use client";

import { Button, Card, Form, Input, Typography, Select } from "antd";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function EditSubjectPage({ params }: { params: { id: string } }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();
  const [tagOptions, setTagOptions] = useState([]);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tag/list?limit=100');
      const data = await response.json();
      const options = data?.tags?.map((tag: any) => ({
        value: tag._id,
        label: tag.name,
      }));
      setTagOptions(options);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };



  const fetchData = async () => {
    try {
      await fetchTags();
      const response = await fetch(`/api/subject/${params.id}`);
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      form?.setFieldsValue({
        name: data?.name,
        description: data?.description,
        tags: data?.tags?.map((tag: any) => tag._id),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/subject/${params.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      router.push('/admin/subjects');
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

            <Form.Item
              label="Description"
              name="description"
              rules={[{ required: true, message: "Please enter description" }]}
            >
              <Input.TextArea 
                placeholder="Enter subject description" 
                size="large"
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            </Form.Item>

            <Form.Item
              label="Tags"
              name="tags"
            >
              <Select
                mode="multiple"
                placeholder="Select tags"
                size="large"
                options={tagOptions}
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
              onClick={() => router.push('/admin/subjects')}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 