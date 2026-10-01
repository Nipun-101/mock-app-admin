"use client";

import { use, useEffect, useState } from "react";
import { Button, Card, Descriptions, Table, Tag, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { formatEzPrepError, sprintTestsApi } from "../api";
import { PageLoader } from "@/app/components/PageLoader";
import { QuestionPreview } from "@/app/admin/full-mock-tests/QuestionPreview";
import type { SafeQuestion } from "@/app/admin/full-mock-tests/types";
import type { SprintQuestionItem, SprintTest } from "../types";

export default function PublishedSprintPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [test, setTest] = useState<SprintTest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await sprintTestsApi.getPublished(params.id);
        setTest(response.data);
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to fetch sprint test"));
        router.push("/admin/sprint-tests");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params.id, router]);

  if (loading || !test) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/admin/sprint-tests")}>
            Back to Sprint Tests
          </Button>
          <h1 className="text-2xl font-bold">{test.title || "Sprint Test"}</h1>
        </div>
        <Card title="Sprint Test Details">
          <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
            <Descriptions.Item label="Title">{test.title || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={test.isActive ? "green" : "red"}>
                {test.isActive ? "Active" : "Inactive"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Exam">
              <Tag color="cyan">{test.exam?.name || "N/A"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Questions">{test.totalQuestions}</Descriptions.Item>
            <Descriptions.Item label="Duration">{test.durationInMinutes} minutes</Descriptions.Item>
            <Descriptions.Item label="Marks Per Question">{test.marksPerQuestion}</Descriptions.Item>
            <Descriptions.Item label="Negative Marking">{test.negativeMarking}</Descriptions.Item>
            <Descriptions.Item label="Passing Score">{test.passingScore ?? "Not set"}</Descriptions.Item>
            <Descriptions.Item label="Description">
              {test.description || "No description"}
            </Descriptions.Item>
          </Descriptions>
        </Card>
        <Card title={`Questions (${test.questions?.length || 0})`}>
          <Table
            rowKey="_id"
            dataSource={test.questions || []}
            pagination={{ pageSize: 10 }}
            expandable={{
              expandedRowRender: (record: SprintQuestionItem) => (
                <QuestionPreview question={record as SafeQuestion} />
              ),
            }}
            columns={[
              {
                title: "#",
                dataIndex: "position",
                key: "position",
                render: (position: number) => position + 1,
              },
              {
                title: "Question",
                key: "question",
                render: (record: SprintQuestionItem) =>
                  record.questionText?.en?.text?.slice(0, 120) || "Question",
              },
              {
                title: "Difficulty",
                dataIndex: "difficultyLevel",
                key: "difficulty",
                render: (level?: string) => level || "-",
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
