"use client";

import { Button, Form, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Select } from "@/app/components/SearchableSelect";
import type { EntitlementScopeType } from "@/app/services/ezprep-api";
import {
  SCOPE_TYPE_OPTIONS,
  type GrantScopeOptions,
} from "./grant-options";
import {
  emptyGrantFormRow,
  hasDuplicateScopeTypes,
  usedScopeTypes,
  type GrantFormRow,
} from "./grant-form";

type Props = {
  scopeOptions: GrantScopeOptions;
  disabled?: boolean;
};

export function ProductGrantsFields({ scopeOptions, disabled }: Props) {
  return (
    <Form.List
      name="grants"
      rules={[
        {
          validator: async (_, grants: GrantFormRow[] | undefined) => {
            if (!grants || grants.length < 1) {
              return Promise.reject(new Error("Add at least one grant"));
            }
            if (hasDuplicateScopeTypes(grants)) {
              return Promise.reject(
                new Error("Use only one row per scope type")
              );
            }
            const hasTarget = grants.some(
              (row) =>
                !!row?.scopeType &&
                Array.isArray(row.scopeIds) &&
                row.scopeIds.length > 0
            );
            if (!hasTarget) {
              return Promise.reject(
                new Error("Select at least one target for a grant")
              );
            }
          },
        },
      ]}
    >
      {(fields, { add, remove }, { errors }) => (
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue, setFieldValue }) => {
            const allRows = (getFieldValue("grants") || []) as GrantFormRow[];

            return (
              <div className="space-y-3">
                <div className="font-medium">Grants</div>
                <div className="text-sm text-slate-500">
                  One row per scope type. Pick multiple targets in the same
                  row.
                </div>
                {fields.map(({ key, name, ...restField }) => {
                  const used = usedScopeTypes(allRows, name);
                  const scopeTypeOptions = SCOPE_TYPE_OPTIONS.map((option) => ({
                    ...option,
                    disabled: used.has(option.value),
                  }));

                  return (
                    <Space
                      key={key}
                      align="start"
                      className="flex w-full flex-wrap"
                      wrap
                    >
                      <Form.Item
                        {...restField}
                        name={[name, "scopeType"]}
                        rules={[
                          { required: true, message: "Select scope type" },
                        ]}
                        className="mb-0 min-w-[160px]"
                      >
                        <Select
                          placeholder="Scope type"
                          size="large"
                          options={scopeTypeOptions}
                          disabled={disabled}
                          onChange={() => {
                            // Defer clearing the dependent field — calling
                            // setFieldValue synchronously inside onChange
                            // triggers Ant Design's circular-reference warning.
                            queueMicrotask(() => {
                              setFieldValue(
                                ["grants", name, "scopeIds"],
                                []
                              );
                            });
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, next) =>
                          prev.grants?.[name]?.scopeType !==
                          next.grants?.[name]?.scopeType
                        }
                      >
                        {() => {
                          const scopeType = getFieldValue([
                            "grants",
                            name,
                            "scopeType",
                          ]) as EntitlementScopeType | undefined;
                          const options = scopeType
                            ? scopeOptions[scopeType] || []
                            : [];
                          return (
                            <Form.Item
                              {...restField}
                              name={[name, "scopeIds"]}
                              rules={[
                                {
                                  validator: async (_, value: string[]) => {
                                    if (!value || value.length < 1) {
                                      return Promise.reject(
                                        new Error("Select at least one target")
                                      );
                                    }
                                  },
                                },
                              ]}
                              className="mb-0 min-w-[280px] flex-1"
                              getValueFromEvent={(value: string[]) => {
                                if (!Array.isArray(value)) return [];
                                return Array.from(new Set(value));
                              }}
                            >
                              <Select
                                mode="multiple"
                                allowClear
                                placeholder={
                                  scopeType
                                    ? "Select one or more targets"
                                    : "Select scope type first"
                                }
                                size="large"
                                options={options}
                                disabled={disabled || !scopeType}
                                optionFilterProp="label"
                                maxTagCount="responsive"
                              />
                            </Form.Item>
                          );
                        }}
                      </Form.Item>
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                        disabled={disabled || fields.length <= 1}
                        aria-label="Remove grant"
                      />
                    </Space>
                  );
                })}
                <Form.Item className="mb-0">
                  <Button
                    type="dashed"
                    onClick={() => add(emptyGrantFormRow())}
                    icon={<PlusOutlined />}
                    disabled={
                      disabled ||
                      usedScopeTypes(allRows).size >= SCOPE_TYPE_OPTIONS.length
                    }
                  >
                    Add grant
                  </Button>
                  <Form.ErrorList errors={errors} />
                </Form.Item>
              </div>
            );
          }}
        </Form.Item>
      )}
    </Form.List>
  );
}
