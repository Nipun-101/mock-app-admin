"use client";

import { Button, Card, Form, Input, Select, Upload, Radio, message } from "antd";
import { useState, useEffect } from "react";
import { UploadOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation';

interface Option {
  id: string;
  label: string;
}

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [OPTIONS, setOPTIONS] = useState<Option[]>([]);

  // Fetch tags by subject
  const fetchTagsBySubject = async (subjectId: string) => {
    console.log("XXXYYYZZ subjectId", subjectId);
    console.log("XXXYYYZZ subjects", subjects);

    const subject: any = subjects?.find((subject: any) => subject.value === subjectId);
    console.log("XXXYYYZZ subject", subject);

    const tagsData = subject?.tags?.map((tag: any) => ({
      value: tag._id,
      label: tag.name
    })) || [];

    console.log("XXXYYYZZ tags", tagsData);
    
    setTags(tagsData);
  };

  useEffect(() => {
    if (selectedSubject && subjects.length > 0) {
      fetchTagsBySubject(selectedSubject);
    }
  }, [selectedSubject,subjects]);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subjectsRes, examsRes] = await Promise.all([
          fetch('/api/subject/list?limit=100'),
          fetch('/api/exam/list?limit=100')
        ]);
        
        const subjectsData = await subjectsRes.json();
        const examsData = await examsRes.json();

        setSubjects(subjectsData?.subjects?.map((subject: any) => ({
          value: subject._id,
          label: subject.name,
          tags: subject.tags
        })) );

        setExams(examsData?.exams?.map((exam: any) => ({
          value: exam._id,
          label: exam.name
        })) );


        // Fetch question data after getting subjects and exams
        fetchQuestion();
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to fetch data');
      }
    };

    fetchData();
  }, []);


  useEffect(() => {
    // console.log("XXX TEST subjects", subjects);
    // console.log("XXX TEST tags", tags);
    // console.log("XXX TEST exams", exams);
  }, [subjects, tags, exams]);


  const fetchQuestion = async () => {
    try {
      const response = await fetch(`/api/question/${params.id}`);
      const question = await response.json();

      // Set OPTIONS based on existing question options
      setOPTIONS(question.options.map((opt: any, index: number) => ({
        id: opt.id,
        label: String.fromCharCode(65 + index) // A, B, C, D
      })));

      // Set selected subject and fetch related tags
      if (question.subject) {
        setSelectedSubject(question.subject);
        // await fetchTagsBySubject(question.subject);
      }


      // Set form values
      form.setFieldsValue({
        questionText: {
          en: {
            text: question.questionText.en.text,
            image: question.questionText.en.image
          },
          ml: {
            text: question.questionText.ml.text,
            image: question.questionText.ml.image
          }
        },
        options: question.options.map((opt: any) => ({
          id: opt.id,
          type: opt.type || 'text',
          en: opt.en,
          ml: opt.ml,
          url: opt.url
        })),
        correctAnswer: question.correctAnswer,
        explanation: {
          en: question.explanation?.en,
          ml: question.explanation?.ml
        },
        subject: question.subject,
        tags: question.tags,
        exams: question.exams
      });
    } catch (error) {
      console.error('Error fetching question:', error);
      message.error('Failed to fetch question');
    }
  };

  // Handle subject change
  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    form.setFieldValue('tags', []); // Clear selected tags
    fetchTagsBySubject(value);
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const transformedValues = {
        questionText: {
          en: {
            text: values.questionText?.en?.text || null,
            image: values.questionText?.en?.image?.[0]?.response?.url || null
          },
          ml: {
            text: values.questionText?.ml?.text || null,
            image: values.questionText?.ml?.image?.[0]?.response?.url || null
          }
        },
        options: OPTIONS.map((option, index) => ({
          id: option.id,
          type: values.options[index]?.type || 'text',
          en: values.options[index]?.en || null,
          ml: values.options[index]?.ml || null,
          url: values.options[index]?.url || null
        })),
        explanation: {
          en: values.explanation?.en || null,
          ml: values.explanation?.ml || null
        },
        correctAnswer: values.correctAnswer,
        subject: values.subject,
        tags: values.tags || [],
        exams: values.exams || []
      };

      const response = await fetch(`/api/question/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedValues),
      });

      if (response.ok) {
        message.success('Question updated successfully');
        router.push('/admin/questions');
      } else {
        throw new Error('Failed to update question');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      message.error('Failed to update question');
    } finally {
      setLoading(false);
    }
  };

  return (
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
              <Form.Item name={["questionText", "en", "image"]}>
                <Upload>
                  <Button icon={<UploadOutlined />}>Upload Image</Button>
                </Upload>
              </Form.Item>
            </Form.Item>

            {/* Malayalam Question */}
            <Form.Item label="Question (Malayalam)">
              <Form.Item name={["questionText", "ml", "text"]}>
                <Input.TextArea rows={4} placeholder="Enter question text in Malayalam" />
              </Form.Item>
              <Form.Item name={["questionText", "ml", "image"]}>
                <Upload>
                  <Button icon={<UploadOutlined />}>Upload Image</Button>
                </Upload>
              </Form.Item>
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
                    
                    <Form.Item name={["options", index, "type"]}>
                      <Radio.Group defaultValue="text">
                        <Radio value="text">Text</Radio>
                        <Radio value="image">Image</Radio>
                      </Radio.Group>
                    </Form.Item>
                    
                    <Form.Item name={["options", index, "en"]}>
                      <Input placeholder={`Option ${option.label} in English`} />
                    </Form.Item>

                    <Form.Item name={["options", index, "ml"]}>
                      <Input placeholder={`Option ${option.label} in Malayalam`} />
                    </Form.Item>

                    <Form.Item 
                      name={["options", index, "url"]}
                      noStyle
                      shouldUpdate={(prevValues: any, currentValues: any) => {
                        return prevValues?.options?.[index]?.type !== currentValues?.options?.[index]?.type;
                      }}
                    >
                      {({ getFieldValue }) => {
                        return getFieldValue(["options", index, "type"]) === "image" ? (
                          <Upload>
                            <Button icon={<UploadOutlined />}>Upload Image</Button>
                          </Upload>
                        ) : null;
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
  );
} 