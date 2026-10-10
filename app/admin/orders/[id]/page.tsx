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
  type AdminOrderTax,
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
  const [orderNumberConfirm, setOrderNumberConfirm] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [repairing, setRepairing] = useState(false);

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
    if (!order || !trimmed || orderNumberConfirm !== order.orderNumber) {
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

  const retryProvisioning = () => {
    void (async () => {
      setRepairing(true);
      try {
        const result = await ordersApi.repair(params.id);
        setOrder(result.data);
        message.success(result.message || "Order repaired successfully");
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to retry provisioning"));
      } finally {
        setRepairing(false);
      }
    })();
  };

  const refundReady =
    Boolean(reason.trim()) && orderNumberConfirm === order?.orderNumber;
  const showRepair =
    order != null &&
    order.status === "PAID" &&
    (order.provisionedAt === null || !order.invoice);

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
                <Text type="secondary">Name </Text>
                <Text>{order.user?.name?.trim() || "Unknown user"}</Text>
              </div>
              <div>
                <Text type="secondary">Email </Text>
                <Text>{order.user?.email || "—"}</Text>
              </div>
              <div>
                <Text type="secondary">Phone </Text>
                <Text>{order.user?.phoneNumber || "—"}</Text>
              </div>
              {order.user?.username ? (
                <div>
                  <Text type="secondary">Username </Text>
                  <Text>{order.user.username}</Text>
                </div>
              ) : null}
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
              {order.lateCaptureAt ? (
                <div>
                  <Text type="secondary">Late capture </Text>
                  <Text>{new Date(order.lateCaptureAt).toLocaleString("en-IN")}</Text>
                </div>
              ) : null}
              {order.redundantPurchase ? (
                <div>
                  <Tag color="gold">Redundant purchase</Tag>
                </div>
              ) : null}
              {order.refund?.initiatedBySource === "PROVIDER" ? (
                <div>
                  <Tag color="orange">External refund</Tag>
                </div>
              ) : null}
            </Space>
          </Card>

          {showRepair ? (
            <Button type="primary" loading={repairing} onClick={retryProvisioning}>
              Retry provisioning
            </Button>
          ) : null}

          {(order.duplicatePayments ?? []).length > 0 ? (
            <Card title="Duplicate payments" className="shadow-sm">
              <ul className="space-y-2 text-sm">
                {(order.duplicatePayments ?? []).map((payment) => (
                  <li key={payment.id}>
                    {payment.providerPaymentId || payment.id} · {payment.status} · refund{" "}
                    {payment.refundStatus ?? "none"}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {order.tax ? <TaxBlock order={order} /> : null}

          {order.status === "PAID" && order.refund?.status !== "INITIATED" ? (
            <Card title="Refund" className="shadow-sm">
              <Space direction="vertical" className="w-full max-w-xl">
                <Input.TextArea
                  rows={3}
                  value={reason}
                  maxLength={500}
                  placeholder="Reason for this full refund"
                  onChange={(event) => setReason(event.target.value)}
                />
                <Input
                  value={orderNumberConfirm}
                  placeholder="Type the order number"
                  onChange={(event) => setOrderNumberConfirm(event.target.value)}
                />
                <Button
                  danger
                  type="primary"
                  loading={refunding}
                  disabled={!refundReady}
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

function TaxBlock({ order }: { order: AdminOrderDetail }) {
  const tax = order.tax;
  if (!tax) return null;
  const buyerCode = tax.buyerStateCode || order.billing?.stateCode;
  const buyerName = order.billing?.state;
  const buyer =
    buyerName && buyerCode
      ? `${buyerName} (${buyerCode})`
      : buyerCode || buyerName || "—";
  return (
    <Card title="GST" className="shadow-sm">
      <Space direction="vertical" size="small">
        <TaxLine label="Taxable" value={formatPaiseAsRupees(tax.taxableAmount)} />
        <TaxLine label="CGST" value={formatPaiseAsRupees(tax.cgst)} />
        <TaxLine label="SGST" value={formatPaiseAsRupees(tax.sgst)} />
        <TaxLine label="IGST" value={formatPaiseAsRupees(tax.igst)} />
        <TaxLine label="Rate" value={`${tax.taxRate}%`} />
        <TaxLine label="Supply type" value={supplyTypeLabel(tax)} />
        <TaxLine label="Buyer state" value={buyer} />
      </Space>
    </Card>
  );
}

function TaxLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text type="secondary">{label} </Text>
      <Text>{value}</Text>
    </div>
  );
}

function supplyTypeLabel(tax: AdminOrderTax): string {
  const supplyType =
    tax.supplyType ?? (tax.igst > 0 ? "INTER_STATE" : "INTRA_STATE");
  return supplyType === "INTER_STATE" ? "Inter-state" : "Intra-state";
}
