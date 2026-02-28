"use client";

import { Button, Card, Form, Input, Select, Typography } from "antd";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function EditTagPage({ params }: { params: { id: string } }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const router = useRouter();

  const fetchSubjects = async () => {
    try {
      const response = await fetch("/api/subject/list?limit=100");
      const data = await response.json();
      return (
        data.subjects?.map((subject: any) => ({
          value: subject._id,
          label: subject.name,
          topics: subject.topics,
        })) || []
      );
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
      return [];
    }
  };

  const fetchTopicsBySubject = (subjectId: string, subjectsList: any[]) => {
    const subject = subjectsList.find((s: any) => s.value === subjectId);
    return (
      subject?.topics?.map((topic: any) => ({
        value: topic._id,
        label: topic.name,
      })) || []
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subjectsList = await fetchSubjects();
        setSubjects(subjectsList);

        const response = await fetch(`/api/tag/${params.id}`);
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        const subjectId = data.subject?._id || data.subject;
        const topicId = data.topic?._id || data.topic;

        if (subjectId) {
          setSelectedSubject(subjectId);
          const topicsList = fetchTopicsBySubject(subjectId, subjectsList);
          setTopics(topicsList);
        }

        form.setFieldsValue({
          name: data.name,
          description: data.description,
          subject: subjectId,
          topic: topicId,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [params.id, form]);

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    form.setFieldValue("topic", undefined);
    const topicsList = fetchTopicsBySubject(value, subjects);
    setTopics(topicsList);
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tag/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      router.push("/admin/tags");
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
            Edit Tag
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
              label="Tag Name"
              name="name"
              rules={[{ required: true, message: "Please enter tag name" }]}
            >
              <Input placeholder="Enter tag name" size="large" />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea
                placeholder="Enter tag description"
                size="large"
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            </Form.Item>

            <Form.Item
              label="Subject"
              name="subject"
              rules={[{ required: true, message: "Please select a subject" }]}
            >
              <Select
                placeholder="Select subject"
                size="large"
                options={subjects}
                optionFilterProp="label"
                showSearch
                onChange={handleSubjectChange}
              />
            </Form.Item>

            <Form.Item
              label="Topic"
              name="topic"
              rules={[{ required: true, message: "Please select a topic" }]}
            >
              <Select
                placeholder={
                  selectedSubject
                    ? "Select topic"
                    : "Please select a subject first"
                }
                size="large"
                options={topics}
                optionFilterProp="label"
                showSearch
                disabled={!selectedSubject}
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
              onClick={() => router.push("/admin/tags")}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
