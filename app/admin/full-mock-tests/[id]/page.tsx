"use client";

import { use, useEffect, useState } from "react";
import { Button, Card, Descriptions, Table, Tag, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { formatEzPrepError, fullMockApi } from "../api";
import { PageLoader } from "@/app/components/PageLoader";
import type { FullMockSubjectConfig, FullMockTestListItem } from "../types";

export default function PublishedFullMockPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const [test, setTest] = useState<FullMockTestListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fullMockApi.getPublished(params.id);
        setTest(response.data);
      } catch (error) {
        message.error(
          formatEzPrepError(error, "Failed to fetch full mock test")
        );
        router.push("/admin/full-mock-tests");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params.id, router]);

  const subjectColumns = [
    {
      title: "Subject",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Questions",
      dataIndex: "numberOfQuestions",
      key: "numberOfQuestions",
    },
    {
      title: "Marks / Q",
      dataIndex: "marksPerQuestion",
      key: "marksPerQuestion",
    },
    {
      title: "Negative",
      key: "negative",
      render: (record: FullMockSubjectConfig) =>
        record.hasNegativeMarking
          ? `-${record.negativeMarksPerQuestion}`
          : "None",
    },
    {
      title: "Session",
      dataIndex: "sessionTime",
      key: "sessionTime",
      render: (sessionTime?: number) =>
        sessionTime != null ? `${sessionTime} mins` : "-",
    },
    {
      title: "Range",
      key: "range",
      render: (record: FullMockSubjectConfig) =>
        `Q${record.questionStartIndex + 1}–Q${record.questionEndIndex + 1}`,
    },
  ];

  if (loading) {
    return <PageLoader />;
  }

  if (!test) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/admin/full-mock-tests")}
          >
            Back to Full Mock Tests
          </Button>
          <h1 className="text-2xl font-bold">
            {test.title || "Full Mock Test"}
          </h1>
        </div>

        <Card title="Full Mock Test Details">
          <Descriptions
            bordered
            column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
          >
            <Descriptions.Item label="Title">
              {test.title || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={test.isActive ? "green" : "red"}>
                {test.isActive ? "Active" : "Inactive"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Exam">
              <Tag color="cyan">{test.exam?.name || "N/A"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Mode">
              <Tag color={test.isSessionWise ? "purple" : "blue"}>
                {test.isSessionWise ? "Session-wise" : "Mixed"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Total Questions">
              {test.totalQuestions}
            </Descriptions.Item>
            <Descriptions.Item label="Duration">
              {test.durationInMinutes} minutes
            </Descriptions.Item>
            <Descriptions.Item label="Total Marks">
              {test.totalMarks ?? "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Passing Score">
              {test.passingScore ?? "Not set"}
            </Descriptions.Item>
            <Descriptions.Item label="Marks Per Question">
              {test.marksPerQuestion}
            </Descriptions.Item>
            <Descriptions.Item label="Negative Marking">
              {test.negativeMarking}
            </Descriptions.Item>
            <Descriptions.Item label="Allow Retake">
              <Tag color={test.allowRetake ? "green" : "red"}>
                {test.allowRetake ? "Yes" : "No"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Shuffle Options">
              <Tag color={test.shuffleOptions ? "green" : "red"}>
                {test.shuffleOptions ? "Yes" : "No"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Show Results Immediately" span="filled">
              <Tag color={test.showResultsImmediately ? "green" : "red"}>
                {test.showResultsImmediately ? "Yes" : "No"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item
              label="Description"
              span={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
            >
              {test.description || "No description"}
            </Descriptions.Item>
            <Descriptions.Item
              label="Created At"
              span={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
            >
              {test.createdAt
                ? new Date(test.createdAt).toLocaleString()
                : "N/A"}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title={`Subjects (${test.subjectConfig?.length || 0})`}>
          <Table
            columns={subjectColumns}
            dataSource={test.subjectConfig}
            rowKey={(record) =>
              `${record.subject}-${record.questionStartIndex}`
            }
            pagination={false}
          />
        </Card>
      </div>
    </div>
  );
}
