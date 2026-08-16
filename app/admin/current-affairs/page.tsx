"use client";

import {
  Button,
  Card,
  Empty,
  Form,
  Pagination,
  Spin,
  Table,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { showConfirmModal } from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";
import type { Dayjs } from "dayjs";
import {
  currentAffairsApi,
  formatEzPrepError,
  type CurrentAffair,
  type CurrentAffairImage,
} from "@/app/services/ezprep-api";
import { toPlainImageMetadata } from "@/app/components/ImageUpload";
import {
  dateKeyToDayjs,
  datePickerValueFromEvent,
  toDateKey,
  todayDateKey,
} from "./date-key";
import {
  AffairDatePicker,
  CurrentAffairFormFields,
  affairCardClassName,
  affairCardStyles,
} from "./form-fields";

const { Title, Text } = Typography;

function excerpt(text?: string, max = 80) {
  if (!text) return "-";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function isImageMeta(value: unknown): value is CurrentAffairImage {
  return Boolean(toPlainImageMetadata(value));
}

export default function CurrentAffairsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [items, setItems] = useState<CurrentAffair[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayDateKey());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const fetchGeneration = useRef(0);
  const router = useRouter();

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      width: 200,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      width: 280,
      responsive: ["lg", "xl", "xxl"] as Breakpoint[],
      render: (text: string) => excerpt(text),
    },
    {
      title: "Memory Trick",
      dataIndex: "memoryTrick",
      key: "memoryTrick",
      ellipsis: true,
      responsive: ["xl", "xxl"] as Breakpoint[],
      render: (text?: string) => excerpt(text, 60),
    },
    {
      title: "Image",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 104,
      align: "center" as const,
      render: (url?: string) =>
        url ? (
          <img
            src={url}
            alt=""
            className="w-10 h-10 object-cover rounded"
          />
        ) : (
          "-"
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 148,
      render: (_: unknown, record: CurrentAffair) => (
        <div className="flex flex-wrap gap-1">
          <Button
            type="link"
            size="small"
            className="px-1"
            onClick={() => router.push(`/admin/current-affairs/${record.id}`)}
          >
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            danger
            className="px-1"
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const fetchItems = useCallback(async (date: string, nextPage: number, nextLimit: number) => {
    const generation = ++fetchGeneration.current;
    setTableLoading(true);
    try {
      const data = await currentAffairsApi.list({
        date,
        page: nextPage,
        limit: nextLimit,
      });
      if (generation !== fetchGeneration.current) {
        return;
      }
      setItems(data.data || []);
      setTotal(data.pagination?.total ?? 0);
    } catch (error) {
      if (generation === fetchGeneration.current) {
        message.error(formatEzPrepError(error, "Failed to fetch current affairs"));
      }
    } finally {
      if (generation === fetchGeneration.current) {
        setTableLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchItems(selectedDate, page, pageSize);
  }, [fetchItems, selectedDate, page, pageSize]);

  const applyListDate = (next: string) => {
    setSelectedDate(next);
    form.setFieldsValue({ date: next });
    setPage(1);
  };

  const handleListDateChange = (
    value: Dayjs | null,
    dateString: string | string[] | null
  ) => {
    const next = datePickerValueFromEvent(value, dateString);
    if (!next || next === selectedDate) {
      return;
    }
    applyListDate(next);
  };

  const handleSubmit = async (values: {
    title: string;
    description: string;
    date?: unknown;
    memoryTrick?: string;
    image?: CurrentAffairImage;
  }) => {
    if (imageUploading) {
      return;
    }
    const date = toDateKey(values.date) ?? selectedDate;
    const image = isImageMeta(values.image)
      ? values.image
      : isImageMeta(form.getFieldValue("image"))
        ? form.getFieldValue("image")
        : undefined;

    setLoading(true);
    try {
      await currentAffairsApi.create({
        title: values.title,
        description: values.description,
        date,
        memoryTrick: values.memoryTrick,
        image,
      });
      message.success("Current affair created successfully");
      form.resetFields();
      form.setFieldsValue({ date });
      const alreadyOnList = date === selectedDate && page === 1;
      setSelectedDate(date);
      setPage(1);
      if (alreadyOnList) {
        await fetchItems(date, 1, pageSize);
      }
    } catch (error) {
      message.error(
        formatEzPrepError(error, "Failed to create current affair")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: "Delete Current Affair",
      content:
        "Are you sure you want to delete this current affair? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await currentAffairsApi.delete(id);
          message.success("Current affair deleted successfully");
          await fetchItems(selectedDate, page, pageSize);
        } catch (error) {
          message.error(
            formatEzPrepError(error, "Failed to delete current affair")
          );
        }
      },
    });
  };

  const selectedDayjs = dateKeyToDayjs(selectedDate);

  return (
    <div className="space-y-4 sm:space-y-8 pb-6">
      <Card
        title={
          <div>
            <Title level={4} className="!mb-1 !text-lg sm:!text-xl">
              Create current affair
            </Title>
            <Text type="secondary" className="text-sm !whitespace-normal block">
              Saved against the date you pick — not the time you tap Create.
            </Text>
          </div>
        }
        className={affairCardClassName}
        styles={affairCardStyles}
      >
        <Spin spinning={loading} tip="Saving current affair…">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="max-w-4xl"
          disabled={loading}
          initialValues={{ date: selectedDate }}
          scrollToFirstError={{ behavior: "smooth", block: "center" }}
        >
          <CurrentAffairFormFields onImageUploadingChange={setImageUploading} />

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<PlusOutlined />}
              className="w-full sm:w-auto min-h-11 bg-blue-600 hover:bg-blue-700"
              loading={loading || imageUploading}
              disabled={imageUploading}
            >
              {imageUploading ? "Uploading image…" : "Create item"}
            </Button>
          </Form.Item>
        </Form>
        </Spin>
      </Card>

      <Card
        title={
          <div>
            <Title level={4} className="!mb-1 !text-lg sm:!text-xl">
              Saved current affairs
            </Title>
            <Text type="secondary" className="text-sm !whitespace-normal block">
              One calendar day. Today is {todayDateKey()}.
            </Text>
          </div>
        }
        className={affairCardClassName}
        styles={affairCardStyles}
      >
        <div className="flex flex-col gap-2 mb-4 sm:mb-6 pb-4 border-b sm:flex-row sm:items-center">
          <Text strong className="shrink-0">
            Show items for
          </Text>
          <AffairDatePicker
            className="w-full min-h-11 sm:w-[220px]"
            value={selectedDayjs}
            onChange={handleListDateChange}
          />
        </div>

        <div className="md:hidden">
          <Spin spinning={tableLoading}>
            {items.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={`No items for ${selectedDate}. Pick the date the item was saved against.`}
              />
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-neutral-200 p-3.5"
                  >
                    <div className="flex gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-base leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1 line-clamp-3">
                          {item.description}
                        </p>
                        {item.memoryTrick ? (
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                            {item.memoryTrick}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Button
                        size="large"
                        className="min-h-11"
                        onClick={() =>
                          router.push(`/admin/current-affairs/${item.id}`)
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        size="large"
                        danger
                        className="min-h-11"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {total > 0 ? (
              <div className="flex justify-center mt-4 overflow-x-auto">
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  simple
                  onChange={(nextPage, nextSize) => {
                    setPage(nextPage);
                    setPageSize(nextSize);
                  }}
                />
              </div>
            ) : null}
          </Spin>
        </div>

        <div className="hidden md:block">
          <Table
            columns={columns}
            dataSource={items}
            rowKey="id"
            loading={tableLoading}
            scroll={{ x: 640 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={`No current affairs for ${selectedDate}. Pick the date the item was saved against (not createdAt).`}
                />
              ),
            }}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (nextPage, nextSize) => {
                setPage(nextPage);
                setPageSize(nextSize);
              },
              showSizeChanger: true,
              showTotal: (count) => `Total ${count} items`,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
