'use client';
import { useEffect, useState } from 'react';
import { Table, Button, Space, message, Pagination, Tag } from 'antd';
import { Select } from '@/app/components/SearchableSelect';
import Link from 'next/link';
import { showConfirmModal } from '@/components/ConfirmModal';
import { catalogApi, formatEzPrepError, questionsApi, refId, refName } from '@/app/services/ezprep-api';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [tableLoading, setTableLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const fetchSubjects = async () => {
    try {
      const data = await catalogApi.listSubjects();
      setSubjects(
        (data.data || []).map((subject) => ({
          _id: subject.id,
          name: subject.name,
          topics: subject.topics,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, 'Failed to fetch subjects'));
    }
  };

  const fetchExams = async () => {
    try {
      const examsList = await catalogApi.listAllExams();
      setExams(examsList.map((exam) => ({ _id: exam.id, name: exam.name })));
    } catch (error) {
      message.error(formatEzPrepError(error, 'Failed to fetch exams'));
    }
  };

  const fetchTopicsBySubject = async (subjectId) => {
    if (!subjectId) {
      setTopics([]);
      return;
    }
    try {
      const { data } = await catalogApi.getSubject(subjectId);
      setTopics(
        (data.topics || []).map((topic) => ({
          _id: topic.id,
          name: topic.name,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, 'Failed to fetch topics'));
      setTopics([]);
    }
  };

  const fetchQuestions = async (page = 1, limit = pagination.pageSize) => {
    setLoading(true);
    try {
      const data = await questionsApi.list({
        page,
        limit,
        subjectId: selectedSubject || undefined,
        examId: selectedExam || undefined,
        topicId: selectedTopic || undefined,
      });
      setQuestions(data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total ?? 0,
        current: data.pagination?.page ?? page,
        pageSize: data.pagination?.limit ?? limit,
      }));
    } catch (error) {
      message.error(formatEzPrepError(error, 'Failed to fetch questions'));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
    fetchExams();
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchTopicsBySubject(selectedSubject);
    } else {
      setTopics([]);
      setSelectedTopic(null);
    }
  }, [selectedSubject]);

  useEffect(() => {
    fetchQuestions(1);
  }, [selectedSubject, selectedExam, selectedTopic]);

  const handleDelete = async (id) => {
    showConfirmModal({
      title: 'Delete Question',
      content: 'Are you sure you want to delete this question? This action cannot be undone.',
      onConfirm: async () => {
        setTableLoading(true);
        try {
            await questionsApi.delete(id);
          fetchQuestions(pagination.current, pagination.pageSize);
          message.success('Question deleted successfully');
        } catch (error) {
          message.error(formatEzPrepError(error, 'Failed to delete question'));
        } finally {
          setTableLoading(false);
        }
      }
    });
  };


  const columns = [
    {
      title: 'Question',
      key: 'question',
      render: (record) => (
        <div>
          <div>{record?.questionText?.en?.text?.length > 20 ? `${record.questionText.en.text.substring(0, 20)}...` : record?.questionText?.en?.text}</div>
          {record?.questionText?.ml?.text && (
            <div className="text-gray-500 mt-1">{record?.questionText?.ml?.text?.length > 20 ? `${record.questionText.ml.text.substring(0, 20)}...` : record?.questionText?.ml?.text}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Subject',
      key: 'subject',
      render: (record) => refName(record.subject) || '-',
    },
    {
      title: 'Difficulty',
      key: 'difficultyLevel',
      render: (record) => {
        const colorMap = {
          easy: 'green',
          medium: 'orange',
          hard: 'red'
        };
        return record.difficultyLevel ? (
          <Tag color={colorMap[record.difficultyLevel]}>
            {record.difficultyLevel.charAt(0).toUpperCase() + record.difficultyLevel.slice(1)}
          </Tag>
        ) : '-';
      },
    },
    {
      title: 'Topic',
      key: 'topic',
      render: (record) => (
        <>
          {record.topic ? (
            <Tag key={refId(record.topic)}>{refName(record.topic) || refId(record.topic)}</Tag>
          ) : '-'}
        </>
      ),
    },
    {
      title: 'Exams',
      key: 'exams',
      render: (record) => (
        <>
          {record.exams?.map((exam) => (
            <Tag key={refId(exam)} color="blue">{refName(exam) || refId(exam)}</Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Link href={`/admin/questions/${record.id}`}>
            <Button type="primary" className="bg-blue-600 hover:bg-blue-700">Edit</Button>
          </Link>
          <Button danger onClick={() => handleDelete(record.id)}>Delete</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Questions</h1>
          <Select
            placeholder="Filter by exam"
            allowClear
            style={{ width: 200 }}
            onChange={(value) => setSelectedExam(value)}
            options={exams?.length > 0 ? exams.map((exam) => ({
              value: exam._id,
              label: exam.name,
            })) : []}
          />
          <Select
            placeholder="Filter by subject"
            allowClear
            style={{ width: 200 }}
            onChange={(value) => {
              setSelectedSubject(value);
              setSelectedTopic(null);
            }}
            options={subjects.map((subject) => ({
              value: subject._id,
              label: subject.name,
            }))}
          />
          <Select
            placeholder="Filter by topic"
            allowClear
            disabled={!selectedSubject}
            style={{ width: 200 }}
            value={selectedTopic}
            onChange={(value) => setSelectedTopic(value)}
            options={topics.map((topic) => ({
              value: topic._id,
              label: topic.name,
            }))}
          />
        </div>
        <Link href="/admin/questions/new">
          <Button type="primary" className="bg-blue-600 hover:bg-blue-700">Add Question</Button>
        </Link>
      </div>
      <Table 
        columns={columns} 
        dataSource={questions}
        rowKey="id"
        loading={tableLoading || loading}
        pagination={false}
      />
      <div className="mt-4 flex justify-end">
        <Pagination
          current={pagination.current}
          total={pagination.total}
          pageSize={pagination.pageSize}
          showSizeChanger
          pageSizeOptions={['10', '20', '50']}
          onChange={(page, pageSize) => fetchQuestions(page, pageSize)}
        />
      </div>
    </div>
  );
} 