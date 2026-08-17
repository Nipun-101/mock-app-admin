import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Form } from "antd";
import { describe, expect, it, vi } from "vitest";
import { CurrentAffairFormFields } from "./form-fields";

vi.mock("@/app/components/ImageUpload", () => ({
  ImageUpload: ({ label }: { label?: string }) => (
    <div data-testid="image-upload">{label ?? "Image upload"}</div>
  ),
  toPlainImageMetadata: (value: unknown) => value,
}));

function FieldsForm({ onFinish = vi.fn() }: { onFinish?: () => void }) {
  const [form] = Form.useForm();
  return (
    <Form form={form} onFinish={onFinish}>
      <CurrentAffairFormFields />
      <button type="submit">Save</button>
    </Form>
  );
}

describe("CurrentAffairFormFields", () => {
  it("renders title, date, description, memory trick, and image upload", () => {
    render(<FieldsForm />);

    expect(screen.getByPlaceholderText("Headline for this event")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Optional details about the event")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Optional mnemonic")).toBeInTheDocument();
    expect(screen.getByTestId("image-upload")).toHaveTextContent("Image (optional)");
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
  });

  it("requires a title and date on submit", async () => {
    const onFinish = vi.fn();
    render(<FieldsForm onFinish={onFinish} />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Please enter a title")).toBeInTheDocument();
    expect(screen.getByText("Please select a date")).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("submits when title and date are provided", async () => {
    const onFinish = vi.fn();
    render(
      <Form initialValues={{ date: "2026-08-17" }} onFinish={onFinish}>
        <CurrentAffairFormFields />
        <button type="submit">Save</button>
      </Form>
    );

    fireEvent.change(screen.getByPlaceholderText("Headline for this event"), {
      target: { value: "Budget day" },
    });
    fireEvent.change(screen.getByPlaceholderText("Optional details about the event"), {
      target: { value: "Finance bill passed" },
    });
    fireEvent.change(screen.getByPlaceholderText("Optional mnemonic"), {
      target: { value: "B for budget" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onFinish).toHaveBeenCalled());
  });
});
