"use client";

import { Button, Card, Form, Input, Table, Typography, message } from "antd";
import { Select } from "@/app/components/SearchableSelect";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { showConfirmModal } from "@/components/ConfirmModal";
import { setFormValue } from "@/app/lib/form-store";
import { useRouter } from "next/navigation";
import {
  catalogApi,
  formatEzPrepError,
  refId,
  type NamedRef,
  type Subject,
  type Tag,
} from "@/app/services/ezprep-api";

const { Title } = Typography;

interface SubjectOption {
  value: string;
  label: string;
  topics: NamedRef[];
}

export default function TagsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [topics, setTopics] = useState<{ value: string; label: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const router = useRouter();

  const subjectName = (value: Tag["subject"]) => {
    const id = refId(value);
    return subjects.find((subject) => subject.value === id)?.label || id || "-";
  };

  const topicName = (value: Tag["topic"]) => {
    const id = refId(value);
    for (const subject of subjects) {
      const topic = subject.topics?.find((item) => item.id === id);
      if (topic) return topic.name;
    }
    return id || "-";
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      responsive: ["sm", "md", "lg", "xl", "xxl"] as Breakpoint[],
      render: (text: string) => text || "-",
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      render: (subject: Tag["subject"]) => subjectName(subject),
    },
    {
      title: "Topic",
      dataIndex: "topic",
      key: "topic",
      render: (topic: Tag["topic"]) => topicName(topic),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Tag) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => router.push(`/admin/tags/${record.id}`)}
          >
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];

  const fetchTags = async () => {
    setTableLoading(true);
    try {
      const data = await catalogApi.listTags({
        page: pagination.current,
        limit: pagination.pageSize,
      });
      setTags(data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total ?? 0,
      }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch tags"));
    } finally {
      setTableLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const data = await catalogApi.listSubjects();
      setSubjects(
        (data.data || []).map((subject: Subject) => ({
          value: subject.id,
          label: subject.name,
          topics: subject.topics || [],
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch subjects"));
    }
  };

  const fetchTopicsBySubject = (subjectId: string) => {
    const subject = subjects.find((item) => item.value === subjectId);
    setTopics(
      subject?.topics?.map((topic) => ({
        value: topic.id,
        label: topic.name,
      })) || []
    );
  };

  useEffect(() => {
    fetchTags();
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setFormValue(form, "topic", undefined);
    fetchTopicsBySubject(value);
  };

  const handleSubmit = async (values: {
    name: string;
    description?: string;
    subject: string;
    topic: string;
  }) => {
    setLoading(true);
    try {
      await catalogApi.createTag(values);
      message.success("Tag created successfully");
      form.resetFields();
      setSelectedSubject(null);
      setTopics([]);
      fetchTags();
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to create tag"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: "Delete Tag",
      content:
        "Are you sure you want to delete this tag? This action cannot be undone.",
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await catalogApi.deleteTag(id);
          message.success("Tag deleted successfully");
          fetchTags();
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to delete tag"));
        } finally {
          setTableLoading(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card
        title={
          <Title level={4} className="mb-0">
            Add New Tag
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
              icon={<PlusOutlined />}
              className="bg-blue-600 hover:bg-blue-700"
              loading={loading}
            >
              Create Tag
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <Title level={4} className="mb-0">
            Tags List
          </Title>
        }
        className="shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={tags}
          loading={tableLoading}
          scroll={{ x: true }}
          rowKey="id"
          pagination={{
            ...pagination,
            position: ["bottomCenter"],
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} tags`,
            onChange: (page, pageSize) => {
              setPagination((prev) => ({
                ...prev,
                current: page,
                pageSize: pageSize || 10,
              }));
            },
          }}
        />
      </Card>
    </div>
  );
}
