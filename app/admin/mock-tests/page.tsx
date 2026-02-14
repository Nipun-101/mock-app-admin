"use client";

import { Button, Card, Form, Input, InputNumber, Select, Table, Typography, Switch, Space, message, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Breakpoint } from 'antd/es/_util/responsiveObserver';
import { showConfirmModal } from '@/components/ConfirmModal';
import { useRouter } from "next/navigation";

const { Title } = Typography;
const { TextArea } = Input;

export default function MockTestsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [mockTests, setMockTests] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [subjects, setSubjects] = useState([]);
  const router = useRouter();

  const columns = [
    {
      title: "Test Title",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Duration",
      dataIndex: "durationInMinutes",
      key: "duration",
      responsive: ['md', 'lg', 'xl', 'xxl'] as Breakpoint[],
      render: (duration: number) => `${duration} mins`,
    },
    {
      title: "Questions",
      dataIndex: "totalQuestions",
      key: "totalQuestions",
    },
    {
      title: "Subjects",
      dataIndex: "subjects",
      key: "subjects",
      render: (subjectsList: any[]) => (
        <>
          {subjectsList?.map((subject: any) => (
            <Tag key={subject._id} color="blue">{subject.name}</Tag>
          ))}
        </>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      responsive: ['lg', 'xl', 'xxl'] as Breakpoint[],
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: any) => (
        <Space>
          <Button 
            type="link" 
            size="small"
            onClick={() => router.push(`/admin/mock-tests/${record._id}`)}
          >
            View
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger 
            onClick={() => handleDelete(record._id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const fetchMockTests = async () => {
    setTableLoading(true);
    try {
      const response = await fetch(`/api/mock-test/list?page=${pagination.current}&limit=${pagination.pageSize}`);
      const data = await response.json();
      setMockTests(data.mockTests);
      setPagination(prev => ({
        ...prev,
        total: data?.pagination?.total
      }));
    } catch (error) {
      console.error(error);
      message.error('Failed to fetch mock tests');
    } finally {
      setTableLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subject/list?limit=100');
      const data = await response.json();
      setSubjects(data.subjects?.map((subject: any) => ({
        value: subject._id,
        label: subject.name
      })) || []);
    } catch (error) {
      console.error(error);
      message.error('Failed to fetch subjects');
    }
  };

  useEffect(() => {
    fetchMockTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/mock-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        message.success('Mock test created successfully');
        form.resetFields();
        fetchMockTests();
      } else {
        message.error(data.error || 'Failed to create mock test');
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to create mock test');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: 'Delete Mock Test',
      content: 'Are you sure you want to delete this mock test? This action cannot be undone.',
      onConfirm: async () => {
        setTableLoading(true);
        try {
          const response = await fetch(`/api/mock-test/${id}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            message.success('Mock test deleted successfully');
            fetchMockTests();
          } else {
            message.error('Failed to delete mock test');
          }
        } catch (error) {
          console.error(error);
          message.error('Failed to delete mock test');
        } finally {
          setTableLoading(false);
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Title level={2}>Mock Tests Management</Title>
        
        <Card title="Create New Mock Test">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              marksPerQuestion: 1,
              negativeMarking: 0,
              allowRetake: true,
              shuffleOptions: false,
              showResultsImmediately: true,
              generationMode: "STATIC"
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Test Title"
                name="title"
                rules={[{ required: true, message: "Please enter test title" }]}
              >
                <Input placeholder="Enter test title" />
              </Form.Item>

              <Form.Item
                label="Duration (Minutes)"
                name="durationInMinutes"
                rules={[{ required: true, message: "Please enter duration" }]}
              >
                <InputNumber 
                  min={1} 
                  placeholder="e.g., 60" 
                  className="w-full"
                />
              </Form.Item>

              <Form.Item
                label="Subjects"
                name="subjects"
                rules={[{ required: true, message: "Please select at least one subject" }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select subjects"
                  options={subjects}
                />
              </Form.Item>

              <Form.Item
                label="Total Questions"
                name="totalQuestions"
                rules={[{ required: true, message: "Please select number of questions" }]}
              >
                <Select placeholder="Select number of questions">
                  <Select.Option value={20}>20 Questions</Select.Option>
                  <Select.Option value={30}>30 Questions</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Marks Per Question"
                name="marksPerQuestion"
              >
                <InputNumber 
                  min={0} 
                  step={0.5}
                  placeholder="e.g., 1" 
                  className="w-full"
                />
              </Form.Item>

              <Form.Item
                label="Negative Marking"
                name="negativeMarking"
              >
                <InputNumber 
                  min={0} 
                  step={0.25}
                  placeholder="e.g., 0.25" 
                  className="w-full"
                />
              </Form.Item>

              <Form.Item
                label="Passing Score"
                name="passingScore"
              >
                <InputNumber 
                  min={0}
                  placeholder="e.g., 50" 
                  className="w-full"
                />
              </Form.Item>
            </div>

            <Form.Item
              label="Description"
              name="description"
            >
              <TextArea rows={3} placeholder="Enter test description" />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item
                label="Allow Retake"
                name="allowRetake"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="Shuffle Options"
                name="shuffleOptions"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="Show Results Immediately"
                name="showResultsImmediately"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Mock Test
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="All Mock Tests">
          <Table 
            columns={columns} 
            dataSource={mockTests}
            rowKey="_id"
            loading={tableLoading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: (page) => {
                setPagination(prev => ({ ...prev, current: page }));
              }
            }}
          />
        </Card>
      </div>
    </div>
  );
}
