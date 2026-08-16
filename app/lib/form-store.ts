import type { FormInstance } from "antd/es/form";
import type { NamePath } from "antd/es/form/interface";

/**
 * Update a field without `form.setFieldValue`.
 *
 * Ant Design's `setFieldValue` always passes `errors: []` and `warnings: []`
 * into `setFields`. rc-field-form then deep-compares meta objects that share
 * the same empty-array reference, and rc-util warns
 * "There may be circular references".
 */
export function setFormValue(
  form: FormInstance,
  name: NamePath,
  value: unknown
) {
  form.setFields([{ name, value }]);
}

export function setFormValues(
  form: FormInstance,
  fields: Array<{ name: NamePath; value: unknown }>
) {
  form.setFields(fields);
}
