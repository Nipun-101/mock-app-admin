"use client";

import { Button, Card, Input, Space, Tag, Typography, message } from "antd";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import { EditPageShell } from "@/app/components/PageLoader";
import { EZPREP_PROXY_PREFIX } from "@/app/services/ezprep-api/config";
import {
  formatEzPrepError,
  formatPaiseAsRupees,
  ordersApi,
  type AdminOrderDetail,
  type OrderStatus,
} from "@/app/services/ezprep-api";

const { Title, Text } = Typography;

const REFUND_CONFIRM_TITLE = "Refund this order?";
const REFUND_CONFIRM_CONTENT =
  "This refunds the full amount and revokes access granted by this order. It does not change the tax invoice.";
const REFUND_COMPLETED_MESSAGE = "Order refunded";
const REFUND_PENDING_MESSAGE =
  "Refund is pending at the payment provider. Access was not revoked.";

export default function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ordersApi.get(params.id);
      setOrder(response.data);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load order"));
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmRefund = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      message.error("Enter a refund reason");
      return;
    }
    showConfirmModal({
      title: REFUND_CONFIRM_TITLE,
      content: REFUND_CONFIRM_CONTENT,
      onConfirm: () => {
        void (async () => {
          setRefunding(true);
          try {
            const result = await ordersApi.refund(params.id, { reason: trimmed });
            setOrder(result.data.order);
            if (result.data.refund.status === "INITIATED") {
              message.warning(result.message || REFUND_PENDING_MESSAGE);
            } else {
              message.success(result.message || REFUND_COMPLETED_MESSAGE);
            }
          } catch (error) {
            message.error(formatEzPrepError(error, "Failed to refund order"));
          } finally {
            setRefunding(false);
          }
        })();
      },
    });
  };

  return (
    <EditPageShell loading={loading}>
      {order ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Title level={4} className="mb-0">
              {order.orderNumber}
            </Title>
            <Button onClick={() => router.push("/admin/orders")}>Back</Button>
          </div>

          <Card className="shadow-sm">
            <Space direction="vertical" size="small" className="w-full">
              <div>
                <Text type="secondary">Status </Text>
                <Tag>{order.status as OrderStatus}</Tag>
              </div>
              <div>
                <Text type="secondary">Amount </Text>
                <Text>{formatPaiseAsRupees(order.amount)}</Text>
              </div>
              <div>
                <Text type="secondary">User </Text>
                <Text>{order.userId}</Text>
              </div>
              <div>
                <Text type="secondary">Payment </Text>
                <Text>
                  {order.payment
                    ? `${order.payment.status} · ${order.payment.provider}`
                    : "—"}
                </Text>
              </div>
              {order.invoice ? (
                <div>
                  <Text type="secondary">Invoice </Text>
                  <a
                    href={`${EZPREP_PROXY_PREFIX}/v1/admin/invoices/${order.invoice.id}/pdf`}
                  >
                    Download invoice
                  </a>
                  <Text type="secondary"> ({order.invoice.invoiceNumber})</Text>
                </div>
              ) : null}
              {order.refund ? (
                <div>
                  <Text type="secondary">Refund </Text>
                  <Text>
                    {order.refund.status}
                    {order.refund.providerRefundId
                      ? ` · ${order.refund.providerRefundId}`
                      : ""}
                  </Text>
                </div>
              ) : null}
            </Space>
          </Card>

          {order.status === "PAID" ? (
            <Card title="Refund" className="shadow-sm">
              <Space direction="vertical" className="w-full max-w-xl">
                <Input.TextArea
                  rows={3}
                  value={reason}
                  maxLength={500}
                  placeholder="Reason for this full refund"
                  onChange={(event) => setReason(event.target.value)}
                />
                <Button
                  danger
                  type="primary"
                  loading={refunding}
                  onClick={confirmRefund}
                >
                  Refund
                </Button>
              </Space>
            </Card>
          ) : null}
        </div>
      ) : null}
    </EditPageShell>
  );
}
