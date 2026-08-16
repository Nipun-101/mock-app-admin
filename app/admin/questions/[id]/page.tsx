"use client";

import { Button, Card, Form, Input, Select, Radio, message, Tooltip } from "antd";
import { use, useState, useEffect } from "react";
import { DeleteOutlined, InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation';
import { ImageUpload, toPlainImageMetadata } from "@/app/components/ImageUpload";
import { setFormValue, setFormValues } from "@/app/lib/form-store";
import { catalogApi, formatEzPrepError, questionsApi, refId, type QuestionImage, type QuestionPayload } from "@/app/services/ezprep-api";
import { EditPageShell } from "@/app/components/PageLoader";

interface Option {
  id: string;
  label: string;
}

function normalizeExplanationImages(images: unknown): QuestionImage[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => toPlainImageMetadata(img))
    .filter((img): img is NonNullable<typeof img> => !!img);
}

export default function EditQuestionPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [subjects, setSubjects] = useState<{ value: string; label: string }[]>([]);
  const [topics, setTopics] = useState<{ value: string; label: string }[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [exams, setExams] = useState<{ value: string; label: string }[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [OPTIONS, setOPTIONS] = useState<Option[]>([]);

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

  // Fetch tags by subject and topic
  const fetchTagsBySubjectAndTopic = async (subjectId: string, topicId: string) => {
    setTagsLoading(true);
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
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      setTags([]);
    } finally {
      setTagsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSubject && subjects.length > 0) {
      fetchTopicsBySubject(selectedSubject);
    }
  }, [selectedSubject,subjects]);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subjectsData, examsData] = await Promise.all([
          catalogApi.listSubjects(),
          catalogApi.listAllExams(),
        ]);

        setSubjects((subjectsData.data || []).map((subject) => ({
          value: subject.id,
          label: subject.name,
        })) );

        setExams(examsData.map((exam) => ({
          value: exam.id,
          label: exam.name
        })) );


        // Fetch question data after getting subjects and exams
        fetchQuestion();
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to fetch data');
        setPageLoading(false);
      }
    };

    fetchData();
  }, []);



  const fetchQuestion = async () => {
    try {
      const { data: question } = await questionsApi.get(params.id);

      const options = Array.isArray(question.options) ? question.options : [];

      // Set OPTIONS based on existing question options
      setOPTIONS(options.map((opt: any, index: number) => ({
        id: opt?.id ?? String.fromCharCode(65 + index),
        label: String.fromCharCode(65 + index) // A, B, C, D
      })));

      // Set selected subject and fetch related topics
      const subjectId = refId(question.subject);
      const topicId = refId(question.topic);

      if (subjectId) {
        setSelectedSubject(subjectId);
      }

      if (topicId) {
        setSelectedTopic(topicId);
      }

      if (subjectId && topicId) {
        await fetchTagsBySubjectAndTopic(subjectId, topicId);
      }

      const questionText = question.questionText ?? {};
      const explanation = question.explanation ?? {};

      // Set form values
      form.setFieldsValue({
        questionText: {
          en: {
            text: questionText.en?.text ?? undefined,
            image: toPlainImageMetadata(questionText.en?.image),
          },
          ml: {
            text: questionText.ml?.text ?? undefined,
            image: toPlainImageMetadata(questionText.ml?.image),
          },
        },
        optionType: question.optionType || 'text',
        options: options.map((opt: any) => ({
          id: opt?.id,
          type: opt?.type,
          en: opt?.en,
          ml: opt?.ml,
          image: toPlainImageMetadata(opt?.image),
        })),
        correctAnswer: question.correctAnswer,
        explanation: {
          en: explanation.en ?? undefined,
          ml: explanation.ml ?? undefined,
          image: toPlainImageMetadata(explanation.image),
          images: normalizeExplanationImages(explanation.images),
        },
        subject: subjectId,
        topic: topicId,
        exams: (question.exams || []).map((exam) => refId(exam)).filter(Boolean),
        tag: question.tag || null,
        difficultyLevel: question.difficultyLevel
      });
    } catch (error) {
      console.error('Error fetching question:', error);
      message.error(formatEzPrepError(error, 'Failed to fetch question'));
    } finally {
      setPageLoading(false);
    }
  };

  // Handle subject change
  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setSelectedTopic(null);
    setFormValues(form, [
      { name: "topic", value: undefined },
      { name: "tag", value: undefined },
    ]);
    setTags([]);
    fetchTopicsBySubject(value);
  };

  // Handle topic change
  const handleTopicChange = (value: string) => {
    setSelectedTopic(value);
    setFormValue(form, "tag", undefined);
    if (selectedSubject && value) {
      fetchTagsBySubjectAndTopic(selectedSubject, value);
    } else {
      setTags([]);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);

    //if question type is image, then if any option is not image, then show error
    if (values.optionType === 'image') {
      if (!values.options.every((option: any) => option?.image?.key)) {
        message.error('Please upload images for all options');
        setLoading(false);
        return;
      }
    }
    
    try {
      const transformedValues = {
        questionText: {
          en: {
            text: values.questionText?.en?.text || null,
            image: values.questionText?.en?.image || null
          },
          ml: {
            text: values.questionText?.ml?.text || null,
            image: values.questionText?.ml?.image || null
          }
        },
        optionType: values.optionType,
        options: OPTIONS.map((option, index) => {
          const type = values.optionType || 'text';
          return {
            id: option.id,
            type,
            ...(type === 'text' ? {
              en: values.options?.[index]?.en || null,
              ml: values.options?.[index]?.ml || null,
            } : {
              image: values.options?.[index]?.image || null
            })
          };
        }),
        explanation: {
          en: values.explanation?.en || null,
          ml: values.explanation?.ml || null,
          image: values.explanation?.image || null,
          images: normalizeExplanationImages(values.explanation?.images),
        },
        correctAnswer: values.correctAnswer,
        subject: values.subject,
        topic: values.topic || null,
        exams: values.exams || [],
        tag: values.tag || null,
        difficultyLevel: values.difficultyLevel
      };

      await questionsApi.update(params.id, transformedValues as QuestionPayload);
      message.success('Question updated successfully');
      router.push('/admin/questions');
    } catch (error) {
      console.error('Error updating question:', error);
      message.error(formatEzPrepError(error, 'Failed to update question'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <EditPageShell loading={pageLoading}>
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="Edit Question">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            {/* English Question */}
            <Form.Item label="Question (English)">
              <Form.Item name={["questionText", "en", "text"]}>
                <Input.TextArea rows={4} placeholder="Enter question text in English" />
              </Form.Item>
              <Form.Item label="Question Image">
                <ImageUpload name={["questionText", "en", "image"]} />
              </Form.Item>
            </Form.Item>

            {/* Malayalam Question */}
            <Form.Item label="Question (Malayalam)">
              <Form.Item name={["questionText", "ml", "text"]}>
                <Input.TextArea rows={4} placeholder="Enter question text in Malayalam" />
              </Form.Item>
              <Form.Item label="Question Image">
                <ImageUpload name={["questionText", "ml", "image"]} />
              </Form.Item>
            </Form.Item>

              {/* Question Type */}
              <Form.Item 
              label={
                <>
                  Options Type
                  <Tooltip title="Switching between text/image will reset the options entered" placement="top">
                    <InfoCircleOutlined className="ml-2" />
                  </Tooltip>
                </>
              }
              name="optionType"
              initialValue="text"
            >
              <Radio.Group 
                onChange={(e) => {
                  console.log("option type changed:", e.target.value);
                  // Clear text fields when switching to image
                  if (e.target.value === 'image') {
                    setFormValues(
                      form,
                      OPTIONS.flatMap((_, i) => [
                        { name: ["options", i, "en"], value: undefined },
                        { name: ["options", i, "ml"], value: undefined },
                      ])
                    );
                  }
                  // Clear image field when switching to text 
                  if (e.target.value === 'text') {
                    setFormValues(
                      form,
                      OPTIONS.map((_, i) => ({
                        name: ["options", i, "image"],
                        value: undefined,
                      }))
                    );
                  }
                }}
              >
                <Radio value="text">Text</Radio>
                <Radio value="image">Image</Radio>
              </Radio.Group>
            </Form.Item>

            {/* Options */}
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
                      shouldUpdate={(prevValues, currentValues) => {
                        return prevValues?.optionType !== currentValues?.optionType;
                      }}
                    >
                      {({ getFieldValue }) => {
                        const type = getFieldValue("optionType");
                        
                        if (type === "image") {
                          return <ImageUpload name={["options", index, "image"]} />;
                        }
                        
                        return (
                          <>
                            <Form.Item name={["options", index, "en"]} rules={[{ required: true, message: "Please enter the option in English" }]}>
                              <Input placeholder={`Option ${option.label} in English`} />
                            </Form.Item>
                            <Form.Item name={["options", index, "ml"]}>
                              <Input placeholder={`Option ${option.label} in Malayalam`} />
                            </Form.Item>
                          </>
                        );
                      }}
                    </Form.Item>
                  </Form.Item>
                </div>
              ))}
            </Form.Item>

            {/* Correct Answer */}
            <Form.Item
              label="Correct Answer"
              name="correctAnswer"
              rules={[{ required: true, message: "Please select the correct answer" }]}
            >
              <Select>
                {OPTIONS.map(option => (
                  <Select.Option key={option.id} value={option.id}>
                    Option {option.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* Explanation */}
            <Form.Item label="Explanation (English)">
              <Form.Item name={["explanation", "en"]}>
                <Input.TextArea rows={4} placeholder="Enter explanation in English" />
              </Form.Item>
            </Form.Item>

            <Form.Item label="Explanation (Malayalam)">
              <Form.Item name={["explanation", "ml"]}>
                <Input.TextArea rows={4} placeholder="Enter explanation in Malayalam" />
              </Form.Item>
            </Form.Item>
            
            {/* Explanation Image (primary) */}
            <Form.Item label="Explanation Image">
              <ImageUpload name={["explanation", "image"]} />
            </Form.Item>

            {/* Extra explanation images */}
            <Form.Item label="Additional Explanation Images">
              <Form.List name={["explanation", "images"]}>
                {(fields, { add, remove }) => (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div
                        key={field.key}
                        className="flex items-start gap-3 border p-3 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <ImageUpload
                            name={["explanation", "images", field.name]}
                            label={`Image ${index + 1}`}
                          />
                        </div>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                          aria-label={`Remove additional image ${index + 1}`}
                        />
                      </div>
                    ))}
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => add()}
                      block
                    >
                      Add Image
                    </Button>
                  </div>
                )}
              </Form.List>
            </Form.Item>

            {/* Subject */}
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

            {/* Topic */}
            <Form.Item
              label="Topic"
              name="topic"
              dependencies={['subject']}
              rules={[{ required: true, message: "Please select a topic" }]}
            >
              <Select
                placeholder={selectedSubject ? "Select topic" : "Please select a subject first"}
                options={topics}
                disabled={!selectedSubject}
                loading={topicsLoading}
                onChange={handleTopicChange}
                allowClear
              />
            </Form.Item>

            {/* Tag */}
            <Form.Item
              label="Tag"
              name="tag"
            >
              <Select
                placeholder={selectedSubject && selectedTopic ? "Select tag" : "Please select subject and topic first"}
                options={tags}
                disabled={!selectedSubject || !selectedTopic}
                loading={tagsLoading}
                allowClear
              />
            </Form.Item>

            {/* Exams */}
            <Form.Item
              label="Associated Exams"
              name="exams"
            >
              <Select
                mode="multiple"
                placeholder="Select exams"
                options={exams}
              />
            </Form.Item>

            {/* Difficulty Level */}
            <Form.Item
              label="Difficulty Level"
              name="difficultyLevel"
              rules={[{ required: true, message: "Please select difficulty level" }]}
            >
              <Select placeholder="Select difficulty level">
                <Select.Option value="easy">Easy</Select.Option>
                <Select.Option value="medium">Medium</Select.Option>
                <Select.Option value="hard">Hard</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Update Question
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
    </EditPageShell>
  );
} 