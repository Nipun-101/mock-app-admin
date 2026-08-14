"use client";

import { Button, Card, Divider, Form, Input, InputNumber, message, Select, Switch, Typography } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  catalogApi,
  formatEzPrepError,
  refId,
  type ExamSubjectConfig,
} from "@/app/services/ezprep-api";

function normalizeExamSubjects(subjects?: ExamSubjectConfig[]): ExamSubjectConfig[] | undefined {
  if (!subjects?.length) return undefined;
  return subjects.map((subject) => ({
    subject: subject.subject,
    numberOfQuestions: subject.numberOfQuestions,
    marksPerQuestion: subject.marksPerQuestion,
    hasNegativeMarking: Boolean(subject.hasNegativeMarking),
    negativeMarksPerQuestion: subject.negativeMarksPerQuestion ?? 0,
    sessionTime: subject.sessionTime,
  }));
}

const { Title } = Typography;

export default function EditExamPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [subjects, setSubjects] = useState<{ value: string; label: string }[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [examGroups, setExamGroups] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const { data } = await catalogApi.getExam(params.id);
        form.setFieldsValue({
          ...data,
          category: refId(data.category),
          examGroup: refId(data.examGroup),
        });
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to fetch exam"));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchExam();
  }, [params.id, form]);

  const fetchSubjects = async () => {
    try {
      const data = await catalogApi.listSubjects();
      setSubjects(
        (data.data || []).map((subject) => ({
          value: subject.id,
          label: subject.name,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch subjects"));
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await catalogApi.listActiveCategories();
      setCategories(
        (data.data || []).map((cat) => ({
          value: cat.id,
          label: `${cat.name} (${cat.shortName})`,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch categories"));
    }
  };

  const fetchExamGroups = async () => {
    try {
      const data = await catalogApi.listActiveExamGroups();
      setExamGroups(
        (data.data || []).map((group) => ({
          value: group.id,
          label: group.name,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch exam groups"));
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchCategories();
    fetchExamGroups();
  }, []);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await catalogApi.updateExam(params.id, {
        name: values.name,
        description: values.description,
        category: values.category,
        examGroup: values.examGroup,
        duration: values.duration,
        isSessionWise: values.isSessionWise,
        hasMultiLingualSupport: values.hasMultiLingualSupport,
        subjects: normalizeExamSubjects(values.subjects),
      });
      message.success('Exam updated successfully');
      router.push('/admin/exams');
    } catch (error: any) {
      message.error(formatEzPrepError(error, error.message || 'Failed to update exam'));
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
              label="Exam Group"
              name="examGroup"
              rules={[{ required: true, message: "Please select an exam group" }]}
            >
              <Select
                placeholder="Select exam group"
                size="large"
                options={examGroups}
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

            <Form.Item
              label="Multi-Lingual Support"
              name="hasMultiLingualSupport"
              valuePropName="checked"
              tooltip="Enable if this exam can be taken in different languages"
            >
              <Switch 
                checkedChildren="Yes" 
                unCheckedChildren="No" 
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