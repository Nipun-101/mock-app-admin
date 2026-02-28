"use client";

import { Button, Card, Form, Input, InputNumber, Select, Slider, Table, Typography, Switch, Space, message, Tag } from "antd";
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
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState({ easy: 0, medium: 0, hard: 0 });
  const router = useRouter();

  const computeDefaults = (total: number) => {
    const base = Math.floor(total / 3);
    const remainder = total % 3;
    return {
      easy: base,
      medium: base + (remainder >= 2 ? 1 : 0),
      hard: base + (remainder >= 1 ? 1 : 0),
    };
  };

  const difficultySum = difficulty.easy + difficulty.medium + difficulty.hard;
  const isDifficultyValid = totalQuestions !== null && difficultySum === totalQuestions;

  const columns = [
    {
      title: "Test Title",
      dataIndex: "title",
      key: "title",
      render: (title: string) => title || '-',
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
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      render: (subject: any) => (
        <Tag color="blue">{subject?.name || 'N/A'}</Tag>
      ),
    },
    {
      title: "Topic",
      dataIndex: "topic",
      key: "topic",
      render: (topic: any) => (
        topic ? <Tag color="purple">{topic.name}</Tag> : '-'
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

  const fetchTopicsBySubject = async (subjectId: string) => {
    setTopicsLoading(true);
    try {
      const response = await fetch(`/api/topic/subject/${subjectId}`);
      const data = await response.json();
      setTopics(data.topics?.map((topic: any) => ({
        value: topic._id,
        label: topic.name
      })) || []);
    } catch (error) {
      console.error(error);
      message.error('Failed to fetch topics');
    } finally {
      setTopicsLoading(false);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    form.setFieldValue('topic', undefined);
    setTopics([]);
    if (subjectId) {
      fetchTopicsBySubject(subjectId);
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
    if (!isDifficultyValid) {
      message.error('Difficulty distribution must sum to total questions');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...values,
        difficultyDistribution: difficulty,
      };
      const response = await fetch('/api/mock-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        message.success('Mock test created successfully');
        form.resetFields();
        setTotalQuestions(null);
        setDifficulty({ easy: 0, medium: 0, hard: 0 });
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
                label="Total Questions"
                name="totalQuestions"
                rules={[{ required: true, message: "Please select number of questions" }]}
              >
                <Select 
                  placeholder="Select number of questions"
                  onChange={(val: number) => {
                    setTotalQuestions(val);
                    setDifficulty(computeDefaults(val));
                  }}
                >
                  <Select.Option value={10}>10 Questions</Select.Option>
                  <Select.Option value={15}>15 Questions</Select.Option>
                  <Select.Option value={20}>20 Questions</Select.Option>
                  <Select.Option value={25}>25 Questions</Select.Option>
                  <Select.Option value={30}>30 Questions</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Duration (Minutes)"
                name="durationInMinutes"
                rules={[{ required: true, message: "Please select duration" }]}
              >
                <Select placeholder="Select duration">
                  <Select.Option value={10}>10 Minutes</Select.Option>
                  <Select.Option value={15}>15 Minutes</Select.Option>
                  <Select.Option value={20}>20 Minutes</Select.Option>
                  <Select.Option value={25}>25 Minutes</Select.Option>
                  <Select.Option value={30}>30 Minutes</Select.Option>
                </Select>
              </Form.Item>

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

              <Form.Item
                label="Topic"
                name="topic"
              >
                <Select
                  placeholder={topics.length > 0 ? "Select topic" : "Select a subject first"}
                  options={topics}
                  disabled={topics.length === 0}
                  loading={topicsLoading}
                  allowClear
                />
              </Form.Item>
            </div>

            {totalQuestions && (
              <div className="mb-6">
                <div className="mb-2 font-medium">Difficulty Distribution</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-green-600 font-medium">Easy</span>
                      <span className="font-semibold">{difficulty.easy}</span>
                    </div>
                    <Slider
                      min={0}
                      max={totalQuestions}
                      value={difficulty.easy}
                      onChange={(val: number) => setDifficulty(prev => ({ ...prev, easy: val }))}
                      styles={{ track: { background: '#52c41a' } }}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-orange-500 font-medium">Medium</span>
                      <span className="font-semibold">{difficulty.medium}</span>
                    </div>
                    <Slider
                      min={0}
                      max={totalQuestions}
                      value={difficulty.medium}
                      onChange={(val: number) => setDifficulty(prev => ({ ...prev, medium: val }))}
                      styles={{ track: { background: '#faad14' } }}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-red-500 font-medium">Hard</span>
                      <span className="font-semibold">{difficulty.hard}</span>
                    </div>
                    <Slider
                      min={0}
                      max={totalQuestions}
                      value={difficulty.hard}
                      onChange={(val: number) => setDifficulty(prev => ({ ...prev, hard: val }))}
                      styles={{ track: { background: '#ff4d4f' } }}
                    />
                  </div>
                </div>
                <div className={`text-sm mt-2 ${isDifficultyValid ? 'text-green-600' : 'text-red-500 font-semibold'}`}>
                  Total: {difficultySum} / {totalQuestions}
                  {!isDifficultyValid && ` — Must equal ${totalQuestions}`}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Test Title"
                name="title"
              >
                <Input placeholder="Enter test title (optional)" />
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
                disabled={totalQuestions !== null && !isDifficultyValid}
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
