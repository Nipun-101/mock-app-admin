"use client";

import { Button, Card, Form, Input, Select, Upload, Radio, message, Tooltip } from "antd";
import { useState, useEffect } from "react";
import { InfoCircleOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { v4 as uuidv4 } from 'uuid';
import { ImageUpload } from '@/app/components/ImageUpload';

export default function AdminPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  // Move OPTIONS to state to maintain consistent IDs
  const [OPTIONS] = useState([
    { id: uuidv4(), label: 'A', type: 'text' },
    { id: uuidv4(), label: 'B', type: 'text' },
    { id: uuidv4(), label: 'C', type: 'text' },
    { id: uuidv4(), label: 'D', type: 'text' }
  ]);

  // Separate function to fetch tags by subject
  const fetchTagsBySubject = async (subjectId: string) => {
      const subject : any = subjects.find((subject: any) => subject.value === subjectId);
      setTags(subject?.tags?.map((tag: any) => ({
        value: tag._id,
        label: tag.name
      })) || []);
    
  };

  // Initial data fetch (now only subjects and exams)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subjectsRes, examsRes] = await Promise.all([
          fetch('/api/subject/list?limit=100'),
          fetch('/api/exam/list?limit=100')
        ]);
        
        const subjectsData = await subjectsRes.json();
        const examsData = await examsRes.json();

        setSubjects(subjectsData.subjects?.map((subject: any) => ({
          value: subject._id,
          label: subject.name,
          tags: subject.tags
        })) || []);

        setExams(examsData.exams?.map((exam: any) => ({
          value: exam._id,
          label: exam.name
        })) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Handle subject change
  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    form.setFieldValue('tags', []); // Clear selected tags when subject changes
    fetchTagsBySubject(value);
  };

  const handleSubmit = async (values: any) => {
    console.log("XXX", values);
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
            image: values.questionText?.ml?.image || values.questionText?.en?.image || null
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
        tags: values.tags || [],
        exams: values.exams || []
      };

      const response = await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedValues),
      });

      if (response.ok) {
        message.success('Question created successfully');
        form.resetFields(['questionText', 'options', 'correctAnswer', 'explanation']);
      } else {
        console.log("error", response);
        message.error('Failed to create question');
        throw new Error('Failed to create question');
        
      }
    } catch (error) {
      console.error('Error creating question:', error);
      message.error('Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="Add New Question">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            {/* English Question */}
            <Form.Item label="Question (English)">
              <Form.Item
                name={["questionText", "en", "text"]}
                rules={[{ required: true, message: "Please enter the question in English" }]}
              >
                <Input.TextArea rows={4} placeholder="Enter question text in English" />
              </Form.Item>
              <ImageUpload name={["questionText", "en", "image"]} />
            </Form.Item>

            {/* Malayalam Question */}
            <Form.Item label="Question (Malayalam)">
              <Form.Item name={["questionText", "ml", "text"]}>
                <Input.TextArea rows={4} placeholder="Enter question text in Malayalam" />
              </Form.Item>
              <ImageUpload name={["questionText", "ml", "image"]} />
            </Form.Item>

            {/* Question Type */}
            <Form.Item 
              label={
                <>
                  Question Type
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
                    OPTIONS.forEach((_, i) => {
                      form.setFieldValue(['options', i, 'en'], undefined);
                      form.setFieldValue(['options', i, 'ml'], undefined);
                    });
                  }
                  // Clear image field when switching to text 
                  if (e.target.value === 'text') {
                    OPTIONS.forEach((_, i) => {
                      form.setFieldValue(['options', i, 'image'], undefined);
                    });
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


            {/* Explanation Image */}
            <Form.Item label="Explanation Image">
              <Form.Item
                name={["explanation", "image"]}
              >
                <ImageUpload name={["explanation", "image"]} />
              </Form.Item>
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

            {/* Tags */}
            <Form.Item
              label="Tags"
              name="tags"
              dependencies={['subject']}
            >
              <Select
                mode="multiple"
                placeholder={selectedSubject ? "Select tags" : "Please select a subject first"}
                options={tags}
                disabled={!selectedSubject}
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

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Question
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}