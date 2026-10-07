"use client";

import {
  Button,
  Card,
  Form,
  Input,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { Select } from "@/app/components/SearchableSelect";
import { PlusOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { showConfirmModal } from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";
import {
  formatEzPrepError,
  productsApi,
  type Product,
  type ProductStatus,
} from "@/app/services/ezprep-api";
import { ProductGrantsFields } from "./ProductGrantsFields";
import {
  emptyGrantFormRow,
  expandGrantFormRowsToApi,
  formatGrantLabels,
  type GrantFormRow,
} from "./grant-form";
import {
  EMPTY_GRANT_SCOPE_OPTIONS,
  loadGrantScopeOptions,
  type GrantScopeOptions,
} from "./grant-options";

const { Title } = Typography;

const STATUS_COLORS: Record<ProductStatus, string> = {
  DRAFT: "default",
  PUBLISHED: "success",
  ARCHIVED: "warning",
};

const STATUS_FILTER_OPTIONS: { value: ProductStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

export default function ProductsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [scopeOptions, setScopeOptions] = useState<GrantScopeOptions>(
    EMPTY_GRANT_SCOPE_OPTIONS
  );
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "">("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    setTableLoading(true);
    try {
      const data = await productsApi.list({
        page: pagination.current,
        limit: pagination.pageSize,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setProducts(data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total ?? 0,
      }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch products"));
    } finally {
      setTableLoading(false);
    }
  }, [pagination.current, pagination.pageSize, statusFilter, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setScopeOptions(await loadGrantScopeOptions());
      } catch (error) {
        message.error(
          formatEzPrepError(error, "Failed to load grant targets")
        );
      }
    };
    void loadOptions();
  }, []);

  const handleSubmit = async (values: {
    code: string;
    name: string;
    description?: string;
    grants: GrantFormRow[];
  }) => {
    const grants = expandGrantFormRowsToApi(values.grants);
    if (grants.length < 1) {
      message.error("Add at least one grant target");
      return;
    }
    setLoading(true);
    try {
      await productsApi.create({
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        grants,
      });
      message.success("Product created successfully");
      form.resetFields();
      form.setFieldsValue({ grants: [emptyGrantFormRow()] });
      if (pagination.current !== 1) {
        setPagination((prev) => ({ ...prev, current: 1 }));
      } else {
        await fetchProducts();
      }
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to create product"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    showConfirmModal({
      title: "Delete Product",
      content:
        "Are you sure you want to delete this product? This action cannot be undone.",
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await productsApi.delete(id);
          message.success("Product deleted successfully");
          await fetchProducts();
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to delete product"));
        } finally {
          setTableLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: ProductStatus) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
    },
    {
      title: "Version",
      dataIndex: "version",
      key: "version",
      responsive: ["sm", "md", "lg", "xl", "xxl"] as Breakpoint[],
    },
    {
      title: "Grants",
      dataIndex: "grants",
      key: "grants",
      responsive: ["md", "lg", "xl", "xxl"] as Breakpoint[],
      ellipsis: true,
      render: (grants: Product["grants"]) =>
        formatGrantLabels(grants, scopeOptions),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Product) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => router.push(`/admin/products/${record.id}`)}
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

  return (
    <div className="space-y-6">
      <Card
        title={<Title level={4} className="mb-0">Add New Product</Title>}
        className="w-full shadow-sm"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="max-w-4xl"
          initialValues={{
            grants: [emptyGrantFormRow()],
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              label="Code"
              name="code"
              rules={[
                { required: true, message: "Please enter product code" },
                {
                  pattern: /^[A-Za-z0-9_]+$/,
                  message: "Use letters, numbers, or underscore only",
                },
              ]}
              extra="Unique identifier, e.g. SSC_CGL_COMPLETE"
            >
              <Input placeholder="SSC_CGL_COMPLETE" size="large" />
            </Form.Item>

            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: "Please enter product name" }]}
            >
              <Input placeholder="SSC CGL Complete" size="large" />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
              className="md:col-span-2"
            >
              <Input.TextArea
                placeholder="Optional description"
                size="large"
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            </Form.Item>
          </div>

          <div className="mb-6">
            <ProductGrantsFields scopeOptions={scopeOptions} />
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
              Create Product
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={<Title level={4} className="mb-0">Products List</Title>}
        className="shadow-sm"
        extra={
          <div className="flex flex-wrap gap-2">
            <Input.Search
              allowClear
              placeholder="Search code or name"
              className="w-48 sm:w-64"
              onSearch={(value) => {
                setSearch(value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
            <Select
              className="w-40"
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={(value: ProductStatus | "") => {
                setStatusFilter(value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={tableLoading}
          scroll={{ x: true }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            position: ["bottomCenter"],
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} products`,
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
