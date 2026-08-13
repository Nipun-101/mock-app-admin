"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
  Spin,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import { formatEzPrepError, fullMockApi } from "../../api";
import { QuestionPreview } from "../../QuestionPreview";
import type {
  DraftQuestionItem,
  DraftResponse,
  DraftSubjectBlock,
  PublishDraftPayload,
  SearchQuestionItem,
} from "../../types";

const { TextArea } = Input;
const primaryButtonClass = "bg-blue-600 hover:bg-blue-700";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "green",
  medium: "orange",
  hard: "red",
};

const STATUS_COLORS: Record<string, string> = {
  REVIEW: "blue",
  PUBLISHED: "green",
  PUBLISHING: "orange",
  GENERATING: "orange",
  DISCARDED: "red",
};

interface TopicOption {
  value: string;
  label: string;
}

export default function FullMockDraftPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [form] = Form.useForm<PublishDraftPayload>();
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const publishInFlight = useRef(false);
  const [topicNameById, setTopicNameById] = useState<Map<string, string>>(
    new Map()
  );

  const [replaceSlot, setReplaceSlot] = useState<{
    subject: DraftSubjectBlock;
    question: DraftQuestionItem;
  } | null>(null);
  const [replaceSearch, setReplaceSearch] = useState("");
  const [replaceTopicId, setReplaceTopicId] = useState<string | undefined>();
  const [replaceDifficulty, setReplaceDifficulty] = useState<
    string | undefined
  >();
  const [replaceTopics, setReplaceTopics] = useState<TopicOption[]>([]);
  const [replaceResults, setReplaceResults] = useState<SearchQuestionItem[]>(
    []
  );
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replacePagination, setReplacePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const isEditable = draft?.status === "REVIEW";

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fullMockApi.getDraft(params.id);
      setDraft(response.data);
      form.setFieldsValue({
        title: response.data.examSnapshot.name,
        allowRetake: true,
        shuffleOptions: false,
        showResultsImmediately: true,
      });
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load draft"));
      router.push("/admin/full-mock-tests");
    } finally {
      setLoading(false);
    }
  }, [form, params.id, router]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    if (!draft) return;

    const loadTopicNames = async () => {
      const names = new Map<string, string>();
      await Promise.all(
        draft.subjects.map(async (block) => {
          try {
            const response = await fetch(
              `/api/topic/subject/${block.subjectId}`
            );
            const data = await response.json();
            (data.topics || []).forEach(
              (topic: { _id: string; name: string }) => {
                names.set(topic._id, topic.name);
              }
            );
          } catch {
            // Topic labels are display-only.
          }
        })
      );
      setTopicNameById(names);
    };

    void loadTopicNames();
  }, [draft]);

  const searchReplacementQuestions = useCallback(async () => {
    if (!replaceSlot) return;
    setReplaceLoading(true);
    try {
      const response = await fullMockApi.searchQuestions({
        subjectId: replaceSlot.subject.subjectId,
        draftId: params.id,
        search: replaceSearch.trim() || undefined,
        topicId: replaceTopicId,
        difficultyLevel: replaceDifficulty,
        page: replacePagination.current,
        limit: replacePagination.pageSize,
      });
      setReplaceResults(response.data || []);
      setReplacePagination((prev) => ({
        ...prev,
        total: response.pagination?.total ?? 0,
      }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to search questions"));
    } finally {
      setReplaceLoading(false);
    }
  }, [
    params.id,
    replaceDifficulty,
    replacePagination.current,
    replacePagination.pageSize,
    replaceSearch,
    replaceSlot,
    replaceTopicId,
  ]);

  useEffect(() => {
    if (replaceSlot) {
      void searchReplacementQuestions();
    }
  }, [replaceSlot, searchReplacementQuestions]);

  const openReplace = async (
    subject: DraftSubjectBlock,
    question: DraftQuestionItem
  ) => {
    setReplaceSlot({ subject, question });
    setReplaceSearch("");
    setReplaceTopicId(undefined);
    setReplaceDifficulty(undefined);
    setReplacePagination((prev) => ({ ...prev, current: 1, total: 0 }));
    setReplaceResults([]);

    try {
      const response = await fetch(`/api/topic/subject/${subject.subjectId}`);
      const data = await response.json();
      setReplaceTopics(
        (data.topics || []).map((topic: { _id: string; name: string }) => ({
          value: topic._id,
          label: topic.name,
        }))
      );
    } catch {
      setReplaceTopics([]);
    }
  };

  const handleReplace = async (questionId: string) => {
    if (!replaceSlot) return;
    setReplacingId(questionId);
    try {
      const response = await fullMockApi.replaceQuestion(
        params.id,
        replaceSlot.question.position,
        questionId
      );
      setDraft(response.data);
      message.success(response.message || "Question replaced");
      setReplaceSlot(null);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to replace question"));
    } finally {
      setReplacingId(null);
    }
  };

  const handlePublish = async (values: PublishDraftPayload) => {
    if (publishInFlight.current) {
      return;
    }
    publishInFlight.current = true;
    setPublishing(true);
    try {
      const payload: PublishDraftPayload = {
        title: values.title?.trim() || undefined,
        description: values.description?.trim() || undefined,
        allowRetake: values.allowRetake,
        shuffleOptions: values.shuffleOptions,
        showResultsImmediately: values.showResultsImmediately,
      };
      if (values.passingScore != null) {
        payload.passingScore = values.passingScore;
      }
      const response = await fullMockApi.publishDraft(params.id, payload);
      message.success(response.message || "Full mock published");
      setDraft(response.data.draft);
      router.push(`/admin/full-mock-tests/${response.data.mockTestId}`);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to publish draft"));
    } finally {
      publishInFlight.current = false;
      setPublishing(false);
    }
  };

  const handleDiscard = () => {
    showConfirmModal({
      title: "Discard Draft",
      content:
        "Discard this draft? Question usage is not incremented. This cannot be undone.",
      onConfirm: async () => {
        try {
          const response = await fullMockApi.discardDraft(params.id);
          message.success(response.message || "Draft discarded");
          router.push("/admin/full-mock-tests");
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to discard draft"));
        }
      },
    });
  };

  const snapshot = draft?.examSnapshot;
  const paperDuration = useMemo(() => {
    if (!draft) return null;
    if (draft.examSnapshot.isSessionWise) {
      const sum = draft.subjects.reduce(
        (total, block) => total + (block.sessionTime || 0),
        0
      );
      return sum ? `${sum} mins (sum of sessions)` : "-";
    }
    return snapshot?.duration != null ? `${snapshot.duration} mins` : "-";
  }, [draft, snapshot?.duration]);

  const questionColumns = (subject: DraftSubjectBlock) => [
    {
      title: "#",
      dataIndex: "position",
      key: "position",
      width: 60,
      render: (position: number) => position + 1,
    },
    {
      title: "Question",
      key: "question",
      render: (record: DraftQuestionItem) => (
        <QuestionPreview question={record} snippetOnly />
      ),
    },
    {
      title: "Topic",
      dataIndex: "topic",
      key: "topic",
      render: (topicId?: string) =>
        topicId ? (
          <Tag color="purple">{topicNameById.get(topicId) || topicId}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Difficulty",
      dataIndex: "difficultyLevel",
      key: "difficultyLevel",
      render: (level?: string) =>
        level ? (
          <Tag color={DIFFICULTY_COLORS[level] || "default"}>{level}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Marks",
      key: "marks",
      render: (record: DraftQuestionItem) =>
        record.negativeMarking
          ? `${record.marksPerQuestion} / -${record.negativeMarking}`
          : record.marksPerQuestion,
    },
    {
      title: "",
      key: "replaced",
      width: 90,
      render: (record: DraftQuestionItem) =>
        record.replacedFrom ? <Tag color="gold">Replaced</Tag> : null,
    },
    ...(isEditable
      ? [
          {
            title: "Actions",
            key: "actions",
            render: (record: DraftQuestionItem) => (
              <Button
                type="link"
                size="small"
                onClick={() => openReplace(subject, record)}
              >
                Replace
              </Button>
            ),
          },
        ]
      : []),
  ];

  const replaceColumns = [
    {
      title: "Question",
      key: "question",
      render: (record: SearchQuestionItem) =>
        record.snippet || <QuestionPreview question={record} snippetOnly />,
    },
    {
      title: "Topic",
      dataIndex: "topic",
      key: "topic",
      render: (topicId?: string) =>
        topicId ? topicNameById.get(topicId) || topicId : "-",
    },
    {
      title: "Difficulty",
      dataIndex: "difficultyLevel",
      key: "difficultyLevel",
      render: (level?: string) =>
        level ? (
          <Tag color={DIFFICULTY_COLORS[level] || "default"}>{level}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: SearchQuestionItem) => (
        <Button
          type="link"
          size="small"
          loading={replacingId === record._id}
          disabled={!!replacingId}
          onClick={() => handleReplace(record._id)}
        >
          Use this
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!draft) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/admin/full-mock-tests")}
          >
            Back to Full Mock Tests
          </Button>
          <h1 className="text-2xl font-bold">
            {snapshot?.name || "Full Mock Draft"}
          </h1>
          <Tag color={STATUS_COLORS[draft.status] || "default"}>
            {draft.status}
          </Tag>
        </div>

        <Card title="Exam Blueprint">
          <Descriptions
            bordered
            column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
          >
            <Descriptions.Item label="Exam">
              {snapshot?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Mode">
              <Tag color={snapshot?.isSessionWise ? "purple" : "blue"}>
                {snapshot?.isSessionWise ? "Session-wise" : "Mixed"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Total Questions">
              {snapshot?.totalQuestions}
            </Descriptions.Item>
            <Descriptions.Item label="Duration">
              {paperDuration}
            </Descriptions.Item>
            <Descriptions.Item label="Total Marks">
              {snapshot?.totalMarks ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {snapshot?.description || "No description"}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {draft.subjects.map((subject) => (
          <Card
            key={subject.subjectId}
            title={
              <Space wrap>
                <span>{subject.name}</span>
                <Tag>{subject.questions.length} questions</Tag>
                <Tag>
                  {subject.marksPerQuestion} mark
                  {subject.marksPerQuestion === 1 ? "" : "s"} / Q
                </Tag>
                {subject.hasNegativeMarking ? (
                  <Tag color="red">-{subject.negativeMarksPerQuestion}</Tag>
                ) : (
                  <Tag>No negative</Tag>
                )}
                {subject.sessionTime != null ? (
                  <Tag color="purple">{subject.sessionTime} min session</Tag>
                ) : null}
              </Space>
            }
          >
            <Table
              columns={questionColumns(subject)}
              dataSource={subject.questions}
              rowKey={(record: DraftQuestionItem) =>
                `${record.position}-${record._id}`
              }
              pagination={false}
              expandable={{
                expandedRowRender: (record) => (
                  <QuestionPreview question={record} />
                ),
              }}
            />
          </Card>
        ))}

        {isEditable ? (
          <Card title="Publish">
            <Form
              form={form}
              layout="vertical"
              onFinish={handlePublish}
              initialValues={{
                allowRetake: true,
                shuffleOptions: false,
                showResultsImmediately: true,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item label="Test Title" name="title">
                  <Input placeholder="Defaults to exam name if empty" />
                </Form.Item>
                <Form.Item label="Passing Score" name="passingScore">
                  <InputNumber min={0} className="w-full" placeholder="Optional" />
                </Form.Item>
              </div>
              <Form.Item label="Description" name="description">
                <TextArea rows={3} placeholder="Optional description" />
              </Form.Item>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Form.Item
                  label="Allow Retake"
                  name="allowRetake"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label="Shuffle Options"
                  name="shuffleOptions"
                  valuePropName="checked"
                >
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
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={publishing}
                  className={primaryButtonClass}
                >
                  Publish Full Mock
                </Button>
                <Button danger onClick={handleDiscard}>
                  Discard Draft
                </Button>
              </Space>
            </Form>
          </Card>
        ) : draft.status === "PUBLISHED" && draft.publishedMockTestId ? (
          <Card>
            <Button
              type="primary"
              className={primaryButtonClass}
              onClick={() =>
                router.push(
                  `/admin/full-mock-tests/${draft.publishedMockTestId}`
                )
              }
            >
              View Published Test
            </Button>
          </Card>
        ) : null}
      </div>

      <Modal
        title={`Replace question #${
          replaceSlot ? replaceSlot.question.position + 1 : ""
        } — ${replaceSlot?.subject.name || ""}`}
        open={!!replaceSlot}
        onCancel={() => setReplaceSlot(null)}
        footer={null}
        width={900}
        destroyOnClose
      >
        <p className="text-gray-500 mb-4">
          Replacement must be the same subject. Topic may differ. Marks and
          position stay with this slot.
        </p>
        <Space wrap className="mb-4">
          <Input.Search
            placeholder="Search question text"
            allowClear
            className="w-64"
            onSearch={(value) => {
              setReplaceSearch(value);
              setReplacePagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Select
            allowClear
            placeholder="Topic"
            className="min-w-[180px]"
            options={replaceTopics}
            value={replaceTopicId}
            onChange={(value) => {
              setReplaceTopicId(value);
              setReplacePagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Select
            allowClear
            placeholder="Difficulty"
            className="min-w-[140px]"
            value={replaceDifficulty}
            onChange={(value) => {
              setReplaceDifficulty(value);
              setReplacePagination((prev) => ({ ...prev, current: 1 }));
            }}
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
          />
        </Space>
        <Table
          columns={replaceColumns}
          dataSource={replaceResults}
          rowKey="_id"
          loading={replaceLoading}
          size="small"
          pagination={{
            current: replacePagination.current,
            pageSize: replacePagination.pageSize,
            total: replacePagination.total,
            onChange: (page, pageSize) => {
              setReplacePagination((prev) => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize,
              }));
            },
          }}
        />
      </Modal>
    </div>
  );
}
