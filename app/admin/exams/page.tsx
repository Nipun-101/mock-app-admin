"use client";

import { Button, Card, Form, Input, InputNumber, Select, Table, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Breakpoint } from 'antd/es/_util/responsiveObserver';

const { Title } = Typography;

export default function ExamsPage() {
  const [form] = Form.useForm();

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
      render: (duration: number) => `${duration} mins`,
    },
    {
      title: "Questions",
      dataIndex: "totalQuestions",
      key: "totalQuestions",
      responsive: ['sm', 'md', 'lg', 'xl', 'xxl'] as Breakpoint[],
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
    },
    {
      title: "Actions",
      key: "actions",
      render: () => (
        <Button type="link" size="small">
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title={<Title level={4} className="mb-0">Add New Exam</Title>}
        className="w-full shadow-sm"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => console.log(values)}
          className="max-w-4xl"
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
              label="Subject"
              name="subject"
              rules={[{ required: true, message: "Please select subject" }]}
            >
              <Select
                placeholder="Select subject"
                size="large"
                options={[
                  { value: "math", label: "Mathematics" },
                  { value: "science", label: "Science" },
                  { value: "english", label: "English" },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Duration (minutes)"
              name="duration"
              rules={[{ required: true, message: "Please enter duration" }]}
            >
              <InputNumber min={1} className="w-full" size="large" />
            </Form.Item>

            <Form.Item
              label="Total Questions"
              name="totalQuestions"
              rules={[{ required: true, message: "Please enter total questions" }]}
            >
              <InputNumber min={1} className="w-full" size="large" />
            </Form.Item>

            <Form.Item
              label="Passing Score (%)"
              name="passingScore"
              rules={[{ required: true, message: "Please enter passing score" }]}
            >
              <InputNumber min={1} max={100} className="w-full" size="large" />
            </Form.Item>

            <Form.Item
              label="Tags"
              name="tags"
            >
              <Select
                mode="tags"
                placeholder="Select or add tags"
                size="large"
                options={[
                  { value: "easy", label: "Easy" },
                  { value: "medium", label: "Medium" },
                  { value: "hard", label: "Hard" },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item className="mb-0">
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              icon={<PlusOutlined />}
              className="bg-blue-600 hover:bg-blue-700"
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
          dataSource={[]} 
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