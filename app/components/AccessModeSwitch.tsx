"use client";

import { Form, Switch } from "antd";

export type PaperAccessMode = "FREE" | "ENTITLED";

export function AccessModeSwitch() {
  return (
    <Form.Item
      label="Requires entitlement"
      name="accessMode"
      tooltip="Off saves this test as free. On saves it as entitled, so a student needs a plan before they can start."
      valuePropName="checked"
      getValueProps={(value?: PaperAccessMode) => ({
        checked: value === "ENTITLED",
      })}
      getValueFromEvent={(checked: boolean) =>
        checked ? "ENTITLED" : "FREE"
      }
    >
      <Switch
        checkedChildren="Entitled"
        unCheckedChildren="Free"
        aria-label="Requires entitlement"
      />
    </Form.Item>
  );
}
