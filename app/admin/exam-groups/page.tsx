"use client";

import { Button, Card, Form, Input, Select, Table, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { showConfirmModal } from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function ExamGroupsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [examGroups, setExamGroups] = useState([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const router = useRouter();

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Short Name",
      dataIndex: "shortName",
      key: "shortName",
      responsive: ["sm", "md", "lg", "xl", "xxl"] as Breakpoint[],
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (category: any) => category ? `${category.name} (${category.shortName})` : '-',
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      responsive: ["md", "lg", "xl", "xxl"] as Breakpoint[],
      render: (text: string) => text || '-',
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: any) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => router.push(`/admin/exam-groups/${record._id}`)}
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

  const fetchExamGroups = async () => {
    setTableLoading(true);
    try {
      const response = await fetch(
        `/api/exam-group/list?page=${pagination.current}&limit=${pagination.pageSize}`
      );
      const data = await response.json();
      setExamGroups(data.examGroups);
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
    fetchExamGroups();
    fetchCategories();
  }, [pagination.current, pagination.pageSize]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/exam-group", {
        method: "POST",
        body: JSON.stringify(values),
      });
      const data = await response.json();
      console.log(data);
      form.resetFields();
      fetchExamGroups();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: "Delete Exam Group",
      content:
        "Are you sure you want to delete this exam group? This action cannot be undone.",
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await fetch(`/api/exam-group/${id}`, {
            method: "DELETE",
          });
          fetchExamGroups();
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
            Add New Exam Group
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
              icon={<PlusOutlined />}
              className="bg-blue-600 hover:bg-blue-700"
              loading={loading}
            >
              Create Exam Group
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <Title level={4} className="mb-0">
            Exam Groups
          </Title>
        }
        className="w-full shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={examGroups}
          rowKey="_id"
          loading={tableLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page, pageSize) => {
              setPagination((prev) => ({
                ...prev,
                current: page,
                pageSize: pageSize,
              }));
            },
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} exam groups`,
          }}
        />
      </Card>
    </div>
  );
}
