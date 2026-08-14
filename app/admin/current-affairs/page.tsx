"use client";

import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
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
import { ImageUpload } from "@/app/components/ImageUpload";
import {
  currentAffairsApi,
  formatEzPrepError,
  type CurrentAffair,
  type CurrentAffairImage,
} from "@/app/services/ezprep-api";
import {
  dateKeyToDayjs,
  datePickerValueFromEvent,
  toDateKey,
  todayDateKey,
} from "./date-key";

const { Title, Text } = Typography;

const cardStyles = {
  header: { padding: "20px 28px 16px" },
  body: { padding: "24px 28px 28px" },
};

function excerpt(text?: string, max = 80) {
  if (!text) return "-";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function isImageMeta(value: unknown): value is CurrentAffairImage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const image = value as CurrentAffairImage;
  return (
    typeof image.key === "string" &&
    typeof image.bucket === "string" &&
    typeof image.region === "string"
  );
}

export default function CurrentAffairsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
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
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      responsive: ["sm", "md", "lg", "xl", "xxl"] as Breakpoint[],
      render: (text: string) => excerpt(text),
    },
    {
      title: "Memory Trick",
      dataIndex: "memoryTrick",
      key: "memoryTrick",
      responsive: ["md", "lg", "xl", "xxl"] as Breakpoint[],
      render: (text?: string) => excerpt(text, 60),
    },
    {
      title: "Image",
      dataIndex: "imageUrl",
      key: "imageUrl",
      render: (url?: string) =>
        url ? (
          <img
            src={url}
            alt="current affair"
            className="w-10 h-10 object-cover rounded"
          />
        ) : (
          "-"
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: CurrentAffair) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => router.push(`/admin/current-affairs/${record.id}`)}
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
    <div className="space-y-8 py-2">
      <Card
        title={
          <div>
            <Title level={4} className="!mb-1">
              Create current affair
            </Title>
            <Text type="secondary">
              New items are saved against the date you choose here — not the
              time you click Create.
            </Text>
          </div>
        }
        className="w-full shadow-sm"
        styles={cardStyles}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="max-w-4xl"
          initialValues={{ date: selectedDate }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              label="Title"
              name="title"
              rules={[{ required: true, message: "Please enter a title" }]}
            >
              <Input placeholder="Headline for this event" size="large" />
            </Form.Item>

            <Form.Item
              label="Date"
              name="date"
              rules={[{ required: true, message: "Please select a date" }]}
              getValueFromEvent={datePickerValueFromEvent}
              getValueProps={(value: string | undefined) => ({
                value: dateKeyToDayjs(value),
              })}
            >
              <DatePicker
                allowClear={false}
                format="YYYY-MM-DD"
                className="w-full"
                size="large"
                getPopupContainer={() => document.body}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Description"
            name="description"
            rules={[
              { required: true, message: "Please enter a description" },
            ]}
          >
            <Input.TextArea
              placeholder="Details about the event"
              size="large"
              autoSize={{ minRows: 3, maxRows: 8 }}
            />
          </Form.Item>

          <Form.Item label="Memory Trick" name="memoryTrick">
            <Input.TextArea
              placeholder="Optional mnemonic to remember this event"
              size="large"
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>

          <ImageUpload name={["image"]} label="Image (optional)" />

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<PlusOutlined />}
              className="bg-blue-600 hover:bg-blue-700"
              loading={loading}
            >
              Create Current Affair
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <div>
            <Title level={4} className="!mb-1">
              Saved current affairs
            </Title>
            <Text type="secondary">
              Filter is a single calendar day. Today is {todayDateKey()}.
            </Text>
          </div>
        }
        className="w-full shadow-sm"
        styles={cardStyles}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 pb-4 border-b">
          <Text strong>Show items for</Text>
          <DatePicker
            allowClear={false}
            value={selectedDayjs}
            format="YYYY-MM-DD"
            onChange={handleListDateChange}
            size="large"
            getPopupContainer={() => document.body}
          />
        </div>

        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={tableLoading}
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
      </Card>
    </div>
  );
}
