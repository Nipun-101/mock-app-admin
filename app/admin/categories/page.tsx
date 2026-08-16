"use client";

import { Button, Card, Form, Input, Table, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { showConfirmModal } from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";
import {
  catalogApi,
  formatEzPrepError,
  type Category,
} from "@/app/services/ezprep-api";

const { Title } = Typography;

export default function CategoriesPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
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
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      responsive: ["sm", "md", "lg", "xl", "xxl"] as Breakpoint[],
    },
    {
      title: "Image",
      dataIndex: "imageUrl",
      key: "imageUrl",
      render: (url: string) =>
        url ? (
          <img
            src={url}
            alt="category"
            className="w-10 h-10 object-cover rounded"
          />
        ) : (
          "-"
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Category) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => router.push(`/admin/categories/${record.id}`)}
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

  const fetchCategories = async () => {
    setTableLoading(true);
    try {
      const data = await catalogApi.listCategories({
        page: pagination.current,
        limit: pagination.pageSize,
      });
      setCategories(data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total ?? 0,
      }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch categories"));
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [pagination.current, pagination.pageSize]);

  const handleSubmit = async (values: {
    name: string;
    shortName: string;
    imageUrl?: string;
    description?: string;
  }) => {
    setLoading(true);
    try {
      await catalogApi.createCategory(values);
      message.success("Category created successfully");
      form.resetFields();
      fetchCategories();
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to create category"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: "Delete Category",
      content:
        "Are you sure you want to delete this category? This action cannot be undone.",
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await catalogApi.deleteCategory(id);
          message.success("Category deleted successfully");
          fetchCategories();
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to delete category"));
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
            Add New Category
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
              label="Category Name"
              name="name"
              rules={[
                { required: true, message: "Please enter category name" },
              ]}
            >
              <Input placeholder="e.g. Staff Selection Commission" size="large" />
            </Form.Item>

            <Form.Item
              label="Short Name"
              name="shortName"
              rules={[{ required: true, message: "Please enter short name" }]}
            >
              <Input placeholder="e.g. SSC" size="large" />
            </Form.Item>

            <Form.Item label="Image URL" name="imageUrl">
              <Input placeholder="Enter image URL" size="large" />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea
                placeholder="Enter category description"
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
              Create Category
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <Title level={4} className="mb-0">
            Categories
          </Title>
        }
        className="w-full shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
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
            showTotal: (total) => `Total ${total} categories`,
          }}
        />
      </Card>
    </div>
  );
}
