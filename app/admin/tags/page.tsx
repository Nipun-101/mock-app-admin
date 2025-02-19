"use client";

import { Button, Card, Form, Input, Table, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Breakpoint } from 'antd/es/_util/responsiveObserver';

const { Title } = Typography;

export default function TagsPage() {
  const [form] = Form.useForm();

  const columns = [
    {
      title: "Tag Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      responsive: ['sm', 'md', 'lg', 'xl', 'xxl'] as Breakpoint[],
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
        title={<Title level={4} className="mb-0">Add New Tag</Title>}
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
              label="Tag Name"
              name="name"
              rules={[{ required: true, message: "Please enter tag name" }]}
            >
              <Input placeholder="Enter tag name" size="large" />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
              rules={[{ required: true, message: "Please enter description" }]}
            >
              <Input.TextArea 
                placeholder="Enter tag description" 
                size="large"
                autoSize={{ minRows: 2, maxRows: 6 }}
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
              Create Tag
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card 
        title={<Title level={4} className="mb-0">Tags List</Title>}
        className="shadow-sm"
      >
        <Table 
          columns={columns} 
          dataSource={[]} 
          scroll={{ x: true }}
          pagination={{
            position: ["bottomCenter"],
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} tags`,
          }}
        />
      </Card>
    </div>
  );
}