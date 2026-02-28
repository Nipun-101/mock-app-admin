"use client";

import { Button, Card, Form, Input, Table, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { showConfirmModal } from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function CategoriesPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [categories, setCategories] = useState([]);
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
      render: (record: any) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => router.push(`/admin/categories/${record._id}`)}
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

  const fetchCategories = async () => {
    setTableLoading(true);
    try {
      const response = await fetch(
        `/api/category/list?page=${pagination.current}&limit=${pagination.pageSize}`
      );
      const data = await response.json();
      setCategories(data.categories);
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

  useEffect(() => {
    fetchCategories();
  }, [pagination.current, pagination.pageSize]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/category", {
        method: "POST",
        body: JSON.stringify(values),
      });
      const data = await response.json();
      console.log(data);
      form.resetFields();
      fetchCategories();
    } catch (error) {
      console.error(error);
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
          await fetch(`/api/category/${id}`, {
            method: "DELETE",
          });
          fetchCategories();
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
            Categories List
          </Title>
        }
        className="shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={categories}
          loading={tableLoading}
          scroll={{ x: true }}
          rowKey="_id"
          pagination={{
            ...pagination,
            position: ["bottomCenter"],
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} categories`,
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
