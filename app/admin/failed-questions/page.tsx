"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Pagination, Select, Space, Table, Tag, Tooltip, message } from "antd";
import Link from "next/link";
import { ezPrepApiClient } from "@/app/services/ezprep-api";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import {
  FailedQuestion,
  FailedQuestionListResponse,
  LookupItem,
} from "./types";

const STAGE_COLORS: Record<string, string> = {
  llm: "orange",
  validation: "red",
  parse: "volcano",
  import: "magenta",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "green",
  medium: "orange",
  hard: "red",
};

const primaryButtonClass = "bg-blue-600 hover:bg-blue-700";
const MAX_VISIBLE_EXAMS = 2;

function truncate(text: string | null | undefined, max = 20): string {
  if (!text) return "-";
  return text.length > max ? `${text.substring(0, max)}...` : text;
}

function renderExamTags(
  examIds: string[] | undefined,
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

export default function FailedQuestionsPage() {
  const [items, setItems] = useState<FailedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [subjects, setSubjects] = useState<LookupItem[]>([]);
  const [topics, setTopics] = useState<LookupItem[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<LookupItem[]>([]);
  const [exams, setExams] = useState<LookupItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

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

  const fetchFailedQuestions = useCallback(
    async (page = 1, limit = pagination.pageSize) => {
      setLoading(true);
      try {
        const searchParams: Record<string, string | number> = { page, limit };
        if (selectedSubject) searchParams.subject = selectedSubject;
        if (selectedExam) searchParams.exam = selectedExam;
        if (selectedTopic) searchParams.topic = selectedTopic;

        const response = await ezPrepApiClient.get<FailedQuestionListResponse>(
          "/v1/imports/failed-questions",
          { searchParams }
        );

        const listItems = response.data?.items ?? [];
        const paginationData = response.data?.pagination;

        setItems(listItems);
        setPagination((prev) => ({
          ...prev,
          current: paginationData?.page ?? page,
          pageSize: paginationData?.limit ?? limit,
          total: paginationData?.total ?? listItems.length,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof EzPrepApiError
            ? error.message
            : "Failed to fetch failed questions";
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [pagination.pageSize, selectedSubject, selectedExam, selectedTopic]
  );

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    const loadTopicsForSubject = async () => {
      if (!selectedSubject) {
        setFilteredTopics([]);
        setSelectedTopic(null);
        return;
      }
      try {
        const res = await fetch(`/api/topic/subject/${selectedSubject}`);
        const data = await res.json();
        setFilteredTopics(data.topics ?? []);
      } catch {
        message.error("Failed to fetch topics");
        setFilteredTopics([]);
      }
    };
    loadTopicsForSubject();
  }, [selectedSubject]);

  useEffect(() => {
    fetchFailedQuestions(1);
  }, [fetchFailedQuestions]);

  const columns = [
    {
      title: "#",
      dataIndex: "questionNumber",
      key: "questionNumber",
      width: 60,
    },
    {
      title: "Question",
      key: "question",
      render: (_: unknown, record: FailedQuestion) => {
        const draft = record.questionDraft;
        return (
          <div>
            <div>{truncate(draft?.questionText?.en?.text)}</div>
            {draft?.questionText?.ml?.text && (
              <div className="text-gray-500 mt-1">
                {truncate(draft.questionText.ml.text)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Stage",
      key: "failureStage",
      render: (_: unknown, record: FailedQuestion) => (
        <Tag color={STAGE_COLORS[record.failureStage] ?? "default"}>
          {record.failureStage}
        </Tag>
      ),
    },
    {
      title: "Failure",
      key: "failureMessage",
      render: (_: unknown, record: FailedQuestion) => (
        <Tooltip title={record.failureMessage}>
          <span className="text-red-600">{truncate(record.failureMessage, 40)}</span>
        </Tooltip>
      ),
    },
    {
      title: "Subject",
      key: "subject",
      render: (_: unknown, record: FailedQuestion) =>
        subjectMap.get(record.questionDraft?.subject) ?? "-",
    },
    {
      title: "Difficulty",
      key: "difficultyLevel",
      render: (_: unknown, record: FailedQuestion) => {
        const level = record.questionDraft?.difficultyLevel;
        if (!level) return "-";
        return (
          <Tag color={DIFFICULTY_COLORS[level] ?? "default"}>
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </Tag>
        );
      },
    },
    {
      title: "Topic",
      key: "topic",
      render: (_: unknown, record: FailedQuestion) => {
        const topicId = record.questionDraft?.topic;
        if (!topicId) return "-";
        const name = topicMap.get(topicId);
        return name ? <Tag>{name}</Tag> : "-";
      },
    },
    {
      title: "Exams",
      key: "exams",
      render: (_: unknown, record: FailedQuestion) =>
        renderExamTags(record.questionDraft?.exams, examMap),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: FailedQuestion) => (
        <Space>
          <Link href={`/admin/failed-questions/${record.id}`}>
            <Button type="primary" className={primaryButtonClass}>
              Fix
            </Button>
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Failed Questions</h1>
          <Select
            placeholder="Filter by exam"
            allowClear
            style={{ width: 200 }}
            value={selectedExam}
            onChange={(value) => setSelectedExam(value ?? null)}
            options={exams.map((exam) => ({
              value: exam._id,
              label: exam.name,
            }))}
          />
          <Select
            placeholder="Filter by subject"
            allowClear
            style={{ width: 200 }}
            value={selectedSubject}
            onChange={(value) => {
              setSelectedSubject(value ?? null);
              setSelectedTopic(null);
            }}
            options={subjects.map((subject) => ({
              value: subject._id,
              label: subject.name,
            }))}
          />
          <Select
            placeholder="Filter by topic"
            allowClear
            disabled={!selectedSubject}
            style={{ width: 200 }}
            value={selectedTopic}
            onChange={(value) => setSelectedTopic(value ?? null)}
            options={filteredTopics.map((topic) => ({
              value: topic._id,
              label: topic.name,
            }))}
          />
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ x: true }}
      />
      <div className="mt-4 flex justify-end">
        <Pagination
          current={pagination.current}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onChange={(page) => fetchFailedQuestions(page)}
        />
      </div>
    </div>
  );
}
