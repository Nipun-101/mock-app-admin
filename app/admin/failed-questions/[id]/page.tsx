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
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/app/components/ImageUpload";
import { showConfirmModal } from "@/components/ConfirmModal";
import { ezPrepApiClient } from "@/app/services/ezprep-api";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import {
  DeleteFailedQuestionResponse,
  FailedQuestionDetailResponse,
  ImportFailedQuestionResponse,
  ImportQuestion,
} from "../types";

interface Option {
  id: string;
  label: string;
}

export default function FixFailedQuestionPage({
  params,
}: {
  params: { id: string };
}) {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [failedQuestion, setFailedQuestion] = useState<
    FailedQuestionDetailResponse["data"] | null
  >(null);
  const [subjects, setSubjects] = useState<
    { value: string; label: string; topics?: { _id: string; name: string }[] }[]
  >([]);
  const [topics, setTopics] = useState<{ value: string; label: string }[]>([]);
  const [exams, setExams] = useState<{ value: string; label: string }[]>([]);
  const [tags, setTags] = useState<{ value: string; label: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [OPTIONS, setOPTIONS] = useState<Option[]>([]);
  const [originalDraft, setOriginalDraft] = useState<ImportQuestion | null>(
    null
  );

  const fetchTopicsBySubject = (subjectId: string) => {
    const subject = subjects.find((s) => s.value === subjectId);
    const topicsData =
      subject?.topics?.map((topic) => ({
        value: topic._id,
        label: topic.name,
      })) ?? [];
    setTopics(topicsData);
  };

  const fetchTagsBySubjectAndTopic = async (
    subjectId: string,
    topicId: string
  ) => {
    try {
      const response = await fetch(
        `/api/tag/list?limit=100&subject=${subjectId}&topic=${topicId}`
      );
      const data = await response.json();
      setTags(
        data.tags?.map((tag: { _id: string; name: string }) => ({
          value: tag._id,
          label: tag.name,
        })) ?? []
      );
    } catch {
      setTags([]);
    }
  };

  const populateFormFromDraft = async (
    draft: ImportQuestion,
    subjectsList: typeof subjects
  ) => {
    setOriginalDraft(draft);

    const options = draft.options ?? [];
    setOPTIONS(
      options.map((opt, index) => ({
        id: opt.id,
        label: String.fromCharCode(65 + index),
      }))
    );

    if (draft.subject) {
      setSelectedSubject(draft.subject);
      const subject = subjectsList.find((s) => s.value === draft.subject);
      const topicsData =
        subject?.topics?.map((topic) => ({
          value: topic._id,
          label: topic.name,
        })) ?? [];
      setTopics(topicsData);
    }

    if (draft.topic) {
      setSelectedTopic(draft.topic);
      if (draft.subject && draft.topic) {
        await fetchTagsBySubjectAndTopic(draft.subject, draft.topic);
      }
    }

    form.setFieldsValue({
      questionText: {
        en: {
          text: draft.questionText?.en?.text ?? "",
          image: draft.questionText?.en?.image ?? null,
        },
        ml: {
          text: draft.questionText?.ml?.text ?? "",
          image: draft.questionText?.ml?.image ?? null,
        },
      },
      optionType: draft.optionType || "text",
      options: options.map((opt) => ({
        id: opt.id,
        type: opt.type,
        en: opt.en ?? "",
        ml: opt.ml ?? "",
        image: opt.image ?? null,
      })),
      correctAnswer: draft.correctAnswer ?? undefined,
      explanation: {
        en: draft.explanation?.en ?? "",
        ml: draft.explanation?.ml ?? "",
        image: draft.explanation?.image ?? null,
      },
      subject: draft.subject ?? undefined,
      topic: draft.topic ?? undefined,
      exams: draft.exams ?? [],
      tag: draft.tag ?? undefined,
      difficultyLevel: draft.difficultyLevel ?? undefined,
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setPageLoading(true);
      try {
        const [subjectsRes, examsRes, questionRes] = await Promise.all([
          fetch("/api/subject/list?limit=100"),
          fetch("/api/exam/list?limit=100"),
          ezPrepApiClient.get<FailedQuestionDetailResponse>(
            `/v1/imports/failed-questions/${params.id}`
          ),
        ]);

        const subjectsData = await subjectsRes.json();
        const examsData = await examsRes.json();

        const subjectsList =
          subjectsData?.subjects?.map(
            (subject: {
              _id: string;
              name: string;
              topics?: { _id: string; name: string }[];
            }) => ({
              value: subject._id,
              label: subject.name,
              topics: subject.topics,
            })
          ) ?? [];

        setSubjects(subjectsList);
        setExams(
          examsData?.exams?.map((exam: { _id: string; name: string }) => ({
            value: exam._id,
            label: exam.name,
          })) ?? []
        );

        const item = questionRes.data;
        setFailedQuestion(item);
        await populateFormFromDraft(item.questionDraft, subjectsList);
      } catch (error) {
        const errorMessage =
          error instanceof EzPrepApiError
            ? error.message
            : "Failed to fetch failed question";
        message.error(errorMessage);
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
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
          const errorMessage =
            error instanceof EzPrepApiError
              ? error.message
              : "Failed to delete failed question";
          message.error(errorMessage);
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setLoading(true);

    if (values.optionType === "image") {
      const options = values.options as { image?: { key?: string } }[];
      if (!options?.every((option) => option?.image?.key)) {
        message.error("Please upload images for all options");
        setLoading(false);
        return;
      }
    }

    try {
      const questionPayload: ImportQuestion = {
        questionText: {
          en: {
            text: (values.questionText as ImportQuestion["questionText"])?.en
              ?.text || null,
            image:
              (values.questionText as ImportQuestion["questionText"])?.en
                ?.image || null,
          },
          ml: {
            text: (values.questionText as ImportQuestion["questionText"])?.ml
              ?.text || null,
            image:
              (values.questionText as ImportQuestion["questionText"])?.ml
                ?.image ||
              (values.questionText as ImportQuestion["questionText"])?.en
                ?.image ||
              null,
          },
        },
        optionType: values.optionType as string,
        options: OPTIONS.map((option, index) => {
          const type = (values.optionType as string) || "text";
          const formOptions = values.options as Record<string, unknown>[];
          return {
            id: option.id,
            type,
            ...(type === "text"
              ? {
                  en: (formOptions?.[index]?.en as string) || null,
                  ml: (formOptions?.[index]?.ml as string) || null,
                }
              : {
                  image: formOptions?.[index]?.image || null,
                }),
          };
        }),
        explanation: {
          en: (values.explanation as ImportQuestion["explanation"])?.en || null,
          ml: (values.explanation as ImportQuestion["explanation"])?.ml || null,
          image:
            (values.explanation as ImportQuestion["explanation"])?.image ||
            null,
        },
        correctAnswer: values.correctAnswer as string,
        subject: values.subject as string,
        topic: (values.topic as string) || "",
        exams: (values.exams as string[]) || [],
        tag: (values.tag as string) || null,
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
      const errorMessage =
        error instanceof EzPrepApiError
          ? error.message
          : "Failed to import question";
      message.error(errorMessage);
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
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item label="Question (English)">
              <Form.Item name={["questionText", "en", "text"]}>
                <Input.TextArea
                  rows={4}
                  placeholder="Enter question text in English"
                />
              </Form.Item>
              <Form.Item
                name={["questionText", "en", "image"]}
                label="Question Image"
              >
                <ImageUpload name={["questionText", "en", "image"]} />
              </Form.Item>
            </Form.Item>

            <Form.Item label="Question (Malayalam)">
              <Form.Item name={["questionText", "ml", "text"]}>
                <Input.TextArea
                  rows={4}
                  placeholder="Enter question text in Malayalam"
                />
              </Form.Item>
              <Form.Item
                name={["questionText", "ml", "image"]}
                label="Question Image"
              >
                <ImageUpload name={["questionText", "ml", "image"]} />
              </Form.Item>
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
              initialValue="text"
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
                            <Form.Item name={["options", index, "en"]}>
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

            <Form.Item label="Correct Answer" name="correctAnswer">
              <Select placeholder="Select correct answer" allowClear>
                {OPTIONS.map((option) => (
                  <Select.Option key={option.id} value={option.id}>
                    Option {option.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Explanation (English)">
              <Form.Item name={["explanation", "en"]}>
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

            <Form.Item label="Explanation Image">
              <Form.Item name={["explanation", "image"]}>
                <ImageUpload name={["explanation", "image"]} />
              </Form.Item>
            </Form.Item>

            <Form.Item label="Subject" name="subject">
              <Select
                placeholder="Select subject"
                options={subjects}
                onChange={handleSubjectChange}
              />
            </Form.Item>

            <Form.Item label="Topic" name="topic" dependencies={["subject"]}>
              <Select
                placeholder={
                  selectedSubject
                    ? "Select topic"
                    : "Please select a subject first"
                }
                options={topics}
                disabled={!selectedSubject}
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

            <Form.Item label="Associated Exams" name="exams">
              <Select
                mode="multiple"
                placeholder="Select exams"
                options={exams}
              />
            </Form.Item>

            <Form.Item label="Difficulty Level" name="difficultyLevel">
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
                  disabled={deleting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Fix
                </Button>
                <Button danger loading={deleting} disabled={loading} onClick={handleDelete}>
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
