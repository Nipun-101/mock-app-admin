"use client";

import { Button, Card, Form, Input, InputNumber, Select, Typography } from "antd";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function EditExamPage({ params }: { params: { id: string } }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Fetch exam details when component mounts
    const fetchExam = async () => {
      try {
        const response = await fetch(`/api/exam/${params.id}`);
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

    fetchExam();
  }, [params.id, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/exam/${params.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      router.push('/admin/exams');
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
        title={<Title level={4} className="mb-0">Edit Exam</Title>}
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
              label="Exam Name"
              name="name"
              rules={[{ required: true, message: "Please enter exam name" }]}
            >
              <Input placeholder="Enter exam name" size="large" />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
            >
              <Input.TextArea placeholder="Enter description" size="large" />
            </Form.Item>

            <Form.Item
              label="Subjects"
              name="subject"
            >
              <Select
                placeholder="Select subjects"
                size="large"
                mode="multiple"
                options={[
                  { value: "math", label: "Mathematics" },
                  { value: "science", label: "Science" },
                  { value: "english", label: "English" },
                  { value: "hindi", label: "Hindi" },
                  { value: "urdu", label: "Urdu" },
                  { value: "sanskrit", label: "Sanskrit" },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Duration (minutes)"
              name="duration"
            >
              <InputNumber min={1} className="w-full" size="large" />
            </Form.Item>

            <Form.Item
              label="Total Questions"
              name="totalQuestions"
            >
              <InputNumber min={1} className="w-full" size="large" />
            </Form.Item>

            <Form.Item
              label="Passing Score (%)"
              name="passingScore"
            >
              <InputNumber min={1} max={100} className="w-full" size="large" />
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
              Update Exam
            </Button>
            <Button 
              className="ml-2" 
              size="large"
              onClick={() => router.push('/admin/exams')}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 