"use client";

import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { Select } from "@/app/components/SearchableSelect";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import { EditPageShell } from "@/app/components/PageLoader";
import {
  formatEzPrepError,
  formatPaiseAsRupees,
  offersApi,
  paiseToRupees,
  productsApi,
  rupeesToPaise,
  type DurationPreset,
  type Offer,
  type OfferStatus,
  type ProductDetail,
  type ProductStatus,
} from "@/app/services/ezprep-api";
import { ProductGrantsFields } from "../ProductGrantsFields";
import {
  collapseApiGrantsToFormRows,
  expandGrantFormRowsToApi,
  type GrantFormRow,
} from "../grant-form";
import {
  EMPTY_GRANT_SCOPE_OPTIONS,
  loadGrantScopeOptions,
  type GrantScopeOptions,
} from "../grant-options";

const { Title, Text } = Typography;

const DURATION_OPTIONS: { value: DurationPreset; label: string }[] = [
  { value: "1M", label: "1 month" },
  { value: "3M", label: "3 months" },
  { value: "6M", label: "6 months" },
  { value: "12M", label: "12 months" },
  { value: "LIFETIME", label: "Lifetime" },
];

const OFFER_STATUS_OPTIONS: { value: OfferStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const STATUS_COLORS: Record<ProductStatus, string> = {
  DRAFT: "default",
  PUBLISHED: "success",
  ARCHIVED: "warning",
};

type OfferFormValues = {
  durationPreset: DurationPreset;
  listAmountRupees: number;
  saleAmountRupees?: number;
  saleWindow?: [Dayjs, Dayjs];
  status: OfferStatus;
};

export default function EditProductPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [offerForm] = Form.useForm<OfferFormValues>();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [offerSaving, setOfferSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [scopeOptions, setScopeOptions] = useState<GrantScopeOptions>(
    EMPTY_GRANT_SCOPE_OPTIONS
  );
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const router = useRouter();
  const offerStatusWatch =
    Form.useWatch("status", offerForm) ?? ("ACTIVE" as OfferStatus);

  const isArchived = product?.status === "ARCHIVED";
  const offers = useMemo(() => product?.offers || [], [product?.offers]);

  const activeDurationPresets = useMemo(() => {
    const set = new Set<DurationPreset>();
    for (const offer of offers) {
      if (offer.status === "ACTIVE") {
        set.add(offer.durationPreset);
      }
    }
    return set;
  }, [offers]);

  const durationOptionsForForm = useMemo(
    () =>
      DURATION_OPTIONS.map((option) => {
        const conflict =
          !editingOffer &&
          offerStatusWatch === "ACTIVE" &&
          activeDurationPresets.has(option.value);
        return {
          ...option,
          disabled: conflict,
          label: conflict ? `${option.label} (ACTIVE exists)` : option.label,
        };
      }),
    [activeDurationPresets, editingOffer, offerStatusWatch]
  );

  const fetchProduct = useCallback(async () => {
    try {
      const res = await productsApi.get(params.id);
      const data = res.data;
      setProduct(data);
      form.setFieldsValue({
        name: data.name,
        description: data.description,
        grants: collapseApiGrantsToFormRows(data.grants),
      });
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch product"));
    }
  }, [form, params.id]);

  useEffect(() => {
    const load = async () => {
      setInitialLoading(true);
      try {
        const [options] = await Promise.all([
          loadGrantScopeOptions(),
          fetchProduct(),
        ]);
        setScopeOptions(options);
      } catch (error) {
        message.error(
          formatEzPrepError(error, "Failed to load product editor")
        );
      } finally {
        setInitialLoading(false);
      }
    };
    void load();
  }, [fetchProduct]);

  const handleSubmit = async (values: {
    name: string;
    description?: string;
    grants: GrantFormRow[];
  }) => {
    if (isArchived) return;
    const grants = expandGrantFormRowsToApi(values.grants);
    if (grants.length < 1) {
      message.error("Add at least one grant target");
      return;
    }
    setLoading(true);
    try {
      await productsApi.update(params.id, {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        grants,
      });
      message.success("Product updated successfully");
      await fetchProduct();
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to update product"));
    } finally {
      setLoading(false);
    }
  };

  const runProductAction = (
    title: string,
    content: string,
    action: () => Promise<void>
  ) => {
    showConfirmModal({
      title,
      content,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await action();
        } catch (error) {
          message.error(formatEzPrepError(error, "Action failed"));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handlePublish = () => {
    runProductAction(
      "Publish Product",
      "Publish this product? Grant targets will be validated and a version may be created.",
      async () => {
        await productsApi.publish(params.id);
        message.success("Product published successfully");
        await fetchProduct();
      }
    );
  };

  const handleArchive = () => {
    runProductAction(
      "Archive Product",
      "Archive this product? It will be hidden from the user catalog.",
      async () => {
        await productsApi.archive(params.id);
        message.success("Product archived successfully");
        await fetchProduct();
      }
    );
  };

  const handleDuplicate = () => {
    runProductAction(
      "Duplicate Product",
      "Create a new DRAFT copy of this product? Offers are not copied.",
      async () => {
        const res = await productsApi.duplicate(params.id);
        message.success("Product duplicated successfully");
        router.push(`/admin/products/${res.data.id}`);
      }
    );
  };

  const handleDelete = () => {
    runProductAction(
      "Delete Product",
      "Are you sure you want to delete this product? This action cannot be undone.",
      async () => {
        await productsApi.delete(params.id);
        message.success("Product deleted successfully");
        router.push("/admin/products");
      }
    );
  };

  const openCreateOffer = () => {
    setEditingOffer(null);
    offerForm.resetFields();
    offerForm.setFieldsValue({
      status: "ACTIVE",
    });
    setOfferModalOpen(true);
  };

  const openEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    const saleWindow =
      offer.saleValidFrom && offer.saleValidUntil
        ? ([dayjs(offer.saleValidFrom), dayjs(offer.saleValidUntil)] as [
            Dayjs,
            Dayjs,
          ])
        : undefined;
    offerForm.setFieldsValue({
      durationPreset: offer.durationPreset,
      listAmountRupees: paiseToRupees(offer.listAmount),
      saleAmountRupees:
        offer.saleAmount != null ? paiseToRupees(offer.saleAmount) : undefined,
      saleWindow,
      status: offer.status,
    });
    setOfferModalOpen(true);
  };

  const handleOfferSubmit = async (values: OfferFormValues) => {
    const listAmount = rupeesToPaise(values.listAmountRupees);
    const saleAmount =
      values.saleAmountRupees != null && values.saleAmountRupees !== undefined
        ? rupeesToPaise(values.saleAmountRupees)
        : undefined;
    const saleValidFrom = values.saleWindow?.[0]?.toISOString();
    const saleValidUntil = values.saleWindow?.[1]?.toISOString();

    if (
      values.status === "ACTIVE" &&
      activeDurationPresets.has(values.durationPreset) &&
      (!editingOffer ||
        editingOffer.durationPreset !== values.durationPreset ||
        editingOffer.status !== "ACTIVE")
    ) {
      message.error(
        `An ACTIVE offer already exists for duration ${values.durationPreset}`
      );
      return;
    }

    setOfferSaving(true);
    try {
      if (editingOffer) {
        await offersApi.update(editingOffer.id, {
          listAmount,
          saleAmount: saleAmount ?? null,
          saleValidFrom: saleValidFrom ?? null,
          saleValidUntil: saleValidUntil ?? null,
          status: values.status,
        });
        message.success("Offer updated successfully");
      } else {
        await offersApi.createForProduct(params.id, {
          durationPreset: values.durationPreset,
          listAmount,
          saleAmount,
          saleValidFrom,
          saleValidUntil,
          status: values.status,
        });
        message.success("Offer created successfully");
      }
      setOfferModalOpen(false);
      setEditingOffer(null);
      await fetchProduct();
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to save offer"));
    } finally {
      setOfferSaving(false);
    }
  };

  const offerColumns = [
    {
      title: "Duration",
      dataIndex: "durationPreset",
      key: "durationPreset",
    },
    {
      title: "List",
      dataIndex: "listAmount",
      key: "listAmount",
      render: (amount: number) => formatPaiseAsRupees(amount),
    },
    {
      title: "Sale",
      dataIndex: "saleAmount",
      key: "saleAmount",
      render: (amount?: number) =>
        amount != null ? formatPaiseAsRupees(amount) : "-",
    },
    {
      title: "Sale window",
      key: "saleWindow",
      render: (_: unknown, offer: Offer) => {
        if (!offer.saleValidFrom && !offer.saleValidUntil) return "-";
        const from = offer.saleValidFrom
          ? dayjs(offer.saleValidFrom).format("YYYY-MM-DD")
          : "?";
        const until = offer.saleValidUntil
          ? dayjs(offer.saleValidUntil).format("YYYY-MM-DD")
          : "?";
        return `${from} → ${until}`;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: OfferStatus) => (
        <Tag color={status === "ACTIVE" ? "success" : "default"}>{status}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, offer: Offer) => (
        <Button type="link" size="small" onClick={() => openEditOffer(offer)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <EditPageShell loading={initialLoading}>
      <div className="space-y-6">
        <Card
          title={
            <div className="flex flex-wrap items-center gap-3">
              <Title level={4} className="mb-0">
                Edit Product
              </Title>
              {product && (
                <>
                  <Tag color={STATUS_COLORS[product.status]}>
                    {product.status}
                  </Tag>
                  <Text type="secondary">
                    {product.code} · v{product.version}
                  </Text>
                </>
              )}
            </div>
          }
          className="w-full shadow-sm"
          extra={
            <Space wrap>
              {product?.status === "DRAFT" || product?.status === "PUBLISHED" ? (
                <Button
                  type="primary"
                  className="bg-blue-600 hover:!bg-blue-700"
                  loading={actionLoading}
                  onClick={handlePublish}
                >
                  Publish
                </Button>
              ) : null}
              {product?.status === "PUBLISHED" ? (
                <Button loading={actionLoading} onClick={handleArchive}>
                  Archive
                </Button>
              ) : null}
              <Button loading={actionLoading} onClick={handleDuplicate}>
                Duplicate
              </Button>
              <Button danger loading={actionLoading} onClick={handleDelete}>
                Delete
              </Button>
            </Space>
          }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="max-w-4xl"
            disabled={isArchived}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Form.Item label="Code">
                <Input value={product?.code} size="large" disabled />
              </Form.Item>

              <Form.Item
                label="Name"
                name="name"
                rules={[
                  { required: true, message: "Please enter product name" },
                ]}
              >
                <Input placeholder="Product name" size="large" />
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
              <ProductGrantsFields
                scopeOptions={scopeOptions}
                disabled={isArchived}
              />
            </div>

            {!isArchived && (
              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  className="bg-blue-600 hover:bg-blue-700"
                  loading={loading}
                >
                  Update Product
                </Button>
                <Button
                  className="ml-2"
                  size="large"
                  onClick={() => router.push("/admin/products")}
                >
                  Back
                </Button>
              </Form.Item>
            )}
            {isArchived && (
              <Button size="large" onClick={() => router.push("/admin/products")}>
                Back
              </Button>
            )}
          </Form>
        </Card>

        <Card
          title={<Title level={4} className="mb-0">Offers</Title>}
          className="shadow-sm"
          extra={
            <Button
              type="primary"
              className="bg-blue-600 hover:!bg-blue-700"
              icon={<PlusOutlined />}
              onClick={openCreateOffer}
              disabled={isArchived}
            >
              Add Offer
            </Button>
          }
        >
          <Table
            columns={offerColumns}
            dataSource={offers}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: "No offers yet" }}
            scroll={{ x: true }}
          />
        </Card>

        <Modal
          title={editingOffer ? "Edit Offer" : "Add Offer"}
          open={offerModalOpen}
          onCancel={() => {
            setOfferModalOpen(false);
            setEditingOffer(null);
          }}
          footer={null}
          destroyOnHidden
        >
          <Form
            form={offerForm}
            layout="vertical"
            onFinish={handleOfferSubmit}
            initialValues={{ status: "ACTIVE" }}
          >
            <Form.Item
              label="Duration"
              name="durationPreset"
              rules={[{ required: true, message: "Select duration" }]}
            >
              <Select
                options={durationOptionsForForm}
                disabled={!!editingOffer}
                placeholder="Select duration"
              />
            </Form.Item>

            <Form.Item
              label="List amount (₹)"
              name="listAmountRupees"
              rules={[
                { required: true, message: "Enter list amount" },
                {
                  type: "number",
                  min: 0,
                  message: "Amount must be ≥ 0",
                },
              ]}
              extra="GST-inclusive. Sent to API as integer paise."
            >
              <InputNumber
                className="w-full"
                min={0}
                step={1}
                precision={2}
                prefix="₹"
              />
            </Form.Item>

            <Form.Item
              label="Sale amount (₹)"
              name="saleAmountRupees"
              rules={[{ type: "number", min: 0, message: "Amount must be ≥ 0" }]}
            >
              <InputNumber
                className="w-full"
                min={0}
                step={1}
                precision={2}
                prefix="₹"
              />
            </Form.Item>

            <Form.Item label="Sale window" name="saleWindow">
              <DatePicker.RangePicker className="w-full" showTime />
            </Form.Item>

            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: "Select status" }]}
            >
              <Select options={OFFER_STATUS_OPTIONS} />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={offerSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingOffer ? "Update Offer" : "Create Offer"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </EditPageShell>
  );
}
