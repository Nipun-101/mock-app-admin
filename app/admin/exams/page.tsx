"use client";

import { Button, Card, Form, Input, InputNumber, Select, Table, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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
      title: "Subjects",
      dataIndex: "subject",
      key: "subject",
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

  useEffect(() => {
    fetchExams();
  }, [pagination.current, pagination.pageSize]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/exam", {
        method: "POST",
        body: JSON.stringify(values),
      });
      const data = await response.json();
      console.log(data);
      form.resetFields();
      fetchExams();
    } catch (error) {
      console.error(error);
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
              label="Description"
              name="description"
              //rules={[{ required: true, message: "Please enter description" }]}
            >
              <Input.TextArea placeholder="Enter description" size="large" />
            </Form.Item>

            <Form.Item
              label="Subjects"
              name="subject"
              // rules={[{ required: true, message: "Please select subjects" }]}
            >
                <Select
                  placeholder="Select subjects"
                  size="large"
                  mode="multiple"
                  options={[
                    { value: "math", label: "Mathematics" },
                    { value: "science", label: "Science" },
                    { value: "english", label: "English" },
                    { value: "hindi", label: "Hindi" },
                    { value: "urdu", label: "Urdu" },
                    { value: "sanskrit", label: "Sanskrit" },
                  ]}
                />
            </Form.Item>

            <Form.Item
              label="Duration (minutes)"
              name="duration"
              // rules={[{ required: true, message: "Please enter duration" }]}
            >
              <InputNumber min={1} className="w-full" size="large" />
            </Form.Item>

            <Form.Item
              label="Total Questions"
              name="totalQuestions"
              // rules={[{ required: true, message: "Please enter total questions" }]}
            >
              <InputNumber min={1} className="w-full" size="large" />
            </Form.Item>

            <Form.Item
              label="Passing Score (%)"
              name="passingScore"
              // rules={[{ required: true, message: "Please enter passing score" }]}
            >
              <InputNumber min={1} max={100} className="w-full" size="large" />
            </Form.Item>
          </div>

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