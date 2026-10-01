"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { Select } from "@/app/components/SearchableSelect";
import { PlusOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import { catalogApi } from "@/app/services/ezprep-api";
import { formatEzPrepError, sprintTestsApi } from "./api";
import type { SprintDraftListItem, SprintTest } from "./types";
import { SPRINT_SIZE_OPTIONS } from "./types";

const { Title } = Typography;
const { TextArea } = Input;

export default function SprintTestsPage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [exams, setExams] = useState<{ value: string; label: string }[]>([]);
  const [published, setPublished] = useState<SprintTest[]>([]);
  const [publishedLoading, setPublishedLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [drafts, setDrafts] = useState<SprintDraftListItem[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [discardingId, setDiscardingId] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    try {
      const examsList = await catalogApi.listAllExams();
      setExams(examsList.map((exam) => ({ value: exam.id, label: exam.name })));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch exams"));
    }
  }, []);

  const fetchPublished = useCallback(async () => {
    setPublishedLoading(true);
    try {
      const response = await sprintTestsApi.listPublished({
        page: pagination.current,
        limit: pagination.pageSize,
      });
      setPublished(response.data || []);
      setPagination((prev) => ({ ...prev, total: response.pagination?.total ?? 0 }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch sprint tests"));
    } finally {
      setPublishedLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  const fetchDrafts = useCallback(async () => {
    setDraftsLoading(true);
    try {
      const response = await sprintTestsApi.listDrafts({ page: 1, limit: 20 });
      setDrafts(response.data || []);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch drafts"));
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchExams();
    void fetchDrafts();
  }, [fetchExams, fetchDrafts]);

  useEffect(() => {
    void fetchPublished();
  }, [fetchPublished]);

  const handleCreate = async (values: {
    examId: string;
    totalQuestions: number;
    durationInMinutes: number;
    title?: string;
    description?: string;
    marksPerQuestion?: number;
    negativeMarking?: number;
    passingScore?: number;
    allowRetake?: boolean;
    shuffleOptions?: boolean;
    showResultsImmediately?: boolean;
  }) => {
    setCreating(true);
    try {
      const response = await sprintTestsApi.createDraft(values);
      message.success(response.message || "Sprint draft created");
      router.push(`/admin/sprint-tests/drafts/${response.data.id}`);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to create sprint draft"));
      setCreating(false);
    }
  };

  const handleDiscard = (draft: SprintDraftListItem) => {
    showConfirmModal({
      title: "Discard Draft",
      content: "Discard this draft? Question usage is not changed.",
      onConfirm: async () => {
        setDiscardingId(draft.id);
        try {
          const response = await sprintTestsApi.discardDraft(draft.id);
          message.success(response.message || "Draft discarded");
          await fetchDrafts();
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to discard draft"));
        } finally {
          setDiscardingId(null);
        }
      },
    });
  };

  const handleDelete = (id: string) => {
    showConfirmModal({
      title: "Delete Sprint Test",
      content: "Soft-delete this published sprint test?",
      onConfirm: async () => {
        try {
          const response = await sprintTestsApi.deletePublished(id);
          message.success(response.message || "Sprint test deleted");
          await fetchPublished();
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to delete sprint test"));
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Title level={2}>Sprint Tests</Title>

        <Card title="Create Sprint Test">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreate}
            initialValues={{
              marksPerQuestion: 1,
              negativeMarking: 0,
              allowRetake: true,
              shuffleOptions: false,
              showResultsImmediately: true,
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Exam"
                name="examId"
                rules={[{ required: true, message: "Please select an exam" }]}
              >
                <Select placeholder="Select exam" options={exams} showSearch />
              </Form.Item>
              <Form.Item
                label="Total Questions"
                name="totalQuestions"
                rules={[{ required: true, message: "Please select number of questions" }]}
              >
                <Select placeholder="Select number of questions">
                  {SPRINT_SIZE_OPTIONS.map((size) => (
                    <Select.Option key={size} value={size}>
                      {size} Questions
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                label="Duration (Minutes)"
                name="durationInMinutes"
                rules={[{ required: true, message: "Please select duration" }]}
              >
                <Select placeholder="Select duration">
                  {SPRINT_SIZE_OPTIONS.map((size) => (
                    <Select.Option key={size} value={size}>
                      {size} Minutes
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item label="Test Title" name="title">
                <Input placeholder="Optional title" />
              </Form.Item>
              <Form.Item label="Marks Per Question" name="marksPerQuestion">
                <InputNumber min={0} step={0.5} className="w-full" />
              </Form.Item>
              <Form.Item label="Negative Marking" name="negativeMarking">
                <InputNumber min={0} step={0.25} className="w-full" />
              </Form.Item>
              <Form.Item label="Passing Score" name="passingScore">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </div>
            <Form.Item label="Description" name="description">
              <TextArea rows={3} placeholder="Optional description" />
            </Form.Item>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item label="Allow Retake" name="allowRetake" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item label="Shuffle Options" name="shuffleOptions" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item
                label="Show Results Immediately"
                name="showResultsImmediately"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </div>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlusOutlined />}
              loading={creating}
              disabled={creating}
              className="!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600"
            >
              Create Draft
            </Button>
          </Form>
        </Card>

        <Card title="Open Drafts">
          <Table
            rowKey="id"
            loading={draftsLoading}
            dataSource={drafts}
            pagination={false}
            columns={[
              { title: "Exam", dataIndex: "examName", key: "examName" },
              {
                title: "Title",
                dataIndex: "title",
                key: "title",
                render: (title?: string) => title || "-",
              },
              { title: "Questions", dataIndex: "totalQuestions", key: "totalQuestions" },
              {
                title: "Duration",
                dataIndex: "durationInMinutes",
                key: "duration",
                render: (minutes: number) => `${minutes} mins`,
              },
              {
                title: "Status",
                dataIndex: "status",
                key: "status",
                render: (status: string) => <Tag color="blue">{status}</Tag>,
              },
              {
                title: "Actions",
                key: "actions",
                render: (record: SprintDraftListItem) => (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => router.push(`/admin/sprint-tests/drafts/${record.id}`)}
                    >
                      Review
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      loading={discardingId === record.id}
                      onClick={() => handleDiscard(record)}
                    >
                      Discard
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Card title="Published Sprint Tests">
          <Table
            rowKey="id"
            loading={publishedLoading}
            dataSource={published}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: (page) => setPagination((prev) => ({ ...prev, current: page })),
            }}
            columns={[
              {
                title: "Title",
                dataIndex: "title",
                key: "title",
                render: (title?: string) => title || "-",
              },
              {
                title: "Exam",
                dataIndex: "exam",
                key: "exam",
                render: (exam?: SprintTest["exam"]) => (
                  <Tag color="cyan">{exam?.name || "N/A"}</Tag>
                ),
              },
              { title: "Questions", dataIndex: "totalQuestions", key: "totalQuestions" },
              {
                title: "Duration",
                dataIndex: "durationInMinutes",
                key: "duration",
                render: (minutes: number) => `${minutes} mins`,
              },
              {
                title: "Status",
                dataIndex: "isActive",
                key: "isActive",
                render: (isActive: boolean) => (
                  <Tag color={isActive ? "green" : "red"}>
                    {isActive ? "Active" : "Inactive"}
                  </Tag>
                ),
              },
              {
                title: "Actions",
                key: "actions",
                render: (record: SprintTest) => (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => router.push(`/admin/sprint-tests/${record.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => handleDelete(record.id)}
                    >
                      Delete
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
