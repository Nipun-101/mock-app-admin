"use client";

import { Button, Card, Form, Input, Select, Upload, Radio, message, Tooltip } from "antd";
import { useState, useEffect } from "react";
import { InfoCircleOutlined, UploadOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation';
import { ImageUpload } from "@/app/components/ImageUpload";

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
        optionType: question.optionType || 'text',
        options: question.options.map((opt: any) => ({
          id: opt.id,
          type: opt.type,
          en: opt.en,
          ml: opt.ml,
          image: opt.image
        })),
        correctAnswer: question.correctAnswer,
        explanation: {
          en: question.explanation?.en,
          ml: question.explanation?.ml,
          image: question.explanation?.image
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
              <Form.Item name={["questionText", "en", "image"]} label="Question Image">
                <ImageUpload name={["questionText", "en", "image"]} />
              </Form.Item>
            </Form.Item>

            {/* Malayalam Question */}
            <Form.Item label="Question (Malayalam)">
              <Form.Item name={["questionText", "ml", "text"]}>
                <Input.TextArea rows={4} placeholder="Enter question text in Malayalam" />
              </Form.Item>
              <Form.Item name={["questionText", "ml", "image"]} label="Question Image">
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
            
            {/* Explanation Image */}
            <Form.Item label="Explanation Image">
              <Form.Item name={["explanation", "image"]}>
                <ImageUpload name={["explanation", "image"]} />
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