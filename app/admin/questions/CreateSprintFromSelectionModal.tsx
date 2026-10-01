"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Switch,
  message,
} from "antd";
import { Select } from "@/app/components/SearchableSelect";
import { useRouter } from "next/navigation";
import { formatEzPrepError, sprintTestsApi } from "@/app/admin/sprint-tests/api";
import { SPRINT_SIZE_OPTIONS } from "@/app/admin/sprint-tests/types";
import { QuestionPreview } from "@/app/admin/full-mock-tests/QuestionPreview";
import {
  sharedExamIds,
  type SelectedSprintQuestion,
} from "./sprint-selection";

const enabledButtonClass =
  "!bg-[#eb2f96] hover:!bg-[#c41d7f] !text-white !border-[#eb2f96]";

function RowExpandButton({
  expanded,
  disabled,
  onClick,
}: {
  expanded: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={expanded ? "Collapse question" : "Expand question"}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={onClick}
      className="relative mt-0.5 h-[17px] w-[17px] shrink-0 rounded-[4px] border border-neutral-300 bg-white p-0 text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="absolute left-[3px] right-[3px] top-[7px] h-px bg-current" />
      {expanded ? null : (
        <span className="absolute bottom-[3px] left-[7px] top-[3px] w-px bg-current" />
      )}
    </button>
  );
}

export function CreateSprintFromSelectionModal({
  open,
  questions,
  exams,
  onClose,
  onCreated,
}: {
  open: boolean;
  questions: SelectedSprintQuestion[];
  exams: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const examId = Form.useWatch("examId", form);
  const durationInMinutes = Form.useWatch("durationInMinutes", form);
  const marksPerQuestion = Form.useWatch("marksPerQuestion", form);
  const negativeMarking = Form.useWatch("negativeMarking", form);
  const sharedIds = sharedExamIds(questions);
  const examOptions = exams.filter((exam) => sharedIds.includes(exam.id));
  const requiredReady =
    Boolean(examId) &&
    durationInMinutes != null &&
    marksPerQuestion !== null &&
    negativeMarking !== null &&
    examOptions.length > 0;

  const closeAndReset = () => {
    form.resetFields();
    setExpandedId(null);
    setCreating(false);
    onClose();
  };

  const handleCreate = async (values: {
    examId: string;
    durationInMinutes: number;
    title?: string;
    description?: string;
    marksPerQuestion?: number;
    negativeMarking?: number;
    passingScore?: number;
    allowRetake?: boolean;
    shuffleOptions?: boolean;
    showResultsImmediately?: boolean;
  }) => {
    setCreating(true);
    try {
      const response = await sprintTestsApi.createDraft({
        ...values,
        totalQuestions: questions.length,
        questionIds: questions.map((question) => question.id),
      });
      message.success(response.message || "Sprint draft created");
      form.resetFields();
      setExpandedId(null);
      onCreated();
      router.push(`/admin/sprint-tests/drafts/${response.data.id}`);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to create sprint draft"));
      setCreating(false);
    }
  };

  return (
    <Modal
      title={`Create sprint test (${questions.length} questions)`}
      open={open}
      onCancel={closeAndReset}
      footer={null}
      width={760}
      destroyOnHidden
    >
      {examOptions.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="These questions do not share an exam tag"
          description="Every question on a sprint must be tagged to the same exam. Change the selection, then try again."
        />
      ) : null}
      <div className="mb-4 max-h-64 overflow-auto rounded border border-neutral-200">
        {questions.map((question, index) => {
          const expanded = expandedId === question.id;
          return (
            <div key={question.id} className="border-b border-neutral-100 last:border-b-0">
              <div className="flex items-start gap-3 px-3 py-2">
                <RowExpandButton
                  expanded={expanded}
                  disabled={!question.preview}
                  onClick={() => setExpandedId(expanded ? null : question.id)}
                />
                <span className="text-neutral-500">{index + 1}.</span>
                <span>{question.snippet}</span>
              </div>
              {expanded && question.preview ? (
                <div className="bg-neutral-50 px-3 pb-3">
                  <QuestionPreview question={question.preview} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleCreate}
        initialValues={{
          marksPerQuestion: 1,
          negativeMarking: 0,
          allowRetake: true,
          shuffleOptions: false,
          showResultsImmediately: true,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            label="Exam"
            name="examId"
            rules={[{ required: true, message: "Please select an exam" }]}
          >
            <Select
              placeholder="Exam shared by every selected question"
              options={examOptions.map((exam) => ({
                value: exam.id,
                label: exam.name,
              }))}
              disabled={examOptions.length === 0}
            />
          </Form.Item>
          <Form.Item
            label="Duration (Minutes)"
            name="durationInMinutes"
            rules={[{ required: true, message: "Please select duration" }]}
          >
            <Select placeholder="Select duration">
              {SPRINT_SIZE_OPTIONS.map((size) => (
                <Select.Option key={size} value={size}>
                  {size} Minutes
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Test Title" name="title">
            <Input placeholder="Optional title" />
          </Form.Item>
          <Form.Item
            label="Marks Per Question"
            name="marksPerQuestion"
            rules={[{ required: true, message: "Please enter marks per question" }]}
          >
            <InputNumber min={0} step={0.5} className="w-full" />
          </Form.Item>
          <Form.Item
            label="Negative Marking"
            name="negativeMarking"
            rules={[{ required: true, message: "Please enter negative marking" }]}
          >
            <InputNumber min={0} step={0.25} className="w-full" />
          </Form.Item>
          <Form.Item label="Passing Score" name="passingScore">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={3} placeholder="Optional description" />
        </Form.Item>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Form.Item label="Allow Retake" name="allowRetake" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Shuffle Options" name="shuffleOptions" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            label="Show Results Immediately"
            name="showResultsImmediately"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </div>
        <Button
          type="primary"
          htmlType="submit"
          loading={creating}
          disabled={!requiredReady || creating}
          className={requiredReady ? enabledButtonClass : undefined}
        >
          Create Draft
        </Button>
      </Form>
    </Modal>
  );
}
