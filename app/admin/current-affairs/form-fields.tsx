"use client";

import { DatePicker, Form, Input } from "antd";
import type { DatePickerProps } from "antd";
import { ImageUpload } from "@/app/components/ImageUpload";
import { dateKeyToDayjs, datePickerValueFromEvent } from "./date-key";

export const affairCardClassName = "w-full shadow-sm";

export const affairCardStyles = {
  header: { padding: "16px 16px 12px" },
  body: { padding: "16px" },
};

export function AffairDatePicker({ className, ...props }: DatePickerProps) {
  return (
    <DatePicker
      allowClear={false}
      format="YYYY-MM-DD"
      className={className ?? "w-full min-h-11"}
      size="large"
      inputReadOnly
      getPopupContainer={() => document.body}
      {...props}
    />
  );
}

export function CurrentAffairFormFields({
  onImageUploadingChange,
}: {
  onImageUploadingChange?: (uploading: boolean) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-4">
        <Form.Item
          label="Title"
          name="title"
          rules={[{ required: true, message: "Please enter a title" }]}
        >
          <Input
            placeholder="Headline for this event"
            size="large"
            className="text-base"
          />
        </Form.Item>

        <Form.Item
          label="Date"
          name="date"
          rules={[{ required: true, message: "Please select a date" }]}
          getValueFromEvent={datePickerValueFromEvent}
          getValueProps={(value: string | undefined) => ({
            value: dateKeyToDayjs(value),
          })}
        >
          <AffairDatePicker />
        </Form.Item>
      </div>

      <Form.Item
        label="Description"
        name="description"
        rules={[{ required: true, message: "Please enter a description" }]}
      >
        <Input.TextArea
          placeholder="Details about the event"
          size="large"
          className="text-base"
          autoSize={{ minRows: 3, maxRows: 8 }}
        />
      </Form.Item>

      <Form.Item label="Memory trick" name="memoryTrick">
        <Input.TextArea
          placeholder="Optional mnemonic"
          size="large"
          className="text-base"
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </Form.Item>

      <div className="overflow-x-auto">
        <ImageUpload
          name={["image"]}
          label="Image (optional)"
          onUploadingChange={onImageUploadingChange}
        />
      </div>
    </>
  );
}
