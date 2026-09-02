"use client";

import { Button, DatePicker, Form, Input } from "antd";
import type { DatePickerProps } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ImageUpload } from "@/app/components/ImageUpload";
import { PasteToImage } from "@/app/components/PasteToImage";
import {
  MAX_DESCRIPTION_POINTS,
  normalizeDescriptionForSubmit,
} from "./description";
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

export function normalizeCurrentAffairDescription(values: {
  description?: string[];
}) {
  return normalizeDescriptionForSubmit(values.description);
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
        extra={`Optional bullet points (up to ${MAX_DESCRIPTION_POINTS})`}
      >
        <Form.List name="description">
          {(fields, { add, remove }) => (
            <div className="space-y-2">
              {fields.length === 0 ? (
                <p className="mb-0 text-sm text-neutral-500">
                  No bullet points yet. Add one below.
                </p>
              ) : null}
              {fields.map((field, index) => {
                const { key, ...listField } = field;
                return (
                <div key={key} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-3 w-4 shrink-0 text-center text-base leading-none text-neutral-400"
                  >
                    •
                  </span>
                  <Form.Item
                    {...listField}
                    validateTrigger={["onChange", "onBlur"]}
                    className="mb-0 min-w-0 flex-1"
                    rules={[
                      { required: true, message: "Bullet point cannot be empty" },
                      {
                        min: 2,
                        message: "Each bullet must be at least 2 characters",
                      },
                      {
                        max: 500,
                        message: "Each bullet cannot exceed 500 characters",
                      },
                    ]}
                  >
                    <Input.TextArea
                      placeholder={`Bullet point ${index + 1}`}
                      size="large"
                      className="text-base"
                      autoSize={{ minRows: 1, maxRows: 4 }}
                    />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    aria-label={`Remove bullet point ${index + 1}`}
                    icon={<DeleteOutlined />}
                    className="mt-1 shrink-0"
                    onClick={() => remove(field.name)}
                  />
                </div>
                );
              })}
              {fields.length < MAX_DESCRIPTION_POINTS ? (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  className="w-full sm:w-auto"
                  onClick={() => add("")}
                >
                  Add bullet point
                </Button>
              ) : null}
            </div>
          )}
        </Form.List>
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
        <PasteToImage target={["image"]} variant="zone" className="p-3">
          <ImageUpload
            name={["image"]} 
            label="Image (optional)"
            onUploadingChange={onImageUploadingChange}
          />
        </PasteToImage>
      </div>
    </>
  );
}
