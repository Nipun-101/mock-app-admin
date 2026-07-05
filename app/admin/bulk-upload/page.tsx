"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Modal, Pagination, Space, Spin, Table, Tag, Tooltip, message } from "antd";
import { ImportOutlined } from "@ant-design/icons";
import Link from "next/link";
import { ezPrepApiClient } from "@/app/services/ezprep-api";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import {
  BulkUpload,
  BulkUploadListResponse,
  BulkUploadProcessingAction,
  BulkUploadStatus,
  BULK_UPLOAD_POLLING_INTERVAL_MS,
  ENRICH_CONFIG,
  EnrichAcceptedResponse,
  ImportQuestionsResponse,
  LookupItem,
  PARSE_PDF_CONFIG,
  ParsePdfAcceptedResponse,
} from "./types";

const PROCESSING_MODAL_CONTENT: Record<
  BulkUploadProcessingAction,
  { title: string; description: string; loadingMessage: string }
> = {
  import: {
    title: "Importing Questions",
    description:
      "Saving enriched questions to the database. Please wait...",
    loadingMessage: "Importing questions, please wait...",
  },
};

const STATUS_COLORS: Record<BulkUploadStatus, string> = {
  uploaded: "blue",
  parsing: "processing",
  parsed: "cyan",
  processing: "orange",
  enriched: "purple",
  completed: "green",
  failed: "red",
};

function formatStatus(status: BulkUploadStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

const primaryButtonClass = "bg-blue-600 hover:bg-blue-700";
const MAX_VISIBLE_EXAMS = 2;

function renderExamTags(
  examIds: string[],
  examMap: Map<string, string>
) {
  if (!examIds?.length) return "-";

  const labels = examIds.map((id) => ({
    id,
    name: examMap.get(id) ?? id,
  }));
  const visible = labels.slice(0, MAX_VISIBLE_EXAMS);
  const hidden = labels.slice(MAX_VISIBLE_EXAMS);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map(({ id, name }) => (
        <Tag key={id} color="blue">
          {name}
        </Tag>
      ))}
      {hidden.length > 0 && (
        <Tooltip title={hidden.map(({ name }) => name).join(", ")}>
          <Tag className="cursor-default">+{hidden.length}</Tag>
        </Tooltip>
      )}
    </div>
  );
}

export default function BulkUploadPage() {
  const [uploads, setUploads] = useState<BulkUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [processingUpload, setProcessingUpload] = useState<{
    id: string;
    filename: string;
    action: BulkUploadProcessingAction;
  } | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [subjects, setSubjects] = useState<LookupItem[]>([]);
  const [topics, setTopics] = useState<LookupItem[]>([]);
  const [exams, setExams] = useState<LookupItem[]>([]);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s._id, s.name])),
    [subjects]
  );
  const topicMap = useMemo(
    () => new Map(topics.map((t) => [t._id, t.name])),
    [topics]
  );
  const examMap = useMemo(
    () => new Map(exams.map((e) => [e._id, e.name])),
    [exams]
  );

  const fetchLookups = useCallback(async () => {
    try {
      const [subjectRes, topicRes, examRes] = await Promise.all([
        fetch(`/api/subject/list?page=1&limit=${Number.MAX_SAFE_INTEGER}`),
        fetch(`/api/topic/list?page=1&limit=${Number.MAX_SAFE_INTEGER}`),
        fetch(`/api/exam/list?page=1&limit=${Number.MAX_SAFE_INTEGER}`),
      ]);

      const [subjectData, topicData, examData] = await Promise.all([
        subjectRes.json(),
        topicRes.json(),
        examRes.json(),
      ]);

      setSubjects(subjectData.subjects ?? []);
      setTopics(topicData.topics ?? []);
      setExams(examData.exams ?? []);
    } catch {
      message.error("Failed to fetch lookup data");
    }
  }, []);

  const fetchUploads = useCallback(
    async (page = 1, limit = pagination.pageSize) => {
      setLoading(true);
      try {
        const response = await ezPrepApiClient.get<BulkUploadListResponse>(
          "/v1/imports/uploads",
          { searchParams: { page, limit } }
        );

        const uploads = response.data?.uploads ?? [];
        const paginationData = response.data?.pagination;

        setUploads(uploads);
        setPagination((prev) => ({
          ...prev,
          current: paginationData?.page ?? page,
          pageSize: paginationData?.limit ?? limit,
          total: paginationData?.total ?? uploads.length,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof EzPrepApiError
            ? error.message
            : "Failed to fetch uploads";
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [pagination.pageSize]
  );

  useEffect(() => {
    fetchLookups();
    fetchUploads(1);
  }, [fetchLookups, fetchUploads]);

  useEffect(() => {
    const hasInProgress = uploads.some(
      (upload) => upload.status === "parsing" || upload.status === "processing"
    );
    if (!hasInProgress) return;

    const interval = setInterval(() => {
      void fetchUploads(pagination.current);
    }, BULK_UPLOAD_POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [uploads, fetchUploads, pagination.current]);

  const handleParse = async (upload: BulkUpload) => {
    setActionLoadingId(upload.id);

    try {
      const response = await ezPrepApiClient.post<ParsePdfAcceptedResponse>(
        `/v1/imports/parse-pdf/${upload.id}`,
        PARSE_PDF_CONFIG
      );

      message.success(
        response.message ||
          "PDF parsing started. The status will update when processing completes."
      );
      await fetchUploads(pagination.current);
    } catch (error) {
      const errorMessage =
        error instanceof EzPrepApiError
          ? error.message
          : "Failed to start PDF parsing";
      message.error(errorMessage);
      await fetchUploads(pagination.current);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEnrich = async (upload: BulkUpload) => {
    setActionLoadingId(upload.id);

    try {
      const response = await ezPrepApiClient.post<EnrichAcceptedResponse>(
        `/v1/imports/enrich/${upload.id}`,
        ENRICH_CONFIG
      );

      message.success(
        response.message ||
          "AI enrichment started. The status will update when processing completes."
      );
      await fetchUploads(pagination.current);
    } catch (error) {
      const errorMessage =
        error instanceof EzPrepApiError
          ? error.message
          : "Failed to start AI enrichment";
      message.error(errorMessage);
      await fetchUploads(pagination.current);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleImport = async (upload: BulkUpload) => {
    setActionLoadingId(upload.id);
    setProcessingUpload({
      id: upload.id,
      filename: upload.filename,
      action: "import",
    });

    const loadingToast = message.loading(
      PROCESSING_MODAL_CONTENT.import.loadingMessage,
      0
    );

    try {
      const response = await ezPrepApiClient.post<ImportQuestionsResponse>(
        `/v1/imports/questions/${upload.id}`
      );

      loadingToast();

      const summary =
        response.data?.summary ||
        response.message ||
        "Questions imported successfully";

      message.success(summary);
      await fetchUploads(pagination.current);
    } catch (error) {
      loadingToast();
      const errorMessage =
        error instanceof EzPrepApiError
          ? error.message
          : "Failed to import questions";
      message.error(errorMessage);
      await fetchUploads(pagination.current);
    } finally {
      setActionLoadingId(null);
      setProcessingUpload(null);
    }
  };

  const renderActionButton = (record: BulkUpload) => {
    const isLoading = actionLoadingId === record.id;

    switch (record.status) {
      case "uploaded":
        return (
          <Button
            type="primary"
            className={primaryButtonClass}
            loading={isLoading}
            onClick={() => handleParse(record)}
          >
            Parse PDF
          </Button>
        );
      case "parsing":
        return (
          <Button
            type="primary"
            className={primaryButtonClass}
            loading={isLoading}
            disabled
          >
            Parsing...
          </Button>
        );
      case "parsed":
        return (
          <Button
            type="primary"
            className={primaryButtonClass}
            loading={isLoading}
            onClick={() => handleEnrich(record)}
          >
            AI Enrich
          </Button>
        );
      case "processing":
        return (
          <Button type="primary" className={primaryButtonClass} disabled>
            Processing...
          </Button>
        );
      case "enriched":
        return (
          <Tooltip title="Import enriched questions to database">
            <Button
              type="primary"
              className={primaryButtonClass}
              loading={isLoading}
              onClick={() => handleImport(record)}
            >
              Add to Question Bank
            </Button>
          </Tooltip>
        );
      case "failed":
        return (
          <Button
            danger
            loading={isLoading}
            onClick={() => handleParse(record)}
          >
            Retry
          </Button>
        );
      case "completed":
      default:
        return null;
    }
  };

  const columns = [
    {
      title: "File Name",
      key: "filename",
      width: "24%",
      ellipsis: true,
      render: (_: unknown, record: BulkUpload) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{record.filename}</div>
          {record.title &&
            record.title !== record.filename &&
            !isUuidLike(record.title) && (
              <div className="text-gray-500 text-sm mt-1 truncate">
                {record.title}
              </div>
            )}
          <div className="text-gray-400 text-xs mt-1">
            {formatFileSize(record.fileSize ?? 0)}
          </div>
        </div>
      ),
    },
    {
      title: "Subject",
      key: "subject",
      width: "15%",
      ellipsis: true,
      render: (_: unknown, record: BulkUpload) =>
        subjectMap.get(record.subjectId) ?? record.subjectId ?? "-",
    },
    {
      title: "Topic",
      key: "topic",
      width: "13%",
      ellipsis: true,
      render: (_: unknown, record: BulkUpload) =>
        record.topicId ? (
          <Tag>{topicMap.get(record.topicId) ?? record.topicId}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Exams",
      key: "exams",
      width: "21%",
      render: (_: unknown, record: BulkUpload) =>
        renderExamTags(record.examIds, examMap),
    },
    {
      title: "Status",
      key: "status",
      width: "12%",
      render: (_: unknown, record: BulkUpload) => (
        <div>
          <Tag color={STATUS_COLORS[record.status] ?? "default"}>
            {formatStatus(record.status)}
          </Tag>
          {record.status === "failed" && record.errorMessage && (
            <Tooltip title={record.errorMessage}>
              <div className="text-red-500 text-xs mt-1 line-clamp-2">
                {record.errorMessage}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: "15%",
      render: (_: unknown, record: BulkUpload) => (
        <Space>{renderActionButton(record)}</Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Bulk Upload</h1>
        <Link href="/admin/bulk-upload/upload">
          <Button type="primary" className={primaryButtonClass}>
            Upload
          </Button>
        </Link>
      </div>

      <Table
        columns={columns}
        dataSource={uploads}
        rowKey="id"
        loading={loading}
        pagination={false}
        tableLayout="fixed"
        style={{ width: "100%" }}
        scroll={{ x: 960 }}
      />

      <div className="mt-4 flex justify-end">
        <Pagination
          current={pagination.current}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onChange={(page) => fetchUploads(page)}
          showSizeChanger
          onShowSizeChange={(_, size) => fetchUploads(1, size)}
          pageSizeOptions={["10", "20", "50"]}
        />
      </div>

      <Modal
        open={!!processingUpload}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
        width={400}
      >
        <div className="flex flex-col items-center py-8 gap-5">
          <Spin size="large" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-medium">
              <ImportOutlined className="text-blue-600" />
              {processingUpload
                ? PROCESSING_MODAL_CONTENT[processingUpload.action].title
                : ""}
            </div>
            <p className="text-gray-600 mt-2 break-all">
              {processingUpload?.filename}
            </p>
            <p className="text-gray-400 text-sm mt-3">
              {processingUpload
                ? PROCESSING_MODAL_CONTENT[processingUpload.action].description
                : ""}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
