"use client";

import { Button, Card, Form, Input, InputNumber, Slider, Table, Typography, Switch, Space, message, Tag } from "antd";
import { Select } from "@/app/components/SearchableSelect";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { Breakpoint } from 'antd/es/_util/responsiveObserver';
import { showConfirmModal } from '@/components/ConfirmModal';
import { useRouter } from "next/navigation";
import { catalogApi, formatEzPrepError, mockTestsApi, refId, type Exam } from "@/app/services/ezprep-api";
import { setFormValue } from "@/app/lib/form-store";
import { AccessModeSwitch } from "@/app/components/AccessModeSwitch";
import { topicWiseDraftsApi } from "./api";
import type { TopicWiseDraftListItem } from "./types";

const { Title } = Typography;
const { TextArea } = Input;

function EllipsisTag({
  color,
  children,
}: {
  color: string;
  children: string;
}) {
  return (
    <Tag color={color} title={children} className="!m-0 !block max-w-full truncate">
      {children}
    </Tag>
  );
}

function subjectsOnExam(exam: Exam) {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  for (const row of exam.subjects || []) {
    const id = refId(row.subject);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    options.push({ value: id, label: row.name || id });
  }
  return options;
}

export default function MockTestsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [subjects, setSubjects] = useState<{ value: string; label: string }[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [topics, setTopics] = useState<{ value: string; label: string }[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const subjectsRequest = useRef(0);
  const [exams, setExams] = useState<{ value: string; label: string }[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState({ easy: 0, medium: 0, hard: 0 });
  const [drafts, setDrafts] = useState<TopicWiseDraftListItem[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [discardingId, setDiscardingId] = useState<string | null>(null);
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
      title: "Exam",
      dataIndex: "exam",
      key: "exam",
      render: (exam: any) => (
        <Tag color="cyan">{exam?.name || 'N/A'}</Tag>
      ),
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
            onClick={() => router.push(`/admin/mock-tests/${record.id}`)}
          >
            View
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger 
            onClick={() => handleDelete(record.id)}
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
      const data = await mockTestsApi.list({
        page: pagination.current,
        limit: pagination.pageSize,
      });
      setMockTests(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total ?? 0
      }));
    } catch (error) {
      message.error(formatEzPrepError(error, 'Failed to fetch mock tests'));
    } finally {
      setTableLoading(false);
    }
  };

  const fetchSubjectsForExam = async (examId: string) => {
    const requestId = ++subjectsRequest.current;
    setSubjectsLoading(true);
    setSubjects([]);
    try {
      const { data } = await catalogApi.getExam(examId);
      if (requestId !== subjectsRequest.current) return;
      setSubjects(subjectsOnExam(data));
    } catch (error) {
      if (requestId !== subjectsRequest.current) return;
      setSubjects([]);
      message.error(formatEzPrepError(error, 'Failed to fetch subjects'));
    } finally {
      if (requestId === subjectsRequest.current) {
        setSubjectsLoading(false);
      }
    }
  };

  const fetchDrafts = async () => {
    setDraftsLoading(true);
    try {
      const data = await topicWiseDraftsApi.listDrafts({ page: 1, limit: 20 });
      setDrafts(data.data || []);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch drafts"));
    } finally {
      setDraftsLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const examsList = await catalogApi.listAllExams();
      setExams(
        examsList.map((exam) => ({
          value: exam.id,
          label: exam.name,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, 'Failed to fetch exams'));
    }
  };

  const fetchTopicsBySubject = async (subjectId: string) => {
    setTopicsLoading(true);
    try {
      const { data } = await catalogApi.getSubject(subjectId);
      setTopics(
        (data.topics || []).map((topic) => ({
          value: topic.id,
          label: topic.name,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, 'Failed to fetch topics'));
    } finally {
      setTopicsLoading(false);
    }
  };

  const handleExamChange = (examId?: string) => {
    setFormValue(form, "subject", undefined);
    setFormValue(form, "topic", undefined);
    setTopics([]);
    setSubjects([]);
    if (!examId) {
      subjectsRequest.current += 1;
      setSubjectsLoading(false);
      return;
    }
    void fetchSubjectsForExam(examId);
  };

  const handleSubjectChange = (subjectId?: string) => {
    setFormValue(form, "topic", undefined);
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
    fetchExams();
    fetchDrafts();
  }, []);

  const selectedExam = Form.useWatch("exam", form);
  const selectedSubject = Form.useWatch("subject", form);

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
      const response = await topicWiseDraftsApi.createDraft(payload);
      message.success(response.message || "Topic-wise draft created");
      router.push(`/admin/mock-tests/drafts/${response.data.id}`);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to create mock test"));
      setLoading(false);
    }
  };

  const handleDiscardDraft = (draft: TopicWiseDraftListItem) => {
    showConfirmModal({
      title: "Discard Draft",
      content:
        "Discard this draft? Nothing is written to published mock tests.",
      onConfirm: async () => {
        setDiscardingId(draft.id);
        try {
          const response = await topicWiseDraftsApi.discardDraft(draft.id);
          message.success(response.message || "Draft discarded");
          await fetchDrafts();
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to discard draft"));
        } finally {
          setDiscardingId(null);
        }
      },
    });
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: 'Delete Mock Test',
      content: 'Are you sure you want to delete this mock test? This action cannot be undone.',
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await mockTestsApi.delete(id);
          message.success('Mock test deleted successfully');
          fetchMockTests();
        } catch (error) {
          message.error(formatEzPrepError(error, 'Failed to delete mock test'));
        } finally {
          setTableLoading(false);
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Title level={2}>Topic Wise Tests Management</Title>
        
        <Card title="Create New Topic Wise Test">
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
              accessMode: "FREE",
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
                label="Exam"
                name="exam"
                rules={[{ required: true, message: "Please select an exam" }]}
              >
                <Select
                  placeholder="Select exam"
                  options={exams}
                  showSearch
                  onChange={handleExamChange}
                  filterOption={(input, option: any) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>

              <Form.Item
                label="Subject"
                name="subject"
                rules={[{ required: true, message: "Please select a subject" }]}
              >
                <Select
                  placeholder={
                    selectedExam
                      ? subjectsLoading
                        ? "Loading subjects"
                        : subjects.length > 0
                          ? "Select subject"
                          : "No subjects for this exam"
                      : "Select an exam first"
                  }
                  options={subjects}
                  disabled={!selectedExam || subjectsLoading || subjects.length === 0}
                  loading={subjectsLoading}
                  onChange={handleSubjectChange}
                />
              </Form.Item>

              <Form.Item
                label="Topic"
                name="topic"
              >
                <Select
                  placeholder={
                    !selectedSubject
                      ? "Select a subject first"
                      : topicsLoading
                        ? "Loading topics"
                        : topics.length > 0
                          ? "Select topic"
                          : "No topics for this subject"
                  }
                  options={topics}
                  disabled={!selectedSubject || topicsLoading || topics.length === 0}
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
              <AccessModeSwitch />
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
                Create Draft
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Open Drafts">
          <Table
            rowKey="id"
            loading={draftsLoading}
            dataSource={drafts}
            pagination={false}
            tableLayout="fixed"
            columns={[
              {
                title: "Title",
                dataIndex: "title",
                key: "title",
                width: "10%",
                ellipsis: true,
                render: (title?: string) => (
                  <span title={title || undefined} className="block truncate">
                    {title || "-"}
                  </span>
                ),
              },
              {
                title: "Exam",
                dataIndex: "examName",
                key: "examName",
                width: "16%",
                ellipsis: true,
                render: (name?: string) => (
                  <EllipsisTag color="cyan">{name || "N/A"}</EllipsisTag>
                ),
              },
              {
                title: "Subject",
                dataIndex: "subjectName",
                key: "subjectName",
                width: "16%",
                ellipsis: true,
                render: (name?: string) => (
                  <EllipsisTag color="blue">{name || "N/A"}</EllipsisTag>
                ),
              },
              {
                title: "Topic",
                dataIndex: "topicName",
                key: "topicName",
                width: "16%",
                ellipsis: true,
                render: (name?: string) =>
                  name ? <EllipsisTag color="purple">{name}</EllipsisTag> : "-",
              },
              {
                title: "Questions",
                dataIndex: "totalQuestions",
                key: "totalQuestions",
                width: "9%",
              },
              {
                title: "Duration",
                dataIndex: "durationInMinutes",
                key: "duration",
                width: "9%",
                render: (minutes: number) => `${minutes} mins`,
              },
              {
                title: "Status",
                dataIndex: "status",
                key: "status",
                width: "8%",
                render: (status: string) => <Tag color="blue">{status}</Tag>,
              },
              {
                title: "Actions",
                key: "actions",
                width: "16%",
                render: (record: TopicWiseDraftListItem) => (
                  <Space size={0} wrap>
                    <Button
                      type="link"
                      size="small"
                      className="!px-1"
                      onClick={() =>
                        router.push(`/admin/mock-tests/drafts/${record.id}`)
                      }
                    >
                      Review
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      className="!px-1"
                      danger
                      loading={discardingId === record.id}
                      onClick={() => handleDiscardDraft(record)}
                    >
                      Discard
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Card title="All Mock Tests">
          <Table 
            columns={columns} 
            dataSource={mockTests}
            rowKey="id"
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
