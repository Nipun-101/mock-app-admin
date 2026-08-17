"use client";

import { Button, Card, Form, Input, Radio, message, Tooltip } from "antd";
import { Select } from "@/app/components/SearchableSelect";
import { useState, useEffect } from "react";
import { InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { v4 as uuidv4 } from 'uuid';
import { ImageUpload } from '@/app/components/ImageUpload';
import { PasteToImage } from '@/app/components/PasteToImage';
import { EditPageShell } from "@/app/components/PageLoader";
import { setFormValue, setFormValues } from "@/app/lib/form-store";
import { catalogApi, formatEzPrepError, questionsApi, refId, type QuestionPayload } from "@/app/services/ezprep-api";

export default function CreateQuestionPage() {
  const [form] = Form.useForm();
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
  
  // Move OPTIONS to state to maintain consistent IDs
  const [OPTIONS] = useState([
    { id: uuidv4(), label: 'A', type: 'text' },
    { id: uuidv4(), label: 'B', type: 'text' },
    { id: uuidv4(), label: 'C', type: 'text' },
    { id: uuidv4(), label: 'D', type: 'text' }
  ]);

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

  // Initial data fetch (now only subjects and exams)
  useEffect(() => {
    const fetchData = async () => {
      setPageLoading(true);
      try {
        const [subjectsData, examsData] = await Promise.all([
          catalogApi.listSubjects(),
          catalogApi.listAllExams(),
        ]);

        setSubjects((subjectsData.data || []).map((subject) => ({
          value: subject.id,
          label: subject.name,
        })) || []);

        setExams(examsData.map((exam) => ({
          value: exam.id,
          label: exam.name
        })) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error(formatEzPrepError(error, "Failed to fetch form options"));
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, []);

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
          image: values.explanation?.image || null
        },
        correctAnswer: values.correctAnswer,
        subject: values.subject,
        topic: values.topic || null,
        exams: values.exams || [],
        tag: values.tag || null,
        difficultyLevel: values.difficultyLevel
      };

      await questionsApi.create(transformedValues as QuestionPayload);
      message.success('Question created successfully');
      form.resetFields(['questionText', 'options', 'correctAnswer', 'explanation', 'difficultyLevel']);
    } catch (error) {
      console.error('Error creating question:', error);
      message.error(formatEzPrepError(error, 'Failed to create question'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <EditPageShell loading={pageLoading}>
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="Add New Question">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            {/* English Question */}
            <PasteToImage target={["questionText", "en", "image"]}>
              <Form.Item label="Question (English)">
                <Form.Item
                  name={["questionText", "en", "text"]}
                  rules={[{ required: true, message: "Please enter the question in English" }]}
                >
                  <Input.TextArea rows={4} placeholder="Enter question text in English" />
                </Form.Item>
                <ImageUpload name={["questionText", "en", "image"]} />
              </Form.Item>
            </PasteToImage>

            {/* Malayalam Question */}
            <PasteToImage target={["questionText", "ml", "image"]}>
              <Form.Item label="Question (Malayalam)">
                <Form.Item name={["questionText", "ml", "text"]}>
                  <Input.TextArea rows={4} placeholder="Enter question text in Malayalam" />
                </Form.Item>
                <ImageUpload name={["questionText", "ml", "image"]} />
              </Form.Item>
            </PasteToImage>

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
                <PasteToImage
                  key={option.id}
                  target={["options", index, "image"]}
                  className="mb-4 border p-4 rounded"
                >
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
                </PasteToImage>
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


            <PasteToImage target={["explanation", "image"]}>
              {/* Explanation Image */}
              <Form.Item label="Explanation Image">
                <ImageUpload name={["explanation", "image"]} />
              </Form.Item>

              {/* Explanation in English */}
              <Form.Item label="Explanation (English)">
                <Form.Item
                  name={["explanation", "en"]}
                  // rules={[{ required: true, message: "Please enter explanation in English" }]}
                >
                  <Input.TextArea 
                    rows={4} 
                    placeholder="Enter explanation in English"
                  />
                </Form.Item>
              </Form.Item>

              {/* Explanation in Malayalam */}
              <Form.Item label="Explanation (Malayalam)">
                <Form.Item
                  name={["explanation", "ml"]}
                >
                  <Input.TextArea 
                    rows={4} 
                    placeholder="Enter explanation in Malayalam"
                  />
                </Form.Item>
              </Form.Item>
            </PasteToImage>

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
                icon={<PlusOutlined />}
                loading={loading || pageLoading}
                disabled={pageLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Question
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
    </EditPageShell>
  );
}