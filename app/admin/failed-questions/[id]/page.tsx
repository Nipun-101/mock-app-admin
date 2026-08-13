"use client";

import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Tooltip,
  message,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/app/components/ImageUpload";
import { showConfirmModal } from "@/components/ConfirmModal";
import {
  catalogApi,
  ezPrepApiClient,
  formatEzPrepError,
  refId,
} from "@/app/services/ezprep-api";
import {
  DeleteFailedQuestionResponse,
  FailedQuestionDetailResponse,
  ImportFailedQuestionResponse,
  ImportQuestion,
} from "../types";
import {
  FixFormValues,
  FixOptionSlot,
  isFixFormValid,
  normalizeFailedQuestionForm,
  toImageMetadata,
} from "../form";

export default function FixFailedQuestionPage({
  params,
}: {
  params: { id: string };
}) {
  const [form] = Form.useForm<FixFormValues>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [failedQuestion, setFailedQuestion] = useState<
    FailedQuestionDetailResponse["data"] | null
  >(null);
  const [subjects, setSubjects] = useState<{ value: string; label: string }[]>(
    []
  );
  const [topics, setTopics] = useState<{ value: string; label: string }[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [exams, setExams] = useState<{ value: string; label: string }[]>([]);
  const [tags, setTags] = useState<{ value: string; label: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [OPTIONS, setOPTIONS] = useState<FixOptionSlot[]>([]);
  const [originalDraft, setOriginalDraft] = useState<ImportQuestion | null>(
    null
  );

  const watchedValues = Form.useWatch([], form);
  const canFix = useMemo(
    () => isFixFormValid(watchedValues, OPTIONS),
    [watchedValues, OPTIONS]
  );

  const fetchTopicsBySubject = async (subjectId: string) => {
    setTopicsLoading(true);
    try {
      const { data } = await catalogApi.getSubject(subjectId);
      setTopics(
        (data.topics || [])
          .map((topic) => ({
            value: refId(topic) || "",
            label: topic.name,
          }))
          .filter((topic) => topic.value)
      );
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch topics"));
      setTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  };

  const fetchTagsBySubjectAndTopic = async (
    subjectId: string,
    topicId: string
  ) => {
    try {
      const tags = await catalogApi.listAllTags({
        subjectId,
        topicId,
      });
      setTags(
        tags.map((tag) => ({
          value: tag.id,
          label: tag.name,
        }))
      );
    } catch {
      setTags([]);
    }
  };

  const populateForm = async (draft?: Partial<ImportQuestion> | null) => {
    const { options, values } = normalizeFailedQuestionForm(draft);
    setOPTIONS(options);
    setOriginalDraft((draft as ImportQuestion) ?? null);

    if (values.subject) {
      setSelectedSubject(values.subject);
      await fetchTopicsBySubject(values.subject);
    } else {
      setSelectedSubject(null);
      setTopics([]);
    }

    if (values.subject && values.topic) {
      setSelectedTopic(values.topic);
      await fetchTagsBySubjectAndTopic(values.subject, values.topic);
    } else {
      setSelectedTopic(null);
      setTags([]);
    }

    form.setFieldsValue(values as never);
  };

  useEffect(() => {
    const fetchData = async () => {
      setPageLoading(true);
      try {
        const [subjectsData, examsData, questionRes] = await Promise.all([
          catalogApi.listSubjects(),
          catalogApi.listAllExams(),
          ezPrepApiClient.get<FailedQuestionDetailResponse>(
            `/v1/imports/failed-questions/${params.id}`
          ),
        ]);

        setSubjects(
          (subjectsData.data || []).map((subject) => ({
            value: subject.id,
            label: subject.name,
          }))
        );
        setExams(
          examsData.map((exam) => ({
            value: exam.id,
            label: exam.name,
          }))
        );

        const item = questionRes.data;
        setFailedQuestion(item);
        await populateForm(item.question || item.questionDraft);
      } catch (error) {
        message.error(
          formatEzPrepError(error, "Failed to fetch failed question")
        );
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setSelectedTopic(null);
    form.setFieldValue("topic", undefined);
    form.setFieldValue("tag", undefined);
    setTags([]);
    fetchTopicsBySubject(value);
  };

  const handleTopicChange = (value: string) => {
    setSelectedTopic(value);
    form.setFieldValue("tag", undefined);
    if (selectedSubject && value) {
      fetchTagsBySubjectAndTopic(selectedSubject, value);
    } else {
      setTags([]);
    }
  };

  const handleDelete = () => {
    const questionNumber = failedQuestion?.questionNumber;

    showConfirmModal({
      title: "Delete Failed Question",
      content: questionNumber
        ? `Are you sure you want to delete question #${questionNumber}? This action cannot be undone.`
        : "Are you sure you want to delete this failed question? This action cannot be undone.",
      onConfirm: async () => {
        setDeleting(true);
        try {
          const response =
            await ezPrepApiClient.delete<DeleteFailedQuestionResponse>(
              `/v1/imports/failed-questions/${params.id}`
            );
          message.success(
            response.message || "Failed question deleted successfully"
          );
          router.push("/admin/failed-questions");
        } catch (error) {
          message.error(
            formatEzPrepError(error, "Failed to delete failed question")
          );
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const handleSubmit = async (values: FixFormValues) => {
    if (!isFixFormValid(values, OPTIONS)) {
      message.error("Please complete all required fields before importing");
      return;
    }

    setLoading(true);
    try {
      const questionPayload: ImportQuestion = {
        questionText: {
          en: {
            text: values.questionText?.en?.text || null,
            image: toImageMetadata(values.questionText?.en?.image),
          },
          ml: {
            text: null,
            image: null,
          },
        },
        optionType: values.optionType,
        options: OPTIONS.map((option, index) => {
          const type = values.optionType || "text";
          const formOption = values.options?.[index];
          return {
            id: option.id,
            type,
            ...(type === "text"
              ? {
                  en: formOption?.en || null,
                  ml: null,
                }
              : {
                  image: toImageMetadata(formOption?.image),
                }),
          };
        }),
        explanation: {
          en: values.explanation?.en || null,
          ml: null,
          image: toImageMetadata(values.explanation?.image),
        },
        correctAnswer: values.correctAnswer as string,
        subject: values.subject as string,
        topic: values.topic as string,
        exams: values.exams || [],
        tag: values.tag || null,
        difficultyLevel: values.difficultyLevel as string,
        isActive: originalDraft?.isActive ?? true,
        isDeleted: originalDraft?.isDeleted ?? false,
        source: originalDraft?.source ?? "PDF_UPLOAD",
      };

      const response = await ezPrepApiClient.post<ImportFailedQuestionResponse>(
        `/v1/imports/failed-questions/${params.id}/import`,
        { question: questionPayload }
      );

      message.success(response.message || "Question imported successfully");
      router.push("/admin/failed-questions");
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to import question"));
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {failedQuestion && (
          <Alert
            type="error"
            showIcon
            message={`Failed at stage: ${failedQuestion.failureStage}`}
            description={
              <div className="space-y-2">
                <p>{failedQuestion.failureMessage}</p>
                {failedQuestion.matchedQuestion?.question && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <p className="font-medium">Matched source text:</p>
                    <p className="whitespace-pre-wrap mt-1">
                      {failedQuestion.matchedQuestion.question}
                    </p>
                  </div>
                )}
              </div>
            }
          />
        )}

        <Card title="Fix Question">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={normalizeFailedQuestionForm(null).values}
          >
            <Form.Item label="Question (English)">
              <Form.Item
                name={["questionText", "en", "text"]}
                rules={[
                  {
                    validator: async (_, value) => {
                      const image = form.getFieldValue([
                        "questionText",
                        "en",
                        "image",
                      ]);
                      if (!value?.trim() && !image?.key) {
                        throw new Error(
                          "Please enter the question in English or upload an image"
                        );
                      }
                    },
                  },
                ]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Enter question text in English"
                />
              </Form.Item>
              <ImageUpload name={["questionText", "en", "image"]} />
            </Form.Item>

            <Form.Item label="Question (Malayalam)">
              <Form.Item name={["questionText", "ml", "text"]}>
                <Input.TextArea
                  rows={4}
                  placeholder="Enter question text in Malayalam"
                />
              </Form.Item>
              <ImageUpload name={["questionText", "ml", "image"]} />
            </Form.Item>

            <Form.Item
              label={
                <>
                  Options Type
                  <Tooltip
                    title="Switching between text/image will reset the options entered"
                    placement="top"
                  >
                    <InfoCircleOutlined className="ml-2" />
                  </Tooltip>
                </>
              }
              name="optionType"
              rules={[{ required: true, message: "Please select options type" }]}
            >
              <Radio.Group
                onChange={(e) => {
                  if (e.target.value === "image") {
                    OPTIONS.forEach((_, i) => {
                      form.setFieldValue(["options", i, "en"], undefined);
                      form.setFieldValue(["options", i, "ml"], undefined);
                    });
                  }
                  if (e.target.value === "text") {
                    OPTIONS.forEach((_, i) => {
                      form.setFieldValue(["options", i, "image"], undefined);
                    });
                  }
                }}
              >
                <Radio value="text">Text</Radio>
                <Radio value="image">Image</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="Options">
              {OPTIONS.map((option, index) => (
                <div key={option.id} className="mb-4 border p-4 rounded">
                  <Form.Item label={`Option ${option.label}`}>
                    <Form.Item
                      name={["options", index, "id"]}
                      initialValue={option.id}
                      hidden
                    >
                      <Input type="hidden" />
                    </Form.Item>

                    <Form.Item
                      noStyle
                      shouldUpdate={(prevValues, currentValues) =>
                        prevValues?.optionType !== currentValues?.optionType
                      }
                    >
                      {({ getFieldValue }) => {
                        const type = getFieldValue("optionType");

                        if (type === "image") {
                          return (
                            <ImageUpload name={["options", index, "image"]} />
                          );
                        }

                        return (
                          <>
                            <Form.Item
                              name={["options", index, "en"]}
                              rules={[
                                {
                                  required: true,
                                  message: `Please enter option ${option.label} in English`,
                                },
                              ]}
                            >
                              <Input
                                placeholder={`Option ${option.label} in English`}
                              />
                            </Form.Item>
                            <Form.Item name={["options", index, "ml"]}>
                              <Input
                                placeholder={`Option ${option.label} in Malayalam`}
                              />
                            </Form.Item>
                          </>
                        );
                      }}
                    </Form.Item>
                  </Form.Item>
                </div>
              ))}
            </Form.Item>

            <Form.Item
              label="Correct Answer"
              name="correctAnswer"
              rules={[
                { required: true, message: "Please select the correct answer" },
              ]}
            >
              <Select placeholder="Select correct answer">
                {OPTIONS.map((option) => (
                  <Select.Option key={option.id} value={option.id}>
                    Option {option.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Explanation Image">
              <ImageUpload name={["explanation", "image"]} />
            </Form.Item>

            <Form.Item label="Explanation (English)">
              <Form.Item
                name={["explanation", "en"]}
                rules={[
                  {
                    required: true,
                    message: "Please enter explanation in English",
                  },
                ]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Enter explanation in English"
                />
              </Form.Item>
            </Form.Item>

            <Form.Item label="Explanation (Malayalam)">
              <Form.Item name={["explanation", "ml"]}>
                <Input.TextArea
                  rows={4}
                  placeholder="Enter explanation in Malayalam"
                />
              </Form.Item>
            </Form.Item>

            <Form.Item
              label="Subject"
              name="subject"
              rules={[{ required: true, message: "Please select a subject" }]}
            >
              <Select
                placeholder="Select subject"
                options={subjects}
                onChange={handleSubjectChange}
              />
            </Form.Item>

            <Form.Item
              label="Topic"
              name="topic"
              dependencies={["subject"]}
              rules={[{ required: true, message: "Please select a topic" }]}
            >
              <Select
                placeholder={
                  selectedSubject
                    ? "Select topic"
                    : "Please select a subject first"
                }
                options={topics}
                disabled={!selectedSubject}
                loading={topicsLoading}
                onChange={handleTopicChange}
                allowClear
              />
            </Form.Item>

            <Form.Item label="Tag" name="tag">
              <Select
                placeholder={
                  selectedSubject && selectedTopic
                    ? "Select tag"
                    : "Please select subject and topic first"
                }
                options={tags}
                disabled={!selectedSubject || !selectedTopic}
                allowClear
              />
            </Form.Item>

            <Form.Item
              label="Associated Exams"
              name="exams"
              rules={[
                {
                  required: true,
                  type: "array",
                  min: 1,
                  message: "Please select at least one exam",
                },
              ]}
            >
              <Select
                mode="multiple"
                placeholder="Select exams"
                options={exams}
              />
            </Form.Item>

            <Form.Item
              label="Difficulty Level"
              name="difficultyLevel"
              rules={[
                {
                  required: true,
                  message: "Please select difficulty level",
                },
              ]}
            >
              <Select placeholder="Select difficulty level">
                <Select.Option value="easy">Easy</Select.Option>
                <Select.Option value="medium">Medium</Select.Option>
                <Select.Option value="hard">Hard</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={deleting || !canFix}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Fix
                </Button>
                <Button
                  danger
                  loading={deleting}
                  disabled={loading}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
