"use client";

import { Suspense, useEffect, useState } from "react";
import { Table, Button, Space, message, Pagination, Tag } from "antd";
import { Select } from "@/app/components/SearchableSelect";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import {
  catalogApi,
  formatEzPrepError,
  questionsApi,
  refId,
  refName,
  type Question,
} from "@/app/services/ezprep-api";
import { PageLoader } from "@/app/components/PageLoader";
import { questionsEditHref } from "./questions-list-href";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function QuestionsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [subjects, setSubjects] = useState<{ _id: string; name: string }[]>([]);
  const [exams, setExams] = useState<{ _id: string; name: string }[]>([]);
  const [topics, setTopics] = useState<{ _id: string; name: string }[]>([]);

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(searchParams.get("limit"), 10);
  const selectedSubject = searchParams.get("subjectId");
  const selectedExam = searchParams.get("examId");
  const selectedTopic = searchParams.get("topicId");

  const updateQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value == null || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const fetchSubjects = async () => {
    try {
      const data = await catalogApi.listSubjects();
      setSubjects(
        (data.data || []).map((subject) => ({
          _id: subject.id,
          name: subject.name,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch subjects"));
    }
  };

  const fetchExams = async () => {
    try {
      const examsList = await catalogApi.listAllExams();
      setExams(examsList.map((exam) => ({ _id: exam.id, name: exam.name })));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch exams"));
    }
  };

  const fetchTopicsBySubject = async (subjectId: string) => {
    if (!subjectId) {
      setTopics([]);
      return;
    }
    try {
      const { data } = await catalogApi.getSubject(subjectId);
      setTopics(
        (data.topics || []).map((topic) => ({
          _id: topic.id,
          name: topic.name,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch topics"));
      setTopics([]);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await questionsApi.list({
        page,
        limit: pageSize,
        subjectId: selectedSubject || undefined,
        examId: selectedExam || undefined,
        topicId: selectedTopic || undefined,
      });
      setQuestions(data.data || []);
      setTotal(data.pagination?.total ?? 0);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch questions"));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      void fetchTopicsBySubject(selectedSubject);
    } else {
      setTopics([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    void fetchQuestions();
  }, [page, pageSize, selectedSubject, selectedExam, selectedTopic]);

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: "Delete Question",
      content:
        "Are you sure you want to delete this question? This action cannot be undone.",
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await questionsApi.delete(id);
          await fetchQuestions();
          message.success("Question deleted successfully");
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to delete question"));
        } finally {
          setTableLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      title: "Question",
      key: "question",
      render: (record: Question) => (
        <div>
          <div>
            {record?.questionText?.en?.text &&
            record.questionText.en.text.length > 20
              ? `${record.questionText.en.text.substring(0, 20)}...`
              : record?.questionText?.en?.text}
          </div>
          {record?.questionText?.ml?.text && (
            <div className="text-gray-500 mt-1">
              {record.questionText.ml.text.length > 20
                ? `${record.questionText.ml.text.substring(0, 20)}...`
                : record.questionText.ml.text}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Subject",
      key: "subject",
      render: (record: Question) => refName(record.subject) || "-",
    },
    {
      title: "Difficulty",
      key: "difficultyLevel",
      render: (record: Question) => {
        const colorMap: Record<string, string> = {
          easy: "green",
          medium: "orange",
          hard: "red",
        };
        return record.difficultyLevel ? (
          <Tag color={colorMap[record.difficultyLevel]}>
            {record.difficultyLevel.charAt(0).toUpperCase() +
              record.difficultyLevel.slice(1)}
          </Tag>
        ) : (
          "-"
        );
      },
    },
    {
      title: "Topic",
      key: "topic",
      render: (record: Question) => (
        <>
          {record.topic ? (
            <Tag key={refId(record.topic)}>
              {refName(record.topic) || refId(record.topic)}
            </Tag>
          ) : (
            "-"
          )}
        </>
      ),
    },
    {
      title: "Exams",
      key: "exams",
      render: (record: Question) => (
        <>
          {record.exams?.map((exam) => (
            <Tag key={refId(exam)} color="blue">
              {refName(exam) || refId(exam)}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Question) => (
        <Space>
          <Link href={questionsEditHref(record.id, searchParams)}>
            <Button type="primary" className="bg-blue-600 hover:bg-blue-700">
              Edit
            </Button>
          </Link>
          <Button danger onClick={() => handleDelete(record.id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Questions</h1>
          <Select
            placeholder="Filter by exam"
            allowClear
            style={{ width: 200 }}
            value={selectedExam}
            onChange={(value) => updateQuery({ examId: value, page: 1 })}
            options={
              exams?.length > 0
                ? exams.map((exam) => ({
                    value: exam._id,
                    label: exam.name,
                  }))
                : []
            }
          />
          <Select
            placeholder="Filter by subject"
            allowClear
            style={{ width: 200 }}
            value={selectedSubject}
            onChange={(value) => {
              updateQuery({ subjectId: value, topicId: null, page: 1 });
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
            onChange={(value) => updateQuery({ topicId: value, page: 1 })}
            options={topics.map((topic) => ({
              value: topic._id,
              label: topic.name,
            }))}
          />
        </div>
        <Link href="/admin/questions/new">
          <Button type="primary" className="bg-blue-600 hover:bg-blue-700">
            Add Question
          </Button>
        </Link>
      </div>
      <Table
        columns={columns}
        dataSource={questions}
        rowKey="id"
        loading={tableLoading || loading}
        pagination={false}
      />
      <div className="mt-4 flex justify-end">
        <Pagination
          current={page}
          total={total}
          pageSize={pageSize}
          showSizeChanger
          pageSizeOptions={["10", "20", "50"]}
          onChange={(nextPage, nextPageSize) =>
            updateQuery({ page: nextPage, limit: nextPageSize })
          }
        />
      </div>
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <QuestionsPageContent />
    </Suspense>
  );
}
