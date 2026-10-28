"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import {
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
import { PageLoader } from "@/app/components/PageLoader";
import { questionTagsColumn } from "@/app/components/QuestionTags";
import { AccessModeSwitch } from "@/app/components/AccessModeSwitch";
import { QuestionPreview } from "@/app/admin/full-mock-tests/QuestionPreview";
import { loadTopicNamesForQuestions } from "@/app/admin/full-mock-tests/topic-names";
import type { SafeQuestion } from "@/app/admin/full-mock-tests/types";
import { formatEzPrepError, topicWiseDraftsApi } from "../../api";
import type {
  PublishTopicWiseDraftPayload,
  TopicWiseDraft,
  TopicWiseDraftSettings,
  TopicWiseDraftSubjectBlock,
  TopicWiseQuestionItem,
  TopicWiseSearchQuestion,
} from "../../types";

const primaryButtonClass =
  "!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "green",
  medium: "orange",
  hard: "red",
};

function PublishDraftForm({
  settings,
  publishing,
  onPublish,
  onDiscard,
}: {
  settings: TopicWiseDraftSettings;
  publishing: boolean;
  onPublish: (values: PublishTopicWiseDraftPayload) => void;
  onDiscard: () => void;
}) {
  const [form] = Form.useForm<PublishTopicWiseDraftPayload>();

  return (
    <Card title="Publish">
      <Form
        form={form}
        layout="vertical"
        onFinish={onPublish}
        initialValues={{
          title: settings.title,
          description: settings.description,
          marksPerQuestion: settings.marksPerQuestion,
          negativeMarking: settings.negativeMarking,
          passingScore: settings.passingScore,
          allowRetake: settings.allowRetake,
          shuffleOptions: settings.shuffleOptions,
          showResultsImmediately: settings.showResultsImmediately,
          accessMode: settings.accessMode ?? "FREE",
        }}
      >
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
          <Button danger onClick={onDiscard}>
            Discard
          </Button>
        </Space>
      </Form>
    </Card>
  );
}

export default function TopicWiseDraftPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const publishInFlight = useRef(false);
  const [draft, setDraft] = useState<TopicWiseDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [replaceSlot, setReplaceSlot] = useState<{
    subject: TopicWiseDraftSubjectBlock;
    question: TopicWiseQuestionItem;
  } | null>(null);
  const [replacePagination, setReplacePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [replaceTopics, setReplaceTopics] = useState<
    { value: string; label: string }[]
  >([]);
  const [replaceSearch, setReplaceSearch] = useState("");
  const [replaceTopicId, setReplaceTopicId] = useState<string | undefined>();
  const [replaceResults, setReplaceResults] = useState<TopicWiseSearchQuestion[]>(
    []
  );
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [topicNameById, setTopicNameById] = useState<Map<string, string>>(
    new Map()
  );

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const response = await topicWiseDraftsApi.getDraft(params.id);
      setDraft(response.data);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load draft"));
      router.push("/admin/mock-tests");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    if (!draft) return;
    let cancelled = false;
    void loadTopicNamesForQuestions(draft.subjects).then((names) => {
      if (cancelled) return;
      setTopicNameById((prev) => {
        const next = new Map(prev);
        names.forEach((name, id) => next.set(id, name));
        if (draft.topicId && draft.topicName) {
          next.set(draft.topicId, draft.topicName);
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [draft]);

  const searchReplacementQuestions = useCallback(async () => {
    if (!replaceSlot || !draft) return;
    setReplaceLoading(true);
    try {
      const response = await topicWiseDraftsApi.searchQuestions({
        draftId: params.id,
        search: replaceSearch.trim() || undefined,
        topicId: draft.topicId ? undefined : replaceTopicId,
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
    draft,
    params.id,
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
    subject: TopicWiseDraftSubjectBlock,
    question: TopicWiseQuestionItem
  ) => {
    setReplaceSlot({ subject, question });
    setReplaceSearch("");
    setReplaceTopicId(undefined);
    setReplaceResults([]);
    setReplacePagination((prev) => ({ ...prev, current: 1, total: 0 }));
    if (draft?.topicId) {
      setReplaceTopics([]);
      return;
    }
    try {
      const { data } = await catalogApi.getSubject(subject.subjectId);
      setReplaceTopics(
        (data.topics || []).map((topic) => ({
          value: topic.id,
          label: topic.name,
        }))
      );
      setTopicNameById((prev) => {
        const next = new Map(prev);
        (data.topics || []).forEach((topic) => next.set(topic.id, topic.name));
        return next;
      });
    } catch {
      setReplaceTopics([]);
    }
  };

  const handleReplace = async (questionId: string) => {
    if (!replaceSlot) return;
    setReplacingId(questionId);
    try {
      const response = await topicWiseDraftsApi.replaceQuestion(
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

  const handlePublish = async (values: PublishTopicWiseDraftPayload) => {
    if (publishInFlight.current) return;
    publishInFlight.current = true;
    setPublishing(true);
    try {
      const response = await topicWiseDraftsApi.publishDraft(params.id, {
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
      message.success(response.message || "Mock test published");
      router.push(`/admin/mock-tests/${response.data.mockTestId}`);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to publish draft"));
      publishInFlight.current = false;
      setPublishing(false);
    }
  };

  const handleDiscard = () => {
    showConfirmModal({
      title: "Discard Draft",
      content: "Discard this draft? Nothing is written to published mock tests.",
      onConfirm: async () => {
        try {
          const response = await topicWiseDraftsApi.discardDraft(params.id);
          message.success(response.message || "Draft discarded");
          router.push("/admin/mock-tests");
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
  const mix = settings.difficultyDistribution;

  const questionColumns = (subject: TopicWiseDraftSubjectBlock) => [
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
      render: (record: TopicWiseQuestionItem) =>
        record.questionText?.en?.text?.slice(0, 100) || "Question",
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
      key: "difficulty",
      render: (level?: string) =>
        level ? (
          <Tag color={DIFFICULTY_COLORS[level] || "default"}>{level}</Tag>
        ) : (
          "-"
        ),
    },
    questionTagsColumn(),
    {
      title: "",
      key: "replaced",
      render: (record: TopicWiseQuestionItem) =>
        record.replacedFrom ? <Tag color="gold">Replaced</Tag> : null,
    },
    ...(editable
      ? [
          {
            title: "Actions",
            key: "actions",
            render: (record: TopicWiseQuestionItem) => (
              <Button type="link" onClick={() => openReplace(subject, record)}>
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
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/admin/mock-tests")}
          >
            Back to Mock Tests
          </Button>
          <h1 className="text-2xl font-bold">
            {settings.title || "Topic-wise draft"}
          </h1>
          <Tag color="blue">{draft.status}</Tag>
        </div>

        <Card title="Draft">
          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }}>
            <Descriptions.Item label="Exam">{draft.examName}</Descriptions.Item>
            <Descriptions.Item label="Subject">{draft.subjectName}</Descriptions.Item>
            <Descriptions.Item label="Topic">
              {draft.topicName || "Whole subject"}
            </Descriptions.Item>
            <Descriptions.Item label="Duration">
              {settings.durationInMinutes} mins
            </Descriptions.Item>
            <Descriptions.Item label="Difficulty">
              {mix.easy} easy / {mix.medium} medium / {mix.hard} hard
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {draft.subjects.map((subject) => (
          <Card key={subject.subjectId} title={subject.name}>
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
          <PublishDraftForm
            settings={settings}
            publishing={publishing}
            onPublish={handlePublish}
            onDiscard={handleDiscard}
          />
        ) : null}
      </div>

      <Modal
        title={`Replace question #${
          replaceSlot ? replaceSlot.question.position + 1 : ""
        }`}
        open={!!replaceSlot}
        onCancel={() => setReplaceSlot(null)}
        footer={null}
        width={900}
        destroyOnHidden
      >
        <p className="text-gray-500 mb-4">
          {draft.topicId
            ? "Replacement must stay on this topic and subject."
            : "Replacement must stay on this subject. Topic may differ."}
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
          {draft.topicId ? (
            <Tag color="purple">{draft.topicName || "Topic locked"}</Tag>
          ) : (
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
          )}
        </Space>
        <Table
          size="small"
          rowKey="_id"
          loading={replaceLoading}
          dataSource={replaceResults}
          expandable={{
            expandedRowRender: (record) => (
              <QuestionPreview question={record as SafeQuestion} />
            ),
          }}
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
              render: (record: TopicWiseSearchQuestion) =>
                record.snippet || record.questionText?.en?.text || record._id,
            },
            {
              title: "Topic",
              dataIndex: "topic",
              key: "topic",
              render: (topicId?: string) =>
                topicId ? topicNameById.get(topicId) || topicId : "-",
            },
            questionTagsColumn(),
            {
              title: "",
              key: "use",
              render: (record: TopicWiseSearchQuestion) => (
                <Button
                  type="link"
                  loading={replacingId === record._id}
                  onClick={() => handleReplace(record._id)}
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
