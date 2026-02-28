"use client";

import { Button, Card, Divider, Form, Input, InputNumber, message, Select, Switch, Typography } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function EditExamPage({ params }: { params: { id: string } }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Fetch exam details when component mounts
    const fetchExam = async () => {
      try {
        const response = await fetch(`/api/exam/${params.id}`);
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        form.setFieldsValue(data);
      } catch (error) {
        console.error(error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchExam();
  }, [params.id, form]);

  const fetchSubjects = async () => {
    const response = await fetch(`/api/subject/simple`);
    const data = await response.json();
    setSubjects(data.subjects?.map((subject: any) => ({
      value: subject._id,
      label: subject.name
    })));
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/category/list?limit=100');
      const data = await response.json();
      setCategories(data.categories?.map((cat: any) => ({
        value: cat._id,
        label: `${cat.name} (${cat.shortName})`,
      })));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchCategories();
  }, []);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/exam/${params.id}`, {
        method: "PUT",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to update exam');
      }
      message.success('Exam updated successfully');
      router.push('/admin/exams');
    } catch (error: any) {
      console.error(error);
      message.error(error.message || 'Failed to update exam');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card
        title={<Title level={4} className="mb-0">Edit Exam</Title>}
        className="w-full shadow-sm"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onFinishFailed={() => message.error('Please fill in all required fields')}
          scrollToFirstError
          className="max-w-4xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              label="Exam Name"
              name="name"
              rules={[{ required: true, message: "Please enter exam name" }]}
            >
              <Input placeholder="Enter exam name" size="large" />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
            >
              <Input.TextArea placeholder="Enter description" size="large" />
            </Form.Item>

            <Form.Item
              label="Category"
              name="category"
              rules={[{ required: true, message: "Please select a category" }]}
            >
              <Select
                placeholder="Select category"
                size="large"
                options={categories}
                optionFilterProp="label"
                showSearch
              />
            </Form.Item>

            <Form.Item
              label="Duration (minutes)"
              name="duration"
            >
              <InputNumber min={1} className="w-full" size="large" />
            </Form.Item>

            <Form.Item
              label="Exam Mode"
              name="isSessionWise"
              valuePropName="checked"
              tooltip="Session-wise: each subject must be completed before moving to the next. Mixed: questions from all subjects are shuffled together."
            >
              <Switch 
                checkedChildren="Session-wise" 
                unCheckedChildren="Mixed" 
              />
            </Form.Item>
          </div>

          <Divider orientation="left">Subjects Configuration</Divider>

          <Form.List name="subjects">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card 
                    key={key} 
                    size="small" 
                    className="mb-4 bg-gray-50"
                    extra={
                      <MinusCircleOutlined
                        className="text-red-500 text-lg cursor-pointer"
                        onClick={() => remove(name)}
                      />
                    }
                    title={`Subject ${name + 1}`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Form.Item
                        {...restField}
                        label="Subject"
                        name={[name, 'subject']}
                        rules={[{ required: true, message: 'Please select a subject' }]}
                      >
                        <Select
                          placeholder="Select subject"
                          options={subjects}
                          optionFilterProp="label"
                          showSearch
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        label="No. of Questions"
                        name={[name, 'numberOfQuestions']}
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <InputNumber min={1} className="w-full" placeholder="e.g. 30" />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        label="Marks per Question"
                        name={[name, 'marksPerQuestion']}
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <InputNumber min={0} step={0.5} className="w-full" placeholder="e.g. 4" />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        label="Negative Marking?"
                        name={[name, 'hasNegativeMarking']}
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="Yes" unCheckedChildren="No" />
                      </Form.Item>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) =>
                          prev?.subjects?.[name]?.hasNegativeMarking !== cur?.subjects?.[name]?.hasNegativeMarking
                        }
                      >
                        {({ getFieldValue }) => {
                          const hasNeg = getFieldValue(['subjects', name, 'hasNegativeMarking']);
                          return hasNeg ? (
                            <Form.Item
                              {...restField}
                              label="Negative Marks"
                              name={[name, 'negativeMarksPerQuestion']}
                            >
                              <InputNumber min={0} step={0.25} className="w-full" placeholder="e.g. 1" />
                            </Form.Item>
                          ) : null;
                        }}
                      </Form.Item>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) =>
                          prev?.isSessionWise !== cur?.isSessionWise
                        }
                      >
                        {({ getFieldValue }) => {
                          const isSessionWise = getFieldValue('isSessionWise');
                          return isSessionWise ? (
                            <Form.Item
                              {...restField}
                              label="Session Time (mins)"
                              name={[name, 'sessionTime']}
                            >
                              <InputNumber min={1} className="w-full" placeholder="e.g. 60" />
                            </Form.Item>
                          ) : null;
                        }}
                      </Form.Item>
                    </div>
                  </Card>
                ))}

                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add({ hasNegativeMarking: false })}
                    block
                    icon={<PlusOutlined />}
                    size="large"
                  >
                    Add Subject
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item className="mb-0">
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              className="bg-blue-600 hover:bg-blue-700"
              loading={loading}
            >
              Update Exam
            </Button>
            <Button 
              className="ml-2" 
              size="large"
              onClick={() => router.push('/admin/exams')}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 