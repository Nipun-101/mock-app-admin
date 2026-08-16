"use client";

import { Button, Card, Divider, Form, Input, InputNumber, message, Switch, Table, Typography } from "antd";
import { Select } from "@/app/components/SearchableSelect";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Breakpoint } from 'antd/es/_util/responsiveObserver';
import { showConfirmModal } from '@/components/ConfirmModal';
import { useRouter } from "next/navigation";
import {
  catalogApi,
  formatEzPrepError,
  refId,
  type Exam,
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

export default function ExamsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [subjects, setSubjects] = useState<{ value: string; label: string }[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [examGroups, setExamGroups] = useState<any[]>([]);
  const [isExamSameAsGroup, setIsExamSameAsGroup] = useState(false);
  const router = useRouter();

  const columns = [
    {
      title: "Exam Name",
      dataIndex: "name",
      key: "name",
      responsive: ['sm', 'md', 'lg', 'xl', 'xxl'] as Breakpoint[],
    },
    {
      title: "Duration",
      dataIndex: "duration",
      key: "duration",
      responsive: ['sm', 'md', 'lg', 'xl', 'xxl'] as Breakpoint[],
      render: (duration: number) => duration ? `${duration} mins` : '',
    },
    {
      title: "Questions",
      dataIndex: "totalQuestions",
      key: "totalQuestions",
      responsive: ['sm', 'md', 'lg', 'xl', 'xxl'] as Breakpoint[],
    },
    {
      title: "Total Marks",
      dataIndex: "totalMarks",
      key: "totalMarks",
      responsive: ['sm', 'md', 'lg', 'xl', 'xxl'] as Breakpoint[],
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (categoryId: Exam["category"]) => {
        const id = refId(categoryId);
        const cat: any = categories.find((c: any) => c.value === id);
        return cat?.label || '-';
      },
    },
    {
      title: "Exam Group",
      dataIndex: "examGroup",
      key: "examGroup",
      responsive: ['lg', 'xl', 'xxl'] as Breakpoint[],
      render: (examGroup: any) => {
        if (typeof examGroup === 'object' && examGroup?.name) {
          return examGroup.name;
        }
        const group: any = examGroups.find((g: any) => g.value === examGroup);
        return group?.label || '-';
      },
    },
    {
      title: "Subjects",
      dataIndex: "subjects",
      key: "subjects",
      render: (subjectsList: any[]) => {
        if (!subjectsList || subjectsList.length === 0) return '-';
        const subjectNames = subjectsList.map((s: any) => {
          const subject: any = subjects.find((sub: any) => sub.value === (s.subject || s));
          return subject?.label || '';
        }).filter(Boolean);
        return subjectNames.join(', ');
      }
    },
    {
      title: "Mode",
      key: "isSessionWise",
      dataIndex: "isSessionWise",
      responsive: ['md', 'lg', 'xl', 'xxl'] as Breakpoint[],
      render: (isSessionWise: boolean) => isSessionWise ? 'Session-wise' : 'Mixed',
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: any) => (
        <>
          <Button 
            type="link" 
            size="small"
            onClick={() => router.push(`/admin/exams/${record.id}`)}
          >
            Edit
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger 
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];
  
  const fetchExams = async () => {
    setTableLoading(true);
    try {
      const examsList = await catalogApi.listAllExams();
      setExams(examsList);
      setPagination((prev) => ({
        ...prev,
        total: examsList.length,
      }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch exams"));
    } finally {
      setTableLoading(false);
    }
  };

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

  useEffect(() => {
    fetchExams();
  }, [pagination.current, pagination.pageSize]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const { isExamSameAsGroup, shortName, ...examData } = values;
      let examGroupId = examData.examGroup as string | undefined;

      if (isExamSameAsGroup) {
        const group = await catalogApi.createExamGroup({
          name: examData.name,
          shortName: shortName || examData.name,
          category: examData.category,
          description: examData.description,
        });
        examGroupId = group.data.id;
        await fetchExamGroups();
      }

      if (!examGroupId) {
        throw new Error("Please select an exam group");
      }

      await catalogApi.createExam({
        name: examData.name,
        description: examData.description,
        category: examData.category,
        examGroup: examGroupId,
        duration: examData.duration,
        isSessionWise: examData.isSessionWise,
        hasMultiLingualSupport: examData.hasMultiLingualSupport,
        subjects: normalizeExamSubjects(examData.subjects),
      });
      message.success('Exam created successfully');
      form.resetFields();
      fetchExams();
    } catch (error: any) {
      message.error(formatEzPrepError(error, error.message || 'Failed to create exam'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: 'Delete Exam',
      content: 'Are you sure you want to delete this exam? This action cannot be undone.',
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await catalogApi.deleteExam(id);
          message.success('Exam deleted successfully');
          fetchExams();
        } catch (error) {
          message.error(formatEzPrepError(error, 'Failed to delete exam'));
        } finally {
          setTableLoading(false);
        }
      }
    });
  };
  
  return (
    <div className="space-y-6">
      <Card
        title={<Title level={4} className="mb-0">Add New Exam</Title>}
        className="w-full shadow-sm"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onFinishFailed={() => message.error('Please fill in all required fields')}
          scrollToFirstError
          className="max-w-4xl"
          initialValues={{ isSessionWise: false, isExamSameAsGroup: false, hasMultiLingualSupport: false }}
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
              label="Exam is also the Exam Group"
              name="isExamSameAsGroup"
              valuePropName="checked"
              tooltip="Enable this if the exam doesn't have tiers (e.g., PSC Overseer Grade I). When enabled, an exam group will be created automatically with the same details."
            >
              <Switch 
                checkedChildren="Yes" 
                unCheckedChildren="No"
                onChange={(checked) => {
                  setIsExamSameAsGroup(checked);
                  if (checked) {
                    form.setFieldsValue({ examGroup: undefined });
                  } else {
                    form.setFieldsValue({ shortName: undefined });
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) => prev?.isExamSameAsGroup !== cur?.isExamSameAsGroup}
            >
              {({ getFieldValue }) => {
                const isSameAsGroup = getFieldValue('isExamSameAsGroup');
                return !isSameAsGroup ? (
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
                ) : (
                  <Form.Item
                    label="Short Name (for Exam Group)"
                    name="shortName"
                  >
                    <Input placeholder="e.g. CGL" size="large" />
                  </Form.Item>
                );
              }}
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
              icon={<PlusOutlined />}
              className="bg-blue-600 hover:bg-blue-700"
              loading ={loading}
            >
              Create Exam
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card 
        title={<Title level={4} className="mb-0">Exams List</Title>}
        className="shadow-sm"
      >
        <Table 
          columns={columns} 
          loading={tableLoading}
          dataSource={exams}
          rowKey="id"
          scroll={{ x: true }}
          pagination={{
            position: ["bottomCenter"],
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} exams`,
          }}
        />
      </Card>
    </div>
  );
}