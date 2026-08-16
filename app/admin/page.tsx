"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Col, Modal, Row, Table, Typography, message } from "antd";
import {
  BookOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  FormOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  TagOutlined,
  TagsOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  adminDashboardApi,
  formatEzPrepError,
  type AdminDashboardSummary,
} from "@/app/services/ezprep-api";
import { PageLoader } from "@/app/components/PageLoader";

type MetricKey =
  | "users"
  | "questions"
  | "failed-questions"
  | "mock-tests"
  | "full-mock-tests"
  | "attempts"
  | "exams"
  | "subjects"
  | "topics"
  | "tags";

type DashboardCard = {
  key: MetricKey;
  label: string;
  countKey: keyof AdminDashboardSummary;
  description: string;
  icon: ReactNode;
  accent: string;
  tint: string;
  shadow: string;
};

const USAGE_CARDS: DashboardCard[] = [
  {
    key: "users",
    label: "Active learners",
    countKey: "activeLearners",
    description: "Signed-up students who can take tests right now.",
    icon: <TeamOutlined />,
    accent: "#1677ff",
    tint: "linear-gradient(180deg, #e6f4ff 0%, #ffffff 72%)",
    shadow: "0 10px 24px rgba(22, 119, 255, 0.16)",
  },
  {
    key: "questions",
    label: "Active questions",
    countKey: "activeQuestions",
    description: "Live bank items available to papers and attempts.",
    icon: <QuestionCircleOutlined />,
    accent: "#722ed1",
    tint: "linear-gradient(180deg, #f9f0ff 0%, #ffffff 72%)",
    shadow: "0 10px 24px rgba(114, 46, 209, 0.16)",
  },
  {
    key: "failed-questions",
    label: "Failed questions",
    countKey: "failedQuestions",
    description: "Import rows that still need a fix before they can go live.",
    icon: <CloseCircleOutlined />,
    accent: "#f5222d",
    tint: "linear-gradient(180deg, #fff1f0 0%, #ffffff 72%)",
    shadow: "0 10px 24px rgba(245, 34, 45, 0.16)",
  },
  {
    key: "mock-tests",
    label: "Mock tests",
    countKey: "mockTests",
    description: "Topic-wise papers grouped for practice by exam.",
    icon: <ExperimentOutlined />,
    accent: "#13c2c2",
    tint: "linear-gradient(180deg, #e6fffb 0%, #ffffff 72%)",
    shadow: "0 10px 24px rgba(19, 194, 194, 0.16)",
  },
  {
    key: "full-mock-tests",
    label: "Full mock tests",
    countKey: "fullMockTests",
    description: "Published full-exam papers plus draft pipeline status.",
    icon: <FileProtectOutlined />,
    accent: "#fa8c16",
    tint: "linear-gradient(180deg, #fff7e6 0%, #ffffff 72%)",
    shadow: "0 10px 24px rgba(250, 140, 22, 0.16)",
  },
  {
    key: "attempts",
    label: "Attempts",
    countKey: "attempts",
    description: "All student sittings, including in-progress and completed.",
    icon: <PlayCircleOutlined />,
    accent: "#52c41a",
    tint: "linear-gradient(180deg, #f6ffed 0%, #ffffff 72%)",
    shadow: "0 10px 24px rgba(82, 196, 26, 0.16)",
  },
];

const CATALOG_CARDS: DashboardCard[] = [
  {
    key: "exams",
    label: "Exams",
    countKey: "exams",
    description: "Active exams that papers and attempts can attach to.",
    icon: <FormOutlined />,
    accent: "#2f54eb",
    tint: "linear-gradient(180deg, #f0f5ff 0%, #ffffff 72%)",
    shadow: "0 10px 24px rgba(47, 84, 235, 0.16)",
  },
  {
    key: "subjects",
    label: "Subjects",
    countKey: "subjects",
    description: "Subject catalog with how many topics sit under each.",
    icon: <BookOutlined />,
    accent: "#08979c",
    tint: "linear-gradient(180deg, #e6fffb 0%, #ffffff 72%)",
    shadow: "0 10px 24px rgba(8, 151, 156, 0.16)",
  },
  {
    key: "topics",
    label: "Topics",
    countKey: "topics",
    description: "Topic inventory grouped under their parent subjects.",
    icon: <TagOutlined />,
    accent: "#eb2f96",
    tint: "linear-gradient(180deg, #fff0f6 0%, #ffffff 72%)",
    shadow: "0 10px 24px rgba(235, 47, 150, 0.16)",
  },
  {
    key: "tags",
    label: "Tags",
    countKey: "tags",
    description: "Question tags used to label items by subject and topic.",
    icon: <TagsOutlined />,
    accent: "#d48806",
    tint: "linear-gradient(180deg, #fffbe6 0%, #ffffff 72%)",
    shadow: "0 10px 24px rgba(212, 136, 6, 0.16)",
  },
];

const DETAIL_FETCHERS: Record<MetricKey, () => Promise<{ data: unknown }>> = {
  users: () => adminDashboardApi.getUsers(),
  questions: () => adminDashboardApi.getQuestions(),
  "failed-questions": () => adminDashboardApi.getFailedQuestions(),
  "mock-tests": () => adminDashboardApi.getMockTests(),
  "full-mock-tests": () => adminDashboardApi.getFullMockTests(),
  attempts: () => adminDashboardApi.getAttempts(),
  exams: () => adminDashboardApi.getExams(),
  subjects: () => adminDashboardApi.getSubjects(),
  topics: () => adminDashboardApi.getTopics(),
  tags: () => adminDashboardApi.getTags(),
};

function namedColumns(nameTitle: string) {
  return [
    { title: nameTitle, dataIndex: "name", key: "name" },
    { title: "Count", dataIndex: "count", key: "count", width: 100 },
  ];
}

function DetailTables({ metric, data }: { metric: MetricKey; data: unknown }) {
  const row = data as Record<string, unknown>;

  if (metric === "users") {
    return (
      <>
        <Table
          size="small"
          pagination={false}
          rowKey="label"
          dataSource={[
            { label: "Total learners", count: row.totalLearners },
            { label: "Active", count: row.activeLearners },
            { label: "Inactive", count: row.inactiveLearners },
            { label: "New (7 days)", count: row.newLast7Days },
            { label: "New (30 days)", count: row.newLast30Days },
          ]}
          columns={[
            { title: "Metric", dataIndex: "label", key: "label" },
            { title: "Count", dataIndex: "count", key: "count" },
          ]}
          className="mb-4"
        />
        <Typography.Title level={5}>By plan</Typography.Title>
        <Table
          size="small"
          pagination={false}
          rowKey="plan"
          dataSource={(row.byPlan as Array<{ plan: string; count: number }>) || []}
          columns={[
            { title: "Plan", dataIndex: "plan", key: "plan" },
            { title: "Count", dataIndex: "count", key: "count" },
          ]}
        />
      </>
    );
  }

  if (metric === "questions") {
    return (
      <>
        <Table
          size="small"
          pagination={false}
          rowKey="difficulty"
          className="mb-4"
          dataSource={
            (row.byDifficulty as Array<{ difficulty: string; count: number }>) ||
            []
          }
          columns={[
            { title: "Difficulty", dataIndex: "difficulty", key: "difficulty" },
            { title: "Count", dataIndex: "count", key: "count" },
          ]}
        />
        <Table
          size="small"
          pagination={false}
          rowKey={(item) => `${item.subjectId}-${item.topicId || item.topicName}`}
          dataSource={
            (row.bySubjectAndTopic as Array<{
              subjectId: string;
              subjectName: string;
              topicId?: string;
              topicName: string;
              count: number;
            }>) || []
          }
          columns={[
            { title: "Subject", dataIndex: "subjectName", key: "subjectName" },
            { title: "Topic", dataIndex: "topicName", key: "topicName" },
            { title: "Count", dataIndex: "count", key: "count", width: 100 },
          ]}
        />
      </>
    );
  }

  if (metric === "failed-questions") {
    return (
      <>
        <Table
          size="small"
          pagination={false}
          rowKey="name"
          className="mb-4"
          dataSource={(row.byStage as Array<{ name: string; count: number }>) || []}
          columns={namedColumns("Failure stage")}
        />
        <Table
          size="small"
          pagination={false}
          rowKey={(item) => item.id || item.name}
          dataSource={(row.bySubject as Array<{ id?: string; name: string; count: number }>) || []}
          columns={namedColumns("Subject")}
        />
      </>
    );
  }

  if (metric === "mock-tests") {
    return (
      <Table
        size="small"
        pagination={false}
        rowKey={(item) => item.id || item.name}
        dataSource={(row.byExam as Array<{ id?: string; name: string; count: number }>) || []}
        columns={namedColumns("Exam")}
      />
    );
  }

  if (metric === "full-mock-tests") {
    return (
      <>
        <Table
          size="small"
          pagination={false}
          rowKey={(item) => item.id || item.name}
          className="mb-4"
          dataSource={(row.byExam as Array<{ id?: string; name: string; count: number }>) || []}
          columns={namedColumns("Exam")}
        />
        <Typography.Title level={5}>Drafts by status</Typography.Title>
        <Table
          size="small"
          pagination={false}
          rowKey="name"
          dataSource={(row.draftsByStatus as Array<{ name: string; count: number }>) || []}
          columns={namedColumns("Status")}
        />
      </>
    );
  }

  if (metric === "attempts") {
    return (
      <Table
        size="small"
        pagination={false}
        scroll={{ x: true }}
        rowKey={(item) => item.examId || item.examName}
        dataSource={
          (row.byExam as Array<{
            examId?: string;
            examName: string;
            attempts: number;
            uniqueUsers: number;
            submitted: number;
            expired: number;
            inProgress: number;
            timeConsumedLabel: string;
            allottedMinutes: number;
          }>) || []
        }
        columns={[
          { title: "Exam", dataIndex: "examName", key: "examName" },
          { title: "Attempts", dataIndex: "attempts", key: "attempts" },
          { title: "Unique users", dataIndex: "uniqueUsers", key: "uniqueUsers" },
          { title: "Submitted", dataIndex: "submitted", key: "submitted" },
          { title: "Expired", dataIndex: "expired", key: "expired" },
          { title: "In progress", dataIndex: "inProgress", key: "inProgress" },
          { title: "Time used", dataIndex: "timeConsumedLabel", key: "timeConsumedLabel" },
          { title: "Allotted (min)", dataIndex: "allottedMinutes", key: "allottedMinutes" },
        ]}
      />
    );
  }

  if (metric === "exams") {
    return (
      <Table
        size="small"
        pagination={false}
        rowKey={(item) => item.id || item.name}
        dataSource={(row.byCategory as Array<{ id?: string; name: string; count: number }>) || []}
        columns={namedColumns("Category")}
      />
    );
  }

  if (metric === "subjects") {
    return (
      <Table
        size="small"
        pagination={false}
        rowKey="id"
        dataSource={
          (row.rows as Array<{
            id: string;
            name: string;
            topicCount: number;
            isActive: boolean;
          }>) || []
        }
        columns={[
          { title: "Subject", dataIndex: "name", key: "name" },
          { title: "Topics", dataIndex: "topicCount", key: "topicCount" },
          {
            title: "Active",
            dataIndex: "isActive",
            key: "isActive",
            render: (value: boolean) => (value ? "Yes" : "No"),
          },
        ]}
      />
    );
  }

  if (metric === "topics") {
    return (
      <Table
        size="small"
        pagination={false}
        rowKey="id"
        dataSource={
          (row.rows as Array<{
            id: string;
            name: string;
            subjectName: string;
          }>) || []
        }
        columns={[
          { title: "Topic", dataIndex: "name", key: "name" },
          { title: "Subject", dataIndex: "subjectName", key: "subjectName" },
        ]}
      />
    );
  }

  return (
    <Table
      size="small"
      pagination={false}
      rowKey="id"
      dataSource={
        (row.rows as Array<{
          id: string;
          name: string;
          subjectName: string;
          topicName?: string;
        }>) || []
      }
      columns={[
        { title: "Tag", dataIndex: "name", key: "name" },
        { title: "Subject", dataIndex: "subjectName", key: "subjectName" },
        { title: "Topic", dataIndex: "topicName", key: "topicName" },
      ]}
    />
  );
}

function MetricCardGrid({
  cards,
  summary,
  onOpen,
}: {
  cards: DashboardCard[];
  summary: AdminDashboardSummary;
  onOpen: (key: MetricKey) => void;
}) {
  return (
    <Row gutter={[16, 16]}>
      {cards.map((card) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={card.key}>
          <button
            type="button"
            onClick={() => onOpen(card.key)}
            className="group w-full text-left rounded-2xl border-0 p-0 cursor-pointer transition-transform duration-200 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: card.accent }}
          >
            <div
              className="h-full min-h-[168px] rounded-2xl px-5 py-4 border border-solid"
              style={{
                background: card.tint,
                borderColor: `${card.accent}33`,
                borderTopWidth: 4,
                borderTopColor: card.accent,
                boxShadow: card.shadow,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{
                    color: card.accent,
                    background: `${card.accent}18`,
                  }}
                >
                  {card.icon}
                </span>
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-500">
                  View details
                </span>
              </div>
              <p className="mt-3 mb-0 text-sm font-medium text-slate-600">
                {card.label}
              </p>
              <p
                className="mt-1 mb-2 text-3xl font-semibold leading-none"
                style={{ color: card.accent }}
              >
                {summary[card.countKey].toLocaleString()}
              </p>
              <p className="mb-0 text-xs leading-5 text-slate-500">
                {card.description}
              </p>
            </div>
          </button>
        </Col>
      ))}
    </Row>
  );
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
  const [detailCache, setDetailCache] = useState<Partial<Record<MetricKey, unknown>>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await adminDashboardApi.getSummary();
        if (!cancelled) {
          setSummary(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          message.error(formatEzPrepError(error, "Failed to load dashboard"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openMetric = async (key: MetricKey) => {
    setActiveMetric(key);
    if (detailCache[key]) {
      return;
    }
    setDetailLoading(true);
    try {
      const response = await DETAIL_FETCHERS[key]();
      setDetailCache((current) => ({ ...current, [key]: response.data }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load details"));
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading || !summary) {
    return <PageLoader />;
  }

  const modalTitle =
    [...USAGE_CARDS, ...CATALOG_CARDS].find((card) => card.key === activeMetric)
      ?.label || "Details";

  return (
    <div>
      <Typography.Title level={3} className="!mb-1">
        Dashboard
      </Typography.Title>
      <Typography.Paragraph type="secondary" className="!mb-6">
        Snapshot of learners, content, and papers. Click a card for the breakdown.
      </Typography.Paragraph>
      <MetricCardGrid cards={USAGE_CARDS} summary={summary} onOpen={openMetric} />
      <Typography.Title level={4} className="!mt-10 !mb-1">
        Catalog
      </Typography.Title>
      <Typography.Paragraph type="secondary" className="!mb-6">
        Active exams, subjects, topics, and tags that questions attach to.
      </Typography.Paragraph>
      <MetricCardGrid cards={CATALOG_CARDS} summary={summary} onOpen={openMetric} />
      <Modal
        open={activeMetric !== null}
        title={modalTitle}
        footer={null}
        width={900}
        onCancel={() => setActiveMetric(null)}
      >
        {detailLoading || !activeMetric || detailCache[activeMetric] == null ? (
          <PageLoader />
        ) : (
          <DetailTables metric={activeMetric} data={detailCache[activeMetric]} />
        )}
      </Modal>
    </div>
  );
}
