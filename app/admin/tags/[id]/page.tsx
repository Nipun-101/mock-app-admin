"use client";

import { Button, Card, Form, Input, Select, Typography, message } from "antd";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  catalogApi,
  formatEzPrepError,
  refId,
  type NamedRef,
  type Subject,
} from "@/app/services/ezprep-api";
import { EditPageShell } from "@/app/components/PageLoader";

const { Title } = Typography;

interface SubjectOption {
  value: string;
  label: string;
  topics: NamedRef[];
}

export default function EditTagPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [topics, setTopics] = useState<{ value: string; label: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const router = useRouter();

  const fetchSubjects = async (): Promise<SubjectOption[]> => {
    const data = await catalogApi.listSubjects();
    return (data.data || []).map((subject: Subject) => ({
      value: subject.id,
      label: subject.name,
      topics: subject.topics || [],
    }));
  };

  const topicsForSubject = (subjectId: string, subjectsList: SubjectOption[]) => {
    const subject = subjectsList.find((item) => item.value === subjectId);
    return (
      subject?.topics?.map((topic) => ({
        value: topic.id,
        label: topic.name,
      })) || []
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subjectsList = await fetchSubjects();
        setSubjects(subjectsList);

        const { data } = await catalogApi.getTag(params.id);
        const subjectId = refId(data.subject);
        const topicId = refId(data.topic);

        if (subjectId) {
          setSelectedSubject(subjectId);
          setTopics(topicsForSubject(subjectId, subjectsList));
        }

        form.setFieldsValue({
          name: data.name,
          description: data.description,
          subject: subjectId,
          topic: topicId,
        });
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to fetch tag"));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [params.id, form]);

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    form.setFieldValue("topic", undefined);
    setTopics(topicsForSubject(value, subjects));
  };

  const handleSubmit = async (values: {
    name: string;
    description?: string;
    subject: string;
    topic: string;
  }) => {
    setLoading(true);
    try {
      await catalogApi.updateTag(params.id, values);
      message.success("Tag updated successfully");
      router.push("/admin/tags");
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to update tag"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <EditPageShell loading={initialLoading}>
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
    </EditPageShell>
  );
}
