"use client";

import { Button, Card, Form, Select, Upload, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { catalogApi, ezPrepApiClient } from "@/app/services/ezprep-api";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import { BulkUploadPdfResponse, LookupItem } from "../types";

export default function BulkUploadFormPage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<LookupItem[]>([]);
  const [topics, setTopics] = useState<LookupItem[]>([]);
  const [tags, setTags] = useState<LookupItem[]>([]);
  const [exams, setExams] = useState<LookupItem[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const selectedSubject = Form.useWatch("subjectId", form);
  const selectedTopic = Form.useWatch("topicId", form);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [subjectData, examData] = await Promise.all([
          catalogApi.listSubjects(),
          catalogApi.listAllExams(),
        ]);
        setSubjects(
          (subjectData.data || []).map((subject) => ({
            _id: subject.id,
            name: subject.name,
            topics: (subject.topics || []).map((topic) => ({
              _id: topic.id,
              name: topic.name,
            })),
          }))
        );
        setExams(examData.map((exam) => ({ _id: exam.id, name: exam.name })));
      } catch {
        message.error("Failed to load form options");
      }
    };
    fetchLookups();
  }, []);

  useEffect(() => {
    form.setFieldValue("topicId", undefined);
    form.setFieldValue("tagIds", undefined);
    setTags([]);

    if (!selectedSubject) {
      setTopics([]);
      return;
    }

    const subject = subjects.find((s) => s._id === selectedSubject);
    setTopics(subject?.topics ?? []);
  }, [selectedSubject, subjects, form]);

  useEffect(() => {
    form.setFieldValue("tagIds", undefined);
    setTags([]);

    if (!selectedSubject || !selectedTopic) return;

    const fetchTags = async () => {
      try {
        const tags = await catalogApi.listAllTags({
          subjectId: selectedSubject,
          topicId: selectedTopic,
        });
        setTags(
          tags.map((tag) => ({
            _id: tag.id,
            name: tag.name,
          }))
        );
      } catch {
        message.error("Failed to fetch tags");
      }
    };
    fetchTags();
  }, [selectedSubject, selectedTopic, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (fileList.length === 0) {
        message.error("Please upload a PDF file");
        return;
      }

      const file = fileList[0].originFileObj;
      if (!file) {
        message.error("Invalid file");
        return;
      }

      setSubmitting(true);

      const formData = new FormData();
      formData.append("subjectId", values.subjectId);
      formData.append("topicId", values.topicId);
      formData.append("file", file);

      for (const examId of values.examIds as string[]) {
        formData.append("examIds", examId);
      }

      const tagIds = values.tagIds as string[] | undefined;
      if (tagIds?.length) {
        for (const tagId of tagIds) {
          formData.append("tagIds", tagId);
        }
      }

      const response = await ezPrepApiClient.post<BulkUploadPdfResponse>(
        "/v1/imports/upload-pdf",
        formData
      );

      message.success(response.message || "PDF uploaded successfully");
      router.push("/admin/bulk-upload");
    } catch (error) {
      if (error instanceof EzPrepApiError) {
        message.error(error.message);
      } else if (!(error as { errorFields?: unknown }).errorFields) {
        message.error("Failed to upload PDF");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Upload PDF</h1>
        <Button onClick={() => router.push("/admin/bulk-upload")}>Cancel</Button>
      </div>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="file"
            label="PDF File"
            rules={[{ required: true, message: "Please upload a PDF file" }]}
          >
            <Upload.Dragger
              accept=".pdf,application/pdf"
              maxCount={1}
              fileList={fileList}
              beforeUpload={(file) => {
                const isPdf =
                  file.type === "application/pdf" ||
                  file.name.toLowerCase().endsWith(".pdf");
                if (!isPdf) {
                  message.error("Only PDF files are accepted");
                  return Upload.LIST_IGNORE;
                }
                setFileList([
                  {
                    uid: file.uid,
                    name: file.name,
                    status: "done",
                    originFileObj: file,
                  },
                ]);
                form.setFieldValue("file", file);
                return false;
              }}
              onRemove={() => {
                setFileList([]);
                form.setFieldValue("file", undefined);
              }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                Click or drag a PDF file to upload
              </p>
              <p className="ant-upload-hint">Only PDF files are accepted</p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item
            name="subjectId"
            label="Subject"
            rules={[{ required: true, message: "Please select a subject" }]}
          >
            <Select
              placeholder="Select subject"
              options={subjects.map((s) => ({ value: s._id, label: s.name }))}
            />
          </Form.Item>

          <Form.Item
            name="topicId"
            label="Topic"
            rules={[{ required: true, message: "Please select a topic" }]}
          >
            <Select
              placeholder="Select topic"
              disabled={!selectedSubject}
              options={topics.map((t) => ({ value: t._id, label: t.name }))}
            />
          </Form.Item>

          <Form.Item name="tagIds" label="Tags (optional)">
            <Select
              mode="multiple"
              placeholder="Select tags"
              disabled={!selectedSubject || !selectedTopic}
              options={tags.map((t) => ({ value: t._id, label: t.name }))}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="examIds"
            label="Associated Exams"
            rules={[
              { required: true, message: "Please select at least one exam" },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select exams"
              options={exams.map((e) => ({ value: e._id, label: e.name }))}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Upload
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
