"use client";

import { Select as AntSelect } from "antd";
import type { SelectProps } from "antd";
import type { DefaultOptionType, RefSelectProps } from "antd/es/select";
import { forwardRef } from "react";

function collectText(value: unknown): string {
  if (value == null || typeof value === "boolean") {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(collectText).join(" ");
  }
  if (typeof value === "object" && value && "props" in value) {
    return collectText(
      (value as { props?: { children?: unknown } }).props?.children
    );
  }
  return "";
}

export function filterSelectOption(
  input: string,
  option?: DefaultOptionType
): boolean {
  const needle = input.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  const haystack = [
    collectText(option?.label),
    collectText(option?.value),
    collectText(option?.children),
    collectText(option?.title),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

const Select = Object.assign(
  forwardRef<RefSelectProps, SelectProps>(function SearchableSelect(
    props,
    ref
  ) {
    return (
      <AntSelect
        ref={ref}
        showSearch
        optionFilterProp="label"
        filterOption={filterSelectOption}
        {...props}
      />
    );
  }),
  {
    Option: AntSelect.Option,
    OptGroup: AntSelect.OptGroup,
    SECRET_COMBOBOX_MODE_DO_NOT_USE: AntSelect.SECRET_COMBOBOX_MODE_DO_NOT_USE,
    _InternalPanelDoNotUseOrYouWillBeFired:
      AntSelect._InternalPanelDoNotUseOrYouWillBeFired,
  }
) as unknown as typeof AntSelect;

export { Select };
export default Select;
