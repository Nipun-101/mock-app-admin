"use client";

import { Button, Card, Form, Input, Table, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Breakpoint } from 'antd/es/_util/responsiveObserver';
import { showConfirmModal } from '@/components/ConfirmModal';
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
    total: 0
  });
  const router = useRouter();

  const columns = [
    {
      title: "Tag Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      responsive: ['sm', 'md', 'lg', 'xl', 'xxl'] as Breakpoint[],
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
      const response = await fetch(`/api/tag/list?page=${pagination.current}&limit=${pagination.pageSize}`);
      const data = await response.json();
      setTags(data.tags);
      setPagination(prev => ({
        ...prev,
        total: data?.pagination?.total
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [pagination.current, pagination.pageSize]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/tag", {
        method: "POST",
        body: JSON.stringify(values),
      });
      const data = await response.json();
      form.resetFields();
      fetchTags();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: 'Delete Tag',
      content: 'Are you sure you want to delete this tag? This action cannot be undone.',
      onConfirm: async () => {
        setTableLoading(true);
        try {
          const response = await fetch(`/api/tag/${id}`, {
            method: "DELETE"
          });
          const data = await response.json();
          fetchTags();
        } catch (error) {
          console.error(error);
        } finally {
          setTableLoading(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card
        title={<Title level={4} className="mb-0">Add New Tag</Title>}
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
              rules={[{ required: true, message: "Please enter description" }]}
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
        title={<Title level={4} className="mb-0">Tags List</Title>}
        className="shadow-sm"
      >
        <Table 
          columns={columns} 
          dataSource={tags} 
          loading={tableLoading}
          scroll={{ x: true }}
          pagination={{
            ...pagination,
            position: ["bottomCenter"],
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} tags`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || 10
              }));
            }
          }}
        />
      </Card>
    </div>
  );
}