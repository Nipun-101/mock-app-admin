"use client";

import { Divider, Form, InputNumber, Space, Typography } from "antd";
import type { InputNumberProps } from "antd";

const { Text } = Typography;

function PercentCutoff(props: InputNumberProps) {
  return (
    <Space.Compact className="w-full" size="large">
      <InputNumber {...props} className="w-full" size="large" />
      <Space.Addon>%</Space.Addon>
    </Space.Compact>
  );
}

export function ResultMessageFields() {
  return (
    <>
      <Divider orientation="left">Result messages</Divider>
      <Text type="secondary" className="mb-4 block">
        Students see a message from their score percent (marks earned / max marks).
        Needs more improvement applies below the Good cutoff, with a positive tone.
      </Text>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Form.Item
          label="Good (from %)"
          name="resultGood"
          rules={[
            { required: true, message: "Enter the Good cutoff" },
            {
              type: "number",
              min: 1,
              max: 98,
              message: "Use a percent from 1 to 98",
            },
          ]}
        >
          <PercentCutoff min={1} max={98} />
        </Form.Item>

        <Form.Item
          label="Very good (from %)"
          name="resultVeryGood"
          dependencies={["resultGood"]}
          rules={[
            { required: true, message: "Enter the Very good cutoff" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const good = getFieldValue("resultGood");
                if (typeof value !== "number") {
                  return Promise.reject(new Error("Enter the Very good cutoff"));
                }
                if (typeof good === "number" && value <= good) {
                  return Promise.reject(new Error("Must be higher than Good"));
                }
                if (value > 99) {
                  return Promise.reject(new Error("Use 99 or less"));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <PercentCutoff min={1} max={99} />
        </Form.Item>

        <Form.Item
          label="Excellent (from %)"
          name="resultExcellent"
          dependencies={["resultVeryGood"]}
          rules={[
            { required: true, message: "Enter the Excellent cutoff" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const veryGood = getFieldValue("resultVeryGood");
                if (typeof value !== "number") {
                  return Promise.reject(new Error("Enter the Excellent cutoff"));
                }
                if (typeof veryGood === "number" && value <= veryGood) {
                  return Promise.reject(new Error("Must be higher than Very good"));
                }
                if (value > 100) {
                  return Promise.reject(new Error("Use 100 or less"));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <PercentCutoff min={1} max={100} />
        </Form.Item>
      </div>
    </>
  );
}
