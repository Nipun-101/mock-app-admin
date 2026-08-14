"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { useRouter } from "next/navigation";
import { formatEzPrepError, fullMockApi } from "./api";
import type {
  FullMockExamListItem,
  FullMockTestListItem,
} from "./types";

const { Title } = Typography;
const { Search } = Input;
const primaryButtonClass = "bg-blue-600 hover:bg-blue-700";

export default function FullMockTestsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<FullMockExamListItem[]>([]);
  const [examLoading, setExamLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [examSearch, setExamSearch] = useState("");
  const [examPagination, setExamPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [publishedExamId, setPublishedExamId] = useState<string | undefined>();
  const [examOptions, setExamOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [published, setPublished] = useState<FullMockTestListItem[]>([]);
  const [publishedLoading, setPublishedLoading] = useState(false);
  const [publishedPagination, setPublishedPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchExams = useCallback(async () => {
    setExamLoading(true);
    try {
      const response = await fullMockApi.listExams({
        page: examPagination.current,
        limit: examPagination.pageSize,
        search: examSearch.trim() || undefined,
      });
      setExams(response.data || []);
      setExamPagination((prev) => ({
        ...prev,
        total: response.pagination?.total ?? 0,
      }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch exams"));
    } finally {
      setExamLoading(false);
    }
  }, [examPagination.current, examPagination.pageSize, examSearch]);

  const fetchPublished = useCallback(async () => {
    setPublishedLoading(true);
    try {
      const response = await fullMockApi.listPublished({
        examId: publishedExamId,
        page: publishedPagination.current,
        limit: publishedPagination.pageSize,
      });
      setPublished(response.data || []);
      setPublishedPagination((prev) => ({
        ...prev,
        total: response.pagination?.total ?? 0,
      }));
    } catch (error) {
      message.error(
        formatEzPrepError(error, "Failed to fetch published full mocks")
      );
    } finally {
      setPublishedLoading(false);
    }
  }, [
    publishedExamId,
    publishedPagination.current,
    publishedPagination.pageSize,
  ]);

  useEffect(() => {
    void fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    void fetchPublished();
  }, [fetchPublished]);

  const examFilterOptions = Array.from(
    new Map(
      [
        ...examOptions.map((exam) => [exam.value, exam.label] as const),
        ...exams.map((exam) => [exam.id, exam.examName] as const),
        ...published
          .filter((item) => item.exam?.id)
          .map((item) => [item.exam!.id, item.exam!.name] as const),
      ].map((entry) => [entry[0], { value: entry[0], label: entry[1] }])
    ).values()
  );

  const loadExamFilterOptions = async (open: boolean) => {
    if (!open || examOptions.length) return;
    try {
      const response = await fullMockApi.listExams({ page: 1, limit: 100 });
      setExamOptions(
        (response.data || []).map((exam) => ({
          value: exam.id,
          label: exam.examName,
        }))
      );
    } catch {
      // Table rows and published exams still populate the filter.
    }
  };

  const handleGenerate = async (examId: string) => {
    setGeneratingId(examId);
    const hide = message.loading(
      "Generating full mock draft from exam blueprint…",
      0
    );
    try {
      const response = await fullMockApi.createDraft(examId);
      hide();
      message.success(response.message || "Draft generated");
      router.push(`/admin/full-mock-tests/drafts/${response.data.id}`);
    } catch (error) {
      hide();
      message.error(formatEzPrepError(error, "Failed to generate draft"));
    } finally {
      setGeneratingId(null);
    }
  };

  const examColumns = [
    {
      title: "Exam Name",
      dataIndex: "examName",
      key: "examName",
    },
    {
      title: "Duration",
      dataIndex: "duration",
      key: "duration",
      responsive: ["md", "lg", "xl", "xxl"] as Breakpoint[],
      render: (duration?: string) => duration || "-",
    },
    {
      title: "Questions",
      dataIndex: "questions",
      key: "questions",
      render: (value?: number) => value ?? "-",
    },
    {
      title: "Total Marks",
      dataIndex: "totalMarks",
      key: "totalMarks",
      responsive: ["md", "lg", "xl", "xxl"] as Breakpoint[],
      render: (value?: number) => value ?? "-",
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      responsive: ["lg", "xl", "xxl"] as Breakpoint[],
      render: (value?: string) => value || "-",
    },
    {
      title: "Exam Group",
      dataIndex: "examGroup",
      key: "examGroup",
      responsive: ["xl", "xxl"] as Breakpoint[],
      render: (value?: string) => value || "-",
    },
    {
      title: "Subjects",
      dataIndex: "subjects",
      key: "subjects",
      render: (subjects: string[]) =>
        subjects?.length ? subjects.join(", ") : "-",
    },
    {
      title: "Mode",
      dataIndex: "mode",
      key: "mode",
      responsive: ["md", "lg", "xl", "xxl"] as Breakpoint[],
      render: (mode: string) => (
        <Tag color={mode === "Session-wise" ? "purple" : "blue"}>{mode}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: FullMockExamListItem) => (
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          className={primaryButtonClass}
          loading={generatingId === record.id}
          disabled={!!generatingId}
          onClick={() => handleGenerate(record.id)}
        >
          Generate
        </Button>
      ),
    },
  ];

  const publishedColumns = [
    {
      title: "Test Title",
      dataIndex: "title",
      key: "title",
      render: (title?: string) => title || "-",
    },
    {
      title: "Duration",
      dataIndex: "durationInMinutes",
      key: "duration",
      responsive: ["md", "lg", "xl", "xxl"] as Breakpoint[],
      render: (duration: number) => `${duration} mins`,
    },
    {
      title: "Questions",
      dataIndex: "totalQuestions",
      key: "totalQuestions",
    },
    {
      title: "Total Marks",
      dataIndex: "totalMarks",
      key: "totalMarks",
      responsive: ["md", "lg", "xl", "xxl"] as Breakpoint[],
      render: (value?: number) => value ?? "-",
    },
    {
      title: "Exam",
      dataIndex: "exam",
      key: "exam",
      render: (exam: FullMockTestListItem["exam"]) => (
        <Tag color="cyan">{exam?.name || "N/A"}</Tag>
      ),
    },
    {
      title: "Mode",
      dataIndex: "isSessionWise",
      key: "isSessionWise",
      responsive: ["md", "lg", "xl", "xxl"] as Breakpoint[],
      render: (isSessionWise: boolean) => (
        <Tag color={isSessionWise ? "purple" : "blue"}>
          {isSessionWise ? "Session-wise" : "Mixed"}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      responsive: ["lg", "xl", "xxl"] as Breakpoint[],
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: FullMockTestListItem) => (
        <Button
          type="link"
          size="small"
          onClick={() => router.push(`/admin/full-mock-tests/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Title level={2}>Full Mock Tests</Title>

        <Card title="Generate from Exam">
          <p className="text-gray-500 mb-4">
            Pick an exam blueprint. The server samples a full paper to match
            subject quotas, marks, and timers. You review and optionally replace
            questions, then publish. Nothing is written to mock tests until
            publish.
          </p>
          <Search
            placeholder="Search exams"
            allowClear
            className="max-w-sm mb-4"
            onSearch={(value) => {
              setExamSearch(value);
              setExamPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Table
            columns={examColumns}
            dataSource={exams}
            rowKey="id"
            loading={examLoading}
            scroll={{ x: true }}
            pagination={{
              current: examPagination.current,
              pageSize: examPagination.pageSize,
              total: examPagination.total,
              onChange: (page, pageSize) => {
                setExamPagination((prev) => ({
                  ...prev,
                  current: page,
                  pageSize: pageSize || prev.pageSize,
                }));
              },
            }}
          />
        </Card>

        <Card title="Published Full Mocks">
          <Space className="mb-4" wrap>
            <Select
              placeholder="All exams"
              className="min-w-[280px]"
              allowClear
              showSearch
              optionFilterProp="label"
              options={examFilterOptions}
              onOpenChange={loadExamFilterOptions}
              value={publishedExamId}
              onChange={(value) => {
                setPublishedExamId(value);
                setPublishedPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
          </Space>
          <Table
            columns={publishedColumns}
            dataSource={published}
            rowKey="id"
            loading={publishedLoading}
            locale={{
              emptyText: publishedExamId
                ? "No published full mocks for this exam"
                : "No published full mocks yet",
            }}
            pagination={{
              current: publishedPagination.current,
              pageSize: publishedPagination.pageSize,
              total: publishedPagination.total,
              onChange: (page, pageSize) => {
                setPublishedPagination((prev) => ({
                  ...prev,
                  current: page,
                  pageSize: pageSize || prev.pageSize,
                }));
              },
            }}
          />
        </Card>
      </div>
    </div>
  );
}
