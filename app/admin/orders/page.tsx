"use client";

import { Button, Card, Input, Table, Tag, Typography, message } from "antd";
import { Select } from "@/app/components/SearchableSelect";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatEzPrepError,
  formatPaiseAsRupees,
  ordersApi,
  type AdminOrder,
  type OrderStatus,
} from "@/app/services/ezprep-api";

const { Title } = Typography;

const STATUS_COLORS: Record<OrderStatus, string> = {
  CREATED: "default",
  PENDING_PAYMENT: "gold",
  PAID: "green",
  FAILED: "red",
  EXPIRED: "default",
  CANCELLED: "default",
  REFUNDED: "purple",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PAID", label: "Paid" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PENDING_PAYMENT", label: "Pending payment" },
  { value: "FAILED", label: "Failed" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "CREATED", label: "Created" },
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const fetchOrders = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await ordersApi.list({
        page: pagination.current,
        limit: pagination.pageSize,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setOrders(response.data || []);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination?.total ?? response.data.length,
      }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load orders"));
    } finally {
      setTableLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search, statusFilter]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-6">
      <Card
        title={<Title level={4} className="mb-0">Orders</Title>}
        className="shadow-sm"
        extra={
          <div className="flex flex-wrap gap-2">
            <Input.Search
              allowClear
              placeholder="Search order number"
              className="w-48 sm:w-64"
              onSearch={(value) => {
                setSearch(value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
            <Select
              className="w-44"
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={(value: OrderStatus | "") => {
                setStatusFilter(value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
          </div>
        }
      >
        <Table
          columns={[
            {
              title: "Order",
              dataIndex: "orderNumber",
              render: (value: string, row: AdminOrder) => (
                <Button
                  type="link"
                  className="px-0"
                  onClick={() => router.push(`/admin/orders/${row.id}`)}
                >
                  {value}
                </Button>
              ),
            },
            {
              title: "Status",
              dataIndex: "status",
              render: (status: OrderStatus) => (
                <Tag color={STATUS_COLORS[status]}>{status}</Tag>
              ),
            },
            {
              title: "Amount",
              dataIndex: "amount",
              render: (amount: number) => formatPaiseAsRupees(amount),
            },
            { title: "User", dataIndex: "userId" },
            {
              title: "Created",
              dataIndex: "createdAt",
              render: (value?: string) =>
                value ? new Date(value).toLocaleString("en-IN") : "—",
            },
          ]}
          dataSource={orders}
          rowKey="id"
          loading={tableLoading}
          scroll={{ x: true }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            position: ["bottomCenter"],
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} orders`,
            onChange: (page, pageSize) => {
              setPagination((prev) => ({
                ...prev,
                current: page,
                pageSize: pageSize || 20,
              }));
            },
          }}
        />
      </Card>
    </div>
  );
}
