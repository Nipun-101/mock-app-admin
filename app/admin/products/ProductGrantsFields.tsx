"use client";

import { Button, Form, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Select } from "@/app/components/SearchableSelect";
import type { EntitlementScopeType } from "@/app/services/ezprep-api";
import { GrantTargetSelect } from "./GrantTargetSelect";
import { SCOPE_TYPE_OPTIONS } from "./grant-options";
import {
  emptyGrantFormRow,
  hasDuplicateScopeTypes,
  usedScopeTypes,
  type GrantFormRow,
} from "./grant-form";

type Props = {
  disabled?: boolean;
};

type ScopeTypeOption = {
  value: EntitlementScopeType;
  label: string;
  disabled?: boolean;
};

/**
 * One form value for the whole row. Changing the scope type replaces the row,
 * including an empty target list, so a nested setFieldValue is unnecessary.
 */
function GrantRowControl({
  value,
  onChange,
  scopeTypeOptions,
  disabled,
}: {
  value?: GrantFormRow;
  onChange?: (next: GrantFormRow) => void;
  scopeTypeOptions: ScopeTypeOption[];
  disabled?: boolean;
}) {
  const scopeType = value?.scopeType;

  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
      <Select
        className="min-w-[160px]"
        placeholder="Scope type"
        size="large"
        options={scopeTypeOptions}
        disabled={disabled}
        value={scopeType}
        onChange={(nextType: EntitlementScopeType) => {
          onChange?.({ scopeType: nextType, scopeIds: [] });
        }}
      />
      <GrantTargetSelect
        scopeType={scopeType}
        disabled={disabled}
        placeholder={
          scopeType ? "Select one or more targets" : "Select scope type first"
        }
        value={value?.scopeIds ?? []}
        onChange={(scopeIds) => {
          onChange?.({ scopeType, scopeIds });
        }}
      />
    </div>
  );
}

export function ProductGrantsFields({ disabled }: Props) {
  const allRows = (Form.useWatch("grants") || []) as GrantFormRow[];

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
        <div className="space-y-3">
          <div className="font-medium">Grants</div>
          <div className="text-sm text-slate-500">
            One row per scope type. Pick multiple targets in the same row.
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
                  name={name}
                  className="mb-0 min-w-0 flex-1"
                  rules={[
                    {
                      validator: async (_, row: GrantFormRow | undefined) => {
                        if (!row?.scopeType) {
                          return Promise.reject(
                            new Error("Select scope type")
                          );
                        }
                        if (!row.scopeIds || row.scopeIds.length < 1) {
                          return Promise.reject(
                            new Error("Select at least one target")
                          );
                        }
                      },
                    },
                  ]}
                >
                  <GrantRowControl
                    scopeTypeOptions={scopeTypeOptions}
                    disabled={disabled}
                  />
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
      )}
    </Form.List>
  );
}
