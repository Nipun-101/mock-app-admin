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

vi.mock("@/app/components/PasteToImage", () => ({
  PasteToImage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
  it("renders title, date, description bullets, memory trick, and image upload", () => {
    render(<FieldsForm />);

    expect(screen.getByPlaceholderText("Headline for this event")).toBeInTheDocument();
    expect(screen.getByText("No bullet points yet. Add one below.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add bullet point/i })).toBeInTheDocument();
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

  it("submits when title, date, and bullet points are provided", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: /Add bullet point/i }));
    fireEvent.change(await screen.findByPlaceholderText("Bullet point 1"), {
      target: { value: "Finance bill passed" },
    });
    fireEvent.change(screen.getByPlaceholderText("Optional mnemonic"), {
      target: { value: "B for budget" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onFinish).toHaveBeenCalled());
    expect(onFinish.mock.calls[0][0]).toMatchObject({
      title: "Budget day",
      description: ["Finance bill passed"],
      memoryTrick: "B for budget",
    });
  });
});
