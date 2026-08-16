"use client";

import { Button, Card, Form, Input, Table, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { showConfirmModal } from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";
import {
  catalogApi,
  formatEzPrepError,
  type Topic,
} from "@/app/services/ezprep-api";

const { Title } = Typography;

export default function TopicsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const router = useRouter();

  const pagedTopics = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return topics.slice(start, start + pagination.pageSize);
  }, [topics, pagination.current, pagination.pageSize]);

  const columns = [
    {
      title: "Topic Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      responsive: ["sm", "md", "lg", "xl", "xxl"] as Breakpoint[],
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Topic) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => router.push(`/admin/topics/${record.id}`)}
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

  const fetchTopics = async () => {
    setTableLoading(true);
    try {
      const data = await catalogApi.listTopics();
      setTopics(data.data || []);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch topics"));
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleSubmit = async (values: {
    name: string;
    description?: string;
  }) => {
    setLoading(true);
    try {
      await catalogApi.createTopic(values);
      message.success("Topic created successfully");
      form.resetFields();
      fetchTopics();
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to create topic"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: "Delete Topic",
      content:
        "Are you sure you want to delete this topic? This action cannot be undone.",
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await catalogApi.deleteTopic(id);
          message.success("Topic deleted successfully");
          fetchTopics();
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to delete topic"));
        } finally {
          setTableLoading(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card
        title={<Title level={4} className="mb-0">Add New Topic</Title>}
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
              label="Topic Name"
              name="name"
              rules={[{ required: true, message: "Please enter topic name" }]}
            >
              <Input placeholder="Enter topic name" size="large" />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea
                placeholder="Enter topic description"
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
              icon={<PlusOutlined />}
              className="bg-blue-600 hover:bg-blue-700"
              loading={loading}
            >
              Create Topic
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={<Title level={4} className="mb-0">Topics List</Title>}
        className="shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={pagedTopics}
          rowKey="id"
          loading={tableLoading}
          scroll={{ x: true }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: topics.length,
            position: ["bottomCenter"],
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} topics`,
            onChange: (page, pageSize) => {
              setPagination({
                current: page,
                pageSize: pageSize || 10,
              });
            },
          }}
        />
      </Card>
    </div>
  );
}
