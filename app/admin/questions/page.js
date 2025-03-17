'use client';
import { useEffect, useState } from 'react';
import { Table, Button, Space, message, Pagination, Tag, Select } from 'antd';
import Link from 'next/link';
import { showConfirmModal } from '@/components/ConfirmModal';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`/api/subject/list?page=1&limit=${Number.MAX_SAFE_INTEGER}`);
      const data = await res.json();
      setSubjects(data.subjects);
    } catch (error) {
      message.error('Failed to fetch subjects');
    }
  };

  const fetchExams = async () => {
    try {
      const res = await fetch(`/api/exam/list?page=1&limit=${Number.MAX_SAFE_INTEGER}`);
      const data = await res.json();
      setExams(data.exams);
    } catch (error) {
      message.error('Failed to fetch exams');
    }
  };

  const fetchTagsBySubject = async (subjectId) => {
    if (!subjectId) {
      setTags([]);
      return;
    }
    try {
      const res = await fetch(`/api/tag/subject/${subjectId}`);
      const data = await res.json();
      setTags(data.tags);
    } catch (error) {
      message.error('Failed to fetch tags');
      setTags([]);
    }
  };

  const fetchQuestions = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const subjectQuery = selectedSubject ? `&subject=${selectedSubject}` : '';
      const examQuery = selectedExam ? `&exam=${selectedExam}` : '';
      const tagQuery = selectedTag ? `&tag=${selectedTag}` : '';
      const res = await fetch(`/api/question/list?page=${page}&limit=${limit}${subjectQuery}${examQuery}${tagQuery}`);
      const data = await res.json();
      setQuestions(data.questions);
      setPagination({
        ...pagination,
        total: data.pagination.total,
        current: page
      });
    } catch (error) {
      message.error('Failed to fetch questions');
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
      fetchTagsBySubject(selectedSubject);
    } else {
      setTags([]);
      setSelectedTag(null);
    }
  }, [selectedSubject]);

  useEffect(() => {
    fetchQuestions(1);
  }, [selectedSubject, selectedExam, selectedTag]);

  const handleDelete = async (id) => {
    showConfirmModal({
      title: 'Delete Question',
      content: 'Are you sure you want to delete this question? This action cannot be undone.',
      onConfirm: async () => {
        setTableLoading(true);
        try {
            const response = await fetch(`/api/question/${id}`, {
            method: "DELETE"
          });
          const data = await response.json();
          fetchQuestions(pagination.current);
          message.success('Question deleted successfully');
        } catch (error) {
          console.error(error);
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
      dataIndex: ['subject', 'name'],
      key: 'subject',
    },
    {
      title: 'Tags',
      key: 'tags',
      render: (record) => (
        <>
          {record.tags?.map((tag) => (
            <Tag key={tag._id}>{tag.name}</Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Exams',
      key: 'exams',
      render: (record) => (
        <>
          {record.exams?.map((exam) => (
            <Tag key={exam._id} color="blue">{exam.name}</Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Link href={`/admin/questions/${record._id}`}>
            <Button type="primary" className="bg-blue-600 hover:bg-blue-700">Edit</Button>
          </Link>
          <Button danger onClick={() => handleDelete(record._id)}>Delete</Button>
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
            options={exams.map((exam) => ({
              value: exam._id,
              label: exam.name,
            }))}
          />
          <Select
            placeholder="Filter by subject"
            allowClear
            style={{ width: 200 }}
            onChange={(value) => {
              setSelectedSubject(value);
              setSelectedTag(null);
            }}
            options={subjects.map((subject) => ({
              value: subject._id,
              label: subject.name,
            }))}
          />
          <Select
            placeholder="Filter by tag"
            allowClear
            disabled={!selectedSubject}
            style={{ width: 200 }}
            value={selectedTag}
            onChange={(value) => setSelectedTag(value)}
            options={tags.map((tag) => ({
              value: tag._id,
              label: tag.name,
            }))}
          />
        </div>
        <Link href="/admin">
          <Button type="primary" className="bg-blue-600 hover:bg-blue-700">Add Question</Button>
        </Link>
      </div>
      <Table 
        columns={columns} 
        dataSource={questions}
        rowKey="_id"
        loading={tableLoading || loading}
        pagination={false}
      />
      <div className="mt-4 flex justify-end">
        <Pagination
          current={pagination.current}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onChange={(page) => fetchQuestions(page)}
        />
      </div>
    </div>
  );
} 