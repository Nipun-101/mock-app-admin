"use client";

import { Button, Card, Descriptions, Tag, Table, Space, message, Spin } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MockTestDetailPage({ params }: { params: { id: string } }) {
  const [mockTest, setMockTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchMockTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchMockTest = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/mock-test/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setMockTest(data);
      } else {
        message.error('Failed to fetch mock test details');
        router.push('/admin/mock-tests');
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to fetch mock test details');
      router.push('/admin/mock-tests');
    } finally {
      setLoading(false);
    }
  };

  const questionColumns = [
    {
      title: "Question",
      key: "question",
      render: (record: any) => (
        <div>
          <div>{record?.questionText?.en?.text?.substring(0, 100)}...</div>
        </div>
      ),
    },
    {
      title: "Subject",
      key: "subject",
      render: (record: any) => (
        <Tag color="blue">{record?.subject?.name || 'N/A'}</Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!mockTest) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/admin/mock-tests')}
          >
            Back to Mock Tests
          </Button>
          <h1 className="text-2xl font-bold">{mockTest.title}</h1>
        </div>

        <Card title="Mock Test Details">
          <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
            <Descriptions.Item label="Title">{mockTest.title}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={mockTest.isActive ? 'green' : 'red'}>
                {mockTest.isActive ? 'Active' : 'Inactive'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Duration">{mockTest.durationInMinutes} minutes</Descriptions.Item>
            <Descriptions.Item label="Total Questions">{mockTest.totalQuestions}</Descriptions.Item>
            <Descriptions.Item label="Marks Per Question">{mockTest.marksPerQuestion}</Descriptions.Item>
            <Descriptions.Item label="Negative Marking">{mockTest.negativeMarking}</Descriptions.Item>
            <Descriptions.Item label="Passing Score">{mockTest.passingScore || 'Not set'}</Descriptions.Item>
            <Descriptions.Item label="Generation Mode">
              <Tag>{mockTest.generationMode}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Allow Retake">
              <Tag color={mockTest.allowRetake ? 'green' : 'red'}>
                {mockTest.allowRetake ? 'Yes' : 'No'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Shuffle Options">
              <Tag color={mockTest.shuffleOptions ? 'green' : 'red'}>
                {mockTest.shuffleOptions ? 'Yes' : 'No'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Show Results Immediately">
              <Tag color={mockTest.showResultsImmediately ? 'green' : 'red'}>
                {mockTest.showResultsImmediately ? 'Yes' : 'No'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Subjects">
              {mockTest.subjects?.map((subject: any) => (
                <Tag key={subject._id} color="blue">{subject.name}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {mockTest.description || 'No description'}
            </Descriptions.Item>
            <Descriptions.Item label="Created At" span={2}>
              {new Date(mockTest.createdAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title={`Questions (${mockTest.questionIds?.length || 0})`}>
          <Table 
            columns={questionColumns}
            dataSource={mockTest.questionIds}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>
    </div>
  );
}
