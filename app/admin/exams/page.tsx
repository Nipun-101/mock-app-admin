"use client";

import { Button, Card, Divider, Form, Input, InputNumber, message, Select, Switch, Table, Typography } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Breakpoint } from 'antd/es/_util/responsiveObserver';
import { showConfirmModal } from '@/components/ConfirmModal';
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function ExamsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState<any[]>([]);
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
      render: (categoryId: string) => {
        const cat: any = categories.find((c: any) => c.value === categoryId);
        return cat?.label || '-';
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
            onClick={() => router.push(`/admin/exams/${record._id}`)}
          >
            Edit
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger 
            onClick={() => handleDelete(record._id)}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];
  
  const fetchExams = async () => {
    const response = await fetch(`/api/exam/list?page=${pagination.current}&limit=${pagination.pageSize}`);
    const data = await response.json();
    console.log(data);
    setExams(data.exams);
    setPagination(prev => ({
      ...prev,
      total: data?.pagination?.total
    }));
  };

  const fetchSubjects = async () => {
    const response = await fetch(`/api/subject/simple?page=${pagination.current}&limit=${pagination.pageSize}`);
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
    fetchExams();
    fetchSubjects();
    fetchCategories();
  }, [pagination.current, pagination.pageSize]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/exam", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create exam');
      }
      message.success('Exam created successfully');
      form.resetFields();
      fetchExams();
    } catch (error: any) {
      console.error(error);
      message.error(error.message || 'Failed to create exam');
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
          const response = await fetch(`/api/exam/${id}`, {
            method: "DELETE"
          });
          const data = await response.json();
          console.log(data);
          // Reload the table after successful deletion
          fetchExams();
        } catch (error) {
          console.error(error);
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
          initialValues={{ isSessionWise: false }}
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