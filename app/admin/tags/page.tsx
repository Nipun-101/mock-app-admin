"use client";

import { Button, Card, Form, Input, Select, Table, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { showConfirmModal } from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function TagsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const router = useRouter();

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
      render: (subject: any) => subject?.name || "-",
    },
    {
      title: "Topic",
      dataIndex: "topic",
      key: "topic",
      render: (topic: any) => topic?.name || "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: any) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => router.push(`/admin/tags/${record._id}`)}
          >
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDelete(record._id)}
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
      const response = await fetch(
        `/api/tag/list?page=${pagination.current}&limit=${pagination.pageSize}`
      );
      const data = await response.json();
      setTags(data.tags);
      setPagination((prev) => ({
        ...prev,
        total: data?.pagination?.total,
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setTableLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch("/api/subject/list?limit=100");
      const data = await response.json();
      setSubjects(
        data.subjects?.map((subject: any) => ({
          value: subject._id,
          label: subject.name,
          topics: subject.topics,
        })) || []
      );
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  };

  const fetchTopicsBySubject = (subjectId: string) => {
    const subject: any = subjects.find((s: any) => s.value === subjectId);
    setTopics(
      subject?.topics?.map((topic: any) => ({
        value: topic._id,
        label: topic.name,
      })) || []
    );
  };

  useEffect(() => {
    fetchTags();
    fetchSubjects();
  }, [pagination.current, pagination.pageSize]);

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    form.setFieldValue("topic", undefined);
    fetchTopicsBySubject(value);
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      console.log(data);
      form.resetFields();
      setSelectedSubject(null);
      setTopics([]);
      fetchTags();
    } catch (error) {
      console.error(error);
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
          await fetch(`/api/tag/${id}`, {
            method: "DELETE",
          });
          fetchTags();
        } catch (error) {
          console.error(error);
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
          rowKey="_id"
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
