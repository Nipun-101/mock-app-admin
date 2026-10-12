"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import { Select } from "@/app/components/SearchableSelect";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import { catalogApi } from "@/app/services/ezprep-api";
import { formatEzPrepError, sprintTestsApi } from "../../api";
import { PageLoader } from "@/app/components/PageLoader";
import { AccessModeSwitch } from "@/app/components/AccessModeSwitch";
import { QuestionPreview } from "@/app/admin/full-mock-tests/QuestionPreview";
import type { SafeQuestion } from "@/app/admin/full-mock-tests/types";
import type {
  PublishSprintDraftPayload,
  SprintDraft,
  SprintDraftSubjectBlock,
  SprintQuestionItem,
  SprintSearchQuestion,
} from "../../types";

const primaryButtonClass =
  "!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "green",
  medium: "orange",
  hard: "red",
};

export default function SprintDraftPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [form] = Form.useForm();
  const publishInFlight = useRef(false);
  const [draft, setDraft] = useState<SprintDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [replaceSlot, setReplaceSlot] = useState<{
    subject: SprintDraftSubjectBlock;
    question: SprintQuestionItem;
  } | null>(null);
  const [replacePagination, setReplacePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [replaceAllowCrossSubject, setReplaceAllowCrossSubject] = useState(false);
  const [replaceSubjectId, setReplaceSubjectId] = useState<string | undefined>();
  const [replaceSubjects, setReplaceSubjects] = useState<
    { value: string; label: string }[]
  >([]);
  const [replaceTopics, setReplaceTopics] = useState<{ value: string; label: string }[]>(
    []
  );
  const [replaceSearch, setReplaceSearch] = useState("");
  const [replaceTopicId, setReplaceTopicId] = useState<string | undefined>();
  const [replaceDifficulty, setReplaceDifficulty] = useState<string | undefined>();
  const [replaceResults, setReplaceResults] = useState<SprintSearchQuestion[]>([]);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [topicNameById, setTopicNameById] = useState<Map<string, string>>(new Map());

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sprintTestsApi.getDraft(params.id);
      setDraft(response.data);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load draft"));
      router.push("/admin/sprint-tests");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    if (loading || !draft || draft.status !== "REVIEW") return;
    form.setFieldsValue({
      title: draft.settings.title,
      description: draft.settings.description,
      marksPerQuestion: draft.settings.marksPerQuestion,
      negativeMarking: draft.settings.negativeMarking,
      passingScore: draft.settings.passingScore,
      allowRetake: draft.settings.allowRetake,
      shuffleOptions: draft.settings.shuffleOptions,
      showResultsImmediately: draft.settings.showResultsImmediately,
      accessMode: draft.settings.accessMode ?? "FREE",
    });
  }, [draft, form, loading]);

  useEffect(() => {
    if (!draft) return;
    const loadTopics = async () => {
      await Promise.all(
        draft.subjects.map(async (block) => {
          try {
            const { data } = await catalogApi.getSubject(block.subjectId);
            setTopicNameById((prev) => {
              const next = new Map(prev);
              (data.topics || []).forEach((topic) => next.set(topic.id, topic.name));
              return next;
            });
          } catch {
            // Topic labels are display-only.
          }
        })
      );
    };
    void loadTopics();
  }, [draft]);

  const mergeTopicNames = (
    topics: Array<{ id: string; name: string }> | undefined
  ) => {
    if (!topics?.length) return;
    setTopicNameById((prev) => {
      const next = new Map(prev);
      topics.forEach((topic) => next.set(topic.id, topic.name));
      return next;
    });
  };

  const loadTopicsForSubject = async (subjectId: string) => {
    try {
      const { data } = await catalogApi.getSubject(subjectId);
      mergeTopicNames(data.topics);
      setReplaceTopics(
        (data.topics || []).map((topic) => ({
          value: topic.id,
          label: topic.name,
        }))
      );
    } catch {
      setReplaceTopics([]);
    }
  };

  const searchReplacementQuestions = useCallback(async () => {
    if (!replaceSlot) return;
    setReplaceLoading(true);
    try {
      const response = await sprintTestsApi.searchQuestions({
        subjectId: replaceAllowCrossSubject
          ? replaceSubjectId
          : replaceSlot.subject.subjectId,
        draftId: params.id,
        search: replaceSearch.trim() || undefined,
        topicId: replaceTopicId,
        difficultyLevel: replaceDifficulty,
        page: replacePagination.current,
        limit: replacePagination.pageSize,
        allowCrossSubject: replaceAllowCrossSubject || undefined,
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
    replaceAllowCrossSubject,
    replaceDifficulty,
    replacePagination.current,
    replacePagination.pageSize,
    replaceSearch,
    replaceSlot,
    replaceSubjectId,
    replaceTopicId,
  ]);

  useEffect(() => {
    if (replaceSlot) {
      void searchReplacementQuestions();
    }
  }, [replaceSlot, searchReplacementQuestions]);

  const openReplace = async (
    subject: SprintDraftSubjectBlock,
    question: SprintQuestionItem
  ) => {
    setReplaceSlot({ subject, question });
    setReplaceAllowCrossSubject(false);
    setReplaceSubjectId(undefined);
    setReplaceSearch("");
    setReplaceTopicId(undefined);
    setReplaceDifficulty(undefined);
    setReplaceResults([]);
    setReplacePagination((prev) => ({ ...prev, current: 1, total: 0 }));
    await loadTopicsForSubject(subject.subjectId);
  };

  const handleCrossSubjectToggle = async (enabled: boolean) => {
    setReplaceAllowCrossSubject(enabled);
    setReplaceSubjectId(undefined);
    setReplaceTopicId(undefined);
    setReplaceDifficulty(undefined);
    setReplacePagination((prev) => ({ ...prev, current: 1, total: 0 }));
    setReplaceResults([]);

    if (!enabled) {
      if (replaceSlot) {
        await loadTopicsForSubject(replaceSlot.subject.subjectId);
      } else {
        setReplaceTopics([]);
      }
      return;
    }

    setReplaceTopics([]);
    try {
      const response = await catalogApi.listSubjects();
      const subjects = response.data || [];
      setReplaceSubjects(
        subjects.map((subject) => ({
          value: subject.id,
          label: subject.name,
        }))
      );
      subjects.forEach((subject) => mergeTopicNames(subject.topics));
    } catch {
      setReplaceSubjects([]);
    }
  };

  const handleReplace = async (questionId: string) => {
    if (!replaceSlot) return;
    setReplacingId(questionId);
    try {
      const response = await sprintTestsApi.replaceQuestion(
        params.id,
        replaceSlot.question.position,
        questionId,
        { allowCrossSubject: replaceAllowCrossSubject || undefined }
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

  const handlePublish = async (values: PublishSprintDraftPayload) => {
    if (publishInFlight.current) return;
    publishInFlight.current = true;
    setPublishing(true);
    try {
      const response = await sprintTestsApi.publishDraft(params.id, {
        title: values.title?.trim() || undefined,
        description: values.description?.trim() || undefined,
        marksPerQuestion: values.marksPerQuestion,
        negativeMarking: values.negativeMarking,
        passingScore: values.passingScore,
        allowRetake: values.allowRetake,
        shuffleOptions: values.shuffleOptions,
        showResultsImmediately: values.showResultsImmediately,
        accessMode: values.accessMode ?? "FREE",
      });
      message.success(response.message || "Sprint test published");
      router.push(`/admin/sprint-tests/${response.data.mockTestId}`);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to publish draft"));
      publishInFlight.current = false;
      setPublishing(false);
    }
  };

  const handleDiscard = () => {
    showConfirmModal({
      title: "Discard Draft",
      content: "Discard this draft? Question usage is not changed.",
      onConfirm: async () => {
        try {
          const response = await sprintTestsApi.discardDraft(params.id);
          message.success(response.message || "Draft discarded");
          router.push("/admin/sprint-tests");
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to discard draft"));
        }
      },
    });
  };

  if (loading || !draft) {
    return <PageLoader />;
  }

  const editable = draft.status === "REVIEW";
  const settings = draft.settings;

  const questionColumns = (subject: SprintDraftSubjectBlock) => [
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
      render: (record: SprintQuestionItem) =>
        record.questionText?.en?.text?.slice(0, 100) || "Question",
    },
    {
      title: "Topic",
      dataIndex: "topic",
      key: "topic",
      render: (topicId?: string) =>
        topicId ? <Tag color="purple">{topicNameById.get(topicId) || topicId}</Tag> : "-",
    },
    {
      title: "Difficulty",
      dataIndex: "difficultyLevel",
      key: "difficulty",
      render: (level?: string) =>
        level ? <Tag color={DIFFICULTY_COLORS[level] || "default"}>{level}</Tag> : "-",
    },
    {
      title: "",
      key: "replaced",
      render: (record: SprintQuestionItem) =>
        record.replacedFrom ? <Tag color="gold">Replaced</Tag> : null,
    },
    ...(editable
      ? [
          {
            title: "Actions",
            key: "actions",
            render: (record: SprintQuestionItem) => (
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/admin/sprint-tests")}>
            Back
          </Button>
          <h1 className="text-2xl font-bold">{settings.title || draft.examName}</h1>
          <Tag color={editable ? "blue" : "default"}>{draft.status}</Tag>
        </div>

        <Card title="Sprint draft">
          <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
            <Descriptions.Item label="Exam">{draft.examName}</Descriptions.Item>
            <Descriptions.Item label="Questions">{settings.totalQuestions}</Descriptions.Item>
            <Descriptions.Item label="Duration">{settings.durationInMinutes} minutes</Descriptions.Item>
            <Descriptions.Item label="Marks / Q">{settings.marksPerQuestion}</Descriptions.Item>
          </Descriptions>
        </Card>

        {draft.subjects.map((subject) => (
          <Card
            key={subject.subjectId}
            title={
              <Space>
                <span>{subject.name}</span>
                <Tag>{subject.questions.length} questions</Tag>
              </Space>
            }
          >
            <Table
              columns={questionColumns(subject)}
              dataSource={subject.questions}
              rowKey={(record) => `${record.position}-${record._id}`}
              pagination={false}
              expandable={{
                expandedRowRender: (record) => (
                  <QuestionPreview question={record as SafeQuestion} />
                ),
              }}
            />
          </Card>
        ))}

        {editable ? (
          <Card title="Publish">
            <Form form={form} layout="vertical" onFinish={handlePublish}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item label="Test Title" name="title">
                  <Input />
                </Form.Item>
                <Form.Item label="Marks Per Question" name="marksPerQuestion">
                  <InputNumber min={0} className="w-full" />
                </Form.Item>
                <Form.Item label="Negative Marking" name="negativeMarking">
                  <InputNumber min={0} className="w-full" />
                </Form.Item>
                <Form.Item label="Passing Score" name="passingScore">
                  <InputNumber min={0} className="w-full" />
                </Form.Item>
              </div>
              <Form.Item label="Description" name="description">
                <Input.TextArea rows={3} />
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
                <AccessModeSwitch />
              </div>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={publishing}
                  disabled={publishing}
                  className={primaryButtonClass}
                >
                  Publish
                </Button>
                <Button danger onClick={handleDiscard}>
                  Discard
                </Button>
              </Space>
            </Form>
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
        destroyOnHidden
      >
        <p className="text-gray-500 mb-4">
          {replaceAllowCrossSubject
            ? "Choose another subject below. This slot still belongs to the current section."
            : "Replacement must be the same subject. Topic may differ. Marks and position stay with this slot."}
        </p>
        <Form layout="vertical" className="mb-0">
          <Form.Item
            label="Allow a different subject"
            tooltip="The slot keeps its subject, marks, and position. The replacement must still be tagged to this exam."
            className="mb-3"
          >
            <Switch
              aria-label="Allow a different subject"
              checked={replaceAllowCrossSubject}
              checkedChildren="Yes"
              unCheckedChildren="No"
              onChange={(checked) => {
                void handleCrossSubjectToggle(checked);
              }}
            />
          </Form.Item>
        </Form>
        {replaceAllowCrossSubject ? (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="Section stays the same"
            description={`${replaceSlot?.subject.name || "This section"} keeps this slot’s marks. Filter by the other subject (and topic) below, then click Use this.`}
          />
        ) : null}
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
          {replaceAllowCrossSubject ? (
            <Select
              allowClear
              placeholder="Subject"
              className="min-w-[180px]"
              options={replaceSubjects}
              value={replaceSubjectId}
              onChange={(value) => {
                setReplaceSubjectId(value);
                setReplaceTopicId(undefined);
                setReplacePagination((prev) => ({ ...prev, current: 1 }));
                if (value) {
                  void loadTopicsForSubject(value);
                } else {
                  setReplaceTopics([]);
                }
              }}
            />
          ) : null}
          <Select
            allowClear
            placeholder="Topic"
            className="min-w-[180px]"
            options={replaceTopics}
            value={replaceTopicId}
            disabled={replaceAllowCrossSubject && !replaceSubjectId}
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
          size="small"
          rowKey="_id"
          loading={replaceLoading}
          dataSource={replaceResults}
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
          columns={[
            {
              title: "Question",
              key: "question",
              render: (record: SprintSearchQuestion) =>
                record.snippet || record.questionText?.en?.text || record._id,
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
              key: "difficulty",
              render: (level?: string) =>
                level ? (
                  <Tag color={DIFFICULTY_COLORS[level] || "default"}>{level}</Tag>
                ) : (
                  "-"
                ),
            },
            {
              title: "Actions",
              key: "use",
              render: (record: SprintSearchQuestion) => (
                <Button
                  type="link"
                  size="small"
                  loading={replacingId === record._id}
                  disabled={!!replacingId}
                  onClick={() => void handleReplace(record._id)}
                >
                  Use this
                </Button>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
