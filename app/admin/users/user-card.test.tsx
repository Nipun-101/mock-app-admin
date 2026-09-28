import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AppUser } from "@/app/services/ezprep-api/users";
import { UserCard } from "./user-card";

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "u1",
    name: "Anita Sharma",
    email: "anita@example.com",
    phoneNumber: "+919876543210",
    role: "user",
    isActive: true,
    location: { city: "Bengaluru", state: "KA", country: "IN" },
    subscription: { plan: "premium", status: "active" },
    membershipTier: "gold",
    targetExam: { id: "e1", name: "UPSC" },
    testsAttendedCount: 6,
    testActivity: {
      fullExam: { finished: 3, open: 1 },
      topicWise: { finished: 1, open: 1 },
    },
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("UserCard", () => {
  it("renders identity, plan, attempt breakdown, and location", () => {
    render(<UserCard user={makeUser()} />);

    expect(screen.getByText("Anita Sharma")).toBeInTheDocument();
    expect(screen.getByText("a***@example.com")).toBeInTheDocument();
    expect(screen.getByText("+91**********")).toBeInTheDocument();
    expect(screen.queryByText("anita@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("+919876543210")).not.toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.getByText("UPSC")).toBeInTheDocument();
    expect(screen.getByText("Bengaluru, KA, IN")).toBeInTheDocument();
    expect(screen.getByText("Full mocks")).toBeInTheDocument();
    expect(screen.getByText("Topic tests")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/4 full mocks attended, 3 finished, 1 in progress/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/2 topic tests attempted, 1 finished, 1 in progress/i)
    ).toBeInTheDocument();
    expect(screen.getByText("4 finished · 2 in progress")).toBeInTheDocument();
    expect(screen.getByText(/Joined/)).toBeInTheDocument();
  });

  it("handles inactive users and missing optional fields", () => {
    render(
      <UserCard
        user={makeUser({
          name: "",
          email: "",
          phoneNumber: undefined,
          isActive: false,
          location: undefined,
          targetExam: undefined,
          testsAttendedCount: Number.NaN,
          testActivity: {
            fullExam: { finished: Number.NaN, open: -1 },
            topicWise: { finished: 0, open: 0 },
          },
          avatarUrl: "https://cdn.example/a.png",
        })}
      />
    );

    expect(screen.getByText("Unnamed learner")).toBeInTheDocument();
    expect(screen.getByText("No email")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByText("UPSC")).not.toBeInTheDocument();
    expect(screen.getByText("0 finished · 0 in progress")).toBeInTheDocument();
    expect(
      screen.getByLabelText("0 full mocks attended, 0 finished, 0 in progress")
    ).toBeInTheDocument();
  });

  it("falls back to the user name when id is missing for avatar color", () => {
    render(<UserCard user={makeUser({ id: "" })} />);
    expect(screen.getByText("Anita Sharma")).toBeInTheDocument();
  });

  it("uses a singular attended label for a single full mock", () => {
    render(
      <UserCard
        user={makeUser({
          testsAttendedCount: 1,
          testActivity: {
            fullExam: { finished: 1, open: 0 },
            topicWise: { finished: 0, open: 0 },
          },
        })}
      />
    );
    expect(
      screen.getByLabelText(/1 full mock attended, 1 finished, 0 in progress/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/0 topic tests attempted/i)
    ).toBeInTheDocument();
  });

  it("never renders a full email or phone even if the payload is unmasked", () => {
    render(
      <UserCard
        user={makeUser({
          email: "anita.sharma@gmail.com",
          phoneNumber: "9876543210",
        })}
      />
    );

    expect(screen.getByText("a***@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("**********")).toBeInTheDocument();
    expect(screen.queryByText("anita.sharma@gmail.com")).not.toBeInTheDocument();
    expect(screen.queryByText("9876543210")).not.toBeInTheDocument();
  });
});
