"use client";

import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Select } from "@/app/components/SearchableSelect";
import { showConfirmModal } from "@/components/ConfirmModal";
import {
  entitlementsApi,
  formatEzPrepError,
  type DurationPreset,
  type Entitlement,
  type EntitlementScopeType,
  type EntitlementStatus,
} from "@/app/services/ezprep-api";
import {
  EMPTY_GRANT_SCOPE_OPTIONS,
  SCOPE_TYPE_OPTIONS,
  loadGrantScopeOptions,
  type GrantScopeOptions,
} from "../products/grant-options";
import { formatJoinedDate } from "./helpers";

const { Text } = Typography;

const DURATION_OPTIONS: { value: DurationPreset; label: string }[] = [
  { value: "1M", label: "1 month" },
  { value: "3M", label: "3 months" },
  { value: "6M", label: "6 months" },
  { value: "12M", label: "12 months" },
  { value: "LIFETIME", label: "Lifetime" },
];

const STATUS_COLORS: Record<EntitlementStatus, string> = {
  ACTIVE: "success",
  EXPIRED: "default",
  REVOKED: "error",
};

type GrantFormValues = {
  scopeType: EntitlementScopeType;
  scopeIds: string[];
  durationPreset: DurationPreset;
  reason?: string;
};

export function resolveScopeLabel(
  scopeType: EntitlementScopeType,
  scopeId: string,
  scopeOptions: GrantScopeOptions
): string {
  const label = scopeOptions[scopeType]?.find(
    (option) => option.value === scopeId
  )?.label;
  return label || `${scopeType} · ${scopeId}`;
}

export function EntitlementsSection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Entitlement[]>([]);
  const [scopeOptions, setScopeOptions] = useState<GrantScopeOptions>(
    EMPTY_GRANT_SCOPE_OPTIONS
  );
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [form] = Form.useForm<GrantFormValues>();
  const scopeTypeWatch = Form.useWatch("scopeType", form);

  const loadEntitlements = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await entitlementsApi.listForUser(userId, {
        includeInactive: true,
      });
      setRows(response.data ?? []);
    } catch (error) {
      setRows([]);
      message.error(formatEzPrepError(error, "Failed to load entitlements"));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadEntitlements();
  }, [loadEntitlements]);

  useEffect(() => {
    let cancelled = false;
    void loadGrantScopeOptions()
      .then((options) => {
        if (!cancelled) setScopeOptions(options);
      })
      .catch(() => {
        if (!cancelled) setScopeOptions(EMPTY_GRANT_SCOPE_OPTIONS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scopeIdOptions = useMemo(() => {
    if (!scopeTypeWatch) return [];
    return scopeOptions[scopeTypeWatch] ?? [];
  }, [scopeOptions, scopeTypeWatch]);

  const openGrantModal = () => {
    form.resetFields();
    form.setFieldsValue({
      scopeType: "EXAM",
      scopeIds: [],
      durationPreset: "3M",
    });
    setGrantOpen(true);
  };

  const submitGrant = async () => {
    try {
      const values = await form.validateFields();
      const scopeIds = Array.from(new Set(values.scopeIds ?? [])).filter(Boolean);
      if (scopeIds.length < 1) {
        message.error("Select at least one scope target");
        return;
      }
      setGrantSubmitting(true);
      const reason = values.reason?.trim() || undefined;
      // One entitlement per selected target (API grant is single-scope).
      await Promise.all(
        scopeIds.map((scopeId) =>
          entitlementsApi.grant({
            userId,
            scopeType: values.scopeType,
            scopeId,
            durationPreset: values.durationPreset,
            reason,
          })
        )
      );
      message.success(
        scopeIds.length === 1
          ? "Entitlement granted"
          : `${scopeIds.length} entitlements granted`
      );
      setGrantOpen(false);
      form.resetFields();
      await loadEntitlements();
    } catch (error) {
      if (error && typeof error === "object" && "errorFields" in error) {
        return;
      }
      message.error(formatEzPrepError(error, "Failed to grant entitlement"));
    } finally {
      setGrantSubmitting(false);
    }
  };

  const confirmRevoke = (entitlement: Entitlement) => {
    showConfirmModal({
      title: "Revoke entitlement?",
      content:
        "This removes access under ENFORCED mode. In-progress attempts are not stopped.",
      onConfirm: () => {
        void (async () => {
          try {
            await entitlementsApi.revoke(entitlement.id, {
              reason: "admin_revoke",
            });
            message.success("Entitlement revoked");
            await loadEntitlements();
          } catch (error) {
            message.error(
              formatEzPrepError(error, "Failed to revoke entitlement")
            );
          }
        })();
      },
    });
  };

  const columns = [
    {
      title: "Scope",
      key: "scope",
      render: (_: unknown, row: Entitlement) => (
        <div>
          <div className="text-sm text-neutral-900">
            {resolveScopeLabel(row.scopeType, row.scopeId, scopeOptions)}
          </div>
          <Text type="secondary" className="text-xs">
            {row.scopeType}
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: EntitlementStatus) => (
        <Tag color={STATUS_COLORS[status] ?? "default"}>{status}</Tag>
      ),
    },
    {
      title: "Starts",
      dataIndex: "startsAt",
      key: "startsAt",
      render: (value: string) => formatJoinedDate(value),
    },
    {
      title: "Expires",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (value: string | null) =>
        value ? formatJoinedDate(value) : "Lifetime",
    },
    {
      title: "Source",
      dataIndex: "sourceType",
      key: "sourceType",
    },
    {
      title: "Product",
      key: "product",
      render: (_: unknown, row: Entitlement) => {
        if (!row.productName?.trim()) {
          return <Text type="secondary">—</Text>;
        }
        return (
          <div>
            <div className="text-sm text-neutral-900">{row.productName}</div>
            <Text type="secondary" className="text-xs">
              {[row.productCode, row.productVersion != null ? `v${row.productVersion}` : ""]
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, row: Entitlement) =>
        row.status === "ACTIVE" ? (
          <Button
            danger
            type="link"
            className="px-0"
            onClick={() => confirmRevoke(row)}
          >
            Revoke
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ];

  return (
    <section className="space-y-3" data-testid="entitlements-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-semibold text-neutral-900">
            Entitlements
          </h2>
          <p className="mb-0 mt-1 text-sm text-neutral-500">
            Access grants are the source of truth for content. Grant or revoke
            without payment for support and promo cases.
          </p>
        </div>
        <Button
          type="primary"
          className="bg-blue-600 hover:!bg-blue-700"
          icon={<PlusOutlined />}
          onClick={openGrantModal}
        >
          Grant access
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        locale={{ emptyText: "No entitlements for this learner." }}
        className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
      />

      <Modal
        title="Grant entitlement"
        open={grantOpen}
        onCancel={() => setGrantOpen(false)}
        onOk={() => void submitGrant()}
        okText="Grant"
        confirmLoading={grantSubmitting}
        destroyOnHidden
        okButtonProps={{ className: "bg-blue-600 hover:!bg-blue-700" }}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="scopeType"
            label="Scope type"
            rules={[{ required: true, message: "Select a scope type" }]}
          >
            <Select
              options={SCOPE_TYPE_OPTIONS}
              onChange={() => {
                // Clear dependent field without nesting setFieldValue in the
                // Select's change path (avoids Ant Design circular-ref warning).
                form.resetFields(["scopeIds"]);
              }}
            />
          </Form.Item>
          <Form.Item
            name="scopeIds"
            label="Scope"
            rules={[
              {
                validator: async (_, value: string[] | undefined) => {
                  if (!value || value.length < 1) {
                    return Promise.reject(
                      new Error("Select at least one scope target")
                    );
                  }
                },
              },
            ]}
            getValueFromEvent={(value: string[]) => {
              if (!Array.isArray(value)) return [];
              return Array.from(new Set(value));
            }}
          >
            <Select
              mode="multiple"
              allowClear
              options={scopeIdOptions}
              placeholder="Search and select one or more targets"
              disabled={!scopeTypeWatch}
              maxTagCount="responsive"
            />
          </Form.Item>
          <Form.Item
            name="durationPreset"
            label="Duration"
            rules={[{ required: true, message: "Select a duration" }]}
          >
            <Select options={DURATION_OPTIONS} />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea
              rows={2}
              maxLength={500}
              placeholder="e.g. support, promo"
            />
          </Form.Item>
          <Space direction="vertical" size={0}>
            <Text type="secondary" className="text-xs">
              Creates one ADMIN_GRANT entitlement per selected target (same
              duration). Product linking is not used for pure support grants.
            </Text>
          </Space>
        </Form>
      </Modal>
    </section>
  );
}
