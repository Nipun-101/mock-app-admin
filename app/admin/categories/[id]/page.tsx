"use client";

import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
  message,
} from "antd";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  catalogApi,
  formatEzPrepError,
  type CategoryScope,
} from "@/app/services/ezprep-api";
import { EditPageShell } from "@/app/components/PageLoader";
import { INDIA_STATE_SELECT_OPTIONS } from "@/app/lib/india-states";

const { Title } = Typography;

export default function EditCategoryPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();
  const selectedScope = Form.useWatch("scope", form) as
    | CategoryScope
    | undefined;

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const { data } = await catalogApi.getCategory(params.id);
        form.setFieldsValue({
          name: data.name,
          shortName: data.shortName,
          imageUrl: data.imageUrl,
          description: data.description,
          priority: data.priority ?? 0,
          scope: data.scope ?? "central",
          stateCode: data.stateCode,
        });
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to fetch category"));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchCategory();
  }, [params.id, form]);

  const handleSubmit = async (values: {
    name: string;
    shortName: string;
    imageUrl?: string;
    description?: string;
    priority: number;
    scope: CategoryScope;
    stateCode?: string;
  }) => {
    setLoading(true);
    try {
      await catalogApi.updateCategory(params.id, {
        ...values,
        stateCode:
          values.scope === "state" ? values.stateCode : undefined,
      });
      message.success("Category updated successfully");
      router.push("/admin/categories");
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to update category"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <EditPageShell loading={initialLoading}>
    <div className="space-y-6">
      <Card
        title={
          <Title level={4} className="mb-0">
            Edit Category
          </Title>
        }
        className="w-full shadow-sm"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="max-w-4xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              label="Category Name"
              name="name"
              rules={[
                { required: true, message: "Please enter category name" },
              ]}
            >
              <Input placeholder="e.g. Staff Selection Commission" size="large" />
            </Form.Item>

            <Form.Item
              label="Short Name"
              name="shortName"
              rules={[{ required: true, message: "Please enter short name" }]}
            >
              <Input placeholder="e.g. SSC" size="large" />
            </Form.Item>

            <Form.Item
              label="Jurisdiction"
              name="scope"
              extra="Central categories appear on the main dashboard. State categories appear under State PSC."
              rules={[
                { required: true, message: "Please select jurisdiction" },
              ]}
            >
              <Select
                size="large"
                options={[
                  { value: "central", label: "Central" },
                  { value: "state", label: "State" },
                ]}
                onChange={(value) => {
                  if (value !== "state") {
                    form.setFieldValue("stateCode", undefined);
                  }
                }}
              />
            </Form.Item>

            {selectedScope === "state" ? (
              <Form.Item
                label="State"
                name="stateCode"
                extra="ISO 3166-2:IN code with GST numeric code."
                rules={[
                  { required: true, message: "Please select a state" },
                ]}
              >
                <Select
                  size="large"
                  showSearch
                  placeholder="Select state"
                  optionFilterProp="label"
                  options={INDIA_STATE_SELECT_OPTIONS}
                />
              </Form.Item>
            ) : null}

            <Form.Item
              label="Dashboard priority"
              name="priority"
              extra="Higher numbers appear first in Popular Exams. Categories with the same priority are listed alphabetically."
              rules={[
                { required: true, message: "Please enter a priority" },
                {
                  type: "number",
                  min: 0,
                  max: 9999,
                  message: "Priority must be a whole number from 0 to 9999",
                },
              ]}
            >
              <InputNumber
                min={0}
                max={9999}
                precision={0}
                className="w-full"
                size="large"
                placeholder="e.g. 10"
              />
            </Form.Item>

            <Form.Item label="Image URL" name="imageUrl">
              <Input placeholder="Enter image URL" size="large" />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea
                placeholder="Enter category description"
                size="large"
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            </Form.Item>
          </div>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              className="bg-blue-600 hover:bg-blue-700"
              loading={loading}
            >
              Update Category
            </Button>
            <Button
              className="ml-2"
              size="large"
              onClick={() => router.push("/admin/categories")}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
    </EditPageShell>
  );
}
